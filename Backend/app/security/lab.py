"""Bounded, process-local authentication state for synthetic accounts only.

No database, broker integration, production users, or external authenticator
service. An ASGI worker restart deliberately discards every identity and token.
"""

from collections import deque
from dataclasses import dataclass, field
from datetime import datetime, timezone
from hashlib import sha256
from hmac import compare_digest
from math import ceil
from secrets import token_hex, token_urlsafe
from threading import BoundedSemaphore, RLock
from time import monotonic, time
from typing import Callable

import pyotp
from argon2 import PasswordHasher, Type
from argon2.exceptions import VerifyMismatchError

SETUP_TTL = 20 * 60
ACCOUNT_TTL = 4 * 60 * 60
CHALLENGE_TTL = 3 * 60
SESSION_TTL = 45 * 60
SESSION_IDLE_TTL = 15 * 60
OTP_SECONDS = 30
MAX_ACCOUNTS = 64  # Includes pending enrollments.
MAX_HISTORY = 16
MAX_CODE_FAILURES = 5
RATE_WINDOW = 60
ISSUER = "Tickframe Access Lab"


class LabError(Exception):
    def __init__(self, code: str, status: int, retry_after: int | None = None):
        super().__init__(code)
        self.code = code
        self.status = status
        self.retry_after = retry_after


def _token_id(token: str | None) -> bytes | None:
    if token is None or len(token) != 43 or not token.isascii():
        return None
    return sha256(token.encode("ascii")).digest()


@dataclass(slots=True)
class Account:
    username: str
    password_hash: str = field(repr=False)
    otp_secret: str = field(repr=False)
    expires: float
    role: str = "test_operator"
    last_step: int = -1
    history: deque = field(default_factory=lambda: deque(maxlen=MAX_HISTORY))


@dataclass(slots=True)
class Setup:
    account: Account
    expires: float
    failures: int = 0


@dataclass(slots=True)
class Challenge:
    username: str
    expires: float
    failures: int = 0


@dataclass(slots=True)
class Session:
    username: str
    expires: float
    idle_expires: float


@dataclass(frozen=True, slots=True)
class NewSetup:
    username: str
    password: str = field(repr=False)
    otp_secret: str = field(repr=False)
    token: str = field(repr=False)


class LabState:
    def __init__(
        self, *, clock: Callable[[], float] = monotonic, utc_clock: Callable[[], float] = time,
    ):
        self._clock = clock
        self._utc_clock = utc_clock
        self._lock = RLock()
        self._hash_slots = BoundedSemaphore(2)
        self._hasher = PasswordHasher(time_cost=3, memory_cost=32 * 1024, parallelism=1, type=Type.ID)
        self._dummy_hash = self._hasher.hash(token_urlsafe(24))
        self._setups: dict[bytes, Setup] = {}
        self._accounts: dict[str, Account] = {}
        self._challenges: dict[bytes, Challenge] = {}
        self._sessions: dict[bytes, Session] = {}
        self._budgets: dict[tuple[str, str], deque[float]] = {}

    def _prune(self, now: float) -> None:
        # Called with the lock held; maps are capped by identity/admission limits.
        for key, account in tuple(self._accounts.items()):
            if now >= account.expires:
                del self._accounts[key]
        for key, setup in tuple(self._setups.items()):
            if now >= setup.expires:
                del self._setups[key]
        for key, challenge in tuple(self._challenges.items()):
            if now >= challenge.expires or challenge.username not in self._accounts:
                del self._challenges[key]
        for key, session in tuple(self._sessions.items()):
            if now >= min(session.expires, session.idle_expires) or session.username not in self._accounts:
                del self._sessions[key]
        for key, entries in tuple(self._budgets.items()):
            while entries and now - entries[0] >= RATE_WINDOW:
                entries.popleft()
            if not entries:
                del self._budgets[key]

    def _limit(self, now: float, bucket: str, capacity: int, username: str = "") -> None:
        entries = self._budgets.setdefault((bucket, username), deque())
        if len(entries) >= capacity:
            raise LabError("rate_limited", 429, max(1, ceil(entries[0] + RATE_WINDOW - now)))
        entries.append(now)

    def _hash(self, operation, *args):
        if not self._hash_slots.acquire(blocking=False):
            raise LabError("busy", 503, 2)
        try:
            return operation(*args)
        finally:
            self._hash_slots.release()

    def _log(self, account: Account, event: str) -> None:
        account.history.append({
            "event": event,
            "at": datetime.fromtimestamp(self._utc_clock(), timezone.utc).isoformat(timespec="seconds"),
        })

    def _accept_code(self, account: Account, code: str) -> bool:
        # Keep wall-clock TOTP separate from monotonic expiry. Allow one 30 s
        # step of drift, but never accept a used or earlier step for this identity.
        step = int(self._utc_clock()) // OTP_SECONDS
        totp = pyotp.TOTP(account.otp_secret, interval=OTP_SECONDS)
        for candidate in range(step + 1, max(-1, step - 2), -1):
            if candidate > account.last_step and compare_digest(totp.generate_otp(candidate), code):
                account.last_step = candidate
                return True
        return False

    def enroll(self, previous_setup: str | None) -> NewSetup:
        with self._lock:
            now = self._clock()
            self._prune(now)
            self._limit(now, "enroll", 8)
            self._setups.pop(_token_id(previous_setup), None)
            if len(self._accounts) + len(self._setups) >= MAX_ACCOUNTS:
                raise LabError("lab_full", 503)
        password = token_urlsafe(18)
        digest = self._hash(self._hasher.hash, password)
        otp_secret = pyotp.random_base32()
        token = token_urlsafe(32)
        with self._lock:
            now = self._clock()
            self._prune(now)
            if len(self._accounts) + len(self._setups) >= MAX_ACCOUNTS:
                raise LabError("lab_full", 503)
            username = f"lab-{token_hex(8)}"
            while username in self._accounts or any(x.account.username == username for x in self._setups.values()):
                username = f"lab-{token_hex(8)}"
            self._setups[_token_id(token)] = Setup(
                Account(username, digest, otp_secret, now + SETUP_TTL + ACCOUNT_TTL), now + SETUP_TTL,
            )
        return NewSetup(username, password, otp_secret, token)

    def confirm_setup_cookie(self, token: str | None) -> None:
        with self._lock:
            self._prune(self._clock())
            if _token_id(token) not in self._setups:
                raise LabError("setup_cookie_unavailable", 401)

    def pair(self, token: str | None, code: str) -> str:
        with self._lock:
            now = self._clock()
            self._prune(now)
            key = _token_id(token)
            pending = self._setups.get(key)
            if pending is None:
                raise LabError("setup_expired", 401)
            self._limit(now, "pair", 30)
            if not self._accept_code(pending.account, code):
                pending.failures += 1
                if pending.failures >= MAX_CODE_FAILURES:
                    del self._setups[key]
                    raise LabError("setup_expired", 401)
                raise LabError("invalid_code", 401)
            del self._setups[key]
            account = pending.account
            account.expires = now + ACCOUNT_TTL
            self._log(account, "test_account_created")
            self._accounts[account.username] = account
            return account.username

    def password_step(self, username: str, password: str) -> str:
        with self._lock:
            now = self._clock()
            self._prune(now)
            self._limit(now, "password_global", 24)
            self._limit(now, "password_identity", 6, username)
            account = self._accounts.get(username)
            digest = account.password_hash if account else self._dummy_hash
        try:
            matched = self._hash(self._hasher.verify, digest, password)
        except VerifyMismatchError:
            matched = False
        with self._lock:
            now = self._clock()
            self._prune(now)
            if not matched or account is None or self._accounts.get(username) is not account:
                if account and self._accounts.get(username) is account:
                    self._log(account, "password_rejected")
                raise LabError("invalid_credentials", 401)
            # One outstanding challenge per identity. A second password step
            # replaces the first without granting any workspace access.
            for key, previous in tuple(self._challenges.items()):
                if previous.username == username:
                    del self._challenges[key]
            token = token_urlsafe(32)
            self._challenges[_token_id(token)] = Challenge(username, min(now + CHALLENGE_TTL, account.expires))
            return token

    def code_step(self, token: str | None, code: str) -> str:
        with self._lock:
            now = self._clock()
            self._prune(now)
            key = _token_id(token)
            challenge = self._challenges.get(key)
            if challenge is None:
                raise LabError("challenge_expired", 401)
            self._limit(now, "totp_global", 40)
            self._limit(now, "totp_identity", MAX_CODE_FAILURES, challenge.username)
            account = self._accounts[challenge.username]
            if not self._accept_code(account, code):
                challenge.failures += 1
                self._log(account, "code_rejected")
                if challenge.failures >= MAX_CODE_FAILURES:
                    del self._challenges[key]
                    raise LabError("challenge_expired", 401)
                raise LabError("invalid_code", 401)
            del self._challenges[key]
            # Rotate on successful two-factor verification. Earlier sessions
            # for this test identity do not survive a fresh sign-in.
            for existing, session in tuple(self._sessions.items()):
                if session.username == account.username:
                    del self._sessions[existing]
            token = token_urlsafe(32)
            self._sessions[_token_id(token)] = Session(
                account.username, min(now + SESSION_TTL, account.expires), now + SESSION_IDLE_TTL,
            )
            self._log(account, "sign_in_succeeded")
            return token

    def session(self, token: str | None, *, workspace: bool = False) -> dict:
        with self._lock:
            now = self._clock()
            self._prune(now)
            session = self._sessions.get(_token_id(token))
            if session is None:
                raise LabError("signed_out", 401)
            account = self._accounts[session.username]
            if account.role != "test_operator":
                raise LabError("no_access", 403)
            if workspace:
                session.idle_expires = now + SESSION_IDLE_TTL
            payload = {
                "username": account.username, "role": account.role,
                "valid_for_seconds": ceil(min(session.expires, session.idle_expires) - now),
            }
            if workspace:
                payload.update({
                    "environment": "auth_lab", "data_source": "test_only", "mt5_connection": "not_configured",
                    "live_entries": "locked", "login_history": [dict(event) for event in reversed(account.history)],
                })
            return payload

    def logout(self, session_token: str | None, challenge_token: str | None, setup_token: str | None) -> None:
        with self._lock:
            self._prune(self._clock())
            session = self._sessions.pop(_token_id(session_token), None)
            if session:
                self._log(self._accounts[session.username], "signed_out")
            self._challenges.pop(_token_id(challenge_token), None)
            self._setups.pop(_token_id(setup_token), None)

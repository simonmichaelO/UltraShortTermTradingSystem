"""Isolated authentication routes. Never include this router in the public preview."""

import base64
import io
import ipaddress
import re
from enum import StrEnum
from typing import TypeVar

import pyotp
import segno
from fastapi import APIRouter, Request, Response
from pydantic import BaseModel, ConfigDict, Field, ValidationError
from starlette.concurrency import run_in_threadpool

from app.security.lab import (
    CHALLENGE_TTL, ISSUER, SESSION_TTL, SETUP_TTL, LabError, LabState, NewSetup, TokenChannel,
)

MAX_BODY = 4096
T = TypeVar("T", bound=BaseModel)


class LabMode(StrEnum):
    LOOPBACK = "loopback"
    ARENA = "arena"


class EmptyInput(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)


class PasswordInput(EmptyInput):
    username: str = Field(pattern=r"^lab-[0-9a-f]{16}$", max_length=20)
    password: str = Field(min_length=1, max_length=128)


class CodeInput(EmptyInput):
    code: str = Field(pattern=r"^[0-9]{6}$", min_length=6, max_length=6)


class TabInput(EmptyInput):
    handle: str = Field(pattern=r"^[A-Za-z0-9_-]{43}$", min_length=43, max_length=43)


class TabCodeInput(TabInput, CodeInput):
    pass


async def _read_input(request: Request, model: type[T]) -> T:
    if request.headers.get("content-type", "").split(";", 1)[0].strip().lower() != "application/json":
        raise LabError("invalid_request", 415)
    body = bytearray()
    async for chunk in request.stream():
        if len(body) + len(chunk) > MAX_BODY:
            raise LabError("invalid_request", 413)
        body.extend(chunk)
    try:
        return model.model_validate_json(body)
    except ValidationError:
        # The default schema-error response can echo submitted input. Don't
        # expose passwords/codes to responses, logs, browser history, or URLs.
        raise LabError("invalid_request", 400) from None


def _guard(request: Request, mode: LabMode, *, modifying: bool = False) -> None:
    hosts = request.headers.getlist("host")
    host = hosts[0].lower() if len(hosts) == 1 else ""
    if mode == LabMode.ARENA:
        if not re.fullmatch(r"[0-9]{1,5}-[a-z0-9][a-z0-9-]{0,62}\.e2b\.app", host):
            raise LabError("invalid_origin", 403)
        origin = "https://" + host
    else:
        if not re.fullmatch(r"(?:localhost|127\.0\.0\.1)(?::[0-9]{1,5})?", host):
            raise LabError("invalid_origin", 403)
        try:
            if request.client is None or not ipaddress.ip_address(request.client.host).is_loopback:
                raise ValueError("not loopback")
        except ValueError:
            raise LabError("invalid_origin", 403) from None
        origin = "http://" + host
    actual = request.headers.getlist("origin")
    fetch_site = request.headers.get("sec-fetch-site")
    if (modifying or actual) and actual != [origin]:
        raise LabError("invalid_origin", 403)
    if fetch_site is not None and fetch_site not in ({"same-origin"} if modifying else {"same-origin", "none"}):
        raise LabError("invalid_origin", 403)


def _qr(setup: NewSetup) -> str:
    uri = pyotp.TOTP(setup.otp_secret).provisioning_uri(name=setup.username, issuer_name=ISSUER)
    output = io.BytesIO()
    segno.make_qr(uri, error="m").save(output, kind="png", scale=5)
    return "data:image/png;base64," + base64.b64encode(output.getvalue()).decode("ascii")


def _setup_payload(setup: NewSetup) -> dict:
    return {
        "username": setup.username, "password": setup.password, "manual_key": setup.otp_secret,
        "qr_image": _qr(setup), "setup_minutes": SETUP_TTL // 60,
    }


def _tab_router(state: LabState) -> APIRouter:
    """Opt-in for the synthetic Arena lab; no cookies or URL tokens.

    Each handle is a separate, expiring server-side proof, usable only for
    its stage and this transport. JSON-only, same-origin POST covers probes
    too, so a handle never appears in the URL or a referrer.
    """
    tab = APIRouter(prefix="/auth/tab")
    channel = TokenChannel.TAB

    async def input_for_tab(request: Request, model: type[T]) -> T:
        _guard(request, LabMode.ARENA, modifying=True)
        return await _read_input(request, model)

    @tab.post("/enroll", status_code=201)
    async def enroll_in_tab(request: Request):
        await input_for_tab(request, EmptyInput)
        setup = await run_in_threadpool(state.enroll, None, channel=channel)
        return {**_setup_payload(setup), "handle": setup.token}

    @tab.post("/pair")
    async def pair_in_tab(request: Request):
        data = await input_for_tab(request, TabCodeInput)
        username = state.pair(data.handle, data.code, channel=channel)
        return {"next": "password", "username": username}

    @tab.post("/password")
    async def password_in_tab(request: Request):
        data = await input_for_tab(request, PasswordInput)
        token = await run_in_threadpool(state.password_step, data.username, data.password, channel=channel)
        return {"next": "totp", "handle": token}

    @tab.post("/totp")
    async def totp_in_tab(request: Request):
        data = await input_for_tab(request, TabCodeInput)
        token = state.code_step(data.handle, data.code, channel=channel)
        return {"next": "workspace", "handle": token}

    @tab.post("/session")
    async def session_in_tab(request: Request):
        data = await input_for_tab(request, TabInput)
        return state.session(data.handle, channel=channel)

    @tab.post("/workspace")
    async def workspace_in_tab(request: Request):
        data = await input_for_tab(request, TabInput)
        return state.session(data.handle, channel=channel, workspace=True)

    @tab.post("/logout", status_code=204)
    async def logout_in_tab(request: Request):
        data = await input_for_tab(request, TabInput)
        state.logout(data.handle, data.handle, data.handle, channel=channel)
        return Response(status_code=204)

    return tab


def create_router(state: LabState, mode: LabMode) -> APIRouter:
    router = APIRouter(prefix="/api/v1")
    secure = mode == LabMode.ARENA
    prefix = "__Host-tf-lab-" if secure else "tf-loopback-lab-"
    setup_cookie, challenge_cookie, session_cookie = (prefix + name for name in ("setup", "challenge", "session"))
    attributes = dict(path="/", secure=secure, httponly=True, samesite="none" if secure else "strict")

    def write_cookie(response: Response, name: str, value: str, lifetime: int) -> None:
        response.set_cookie(name, value, max_age=lifetime, **attributes)
        if secure:
            # Partition a TLS preview's cookies by top-level site (CHIPS).
            # On Python 3.13 the bundled cookie API doesn't expose Partitioned.
            # Only append this fixed flag to the header we just constructed.
            header, cookie = response.raw_headers[-1]
            assert header == b"set-cookie"
            response.raw_headers[-1] = (header, cookie + b"; Partitioned")

    @router.post("/auth/enroll", status_code=201)
    async def enroll(request: Request, response: Response):
        _guard(request, mode, modifying=True)
        await _read_input(request, EmptyInput)
        setup = await run_in_threadpool(state.enroll, request.cookies.get(setup_cookie))
        write_cookie(response, setup_cookie, setup.token, SETUP_TTL)
        return _setup_payload(setup)

    @router.get("/auth/setup", status_code=204)
    async def confirm_setup(request: Request):
        _guard(request, mode)
        state.confirm_setup_cookie(request.cookies.get(setup_cookie))
        return Response(status_code=204)

    @router.post("/auth/pair")
    async def pair(request: Request, response: Response):
        _guard(request, mode, modifying=True)
        data = await _read_input(request, CodeInput)
        username = state.pair(request.cookies.get(setup_cookie), data.code)
        write_cookie(response, setup_cookie, "", 0)
        return {"next": "password", "username": username}

    @router.post("/auth/password")
    async def password_step(request: Request, response: Response):
        _guard(request, mode, modifying=True)
        data = await _read_input(request, PasswordInput)
        token = await run_in_threadpool(state.password_step, data.username, data.password)
        write_cookie(response, challenge_cookie, token, CHALLENGE_TTL)
        return {"next": "totp"}

    @router.post("/auth/totp")
    async def code_step(request: Request, response: Response):
        _guard(request, mode, modifying=True)
        data = await _read_input(request, CodeInput)
        token = state.code_step(request.cookies.get(challenge_cookie), data.code)
        write_cookie(response, challenge_cookie, "", 0)
        write_cookie(response, session_cookie, token, SESSION_TTL)
        return {"next": "workspace"}

    @router.get("/auth/session")
    async def session(request: Request):
        _guard(request, mode)
        return state.session(request.cookies.get(session_cookie))

    @router.post("/auth/logout", status_code=204)
    async def logout(request: Request):
        _guard(request, mode, modifying=True)
        await _read_input(request, EmptyInput)
        state.logout(request.cookies.get(session_cookie), request.cookies.get(challenge_cookie), request.cookies.get(setup_cookie))
        response = Response(status_code=204)
        for name in (session_cookie, challenge_cookie, setup_cookie):
            write_cookie(response, name, "", 0)
        return response

    @router.get("/lab/workspace")
    async def workspace(request: Request):
        _guard(request, mode)
        return state.session(request.cookies.get(session_cookie), workspace=True)

    if secure:
        router.include_router(_tab_router(state))
    return router

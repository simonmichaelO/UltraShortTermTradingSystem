"""Transactional SQLite storage for the two bundled demonstration snapshots only."""

from collections.abc import Iterator
from contextlib import closing, contextmanager
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from hashlib import sha256
import json
import os
from pathlib import Path
import sqlite3

from app.services.sample_snapshot import FIXTURE_PATH, SampleFixture, load_sample_fixture

SCHEMA_VERSION = 1
DATA_SOURCE = "simulated_examples"
MAX_PAYLOAD_BYTES = 64 * 1024
APPLICATION_ID = 0x54465331  # TFS1, private storage lab marker (not an authentication check)
EXAMPLES = {
    "tf-example-2026-11-17": FIXTURE_PATH,
    "tf-example-2026-11-17-step-2": Path(__file__).with_name("fixtures") / "sample_restart_v1.json",
}

CREATE_SNAPSHOTS = f"""
CREATE TABLE sample_snapshots (
    fixture_id TEXT PRIMARY KEY NOT NULL,
    example_at_utc TEXT NOT NULL,
    stored_at_utc TEXT NOT NULL,
    data_source TEXT NOT NULL CHECK (data_source = '{DATA_SOURCE}'),
    payload_json TEXT NOT NULL CHECK (length(CAST(payload_json AS BLOB)) BETWEEN 1 AND {MAX_PAYLOAD_BYTES}),
    payload_sha256 TEXT NOT NULL CHECK (length(payload_sha256) = 64)
) STRICT
"""


class StoreError(RuntimeError):
    """An unavailable sample store or unsafe operation, with an operator-safe message."""


@dataclass(frozen=True, slots=True)
class StoredSample:
    sample: SampleFixture
    stored_at_utc: str
    payload_sha256: str


def _path(path: Path) -> Path:
    if path.suffix.lower() != ".sqlite3" or path.is_symlink() or (path.exists() and not path.is_file()):
        raise StoreError("Choose a local .sqlite3 file for the sample storage lab.")
    return path.absolute()


def _reserve(path: Path) -> None:
    # Exclusive creation: never truncate an existing file, database or otherwise.
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    os.close(fd)


@contextmanager
def _open(path: Path, mode: str) -> Iterator[sqlite3.Connection]:
    # rw/ro both require an existing file. Reading a missing DB cannot create a blank one.
    uri = f"{path.as_uri()}?mode={mode}"
    with closing(sqlite3.connect(uri, uri=True, isolation_level=None, timeout=1.0)) as db:
        db.row_factory = sqlite3.Row
        db.execute("PRAGMA trusted_schema = OFF")
        if mode == "ro":
            db.execute("PRAGMA query_only = ON")
        yield db


def _check_identity(db: sqlite3.Connection) -> None:
    if db.execute("PRAGMA application_id").fetchone()[0] != APPLICATION_ID:
        raise StoreError("This file is not a Tickframe sample store. It was not changed.")
    if db.execute("PRAGMA user_version").fetchone()[0] != SCHEMA_VERSION:
        raise StoreError("Unsupported sample store version. No migration was attempted.")


def _utc_text(value: datetime) -> str:
    return value.isoformat().replace("+00:00", "Z")


def _digest(payload: str) -> str:
    return sha256(payload.encode("utf-8")).hexdigest()


def _read_rows(db: sqlite3.Connection) -> tuple[StoredSample, ...]:
    rows = db.execute("""
        SELECT fixture_id, example_at_utc, stored_at_utc, data_source, payload_json, payload_sha256
        FROM sample_snapshots ORDER BY example_at_utc, fixture_id LIMIT ?
    """, (len(EXAMPLES) + 1,)).fetchall()
    if len(rows) > len(EXAMPLES):
        raise StoreError("Unexpected extra records in the sample store.")
    result = []
    for row in rows:
        payload = row["payload_json"]
        if (row["fixture_id"] not in EXAMPLES or row["data_source"] != DATA_SOURCE
                or not isinstance(payload, str) or not 0 < len(payload.encode("utf-8")) <= MAX_PAYLOAD_BYTES
                or _digest(payload) != row["payload_sha256"]):
            raise StoreError("A saved sample failed its source or checksum check.")
        try:
            stamp = datetime.fromisoformat(row["stored_at_utc"])
            sample = SampleFixture.model_validate_json(payload)
        except (ValueError, TypeError):
            raise StoreError("A saved sample failed validation.") from None
        if (sample.fixture_id != row["fixture_id"] or _utc_text(sample.as_of) != row["example_at_utc"]
                or stamp.utcoffset() != timedelta(0) or _utc_text(stamp) != row["stored_at_utc"]):
            raise StoreError("A saved sample has inconsistent identity or timestamps.")
        result.append(StoredSample(sample, row["stored_at_utc"], row["payload_sha256"]))
    return tuple(result)


def _inspect(db: sqlite3.Connection) -> tuple[StoredSample, ...]:
    _check_identity(db)
    if db.execute("PRAGMA integrity_check(1)").fetchone()[0] != "ok":
        raise StoreError("The sample database did not pass SQLite's integrity check.")
    return _read_rows(db)


def inspect_store(path: Path) -> tuple[StoredSample, ...]:
    """Read a committed database snapshot; never read sample JSON from disk as a fallback."""
    path = _path(path)
    if not path.is_file():
        raise StoreError("No saved sample database exists at that location.")
    with _open(path, "ro") as db, db:
        db.execute("BEGIN")
        return _inspect(db)


def _insert(db: sqlite3.Connection, sample: SampleFixture, stored_at: str, payload: str, checksum: str) -> None:
    db.execute("""
        INSERT INTO sample_snapshots
            (fixture_id, example_at_utc, stored_at_utc, data_source, payload_json, payload_sha256)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (sample.fixture_id, _utc_text(sample.as_of), stored_at, DATA_SOURCE, payload, checksum))


def seed_store(path: Path) -> tuple[int, tuple[StoredSample, ...]]:
    """Insert the verified examples once, as one transaction. Never update a committed row."""
    examples = []
    for fixture_id, fixture_path in EXAMPLES.items():
        sample = load_sample_fixture(fixture_path)
        if sample is None or sample.fixture_id != fixture_id:
            raise StoreError("The bundled synthetic examples did not validate. Nothing was written.")
        payload = json.dumps(sample.model_dump(mode="json"), sort_keys=True, separators=(",", ":"), ensure_ascii=False)
        examples.append((sample, payload, _digest(payload)))

    path = _path(path)
    try:
        _reserve(path)
        created = True
    except FileExistsError:
        created = False
    try:
        with _open(path, "rw") as db, db:
            if created:
                db.execute("PRAGMA journal_mode = DELETE")
            db.execute("PRAGMA synchronous = FULL")
            db.execute("BEGIN IMMEDIATE")
            if created:
                db.execute(CREATE_SNAPSHOTS)
                db.execute(f"PRAGMA application_id = {APPLICATION_ID}")
                db.execute(f"PRAGMA user_version = {SCHEMA_VERSION}")
            prior = {item.sample.fixture_id: item for item in _inspect(db)}
            stored_at = _utc_text(datetime.now(timezone.utc))
            inserted = 0
            for sample, payload, checksum in examples:
                item = prior.get(sample.fixture_id)
                if item is None:
                    _insert(db, sample, stored_at, payload, checksum)
                    inserted += 1
                elif item.payload_sha256 != checksum:
                    raise StoreError("A saved example differs from the fixture with the same ID. Nothing was changed.")
            persisted = _read_rows(db)
        return inserted, persisted
    except BaseException:
        if created:
            path.unlink(missing_ok=True)
        raise


def copy_store(source: Path, destination: Path) -> tuple[StoredSample, ...]:
    """Use SQLite's backup API, verify all copied rows, and never overwrite a destination."""
    source, destination = _path(source), _path(destination)
    expected = inspect_store(source)
    try:
        _reserve(destination)
    except FileExistsError:
        raise StoreError("A file already exists at the copy destination. It was not overwritten.") from None

    def fail_if_busy(status: int, _remaining: int, _total: int) -> None:
        if status in (sqlite3.SQLITE_BUSY, sqlite3.SQLITE_LOCKED):
            raise StoreError("The sample database was busy during copy. Retry after closing other lab processes.")

    try:
        with _open(source, "ro") as reader, _open(destination, "rw") as writer:
            writer.execute("PRAGMA synchronous = FULL")
            reader.backup(writer, pages=32, progress=fail_if_busy)
        observed = inspect_store(destination)
        if observed != expected:
            raise StoreError("The copied sample database did not match the original records.")
        return observed
    except BaseException:
        destination.unlink(missing_ok=True)
        raise

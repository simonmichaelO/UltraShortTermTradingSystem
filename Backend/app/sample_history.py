"""Independent browser preview of a verified, synthetic, read-only SQLite copy."""

from datetime import datetime
import os
from pathlib import Path
import re
import sqlite3
from typing import Literal

from fastapi import FastAPI, HTTPException, Response
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel

from app.database.sample_store import EXAMPLES, StoreError, inspect_store
from app.services.sample_snapshot import SampleAccount, SampleFixture, Symbol, load_sample_fixture

ROOT = Path(__file__).resolve().parents[2]
HISTORY_DIST = ROOT / "Frontend" / "SampleHistory" / "dist"
DEFAULT_DB = ROOT / "LocalData" / "SampleHistoryPreview" / "history.sqlite3"
HISTORY_PATH = "/api/v1/sample-history"
HEADERS = {"Cache-Control": "no-store", "X-Content-Type-Options": "nosniff"}
ASSET_NAME = re.compile(r"[a-zA-Z0-9_-]+\.(?:js|css|woff2|svg)")


class HistoryPosition(BaseModel):
    id: str
    symbol: Symbol
    side: Literal["BUY", "SELL"]
    volume_centilots: int
    current: str
    net_cents: int


class HistoryRow(BaseModel):
    fixture_id: str
    as_of: datetime
    stored_at_utc: str
    account: SampleAccount
    positions: tuple[HistoryPosition, ...]


class HistoryResponse(BaseModel):
    schema_version: Literal[1] = 1
    environment: Literal["preview"] = "preview"
    storage: Literal["sqlite_read_only"] = "sqlite_read_only"
    data_source: Literal["simulated_examples"] = "simulated_examples"
    mt5_connection: Literal["not_configured"] = "not_configured"
    real_controls_available: Literal[False] = False
    snapshots: tuple[HistoryRow, ...]


def _load_catalog() -> dict[str, SampleFixture]:
    """Use fixtures as an allowlist only; an empty store stays empty."""
    catalog = {}
    for fixture_id, fixture_path in EXAMPLES.items():
        fixture = load_sample_fixture(fixture_path)
        if fixture is None or fixture.fixture_id != fixture_id:
            return {}
        catalog[fixture_id] = fixture
    return catalog


def create_history_app(
    db_path: Path, frontend_dir: Path | None = None, *,
    build_hint: str = "Build the Sample History frontend first.",
) -> FastAPI:
    app = FastAPI(title="Tickframe Sample History", version="0.6.0", docs_url=None, redoc_url=None,
                  openapi_url=None, redirect_slashes=False)
    catalog = _load_catalog()
    dist = frontend_dir.resolve() if frontend_dir is not None else None
    db_path = db_path.absolute()

    @app.get(HISTORY_PATH, response_model=HistoryResponse)
    def history(response: Response) -> HistoryResponse | JSONResponse:
        try:
            if not catalog:
                raise StoreError("Sample allowlist unavailable.")
            saved = inspect_store(db_path)  # SQLite mode=ro + query_only; this never creates or seeds a DB
            if (len({item.sample.fixture_id for item in saved}) != len(saved)
                    or any(catalog.get(item.sample.fixture_id) != item.sample for item in saved)):
                raise StoreError("Stored values do not match approved examples.")
        except (StoreError, OSError, sqlite3.Error):
            return JSONResponse({"error": "sample_history_unavailable"}, status_code=503, headers=HEADERS)
        response.headers.update(HEADERS)
        return HistoryResponse(snapshots=tuple(
            HistoryRow(fixture_id=item.sample.fixture_id, as_of=item.sample.as_of, stored_at_utc=item.stored_at_utc,
                       account=item.sample.account, positions=tuple(
                           HistoryPosition.model_validate(position, from_attributes=True) for position in item.sample.positions
                       ))
            for item in reversed(saved)
        ))

    if dist is not None:
        @app.get("/", include_in_schema=False)
        def shell() -> FileResponse:
            index = dist / "index.html"
            if index.is_symlink() or not index.is_file():
                raise HTTPException(503, build_hint, headers=HEADERS)
            return FileResponse(index, media_type="text/html", headers=HEADERS)

        @app.get("/assets/{asset}", include_in_schema=False)
        def built_asset(asset: str) -> FileResponse:
            # Do not mount a broad filesystem tree. Only built browser asset types are served.
            if not ASSET_NAME.fullmatch(asset):
                raise HTTPException(404)
            path = (dist / "assets" / asset).resolve()
            if path.parent != dist / "assets" or not path.is_file():
                raise HTTPException(404)
            return FileResponse(path, headers={"X-Content-Type-Options": "nosniff"})

    return app


def from_environment() -> FastAPI:
    return create_history_app(Path(os.environ.get("TICKFRAME_HISTORY_DB") or DEFAULT_DB), HISTORY_DIST)

"""One loopback-only preview origin. No broker connection, auth, or write routes."""

import os
from pathlib import Path
import re

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from app.api.sample_snapshot import create_sample_router
from app.api.status import router as status_router
from app.sample_history import DEFAULT_DB, HEADERS, ROOT, create_history_app
from app.services.sample_snapshot import FIXTURE_PATH, load_sample_fixture

LOCAL_DIST = ROOT / "Frontend" / "LocalWorkspace" / "dist"
LOCAL_HOST = re.compile(r"(?:localhost|127\.0\.0\.1|\[::1\])(?::[0-9]{1,5})?", re.IGNORECASE)
FORWARD_HEADERS = {"forwarded", "x-forwarded-for", "x-forwarded-host", "x-forwarded-port", "x-forwarded-proto", "x-real-ip"}


def create_local_workspace(db_path: Path, frontend_dir: Path | None = None) -> FastAPI:
    # Use the same validated reader and narrow built-asset surface as standalone history.
    app = create_history_app(
        db_path, frontend_dir, build_hint="Build the local workspace first: npm run build:local in Frontend.",
    )
    app.title = "Tickframe Local Workspace"
    app.version = "0.7.0"
    app.include_router(status_router)
    app.include_router(create_sample_router(load_sample_fixture(FIXTURE_PATH)))

    @app.middleware("http")
    async def loopback_only(request: Request, call_next):
        hosts = request.headers.getlist("host")
        if (request.client is None or request.client.host not in {"127.0.0.1", "::1"}
                or len(hosts) != 1 or not LOCAL_HOST.fullmatch(hosts[0])
                or any(key in request.headers for key in FORWARD_HEADERS)):
            return JSONResponse({"error": "local_workspace_only"}, status_code=403, headers=HEADERS)
        response = await call_next(request)
        if request.url.path.startswith("/api/"):
            response.headers.update(HEADERS)
        return response

    return app


def from_environment() -> FastAPI:
    return create_local_workspace(Path(os.environ.get("TICKFRAME_HISTORY_DB") or DEFAULT_DB), LOCAL_DIST)

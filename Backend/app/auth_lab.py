"""Explicit, separate ASGI entry point for the test-only sign-in lab."""

import os
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.responses import FileResponse, JSONResponse, PlainTextResponse
from fastapi.staticfiles import StaticFiles

from app.api.lab_auth import LabMode, create_router
from app.security.lab import LabError, LabState

LAB_DIST = Path(__file__).resolve().parents[2] / "Frontend" / "AuthLab" / "dist"
ARENA_FRAMES = "'self' https://arena.ai https://*.arena.ai https://lmarena.ai https://*.lmarena.ai"
CSP = (
    "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; "
    "font-src 'self'; connect-src 'self'; object-src 'none'; frame-src 'none'; base-uri 'none'; form-action 'self'"
)


def create_lab_app(*, mode: LabMode, frontend_dir: Path | None = None, state: LabState | None = None) -> FastAPI:
    if not isinstance(mode, LabMode):
        raise ValueError("Choose an explicit sign-in lab mode.")
    app = FastAPI(title="Tickframe Access Lab", version="0.3.1", docs_url=None, redoc_url=None,
                  openapi_url=None, redirect_slashes=False)
    app.include_router(create_router(state if state is not None else LabState(), mode))

    @app.exception_handler(LabError)
    async def handle_lab_error(_request: Request, error: LabError) -> JSONResponse:
        headers = {"Retry-After": str(error.retry_after)} if error.retry_after is not None else {}
        return JSONResponse({"error": error.code}, status_code=error.status, headers=headers)

    @app.middleware("http")
    async def lab_headers(request: Request, call_next):
        response = await call_next(request)
        is_launch_page = request.url.path == "/"
        is_hosted_lab_page = mode == LabMode.ARENA and request.url.path == "/lab"
        # The launch page holds no forms. The lab accepts Arena's preview frame
        # in hosted mode or a top-level tab; the local mode is never frameable.
        ancestors = ARENA_FRAMES if is_hosted_lab_page else "'none'"
        response.headers["Content-Security-Policy"] = CSP + ("" if is_launch_page else f"; frame-ancestors {ancestors}")
        response.headers["Referrer-Policy"] = "no-referrer"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        response.headers["Cache-Control"] = "no-store"
        if not is_launch_page and not is_hosted_lab_page:
            response.headers["X-Frame-Options"] = "DENY"
        return response

    @app.get("/")
    @app.get("/lab")
    async def render_lab():
        if frontend_dir is None or not (frontend_dir / "index.html").is_file():
            return PlainTextResponse("Build the Access Lab UI before opening this page.", status_code=503)
        return FileResponse(frontend_dir / "index.html", media_type="text/html")

    if frontend_dir is not None and (frontend_dir / "assets").is_dir():
        app.mount("/assets", StaticFiles(directory=frontend_dir / "assets"), name="lab-assets")
    return app


def from_environment() -> FastAPI:
    try:
        mode = LabMode(os.environ.get("TICKFRAME_LAB_MODE", ""))
    except ValueError:
        raise RuntimeError("Set TICKFRAME_LAB_MODE to loopback or arena to start the test-only lab.") from None
    return create_lab_app(mode=mode, frontend_dir=LAB_DIST)

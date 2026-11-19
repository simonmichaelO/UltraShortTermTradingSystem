"""Serve Tickframe's fixture UI and status API from one browser origin."""

from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from app.api.status import router as status_router

FRONTEND_DIST = Path(__file__).resolve().parents[2] / "Frontend" / "dist"


def create_app(frontend_dir: Path | None = None) -> FastAPI:
    app = FastAPI(
        title="Tickframe Preview Status",
        version="0.2.0",
        docs_url=None,
        redoc_url=None,
        openapi_url=None,
        redirect_slashes=False,
    )
    app.include_router(status_router)
    # Mount the compiled UI last. An unbuilt checkout still serves the API;
    # arbitrary paths cannot read source, credentials, or project files.
    if frontend_dir is not None and (frontend_dir / "index.html").is_file():
        app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="dashboard")
    return app


app = create_app(FRONTEND_DIST)

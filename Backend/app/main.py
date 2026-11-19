"""Serve Tickframe's fixture UI and read-only APIs from one browser origin."""

from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles

from app.api.sample_snapshot import create_sample_router
from app.api.status import router as status_router
from app.services.sample_snapshot import FIXTURE_PATH, load_sample_fixture

FRONTEND_DIST = Path(__file__).resolve().parents[2] / "Frontend" / "dist"


def create_app(frontend_dir: Path | None = None, *, fixture_path: Path = FIXTURE_PATH) -> FastAPI:
    app = FastAPI(
        title="Tickframe Sample Preview",
        version="0.4.0",
        docs_url=None,
        redoc_url=None,
        openapi_url=None,
        redirect_slashes=False,
    )
    app.include_router(status_router)
    app.include_router(create_sample_router(load_sample_fixture(fixture_path)))

    @app.middleware("http")
    async def prevent_stale_shell(request: Request, call_next):
        response = await call_next(request)
        if request.url.path.startswith("/api/") or response.headers.get("content-type", "").startswith("text/html"):
            response.headers["Cache-Control"] = "no-store"
        return response

    # Mount the compiled UI last. An unbuilt checkout still serves the API;
    # arbitrary paths cannot read source, credentials, or project files.
    if frontend_dir is not None and (frontend_dir / "index.html").is_file():
        app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="dashboard")
    return app


app = create_app(FRONTEND_DIST)

import json
from datetime import datetime, timedelta, timezone

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import create_app


pytestmark = pytest.mark.anyio


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.fixture
async def client():
    async with AsyncClient(transport=ASGITransport(app=create_app()), base_url="http://testserver") as test_client:
        yield test_client


async def test_status_reports_current_utc_time_and_only_preview_capabilities(client):
    before = datetime.now(timezone.utc)
    response = await client.get("/api/v1/status")
    after = datetime.now(timezone.utc)
    assert response.status_code == 200
    assert response.headers["cache-control"] == "no-store"
    assert response.headers["content-type"].startswith("application/json")
    status = response.json()
    generated_at = datetime.fromisoformat(status.pop("generated_at"))
    assert generated_at.utcoffset() == timedelta(0)
    assert before <= generated_at <= after
    assert status == {
        "schema_version": 1,
        "service": "tickframe",
        "environment": "preview",
        "mt5_connection": "not_configured",
        "data_source": "simulated_examples",
        "real_controls_available": False,
    }


@pytest.mark.parametrize("method", ["POST", "PUT", "PATCH", "DELETE"])
async def test_status_never_accepts_writes(client, method):
    assert (await client.request(method, "/api/v1/status", json={"real_controls_available": True})).status_code == 405
    assert (await client.get("/api/v1/status")).json()["real_controls_available"] is False


@pytest.mark.parametrize("path", ["/docs", "/redoc", "/openapi.json", "/api/v1/positions", "/api/v1/orders"])
async def test_no_other_routes_exposed_without_the_static_ui(client, path):
    assert (await client.get(path)).status_code == 404


async def test_static_mount_serves_ui_without_shadowing_api_or_project_files(tmp_path):
    static_dir = tmp_path / "dist"
    static_dir.mkdir()
    (static_dir / "index.html").write_text("<!doctype html><title>Tickframe demo</title>", encoding="utf-8")
    (tmp_path / "not-public.json").write_text(json.dumps({"marker": "private file"}), encoding="utf-8")
    async with AsyncClient(transport=ASGITransport(app=create_app(static_dir)), base_url="http://testserver") as mounted:
        assert "Tickframe demo" in (await mounted.get("/")).text
        assert (await mounted.get("/api/v1/status")).json()["schema_version"] == 1
        assert (await mounted.get("/api/v1/broker")).status_code == 404
        assert (await mounted.get("/not-public.json")).status_code == 404
        assert (await mounted.post("/api/v1/status")).status_code == 405

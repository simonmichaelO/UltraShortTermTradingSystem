from contextlib import closing
from pathlib import Path
import sqlite3

import pytest
from httpx import ASGITransport, AsyncClient

from app.database.sample_store import seed_store
from app.local_workspace import create_local_workspace

pytestmark = pytest.mark.anyio
STATUS = "/api/v1/status"
SAMPLE = "/api/v1/sample-snapshot"
HISTORY = "/api/v1/sample-history"


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.fixture
def archive(tmp_path):
    path = tmp_path / "existing.sqlite3"
    seed_store(path)
    return path


def client(path: Path, *, host="127.0.0.1:5182", peer="127.0.0.1", dist=None, headers=None):
    return AsyncClient(transport=ASGITransport(app=create_local_workspace(path, dist), client=(peer, 40000)),
                       base_url=f"http://{host}", headers=headers)


async def test_one_loopback_origin_reads_all_three_routes_without_writing(archive):
    original = archive.read_bytes()
    async with client(archive) as browser:
        status = await browser.get(STATUS)
        sample = await browser.get(SAMPLE)
        history = await browser.get(HISTORY)
    for response in (status, sample, history):
        assert response.status_code == 200 and response.headers["cache-control"] == "no-store"
        assert response.json()["mt5_connection"] == "not_configured"
        assert response.json()["real_controls_available"] is False
    assert sample.json()["sample"]["account"]["equity_cents"] == 248672
    assert [r["account"]["equity_cents"] for r in history.json()["snapshots"]] == [249176, 248672]
    assert archive.read_bytes() == original


async def test_missing_history_does_not_create_a_db_or_break_status_or_sample(tmp_path):
    missing = tmp_path / "missing.sqlite3"
    async with client(missing) as browser:
        history = await browser.get(HISTORY)
        assert history.status_code == 503 and history.json() == {"error": "sample_history_unavailable"}
        assert (await browser.get(SAMPLE)).status_code == 200
        assert (await browser.get(STATUS)).status_code == 200
    assert not missing.exists()


async def test_verified_empty_history_is_success_without_fallback(archive):
    with closing(sqlite3.connect(archive)) as db, db:
        db.execute("DELETE FROM sample_snapshots")  # disposable test fixture only
    original = archive.read_bytes()
    async with client(archive) as browser:
        history = await browser.get(HISTORY)
        assert history.status_code == 200 and history.json()["snapshots"] == []
        assert (await browser.get(SAMPLE)).status_code == 200
    assert archive.read_bytes() == original


async def test_sample_delivery_test_does_not_change_history(archive):
    async with client(archive) as browser:
        before = (await browser.get(HISTORY)).json()
        assert (await browser.get(SAMPLE, params={"scenario": "outage"})).status_code == 503
        assert (await browser.get(SAMPLE, params={"scenario": "delayed"})).json()["scenario"] == "delayed"
        assert (await browser.get(HISTORY)).json() == before


@pytest.mark.parametrize("host,peer,headers", [
    ("workspace.example", "127.0.0.1", {}),
    ("localhost.example", "127.0.0.1", {}),
    ("localhost:5182", "192.0.2.10", {}),
    ("127.0.0.1:5182", "127.0.0.1", {"X-Forwarded-For": "192.0.2.10"}),
    ("localhost:5182", "127.0.0.1", {"Forwarded": "for=192.0.2.10"}),
])
async def test_nonlocal_host_peer_or_proxy_is_refused(archive, host, peer, headers):
    async with client(archive, host=host, peer=peer, headers=headers) as browser:
        for path in ("/", HISTORY, SAMPLE, STATUS):
            response = await browser.get(path)
            assert response.status_code == 403
            assert response.json() == {"error": "local_workspace_only"}


async def test_only_compiled_assets_no_raw_data_or_other_service_routes(archive, tmp_path):
    dist = tmp_path / "dist"
    assets = dist / "assets"
    assets.mkdir(parents=True)
    (dist / "index.html").write_text("<!doctype html><title>Local Workspace</title>", encoding="utf-8")
    (assets / "index-safe.js").write_text("const sample = true;", encoding="utf-8")
    (assets / "existing.sqlite3").write_bytes(archive.read_bytes())
    async with client(archive, host="localhost:5182", dist=dist) as browser:
        assert (await browser.get("/")).status_code == 200
        assert (await browser.get("/assets/index-safe.js")).status_code == 200
        for path in ("/assets/existing.sqlite3", "/LocalData/SampleHistoryPreview/history.sqlite3",
                     "/api/v1/auth/session", "/api/v1/orders", "/openapi.json"):
            assert (await browser.get(path)).status_code == 404
        for path in (STATUS, SAMPLE, HISTORY):
            for method in ("POST", "PUT", "PATCH", "DELETE"):
                assert (await browser.request(method, path)).status_code == 405

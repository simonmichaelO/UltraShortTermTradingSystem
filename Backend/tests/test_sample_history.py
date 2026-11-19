from contextlib import closing
from hashlib import sha256
import json
import sqlite3

import pytest
from httpx import ASGITransport, AsyncClient

from app import sample_history
from app.database.sample_store import seed_store

pytestmark = pytest.mark.anyio
API = sample_history.HISTORY_PATH


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.fixture
def seeded(tmp_path):
    path = tmp_path / "copy.sqlite3"
    seed_store(path)
    return path


def browser(path, dist=None):
    return AsyncClient(transport=ASGITransport(app=sample_history.create_history_app(path, dist)), base_url="http://testserver")


async def test_history_reads_newest_first_without_changing_the_copy(seeded):
    before = seeded.read_bytes()
    async with browser(seeded) as client:
        response = await client.get(API)
        assert (await client.get(API)).json() == response.json()
    assert response.status_code == 200 and response.headers["cache-control"] == "no-store"
    assert response.headers["x-content-type-options"] == "nosniff" and seeded.read_bytes() == before
    body = response.json()
    assert body["schema_version"] == 1 and body["environment"] == "preview"
    assert body["storage"] == "sqlite_read_only" and body["data_source"] == "simulated_examples"
    assert body["mt5_connection"] == "not_configured" and body["real_controls_available"] is False
    assert [item["as_of"] for item in body["snapshots"]] == ["2026-11-17T14:31:32Z", "2026-11-17T14:30:32Z"]
    assert [item["account"]["equity_cents"] for item in body["snapshots"]] == [249176, 248672]
    assert all(item["stored_at_utc"].endswith("Z") and len(item["positions"]) == 3 for item in body["snapshots"])
    assert {p["symbol"] for p in body["snapshots"][0]["positions"]} == {"EURUSD", "GBPUSD", "XAUUSD"}


@pytest.mark.parametrize("method", ["POST", "PUT", "PATCH", "DELETE"])
async def test_api_refuses_writes(seeded, method):
    before = seeded.read_bytes()
    async with browser(seeded) as client:
        assert (await client.request(method, API, json={"account": "different"})).status_code == 405
    assert seeded.read_bytes() == before


@pytest.mark.parametrize("problem", ["missing", "corrupt"])
async def test_unavailable_database_includes_no_values_or_fallback(tmp_path, problem):
    path = tmp_path / "demo.sqlite3"
    if problem == "corrupt":
        path.write_bytes(b"corrupt test file")
    async with browser(path) as client:
        response = await client.get(API)
    assert response.status_code == 503 and response.headers["cache-control"] == "no-store"
    assert response.json() == {"error": "sample_history_unavailable"}
    assert path.exists() == (problem == "corrupt")


async def test_real_empty_sqlite_result_is_not_unavailable(seeded):
    with closing(sqlite3.connect(seeded)) as db, db:
        db.execute("DELETE FROM sample_snapshots")
    async with browser(seeded) as client:
        response = await client.get(API)
    assert response.status_code == 200 and response.json()["snapshots"] == []


async def test_validated_but_non_catalog_example_is_never_served(seeded):
    with closing(sqlite3.connect(seeded)) as db, db:
        fixture_id, payload = db.execute("SELECT fixture_id, payload_json FROM sample_snapshots LIMIT 1").fetchone()
        row = json.loads(payload)
        # A reconciled test change with a new checksum is still not an approved public example.
        for key in ("balance_cents", "equity_cents", "free_margin_cents", "peak_equity_cents"):
            row["account"][key] += 2000
        changed = json.dumps(row)
        db.execute("UPDATE sample_snapshots SET payload_json = ?, payload_sha256 = ? WHERE fixture_id = ?",
                   (changed, sha256(changed.encode()).hexdigest(), fixture_id))
    async with browser(seeded) as client:
        response = await client.get(API)
    assert response.status_code == 503 and response.json() == {"error": "sample_history_unavailable"}


async def test_missing_allowlist_fails_closed(seeded, monkeypatch):
    monkeypatch.setattr(sample_history, "load_sample_fixture", lambda _: None)
    async with browser(seeded) as client:
        assert (await client.get(API)).status_code == 503


async def test_serves_only_ui_assets_and_no_other_app_surface(seeded, tmp_path):
    dist = tmp_path / "site"
    assets = dist / "assets"
    assets.mkdir(parents=True)
    (dist / "index.html").write_text("<!doctype html><title>Sample History</title>", encoding="utf-8")
    (assets / "index-ab123.js").write_text("const test = 1", encoding="utf-8")
    (assets / "copy.sqlite3").write_bytes(seeded.read_bytes())
    async with browser(seeded, dist) as client:
        home = await client.get("/")
        assert home.status_code == 200 and home.headers["cache-control"] == "no-store"
        assert (await client.get("/assets/index-ab123.js")).status_code == 200
        for path in ("/assets/copy.sqlite3", "/copy.sqlite3", "/openapi.json", "/api/v1/status",
                     "/api/v1/sample-snapshot", "/api/v1/auth/session", "/api/v1/orders"):
            assert (await client.get(path)).status_code == 404

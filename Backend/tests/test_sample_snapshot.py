import json
from datetime import datetime, timedelta, timezone

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import create_app
from app.services.sample_snapshot import FIXTURE_PATH, load_sample_fixture

pytestmark = pytest.mark.anyio
API = "/api/v1/sample-snapshot"
REQUEST_MARKER = "x-tickframe-sample-request"


@pytest.fixture
def anyio_backend():
    return "asyncio"


def browser(app):
    return AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver")


@pytest.fixture
async def client():
    async with browser(create_app()) as connection:
        yield connection


async def test_api_serves_exact_synthetic_account_and_positions(client):
    before = datetime.now(timezone.utc)
    response = await client.get(API)
    after = datetime.now(timezone.utc)
    assert response.status_code == 200
    assert response.headers["cache-control"] == "no-store"
    assert response.headers["x-content-type-options"] == "nosniff"
    body = response.json()
    assert body["schema_version"] == 1 and body["environment"] == "preview"
    assert body["data_source"] == "simulated_examples" and body["mt5_connection"] == "not_configured"
    assert body["real_controls_available"] is False and body["scenario"] == "normal"
    issued = datetime.fromisoformat(body["issued_at"])
    assert before <= issued <= after and body["issued_at"] == body["published_at"]
    assert body["fresh_for_seconds"] == 30
    assert body["sample"] == json.loads(FIXTURE_PATH.read_text(encoding="utf-8"))
    assert body["sample"]["account"]["balance_cents"] == 244292
    assert sum(p["net_cents"] for p in body["sample"]["positions"]) == 4380


async def test_request_marker_is_optional_and_echoed_only_for_this_delivery(client):
    first = "1a" * 16
    second = "2b" * 16
    normal = await client.get(API, headers={REQUEST_MARKER: first})
    delayed = await client.get(API, params={"scenario": "delayed"}, headers={REQUEST_MARKER: second})
    bare = await client.get(API)
    invalid = await client.get(API, headers={REQUEST_MARKER: "not-a-marker"})
    assert normal.is_success and normal.headers[REQUEST_MARKER] == first
    assert delayed.is_success and delayed.headers[REQUEST_MARKER] == second
    assert bare.is_success and REQUEST_MARKER not in bare.headers
    assert invalid.status_code == 422 and REQUEST_MARKER not in invalid.headers


async def test_delay_does_not_change_the_fixture_or_normal_delivery(client):
    delayed = (await client.get(API, params={"scenario": "delayed"})).json()
    assert delayed["scenario"] == "delayed"
    assert datetime.fromisoformat(delayed["issued_at"]) - datetime.fromisoformat(delayed["published_at"]) == timedelta(seconds=90)
    normal = (await client.get(API)).json()
    assert normal["scenario"] == "normal" and normal["sample"] == delayed["sample"]


async def test_simulated_outage_is_503_without_fake_numbers_and_status_stays_up(client):
    unavailable = await client.get(API, params={"scenario": "outage"})
    assert unavailable.status_code == 503 and unavailable.headers["cache-control"] == "no-store"
    assert unavailable.json() == {"schema_version": 1, "data_source": "simulated_examples", "error": "simulated_outage"}
    assert (await client.get("/api/v1/status")).json()["real_controls_available"] is False
    assert (await client.get(API)).is_success


@pytest.mark.parametrize("method", ["POST", "PUT", "PATCH", "DELETE"])
async def test_snapshot_cannot_be_written(client, method):
    assert (await client.request(method, API, json={"balance_cents": 10})).status_code == 405
    assert (await client.get(API)).json()["sample"]["account"]["balance_cents"] == 244292


async def test_only_known_test_scenarios_are_accepted(client):
    assert (await client.get(API, params={"scenario": "broker"})).status_code == 422
    assert (await client.get("/api/v1/positions")).status_code == 404


@pytest.mark.parametrize("defect", ["missing", "invalid JSON", "inconsistent equity", "duplicate positions"])
async def test_bad_fixture_fails_closed_without_breaking_status(tmp_path, defect):
    path = tmp_path / "fixture.json"
    if defect == "invalid JSON":
        path.write_text("[", encoding="utf-8")
    elif defect != "missing":
        raw = json.loads(FIXTURE_PATH.read_text(encoding="utf-8"))
        if defect == "inconsistent equity":
            raw["account"]["equity_cents"] += 1
        else:
            raw["positions"][1]["id"] = raw["positions"][0]["id"]
        path.write_text(json.dumps(raw), encoding="utf-8")
    assert load_sample_fixture(path) is None
    async with browser(create_app(fixture_path=path)) as connection:
        assert (await connection.get("/api/v1/status")).is_success
        result = await connection.get(API)
        assert result.status_code == 503 and result.json()["error"] == "sample_unavailable"
        assert "sample" not in result.json()


async def test_shell_no_store_and_fixtures_not_addressable_as_files(tmp_path):
    (tmp_path / "index.html").write_text("<!doctype html><title>Sample dashboard</title>", encoding="utf-8")
    async with browser(create_app(frontend_dir=tmp_path)) as connection:
        shell = await connection.get("/")
        assert shell.is_success and shell.headers["cache-control"] == "no-store"
        assert (await connection.get("/app/services/fixtures/sample_snapshot_v1.json")).status_code == 404
        assert (await connection.get("/api/v1/auth/session")).status_code == 404

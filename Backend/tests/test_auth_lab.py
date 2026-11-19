from dataclasses import dataclass
from secrets import token_hex, token_urlsafe

import pyotp
import pytest
from httpx import ASGITransport, AsyncClient

from app.api.lab_auth import LabMode
from app.auth_lab import UI_PROFILE_PLACEHOLDER, create_lab_app, from_environment
from app.main import create_app
from app.security.lab import ACCOUNT_TTL, CHALLENGE_TTL, SESSION_IDLE_TTL, SESSION_TTL, SETUP_TTL, LabState

pytestmark = pytest.mark.anyio
API = "/api/v1/auth"
WORKSPACE = "/api/v1/lab/workspace"
ORIGIN = "http://127.0.0.1:5175"
COOKIE = "tf-loopback-lab-"
LAB_META = f'<meta name="tickframe-lab-profile" content="{UI_PROFILE_PLACEHOLDER}">'


@dataclass
class FakeClock:
    elapsed: float = 20.0
    utc: float = 1_800_000_000.0

    def tick(self, seconds):
        self.elapsed += seconds
        self.utc += seconds


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.fixture
def clock():
    return FakeClock()


@pytest.fixture
def app(clock):
    return create_lab_app(mode=LabMode.LOOPBACK, state=LabState(clock=lambda: clock.elapsed, utc_clock=lambda: clock.utc))


def connected(app, *, origin=ORIGIN, peer="127.0.0.1"):
    return AsyncClient(transport=ASGITransport(app=app, client=(peer, 31005)), base_url=origin, headers={"Origin": origin})


@pytest.fixture
async def client(app):
    async with connected(app) as browser:
        yield browser


def code_at(setup, clock, offset=0):
    return pyotp.TOTP(setup["manual_key"]).generate_otp(int(clock.utc) // 30 + offset)


def wrong_code(setup, clock):
    valid = {code_at(setup, clock, offset) for offset in (-1, 0, 1)}
    return next(f"{number:06}" for number in range(4) if f"{number:06}" not in valid)


async def start(client):
    result = await client.post(API + "/enroll", json={})
    assert result.status_code == 201
    assert result.headers["cache-control"] == "no-store"
    setup = result.json()
    assert setup["username"].startswith("lab-") and len(setup["password"]) == 24
    assert setup["qr_image"].startswith("data:image/png;base64,")
    return setup


async def paired(client, clock):
    setup = await start(client)
    result = await client.post(API + "/pair", json={"code": code_at(setup, clock)})
    assert result.status_code == 200 and result.json() == {"next": "password", "username": setup["username"]}
    assert client.cookies.get(COOKIE + "setup") is None
    return setup


async def password_step(client, setup):
    return await client.post(API + "/password", json={"username": setup["username"], "password": setup["password"]})


async def signed_in(client, clock):
    setup = await paired(client, clock)
    assert (await password_step(client, setup)).status_code == 200
    clock.tick(30)
    result = await client.post(API + "/totp", json={"code": code_at(setup, clock)})
    assert result.status_code == 200
    return setup


async def test_password_and_authenticator_are_both_required(client, clock):
    assert (await client.get(WORKSPACE)).status_code == 401
    setup = await start(client)
    assert client.cookies.get(COOKIE + "session") is None
    assert (await password_step(client, setup)).status_code == 401  # Not paired yet.
    assert (await client.post(API + "/totp", json={"code": code_at(setup, clock)})).status_code == 401
    assert (await client.post(API + "/pair", json={"code": code_at(setup, clock)})).is_success
    assert (await client.get(WORKSPACE)).status_code == 401
    assert (await password_step(client, setup)).json() == {"next": "totp"}
    assert client.cookies.get(COOKIE + "session") is None
    assert (await client.get(API + "/session")).status_code == 401
    assert (await client.get(WORKSPACE)).status_code == 401
    clock.tick(30)
    verified = await client.post(API + "/totp", json={"code": code_at(setup, clock)})
    assert verified.json() == {"next": "workspace"}
    assert client.cookies.get(COOKIE + "challenge") is None
    data = (await client.get(WORKSPACE)).json()
    assert data["username"] == setup["username"]
    assert data["role"] == "test_operator" and data["live_entries"] == "locked"
    assert data["mt5_connection"] == "not_configured" and data["data_source"] == "test_only"
    assert [event["event"] for event in data["login_history"]] == ["sign_in_succeeded", "test_account_created"]
    assert set(data["login_history"][0]) == {"event", "at"}


async def test_a_used_code_is_rejected_for_pairing_and_future_challenges(client, clock):
    setup = await paired(client, clock)
    assert (await password_step(client, setup)).is_success
    repeated = await client.post(API + "/totp", json={"code": code_at(setup, clock)})
    assert repeated.status_code == 401 and repeated.json() == {"error": "invalid_code"}
    clock.tick(30)
    code = code_at(setup, clock)
    assert (await client.post(API + "/totp", json={"code": code})).is_success
    assert (await client.post(API + "/auth-not-real", json={})).status_code == 404
    assert (await client.post(API + "/logout", json={})).status_code == 204
    assert (await password_step(client, setup)).is_success
    assert (await client.post(API + "/totp", json={"code": code})).status_code == 401
    assert (await client.get(WORKSPACE)).status_code == 401


async def test_setup_probe_fails_without_pending_browser_cookie(client):
    denied = await client.get(API + "/setup")
    assert denied.status_code == 401 and denied.json() == {"error": "setup_cookie_unavailable"}
    await start(client)
    accepted = await client.get(API + "/setup")
    assert accepted.status_code == 204 and not accepted.content


async def test_enrollment_proof_is_bound_to_the_browser(app, client, clock):
    setup = await start(client)
    async with connected(app) as other:
        assert (await other.post(API + "/pair", json={"code": code_at(setup, clock)})).json() == {"error": "setup_expired"}
    assert (await client.post(API + "/pair", json={"code": code_at(setup, clock)})).is_success


async def test_unknown_and_wrong_password_errors_match(client, clock):
    setup = await paired(client, clock)
    unknown = await client.post(API + "/password", json={"username": "lab-" + token_hex(8), "password": token_urlsafe(18)})
    wrong = await password_step(client, {**setup, "password": token_urlsafe(18)})
    assert unknown.status_code == wrong.status_code == 401
    assert unknown.json() == wrong.json() == {"error": "invalid_credentials"}
    assert client.cookies.get(COOKIE + "challenge") is None


async def test_password_attempts_are_limited_across_browsers(app, client, clock):
    setup = await paired(client, clock)
    for _ in range(6):
        result = await password_step(client, {**setup, "password": token_urlsafe(18)})
        assert result.status_code == 401
    async with connected(app) as other:
        limited = await password_step(other, setup)
        assert limited.status_code == 429 and limited.headers["retry-after"] == "60"
        clock.tick(60)
        assert (await password_step(other, setup)).is_success


async def test_code_attempts_remain_limited_across_password_challenges(client, clock):
    setup = await paired(client, clock)
    clock.tick(30)
    for index in range(5):
        assert (await password_step(client, setup)).is_success
        rejected = await client.post(API + "/totp", json={"code": wrong_code(setup, clock)})
        assert rejected.status_code == 401 and rejected.json() == {"error": "invalid_code"}
    assert (await password_step(client, setup)).is_success
    limited = await client.post(API + "/totp", json={"code": code_at(setup, clock)})
    assert limited.status_code == 429
    clock.tick(60)
    assert (await client.post(API + "/totp", json={"code": code_at(setup, clock)})).is_success


async def test_enrollment_has_a_global_budget(client):
    for _ in range(8):
        assert (await client.post(API + "/enroll", json={})).status_code == 201
    assert (await client.post(API + "/enroll", json={})).status_code == 429


async def test_setup_ends_after_five_misses(client, clock):
    setup = await start(client)
    for index in range(5):
        response = await client.post(API + "/pair", json={"code": wrong_code(setup, clock)})
        assert response.status_code == 401
        assert response.json()["error"] == ("invalid_code" if index < 4 else "setup_expired")
    assert (await client.post(API + "/pair", json={"code": code_at(setup, clock)})).json() == {"error": "setup_expired"}


async def test_setup_expiration_is_inclusive(client, clock):
    setup = await start(client)
    clock.tick(SETUP_TTL)
    assert (await client.post(API + "/pair", json={"code": code_at(setup, clock)})).json() == {"error": "setup_expired"}


async def test_challenge_expires_even_with_a_current_code(client, clock):
    setup = await paired(client, clock)
    assert (await password_step(client, setup)).is_success
    clock.tick(CHALLENGE_TTL)
    assert (await client.post(API + "/totp", json={"code": code_at(setup, clock)})).json() == {"error": "challenge_expired"}
    assert (await client.get(WORKSPACE)).status_code == 401


async def test_session_probes_do_not_extend_the_idle_deadline(client, clock):
    await signed_in(client, clock)
    clock.tick(SESSION_IDLE_TTL - 1)
    assert (await client.get(API + "/session")).json()["valid_for_seconds"] == 1
    clock.tick(1)
    assert (await client.get(WORKSPACE)).status_code == 401


async def test_max_session_lifetime_even_with_workspace_reads(client, clock):
    await signed_in(client, clock)
    for _ in range(SESSION_TTL // (SESSION_IDLE_TTL // 2) - 1):
        clock.tick(SESSION_IDLE_TTL // 2)
        assert (await client.get(WORKSPACE)).is_success
    clock.tick(SESSION_IDLE_TTL // 2)
    assert (await client.get(WORKSPACE)).status_code == 401


async def test_test_identity_expires(client, clock):
    setup = await paired(client, clock)
    clock.tick(ACCOUNT_TTL)
    assert (await password_step(client, setup)).json() == {"error": "invalid_credentials"}


async def test_logout_revokes_server_session_and_own_history_stays_private(app, client, clock):
    first = await signed_in(client, clock)
    first_cookie = client.cookies.get(COOKIE + "session")
    first_data = (await client.get(WORKSPACE)).json()
    async with connected(app) as other:
        assert (await other.get(WORKSPACE)).status_code == 401
        clock.tick(60)
        second = await signed_in(other, clock)
        second_data = (await other.get(WORKSPACE)).json()
    assert first_data["username"] == first["username"] != second["username"] == second_data["username"]
    assert second_data["login_history"] != first_data["login_history"]
    assert (await client.post(API + "/logout", json={})).status_code == 204
    assert client.cookies.get(COOKIE + "session") is None
    assert (await client.get(WORKSPACE, headers={"Cookie": f"{COOKIE}session={first_cookie}"})).status_code == 401
    assert (await password_step(client, first)).is_success
    clock.tick(30)
    assert (await client.post(API + "/totp", json={"code": code_at(first, clock)})).is_success
    assert client.cookies.get(COOKIE + "session") != first_cookie
    history = (await client.get(WORKSPACE)).json()["login_history"]
    assert [item["event"] for item in history][:2] == ["sign_in_succeeded", "signed_out"]


async def test_worker_restart_cannot_restore_a_cookie_or_account(client, clock):
    setup = await signed_in(client, clock)
    old = client.cookies.get(COOKIE + "session")
    async with connected(create_lab_app(mode=LabMode.LOOPBACK)) as restarted:
        assert (await restarted.get(WORKSPACE, headers={"Cookie": f"{COOKIE}session={old}"})).status_code == 401
        assert (await password_step(restarted, setup)).status_code == 401


@pytest.mark.parametrize("header", [{"Origin": "null"}, {"Origin": "http://localhost:5175"}, {"Sec-Fetch-Site": "cross-site"}])
async def test_cross_origin_writes_are_refused(client, header):
    response = await client.post(API + "/enroll", json={}, headers=header)
    assert response.status_code == 403 and response.json() == {"error": "invalid_origin"}
    assert not response.headers.get("access-control-allow-origin")
    assert not response.headers.get("set-cookie")


async def test_missing_origin_and_non_loopback_peer_are_refused(app):
    async with AsyncClient(transport=ASGITransport(app=app), base_url=ORIGIN) as no_origin:
        assert (await no_origin.post(API + "/enroll", json={})).status_code == 403
    async with connected(app, peer="192.0.2.15") as remote:
        assert (await remote.post(API + "/enroll", json={})).status_code == 403


async def test_invalid_inputs_do_not_echo_submitted_values(client):
    secret = token_urlsafe(24)
    body = {"config": secret}
    result = await client.post(API + "/enroll", json=body)
    assert result.status_code == 400 and result.json() == {"error": "invalid_request"}
    assert secret not in result.text
    assert (await client.post(API + "/enroll", json={"oversize": "a" * 4100})).status_code == 413
    assert (await client.post(API + "/enroll", data=body)).status_code == 415


async def test_hosted_mode_cookies_and_launch_page_headers(tmp_path):
    (tmp_path / "index.html").write_text(f"<!doctype html>{LAB_META}<title>Lab</title>", encoding="utf-8")
    hosted = create_lab_app(mode=LabMode.ARENA, frontend_dir=tmp_path)
    origin = "https://5174-test-sandbox.e2b.app"
    async with connected(hosted, origin=origin) as browser:
        landing = await browser.get("/")
        assert landing.status_code == 200 and "frame-ancestors" not in landing.headers["content-security-policy"]
        form = await browser.get("/lab")
        assert form.status_code == 200 and "x-frame-options" not in form.headers
        assert LAB_META.replace(UI_PROFILE_PLACEHOLDER, "arena") in form.text
        assert "frame-ancestors 'self' https://arena.ai" in form.headers["content-security-policy"]
        created = await browser.post(API + "/enroll", json={})
        cookie = created.headers["set-cookie"].lower()
        assert cookie.startswith("__host-tf-lab-setup=")
        assert all(attribute in cookie for attribute in ("secure", "httponly", "samesite=none", "path=/", "partitioned"))
        assert "domain=" not in cookie
        assert created.headers["cache-control"] == "no-store"
        assert not (await browser.get("/index.html")).is_success
        assert (await browser.post(API + "/enroll", json={}, headers={"Origin": origin.replace("https:", "http:")})).status_code == 403
    async with connected(hosted) as local:
        assert (await local.post(API + "/enroll", json={})).status_code == 403


async def test_loopback_form_refuses_framing(tmp_path):
    (tmp_path / "index.html").write_text(f"<!doctype html>{LAB_META}<title>Lab</title>", encoding="utf-8")
    local = create_lab_app(mode=LabMode.LOOPBACK, frontend_dir=tmp_path)
    async with connected(local) as browser:
        form = await browser.get("/lab")
        assert form.headers["x-frame-options"] == "DENY"
        assert LAB_META.replace(UI_PROFILE_PLACEHOLDER, "loopback") in form.text
        assert "frame-ancestors 'none'" in form.headers["content-security-policy"]


async def test_no_trading_surfaces_or_auth_on_the_public_preview(client):
    for path in ("/api/v1/status", "/api/v1/orders", "/api/v1/commands", "/api/v1/positions", "/openapi.json", "/docs"):
        assert (await client.get(path)).status_code == 404
    async with connected(create_app()) as public:
        assert (await public.post(API + "/enroll", json={})).status_code == 404
        assert (await public.get(WORKSPACE)).status_code == 404
        assert (await public.get("/api/v1/status")).json()["real_controls_available"] is False


async def test_lab_must_be_started_with_an_explicit_mode(monkeypatch):
    monkeypatch.delenv("TICKFRAME_LAB_MODE", raising=False)
    with pytest.raises(RuntimeError, match="Set TICKFRAME_LAB_MODE"):
        from_environment()


async def test_tab_only_flow_needs_both_factors_without_a_cookie(clock):
    hosted = create_lab_app(mode=LabMode.ARENA, state=LabState(clock=lambda: clock.elapsed, utc_clock=lambda: clock.utc))
    origin = "https://5174-test-sandbox.e2b.app"
    tab = API + "/tab"
    async with connected(hosted, origin=origin) as browser:
        async def post(step, data):
            reply = await browser.post(tab + step, json=data)
            assert "set-cookie" not in reply.headers
            assert reply.headers["cache-control"] == "no-store"
            assert len(browser.cookies) == 0
            return reply

        setup = (await post("/enroll", {})).json()
        issued = setup["handle"]
        cycle = code_at(setup, clock)
        credentials = {"username": setup["username"], "password": setup["password"]}
        assert (await post("/password", credentials)).status_code == 401
        assert (await post("/workspace", {"handle": issued})).status_code == 401
        assert (await post("/totp", {"handle": issued, "code": cycle})).status_code == 401
        assert (await post("/pair", {"handle": issued, "code": cycle})).json() == {
            "next": "password", "username": setup["username"],
        }
        assert (await post("/pair", {"handle": issued, "code": cycle})).status_code == 401
        wrong = await post("/password", {**credentials, "password": token_urlsafe(18)})
        assert wrong.json() == {"error": "invalid_credentials"}
        challenge = (await post("/password", credentials)).json()["handle"]
        assert challenge != issued
        assert (await post("/workspace", {"handle": challenge})).status_code == 401
        assert (await post("/totp", {"handle": challenge, "code": cycle})).json() == {"error": "invalid_code"}
        clock.tick(30)
        fresh = code_at(setup, clock)
        session = (await post("/totp", {"handle": challenge, "code": fresh})).json()["handle"]
        assert session != challenge
        assert (await post("/totp", {"handle": challenge, "code": fresh})).status_code == 401
        assert (await browser.get(WORKSPACE)).status_code == 401
        assert (await post("/session", {"handle": session})).json()["username"] == setup["username"]
        workspace = (await post("/workspace", {"handle": session})).json()
        assert workspace["live_entries"] == "locked" and workspace["mt5_connection"] == "not_configured"
        assert workspace["role"] == "test_operator" and "handle" not in workspace
        assert [event["event"] for event in workspace["login_history"]][:1] == ["sign_in_succeeded"]
        assert (await post("/logout", {"handle": session})).status_code == 204
        assert (await post("/workspace", {"handle": session})).status_code == 401


async def test_tab_route_does_not_accept_cookie_handles_or_cross_origin_setup(clock):
    hosted = create_lab_app(mode=LabMode.ARENA, state=LabState(clock=lambda: clock.elapsed, utc_clock=lambda: clock.utc))
    origin = "https://5174-test-sandbox.e2b.app"
    tab = API + "/tab"
    async with connected(hosted, origin=origin) as browser:
        denied = await browser.post(tab + "/enroll", json={}, headers={"Origin": "https://other.example"})
        assert denied.status_code == 403 and not denied.headers.get("set-cookie")
        cookie_setup = (await browser.post(API + "/enroll", json={})).json()
        cookie_handle = browser.cookies.get("__Host-tf-lab-setup")
        assert cookie_handle and (await browser.post(tab + "/pair", json={
            "handle": cookie_handle, "code": code_at(cookie_setup, clock),
        })).json() == {"error": "setup_expired"}
        browser.cookies.clear()
        tab_setup = (await browser.post(tab + "/enroll", json={})).json()
        cookie_attempt = await browser.post(API + "/pair", json={"code": code_at(tab_setup, clock)},
                                           headers={"Cookie": f"__Host-tf-lab-setup={tab_setup['handle']}"})
        assert cookie_attempt.json() == {"error": "setup_expired"}
        assert (await browser.get(tab + "/workspace", params={"handle": token_urlsafe(32)})).status_code == 405


async def test_tab_challenge_still_expires(client, clock):
    hosted = create_lab_app(mode=LabMode.ARENA, state=LabState(clock=lambda: clock.elapsed, utc_clock=lambda: clock.utc))
    tab = API + "/tab"
    assert (await client.post(tab + "/enroll", json={})).status_code == 404
    async with connected(hosted, origin="https://5174-test-sandbox.e2b.app") as browser:
        setup = (await browser.post(tab + "/enroll", json={})).json()
        assert (await browser.post(tab + "/pair", json={"handle": setup["handle"], "code": code_at(setup, clock)})).is_success
        credentials = {"username": setup["username"], "password": setup["password"]}
        challenge = (await browser.post(tab + "/password", json=credentials)).json()["handle"]
        clock.tick(CHALLENGE_TTL)
        result = await browser.post(tab + "/totp", json={"handle": challenge, "code": code_at(setup, clock)})
        assert result.json() == {"error": "challenge_expired"}


async def test_preview_profile_is_from_server_not_the_outer_address(tmp_path):
    index = tmp_path / "index.html"
    index.write_text(f"<!doctype html>{LAB_META}<title>Lab</title>", encoding="utf-8")
    hosted = create_lab_app(mode=LabMode.ARENA, frontend_dir=tmp_path)
    async with connected(hosted, origin="https://outer-preview.example.invalid") as browser:
        home = await browser.get("/lab", params={"mode": "loopback"})
        assert home.status_code == 200
        assert LAB_META.replace(UI_PROFILE_PLACEHOLDER, "arena") in home.text
        # Metadata only controls the form. It does not relax the API host guard.
        assert (await browser.post(API + "/tab/enroll", json={})).status_code == 403
        index.write_text("<!doctype html><title>Old build</title>", encoding="utf-8")
        assert (await browser.get("/lab")).status_code == 503

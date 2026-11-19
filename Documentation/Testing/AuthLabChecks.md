# Access Lab verification · v0.3

**Scope:** an isolated test-only login with password verification and a fresh authenticator code. The starter EA, public v0.2 dashboard, risk values, broker gates and master specification are unchanged. Nothing can send an order or load broker data. This does not complete product security or roadmap Stage 6.

## Hosted default patch · v0.3.2

After v0.3.1, the operator still saw the cookie error, confirming that the prior cookie path was reached. It is not established whether the browser rendered an older build, hid the fallback, or selected the normal button. The new build uses a server-rendered profile marker rather than guessing from the browser hostname. The **Tickframe sign-in lab v0.3.2** Live Preview uses a fresh origin and its only creation button is **Create test account without cookies**. The loopback lab keeps its cookie session and the original dashboard stays unchanged.

- **40 Python ASGI tests passed**, including server-selected profiles with a different outer address, rejection of an old build without the mode marker, unchanged origin guard and two-factor tests.
- **5 Chromium cases passed on the hosted-mode HTTPS replay**, including one account-creation button, no cookie requests from the hosted form, no workspace before both factors, rejection of a reused code, no session after reload, and iframe session isolation. Two loopback-only cases skipped as intended. **5 Chromium cases passed in loopback mode** (two hosted-only cases skipped).
- **Lab build, 9 Node unit tests and 9 regular dashboard Chromium tests passed.** The user's actual v0.3.2 result is pending; report only the heading or error text.

## Cookie compatibility patch · v0.3.1

The operator reported the setup-cookie error at account creation in the hosted lab. The exact reason that the cookie did not return (browser policy or preview transport) was not established. The new opt-in **Create test account without cookies** path is scoped to this synthetic Arena lab and never sends or sets a cookie; keep the tab open. The regular v0.2 preview, HttpOnly-cookie option and login factors are unchanged.

- **39 Python ASGI tests passed**, including three patch scenarios: full no-cookie sign-in, wrong/reused codes, logout and role; origin rejection and transport isolation; challenge expiry and absence of tab routes in loopback.
- **7 Chromium tests passed in the loopback HTTPS replay** of the preview, including a simulated setup-cookie failure followed by successful enrollment, pairing, password, fresh code, and a workspace that cannot be resumed after reload. This is not a confirmation from the user’s actual hosted browser.
- **Lab build, 9 Node unit tests, and 9 existing dashboard Chromium tests passed.** The user’s checkpoint was the **Set up your authenticator** heading; the v0.3.1 retry still hit the cookie path, prompting the v0.3.2 fix above. No secret inputs may be shared.

## Automated results from v0.3

| Check | Result |
|---|---|
| Python ASGI | **36 passed** across the lab and existing status service. Includes no workspace access before both factors, setup/cookie binding, generic credential failures, TOTP replay prevention, maximum attempts, expiration, logout revocation, scope separation, restart and origin/body guards. |
| Lab production build | **Passed**. Separate Vite output `Frontend/AuthLab/dist`; the original build is not modified. |
| Lab Chromium, local HTTP | **5 passed**, 1 TLS-specific scenario skipped. Browser journey includes wrong password and reused TOTP then successful sign-in, session persistence and logout, mobile/manual setup, dropped-cookie report and outage/expiry handling. |
| Lab Chromium, local HTTPS replay | **6 passed**, including iframe authentication with third-party cookies restricted and partition isolation from the top-level tab. Used a disposable loopback certificate, a synthetic `.e2b.app` hostname resolved to loopback, and a test-served `preview.arena.ai` parent. During this isolated QA run only, the browser was configured to allow the mock parent to use its loopback test endpoint. |
| Regression | Existing v0.2 public dashboard: **9 Node + 9 Chromium tests passed**. Public status still returns `real_controls_available: false`; no lab auth route is mounted there. |
| Dependency and layout checks | Python `pip check` passed; `npm audit --omit=dev` reported no known runtime vulnerabilities. Chromium smoke checked widths 320–1440 px without horizontal overflow. Not a production security, browser compatibility or accessibility audit. |

## Hosted acceptance

The latest Live Preview is exposed as **Tickframe sign-in lab v0.3.2**. From within the sandbox, the external proxy requires Arena's traffic access token (also required for the existing v0.2 preview), so unauthenticated requests to the raw proxy address are not an end-to-end test. Local QA exercised the hosted-mode application, HTTPS and embedded-cookie behavior. **The user reported a cookie error twice; the v0.3.2 retry on the new preview is pending.** Follow the [cookie-error instructions](../UserGuide/AccessLab.md#if-something-doesnt-look-right); gather only headings or results, not any password, seed, session token, QR image or code.

## Reproduce the TLS QA profile (optional developer test)

Use the standard [loopback tests](../../Backend/AuthLab.md#tests) first. For the isolated TLS replay on Unix with `openssl`, use a disposable directory outside the project (never trust or install the certificate in the OS):

```sh
qa=$(mktemp -d)
openssl req -x509 -newkey rsa:2048 -sha256 -nodes -days 1 \
  -subj '/CN=5174-tickframe-qa.e2b.app' \
  -addext 'subjectAltName=DNS:5174-tickframe-qa.e2b.app' \
  -keyout "$qa/key.pem" -out "$qa/cert.pem"
# Inside Backend, with requirements-auth-test.txt installed:
TICKFRAME_LAB_MODE=arena .venv/bin/python -m uvicorn app.auth_lab:from_environment \
  --factory --host 127.0.0.1 --port 5443 --no-access-log --no-proxy-headers \
  --ssl-keyfile "$qa/key.pem" --ssl-certfile "$qa/cert.pem"
```

From a second terminal in `Frontend`, after `npm ci`, `npm run build:auth` and installing Playwright Chromium:

```sh
AUTH_LAB_BASE_URL=https://5174-tickframe-qa.e2b.app AUTH_LAB_TLS_TEST_PORT=5443 npm run test:auth-browser
```

The browser runner maps the synthetic name to loopback; this test does not request a real sandbox. Stop the QA server and delete its disposable certificate directory when finished. Separate OS/browser testing, access logging and operational account review still need evidence before any real implementation.

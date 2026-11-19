# Web status milestone · v0.2

**Scope:** The hosted preview serves the React dashboard and a versioned, read-only FastAPI status response. This still does not run MT5, manage positions, authenticate users or enable real entries. Stage 1 broker gates are unchanged. The dashboard may receive a real response from the **web** service while all market/account figures remain illustrative.

## User-reported preview checks

The operator opened Overview, changed the active preview instrument, set and reopened intensity at **70/100**, applied the preview stop and observed **Emergency stop**, then cleared the stop and observed **Shadow only**. These were browser-only checks, not broker actions.

## Hosted status check

**PASS (user-reported):** The user confirmed that **Web API** displayed **Online** in the hosted dashboard. This confirms web service reachability from their browser, not MT5 reachability. The disconnected terminal and locked live-entry states are covered by the automated browser checks.

To repeat the check, refresh the Tickframe trading dashboard preview and look at **Trading status** on Overview. **Web API** should say **Online**, while the card still says **MT5 not connected** and **Live entries** is **Locked**. If Web API stays **Unavailable**, **Invalid response** or **Status stale**, report the exact badge; do not supply credentials or try to connect MT5 as a workaround.

## Results

- **PASS** — React production build and 9 Node unit tests.
- **PASS** — 11 Python API tests using FastAPI with an in-process ASGI transport.
- **PASS** — 9 integrated Chromium scenarios, including mobile layout and API failure/recovery.
- **PASS** — the single hosted origin served the dashboard and the read-only status route; the test Arena-style host received HTTP 200.

## Test scope

- Backend tests cover response schema, UTC response time, absence of write/other routes and static mounting. No broker data, authentication or network bridge tested.
- Client tests cover shape/key fields, the same-origin GET request, malformed payloads and mode separation. Poll every 12 seconds after a response or failure with a 3.5-second timeout; these are UI settings only, not execution limits. A failed check after success marks the last status stale. The figures remain samples if the API is unavailable.
- Browser tests cover preview controls plus Online, invalid responses, unavailable and stale-to-online transitions. Neither temporary outage nor recovery can unlock live entries. Tests run against a Chromium browser, not a live account or a full accessibility/security review.

Use the [Backend README](../../Backend/README.md) to reproduce the integrated preview. Use the [web preview checks](WebPreviewChecks.md) for the original UI-only v0.1 results. The next web milestone is an authenticated test environment with password hashing, sessions and two-factor, before even considering broker data or a real command path.

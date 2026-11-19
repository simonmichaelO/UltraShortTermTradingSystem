# Read-only sample dashboard · v0.4

**Scope:** Same-origin delivery of an example USD account and positions. Everything remains simulated. No MT5, broker account, SQLite, production login, command path, or change to the separate Access Lab. Stage 1 and Stage 6 acceptance are still open.

## Hosted operator checks · in progress

- **Delayed sample — passed (operator reported).** The operator confirmed that choosing **Delayed sample** displayed **Stale** while the sample amounts stayed visible.
- **Next: Simulated outage.** In **Tickframe sample dashboard v0.4 → Overview → Sample data feed → Delivery test**, choose **Simulated outage**. Expect **Unavailable** and dashes instead of account values. Awaiting the operator's report. This is local to the preview and cannot affect an account.

## Expected display

| Check | Expected behaviour |
|---|---|
| Normal delivery | **Fresh**; equity **$2,486.72**; three example positions (EURUSD, GBPUSD, XAUUSD). **Analytics → Account snapshot** shows **$2,442.92** balance. The fictional example time stays Nov 17, 2026 at 14:30:32 UTC. |
| Delayed sample | **Stale**; same values with explicit stale labels. The sample publication is 90 seconds older than the API response. |
| Simulated outage | **Unavailable**; dashes for account values and no position count. **Web API** can still say **Online**, because the status endpoint is independent. |
| Normal read fails after success | **Stale**; the last valid values stay visible with a warning, including in position details. A newer valid reply recovers to **Fresh**. |
| Valid zero positions | Count **0** and an empty-state message. Missing data never looks like a zero-position account. |
| All states | **MT5 not connected**; **Live entries: Locked**. Chart, trade history, watchlist and signal examples are separate. Preview preferences and stop latch remain browser-only. |

## Automated evidence

- **54 Python tests passed; dependency check passed.** New API tests cover reconciled contents, response timestamps, invalid or absent fixtures, deliberate 503, independent status, request marker handling, rejection of writes and absence of auth/source routes. The suite includes the existing isolated Access Lab regression tests.
- **15 Node tests passed; production build passed.** Coverage includes safe provenance, strict sample validation and arithmetic, missing versus empty data, same-origin reads, cached-response rejection, expiry, duplicate publication handling and recovery.
- **16 Chromium scenarios passed** against the combined FastAPI and built dashboard. Coverage includes UI rendering from API values rather than hardcoded defaults, simulated delay and outage, stale retention, expiry, wrong request marker, recovery, mobile, local preview controls, and independent Web API reachability. An additional Chromium layout/request sweep across 320, 390, 600, 768, 1024, 1200 and 1440 px found no page overflow, script errors, cross-origin requests or writes while switching states on Overview, Positions and Analytics.
- **New preview origin smoke check passed** at sandbox port **5177** with an Arena-shaped `Host` header: HTML/assets 200, status 200, normal and delayed sample 200, outage 503 without numbers, sample POST 405, regular auth route 404. The Access Lab still answered on its separate port and did not serve the sample route. This does not substitute for the operator’s hosted-browser check.

## Reproduce and limits

Run the [combined preview](../../Backend/README.md#run-the-combined-preview-on-windows-optional) and [Frontend checks](../../Frontend/README.md#review-and-verification). Fixtures and settings do not provide market, latency, performance, or broker evidence. The preview does not persist delivered samples or collect private data. There has been no broker, MetaEditor, production security, multi-browser or live-readiness sign-off. [v0.2 status results](WebStatusChecks.md) and [Access Lab results](AuthLabChecks.md) remain separate.

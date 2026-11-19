# Web preview verification · v0.1

**Scope:** Standalone React/Vite UI with synthetic fixtures. Exness permission, Windows MT5 setup and all EA/broker tests remain pending. This milestone intentionally runs before EA implementation; it does not satisfy Stage 6 or remove any Stage 1 or later gate.

| Check | Result |
|---|---|
| `npm run build` | PASS in the workspace with Node 20.20.2. This builds the web client, not native MQL5. |
| `npm test` | PASS · 6 tests: instrument allowlist; caps and validation; defensive local storage; stop precedence; fixture reconciliation; labeled export. |
| `npm run test:browser` | PASS · 6 Chromium scenarios: overview and chart (no fetch/XHR API calls); saved controls and risk boundary; stop latch/reload; history/export and analytics; alerts/reset; mobile menu and position details. |
| Layout | Desktop and phone captures visually inspected. All six views smoke-checked at seven widths from 320 to 1440 px. Mobile table overflow found and corrected; Chromium regression test passes at 390 px. |
| Preview delivery | Server listened on port 5173; test request with an Arena-style preview host returned HTTP 200. No broker secrets or credentials required. |

## Intentional limits and open work

- All positions, charts, quotes and decision results are **prewritten examples**. The preview doesn't calculate new signals, run a shadow trading engine, or send trades. Selecting an instrument or testing emergency mode can't alter any underlying order or even the fixture rows.
- Browser-only preferences are not secure configuration. No server-side operator account or login, 2FA, SQLite audit database, notifications to external devices, actual execution analytics, periodic data updates or EA connection yet. The bell supports examples and local preview events only.
- History, analytics and position details show representative fields, not the complete integration schema. Testing so far uses Chromium; there is no mobile-device, cross-browser accessibility or production-security acceptance claim.
- Feedback check: select `GBPUSD`, adjust custom intensity, apply and reload. Verify the chosen instrument persists and sample positions stay unchanged. Then review a sample position or switch tabs on mobile.

For full source, install and test instructions see [Frontend README](../../Frontend/README.md). The [living record](../Decisions/ProjectRecord.md) tracks this sequencing decision and the next stage.

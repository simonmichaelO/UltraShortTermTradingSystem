# Tickframe read-only preview API

This guide covers the regular v0.4 sample dashboard. For passwords and authenticator codes with disposable test identities, use the [separate Access Lab](AuthLab.md). For the offline SQLite exercise, see the [storage verification report](../Documentation/Testing/SQLiteStorageChecks.md); this API does not read or write its database. The separate [Sample History service](../Documentation/Testing/SampleHistoryChecks.md) reads a verified copy, not a production store.

FastAPI serves the compiled React preview and two read-only routes from the same origin. Web reachability and delivery of a fictitious sample are checked separately. Neither demonstrates an MT5 connection. There is no SQLite database, trading operation, login, or use of broker credentials in this application.

## Status contract v1

`GET /api/v1/status` returns `application/json`, HTTP 200 and `Cache-Control: no-store`:

```json
{
  "schema_version": 1,
  "service": "tickframe",
  "environment": "preview",
  "mt5_connection": "not_configured",
  "data_source": "simulated_examples",
  "real_controls_available": false,
  "generated_at": "2026-11-17T14:30:32Z"
}
```

`generated_at` is the server's UTC response time, not a quote time or terminal heartbeat. The status route does not report sample freshness or return balances and positions. Interactive API documentation is disabled in the hosted preview; [`app/api/status.py`](app/api/status.py) is the typed schema.

## Sample snapshot contract v1

`GET /api/v1/sample-snapshot` returns HTTP 200, JSON and `Cache-Control: no-store` when a valid fixture is available. The whole account and all its example positions arrive together; there are no individual broker tickets or write/config routes. The response includes `schema_version: 1`, `environment: "preview"`, `data_source: "simulated_examples"`, `mt5_connection: "not_configured"`, `real_controls_available: false` and the delivery fields below.

| Field | Meaning |
|---|---|
| `scenario` | `normal` by default or `delayed` when explicitly requested. |
| `issued_at` | UTC server time at which this response was created. |
| `published_at` | UTC publication time for delivery freshness. Normally matches `issued_at`; the delay test moves it back 90 seconds. |
| `fresh_for_seconds` | `30`; this is a web display rule, not a trading, market-data, or MT5 health rule. |
| `sample.as_of` | Fixed fictional timestamp `2026-11-17T14:30:32Z`. It does not move when the response is refreshed. |
| `sample.account`, `sample.positions` | The reconciled USD fixture. Amounts are integer cents, volume is integer hundredths of a lot, quotes are decimal strings, and all positions have sample IDs. |

- `?scenario=delayed` returns the same numbers with a simulated old publication, without sleeping or changing server state.
- `?scenario=outage` returns HTTP 503 and `error: "simulated_outage"` with no sample, balance or position count. Missing or invalid fixture data returns HTTP 503 with `error: "sample_unavailable"`. `/api/v1/status` remains independent. Unknown scenarios return HTTP 422.
- The optional `X-Tickframe-Sample-Request` header takes 32 lowercase hex characters. Successful replies echo it; the dashboard sends a different random value per request and checks the echo to avoid counting a cached reply as a new delivery. This is stateless, not authentication. Ordinary GET clients can omit the header.
- The checked-in [fixture](app/services/fixtures/sample_snapshot_v1.json) is validated and loaded at startup. The [fixture model](app/services/sample_snapshot.py) requires the balance and floating P/L, used and free margin, and position net totals to reconcile. The browser independently validates the response before showing numbers.
- The browser checks every 12 seconds after a request finishes, allows up to 3.5 seconds per request, and also offers **Check now**. It subtracts the reported publication age and elapsed request time from the freshness window and uses a monotonic browser timer. Duplicate or older publications do not reset that timer. Malformed/missing replies leave any last valid sample labelled **Stale**; without one, the feed is **Unavailable**. The three delivery tests are local to the tab and start with a clean sample cache on each change.

## Run the combined preview on Windows (optional)

Use the [Arena preview or front-end setup guide](../Frontend/README.md) first. There is nothing to install to use the hosted preview. Only follow these steps if running a local copy:

1. Extract the source ZIP. In File Explorer, open the project’s `Frontend` folder and choose **Open in Terminal**. Install Node.js as described in the front-end guide. In the terminal, run:

   ```powershell
   npm.cmd ci
   npm.cmd run build
   ```

   A successful build creates `Frontend\dist\index.html` and an assets folder. Do **not** also start the Vite dev server on port 5173 for this combined mode.
2. Install a supported **Python 3.13** release from the [official Windows downloads](https://www.python.org/downloads/windows/). Use the official Python Install Manager and `py install 3.13` if 3.13 is not already installed. Open a new PowerShell and check `py -3.13 --version`. If `py` is missing after install, reopen the terminal or follow the install manager instructions to enable the launcher.
3. Open a terminal inside the project's `Backend` folder. Create an isolated Python environment and run the service using that environment:

   ```powershell
   py -3.13 -m venv .venv
   .\.venv\Scripts\python.exe -m pip install -r requirements.txt
   .\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 5173
   ```

4. Open `http://127.0.0.1:5173/` in your browser. Look for **Sample data feed: Fresh**. Under **Trading status**, Web API can be **Online** while MT5 is **not connected** and live entries are **Locked**. If `/` says Not Found, confirm Step 1 built `Frontend\dist` and restart Uvicorn. If the port is in use, stop the old local preview or use `--port 5174` and browse to that port. Press **Ctrl+C** in the terminal to stop the service.

The Windows commands are written for a local-only setup; don't forward or expose this service to a network. The Arena sample preview exposes only prewritten examples and status. A later production service must use authentication and two-factor, tested access controls and a separately reviewed native bridge before enabling any real data or control feature.

## Reproduce tests

From `Backend`, run these lines in PowerShell:

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements-test.txt
.\.venv\Scripts\python.exe -m pytest -q
```

Tests invoke the ASGI app in-process and do not require broker or browser access. See the [sample dashboard checks](../Documentation/Testing/WebSampleChecks.md) for the integrated cases.

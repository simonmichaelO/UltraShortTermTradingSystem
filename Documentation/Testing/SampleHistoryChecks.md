# Read-only Sample History · v0.6

**Scope:** View the two saved synthetic snapshots in a browser. The independent FastAPI service reads a verified SQLite copy from the v0.5 recovery exercise. The regular dashboard and Access Lab still run independently. No broker, database writer, auth route, or trading controls are included.

For the opt-in integrated dashboard using the already saved file, see [Local Workspace v0.7](LocalWorkspaceChecks.md). The steps below remain the standalone v0.6 setup. The operator also confirmed that v0.6 on Windows showed both snapshots after a clean loopback restart without a second seed.

## Hosted selection check · passed (operator reported)

The operator confirmed that selecting the older **14:30:32 UTC** example in **Tickframe Sample History v0.6** changed **Account snapshot → Equity** to **$2,486.72**. This completes the hosted selection check, not a production or broker test.

## Contract and boundary

`GET /api/v1/sample-history` returns schema v1, `storage: "sqlite_read_only"`, `data_source: "simulated_examples"`, `mt5_connection: "not_configured"`, `real_controls_available: false` and `snapshots`, newest fictional timestamp first. It opens the configured SQLite file with `mode=ro` and `query_only`. Besides normal SQLite and model validation, the service requires the full stored sample values to match the two checked-in examples. The fixture files are an allowlist, not a fallback data source. The public response includes only a projection of the approved records and their sample save timestamps. No database file is served.

| Store result | Browser result |
|---|---|
| Two saved examples | **Available**, latest selected by default. Selecting the earlier sample changes amounts and positions without writing to SQLite. Each example has three simulated positions. |
| Valid empty store | **Empty** and “No saved snapshots”; no account amounts. |
| Missing, invalid, unexpected or unreachable data | **Unavailable**, with neither amounts nor a position/snapshot count. **Try again** or **Refresh history** issues another GET. A previous result is not shown as current after a failed read. |

The **Example time** is fixed and fictional; **Saved to SQLite** shows when the sample store recorded it. Neither indicates MT5 connectivity or live data. All order paths remain locked. The hosted copy and source recovery lab files are distinct, ignored by Git, and not included in the ZIP.

## Verified evidence

- **79 Python tests passed**, including **11 new history API cases**. They verify read-only access, newest-first delivery, empty versus unavailable, refusal of an unapproved sample even when internally reconciled, methods and file exposure boundaries. Dependencies passed their consistency check.
- Production history build and **5 new Chromium tests** passed: select a saved sample and verify same-origin GET-only requests, fail/retry, distinct empty state, invalid reply, and phone layout. Bundled fonts loaded and no page overflow or script errors were seen from 320 through 1440 px in six tested viewports.
- The unchanged v0.4 dashboard passed **15 Node and 16 Chromium** regression tests. Its service and the separate Access Lab both still returned HTTP 200 and did not serve the history route.
- The same five browser tests also passed with the history app bound to loopback in the test sandbox. The new Arena preview on port **5178** served the shell, built assets and both example records using an Arena-shaped host header. POST returned 405; the database file was not addressable; the copy’s file digest was unchanged after reads. This smoke check is separate from the operator’s hosted-browser check above.

## Optional local run

For developers or later testing on a PC. No action is required now. Unpack the source ZIP and use the Node/Python environments described in the [Frontend guide](../../Frontend/README.md#run-on-windows-optional) and [Backend guide](../../Backend/README.md#run-the-combined-preview-on-windows-optional). From `Frontend/` in PowerShell:

```powershell
npm.cmd ci
npm.cmd run build:history
```

From `Backend/` with the existing Python 3.13 virtual environment and requirements installed:

```powershell
New-Item -ItemType Directory -Force -Path ..\LocalData\SampleHistoryPreview
.\.venv\Scripts\python.exe -m app.sample_storage_lab --db ..\LocalData\SampleHistoryPreview\history.sqlite3 seed
.\.venv\Scripts\python.exe -m uvicorn app.sample_history:from_environment --factory --host 127.0.0.1 --port 5178
```

Open `http://127.0.0.1:5178/` on that PC only. The seed command writes only the two bundled examples; the server holds no writer. To use another lab copy, set `TICKFRAME_HISTORY_DB` to its path before starting the service. Do not point it at a broker database. Do not expose the local port to the internet. In a second terminal under `Frontend/`, optionally install Playwright Chromium (`npx.cmd playwright install chromium`) and run `npm.cmd run test:history-browser`. See the [hosting and GitHub plan](../Installation/HostingAndGitHub.md) for cost and backup boundaries.

This is not a SQLite deployment to a cloud provider, a production history feed, a remote-access approval, or completion of Stage 1 or Stage 6.

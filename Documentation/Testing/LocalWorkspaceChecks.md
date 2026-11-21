# Tickframe Local Workspace · v0.7 verification

**Scope:** One loopback address for the dashboard and Sample History. No reseed, database migration, broker connection, credentials, or order execution. The standalone dashboard, Sample History, and Access Lab retain their own entry points and builds. This is not a public preview or a Stage 1 or Stage 6 sign-off.

## What to expect

| View | Source and behavior |
|---|---|
| **Overview** | Same simulated account and positions delivered by `/api/v1/sample-snapshot`. A delivery-test outage affects this feed, not the saved history. Web status comes from `/api/v1/status` and is not a terminal heartbeat. |
| **Sample History** | `/api/v1/sample-history` reads the existing verified SQLite store. Shows **Available** with two saved examples in the tested store, **Empty** for a verified zero-row store, or **Unavailable** with no count or amounts if verification/read fails. Refresh retries the GET. |
| **Trade history** | The original closed simulated trade ledger and Sample CSV. No SQLite snapshots or broker transactions are added to it. |

The default row is **14:31:32 UTC** with equity **$2,491.76**; selecting **14:30:32 UTC** shows **$2,486.72**. Each example has three simulated positions. **Example time** is the record's fictional observation time; **Saved to SQLite** is its original recorded timestamp, unchanged after selection or restart. No history values fall back to a fixture or a previous response after failure. The browser reuses the validated read-only client and a 3.5-second request timeout.

## Boundaries

- `app.local_workspace:from_environment` serves the three GET APIs and the compiled UI from `Frontend/LocalWorkspace/dist`. No auth endpoints, public writer, database download, MT5 bridge or operational controls. Existing dashboard preview buttons affect only browser preferences. API responses use `Cache-Control: no-store`.
- Only loopback clients and loopback `Host` values are accepted. The run command binds to `127.0.0.1` and disables trusted proxy headers; do not place it behind a proxy or tunnel. This guard is not production authentication.
- The reader uses SQLite `mode=ro` and `query_only` and checks every stored record against the approved synthetic catalog. The default is `LocalData/SampleHistoryPreview/history.sqlite3`. `TICKFRAME_HISTORY_DB` can point to another *synthetic* copy. A missing file stays missing; no seed or database creation path is called on startup or GET.

## Observed in the sandbox

- **89 Python tests passed** (10 new workspace cases); dependency consistency check passed. Real scratch SQLite validated empty vs. missing; existing copy was read without changes. Status and the delivery-test API remained independent of archive errors. Non-loopback peers, non-loopback Host values and forwarding headers were refused. Mutating methods returned 405 and raw database, auth and order paths were absent.
- **6 Chromium workspace tests passed**: navigation and same-origin GET-only traffic, selection/timestamps, errors and retry, a verified empty response, rejection of invalid data, separate feed outage, and mobile navigation. Manual layout checks from 320 to 1440 px at seven widths found no page or positions-table overflow and no browser script errors.
- **Restart without reseeding passed on sandbox loopback.** Both history responses were identical across separate Uvicorn processes. The existing read-only test file still had the same SHA-256 digest, and there were no new SQLite sidecars.
- **Regressions:** 15 Node tests, 16 Chromium dashboard tests on a separate build of the shared shell, and 5 standalone History Chromium tests passed. The existing Arena services on 5176, 5177 and 5178 stayed up and their build files did not change. Access Lab and the dashboard did not add the history API; standalone Sample History did not add the status API.

## Operator acceptance

**Windows v0.7 check pending.** The operator previously confirmed that v0.6 on Windows retained both snapshots after restart. Use the [Windows v0.7 run card](../Installation/LocalWorkspaceWindows.md) to upgrade the existing clone and compare both rows/save times without reseeding. Private GitHub backup remains source only; no new remote hosting is needed.

For developers: after building with `npm run build:local` in `Frontend` and starting Uvicorn on loopback, run `npm run test:local-browser` in another terminal. It defaults to `127.0.0.1:5182`; set `LOCAL_WORKSPACE_BASE_URL` if using a different loopback port. The browser suite expects the existing synthetic two-row copy for its normal-case checks. Unit tests use their own scratch stores.

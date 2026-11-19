# Living project record

| Field | Current value |
|---|---|
| Date | 17 November 2026 |
| Stage | Early web build: sample API v0.4 implemented and tested; hosted delay, outage and recovery walkthrough complete. Operator confirmed v0.2 Web API status and v0.3.2 Access Lab sign-in and sign-out. Stage 1 Windows/broker evidence is pending. |
| Starter version | `stage1-v0.1` (documentation and non-executable scaffold) |
| EA, API and dashboard versions | EA: not started. Regular dashboard `web-sample-v0.4`; separate `web-auth-lab-v0.3.2`, test identities only. Both use synthetic data. |
| Source control | Local Git on `main` with Stage 1 and versioned web preview, status, Access Lab, and sample API milestones. No remote created or pushed. |
| Requirements | [Master specification](../MasterSpecification.md), preserved separately from provisional design choices |
| Current practical task | v0.4 hosted checks complete; preview returned to **Normal delivery**. Await approval for a local-only SQLite exercise with synthetic samples and verified restart recovery. |

## Decisions and scope

| Record | Status | Decision |
|---|---|---|
| D-001 | Required | Native MQL5 EA is the only trading component. Python/FastAPI, React/Vite and SQLite form the local dashboard stack, with private GitHub and independently configurable dashboard/Telegram/MT5 push. |
| D-002 | Required | Exactly EURUSD, GBPUSD, USDJPY, USDCHF, USDCAD, AUDUSD, NZDUSD, XAUUSD; all monitored, one selected for new EA entries; preserve management of existing and supported manual positions. Retail hedging with opposite-position permission required. |
| D-003 | Required | Preserve 10% per-position calculated risk, 40% aggregate risk, 70% margin, 40% daily peak-equity drawdown, +1,500% target from daily starting equity, Exness server-midnight reset, approx. five default positions, no separate lifetime shutdown. Maintain one year of detailed ticks and archive older data. |
| D-004 | Stage 1 only | Start with one Standard demo, read-only, no order path. It is an integration sample, not a live account selection. Leave the demo's MT5 Algo Trading switch off for setup. |
| D-005 | Required / design pending | Broker-side protective SL, no widening and manual authorisation after restart. Dashboard Off affects entries, not protection. Never treat a disconnected command as applied. Exact emergency policy still needs approval before order-capable operation. |
| D-006 | Provisional | First prove deterministic/statistical baselines and a loopback dashboard with bounded local mailbox. Delay ML and remote access until permission, utility, data and security requirements are evidenced. Maintain rollback and do not let model or intensity override safety. |
| D-007 | Deployment gate | Use only documented, permitted broker workflows. Applicable terms must be clarified before automated Exness collection or broker-capable tests. No stale-price/latency arbitrage or exploitation; hold ambiguous features offline. |
| D-008 | User-directed sequencing | Move a fixture-only web UI slice ahead of Windows MT5 setup. Broker rules, risk limits, auth and trading acceptance gates do not change. No real controls or private data in the hosted preview. |
| D-009 | Early web design | Serve the fixtures UI and versioned, read-only status from a single origin. Treat API availability and MT5 connectivity separately. Defer authentication, SQLite, any inbox/outbox protocol and actual trading features. |
| D-010 | Approved early web work | Build password + TOTP in an isolated, test-only lab. Keep v0.2 and its browser preferences intact. Expire lab identities; no production accounts, database, broker link or order path. |
| D-011 | Test-only compatibility | When the hosted preview does not return a setup cookie, offer a separate, opt-in tab-memory transport. Both factors and role checks remain mandatory; no change to the cookie flow, local-only lab or regular dashboard. |
| D-012 | Hosted preview default | Make tab-only sign-in the sole hosted UI path; select the profile in the served HTML and do not use the browser hostname to decide. Keep loopback cookie auth and all factor, expiry and origin checks. |
| D-013 | Approved, implemented | Deliver one immutable, reconciled account/position fixture over a same-origin read-only GET. Make delivery freshness distinct from status reachability and the fictional snapshot date. Failure without a verified sample shows no numbers or position count. Keep scenario tests browser-local and preserve the Access Lab, all broker/EA gates and locked live entries. |

## Sample dashboard · v0.4

`GET /api/v1/sample-snapshot` provides the source for Overview account metrics, the open-position views and details, and Analytics’ Account snapshot. The example charts, watchlist, history and decisions remain bundled. There are no writes or broker dependencies. The **Delivery test** can represent normal, delayed or failed reads without a global change. The [contract](../../Backend/README.md#sample-snapshot-contract-v1) records window, validation and reply handling; the [verification handoff](../Testing/WebSampleChecks.md) records automated evidence and the operator’s confirmations of all three states in their hosted preview: **Stale** with amounts, **Unavailable** with dashes, then **Fresh** with sample amounts restored.

**Main files:** `Backend/app/{main.py,api/sample_snapshot.py,services/sample_snapshot.py,services/fixtures/sample_snapshot_v1.json}`, `Frontend/src/{services/sample-api.js,hooks/useSampleFeed.js,components/SampleFeed.jsx}`, the consuming dashboard views, and the Python, Node and Chromium tests. The v0.3.2 Access Lab service and policies, original master specification and EA scaffold are unchanged.

## Access Lab hosted default · v0.3.2

**Files updated:** `Backend/app/auth_lab.py`, `Backend/tests/test_auth_lab.py`, `Frontend/AuthLab/index.html`, `Frontend/AuthLab/src/{AuthLab.jsx,lab.css}`, `Frontend/AuthLab/tests/lab.spec.js`, `README.md`, `Backend/AuthLab.md`, `Documentation/UserGuide/AccessLab.md`, `Documentation/Testing/AuthLabChecks.md` and this record. No EA, risk, regular dashboard or lab authentication policy changes.

The second operator report still said the setup cookie was unavailable. The source of that repeated path is not confirmed. The new hosted form never calls the cookie transport; the server specifies its profile in the HTML and the build is on a fresh preview origin. The [v0.3.2 test results](../Testing/AuthLabChecks.md#hosted-default-patch--v032) were obtained locally. The operator subsequently confirmed successful sign-in and sign-out in the hosted lab.

## Access Lab cookie compatibility · v0.3.1

**Evidence:** the user reached account creation in Arena but received “This browser did not keep the test setup cookie.” The server could not confirm a cookie; the exact browser/proxy cause is unverified. Do not require the user to loosen browser protections.

**Runtime files changed:** `Backend/app/{auth_lab.py,api/lab_auth.py,security/lab.py}` and `Frontend/AuthLab/src/{AuthLab.jsx,auth-api.js,lab.css}`. **Tests updated:** `Backend/tests/test_auth_lab.py` and `Frontend/AuthLab/tests/lab.spec.js`. **Docs updated:** `README.md`, `Backend/AuthLab.md`, `Documentation/UserGuide/AccessLab.md`, `Documentation/Testing/AuthLabChecks.md`, and this record. The previous v0.3 tag and source archive remain unchanged.

The new opt-in hosted transport keeps opaque expiring handles in the current page’s memory; no need to modify cookie settings. A password challenge still cannot open the workspace. See the [patch verification](../Testing/AuthLabChecks.md#cookie-compatibility-patch--v031) and [user retry](../UserGuide/AccessLab.md#if-something-doesnt-look-right). The operator still reported a cookie error after this release; see v0.3.2 above.

## Access Lab milestone · v0.3

**Files created:** `Backend/app/auth_lab.py`, `Backend/app/api/lab_auth.py`, `Backend/app/security/{__init__,lab}.py`, `Backend/requirements-auth*.txt`, `Backend/tests/test_auth_lab.py`, `Backend/AuthLab.md`, `Frontend/AuthLab/{index.html,vite.config.js,src/,tests/lab.spec.js}`, `Frontend/playwright.auth.config.js`, `Documentation/UserGuide/AccessLab.md`, and `Documentation/Testing/AuthLabChecks.md`.

**Files updated:** root `README.md`, `Backend/README.md`, `Frontend/{README.md,package.json}`, `Documentation/Architecture/SystemDesign.md`, `Documentation/Testing/DevelopmentChecklist.md`, and this record. Existing v0.2 runtime code, master specification, MQL5 scaffold and hard risk settings are unchanged.

`app.auth_lab` serves only the dedicated UI and auth routes; `app.security.lab` verifies factors and manages one short-lived session per synthetic identity. Neither application mounts broker/web command surfaces. Workspace history is only per-test-account and in memory. See the [QA handoff](../Testing/AuthLabChecks.md) for build, test, session, origin and mobile evidence. The first hosted operator check hit a setup-cookie error; see v0.3.1 above. Never use broker or personal credentials.

## Web status milestone · v0.2

**Files created:** `Backend/app/__init__.py`, `Backend/app/api/{__init__,status}.py`, `Backend/app/main.py`, `Backend/requirements*.txt`, `Backend/tests/test_status.py`, `Frontend/src/services/status-api.js`, `Frontend/src/hooks/usePreviewStatus.js`, `Frontend/src/components/WebStatus.jsx`, `Frontend/tests/status-api.test.js`, and `Documentation/Testing/WebStatusChecks.md`.

**Files updated:** `Backend/README.md`, both front-end package metadata files, `Frontend/README.md`, `Frontend/src/{App.jsx,styles.css}`, `Frontend/src/components/Portfolio.jsx`, `Frontend/src/pages/Views.jsx`, `Frontend/playwright.config.js`, `Frontend/tests/dashboard.spec.js`, root `README.md`, this record, the design and development checklist. The master specification and native EA scaffold remain unchanged.

The status service answers `GET /api/v1/status`. The polling hook updates the Web API badge independently of the mock market data; no preference path calls the API. User browser checks and automated build/API/UI results are recorded in the [web status report](../Testing/WebStatusChecks.md). No broker or credential flow exists. The operator confirmed **Web API → Online** in the hosted preview. MT5 remains unconfigured.

## Web preview milestone

| Files created | Purpose |
|---|---|
| `Frontend/index.html`, `package.json`, `package-lock.json`, `vite.config.js`, `public/tickframe.svg` | App shell, pinned project packages, preview server configuration and vector brand asset (all within `Frontend/`). |
| `Frontend/src/main.jsx`, `App.jsx`, `styles.css` | React entry, navigation and browser-only state, responsive styles (all within `Frontend/src/`). |
| `Frontend/src/components/{ui,Shell,Charts,Portfolio,Dialogs}.jsx`, `src/pages/Views.jsx` | Shared UI, sidebar/header, chart, broker-disabled overview, position/notification drawers and workspace views. |
| `Frontend/src/services/preview-model.js`, `src/assets/fonts/` | Synthetic data, checked preferences, export and local licensed fonts. |
| `Frontend/playwright.config.js`, `tests/preview-model.test.js`, `tests/dashboard.spec.js` | Reproducible fixture/validation and browser tests (all within `Frontend/`). |
| `Documentation/Testing/WebPreviewChecks.md` | Actual test outcomes and what is not implemented. |

**Files updated:** root `README.md`, `Frontend/README.md`, `.gitignore`, `.gitattributes`, `Documentation/Architecture/SystemDesign.md`, `Documentation/Testing/DevelopmentChecklist.md` and this record. The master specification, EA and Backend are unchanged. Empty `.gitkeep` files remain as folder markers where needed. `git ls-files` lists exact tracked paths.

The shell routes to components and views, which use the fixture model; all edits are browser-local, not broker commands. Build and behaviour passed the checks in the [web verification report](../Testing/WebPreviewChecks.md). No backend, EA or cross-browser production acceptance is implied.

## Stage 1 files

| File or group | Purpose |
|---|---|
| `README.md` | Start here, package status and directory map. |
| `Documentation/MasterSpecification.md` | Supplied master requirements, for future traceability. |
| `Documentation/FeasibilityReport.md` | Official evidence vs unknowns, contract inventory, broker compliance, costs and risk. |
| `Documentation/Architecture/SystemDesign.md` | Module boundaries, trading/management/control paths, risk, security, storage. |
| `Documentation/Installation/WindowsSetup.md` | Beginner instructions, expected results and troubleshooting; local Git and remote steps when ready. |
| `Documentation/Testing/DevelopmentChecklist.md` | Current gate, ten-stage roadmap, boundary tests and demo benchmark protocol. |
| `Documentation/Testing/DemoSymbolInventory.csv` | Blank eight-symbol worksheet; no account data. |
| `Documentation/Decisions/ProjectRecord.md` | This version, decisions, evidence, open issues and next work. |
| `EA/README.md`, `Backend/README.md`, `Frontend/README.md` | Identify the intended integration points; nested directories with `.gitkeep` are placeholders. |
| `Configuration/README.md`, `Backups/README.md`, `Research/README.md` | What belongs in Git vs. local only. |
| `.gitignore`, `.gitattributes` | Private/generated-file exclusions and cross-platform text conventions. |

The setup guide leads into the checklist. The checklist obtains the account evidence identified by the feasibility report. The design and later source conform to the requirements and maintain change records here.

## Evidence and open issues

- **Repository checks (workspace):** validated the 25 master requirement sections, eight blank canonical inventory rows, 15 relative Markdown links/anchors, staged whitespace, and exclusion of sample private/generated paths. The release process also checks archive integrity and clones the Git bundle as a clean checkout. These are packaging checks, not MT5 tests.
- **Not run:** Windows installation, MetaEditor compilation, broker sign-in, hedging flag read, symbol snapshots, calendar freshness, EA tests, backtests, account benchmarks or independent review. Web tests cover status, sample delivery and display, and isolated test-only authentication. No independent production security review has run.
- **Stage 1 blockers:** user demo login/MetaEditor, exact account capabilities and costs, clock/calendar, applicable broker permission and Windows Git. No live account or deposit needed to resolve these.
- **Later approval:** exact emergency actions (including unprotected manual positions), cash-flow/missing-midnight handling and any material changes to trading behavior before orders. Other unknowns include retention footprint, execution and signal thresholds, data quality, and whether any broker/account/instrument combination supports viable net performance at $10.

## Next and independent review

The operator confirmed v0.2 web status and v0.3.2 Access Lab sign-in and sign-out. The approved read-only sample API is implemented; the operator confirmed the v0.4 delay, outage and recovery walkthrough. The next proposed web slice, pending approval, is a local-only SQLite storage and restart-recovery exercise using synthetic samples. It would not add a public write endpoint, operational identities or a broker connection. Stage 6 remains open: secure operational identity/config storage, recovery, permissions and independent deployment review require later work. No broker data or engine command path is enabled. Stage 1 can resume separately with Standard demo setup, symbol/account/clock/calendar inventory, permission checks and Windows Git.

Retain `UltraShortTermTradingSystem-WebSample-0.4.zip` and the prior clean archives and Git tags. For independent review, share the tracked `Frontend/` and `Backend/` files (including dependency manifests, tests, assets and READMEs) plus `Documentation/` and root repository files, or the portable Git bundle. Ignore `dist/`, `.venv/`, `node_modules/`, and generated test output. No native trading source exists yet. Do not share credentials, personal or broker data, private support correspondence, or runtime database contents. The archive is not evidence of an independent review.

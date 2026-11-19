# Living project record

| Field | Current value |
|---|---|
| Date | 17 November 2026 |
| Stage | Standalone web preview built first per user request. Stage 1 Windows and broker evidence is still pending. |
| Starter version | `stage1-v0.1` (documentation and non-executable scaffold) |
| EA, API and dashboard versions | EA and API: not started. Dashboard: `web-preview-v0.1`, fixtures only. |
| Source control | Local Git on `main` with separate Stage 1 and web preview milestones and portable bundles. No remote created or pushed. |
| Requirements | [Master specification](../MasterSpecification.md), preserved separately from provisional design choices |
| First practical task | Use **Trading controls** in the preview, set `GBPUSD`, adjust custom intensity and apply. The later broker-track task is to connect a Standard MT5 demo read-only. |

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
- **Not run:** Windows installation, MetaEditor compilation, broker sign-in, hedging flag read, symbol snapshots, calendar freshness, EA/backend tests, backtests, account benchmarks or independent review. The React test results apply only to the fixture UI.
- **Stage 1 blockers:** user demo login/MetaEditor, exact account capabilities and costs, clock/calendar, applicable broker permission and Windows Git. No live account or deposit needed to resolve these.
- **Later approval:** exact emergency actions (including unprotected manual positions), cash-flow/missing-midnight handling and any material changes to trading behavior before orders. Other unknowns include retention footprint, execution and signal thresholds, data quality, and whether any broker/account/instrument combination supports viable net performance at $10.

## Next and independent review

Review the web preview first. Next web slice: a versioned, read-only FastAPI data contract with real disconnected/error/stale UI states, then authentication and 2FA before any broker data or engine command path is enabled. Stage 1 broker work can resume separately: Standard demo setup, symbol/account/clock/calendar inventory, permission checks and Windows Git. Broker-facing stages remain blocked until their gates pass.

Retain both Git milestones and the clean WebPreview source archive. For independent review, share the tracked `Frontend/` files (including package lock, tests, assets and its README) plus `Documentation/` and root repository files; alternatively share the clean bundle. Ignore `dist/`, `node_modules/`, and generated test output. No native trading source exists yet. Do not share passwords, tokens, personal data, broker quote files, detailed trade exports, private support correspondence or runtime database contents. The archive is not evidence of an independent review.

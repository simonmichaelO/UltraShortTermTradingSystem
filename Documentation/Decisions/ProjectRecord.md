# Living project record

| Field | Current value |
|---|---|
| Date | 17 November 2026 |
| Stage | 1 — research and starter prepared; Windows and account evidence pending |
| Starter version | `stage1-v0.1` (documentation and non-executable scaffold) |
| EA, API and dashboard versions | None yet |
| Source control | Initial local Git repository on `main`; portable starter bundle. No GitHub remote created or pushed. |
| Requirements | [Master specification](../MasterSpecification.md), preserved separately from provisional design choices |
| First practical task | Connect Exness Standard MT5 demo on Windows, no order or deposit |

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

## Files at this milestone

All listed files were created for Stage 1; no pre-existing project file was overwritten. `git ls-files` is the exact manifest for this version, including empty-directory markers.

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
- **Not run:** Windows installation, MetaEditor compilation, broker sign-in, hedging flag read, symbol snapshots, calendar freshness, engineering tests, backtests, benchmarks or independent review. No code or test performance is claimed. There are no runtime bugs to adjudicate yet because no runtime exists.
- **Stage 1 blockers:** user demo login/MetaEditor, exact account capabilities and costs, clock/calendar, applicable broker permission and Windows Git. No live account or deposit needed to resolve these.
- **Later approval:** exact emergency actions (including unprotected manual positions), cash-flow/missing-midnight handling and any material changes to trading behavior before orders. Other unknowns include retention footprint, execution and signal thresholds, data quality, and whether any broker/account/instrument combination supports viable net performance at $10.

## Next and independent review

Complete the single demo connection task first; then perform the symbol/account/clock/calendar inventory, confirm broker permissions, and complete Git setup. Proceed to Stage 2 only after the applicable gate, or under an explicit offline-only exception. Record both Windows evidence and outstanding limitations before promotion.

Retain the initial Git history and the clean starter archive. For independent review at this stage, share the source snapshot or the master specification, feasibility report, design, checklist, project record and installation/configuration notes listed above. No trading source exists yet. Do not share passwords, tokens, personal data, broker quote files, detailed trade exports, private support correspondence or runtime database contents. The archive is not evidence of an independent review.

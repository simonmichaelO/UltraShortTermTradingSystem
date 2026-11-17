# Ultra-short-term MT5 trading system

**Stage 1 • feasibility and setup • 17 November 2026**

This is a documentation and Git starter, not a trading robot. No broker has been connected, no order has been sent and there is no code to compile yet. Standard MT5 demo is the first test environment, not a choice of live account. Do not deposit or place an order for setup.

## Start here

1. Open the [Windows setup guide](Documentation/Installation/WindowsSetup.md). Complete **Task 1 only**: connect MT5 desktop to an Exness Standard demo and verify the connection.
2. Use the [Stage 1 checklist and staged test plan](Documentation/Testing/DevelopmentChecklist.md) to record the result and remaining acceptance checks.
3. Read the [feasibility report](Documentation/FeasibilityReport.md) for published broker conditions and what still needs evidence from the terminal.

## Project reference

- [Master specification](Documentation/MasterSpecification.md) — the supplied requirements, kept separately from engineering proposals.
- [Architecture](Documentation/Architecture/SystemDesign.md) — ownership, market/decision path, risk, communication, storage and security.
- [Living project record](Documentation/Decisions/ProjectRecord.md) — current status, versions, decisions, open issues, files and review instructions.
- [Blank eight-symbol inventory](Documentation/Testing/DemoSymbolInventory.csv) — worksheet; it contains no market observations.

## Repository layout

| Path | Purpose |
|---|---|
| `EA/Experts/`, `EA/Include/USTS/`, `EA/Tests/` | Native MQL5 entry point, module namespaces, test fixtures. Aligned with the MT5 data folder, not another EA runtime. |
| `Backend/app/`, `Backend/tests/` | FastAPI, ingestion, SQLite persistence, security and tests. |
| `Frontend/src/` | React + Vite screens and reusable UI modules. |
| `Documentation/` | Requirements, research, installation, user guide, stage checks and decisions. |
| `Configuration/` | Safe examples and schemas only; no secrets or runtime config in Stage 1. |
| `Backups/`, `Research/` | Instructions and clean study plans; keep private data and archives out of Git. |

Empty module directories have `.gitkeep` markers so Git preserves the structure. The private GitHub remote is not yet created. The starter archive includes a portable Git bundle so a Windows clone can keep the first commit. See the setup guide when ready.

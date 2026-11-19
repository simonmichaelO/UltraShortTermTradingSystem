# Ultra-short-term MT5 trading system

**Current milestone: Tickframe web status v0.2 · Stage 1 broker checks pending**

Tickframe is the planned web console for the native MT5 trading engine. The React + Vite preview uses prewritten market examples. It now runs with a read-only FastAPI status endpoint; there is no running EA, MT5 bridge, database, authentication or order connection. Do not deposit or place an order for setup.

## Start here

1. Try **Tickframe trading dashboard** in the Arena preview. [Frontend README](Frontend/README.md) has the first click-through task and optional Windows build instructions. The WebStatus source ZIP includes this project plus the matching portable Git bundle.
2. See the [web status test report](Documentation/Testing/WebStatusChecks.md) for verified behaviour and limitations, and the [Backend guide](Backend/README.md) to run the combined preview. Web work can proceed independently of Windows MT5 setup; no trading gate has changed.
3. When ready to begin the broker track, use the [Windows setup guide](Documentation/Installation/WindowsSetup.md) to connect a Standard MT5 **demo** without placing an order. Continue with the [Stage 1 checklist](Documentation/Testing/DevelopmentChecklist.md) and [feasibility report](Documentation/FeasibilityReport.md).

## Project reference

- [Master specification](Documentation/MasterSpecification.md) — the supplied requirements, kept separately from engineering proposals.
- [Architecture](Documentation/Architecture/SystemDesign.md) — ownership, market/decision path, risk, communication, storage and security.
- [Living project record](Documentation/Decisions/ProjectRecord.md) — current status, versions, decisions, open issues, files and review instructions.
- [Blank eight-symbol inventory](Documentation/Testing/DemoSymbolInventory.csv) — worksheet; it contains no market observations.

## Repository layout

| Path | Purpose |
|---|---|
| `EA/Experts/`, `EA/Include/USTS/`, `EA/Tests/` | Native MQL5 entry point, module namespaces, test fixtures. Aligned with the MT5 data folder, not another EA runtime. |
| `Backend/app/`, `Backend/tests/` | Read-only FastAPI status and tests now; ingestion, SQLite and authentication later. |
| `Frontend/` | React + Vite preview, synthetic fixtures, UI, web tests and setup guide. |
| `Documentation/` | Requirements, research, installation, user guide, stage checks and decisions. |
| `Configuration/` | Safe examples and schemas only; no secrets or runtime config in Stage 1. |
| `Backups/`, `Research/` | Instructions and clean study plans; keep private data and archives out of Git. |

Empty module directories have `.gitkeep` markers so Git preserves the structure. The private GitHub remote is not yet created. The starter archive includes a portable Git bundle so a Windows clone can keep the first commit. See the setup guide when ready.

# Ultra-short-term MT5 trading system

**Current milestone: Tickframe Access Lab v0.3.1 · Regular web preview v0.2 · Stage 1 broker checks pending**

Tickframe is the planned web console for the native MT5 trading engine. The React + Vite preview uses prewritten market examples. It now runs with a read-only FastAPI status endpoint; there is no running EA, MT5 bridge, database, or order connection. A separate Access Lab tests passwords and authenticator codes with disposable, synthetic identities only. Do not deposit or place an order for setup.

## Start here

Open **Tickframe sign-in lab** in Arena for the [test sign-in checkpoint](Documentation/UserGuide/AccessLab.md). No software setup is needed to open the lab. If the preview cannot keep cookies, use **Create test account without cookies**. The [Access Lab QA handoff](Documentation/Testing/AuthLabChecks.md) records the tests and remaining gates.

1. Try **Tickframe trading dashboard** in the Arena preview. [Frontend README](Frontend/README.md) has the first click-through task and optional Windows build instructions. The WebAuthLab source ZIP includes this project plus the portable Git history and both previews’ instructions.
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
| `Backend/app/`, `Backend/tests/` | Read-only status and isolated test authentication with separate entry points. No production identities or SQLite yet. |
| `Frontend/` | React + Vite fixture dashboard; `Frontend/AuthLab/` is the separate test sign-in UI. |
| `Documentation/` | Requirements, research, installation, user guide, stage checks and decisions. |
| `Configuration/` | Safe examples and schemas only; no secrets or runtime config in Stage 1. |
| `Backups/`, `Research/` | Instructions and clean study plans; keep private data and archives out of Git. |

Empty module directories have `.gitkeep` markers so Git preserves the structure. The private GitHub remote is not yet created. The starter archive includes a portable Git bundle so a Windows clone can keep the first commit. See the setup guide when ready.

# Ultra-short-term MT5 trading system

**Current milestone: Sample History v0.6 · Sample dashboard v0.4 · Access Lab v0.3.2**

Tickframe is the planned web console for the native MT5 trading engine. The preview uses simulated market examples. It now reads one example account and its positions from a read-only FastAPI endpoint, separately from the web status check. The independent Sample History preview reads a verified SQLite copy of the two stored synthetic examples. The regular dashboard and Access Lab still do not use SQLite. None connects to an EA, MT5, or an order path. No deposit, sign-in, or installation is needed for the browser check.

## Start here

1. Open **Tickframe Sample History v0.6** in Arena. Select **14:30:32 UTC** under **Saved snapshots**; **Equity** should show **$2,486.72**. See the [history report](Documentation/Testing/SampleHistoryChecks.md) for read-only and local test details.
2. Keep the [private GitHub backup and low-cost testing plan](Documentation/Installation/HostingAndGitHub.md): private source history, local persistence tests, no paid hosting at this stage. No remote has been created or pushed.
3. The regular [v0.4 dashboard](Frontend/README.md) and [v0.5 SQLite recovery test](Documentation/Testing/SQLiteStorageChecks.md) are unchanged.
4. The [separate Access Lab](Documentation/UserGuide/AccessLab.md) tests passwords and authenticator codes with disposable test identities only. The operator has confirmed sign-in and sign-out in v0.3.2. It is not a sign-in service for the regular dashboard. See the [Access Lab checks](Documentation/Testing/AuthLabChecks.md) for evidence and limits.
5. When ready to begin the broker track, use the [Windows setup guide](Documentation/Installation/WindowsSetup.md) to connect a Standard MT5 **demo** without placing an order. Continue with the [Stage 1 checklist](Documentation/Testing/DevelopmentChecklist.md) and [feasibility report](Documentation/FeasibilityReport.md). None of the web previews clears a trading gate.

## Project reference

- [Master specification](Documentation/MasterSpecification.md) — the supplied requirements, kept separately from engineering proposals.
- [Architecture](Documentation/Architecture/SystemDesign.md) — ownership, market/decision path, risk, communication, storage and security.
- [Living project record](Documentation/Decisions/ProjectRecord.md) — current status, versions, decisions, open issues, files and review instructions.
- [Blank eight-symbol inventory](Documentation/Testing/DemoSymbolInventory.csv) — worksheet; it contains no market observations.

## Repository layout

| Path | Purpose |
|---|---|
| `EA/Experts/`, `EA/Include/USTS/`, `EA/Tests/` | Native MQL5 entry point, module namespaces, test fixtures. Aligned with the MT5 data folder, not another EA runtime. |
| `Backend/app/`, `Backend/tests/` | Read-only status and sample delivery. Sample History, the SQLite exercise and test authentication have separate entry points. No production database or identities. |
| `Frontend/` | React + Vite sample dashboard; `Frontend/SampleHistory/` and `Frontend/AuthLab/` are independent previews. |
| `Documentation/` | Requirements, research, installation, user guide, stage checks and decisions. |
| `Configuration/` | Safe examples and schemas only; no secrets or runtime config in Stage 1. |
| `Backups/`, `Research/` | Instructions and clean study plans; keep private data and archives out of Git. |

Empty module directories have `.gitkeep` markers so Git preserves the structure. The private GitHub remote is not yet created. The **UltraShortTermTradingSystem-WebSampleHistory-0.6.zip** source handoff includes a portable Git bundle with `main` and the milestone tags. See the setup guide when ready.

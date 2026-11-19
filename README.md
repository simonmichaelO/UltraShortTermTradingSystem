# Ultra-short-term MT5 trading system

**Current milestone: local SQLite storage lab v0.5 · Sample dashboard v0.4 · Access Lab v0.3.2**

Tickframe is the planned web console for the native MT5 trading engine. The preview uses simulated market examples. It now reads one example account and its positions from a read-only FastAPI endpoint, separately from the web status check. Neither hosted preview opens a database or connects to an EA, MT5 bridge, or orders. The separate offline storage lab proves restart and restore using simulated samples only. No deposit, sign-in, or installation is needed for the dashboard preview.

## Start here

1. Open **Tickframe sample dashboard v0.4** in Arena. On **Overview**, use **Sample data feed → Delivery test → Delayed sample**. The badge should change to **Stale** while the sample values are still shown. [Frontend guide](Frontend/README.md) · [v0.4 checks](Documentation/Testing/WebSampleChecks.md) · [Run the combined preview](Backend/README.md).
2. Read the [SQLite storage check](Documentation/Testing/SQLiteStorageChecks.md) for the verified reopen and backup restoration. There is nothing to run on your side.
3. The [separate Access Lab](Documentation/UserGuide/AccessLab.md) tests passwords and authenticator codes with disposable test identities only. The operator has confirmed sign-in and sign-out in v0.3.2. It is not a sign-in service for the regular dashboard. See the [Access Lab checks](Documentation/Testing/AuthLabChecks.md) for evidence and limits.
4. When ready to begin the broker track, use the [Windows setup guide](Documentation/Installation/WindowsSetup.md) to connect a Standard MT5 **demo** without placing an order. Continue with the [Stage 1 checklist](Documentation/Testing/DevelopmentChecklist.md) and [feasibility report](Documentation/FeasibilityReport.md). None of the web previews clears a trading gate.

## Project reference

- [Master specification](Documentation/MasterSpecification.md) — the supplied requirements, kept separately from engineering proposals.
- [Architecture](Documentation/Architecture/SystemDesign.md) — ownership, market/decision path, risk, communication, storage and security.
- [Living project record](Documentation/Decisions/ProjectRecord.md) — current status, versions, decisions, open issues, files and review instructions.
- [Blank eight-symbol inventory](Documentation/Testing/DemoSymbolInventory.csv) — worksheet; it contains no market observations.

## Repository layout

| Path | Purpose |
|---|---|
| `EA/Experts/`, `EA/Include/USTS/`, `EA/Tests/` | Native MQL5 entry point, module namespaces, test fixtures. Aligned with the MT5 data folder, not another EA runtime. |
| `Backend/app/`, `Backend/tests/` | Read-only status and sample delivery. Test authentication and the offline SQLite exercise have separate entry points. No production database or identities. |
| `Frontend/` | React + Vite sample dashboard; `Frontend/AuthLab/` is the separate test sign-in UI. |
| `Documentation/` | Requirements, research, installation, user guide, stage checks and decisions. |
| `Configuration/` | Safe examples and schemas only; no secrets or runtime config in Stage 1. |
| `Backups/`, `Research/` | Instructions and clean study plans; keep private data and archives out of Git. |

Empty module directories have `.gitkeep` markers so Git preserves the structure. The private GitHub remote is not yet created. The **UltraShortTermTradingSystem-WebStorageLab-0.5.zip** source handoff includes a portable Git bundle with `main` and the milestone tags. See the setup guide when ready.

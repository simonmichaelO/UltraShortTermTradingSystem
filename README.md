# Ultra-short-term MT5 trading system

**Current milestone: Local Workspace v0.7 · verified in sandbox, Windows check pending**

Tickframe is the planned web console for the native MT5 trading engine. The local workspace now puts the dashboard and **Sample History** on one loopback address. It reads the two already saved synthetic account snapshots without reseeding; **Trade history** is still a separate simulated closed-trade ledger. None of the previews connects to an EA, MT5 or an order path.

## Start here

1. On the same Windows PC that ran v0.6, use the [Local Workspace run card](Documentation/Installation/LocalWorkspaceWindows.md) to upgrade the existing `Tickframe` clone. See the [v0.7 checks](Documentation/Testing/LocalWorkspaceChecks.md) for expected results and boundaries.
2. For browser feedback in Arena, the [v0.4 dashboard](Frontend/README.md), [standalone Sample History](Documentation/Testing/SampleHistoryChecks.md), and [Access Lab](Documentation/UserGuide/AccessLab.md) remain separate. The Access Lab checks sign-in with disposable test identities only; it does not authenticate the dashboard.
3. The [private GitHub backup and local testing plan](Documentation/Installation/HostingAndGitHub.md) separates the source restore, which the operator verified at the v0.6 checkpoint, from the local SQLite file. No paid hosting is needed. The [v0.5 SQLite lab](Documentation/Testing/SQLiteStorageChecks.md) verifies sample backup and restore separately.
4. When ready to begin the broker track, use the [Windows setup guide](Documentation/Installation/WindowsSetup.md) to connect a Standard MT5 **demo** without placing an order. The [Stage 1 checklist](Documentation/Testing/DevelopmentChecklist.md) and [feasibility report](Documentation/FeasibilityReport.md) still apply. None of the web previews clears a trading gate.

## Project reference

- [Master specification](Documentation/MasterSpecification.md) — the supplied requirements, kept separately from engineering proposals.
- [Architecture](Documentation/Architecture/SystemDesign.md) — ownership, market/decision path, risk, communication, storage and security.
- [Living project record](Documentation/Decisions/ProjectRecord.md) — current status, versions, decisions, open issues, files and review instructions.
- [Blank eight-symbol inventory](Documentation/Testing/DemoSymbolInventory.csv) — worksheet; it contains no market observations.

## Repository layout

| Path | Purpose |
|---|---|
| `EA/Experts/`, `EA/Include/USTS/`, `EA/Tests/` | Native MQL5 entry point, module namespaces, test fixtures. Aligned with the MT5 data folder, not another EA runtime. |
| `Backend/app/`, `Backend/tests/` | Read-only status, sample delivery and saved snapshots. The loopback workspace, standalone previews, SQLite lab and test authentication have separate entry points. |
| `Frontend/` | React + Vite dashboard; `LocalWorkspace/` is the opt-in integrated build, `SampleHistory/` and `AuthLab/` are independent builds. |
| `Documentation/` | Requirements, research, installation, user guide, stage checks and decisions. |
| `Configuration/` | Safe examples and schemas only; no secrets or runtime config in Stage 1. |
| `Backups/`, `Research/` | Instructions and clean study plans; keep private data and archives out of Git. |

Empty module directories have `.gitkeep` markers so Git preserves the structure. The **UltraShortTermTradingSystem-WebLocalWorkspace-0.7.zip** handoff includes a portable Git bundle with `main` and the milestone tags. Runtime SQLite remains local and is not packaged.

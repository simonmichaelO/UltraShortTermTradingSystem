# SQLite sample storage · v0.5

**Result: Passed.** Two simulated account snapshots were saved to disk. After the process that saved them exited, a fresh process reopened the database and read the same two snapshots. A separate backup also restored both snapshots while the original was out of use. Nothing needs to be installed or restarted on the operator’s side.

## What was verified

| Check | Observed result |
|---|---|
| Save, exit, reopen | **2 saved → 2 reopened.** All account and position fields, original storage timestamps, and payload checksums matched. The reopen reads SQLite, not the bundled fixture files. |
| Repeat the save | **0 new rows**; the two existing records and their save timestamps were unchanged. |
| Original unavailable | After taking the original file out of use, the read reported **Unavailable** and did not create an empty file or supply example values from elsewhere. |
| Restore from backup | A consistent copy made with SQLite’s backup API restored **2 of 2** snapshots into a new file. A fresh process verified the restored records against the originals. |

| Fictional snapshot time (UTC) | Example equity | Example positions in each snapshot |
|---|---:|---:|
| 17 Nov 2026, 14:30:32 | $2,486.72 | 3 |
| 17 Nov 2026, 14:31:32 | $2,491.76 | 3 |

These are two prewritten observations, not real prices, fills or trades. The example times are distinct from the storage timestamps. The sandbox run used Python 3.13 and SQLite 3.46.1. The local proof files are under `LocalData/SampleStorageLab/proof-v0.5/`; the source archive does not include runtime databases, backups or logs.

## Automated checks

- **68 Python tests passed**, including **14 new SQLite cases**. The storage tests cover a fresh-process reopen, retry without duplicates, rollback after an injected write failure, an interrupted process with an uncommitted change, missing versus empty storage, invalid data, conflict rejection, protected copy destinations, and backup restoration. Dependency check passed.
- **15 Node and 16 Chromium tests passed** for the existing v0.4 dashboard. Neither it nor Access Lab v0.3.2 opens the lab database. There is no storage endpoint and no change to the public API or UI.

## Optional reproduction in the workspace

No operator action is required. To rerun from `Backend/` with the existing Python environment, use a **new** local directory under `LocalData/`:

```bash
lab=../LocalData/SampleStorageLab/manual-run
mkdir -p "$lab"
.venv/bin/python -m app.sample_storage_lab --db "$lab/primary.sqlite3" seed
.venv/bin/python -m app.sample_storage_lab --db "$lab/primary.sqlite3" inspect
.venv/bin/python -m app.sample_storage_lab --db "$lab/primary.sqlite3" backup --to "$lab/backup.sqlite3"
.venv/bin/python -m app.sample_storage_lab --db "$lab/backup.sqlite3" backup --to "$lab/restored.sqlite3"
.venv/bin/python -m app.sample_storage_lab --db "$lab/restored.sqlite3" inspect
```

Each invocation is a separate process. `seed` accepts only the two bundled examples; there is no data import or HTTP writer. `inspect` opens the database read-only, verifies the schema and payloads, and refuses missing, unknown or invalid data. `backup` uses SQLite’s copy operation and refuses to overwrite a destination. The store uses a versioned schema, parameterized writes, one transaction for the batch, and the existing account/position validation. Checksums detect accidental changes; they are not authentication.

**Limits:** This is a local test with synthetic data, not a production database or disaster-recovery plan. There was no disk/power-loss test, Windows validation, live-volume load test, encryption or off-machine backup test. It does not store credentials, change retention policy, or clear Stage 1/6. MT5 remains disconnected and live entries remain locked. See the [project record](../Decisions/ProjectRecord.md) and the [v0.4 hosted sample checks](WebSampleChecks.md) for the separate milestones.

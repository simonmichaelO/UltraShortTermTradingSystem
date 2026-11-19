"""Offline CLI for saving, reopening and copying only bundled synthetic snapshots."""

import argparse
import json
from pathlib import Path
import sqlite3
import sys

from app.database.sample_store import DATA_SOURCE, SCHEMA_VERSION, StoreError, copy_store, inspect_store, seed_store


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--db", required=True, type=Path, help="Local .sqlite3 file under an existing lab folder")
    actions = parser.add_subparsers(dest="action", required=True)
    actions.add_parser("seed", help="Save the two checked-in examples without updating existing rows")
    actions.add_parser("inspect", help="Open the store read-only and verify its saved samples")
    backup = actions.add_parser("backup", help="Copy and verify the database, or restore a copy into a new file")
    backup.add_argument("--to", required=True, type=Path, help="New .sqlite3 destination; never overwrites")
    args = parser.parse_args(argv)

    inserted = None
    try:
        if args.action == "seed":
            inserted, snapshots = seed_store(args.db)
        elif args.action == "inspect":
            snapshots = inspect_store(args.db)
        else:
            snapshots = copy_store(args.db, args.to)
    except StoreError as exc:
        print(f"Sample storage unavailable: {exc}", file=sys.stderr)
        return 1
    except (OSError, sqlite3.Error):
        print("Sample storage unavailable: SQLite could not complete the operation. Check the local lab file and folder.",
              file=sys.stderr)
        return 1

    result = {
        "action": args.action,
        "status": "verified" if snapshots else "empty",
        "data_source": DATA_SOURCE,
        "store_schema_version": SCHEMA_VERSION,
        "row_count": len(snapshots),
        "snapshots": [
            {"stored_at_utc": item.stored_at_utc, "payload_sha256": item.payload_sha256,
             "sample": item.sample.model_dump(mode="json")} for item in snapshots
        ],
    }
    if inserted is not None:
        result["inserted"] = inserted
    print(json.dumps(result, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())

from contextlib import closing
from hashlib import sha256
import json
from pathlib import Path
import sqlite3
import subprocess
import sys

import pytest

from app.database import sample_store

BACKEND = Path(__file__).resolve().parents[1]


def cli(path, *args):
    return subprocess.run(
        [sys.executable, "-m", "app.sample_storage_lab", "--db", str(path), *args],
        cwd=BACKEND, capture_output=True, text=True, timeout=10,
    )


def verified(process):
    assert process.returncode == 0, process.stderr
    return json.loads(process.stdout)


def update(path, sql, params=()):
    with closing(sqlite3.connect(path)) as db, db:
        db.execute(sql, params)


def test_commit_and_reopen_in_separate_processes_without_duplicate_or_refreshed_rows(tmp_path):
    path = tmp_path / "primary.sqlite3"
    saved = verified(cli(path, "seed"))  # this process has exited before the new one starts
    reopened = verified(cli(path, "inspect"))
    retried = verified(cli(path, "seed"))
    assert saved["inserted"] == 2 and retried["inserted"] == 0
    assert reopened["row_count"] == 2 and reopened["data_source"] == "simulated_examples"
    assert reopened["store_schema_version"] == 1
    assert reopened["snapshots"] == saved["snapshots"] == retried["snapshots"]
    examples = [record["sample"] for record in reopened["snapshots"]]
    assert [item["as_of"] for item in examples] == ["2026-11-17T14:30:32Z", "2026-11-17T14:31:32Z"]
    assert [item["account"]["equity_cents"] for item in examples] == [248672, 249176]
    assert all(len(item["positions"]) == 3 for item in examples)
    assert len({row["payload_sha256"] for row in reopened["snapshots"]}) == 2
    assert len({row["stored_at_utc"] for row in reopened["snapshots"]}) == 1


def test_inspection_does_not_fall_back_to_bundled_fixtures(tmp_path, monkeypatch):
    path = tmp_path / "primary.sqlite3"
    _, expected = sample_store.seed_store(path)

    def unexpected_fixture_read(*_args):
        pytest.fail("reopening should use SQLite, not fixture files")

    monkeypatch.setattr(sample_store, "load_sample_fixture", unexpected_fixture_read)
    assert sample_store.inspect_store(path) == expected
    with pytest.raises(sample_store.StoreError, match="No saved sample database"):
        sample_store.inspect_store(tmp_path / "missing.sqlite3")


def test_missing_file_and_a_valid_empty_store_are_distinct(tmp_path):
    path = tmp_path / "primary.sqlite3"
    absent = cli(path, "inspect")
    assert absent.returncode == 1 and absent.stdout == "" and "No saved sample database" in absent.stderr
    assert not path.exists()
    sample_store.seed_store(path)
    update(path, "DELETE FROM sample_snapshots")  # create a valid empty test database, not a CLI operation
    empty = verified(cli(path, "inspect"))
    assert empty["status"] == "empty" and empty["row_count"] == 0 and empty["snapshots"] == []


def test_write_failure_after_one_insert_rolls_back_the_entire_batch(tmp_path, monkeypatch):
    path = tmp_path / "primary.sqlite3"
    sample_store.seed_store(path)
    update(path, "DELETE FROM sample_snapshots")
    insert = sample_store._insert
    calls = 0

    def fail_second(*args):
        nonlocal calls
        calls += 1
        if calls == 2:
            raise sqlite3.OperationalError("test-only second insert failure")
        insert(*args)

    monkeypatch.setattr(sample_store, "_insert", fail_second)
    with pytest.raises(sqlite3.OperationalError, match="second insert failure"):
        sample_store.seed_store(path)
    assert calls == 2
    assert sample_store.inspect_store(path) == ()


def test_a_process_exit_without_commit_leaves_prior_records_intact(tmp_path):
    path = tmp_path / "primary.sqlite3"
    _, expected = sample_store.seed_store(path)
    script = """
import os, sqlite3, sys
connection = sqlite3.connect(sys.argv[1], isolation_level=None)
connection.execute('BEGIN IMMEDIATE')
assert connection.execute('DELETE FROM sample_snapshots').rowcount == 2
os._exit(19)
"""
    interrupted = subprocess.run([sys.executable, "-c", script, str(path)], capture_output=True, timeout=10)
    assert interrupted.returncode == 19, interrupted.stderr
    assert sample_store.inspect_store(path) == expected


@pytest.mark.parametrize("problem", ["foreign", "version", "non-sqlite"])
def test_other_invalid_or_unknown_stores_are_not_reinitialized(tmp_path, problem):
    path = tmp_path / "not-a-lab-store.sqlite3"
    if problem == "foreign":
        update(path, "CREATE TABLE unrelated (example TEXT)")
        update(path, "INSERT INTO unrelated VALUES ('do not replace')")
    elif problem == "version":
        sample_store.seed_store(path)
        update(path, "PRAGMA user_version = 99")
    else:
        path.write_bytes(b"not a SQLite file")
    before = path.read_bytes()
    for action in ("inspect", "seed"):
        result = cli(path, action)
        assert result.returncode == 1 and result.stdout == "" and "unavailable" in result.stderr
        assert path.read_bytes() == before
    target = tmp_path / "no-copy.sqlite3"
    assert cli(path, "backup", "--to", str(target)).returncode == 1
    assert not target.exists()


def test_unknown_or_invalid_bundle_fixture_stops_seed_before_creating_a_file(tmp_path, monkeypatch):
    missing = tmp_path / "missing.json"
    monkeypatch.setitem(sample_store.EXAMPLES, "tf-example-2026-11-17-step-2", missing)
    target = tmp_path / "not-created.sqlite3"
    with pytest.raises(sample_store.StoreError, match="synthetic examples did not validate"):
        sample_store.seed_store(target)
    assert not target.exists()


@pytest.mark.parametrize("check", ["checksum", "account", "metadata"])
def test_corrupt_payload_or_metadata_is_unavailable_not_a_partial_result(tmp_path, check):
    path = tmp_path / "primary.sqlite3"
    _, records = sample_store.seed_store(path)
    sample = records[1].sample.model_dump(mode="json")  # damage only the second record
    key = sample["fixture_id"]
    if check == "checksum":
        update(path, "UPDATE sample_snapshots SET payload_sha256 = ? WHERE fixture_id = ?", ("0" * 64, key))
    elif check == "account":
        sample["account"]["equity_cents"] += 1
        bad = json.dumps(sample)
        update(path, "UPDATE sample_snapshots SET payload_json = ?, payload_sha256 = ? WHERE fixture_id = ?",
               (bad, sha256(bad.encode()).hexdigest(), key))
    else:
        update(path, "UPDATE sample_snapshots SET example_at_utc = ? WHERE fixture_id = ?", ("wrong timestamp", key))
    before = path.read_bytes()
    for action in ("inspect", "seed"):
        result = cli(path, action)
        assert result.returncode == 1 and result.stdout == "" and "saved sample" in result.stderr
        assert path.read_bytes() == before


def test_conflicting_existing_id_is_not_overwritten(tmp_path):
    path = tmp_path / "primary.sqlite3"
    _, records = sample_store.seed_store(path)
    sample = records[1].sample.model_dump(mode="json")
    sample["positions"][0]["rationale"] = "Another valid synthetic observation with the wrong existing ID."
    different = json.dumps(sample)
    update(path, "UPDATE sample_snapshots SET payload_json = ?, payload_sha256 = ? WHERE fixture_id = ?",
           (different, sha256(different.encode()).hexdigest(), sample["fixture_id"]))
    before = sample_store.inspect_store(path)
    with pytest.raises(sample_store.StoreError, match="same ID"):
        sample_store.seed_store(path)
    assert sample_store.inspect_store(path) == before


def test_verified_backup_can_restore_into_a_new_file_with_primary_offline(tmp_path):
    primary = tmp_path / "primary.sqlite3"
    backup = tmp_path / "backup.sqlite3"
    restored = tmp_path / "restored.sqlite3"
    expected = verified(cli(primary, "seed"))["snapshots"]
    assert verified(cli(primary, "backup", "--to", str(backup)))["snapshots"] == expected
    primary.rename(tmp_path / "offline-original.sqlite3")
    assert cli(primary, "inspect").returncode == 1 and not primary.exists()
    assert verified(cli(backup, "backup", "--to", str(restored)))["snapshots"] == expected
    assert verified(cli(restored, "inspect"))["snapshots"] == expected
    assert cli(backup, "backup", "--to", str(restored)).returncode == 1
    assert verified(cli(restored, "inspect"))["snapshots"] == expected

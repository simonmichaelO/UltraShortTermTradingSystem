# Backups

This directory only documents backups; do not put backup contents into version control. Later: maintain encrypted, off-machine backups of the SQLite database, archive manifests, permitted tick partitions, audit logs and recoverable configuration. Use a consistent SQLite snapshot, not an arbitrary copy of the active database file, and test restoration. See the [data and auditing design](../Documentation/Architecture/SystemDesign.md#data-and-auditing).

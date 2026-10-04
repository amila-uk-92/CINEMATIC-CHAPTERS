# Backup and restore

This is an operational procedure to rehearse before using real customer data; no external backup service has been purchased or configured.

## Consistent backup

1. Stop application writes and stop the background worker. Leave PostgreSQL running.
2. Use a PostgreSQL 18 client `pg_dump --format=custom` against `DATABASE_URL`, writing to an encrypted destination with restricted permissions. Do not print the connection URL or put a password directly on the command line. Prefer `PGSERVICE` plus a mode-0600 `.pgpass`, or a secret manager injection.
3. Copy the private object root `.data/objects` (or the entire private S3 bucket including needed object versions), preserving object keys. Include public originals, client originals, previews and ZIPs. Temporary processing files can be regenerated once jobs are reconciled.
4. Back up `.env.local`/secret-manager references separately in encrypted, access-controlled storage. Keep the application source, lockfile and migration version with the snapshot.
5. Check archive checksums, timestamp and access rights. Resume writes and the worker.

For continuous production operation, use managed PostgreSQL point-in-time recovery and S3 versioning/lifecycle, with a consistency watermark spanning DB and object versions. Avoid copying a live PostgreSQL data directory with ordinary file tools. The embedded package's PostgreSQL binaries include pg_dump/pg_restore; identify their resolved binary paths for local drills rather than modifying the system installation.

## Restore drill

1. Restore into a new isolated database and private object root/bucket; never overwrite the active database during a drill.
2. Restore the PostgreSQL custom archive using pg_restore, then supply the restored application's `DATABASE_URL` and storage configuration. Use a new loopback port for testing.
3. Restore matching object keys/versions. Keep external messages disabled and use the local preview email adapter.
4. Run migrations only if intentionally upgrading. Start the app and worker; the worker recovers stale job leases. Confirm object counts/sizes, bookings/package snapshots, drafts and published content, private previews and ZIPs, expired/revoked denial, and cleanup states.
5. Revoke old sessions/setup tokens as appropriate when cutting over. Coordinate Telegram update handling and outbox recovery to avoid replaying historical messages; do not automatically enable outbound integrations.
6. Verify an actual gallery ZIP's contents, not just its button or status. Record drill date, checks, restore duration and recovery-point loss. Only cut over after business approval.

## Retention

Deletion revokes live access immediately and cleanup removes active files. Encrypted historical backups may retain copies until their own approved retention expiry. That retention is not reclaimed active storage and must be described in the reviewed privacy notice. The business must set retention periods for bookings, audit logs, chats, galleries and backups before launch.

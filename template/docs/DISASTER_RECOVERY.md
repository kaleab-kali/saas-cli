# Disaster Recovery

This document defines the minimum operational standard for restore and recovery.

## Recovery Targets

Set these per product before launch:

- RPO: maximum acceptable data loss.
- RTO: maximum acceptable recovery time.

For most early SaaS deployments, start with RPO under 24 hours and RTO under 4 hours, then tighten as customers depend on the system.

## Backups

- Enable automated Postgres backups.
- Keep at least 7 daily backups and 4 weekly backups.
- Store backups outside the application server.
- Encrypt backups at rest.
- Restrict backup access to production operators.

Local backup command:

```bash
pnpm db:backup
```

By default this reads `DATABASE_URL` from `apps/api/.env` and writes a compressed custom-format dump to `backups/postgres`. For production, run it from cron with `DATABASE_URL` supplied by your secret manager and copy the resulting `.dump` file to encrypted off-server storage.

Useful options:

```bash
DATABASE_URL="postgresql://..." BACKUP_DIR=/var/backups/{{projectSlug}} pnpm db:backup
pnpm db:backup --output-dir /var/backups/{{projectSlug}} --retention-days 35
pnpm db:backup --dry-run
```

## Restore Drill

Run a restore drill before launch and after any major schema change:

1. Create an empty database.
2. Restore the latest backup.
3. Run migrations if needed.
4. Start the API against the restored database.
5. Run `pnpm test:smoke`.
6. Verify admin login and tenant login.
7. Record duration and any manual fixes.

Restore command:

```bash
RESTORE_DATABASE_URL="postgresql://..." pnpm db:restore --file /var/backups/{{projectSlug}}/postgres-latest.dump --yes
```

Always restore into an empty or disposable database first. The restore command is destructive and requires `--yes` unless you use `--dry-run`.

## App Server Recovery

Document:

- Provisioning steps.
- Environment variables.
- Process manager commands.
- Reverse proxy configuration.
- Object storage configuration.
- Queue worker startup.

## Key Loss

If `MASTER_KEY` is lost, encrypted fields cannot be recovered. Keep production secrets in a password manager or managed secrets store with access audit logs.

## Incident Communication

Prepare customer-facing messages for:

- Scheduled maintenance.
- Partial outage.
- Full outage.
- Data restoration in progress.
- Resolution and postmortem.

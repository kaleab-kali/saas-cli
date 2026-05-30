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

## Restore Drill

Run a restore drill before launch and after any major schema change:

1. Create an empty database.
2. Restore the latest backup.
3. Run migrations if needed.
4. Start the API against the restored database.
5. Run `pnpm test:smoke`.
6. Verify admin login and tenant login.
7. Record duration and any manual fixes.

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

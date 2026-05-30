# Migrations Playbook

Database migrations are production changes. Review them like application code.

## Safe Pattern

Prefer expand/migrate/contract:

1. Expand: add nullable columns, new tables, or backward-compatible indexes.
2. Deploy code that writes both old and new shapes if needed.
3. Backfill in small batches.
4. Verify counts and checksums.
5. Deploy code that reads the new shape.
6. Contract: remove old columns only after a full release cycle.

## Before Running

- Confirm backup exists.
- Review generated SQL.
- Estimate table size and lock risk.
- Check whether indexes are concurrent or blocking.
- Confirm rollback plan.

## Backfills

- Run in batches.
- Log progress.
- Make scripts idempotent.
- Avoid long transactions on large tables.
- Store checkpoints for long-running jobs.

## Forbidden Without Review

- Dropping columns.
- Renaming columns used by active code.
- Adding non-null columns without defaults to large tables.
- Blocking indexes on large tables.
- Raw SQL with string interpolation.
- Destructive Prisma resets in shared environments.

## Verification

After migration:

```bash
pnpm db:generate
pnpm typecheck
pnpm test:smoke
```

For tenant tables, run tenant isolation checks and sample counts by `organizationId`.

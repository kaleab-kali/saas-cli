# Pre-Launch Checklist

Use this checklist before moving a generated SaaS into production.

## Build And Tests

- `pnpm install` has completed on the target runtime.
- `pnpm db:generate` has generated Prisma client files.
- `pnpm lint:ci` passes.
- `pnpm typecheck` passes.
- `pnpm test:ci` passes.
- `pnpm test:smoke` passes.
- `pnpm test:security:tooling` passes.
- `pnpm test:load:k6:mock` passes.
- `pnpm doctor:production` has no failures.

## Environment

- `DATABASE_URL` points to a production database with backups enabled.
- `REDIS_URL` points to a production Redis instance.
- `BETTER_AUTH_SECRET` is unique to this environment.
- `MASTER_KEY` is unique to this environment.
- `FRONTEND_URL` and `BETTER_AUTH_URL` use HTTPS.
- Payment, email, object storage, and webhook secrets are set only in environment variables.

## Database

- Migrations have been reviewed.
- Backups are enabled and restore has been tested.
- `pnpm db:backup --dry-run` and `pnpm db:restore --dry-run --file <latest.dump>` have been exercised with production-style environment variables.
- Seed scripts are safe to rerun.
- Tenant isolation checks pass.

## Operations

- Health endpoint is reachable.
- Metrics endpoint is protected or private.
- Logs include request IDs and organization IDs where appropriate.
- Queue workers are running.
- Failed job retry process is documented.
- Admin credentials are stored in a password manager.

## Security

- HTTPS is enforced.
- Admin 2FA policy is enabled.
- Upload size limits are configured.
- Secret scanning is enabled in CI.
- Dependency scanning is scheduled.
- Responsible disclosure contact is documented.

## Starter Packs

- `.scaffold-state.json` lists the starter packs expected for this product.
- Installed starter pack docs have been read.
- Optional starter pack environment variables are set only when the pack is installed.

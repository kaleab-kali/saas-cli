# EIMS Starter Pack

This starter pack is installed with:

```bash
create-vyllion-saas add starter eims
```

The base scaffold is intentionally domain-neutral. EIMS files are added only when this pack is installed, and install state is tracked in `.scaffold-state.json` so repeat installs are safe.

To update an existing generated project after this starter's UI changes:

```bash
create-vyllion-saas add starter eims --refresh
```

Refresh reapplies the starter-owned web UI, routes, EIMS browser tests, package scripts, seed chain, env examples, landing redirect, and sidebar patches. It deliberately does not overwrite API modules.

The installer copies EIMS source artifacts from `packages/cli/starters/eims/artifacts` and applies the required Prisma, route, permission, script, environment, seed, landing, and sidebar patches. After install, authenticated users land on `/eims` instead of the base `/onboarding` page, while removing the starter restores the base landing route. The generated `db:seed` chain also registers the `eims-restaurant` concierge onboarding template so `/admin/onboarding/new` can start the 15-step MoR, INSA, credential, sandbox, and production-readiness workflow.

The `pack.json` manifest is the source-of-truth metadata for routes, models, permissions, environment variables, seed data, queues, and cron jobs.

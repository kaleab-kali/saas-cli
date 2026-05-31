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

Refresh reapplies the starter-owned web UI, routes, EIMS browser tests, package scripts, seed chain, env examples, landing policy, and sidebar patches. It deliberately does not overwrite API modules.

The installer copies EIMS source artifacts from `packages/cli/starters/eims/artifacts` and applies the required Prisma, route, permission, script, environment, seed, and sidebar patches. After install, authenticated users still land on `/onboarding` because the concierge workflow is the primary EIMS launch surface; tax operations stay available under `/eims`. The generated `db:seed` chain registers the `eims-restaurant` concierge onboarding template so `/admin/onboarding/new` can start the 15-step MoR, INSA, credential, sandbox, and production-readiness workflow.

The `pack.json` manifest is the source-of-truth metadata for routes, models, permissions, environment variables, seed data, queues, and cron jobs.

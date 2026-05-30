# EIMS Starter Pack

This starter pack is installed with:

```bash
create-vyllion-saas add starter eims
```

The base scaffold is intentionally domain-neutral. EIMS files are added only when this pack is installed, and install state is tracked in `.scaffold-state.json` so repeat installs are safe.

The installer restores the EIMS source artifacts from the main template and applies the required Prisma, route, permission, script, environment, and sidebar patches. The `pack.json` manifest is the source-of-truth metadata for routes, models, permissions, environment variables, seed data, queues, and cron jobs.

# Starter Packs

The base template is domain-neutral. Optional business domains belong in starter packs.

## Commands

```bash
pnpm gen:starters
pnpm gen:starter eims
pnpm gen:starter:uninstall eims
```

Installed packs are tracked in `.scaffold-state.json`. Re-running an installed pack is idempotent and should not overwrite local changes.

## Rules

- A starter pack may add modules, routes, Prisma models, permissions, seed data, tests, docs, queues, cron jobs, and environment variables.
- A starter pack must be tenant-aware.
- A starter pack must not require manual edits for the happy path.
- A starter pack must document every environment variable it adds.
- A starter pack must include at least one API test and one browser or acceptance test for user-facing flows.

## Authoring Checklist

- Add pack metadata to `packages/cli/starters/<name>/pack.json`.
- Add install logic to the CLI or a pack installer.
- Record install state in `.scaffold-state.json`.
- Make install idempotent.
- Provide uninstall or cleanup behavior for generated artifacts.
- Add docs under `docs/STARTER_<NAME>.md`.
- Add permission statements and default role mappings.
- Add test commands to the root scripts only when the pack is installed.

## EIMS Example

The EIMS starter pack installs Ethiopian e-invoicing scaffolding:

- EIMS Prisma models.
- Tenant EIMS routes under `/eims`.
- Platform admin routes under `/admin/eims`.
- EIMS permissions and feature entitlements.
- EIMS mock tests, acceptance fixtures, phase 0 runbooks, and environment variables.

The base scaffold must not contain EIMS files unless this pack is installed.

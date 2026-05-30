# Module Guide

To add a domain module:

Start with the CLI generator:

```bash
create-vyllion-saas add module projects
```

It creates a repository-pattern API module plus web feature files, an authenticated route, permissions, and sidebar entry.

For a larger starting surface, use a starter pack:

```bash
pnpm gen:starter crm
```

Starter packs are listed in `docs/DOMAIN_STARTER_PACKS.md`.

Generated API files include:
- Domain entity
- Abstract repository
- Prisma repository placeholder
- Mapper
- Create command handler
- List query handler
- Controller and DTO
- Focused handler unit test

Then finish the domain work:

1. Add Prisma models and run a migration.
2. Replace the Prisma repository placeholder with real Prisma reads/writes.
3. Add tests for authorization, tenant scoping, and core behavior.
4. Run `pnpm --filter web build` so TanStack Router refreshes `routeTree.gen.ts`.

If the module is plan-gated, add a `FeatureKey`, register it in the billing feature registry, seed plan entitlements, and use `@RequireFeature(...)` or `@RequireUsageLimit(...)` on write endpoints.

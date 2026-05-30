# CLAUDE.md - {{projectName}}

This project is a generic multi-tenant SaaS starter. Keep product-specific domain logic out of shared infrastructure modules unless it is intentionally reusable.

## Conventions

- Backend modules live in `apps/api/src/modules`.
- Shared backend infrastructure lives in `apps/api/src/shared`.
- Frontend routes live in `apps/web/src/routes`.
- Frontend feature APIs and components live in `apps/web/src/features`.
- Permissions are declared in `apps/api/src/modules/auth/permissions.ts`.

## Adding A Domain

1. Add Prisma models with `organizationId` for tenant-owned data.
2. Add a Nest module with controller, DTOs, handlers, repository, and tests.
3. Add permissions for the new resource.
4. Add frontend routes, API hooks, and navigation entries.
5. Add seed data only when it is generic or explicitly part of your app.

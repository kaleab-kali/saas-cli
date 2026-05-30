# {{projectName}}

Production-ready multi-tenant SaaS starter.

Dependencies are pinned to exact versions for reproducible local installs.

## Stack

- NestJS + PostgreSQL + Prisma + Better Auth + BullMQ + Redis
- React + Vite + TanStack Router + TanStack Query + shadcn/ui
- pnpm workspaces + Turborepo
- Stripe, Chapa, and manual billing foundations

## Getting Started

```bash
pnpm install
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Open `http://localhost:5173`.

## Local Workflow

```bash
pnpm doctor
pnpm gen:module customers
pnpm gen:starter crm
```

`pnpm doctor` checks env files, Prisma client state, database/Redis ports, and app ports. `pnpm gen:module <name>` creates one generic API module and web feature route. `pnpm gen:starter <pack>` creates several modules for CRM, marketplace, project management, AI SaaS, booking, or helpdesk.

## Quality Gates

```bash
pnpm typecheck
pnpm test:api
pnpm test:property
pnpm test:e2e
pnpm test:acceptance
pnpm test:ai
pnpm test:load
pnpm test:mutation
```

Test apps live under `apps/api-tests`, `apps/e2e`, `apps/acceptance`, `apps/performance`, `apps/security`, and `apps/ai-eval`. API unit, property, and mutation tests stay in `apps/api`. See `docs/TESTING_GUIDE.md`.

Domain starter packs are documented in `docs/DOMAIN_STARTER_PACKS.md`.

## Included Modules

| Module | Description |
| --- | --- |
| Auth | Better Auth, organization tenancy, RBAC |
| Admin | Platform admin users, organizations, plans, jobs, audit |
| Billing | Plans, subscriptions, invoices, payments, dunning |
| Notifications | In-app, email, templates, bulk messages |
| Reporting | Saved reports, schedules, exports |
| Settings | Organization, security, lookups, API keys |

## Admin Operations

The platform admin side includes organization detail, billing/subscription visibility, usage snapshots, resource counts, background jobs, and a server dashboard for runtime/database/host health. See `docs/ADMIN_OPERATIONS_GUIDE.md`.

Add your business domain modules under `apps/api/src/modules` and `apps/web/src/features`.

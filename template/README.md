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
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Open `http://localhost:5173`.

## Local Workflow

```bash
pnpm doctor
pnpm doctor:production
pnpm readiness:smoke
pnpm gen:module customers
pnpm gen:starters
pnpm gen:starter eims
pnpm gen:starter:uninstall eims
```

`pnpm doctor` checks env files, Prisma client state, database/Redis ports, and app ports. `pnpm doctor:production` turns missing production prerequisites into release blockers, including HTTPS public URLs, deploy env, metrics protection, SMTP readiness, and installed starter-pack go-live settings. `pnpm readiness:smoke` proves deploy, backup, and restore dry-run paths locally. `pnpm gen:module <name>` creates one generic API module and web feature route. `pnpm gen:starters` lists available starter packs. `pnpm gen:starter <pack>` installs an optional pack, and `pnpm gen:starter:uninstall <pack>` removes packs that support automated uninstall.

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
pnpm deploy:check
```

Test apps live under `apps/api-tests`, `apps/e2e`, `apps/acceptance`, `apps/performance`, `apps/security`, and `apps/ai-eval`. API unit, property, and mutation tests stay in `apps/api`. See `docs/TESTING_GUIDE.md`.

`pnpm deploy:check` runs Prisma generation, production doctor checks, CI lint/type checks, API and web production builds, then the broad smoke suite. The generated CI production-gate job installs Playwright Chromium first so deploy readiness also covers browser smoke.

The base scaffold is domain-neutral. Optional starter packs are documented in `docs/STARTER_PACKS.md` and `docs/DOMAIN_STARTER_PACKS.md`; EIMS is installed only when you run `pnpm gen:starter eims`.

Production readiness docs:

- `docs/SECURITY.md`
- `docs/OBSERVABILITY.md`
- `docs/DISASTER_RECOVERY.md`
- `docs/MIGRATIONS_PLAYBOOK.md`
- `docs/PRE_LAUNCH_CHECKLIST.md`
- `docs/WEBHOOK_GUIDE.md`
- `docs/DESIGN_TOKENS.md`

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

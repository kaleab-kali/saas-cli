# create-vyllion-saas Features

`create-vyllion-saas` scaffolds a generic multi-tenant SaaS starter.

## CLI

- Interactive project-name and environment prompts
- `--yes` mode for non-interactive scaffolding
- Token replacement for project name, slug, database name, auth secret, admin credentials, and Caddy domain
- Generated `.env` files and local credential handoff file

## Template

- NestJS API with Prisma, Better Auth, RBAC, billing, notifications, reporting, audit logs, API keys, and platform admin
- React/Vite web app with TanStack Router, TanStack Query, shadcn/ui, i18n, tenant routes, and admin routes
- pnpm workspaces and Turborepo
- Stripe, Chapa, and manual billing foundations
- Caddy and PM2 deployment examples

## Intentionally Not Included

Business-domain modules are intentionally excluded. Add your own product domain after scaffolding.

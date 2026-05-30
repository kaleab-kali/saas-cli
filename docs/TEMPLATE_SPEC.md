# Template Spec

This spec describes the current `create-vyllion-saas` output.

## Goal
Generate a production-leaning, domain-neutral SaaS starter that gives teams the shared infrastructure every B2B SaaS app needs without forcing a vertical business model.

## Generated Stack
- NestJS API
- React and Vite web app
- TanStack Router and Query
- Prisma and PostgreSQL
- Better Auth
- RBAC and API keys
- Billing with plans, subscriptions, invoices, payments, dunning, usage snapshots, and entitlements
- Notifications, reporting, audit log, admin panel, settings, health checks, server/resource operations, and error reporting
- Biome, Turborepo, PM2, and Caddy configuration
- Playwright browser E2E, Playwright API tests, Bruno API collections, Spectral OpenAPI linting, Cucumber acceptance, k6 load/performance, free security checks, AI evaluation, property tests, and Stryker mutation scaffolds

## CLI Contract
The CLI must:
- Copy only the template files needed by the generated app
- Replace explicit template tokens only, not arbitrary product strings
- Generate safe local secrets
- Write `apps/api/.env`, `apps/web/.env`, and `.scaffold-credentials.txt`
- Refuse to overwrite a non-empty target directory
- Optionally run install, Prisma push, and seed with `--bootstrap`
- Provide local utility commands for environment checks, generic module generation, and domain starter-pack generation
- Produce a project that can run `pnpm install`, `pnpm db:generate`, `pnpm db:migrate`, `pnpm db:seed`, `pnpm typecheck`, and `pnpm dev`

## Dependency Policy
Generated project manifests must use exact dependency versions. When the template is maintained, update packages intentionally, refresh `pnpm-lock.yaml`, then commit exact versions without `^` or `~` ranges.

## Template Tokens
- `{{projectName}}`
- `{{projectSlug}}`
- `{{dbName}}`
- `{{authSecret}}`
- `{{superAdminEmail}}`
- `{{superAdminPassword}}`
- `{{caddyDomain}}`

## Domain Policy
The base template must not include a product-specific domain. Product teams should add their own modules after scaffold using the generated project's module guide.

Allowed base concepts:
- Organization, member, user, role, permission
- Plan, entitlement, subscription, invoice, payment, usage snapshot
- Notification, template, preference, delivery
- Saved report, report execution, report schedule
- Lookup, saved view, organization setting, security setting
- Admin user, audit log, job run, feature flag
- Server health/resource counters for platform administration

## Acceptance
A generated project is acceptable when:
- No old product brand appears in user-facing text, docs, env defaults, routes, or seed data
- App names come from CLI input or environment variables
- Navigation points only to routes that exist
- Reporting data sources match models that exist in the template schema
- Notification event names are generic and app-owned
- Billing labels use generic minor currency units and ISO currency codes
- The root repository has only one active CLI implementation
- Generated test scaffolds run or skip intentionally without requiring a paid AI provider
- Admin tenant detail includes plan/subscription state, usage, and resource counts
- Starter-pack generation creates only domain-neutral scaffolds and refuses to overwrite existing modules

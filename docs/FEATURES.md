# FEATURES.md

This repository packages the `create-vyllion-saas` CLI and a domain-neutral SaaS template.

## API Modules
- Auth and Better Auth integration
- Organization context and tenant scoping
- Super admin APIs
- Tenant detail APIs with subscription, usage, and resource counts
- RBAC and custom roles
- API keys
- Audit log
- Billing, plans, subscriptions, invoices, payments, dunning, and usage snapshots
- Notifications, templates, preferences, bulk sends, and delivery logs
- Reporting, saved reports, schedules, and exports
- Organization settings and security settings
- Health checks, server overview, resource inventory, and error reporting
- Shared database, logger, email, storage, lookup, and saved-view utilities

## Web Features
- Login, signup, and create-organization flow
- Authenticated app shell with organization switcher
- Settings pages for organization, roles, billing, security, API keys, audit log, and lookups
- Notification center
- Reporting workspace
- Billing and subscription management
- Super admin dashboard, organizations, users, plans, billing, settings, jobs, feature flags, server operations, and audit logs

## Domain Surface
The scaffold intentionally does not ship product-specific business entities. Add your own module with the generated project's `docs/MODULE_GUIDE.md`.

## DevOps
- Turborepo workspace with API and web apps
- Prisma migrations and seed scripts
- Biome lint/format setup
- Local doctor command for generated projects
- Playwright E2E scaffold
- AI evaluation harness
- API testing with Playwright API checks, Bruno collections, and Spectral OpenAPI linting
- k6 load/performance runner
- Free local security checks with gitleaks, pnpm audit/osv-scanner, semgrep, nuclei, and API security smoke tests
- Stryker mutation testing config
- PM2 ecosystem config
- Caddy reverse proxy config
- Production environment examples

## CLI Output
The CLI copies `template/`, applies explicit `{{projectName}}`, `{{projectSlug}}`, `{{dbName}}`, auth, admin, and deployment tokens, then writes local `.env` files and `.scaffold-credentials.txt`.

## CLI Utilities
- `create-vyllion-saas doctor` checks a generated project's local environment.
- `create-vyllion-saas add module <name>` creates a neutral API/web module scaffold.
- `create-vyllion-saas add starter <pack>` creates CRM, marketplace, project management, AI SaaS, booking, or helpdesk starter modules.
- `--bootstrap` runs install, Prisma push, and seed after scaffold.

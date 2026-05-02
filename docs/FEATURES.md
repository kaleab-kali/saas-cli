# FEATURES.md — What's in the box

Every scaffolded project ships with the following infra. All ready to run out of the box.

---

## Backend (NestJS 11)

### Auth — `apps/api/src/modules/auth/`
- Better Auth integration (email + password, sessions)
- Signup / login / logout
- Password reset, email verification scaffolding
- Cookie-based sessions
- User + Session + Account + Verification Prisma models

### Super Admin — `apps/api/src/modules/admin/`
- Separate Better Auth instance (different cookie, different DB tables)
- Super admin login at `/admin-login`
- Platform audit log
- Feature flag management (global + per-org overrides)
- Entitlement overrides per org
- Cron job run log
- Platform settings
- **Impersonation bridge** — super admin can impersonate any org user

### RBAC — `apps/api/src/modules/role/`
- `@RequirePermissions('resource:action')` decorator
- `PermissionsGuard`
- Custom roles per organization
- Default role seeding hook
- Permission registry

### API Keys — `apps/api/src/modules/api-key/`
- Generate / rotate / revoke per-user API keys
- Scoped permissions
- Last-used tracking

### Audit Log — `apps/api/src/modules/audit-log/`
- Global `AuditInterceptor` — logs every mutation
- Queryable by user, org, entity, action
- Diff storage

### Billing — `apps/api/src/modules/billing/`
- Stripe integration (keys empty until you fill them)
- Plans + FeatureEntitlement models
- Subscription lifecycle (active, past_due, cancelled, trial)
- Dunning emails (cron-driven)
- Invoice + Payment records
- `SubscriptionStateGuard` — blocks features based on plan state
- Usage snapshot (for metered billing)

### Notifications — `apps/api/src/modules/notification/`
- In-app notifications (Prisma `Notification`)
- Notification templates
- User preferences (per-channel: email, in-app, push)
- Bulk communication (email blasts)
- Digest service (daily/weekly)
- Email delivery tracking

### Reporting — `apps/api/src/modules/reporting/`
- Saved reports
- Scheduled reports (cron-driven)
- Report execution history
- Dashboard snapshots
- XLSX exporter

### Organization Settings — `apps/api/src/modules/organization-settings/`
- Per-org config key/value store
- Validated via DTOs

### Security Settings — `apps/api/src/modules/security-settings/`
- Password policy (length, complexity, rotation)
- Session timeout
- 2FA toggle scaffolding
- IP allowlist

### Health — `apps/api/src/modules/health/`
- `/health` endpoint
- DB + Redis + storage checks

### Error Reporting — `apps/api/src/modules/error-reporting/`
- Frontend error ingestion endpoint
- Stored for debugging

### Shared infra — `apps/api/src/shared/`
- **database** — Prisma module, tenant context (org scoping), prisma singleton
- **decorators** — `@RequirePermissions`, `@Public`, etc.
- **email** — nodemailer + JSON transport in dev, templated emails
- **events** — domain event bus for cross-module communication
- **filters** — `GlobalExceptionFilter` (uniform error shape)
- **guards** — `AuthGuard`, `PermissionsGuard`, `SubscriptionStateGuard`
- **interceptors** — `OrgContextInterceptor`, `AuditInterceptor`
- **logger** — Pino with correlation IDs
- **lookups** — per-org lookup catalog (types, sources, channels)
- **saved-views** — per-entity filter/sort presets
- **storage** — local + S3 adapter
- **types** — shared TS types

### Rate limiting
- `@nestjs/throttler` — 60 req/min per IP by default

### Swagger
- Auto-generated docs at `http://localhost:3000/api/docs`

---

## Frontend (React 19 + Vite)

### Features — `apps/web/src/features/`
- **auth** — login, signup, forgot password, create-org flow
- **admin** — super admin dashboard, impersonation UI, feature flag toggle, audit log viewer
- **billing** — plan selection, subscription management, invoice history, subscription gate
- **notifications** — bell icon, notification center, preferences
- **platform** — super-admin-only platform settings
- **reporting** — saved reports, dashboard snapshots
- **roles** — role management, permission matrix editor
- **settings** — user settings, org settings, security settings, API keys

### Routes — `apps/web/src/routes/` (TanStack Router)
- `/` — index
- `/login`, `/signup`, `/create-org`
- `/admin-login` — super admin login
- `/admin/*` — super admin panel
- `/_authenticated/*` — user-facing app (requires login)
- `/settings/*` — user + org settings

### UI
- shadcn/ui components in `@/components/ui/*`
- TanStack Table for data grids
- TanStack Query for data fetching
- i18n scaffolding (English + Amharic locales)
- Responsive layout (sidebar, mobile nav)

### Shared — `apps/web/src/shared/`
- API client
- Auth hooks
- Permission hooks (`usePermission`, `<RequirePermission>`)
- i18n config

---

## Database (Prisma + PostgreSQL 16)

### Infra models (kept)
- `User`, `Session`, `Account`, `Verification`
- `Organization`, `Member`, `Invitation`, `OrganizationRole`
- `AdminUser`, `AdminSession`, `AdminAccount`, `AdminVerification`
- `PlatformAuditLog`, `PlatformSettings`, `CronJobRun`
- `OrgEntitlementOverride`, `SystemEmailTemplate`, `FeatureFlag`, `FeatureFlagOverride`
- `CustomFieldDefinition`, `CustomFieldValue`
- `Lookup`, `SavedView`
- `Notification`, `NotificationPreference`, `NotificationTemplate`, `BulkCommunication`, `EmailDelivery`
- `OrganizationSettings`, `SecuritySettings`
- `ApiKey`, `AuditLog`
- `SavedReport`, `ReportSchedule`, `ReportExecution`, `DashboardSnapshot`
- `Plan`, `FeatureEntitlement`, `Subscription`, `DunningEmail`, `SubscriptionInvoice`, `SubscriptionPayment`, `UsageSnapshot`
- `CustomRole`, `CustomRoleAssignment`

### Domain models — none
Schema is **pure infra**. No Building/Contact/Lease/WorkOrder/Deal/Invoice — add your own per `docs/MODULE_GUIDE.md` inside the scaffolded project.

Domain-tied services (dashboard KPIs, notification audience, contact ownership, usage cap) are **stubbed** so the app boots. Replace stub bodies with real queries once your domain models exist. See [STRIPPING_DOMAIN.md](./STRIPPING_DOMAIN.md).

---

## DevOps

### Local
- `pnpm dev` — both servers with hot reload (Turborepo)
- `pnpm db:studio` — Prisma Studio
- `biome` — lint + format
- `lefthook` — git hooks (pre-commit lint)

### Deploy (Caddy + PM2)
- `ecosystem.config.cjs` — PM2 config for API
- `Caddyfile` — reverse proxy + static frontend + security headers
- No Docker required

### CI
- GitHub Actions workflows in `.github/workflows/`
  - `deploy.yml` — SSH + pm2 restart
  - `playwright.yml` — E2E tests

---

## What's NOT included (removed during scaffold)

The originating template is a property management SaaS. These domain-specific API + web modules are stripped:

**API modules removed:** `property`, `lease`, `maintenance`, `crm`, `finance`, `procurement`, `sales`

**Web features removed:** `properties`, `property`, `leases`, `maintenance`, `crm`, `finance`, `procurement`, `sales`

**Web routes removed:** matching route folders

**Not removed:** Prisma models tied to those modules (see STRIPPING_DOMAIN.md to trim).

---

## Next: build your domain

Use the MODULE_GUIDE.md inside each scaffolded project to add new modules:

```
apps/api/src/modules/your-module/
├── application/
│   ├── commands/
│   ├── queries/
│   └── services/
├── domain/
├── infrastructure/
├── api/
│   ├── dto/
│   └── your-module.controller.ts
└── your-module.module.ts
```

Wire into `AppModule.imports`. Add permissions. Write tests.

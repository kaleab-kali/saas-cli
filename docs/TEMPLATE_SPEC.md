# TEMPLATE_SPEC.md

The contract for what `create-vyllion-saas` ships. This file is the bar. Every leak is a bug.

> Locked: 2026-04-25. Domain-neutral, opinionated infrastructure SaaS skeleton. Drop your business on top.

---

## 1. Stack (locked)

| Layer | Choice |
|---|---|
| Backend | NestJS 11 (Clean Architecture) |
| Frontend | React 19 + Vite |
| DB | PostgreSQL 16 + Prisma |
| Cache/Queue | Redis + BullMQ |
| Auth | Better Auth (tenant) + Better Auth (admin, separate instance) |
| Billing | Stripe + Chapa (both, gateway-agnostic billing service) |
| Email | nodemailer (SMTP) |
| Storage | Local FS adapter + S3-compatible adapter (interface) |
| UI | shadcn/ui + Tailwind |
| Routing | TanStack Router (web), NestJS controllers (API) |
| Data | TanStack Query + TanStack Table |
| i18n | i18next (English seed only; structure ready for more) |
| Tooling | pnpm workspaces, Turborepo, Biome, Lefthook |
| Deploy | Caddy + PM2 (Docker option documented) |

---

## 2. Tenant model (locked)

- **Workspace concept:** Organization-only. No teams sub-grouping. (Better Auth `organization` plugin without `teams: true`.)
- **Membership:** User ↔ Member ↔ Organization. One user can belong to multiple orgs. Active org per session.
- **Slugs:** Org has unique slug used in URLs (optional in this skeleton; default routing is path-based, not subdomain — switch later if needed).
- **Multi-tenancy enforcement:** every business table MUST have `organizationId` + `@@index([organizationId])`. Global `OrgContextInterceptor` injects org from session. Repositories filter automatically.

---

## 3. RBAC — System Roles (locked)

Four built-in tenant roles, in descending power:

| Role | Description |
|---|---|
| `owner` | Full org control. Billing, member management, settings, all data. One-per-org typical. |
| `admin` | Manage members, settings, all data. Cannot manage billing or delete org. |
| `member` | Read+write data within scope. No settings, no member management. |
| `viewer` | Read-only across all data. |

### Custom roles
Custom roles supported via `CustomRole` model. Inherits from a system role + adds/removes specific `resource:action` permissions. Optional scope constraints (resource ownership, IP allowlist, time window).

### Permission shape
- Format: `resource:action` (e.g. `member:invite`, `billing:read`, `apiKey:create`).
- Decorator: `@RequirePermissions('apiKey:create')`.
- Guard: `PermissionsGuard` reads from session, resolves role(s), checks against required.
- Permission registry: `apps/api/src/modules/auth/permissions.ts` lists every permission. Source of truth.

### Skeleton permissions registry
- `member:invite`, `member:read`, `member:update`, `member:remove`
- `billing:read`, `billing:manage`
- `apiKey:create`, `apiKey:read`, `apiKey:revoke`
- `auditLog:read`, `auditLog:export`
- `customRole:create`, `customRole:read`, `customRole:update`, `customRole:delete`
- `notification:read`, `notification:manage`
- `report:read`, `report:create`, `report:update`, `report:delete`, `report:schedule`
- `setting:read`, `setting:update`
- `customField:create`, `customField:read`, `customField:update`, `customField:delete`
- `lookup:create`, `lookup:read`, `lookup:update`, `lookup:delete`

User adds domain-specific permissions when adding modules.

---

## 4. Super Admin (Platform) — Hierarchy (locked)

**Separate Better Auth instance** with own DB tables (`admin_user`, `admin_session`, `admin_account`, `admin_verification`). Cookies isolated. Login at `/admin-login`. Cannot tenant-login with admin creds.

### Platform role hierarchy

| Platform Role | Description |
|---|---|
| `superAdmin` | Full platform control. Can promote others. Impersonate any tenant. Billing + entitlement overrides. |
| `support` | Read tenant data, impersonate (read-only mode), respond to support requests. Cannot grant entitlements. |
| `billingAdmin` | Manage plans, entitlement overrides, view subscriptions/invoices across all orgs. Cannot impersonate. |
| `readOnly` | View-only platform dashboard. For execs / observers. |

`AdminUser.role` String. Permissions enforced via `AdminPermissionsGuard`.

### Super admin features (all in `/admin/*`)
1. **Dashboard** — orgs total, users total, MRR, ARR, new orgs (7d), active sessions (24h), failed payments (24h), top orgs by member count
2. **Organizations** — list, search, detail (members, subscription, audit log, usage), suspend/unsuspend, soft-delete
3. **Users** — list across all orgs, search, detail, force-logout, ban, unban
4. **Billing** — plans (CRUD), subscriptions list, invoice list, manual override (mark paid, comp credit, change plan)
5. **Entitlement overrides** — per-org override of any feature flag/limit
6. **Feature flags** — global toggle, per-org override
7. **Impersonation** — log in as any tenant user; banner shown; auto-logout after 15min; full audit
8. **Audit log** — platform-level (admin actions) + tenant audit log viewer
9. **Cron job monitor** — list scheduled jobs + run history (status, duration, error)
10. **Email templates** — system-level (dunning, invoices, welcome) editable
11. **Platform settings** — KV store for global config
12. **Broadcasts** — send announcement banner to all orgs (or filtered)

---

## 5. Billing (locked) — Stripe + Chapa, gateway-agnostic

### Design principle
Billing service is **gateway-agnostic**. Concrete gateways (Stripe, Chapa) implement a common `IPaymentGateway` interface. Org subscription stores `gateway: 'stripe' | 'chapa' | 'manual'`. Adding new gateway = drop new adapter into `infrastructure/gateways/`.

### Models
- `Plan` — slug, nameEn, nameAm, `priceMonthlyMinor` (int, smallest currency unit), `priceAnnualMinor`, `currency` (`USD` or `ETB`), `userCap` (null=unlimited), `supportSlaHours`, gateway price IDs (`stripePriceIdMonthly`, `stripePriceIdAnnual`), `chapaSupported` (bool flag), sort, active.
- `FeatureEntitlement` — per-plan: `featureKey`, `enabled`, `limit?` (null=unlimited).
- `Subscription` — orgId (unique), planId, status (`trialing|active|past_due|grace|read_only|locked|canceled`), `billingInterval`, `currency`, `gateway` (`stripe|chapa|manual`), gateway-specific refs (`stripeCustomerId`, `stripeSubscriptionId`, `chapaCustomerEmail`, last `chapaTxRef`), period dates, dunning state.
- `SubscriptionInvoice` — number, status, dates, `subtotalMinor`, `taxMinor`, `totalMinor`, `amountPaidMinor`, gateway refs (`stripeInvoiceId`, `chapaTxRef`), `checkoutUrl`, `pdfUrl`.
- `SubscriptionPayment` — invoice ref, `amountMinor`, `method` (`stripe_card|stripe_ach|chapa_telebirr|chapa_cbe|chapa_card|manual_bank|manual_other`), gateway refs (`stripePaymentIntentId`, `chapaRefId`, `chapaTxRef`), `bankReference?`, `verified`, `verifiedByUserId?`, recordedBy.
- `DunningEmail` — log of every dunning email sent.
- `UsageSnapshot` — nightly snapshot per subscription (`userCount`, `apiCallCount`, `emailCount`, custom metrics array).
- `OrgEntitlementOverride` — super-admin grant per org.

### What's REMOVED from propflow source
- `priceCampaignDailyEtb`, building/unit caps on Plan, `creditBalanceEtb`, `manualPaymentMode` flag, `campaignActiveUntil`, `CampaignActivation` model.
- ETB-specific dunning copy (replaced by parameterized templates).
- VAT-Ethiopia-specific hardcoded invoice service. Replaced w/ generic `taxMinor` + per-org tax rate setting.

### Stripe integration scope
- Subscription create/update/cancel via Stripe Customer Portal (recommended) or direct API
- Webhook endpoint: `POST /api/billing/stripe/webhook` (raw body, `Stripe-Signature` header) → handles `customer.subscription.*`, `invoice.*`, `payment_intent.*`
- Recurring: native (Stripe handles renewals)

### Chapa integration scope (one-shot model)
Chapa has **no native subscription/recurring API** (per https://developer.chapa.co/docs as of 2026-04). We layer recurring on top.

**Endpoints used:**
- `POST https://api.chapa.co/v1/transaction/initialize` — create checkout session
  - Body required: `amount`, `currency` (`ETB`|`USD`), `email`, `tx_ref` (unique), `phone_number` (10 digits)
  - Body optional: `first_name`, `last_name`, `callback_url`, `return_url`, `customization[title|description]`, `meta[*]`
  - Response: `data.checkout_url`
- `GET https://api.chapa.co/v1/transaction/verify/<tx_ref>` — verify status
  - Auth: `Authorization: Bearer <CHAPA_SECRET_KEY>`
  - Returns transaction status (`success|pending|failed`) + ref_id
- Webhook: `POST /api/billing/chapa/webhook`
  - Header: `chapa-signature` and/or `x-chapa-signature` — HMAC-SHA256 of raw payload using webhook secret
  - Verify either header (per Chapa docs both may be sent)
  - Events: `charge.success`, `charge.refunded`, `charge.reversed`, `charge.failed`/`charge.cancelled`, `payout.success`, `payout.failed`/`payout.cancelled`
  - **Always re-verify via verify endpoint** before crediting (Chapa's own recommendation)
  - Always 200 OK to webhook (idempotent processing); Chapa retries up to 72h

**Recurring on Chapa (custom):**
1. Renewal cron runs daily at 04:00 UTC.
2. For each `Subscription` with `gateway=chapa` and `currentPeriodEnd <= now + 7 days` and no pending invoice:
   - Create `SubscriptionInvoice` (status=`draft`).
   - Generate `tx_ref = `vyllion-{subId}-{periodEnd}-{rand}` (idempotent).
   - Call Chapa initialize → get `checkout_url`.
   - Send email to billing contact with checkout link (T-7, T-3, T-0 reminders).
3. Customer clicks link → pays → Chapa webhook fires `charge.success`.
4. We re-verify → mark invoice paid → bump `currentPeriodEnd`.
5. If T+0 not paid, lifecycle cron moves status `past_due → grace → read_only → locked`.

**No card storage on Chapa side**: every renewal requires explicit customer action. This is by design.

### Manual gateway
- Org admin selects "Manual bank transfer" at signup.
- Invoice generated. Org pays offline. Super admin verifies via `/admin/billing/$subscriptionId` → "Mark Verified" button.

### Lifecycle states (cron-driven, gateway-agnostic)
`trialing → active → past_due (day 0) → grace (day +3) → read_only (day +7) → locked (day +14) → canceled (day +30)`

### Env vars added
```
# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PUBLISHABLE_KEY=

# Chapa
CHAPA_SECRET_KEY=
CHAPA_PUBLIC_KEY=
CHAPA_WEBHOOK_SECRET=
CHAPA_CALLBACK_BASE_URL=  # e.g. https://app.example.com  (used to build callback_url + return_url)
```

---

## 6. Frontend feature surface (locked)

### Tenant routes (logged-in)
- `/` → dashboard
- `/dashboard` → generic welcome + KPIs (org name, member count, plan name, usage progress)
- `/settings` → index
  - `/settings/organization` — name, logo, profile fields
  - `/settings/members` — list, invite, role change, remove
  - `/settings/roles` — system roles + custom role builder
  - `/settings/billing` — current plan, usage, change plan, invoices, payment method (Stripe portal link OR Chapa renewal link OR manual bank info), gateway switcher
  - `/settings/api-keys` — list, create, revoke
  - `/settings/security` — password policy, session timeout, 2FA enforce, IP allowlist
  - `/settings/audit-log` — read-only viewer
  - `/settings/lookups` — generic per-org enum catalog (CRUD)
  - `/settings/custom-fields` — generic per-entity custom field defs
- `/notifications` → bell inbox
  - `/notifications/preferences` — per-event channel prefs
  - `/notifications/templates` — per-org templates
  - `/notifications/deliveries` — email delivery log
- `/reports`
  - `/reports/saved` — list saved reports
  - `/reports/new` — query builder
  - `/reports/$reportId` — view + run
  - `/reports/schedules` — scheduled exports

### Auth routes
- `/login`, `/signup`, `/create-org`, `/forgot-password`, `/reset-password`, `/verify-email`

### Super admin routes (`/admin/*`)
- `/admin-login`
- `/admin` → dashboard
- `/admin/organizations` + `/admin/organizations/$orgId`
- `/admin/users` + `/admin/users/$userId`
- `/admin/billing/plans` + `/admin/billing/subscriptions` + `/admin/billing/$subscriptionId`
- `/admin/feature-flags`
- `/admin/audit-log`
- `/admin/jobs` (cron monitor)
- `/admin/email-templates`
- `/admin/settings`
- `/admin/broadcasts`

### What's REMOVED
- All `properties|leases|maintenance|crm|finance|procurement|sales|estates|units` route trees
- `dashboard.property|crm|financial|maintenance` (generic main dashboard only)
- `settings/amenities`, `settings/team-hierarchy` (domain-specific)
- `UsageWidget` showing buildings/units (replaced w/ generic entitlement-driven progress bars)

---

## 7. UI shell (locked)

### Sidebar nav (tenant)
```
Workspace
├── Dashboard            /dashboard
├── Reports              /reports
│   ├── Saved Reports
│   ├── New Report
│   └── Schedules
└── Notifications        /notifications
    ├── Inbox
    ├── Preferences
    ├── Templates
    └── Deliveries

Settings (footer)         /settings
```

### Sidebar nav (admin)
```
Platform
├── Dashboard            /admin
├── Organizations        /admin/organizations
├── Users                /admin/users
├── Billing              /admin/billing/plans
│   ├── Plans
│   ├── Subscriptions
│   └── Failed Payments
├── Feature Flags        /admin/feature-flags
├── Audit Log            /admin/audit-log
├── Cron Jobs            /admin/jobs
├── Email Templates      /admin/email-templates
├── Broadcasts           /admin/broadcasts
└── Settings             /admin/settings
```

---

## 8. Schema (Prisma — locked)

### Auth + Tenant
- `User`, `Session`, `Account`, `Verification` (Better Auth tenant)
- `Organization`, `Member`, `Invitation`, `OrganizationRole`

### Platform
- `AdminUser`, `AdminSession`, `AdminAccount`, `AdminVerification` (Better Auth admin)
- `PlatformAuditLog`, `PlatformSettings`, `CronJobRun`, `OrgEntitlementOverride`, `SystemEmailTemplate`, `FeatureFlag`, `FeatureFlagOverride`, `Broadcast`

### Generic infra
- `Lookup`, `SavedView`, `CustomFieldDefinition`, `CustomFieldValue`
- `ApiKey`, `AuditLog`
- `Notification`, `NotificationPreference`, `NotificationTemplate`, `BulkCommunication`, `EmailDelivery`
- `SavedReport`, `ReportSchedule`, `ReportExecution`
- `OrganizationSettings`, `SecuritySettings`

### Billing (Stripe + Chapa + Manual; gateway-agnostic schema)
- `Plan`, `FeatureEntitlement`, `Subscription` (with `gateway` enum), `SubscriptionInvoice`, `SubscriptionPayment`, `DunningEmail`, `UsageSnapshot`

### RBAC extension
- `CustomRole`, `CustomRoleAssignment`

### Removed entirely
- `Estate, Building, Floor, Unit, UnitStatusHistory, BuildingMedia, UnitMedia, Amenity, BuildingAmenity, UnitAmenity, UnitMeter`
- `Contact*, Tag, ContactTag, Segment, SegmentMember, Activity, EmailTemplate, AutomationRule, AutomationExecutionLog`
- `Lease*, RentEscalation, SecurityDepositSettlement, CamCharge, LeaseAbstraction, LeaseChecklistItem`
- `Invoice, InvoiceLineItem, Payment, PaymentAllocation` (kept billing-specific only)
- `WorkOrder*, SlaPolicy, Asset, PreventiveSchedule, Inspection, InspectionItem`
- `VendorProfile, VendorRating, PurchaseRequest*, ApprovalRule, Approval, PurchaseOrder*, Budget`
- `Listing, ListingPriceHistory, LeadProfile, PipelineStage, Deal, DealOwnershipHistory, SupervisorAssignment, Offer, AgentProfile, Commission, Viewing`
- `ChartAccount, JournalEntry, JournalLine, OwnerStatement`
- `CampaignActivation`
- `DashboardSnapshot` (generic dashboard pulls live; no snapshot)

---

## 9. Seeds (locked)

- 1 super admin user (from env)
- 1 sample organization "Acme Inc" + 1 tenant owner (from env)
- 4 system roles registered in `OrganizationRole` for sample org
- 3 plans: Free, Pro, Enterprise (USD, generic entitlements)
- ~10 generic feature entitlements per plan (`apiKey.unlimited`, `customRoles.enabled`, `auditLog.export`, etc.)
- 5 default feature flags (`notifications`, `reports`, `customRoles`, `apiKeys`, `auditLogExport`)
- 3 system email templates (welcome, dunning-reminder, dunning-locked)
- No domain-specific lookups, custom fields, or sample data

---

## 10. i18n (locked)

- `i18next` configured. Default `en`. `am` (Amharic) kept (relevant for Chapa/Ethiopia market).
- Translation files: `apps/web/src/shared/i18n/locales/{en,am}.ts`.
- Both files keep only generic keys (auth, sidebar, settings, billing, admin, common, plan-names). Property/lease/CRM/etc. keys deleted from both.
- Plans seeded with both `nameEn` + `nameAm`.
- System email templates seeded with both `subject`/`bodyHtml` + `subjectAm`/`bodyHtmlAm`.
- Doc: `docs/I18N.md` — how to add a new locale.

---

## 11. DevX (locked)

- `pnpm dev` — both apps with hot reload
- `pnpm db:generate|migrate|push|seed|studio`
- `pnpm gen module <name>` — Plop generator scaffolding NestJS module + web feature folder + permission registry entry. (Phase 6.)
- `pnpm typecheck` — both apps
- `pnpm lint`, `pnpm lint:fix`
- Pre-commit hook: lint changed files, typecheck.

---

## 12. NOT included (out of scope; documented to add)

- OAuth providers (Google/GitHub) — Better Auth supports; documented in `docs/OAUTH.md`
- 2FA TOTP — Better Auth supports; documented
- Webhooks system (outbound)
- File storage UI (interface ready, no UI)
- Advanced reporting widgets (charts, drag-drop builder)
- Workspace teams (Better Auth sub-grouping)
- Subdomain routing
- Sentry/DataDog wiring (interface ready via ErrorReportingModule)
- Realtime (websockets/SSE) — interface ready, no impl
- Bulk import CSV
- Email template visual editor (admin can edit HTML/text only)

---

## 13. Acceptance criteria (Phase 4 must pass)

1. `pnpm install` clean (no peer warnings)
2. `pnpm typecheck` 0 errors API + Web
3. `pnpm --filter web exec vite build` clean
4. `prisma migrate dev --name init` from empty DB → success
5. `pnpm db:seed` → super admin + sample org + tenant owner created
6. `pnpm dev` boots; no console errors on first load
7. **Smoke flow A (tenant)**: signup → create org → invite (mocked email) → settings/api-keys → settings/billing → settings/audit-log all load without error
8. **Smoke flow B (admin)**: admin login → dashboard shows MRR/orgs/users → click org → impersonate → return → audit log shows impersonate event
9. No string `propflow|PropFlow|building|lease|crm|estate|workorder|deal|listing|amenity|tenant-renter` in any user-facing text or env defaults. (`Etb`, `chapa` allowed only in Chapa gateway code paths and field names.)
10. Sidebar shows only `Dashboard|Reports|Notifications|Settings`. No domain links.

---

## 14. Out-of-template starter projects (future)

After template is solid, optional sample apps demonstrating a real domain on top:
- `examples/property-manager` — propflow's domain reborn as add-on
- `examples/helpdesk` — tickets, knowledge base
- `examples/crm-lite` — contacts + deals

Not part of this template build. Separate repos.

---

## 15. Build order (matches Phase plan)

1. Phase 1 — Schema + Better Auth permissions registry
2. Phase 2 — Backend modules (billing rewrite, admin rewrite, auth permissions, reporting strip, notifications strip)
3. Phase 3 — Frontend shell + settings pages + admin pages
4. Phase 4 — Acceptance test
5. Phase 5 — Docs

End spec.

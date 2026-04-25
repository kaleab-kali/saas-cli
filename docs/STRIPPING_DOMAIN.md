# STRIPPING_DOMAIN.md

## TL;DR — already done

The template is now a **pure skeleton**. Domain models (Building, Lease, Contact, WorkOrder, Deal, Listing, Invoice, etc.) are gone from `schema.prisma`. Domain-tied services (dashboard, audience resolver, contact ownership, usage tracker) are stubbed and compile clean.

You should not need to strip anything. Run scaffold, migrate, seed, dev → working app.

---

## What's still bundled

### Infra Prisma models (kept)
- Auth: User, Session, Account, Verification
- Org: Organization, Member, Invitation, OrganizationRole
- Admin: AdminUser, AdminSession, AdminAccount, AdminVerification
- Platform: PlatformAuditLog, PlatformSettings, CronJobRun, OrgEntitlementOverride, SystemEmailTemplate, FeatureFlag, FeatureFlagOverride
- Generic: CustomFieldDefinition, CustomFieldValue, Lookup, SavedView
- Notifications: Notification, NotificationPreference, NotificationTemplate, BulkCommunication, EmailDelivery
- Reporting: SavedReport, ReportSchedule, ReportExecution, DashboardSnapshot
- Settings: OrganizationSettings, SecuritySettings
- API + Audit: ApiKey, AuditLog
- Billing: Plan, FeatureEntitlement, Subscription, DunningEmail, SubscriptionInvoice, SubscriptionPayment, UsageSnapshot, CampaignActivation
- RBAC: CustomRole, CustomRoleAssignment

### Stubbed services (will compile, return empty/zero)
- `apps/api/src/modules/reporting/application/services/dashboard.service.ts` — `main`, `property`, `financial`, `crm`, `maintenance` return empty KPIs.
- `apps/api/src/modules/notification/domain/services/audience-resolver.service.ts` — returns `[]` for any audience type.
- `apps/api/src/modules/role/application/services/contact-ownership.service.ts` — returns no-op filter / no-op assert.
- `apps/api/src/modules/billing/application/services/usage-tracker.service.ts` — `buildingCount` and `unitCount` hardcoded `0` (only `userCount` is live via Member table).
- `apps/api/src/modules/billing/application/services/billing-lifecycle.cron.ts` — same usage placeholders in nightly snapshot.

These stubs let the app boot. **Replace them with real logic once your domain models exist.**

---

## Adding your own domain

Workflow:
1. Add Prisma models to `apps/api/prisma/schema.prisma` (multi-tenant: `organizationId` + `@@index([organizationId])`).
2. Run `pnpm db:push` (dev) or `prisma migrate dev --name <feature>`.
3. Scaffold module: `apps/api/src/modules/<feature>/{api,application,domain,infrastructure}` per `docs/MODULE_GUIDE.md`.
4. Wire into `AppModule.imports`.
5. Add permissions + RBAC entries.
6. Replace the stub method bodies above with your real queries (e.g. `dashboard.main` should query your domain models for KPIs).
7. Add web feature folder + route.

---

## Renaming the ETB billing fields

Plan / Subscription / Invoice models still use `ETB` (Ethiopian Birr) field names — `priceMonthlyEtb`, `creditBalanceEtb`, etc. Rename to your currency (or to generic `priceMonthlyMinor`) when convenient. Touches:
- `schema.prisma` field names
- `prisma/seed-plans.ts`
- `apps/api/src/modules/billing/**` references

Or keep — `ETB` is just a string label, no behavioral impact.

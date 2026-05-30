# SaaS Template — Complete Improvement Plan

This is the consolidated, definitive plan for upgrading your `create-vyllion-saas` template. It combines the original improvement plan with all corrections, additions, and stricter conventions into one document.

Read this end-to-end. Nothing in earlier versions has been dropped — everything has been integrated.

EIMS specifics live in their own documents (`02-eims-sdk-spec.md` and `03-eims-starter-pack-spec.md`). This document covers the **base template** that all your SaaS products share.

---

## Table of Contents

1. Guiding principles
2. Strip EIMS from the base template
3. TanStack as a constitutional rule
4. The DataTable — definitive specification
5. TanStack Query — definitive specification
6. Base scaffold features that are missing
7. UI architecture improvements
8. Forms standardization
9. Money handling
10. Date and time handling
11. Cross-module communication
12. CLI improvements
13. Deployment improvements
14. Security hardening
15. Search and command palette
16. Testing standards (with mutation testing)
17. Notifications integration
18. Audit logging
19. Background jobs
20. Error handling
21. Realtime updates
22. Documentation improvements
23. Recommended execution order
24. Final priority sort for the next month
25. What this document does NOT cover

---

## 1. Guiding principles before any change

Before touching code, internalize these so every decision aligns:

1. **The base template is domain-neutral.** No restaurant, no hotel, no retail, no EIMS. Verticals are starter packs.
2. **One template, many products.** The same scaffold powers restaurant, hotel, retail, and any future vertical.
3. **Every feature must be tenant-aware.** If a feature can't be scoped by `organizationId`, it doesn't belong in the base template.
4. **Optional features are starter packs.** If 70%+ of new SaaS projects don't need it, it's a starter pack, not base.
5. **The CLI is the source of truth.** No manual file edits should be needed for the common path. If a step is documented as "now manually edit X," it should be automated.
6. **Styling stays as-is.** The template already has solid Tailwind + shadcn styling. Don't redesign — only add missing functionality.

---

## 2. Strip EIMS from the base template

Your own doc flagged this: EIMS files are bleeding into the default template. Fix this first.

### 2.1 Files to remove from `template/`

```
template/apps/api/src/modules/eims/                    -> delete entirely
template/apps/web/src/features/eims/                   -> delete entirely
template/apps/web/src/routes/_authenticated/eims/      -> delete entirely
template/apps/web/src/routes/admin/eims/               -> delete entirely
```

### 2.2 Prisma models to remove from `template/apps/api/prisma/schema.prisma`

```
EimsEnterprise
EimsEstablishment
EimsSourceSystem
EimsCredential
EimsCertificate
EimsSourceSystemCounter
EimsCounterReservation
TenantBuyer
TaxInvoice
TaxInvoiceLine
EimsSubmission
EimsReceipt
EimsCancellation
EimsAuditEvent
EimsNotificationLog
```

Keep the generic `invoicing` module if it covers non-EIMS invoicing primitives — but if it was only there to support EIMS, move it too.

### 2.3 Where these files go

Create the EIMS starter pack folder:

```
packages/cli/starters/eims/
|-- api/                        # mirrors apps/api/src/modules/eims/
|-- web/                        # mirrors apps/web/src/features/eims/ + routes
|-- prisma/
|   `-- models.prisma.snippet   # the EIMS Prisma models, appended on install
|-- permissions.snippet.ts      # EIMS permission statements
|-- seed.snippet.ts             # EIMS seed data
|-- nav.snippet.ts              # sidebar entries
|-- i18n/
|   |-- en.snippet.ts
|   `-- am.snippet.ts
|-- env.snippet                 # EIMS_API_URL, EIMS_SANDBOX_URL, etc.
|-- install.js                  # the starter installer script
`-- README.md                   # what this pack does
```

The installer script is what `pnpm gen:starter eims` runs. It:
1. Appends Prisma models to `apps/api/prisma/schema.prisma`
2. Copies API module files
3. Copies web feature + routes
4. Patches the AppModule import list
5. Patches permission statements
6. Patches the sidebar navigation
7. Patches i18n locale files
8. Appends EIMS env vars to `.env.example`
9. Adds `@yourcompany/eims-sdk` to `apps/api/package.json`
10. Runs `pnpm install` and `pnpm db:generate`

Full details for the EIMS pack are in document 03.

### 2.4 Verification

After this change, `create-vyllion-saas test-project` should produce a clean SaaS with no EIMS code. Run `pnpm doctor` and `pnpm test:smoke` to confirm.

---

## 3. TanStack as a constitutional rule

The template should mandate TanStack libraries for **every** feature. This is non-negotiable.

| Concern | Library | Mandatory |
|---|---|---|
| Server state | TanStack Query | Yes — no `useEffect + fetch`, no Axios calls outside hooks |
| Tables and lists | TanStack Table | Yes — no raw `<table>`, no Material/Ant tables |
| Large lists | TanStack Virtual | Yes when row count exceeds 100 |
| Routing | TanStack Router | Yes — already in template |
| Forms | TanStack Form | Recommended (see section 8) |

Lint rules in `apps/web/biome.json` to forbid:
- `import axios` outside of `apps/web/src/shared/lib/api-client.ts`
- `useEffect` with `fetch` inside
- Raw `<table>` elements outside `apps/web/src/shared/components/DataTable/**`

These are enforceable. They prevent drift over time.

---

## 4. The DataTable — definitive specification

Every list page in the template and every starter pack uses the shared DataTable component with **all** the following features built in.

### 4.1 Required features (always on)

- **Server-side pagination** with `meta.total`, `meta.page`, `meta.limit`, `meta.totalPages` from your existing API shape
- **`<<  <  >  >>` pagination controls** (first / previous / next / last)
- **Page X of Y** indicator
- **Rows per page selector** (10, 20, 50, 100)
- **Total count displayed** ("Showing 1–20 of 1,247")
- **Column sorting** (click header, ascending → descending → none)
- **Sort indicator** in header (arrow up / down / both)
- **Per-column filter row** below header with type-appropriate inputs
- **Global search box** at top toolbar with 300ms debounce
- **Reset filters button** when any filter is active
- **Loading skeleton rows** while fetching
- **Empty state** with primary call-to-action
- **Error state** with retry button

### 4.2 Opt-in features

- **Virtualization** via TanStack Virtual when `pageSize >= 100` or `virtualizeRows={true}`
- **Bulk actions** menu when rows are selectable and at least one is selected
- **Export** to CSV/XLSX via reporting module
- **Column visibility toggle**
- **Saved views** integration (uses existing `SavedView` model)
- **Row click to detail page**
- **Sticky first column** for wide tables
- **Sticky header** on scroll

### 4.3 Filter types supported per column

Configured via `columnDef.meta.filter`:

```typescript
type FilterConfig =
  | { type: 'text' }
  | { type: 'select'; options: Array<{ value: string; label: string }> }
  | { type: 'multi-select'; options: Array<{ value: string; label: string }> }
  | { type: 'date-range' }
  | { type: 'number-range' }
  | { type: 'boolean' }
  | { type: 'custom'; component: React.ComponentType<FilterProps> };
```

### 4.4 Folder structure

```
apps/web/src/shared/components/DataTable/
|-- DataTable.tsx                       # main component
|-- DataTableToolbar.tsx                # top bar with search, filters, actions
|-- DataTablePagination.tsx             # bottom bar
|-- DataTableHeaderCell.tsx             # sortable header
|-- DataTableColumnFilter.tsx           # per-column filter
|-- DataTableActiveFilters.tsx          # chips for active filters
|-- DataTableBulkActionsMenu.tsx
|-- DataTableColumnVisibility.tsx
|-- DataTableExportMenu.tsx
|-- DataTableSavedViews.tsx
|-- DataTableLoadingRows.tsx
|-- filters/
|   |-- TextFilter.tsx
|   |-- SelectFilter.tsx
|   |-- DateRangeFilter.tsx
|   |-- NumberRangeFilter.tsx
|   `-- BooleanFilter.tsx
|-- hooks/
|   |-- use-data-table-state.ts         # syncs state with URL search params
|   `-- use-debounced-value.ts
|-- types.ts
`-- DataTable.test.tsx
```

### 4.5 URL state synchronization

Pagination, sorting, filters, and search **must reflect in the URL** so that:
- Bookmarks work
- Browser back/forward works
- Sharing a filtered view works
- Refresh preserves state

Use TanStack Router's `useSearch` to read/write search params. Encode as:

```
?page=2&limit=50&sort=submittedAt:desc&filter.status=FAILED&search=ABC123
```

The `useDataTableState()` hook handles this round-trip.

### 4.6 Standardized hook for tables

Every table page uses this hook pattern:

```typescript
const tableState = useDataTableState({
  defaultSort: [{ id: 'createdAt', desc: true }],
  defaultPageSize: 20,
});

const { data, isLoading, error } = useEimsSubmissions(tableState.queryParams);

return (
  <DataTable
    columns={columns}
    data={data?.data ?? []}
    totalCount={data?.meta?.total ?? 0}
    {...tableState.tableProps}
    isLoading={isLoading}
    virtualizeRows={tableState.pageSize >= 100}
  />
);
```

Devs don't write pagination state management. They use the hook.

---

## 5. TanStack Query — definitive specification

### 5.1 Query key factory pattern (mandatory)

Every feature exports a query key factory. No hardcoded keys, ever.

```typescript
// apps/web/src/features/<feature>/api/<resource>.hooks.ts

const resourceKeys = {
  all: ['<feature>', '<resource>'] as const,
  lists: () => [...resourceKeys.all, 'list'] as const,
  list: (params: ListParams) => [...resourceKeys.lists(), params] as const,
  details: () => [...resourceKeys.all, 'detail'] as const,
  detail: (id: string) => [...resourceKeys.details(), id] as const,
};
```

Use these for `queryKey` and `invalidateQueries`. Predictable, refactor-safe, type-safe.

### 5.2 Default QueryClient config

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      retry: (failureCount, error) => {
        const status = (error as any)?.response?.status;
        if (status === 404 || status === 401 || status === 403) return false;
        return failureCount < 3;
      },
      refetchOnWindowFocus: false,
      throwOnError: false,
    },
    mutations: {
      retry: false,
    },
  },
});
```

### 5.3 Standard hook shape

```typescript
// List hook
export function useResources(params: ListParams) {
  return useQuery({
    queryKey: keys.list(params),
    queryFn: () => apiClient.get('/resources', { params }),
    placeholderData: keepPreviousData,
  });
}

// Detail hook
export function useResource(id: string) {
  return useQuery({
    queryKey: keys.detail(id),
    queryFn: () => apiClient.get(`/resources/${id}`),
    enabled: !!id,
  });
}

// Mutation hook
export function useCreateResource() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateResourceDto) => apiClient.post('/resources', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.lists() });
    },
  });
}
```

Every starter pack follows this. Code review rejects any deviation.

### 5.4 Optimistic updates pattern

For UX-critical mutations (status toggles, reorder, quick edit), use optimistic updates:

```typescript
useMutation({
  mutationFn: ...,
  onMutate: async (newValue) => {
    await queryClient.cancelQueries({ queryKey: keys.detail(id) });
    const previous = queryClient.getQueryData(keys.detail(id));
    queryClient.setQueryData(keys.detail(id), (old) => ({ ...old, ...newValue }));
    return { previous };
  },
  onError: (err, _, context) => {
    queryClient.setQueryData(keys.detail(id), context?.previous);
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: keys.detail(id) });
  },
});
```

Document this pattern. Don't require it everywhere.

### 5.5 Suspense mode

Enable Suspense for route loaders that should block render until data arrives:

```typescript
export const Route = createFileRoute('/_authenticated/eims/submissions/$id')({
  loader: ({ params }) => queryClient.ensureQueryData({
    queryKey: keys.detail(params.id),
    queryFn: () => apiClient.get(`/submissions/${params.id}`),
  }),
  component: SubmissionDetail,
});
```

Inside the component, `useSuspenseQuery` returns guaranteed data. No loading state needed at component level.

---

## 6. Base scaffold features that are missing

These are features the current template lacks but every SaaS needs. Each one is a small project on its own.

### 6.1 Onboarding wizard and concierge onboarding system

The template needs TWO onboarding pieces:

**Part A — Simple post-signup wizard** (for self-service tenants):

```
apps/web/src/routes/_authenticated/onboarding/
|-- index.tsx              # router for the wizard steps
|-- step-organization.tsx  # company info, country, currency, timezone
|-- step-branding.tsx      # logo upload, accent color, app name
|-- step-team.tsx          # invite first members (skip option)
|-- step-billing.tsx       # pick plan or start trial
`-- step-complete.tsx      # success, link to dashboard
```

**Part B — Full concierge onboarding system** (for staff-assisted onboarding):

In the Ethiopian SMB market, ~95% of tenants need your staff to walk them through MoR portal registration, INSA cert request, credentials capture, and first invoice testing. They will not do this themselves.

This requires a full operational module: `apps/api/src/modules/onboarding/` with:
- `OnboardingTask`, `OnboardingTaskStep`, `OnboardingActivity`, `OnboardingTaskTemplate` Prisma models
- Admin UI at `/admin/onboarding` for staff to manage tenant workflows
- Per-tenant detail page at `/admin/onboarding/{taskId}` showing 15-step timeline
- Reminder crons for stale tasks and INSA follow-ups
- Self-service mode UI for tech-savvy tenants

Three modes supported per tenant: CONCIERGE (default), SELF_SERVICE, HYBRID.

Starter packs register task templates that the module executes. The EIMS starter pack contributes a 15-step EIMS-restaurant template (MoR signup, cert request, etc.). Vertical packs add their own steps.

**Full specification is in document 04 (Concierge Onboarding System).**

This is a high-leverage addition because every vertical needs it, and the Ethiopian market specifically requires staff-assisted onboarding as the primary flow.

### 6.2 First-class organization profile

`OrganizationSettings` exists but is bare. Standardize the fields every SaaS needs:

```prisma
model OrganizationSettings {
  id                String  @id @default(cuid())
  organizationId    String  @unique
  organization      Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  legalName         String?
  tradeName         String?
  taxId             String?
  vatNumber         String?
  registrationNumber String?

  country           String?   @db.Char(2)
  region            String?
  city              String?
  subCity           String?
  woreda            String?
  kebele            String?
  houseNumber       String?

  phone             String?
  email             String?
  website           String?

  currencyCode      String?   @db.Char(3)
  timezone          String?
  locale            String?
  fiscalYearStart   String?

  logoFileId        String?
  faviconFileId     String?
  accentColor       String?

  onboardingCompletedAt DateTime?
  onboardingStep    String?

  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
}
```

Why each field: tax modules need TIN/VAT, multi-currency apps need currency, branding lets tenants white-label the in-app UI without DNS changes, locale drives i18n per tenant.

### 6.3 White-label branding (in-app, not URL)

Since you're skipping subdomains, do per-tenant white-labeling through theming:

- Tenant uploads logo → `FileAsset` → URL stored in `OrganizationSettings.logoFileId`
- Tenant picks accent color → stored as hex in `OrganizationSettings.accentColor`
- Frontend `__root.tsx` reads org settings on mount, applies CSS variables:

```tsx
useEffect(() => {
  if (org?.accentColor) {
    document.documentElement.style.setProperty('--brand', org.accentColor);
  }
}, [org]);
```

- Email templates (notifications) use the tenant logo URL in their headers

This is what tenants actually want when they ask for "their own URL" — they want their **brand visible**, not strictly their own domain.

### 6.4 Currency and locale per tenant

Add helpers shared across all modules:

```
apps/api/src/shared/i18n/
|-- currency.service.ts      # format(amount, orgId) returns localized string
|-- locale-resolver.ts       # resolves tenant locale from session
`-- timezone.util.ts         # convert UTC <-> tenant local time
```

Without this, every module reinvents money formatting and timezone handling. Money stays in minor units (you already do this), but display logic is centralized. See sections 9 and 10 for full money and date specs.

### 6.5 Address as a value object

Every vertical has addresses (buyer, seller, supplier, customer). Standardize once:

```typescript
// apps/api/src/shared/types/address.ts
export interface Address {
  country?: string;     // ISO 3166-1 alpha-2
  region?: string;
  city?: string;
  subCity?: string;
  woreda?: string;
  kebele?: string;
  houseNumber?: string;
  postalCode?: string;
  locality?: string;
}
```

Use this everywhere. EIMS needs it, hotels need it for guests, retail needs it for delivery. One shape, everywhere.

### 6.6 Phone number normalization

Same problem. Add `apps/api/src/shared/lib/phone.ts` using `libphonenumber-js`. Always store E.164 (`+251911223344`), display localized. Validate on input. Saves bugs across every module.

### 6.7 Background jobs queue (currently underused)

Your template mentions Redis/BullMQ as "ready" but doesn't actually wire it. Add it for real:

```
apps/api/src/shared/queue/
|-- queue.module.ts
|-- queue.service.ts          # generic addJob wrapper
|-- processors/               # base processor class
`-- queue-health.service.ts
```

Every vertical needs queues: send-email, generate-pdf, sync-external-api, retry-failed-call. Without a real queue setup, devs roll their own and you get chaos.

Add a UI at `/admin/jobs` (you have a route but probably empty) showing queue depth, failed jobs, retry button. Use **BullMQ** with **Redis** — both already in your stack.

Full pattern for starter packs adding queues is in section 19.

### 6.8 PDF generation service

Invoices, receipts, reports, contracts. Every SaaS needs PDFs.

```
apps/api/src/shared/pdf/
|-- pdf.service.ts            # accepts template + data, returns Buffer
|-- templates/                # Handlebars or React-PDF templates
|   |-- invoice.template.ts
|   |-- receipt.template.ts
|   `-- report.template.ts
`-- pdf.queue.processor.ts    # offload to background queue for big PDFs
```

Use **Puppeteer** for HTML-to-PDF (most flexible) or **PDFKit** (lighter, no Chrome dependency). Puppeteer needs ~300MB extra on the VPS; PDFKit is more lightweight but harder to template.

Recommendation: PDFKit + a thin React-PDF layer for advanced templates.

### 6.9 Webhooks (outbound)

Tenants will want to push events to their own systems (Zapier, n8n, custom CRM). Standard SaaS feature.

```
apps/api/src/modules/webhook/
|-- domain/
|-- application/
|   |-- services/
|   |   |-- webhook-dispatcher.service.ts    # sends signed POST
|   |   `-- webhook-retry.service.ts         # exponential backoff
|-- infrastructure/
|   `-- repositories/
`-- presentation/
    |-- webhook.controller.ts                # CRUD endpoints, test endpoint
```

Tenant config: endpoint URL, secret (for HMAC signing), event types to subscribe.

When any domain event fires (invoice.registered, member.invited, payment.received), the dispatcher posts to all matching webhook endpoints with HMAC signature header.

### 6.10 API key scopes refinement

You have `api-key` module. Strengthen it:

- Scope strings standardized (`invoices:read`, `invoices:write`, `webhooks:manage`, `*` for full)
- Expiry date per key, with email reminder 7 days before
- Last-used timestamp, IP, user-agent tracked
- Rotation flow — generate new, both valid for 30 days, old auto-revoked
- Audit log entry on every use

### 6.11 Health endpoint depth

Current `health` module is shallow. Make it production-grade:

```typescript
GET /api/v1/health             // shallow, fast, for load balancers
GET /api/v1/health/ready       // ready to serve traffic
GET /api/v1/health/live        // process alive
GET /api/v1/health/detailed    // full system check (admin-only)
```

The detailed endpoint checks: DB latency, Redis ping, queue worker presence, EIMS reachability (if installed), disk space, memory, last 5min error rate.

### 6.12 Metrics expansion

You expose Prometheus at `/api/v1/metrics`. Add standard SaaS metrics:

- `http_request_duration_seconds{method,route,status}`
- `tenant_request_count{organizationId}` (cardinality-controlled — top 100 only)
- `db_query_duration_seconds{operation}`
- `queue_job_duration_seconds{queue,job}`
- `auth_login_attempts_total{result}`
- `business_metric_*` — vertical-specific counters added by starter packs

Add a Grafana dashboard JSON to `docs/observability/grafana-dashboard.json` that imports cleanly.

### 6.13 Real-time updates (Server-Sent Events)

Notifications, dashboard widgets, live order updates — every modern SaaS needs push. Add SSE (simpler than WebSocket and works fine for this):

```
apps/api/src/shared/realtime/
|-- realtime.module.ts
|-- realtime.controller.ts    # GET /api/v1/realtime/stream
`-- realtime.service.ts       # emit(orgId, event, data)
```

Frontend hook:

```tsx
// apps/web/src/shared/hooks/use-realtime.ts
export function useRealtime(eventType: string, handler: (data: any) => void)
```

Use sparingly — heavy fanout to many tenants needs a proper pub/sub. For SaaS scale (under a few hundred concurrent users per VPS), SSE on top of `EventEmitterModule` is enough.

Full SSE-to-TanStack-Query integration pattern is in section 21.

### 6.14 Multi-step forms framework

Verticals are full of multi-step flows: booking a hotel room, creating an order, onboarding a tenant. Don't make every SaaS rebuild this.

```
apps/web/src/shared/components/wizard/
|-- Wizard.tsx                # root component, step state machine
|-- WizardStep.tsx
|-- WizardNavigation.tsx
|-- useWizard.ts              # hook with go-next, go-back, validation
```

Backed by Zustand or TanStack Form. Reusable across onboarding, EIMS setup, billing upgrade, etc.

### 6.15 Empty states, loading states, error states

Standardize three components:

```
apps/web/src/shared/components/
|-- EmptyState.tsx     # "No records yet" with primary action
|-- LoadingState.tsx   # Skeleton or spinner per context
`-- ErrorState.tsx     # "Something went wrong" + retry + report
```

Every page that fetches data uses these. Consistent UX, fewer half-finished pages.

### 6.16 Permissions UI

Tenant admins need to see and edit role permissions. You have `/_authenticated/settings/roles.tsx` but if it's empty, build it:

- List default roles (owner/admin/member/viewer) read-only
- List custom roles with create/edit/delete
- Permission matrix: resource × action, checkbox grid per role
- Save changes triggers audit log entry

This makes RBAC self-service. Without it, every tenant emails support asking for permission changes.

### 6.17 Audit log UI

Same — you have the model but probably not a polished UI. Make it filterable by:
- Action type
- Actor (user)
- Resource (invoice, member, etc.)
- Date range
- Result (success/failure)

Export to CSV button. This is a compliance feature — tax inspectors, security auditors, internal reviews all need this.

### 6.18 Notification preferences UI

Per-user, per-notification-type, per-channel (in-app/email). Already modeled, just needs the settings page:

```
/_authenticated/settings/notifications.tsx
```

Grid: notification type × channel checkboxes. Save on toggle.

### 6.19 Tenant deletion flow (compliance requirement)

The BSP checklist requires "Exit policy & data export mechanism defined." Build it:

1. Tenant admin clicks "Close organization"
2. Confirmation modal — type org name to confirm
3. Background job: export all org data as ZIP (JSON + uploaded files)
4. Email tenant when ready, link expires in 7 days
5. After 30-day grace period, hard delete via cron job

Model: `Organization.deletionScheduledAt`, `Organization.dataExportFileId`.

### 6.20 Impersonation for support

Platform admins need to view a tenant's data to help them debug. Build it:

- `/admin/organizations/:id` has an "Impersonate" button
- Creates a temporary session with banner "You are viewing as Bole Pizza"
- All actions during impersonation logged separately with `impersonatedBy` field
- Auto-ends after 1 hour

Critical for support velocity. Without it, support asks tenants to send screenshots.

### 6.21 Rate limiting per tenant

You have global ThrottlerModule. Add per-tenant limits:

- Free plan: 60 req/min
- Pro plan: 600 req/min
- Enterprise: configurable

Driven by `Plan.featureEntitlements`. When a tenant exceeds, return 429 with `Retry-After` header. Log the event.

### 6.22 Feature flags self-service

You have `FeatureFlag` and `FeatureFlagOverride`. Build the admin UI:

- List all flags with on/off toggle
- Per-tenant override
- Percentage rollout (10% of tenants get this)
- Date-bound flag (auto-disable after launch date)

Useful for gradual feature rollouts and A/B testing.

### 6.23 i18n second-pass

You have en + am locales. Make sure:
- Every user-facing string is in the locale file (no hardcoded English)
- Numbers/dates use `Intl.NumberFormat` and `Intl.DateTimeFormat` with locale
- RTL support placeholder (for future Arabic/Hebrew tenants)
- Missing translation fallback shows in console (dev) but never breaks UI

### 6.24 Error reporting integration

You have `error-reporting` module. Wire it to a real service:

- Frontend captures unhandled errors via `ErrorBoundary` and `window.onerror`
- Backend captures via `GlobalExceptionFilter`
- Both POST to `/api/v1/errors` with correlation ID, user/org context, stack trace
- Errors stored in DB and forwarded to Sentry (or self-hosted GlitchTip if no cloud)

### 6.25 Documentation site generator

Every SaaS needs docs (user-facing, not your dev docs). Add a `docs-site/` workspace using **Astro** or **Docusaurus**:

```
my-app/
|-- apps/
|   |-- api/
|   |-- web/
|   `-- docs/                 # Astro static site
```

Pre-populated with placeholder pages: Getting Started, FAQ, Billing, API Reference, Changelog. Tenants link to this from in-app help.

### 6.26 Changelog and in-app announcements

`Broadcast` model exists. Build the platform admin UI to publish announcements, and the tenant UI bell to show recent changes.

### 6.27 Search (basic, per-resource)

Every SaaS needs cross-resource search ("find that invoice", "find that customer"). Don't add Elasticsearch yet — start with **Postgres full-text search**:

```
apps/api/src/shared/search/
|-- search.service.ts          # uses tsvector + tsquery
`-- searchable.decorator.ts    # @Searchable on entities adds them to index
```

GET `/api/v1/search?q=...` returns ranked results across the tenant's searchable resources, scoped by `organizationId`.

The DataTable's global search box (section 4.1) is per-table search. This module is **app-wide** search. The command palette in section 15 ties them together.

### 6.28 Backups out of the box

Don't leave devs to figure out backup. Ship a script:

```
scripts/backup.sh
```

- pg_dump on a cron schedule
- Encrypts with the master key
- Uploads to a configurable destination (local path, S3, B2)
- Retention: 7 daily, 4 weekly, 12 monthly
- Includes file uploads if local driver
- Email alert on backup failure

Document restore procedure in `docs/DISASTER_RECOVERY.md`.

---

## 7. UI architecture improvements

### 7.1 Shell layout standardization

`_authenticated.tsx` is the app shell. Make it production-grade:

```
+--------------------------------------------------------------+
| TopBar: OrgSwitcher | Search | Notifications | User menu    |
+--------------------------------------------------------------+
| Sidebar           | Main content area                        |
| - Dashboard       |                                          |
| - <vertical nav>  |   <Outlet />                             |
| - Settings        |                                          |
+--------------------------------------------------------------+
| Footer (optional): version, env badge, status link           |
+--------------------------------------------------------------+
```

Sidebar is data-driven from a registry that starter packs append to. Each entry has icon, label (i18n key), path, required permission, badge count.

### 7.2 Sidebar registry pattern

```typescript
// apps/web/src/shared/navigation/registry.ts
export const navRegistry: NavEntry[] = [
  // base entries here
];

// starter packs append at install time:
// nav.snippet.ts pushes new entries
```

Document the format so starter packs always append rather than overwrite.

### 7.3 Page header convention

Every authenticated page renders a header:

```tsx
<PageHeader
  title={t('invoices.title')}
  description={t('invoices.description')}
  breadcrumbs={[...]}
  actions={<Button>New Invoice</Button>}
/>
```

Sticky on scroll, with breadcrumbs. Consistency = recognition.

### 7.4 Design tokens — document, don't redesign

The template already has solid Tailwind + shadcn styling. **Don't redo design tokens or color systems.** The existing setup works.

Instead, publish `docs/DESIGN_TOKENS.md` that documents what already exists:

```css
:root {
  --brand: <tenant accent>;
  --color-primary, --color-secondary, --color-muted, --color-danger, --color-success, --color-warning, --color-info;
  --radius-sm, --radius-md, --radius-lg;
  --space-1 through --space-12;
}
```

Forbid raw hex in components via lint rule. Devs must use tokens.

### 7.5 Component library catalog

Add a Storybook (or Histoire — lighter) workspace:

```
apps/web/.storybook/
apps/web/src/shared/components/*.stories.tsx
```

Every shared component gets a story. New devs onboard in hours, not days. Optional but high ROI — make it lower priority than functional improvements.

---

## 8. Forms standardization

### 8.1 Required form library

Pick one and forbid the other:

**Option A — TanStack Form** (matches the TanStack-everywhere philosophy)
**Option B — React Hook Form + Zod** (more ecosystem)

Either works. Pick one for the template. Document the choice in `docs/FRONTEND_CONVENTIONS.md`.

**Recommendation: TanStack Form** for consistency with the rest of the stack.

### 8.2 Standard form shell

```
apps/web/src/shared/components/Form/
|-- Form.tsx                        # wrapper, handles submit, error display
|-- FormField.tsx                   # label + input + error
|-- FormSection.tsx                 # grouped fields with title
|-- FormActions.tsx                 # submit + cancel button row
|-- FormErrorSummary.tsx            # top-of-form error list
|-- fields/
|   |-- TextField.tsx
|   |-- TextareaField.tsx
|   |-- NumberField.tsx
|   |-- SelectField.tsx
|   |-- DateField.tsx
|   |-- CheckboxField.tsx
|   |-- FileField.tsx
|   `-- ComboboxField.tsx
```

Every form in every starter pack uses these. Consistent UX.

### 8.3 Form requirements

Every form should:
- Use the chosen form library
- Validate with Zod (schema shared between frontend and backend types)
- Show field-level errors inline
- Show a top-level error summary if multiple errors
- Disable submit during pending mutation
- Show success toast on save

Build a reusable `<Form>` wrapper component that enforces this. Devs that bypass it get inconsistent UX.

### 8.4 Validation pattern

Shared Zod schemas between frontend and backend types. The DTO file in the API exports a Zod schema, the frontend imports the inferred type:

```typescript
// In SDK or shared package
export const submitInvoiceSchema = z.object({
  transactionType: z.enum(['B2B', 'B2C', 'B2G', 'G2B', 'G2C']),
  documentDetails: documentDetailsSchema,
  // ...
});

export type SubmitInvoiceDto = z.infer<typeof submitInvoiceSchema>;
```

Frontend uses the same schema in the form library for validation. One source of truth.

---

## 9. Money handling

### 9.1 Always use BigInt for amounts

In Prisma:

```prisma
amount   BigInt
currency String   @default("ETB") @db.Char(3)
```

In TypeScript:

```typescript
interface Money {
  amount: bigint;
  currency: string;
}
```

No floats, ever, for money. Even small rounding errors compound and break tax calculations.

### 9.2 Money utility module

```
apps/api/src/shared/money/
|-- money.ts                        # add, subtract, multiply, divide
|-- format.ts                       # formatMoney(amount, currency, locale)
|-- parse.ts                        # parseMoney("1,234.56", "ETB")
|-- vat.ts                          # calculateVat(amount, rate)
|-- currency.ts                     # currency metadata, minor unit count
`-- *.test.ts                       # property-based tests for invariants
```

Shared between API and frontend (move to `packages/money` if you want monorepo helpers).

### 9.3 Display component

```
apps/web/src/shared/components/MoneyDisplay.tsx
```

```typescript
<MoneyDisplay amount={1234500n} currency="ETB" />
// renders: "1,234.50 ETB" (or "12,345.00" depending on locale and minor units)
```

Every place that shows money uses this. No raw `{amount.toLocaleString()}` calls anywhere.

---

## 10. Date and time handling

### 10.1 Standard library — date-fns

Pick one. Recommendation: **date-fns** (tree-shakable, immutable, broader API).

### 10.2 Storage and transmission

- API stores and transmits dates as **ISO 8601 strings** in UTC
- Database column type is `timestamptz` (timezone-aware)
- Frontend converts to tenant's timezone for display only
- Date inputs in forms parse local time, convert to UTC on submit

### 10.3 Display components

```
apps/web/src/shared/components/
|-- DateDisplay.tsx                 # absolute date in tenant TZ
|-- TimeDisplay.tsx
|-- DateTimeDisplay.tsx
|-- RelativeTime.tsx                # "2 hours ago"
|-- DurationDisplay.tsx             # "3 days, 4 hours"
```

All accept ISO string, all use tenant timezone from session.

---

## 11. Cross-module communication

Modules should rarely talk directly. Use events.

### 11.1 Domain event bus

Your template has `EventEmitterModule`. Standardize event naming and payloads:

```typescript
// apps/api/src/shared/events/event-names.ts
export const EVENTS = {
  ORG_CREATED: 'organization.created',
  ORG_DELETED: 'organization.deleted',
  MEMBER_INVITED: 'member.invited',
  MEMBER_JOINED: 'member.joined',
  SUBSCRIPTION_CHANGED: 'subscription.changed',
  INVOICE_REGISTERED: 'invoice.registered',
  // ... starter packs add their own
} as const;
```

Each event has a typed payload interface. Listeners declare what they listen to.

### 11.2 Module integration pattern

When a starter pack needs to react to base events, it subscribes:

```typescript
@OnEvent(EVENTS.ORG_CREATED)
async handleOrgCreated(payload: OrgCreatedPayload) {
  await this.eimsSetupService.initializeForNewOrg(payload.organizationId);
}
```

No direct imports across modules. Modules talk through events + shared interfaces.

### 11.3 Saga pattern for multi-module workflows

Some flows touch many modules: subscribe to plan → unlock features → send welcome email → seed sample data → trigger billing webhook. Use a saga:

```
apps/api/src/shared/sagas/
|-- new-tenant.saga.ts         # listens to ORG_CREATED, orchestrates the welcome flow
```

Sagas are stateful coordinators that subscribe to events and emit follow-up events. Failure of one step doesn't crash the saga; it retries or compensates.

---

## 12. CLI improvements

### 12.1 `pnpm doctor` upgrades

Current doctor probably checks node version and basic env. Expand:

- Node 20+ check
- pnpm 9+ check
- Postgres reachable
- Redis reachable
- DATABASE_URL well-formed
- Required env vars present (per installed starter pack)
- Disk space > 1GB
- Outbound network to EIMS sandbox (if EIMS installed)
- Migration status (no pending migrations)
- Master encryption key present and 32 bytes
- GitHub Packages auth token works

Output color-coded checklist. Exit code 1 if anything fails.

### 12.2 `pnpm dev` should be one command

Currently a dev might need to manually start Postgres, Redis, run migrations, seed, then start dev. Wrap it:

```
pnpm dev
  -> docker compose up -d (postgres, redis)
  -> wait for ready
  -> pnpm db:migrate
  -> pnpm db:seed if first run
  -> turbo dev (api + web)
```

Add `docker-compose.dev.yml` to the template that runs Postgres + Redis locally.

### 12.3 New CLI flags

```
create-vyllion-saas my-app \
  --starter eims,restaurant-pos \
  --no-install \
  --with-docker \
  --master-key=auto-generate
```

`--starter` lets devs scaffold + install starter packs in one command. `--with-docker` ships the docker-compose files. `--master-key=auto-generate` produces a 32-byte key and writes it to `.env`.

### 12.4 `pnpm gen:resource` for quick CRUD

You have `gen:module` for full DDD scaffold. Add a lighter `gen:resource` for simple CRUD entities:

```
pnpm gen:resource Customer --fields name:string,phone:string,email:string,address:Address
```

Generates Prisma model, repository, controller, service, DTO, frontend list+detail pages, all org-scoped. Used for the 80% of entities that don't need full DDD ceremony.

### 12.5 `pnpm gen:event` and `pnpm gen:listener`

Helpers for the event system:

```
pnpm gen:event InvoiceRegistered --payload "irn:string,organizationId:string"
pnpm gen:listener invoice.registered --module notification
```

### 12.6 Starter pack metadata

Every starter pack has a `pack.json`:

```json
{
  "name": "eims",
  "description": "Ethiopia Electronic Invoice Management System",
  "version": "0.1.0",
  "requires": [],
  "conflicts": [],
  "addsRoutes": ["/eims/*", "/admin/eims/*"],
  "addsModels": ["EimsCredential", "EimsCertificate", "..."],
  "addsPermissions": ["eims:read", "eims:write"],
  "addsEnvVars": ["EIMS_API_URL", "EIMS_SANDBOX_URL"],
  "addsDependencies": { "@yourcompany/eims-sdk": "^0.1.0" }
}
```

The CLI uses this to validate compatibility, show what will be installed, and handle uninstall.

### 12.7 Starter pack uninstall

If a dev installs a pack and changes their mind, `pnpm gen:uninstall eims` should undo. Track installed packs in `.scaffold-state.json`. Uninstall reverses each step recorded during install.

### 12.8 CLI tests

Your `testing/` folder exists. Add real CLI tests:

- Create temp dir, run scaffold, verify file structure
- Run scaffold + install eims pack, verify EIMS files present, base files unchanged
- Run scaffold + install conflicting packs, verify error
- Test all template tokens get replaced
- Test `.env` files generated correctly

These prevent CLI regressions. Run in CI on every PR.

---

## 13. Deployment improvements

### 13.1 Production checklist

Add `docs/PRE_LAUNCH_CHECKLIST.md`:

- All env vars set and not using `.example` values
- Database has backups configured
- TLS cert valid > 30 days
- Master encryption key rotated within last 90 days
- Admin password is not default
- Sentry/error reporting wired
- Health endpoint reachable from monitoring
- Rate limits configured per plan
- Email sending domain verified (SPF/DKIM/DMARC)
- Privacy policy and terms of service published

### 13.2 Deployment script

Currently devs probably scp files and restart PM2. Wrap it:

```
scripts/deploy.sh staging
scripts/deploy.sh production
```

Steps: build locally, rsync to VPS, run migrations, restart PM2 with rolling reload, run smoke test against the deployed URL, rollback on failure.

### 13.3 Zero-downtime migrations

PM2 cluster mode + Caddy lets you do rolling restarts. Document the safe migration pattern:

- Migrations must be **forward-compatible** with previous app version
- Add columns nullable first, deploy, backfill, then enforce NOT NULL in a follow-up migration
- Never drop columns in the same release that stopped using them

Document in `docs/MIGRATIONS_PLAYBOOK.md`.

### 13.4 Multiple environments

Template assumes one prod environment. Real SaaS needs:

- `.env.development`
- `.env.staging`
- `.env.production`
- Loaded based on `NODE_ENV`
- Separate Caddyfile blocks
- Separate PM2 ecosystem entries

### 13.5 Caddy + Cloudflare DNS automation

Wildcard SSL is annoying manually. Document Caddyfile config with Cloudflare DNS challenge:

```
*.yourcompany.com {
  tls {
    dns cloudflare {env.CF_API_TOKEN}
  }
  reverse_proxy 127.0.0.1:3000
}
```

Then you can support custom domains per tenant later without re-deploying.

---

## 14. Security hardening

### 14.1 Secret management baseline

For every new project:

```bash
# Generated by scaffold
MASTER_KEY=<32-byte hex>      # for AES-256-GCM
SESSION_SECRET=<64-byte hex>  # Better Auth
JWT_SECRET=<64-byte hex>      # if you use JWT outside Better Auth
```

These get written to `.env` and `.scaffold-credentials.txt` (gitignored). Doctor verifies they exist and are correct length.

### 14.2 Encryption — the env var + node:crypto approach (decision)

Use **AES-256-GCM via node:crypto** with the **master key in `.env`**. Do not deploy HashiCorp Vault at your current scale.

**Why this is secure:**

Three layers of protection:

1. The master key is in a file outside git, owned by the node user, `chmod 600`. Only the node process can read it.
2. The database stores ciphertext only. A stolen DB backup is gibberish without the master key.
3. The master key is never backed up with the database. They are stored separately.

An attacker needs **simultaneous** access to both the Postgres database (or its backups) AND the `.env` file on the running VPS. A breach of either alone is useless. Most data leaks happen via stolen backups — that path is blocked.

**Operational rules that MUST be followed to maintain the security level:**

- `.env` is in `.gitignore` and never committed
- `.env` permissions: `chmod 600`, owner = node user
- Backups exclude `.env` (filter in `pg_dump` and file backup scripts)
- The master key is generated once per environment, never reused across environments
- The master key is documented in your password manager (or company secrets manager) for disaster recovery
- Two trusted people know how to recover the master key in case of staff loss
- The master key never appears in:
  - Application logs
  - Error messages
  - Stack traces
  - Audit log entries
  - Browser console
  - Slack messages
  - Emails
- Rotation: every 12 months, generate a new key, re-encrypt all ciphertext, retire the old key

### 14.3 The cipher service implementation

This belongs in `apps/api/src/shared/crypto/cipher.service.ts` in the base template. Every module that needs to encrypt secrets (EIMS credentials, API keys, integration tokens) uses it. **Never roll your own crypto in feature modules.**

```typescript
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

@Injectable()
export class CipherService implements OnModuleInit {
  private key!: Buffer;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const hex = this.config.getOrThrow<string>('MASTER_KEY');
    if (hex.length !== 64) {
      throw new Error('MASTER_KEY must be a 32-byte hex string (64 characters)');
    }
    if (!/^[0-9a-f]+$/i.test(hex)) {
      throw new Error('MASTER_KEY must be hexadecimal');
    }
    this.key = Buffer.from(hex, 'hex');
  }

  encrypt(plaintext: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const ciphertext = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();
    return [
      'v1',
      iv.toString('base64'),
      tag.toString('base64'),
      ciphertext.toString('base64'),
    ].join(':');
  }

  decrypt(packed: string): string {
    const [version, ivB64, tagB64, ctB64] = packed.split(':');
    if (version !== 'v1') throw new Error(`Unsupported cipher version: ${version}`);

    const iv = Buffer.from(ivB64, 'base64');
    const tag = Buffer.from(tagB64, 'base64');
    const ciphertext = Buffer.from(ctB64, 'base64');

    const decipher = createDecipheriv('aes-256-gcm', this.key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
  }
}
```

The `v1` prefix lets you migrate to a new algorithm or key later without breaking existing ciphertext.

### 14.4 Key generation at scaffold time

The CLI's `scaffold.js` generates the master key automatically:

```javascript
import { randomBytes } from 'node:crypto';

const masterKey = randomBytes(32).toString('hex');

// Write to apps/api/.env
await fs.appendFile(envPath, `MASTER_KEY=${masterKey}\n`);

// Write to .scaffold-credentials.txt
await fs.appendFile(credsPath, `\nMaster Key (DO NOT LOSE — required to decrypt secrets):\n${masterKey}\n`);
```

The dev sees the key in the credentials file. They must save it in their password manager before proceeding.

### 14.5 Key rotation procedure

Document in `docs/SECURITY.md`:

1. Generate new key, set as `MASTER_KEY_V2` env var (both keys live during migration)
2. Update cipher service to accept v1 ciphertext for decrypt, encrypt with v2
3. Run migration script: read every encrypted column, decrypt with v1, encrypt with v2, write back
4. Verify random samples decrypt correctly
5. Remove `MASTER_KEY_V1` from env, rename `MASTER_KEY_V2` to `MASTER_KEY`
6. Restart app
7. Verify no v1 ciphertext remains in DB

### 14.6 When to move to Vault

Move to HashiCorp Vault (or AWS KMS, GCP KMS) when **any** of these become true:

- More than 50 production tenants
- Multiple production environments sharing secrets
- Compliance audit (SOC 2, ISO 27001) explicitly requires KMS
- A staff member with .env access leaves and key rotation alone is insufficient
- You need automated key rotation
- You need hardware-backed key storage
- You need separation of duties (one team manages keys, another manages app)

Until then, env var is the right call and security is acceptable.

### 14.7 Password policy

Better Auth has hooks. Enforce:
- Minimum 12 characters
- Must contain letter + number
- Check against haveibeenpwned API (k-anonymity, doesn't leak)
- Lockout after 5 failed attempts for 15 minutes
- Password change required on first login if temp password

### 14.8 Session security

- Cookies: `httpOnly`, `secure`, `sameSite: 'lax'`
- Session rotates on privilege change (login, password change, role change)
- Inactivity timeout 30 minutes for sensitive routes, 7 days for normal
- Active sessions list in user settings, "Log out all other devices"

### 14.9 CSRF protection

Better Auth handles it but verify the global CSRF middleware is enabled and there are no exempted endpoints by accident.

### 14.10 Input validation everywhere

Class-validator on every DTO. No raw bodies passed to services. No string concatenation into Prisma queries (use Prisma's parameterized queries — you already do, but lint rule to forbid `$queryRawUnsafe`).

### 14.11 Output sanitization

Helmet + CSP headers in production. Sanitize any HTML rendered from user input (Markdown comments, custom templates, etc.). Use DOMPurify on frontend, sanitize-html on backend.

### 14.12 File upload safety

Current `upload` module needs hardening:
- MIME type whitelist per upload type
- Magic byte check (don't trust extension)
- Max file size enforced
- Filenames sanitized (no path traversal)
- ClamAV scan for production (optional but recommended)
- Files served from a different subdomain than the app (`uploads.yourcompany.com`) to limit XSS impact

### 14.13 Dependency scanning

CI runs:
- `pnpm audit` weekly
- Dependabot or Renovate for automated PRs
- Semgrep for SAST
- gitleaks for committed secrets

You have `apps/security/` workspace — make sure all of these run there and gate PR merge.

### 14.14 Penetration test readiness

Document `docs/SECURITY.md` with:
- Bug bounty policy / responsible disclosure email
- Architecture summary for pentesters
- Known limitations
- Compliance scope (PCI not in scope, etc.)

---

## 15. Search and command palette

### 15.1 Two kinds of search

The template ships with two separate search experiences:

1. **Per-table search** — the global search box at the top of every DataTable (section 4.1). Searches within the rows visible on that page.
2. **App-wide search** — a Cmd+K command palette that navigates across the whole app.

### 15.2 Command palette

`apps/web/src/shared/components/CommandPalette/`:

```
|-- CommandPalette.tsx              # Cmd+K modal
|-- command-registry.ts             # starter packs register commands here
|-- index.ts
```

Built on `cmdk` library. Starter packs register entries:

```typescript
// In EIMS starter pack
registerCommand({
  id: 'eims-submit-invoice',
  label: 'New EIMS Invoice',
  path: '/eims/submissions/new',
  shortcut: 'n',
  permission: 'eims:submit',
});

registerCommand({
  id: 'eims-find-irn',
  label: 'Find Invoice by IRN',
  path: '/eims/submissions',
  prefill: { search: '$query' },
});
```

Users hit Cmd+K, type, navigate. Power-user feature, adds polish.

The command palette can also surface results from the app-wide search module (section 6.27) when the user types a query.

---

## 16. Testing standards (with mutation testing)

### 16.1 Test workspaces

```
apps/api/                            # Unit, integration, property, mutation tests
apps/api-tests/                      # Playwright API tests, Bruno, OpenAPI/Spectral
apps/e2e/                            # Browser E2E tests
apps/acceptance/                     # Cucumber acceptance tests
apps/performance/                    # k6/load/performance tests
apps/security/                       # gitleaks, audit, semgrep, nuclei, API security smoke
apps/ai-eval/                        # Optional AI behavior checks
```

### 16.2 Required tests per backend module

For **every** module the template generates or a starter pack installs:

| Test type | Location | Required? |
|---|---|---|
| Unit tests for command handlers | `apps/api/src/modules/<m>/application/commands/**/*.spec.ts` | Yes |
| Unit tests for query handlers | `apps/api/src/modules/<m>/application/queries/**/*.spec.ts` | Yes |
| Unit tests for services | `apps/api/src/modules/<m>/application/services/**/*.spec.ts` | Yes |
| Integration tests for repositories | `apps/api/src/modules/<m>/infrastructure/repositories/**/*.integration.spec.ts` | Yes |
| Property-based tests for invariants | `apps/api/src/modules/<m>/**/*.property.ts` | When applicable |
| E2E tests for controllers | `apps/api-tests/<m>/*.e2e.ts` | Yes — at least 1 |
| Tenant isolation test | `apps/api-tests/<m>/tenant-isolation.e2e.ts` | Yes — mandatory |
| Permission denial test | `apps/api-tests/<m>/permissions.e2e.ts` | Yes — mandatory |
| Browser E2E test | `apps/e2e/<m>/*.spec.ts` | At least 1 happy path |
| Acceptance test | `apps/acceptance/features/<m>/*.feature` | For user-facing flows |

### 16.3 Mutation testing — Stryker

Configure Stryker at the API workspace:

`apps/api/stryker.conf.json`:

```json
{
  "$schema": "./node_modules/@stryker-mutator/core/schema/stryker-schema.json",
  "packageManager": "pnpm",
  "testRunner": "vitest",
  "vitest": { "configFile": "vitest.config.ts" },
  "reporters": ["html", "clear-text", "progress", "dashboard"],
  "mutate": [
    "src/modules/**/*.ts",
    "src/shared/**/*.ts",
    "!src/**/*.spec.ts",
    "!src/**/*.test.ts",
    "!src/**/*.dto.ts",
    "!src/**/*.entity.ts",
    "!src/**/*.module.ts",
    "!src/generated/**"
  ],
  "thresholds": { "high": 80, "low": 65, "break": 50 },
  "timeoutMS": 60000,
  "concurrency": 4,
  "ignoreStatic": true
}
```

Add to `package.json`:

```json
{
  "scripts": {
    "test:mutation": "stryker run",
    "test:mutation:module": "stryker run --mutate src/modules/$MODULE/**/*.ts"
  }
}
```

CI runs mutation tests nightly on `main`, fails build if score drops below 50. PRs run mutation tests on changed modules only via `test:mutation:module`.

### 16.4 Property-based testing — fast-check

For pure functions (canonicalization, validators, formatters, money math), use `fast-check`:

```typescript
import { fc, test } from '@fast-check/vitest';

test.prop([fc.bigInt()])('money formatting roundtrips', (amount) => {
  const formatted = formatMoney(amount, 'ETB');
  const parsed = parseMoney(formatted);
  expect(parsed).toBe(amount);
});
```

Required for: money math, date arithmetic, canonicalization, schema validation, encryption/decryption.

### 16.5 Test fixtures — shared

```
apps/api/test/fixtures/
|-- organization.fixture.ts        # makeOrganization({ overrides })
|-- user.fixture.ts
|-- invoice.fixture.ts
|-- certificate.fixture.ts
`-- index.ts
```

Every test imports from fixtures. No inline test data. Makes refactoring data shape changes trivial.

### 16.6 Contract testing with the SDK

The base template's API depends on `@yourcompany/eims-sdk`. Add a contract test that runs against the SDK's mock server:

```
apps/api-tests/contracts/
|-- eims-sdk-contract.spec.ts
|-- billing-stripe-contract.spec.ts
`-- billing-chapa-contract.spec.ts
```

If MoR changes their spec → SDK is updated → contract test fails → reveals every place the consumer needs to update.

### 16.7 Smoke test on every deploy

`pnpm test:smoke` should run in <2 minutes and cover:
- Health endpoint responds
- Can sign up + create org + log in
- Can create a member, invite, accept invitation
- Can fetch organization settings
- Can fetch metrics endpoint

Runs in CI before deploy. If it fails, deploy aborts.

### 16.8 Performance regression tests

`apps/performance/scenarios/`:

```
|-- baseline-list-load.js          # GET /resources with 1k records
|-- bulk-submit.js                 # POST 100 invoices
|-- dashboard-load.js
`-- concurrent-tenants.js          # 50 tenants doing typical workload
```

Track p50, p95, p99 latency over time. CI fails if p95 regresses by >20% from baseline.

### 16.9 Test categorization by speed

```
pnpm test:unit          # < 5 seconds, runs on every save
pnpm test:integration   # < 30 seconds, runs on save with focus
pnpm test:e2e           # < 5 minutes, runs pre-push
pnpm test:smoke         # < 2 minutes, runs on every CI build
pnpm test:full          # ~15 minutes, runs nightly
pnpm test:mutation      # ~30 minutes, runs nightly on main
```

### 16.10 Test commands documented per module

Every module's README documents:

```
# Run all tests for this module
pnpm test --filter <module>

# Run unit tests only
pnpm test:unit --filter <module>

# Run mutation tests
MODULE=<module> pnpm test:mutation:module

# Run e2e against this module
pnpm test:e2e --grep <module>
```

### 16.11 Coverage thresholds

`vitest.config.ts`:

```typescript
coverage: {
  provider: 'v8',
  thresholds: {
    statements: 80,
    branches: 75,
    functions: 80,
    lines: 80,
  },
  exclude: ['**/*.dto.ts', '**/*.module.ts', '**/*.entity.ts', '**/generated/**'],
}
```

Modules can override thresholds in their own vitest config if a higher bar makes sense (signing/crypto modules should target 95+).

---

## 17. Notifications integration — required pattern

When starter packs need to notify, they go through the shared notification module, never email directly.

```typescript
// In any starter pack service
await this.notificationService.send({
  organizationId,
  userId: targetUserId,
  type: 'eims.certificate.expiring',
  channel: 'email',
  payload: { daysUntilExpiry: 14, certificateId },
});
```

The notification module handles:
- Looking up tenant preferences
- Checking user-level opt-outs
- Rendering the appropriate template
- Delivery via configured provider
- Recording in `EmailDelivery`
- Retrying on failure
- Audit log entry

Every starter pack defines its notification types in its install snippet, which registers templates in the system.

---

## 18. Audit logging — required for every mutation

The template has `AuditInterceptor`. Make it the law:

- Every `@Mutation` controller method MUST produce an audit log entry
- Audit entry includes: who (userId), what (action), where (resourceType/id), when, result (success/failure)
- Payload is **redacted** (no secrets) and **truncated** (max 4KB)
- Correlation ID ties multi-step operations together

For starter packs to declare audit conventions:

```typescript
@Controller('eims/submissions')
@AuditResource('eims:submission')
export class EimsSubmissionsController {
  @Post()
  @AuditAction('create')
  async create(@Body() dto: SubmitInvoiceDto) { ... }

  @Delete(':id')
  @AuditAction('cancel')
  async cancel(@Param('id') id: string) { ... }
}
```

Decorators feed metadata to the interceptor.

---

## 19. Background jobs — required pattern

When starter packs need background work, they declare it explicitly:

```typescript
// In starter pack's pack.json
{
  "addsQueues": [
    {
      "name": "eims-submission-retry",
      "concurrency": 5,
      "rateLimit": { "max": 100, "duration": 60000 }
    }
  ],
  "addsCrons": [
    {
      "name": "certificate-expiry-check",
      "schedule": "0 6 * * *",
      "module": "eims"
    }
  ]
}
```

The installer wires these into the shared queue/scheduler modules. Jobs are visible in `/admin/jobs` automatically.

---

## 20. Error handling — typed errors throughout

Every module exports typed errors. No generic `throw new Error()`:

```typescript
// In eims/errors.ts
export class EimsNotConfiguredError extends DomainError {
  constructor(orgId: string) {
    super(`Tenant ${orgId} has not completed EIMS setup`);
  }
}

export class EimsCertificateExpiredError extends DomainError {
  constructor(public expiredAt: Date) {
    super(`EIMS certificate expired on ${expiredAt.toISOString()}`);
  }
}
```

The `GlobalExceptionFilter` maps domain errors to HTTP responses. Frontend hooks catch typed errors and show appropriate UI.

---

## 21. Realtime updates with SSE — pattern for tables

When a submission status changes, the dashboard should update without refresh:

```typescript
// In SubmissionsTable.tsx
useRealtimeEvent('eims.submission.updated', (event) => {
  queryClient.invalidateQueries({ queryKey: submissionsKeys.detail(event.submissionId) });
  queryClient.invalidateQueries({ queryKey: submissionsKeys.lists() });
});
```

The backend pushes when:
- Background retry completes
- Bulk callback received
- Cancellation processed
- Certificate expiry warning fires

This is the pattern: backend emits event → SSE pushes to relevant tenant → frontend invalidates relevant query → TanStack Query refetches → table updates.

---

## 22. Documentation improvements

You have good `docs/` already. Add:

```
docs/
|-- ARCHITECTURE.md                  # existing
|-- API_CONVENTIONS.md               # existing
|-- DATABASE_GUIDE.md                # existing
|-- MODULE_GUIDE.md                  # existing
|-- PERMISSIONS_GUIDE.md             # existing
|-- FRONTEND_CONVENTIONS.md          # existing
|-- TESTING_GUIDE.md                 # existing
|-- ADMIN_OPERATIONS_GUIDE.md        # existing
|-- DESIGN_TOKENS.md                 # NEW — document existing tokens
|-- SECURITY.md                      # NEW — threat model, policies, key rotation
|-- DISASTER_RECOVERY.md             # NEW — backup/restore procedure
|-- MIGRATIONS_PLAYBOOK.md           # NEW — safe migration pattern
|-- OBSERVABILITY.md                 # NEW — logs, metrics, traces
|-- STARTER_PACKS.md                 # NEW — how to author one
|-- WEBHOOK_GUIDE.md                 # NEW — outbound webhook events
|-- PRE_LAUNCH_CHECKLIST.md          # NEW
`-- CHANGELOG.md                     # NEW — semver release log
```

Every new starter pack adds a `docs/STARTER_<NAME>.md` describing what it installs and how to use it.

---

## 23. Recommended execution order

Roadmap with all phases:

### Phase 1 — Cleanup and standards (Week 1-2)
1. Strip EIMS from base template
2. Verify base template generates cleanly
3. Add `CipherService` to base template's shared crypto
4. Generate master key at scaffold time
5. Document the security model in `docs/SECURITY.md`
6. Update doctor to check master key
7. Beef up `OrganizationSettings`

### Phase 2 — TanStack and DataTable (Week 3-4)
8. Build the full DataTable component with all features (sections 4.1-4.6)
9. Build CommandPalette
10. Standardize TanStack Query hooks (query key factory pattern)
11. Migrate any existing list pages to use the new DataTable
12. Add lint rules to enforce conventions
13. Onboarding wizard

### Phase 3 — Cross-cutting modules (Week 5-6)
14. Real queue setup (BullMQ + Redis)
15. Webhook (outbound) module
16. PDF generation service
17. Address + currency + phone helpers
18. SSE realtime
19. Money + date utilities

### Phase 4 — UI standardization (Week 7-8)
20. Shell layout cleanup
21. Sidebar registry pattern
22. PageHeader, EmptyState, LoadingState, ErrorState
23. Wizard component
24. Form shell components
25. Document existing design tokens

### Phase 5 — Testing strengthening (Week 9-10)
26. Set up Stryker mutation testing
27. Add property-based tests for pure functions
28. Add contract tests harness
29. Document all test categories
30. Wire all to CI with proper thresholds

### Phase 6 — CLI maturity (Week 11-12)
31. `pnpm doctor` upgrades
32. `pnpm dev` one-command experience
33. `pnpm gen:resource`
34. Starter pack metadata + uninstall
35. CLI tests

### Phase 7 — Production readiness (Week 13-14)
36. Deployment script
37. Multi-environment support
38. Backup/restore script
39. Health endpoint depth
40. Metrics expansion + Grafana dashboard

### Phase 8 — Security hardening + docs (Week 15-16)
41. Encryption helper across all modules (already done in Phase 1, verify usage)
42. Password policy + session security
43. Dependency scanning in CI
44. Audit log decorators
45. Domain error hierarchy
46. Write all new doc files
47. Tag v1.0 of the template

After this, the template is solid enough that adding the EIMS starter pack + vertical packs becomes the satisfying part.

---

## 24. Final priority sort for the next month

If you can only do 10 things in the next month, do these in order:

1. **Strip EIMS from base template** (1-2 days)
2. **Build the DataTable with all features** — pagination, sort, filter, search, virtualize (3-4 days)
3. **Standardize TanStack Query hooks pattern** across the template (1 day)
4. **Add CipherService to shared crypto** (half day)
5. **Generate master key in scaffold + document the security model** (half day)
6. **Set up Stryker mutation testing** with CI integration (1-2 days)
7. **Build onboarding wizard** (2-3 days)
8. **Build Form component shell** with TanStack Form (2 days)
9. **Money and date utilities** with property-based tests (1-2 days)
10. **Document everything created above** (ongoing)

The EIMS pack and SDK come after this. The base template earns its keep when these 10 are solid.

---

## 25. What this document does NOT cover

By design, this document excludes:

- **EIMS specifics** — in document 03 (EIMS starter pack) and document 02 (EIMS SDK)
- **Vertical-specific business logic** — separate per-vertical starter pack docs (restaurant-pos, hotel-pms, retail-pos)
- **AI features** — you have ai-eval, but the AI features themselves are domain-specific
- **Mobile app** — out of scope for now
- **Marketing site** — separate project

---

## 26. Final note on philosophy

A good template is **boring**. It does everything every SaaS needs, predictably, in the same way every time. The exciting part is the business logic on top.

If a feature feels exciting or novel, ask: does every SaaS need this? If no, it belongs in a starter pack or in the product itself. The base template earns its keep by being the part you don't have to think about.

Document set relationships:

```
01-template-improvement-plan-complete.md   <- THIS FILE — the complete base template plan
02-eims-sdk-spec-v2.md                     <- the @yourcompany/eims-sdk package spec (v2)
03-eims-starter-pack-spec.md               <- the pack that uses the SDK
04-concierge-onboarding-system.md          <- the operational layer for tenant onboarding
```

All four documents form one cohesive plan. Read them in order.

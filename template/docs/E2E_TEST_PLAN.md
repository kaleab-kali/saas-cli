# PropFlow E2E Test Plan — Multi-Session, All Roles, All Guards, Billing

Scope: exhaustive end-to-end test of PropFlow through real browser sessions. Target every user role, every RBAC guard, every critical flow, multi-tenant isolation, multi-session real-time, subscription/billing, and onboarding.

**Target URLs**
- Web: `http://localhost:5173`
- API: `http://localhost:3000`
- API docs: `http://localhost:3000/api/docs`
- Platform admin: `http://localhost:5173/admin-login`

---

## 0. Prerequisites & Decisions Needed (BLOCKERS)

Before execution, user must confirm:

### 0.1 Playwright runner choice
Playwright is **not installed** in `apps/web/package.json`. Pick one:

| Option | Pros | Cons |
|---|---|---|
| **A. Install Playwright** (`pnpm add -D @playwright/test` in `apps/web`) | Scriptable, multi-context, parallel, CI-ready, record videos/traces, real Playwright API | Adds dependency; need folder `apps/web/e2e/`; ~30 min setup |
| **B. MCP `Claude_Preview` (playwright under hood)** | Zero install, live-drive from Claude, screenshots for user | Single-preview limit; multi-session awkward |
| **C. gstack `/browse`** | Zero install, guided by CLAUDE.md | Single session, no parallel |

**Recommendation: Option A**. Multi-session + multi-role testing truly needs independent browser contexts. Only Playwright scripts give that cleanly and produce reusable test artifacts.

### 0.2 Billing flow scope
Prior audit (`docs/AUDIT_PROPERTY_LEASE_CRM.md`) + new Notifications/Platform audit found billing is **schema-only**:
- Plan / Subscription / SubscriptionInvoice / SubscriptionPayment models exist
- `seed-plans.ts` seeds feature entitlements per plan
- **No Stripe integration, no upgrade/downgrade UI, no usage tracking, no webhook handlers**

Question: test what exists (plan selection, feature-flag gating) or skip until implemented? Plan assumes "test what exists" + document missing UI as separate gap list.

### 0.3 Test data policy
- Tests create orgs + members + data via UI
- Database is shared with dev data. Options: (a) use unique org slugs per run, (b) add cleanup step, (c) dedicated test DB. Default: option (a). Flag risk of polluting dev state.

### 0.4 Seeding baseline
- Platform admin account seeded: `admin@novektech.com / SuperAdmin123!`
- No seeded tenant orgs, users, or demo data
- Each test run signs up fresh users via UI

### 0.5 Environment checks to run first
- Confirm API port 3000 + Web port 5173 live
- Confirm Postgres + Redis up
- Run `pnpm db:push && pnpm --filter api db:seed && pnpm --filter api exec tsx prisma/seed-plans.ts` once to seed plans + feature flags

---

## 1. Test Matrix Overview

### 1.1 Personas (accounts created per run)

| Persona | Email pattern | Role | Org |
|---|---|---|---|
| P1_Owner_A | `owner.a+{ts}@test.local` | owner | Org A |
| P2_Admin_A | `admin.a+{ts}@test.local` | admin | Org A |
| P3_PM_A | `pm.a+{ts}@test.local` | propertyManager | Org A |
| P4_Leasing_A | `leasing.a+{ts}@test.local` | leasingAgent | Org A |
| P5_Maint_A | `maint.a+{ts}@test.local` | maintenanceStaff | Org A |
| P6_Acct_A | `acct.a+{ts}@test.local` | accountant | Org A |
| P7_Viewer_A | `viewer.a+{ts}@test.local` | viewer | Org A |
| P8_Owner_B | `owner.b+{ts}@test.local` | owner | Org B (cross-tenant isolation) |
| P9_MultiOrg | `multi+{ts}@test.local` | member in both A and B | A + B |
| P10_Platform | `admin@novektech.com` | platform super admin | n/a (separate scope) |

### 1.2 Org setup

- **Org A — Acme Properties**: 2 buildings, 8 units, 2 leases, 1 renter contact, Starter plan initially
- **Org B — Beta Rentals**: 1 building, 2 units, isolation target

### 1.3 Browser context strategy (multi-session)

Each persona gets its own Playwright `BrowserContext` with independent cookies/storage. Parallel assertions:
- P1 creates resource → P2 sees it in real time (WebSocket)
- P7 viewer attempts write → 403
- P5 maintenance sees only assigned WOs
- P8 Owner B queries A's building → 404/empty

---

## 2. Detailed Test Suites

Numbered tests. Each has: setup, steps, assertions, negative case.

### Suite 2.0 — Infrastructure Smoke

- **S0.1** GET `/` on web → 200, login redirect for unauth
- **S0.2** GET `/api/docs` → Swagger UI loads
- **S0.3** WebSocket connect → handshake success
- **S0.4** Health endpoint `/api/health` → 200
- **S0.5** CORS headers present for `http://localhost:5173`

### Suite 2.1 — Authentication

- **S1.1** Signup with valid email+password+name → user created, redirected to create-org
- **S1.2** Signup with weak password → blocked (if policy enforced)
- **S1.3** Signup duplicate email → 409/error shown
- **S1.4** Login with correct creds → session cookie set, redirect to dashboard
- **S1.5** Login with wrong password → error, no session
- **S1.6** Logout → session revoked, redirect to `/login`
- **S1.7** Access `/_authenticated/*` without session → redirect to `/login`
- **S1.8** Session persistence after reload → still logged in
- **S1.9** Password reset flow (if exposed in UI): request link → check stubbed email/log → reset → login new password
- **S1.10** Email verification flow (if enforced) — magic link / OTP
- **S1.11** 2FA setup + login (if exposed)
- **S1.12** Revoke sessions from settings → all devices logged out

### Suite 2.2 — Organization Onboarding

- **S2.1** After signup, create-org flow: name + slug → org created, user becomes Owner
- **S2.2** Post-create-org redirect to dashboard or onboarding wizard
- **S2.3** Onboarding wizard (if present): add building → invite member → skip sample → dashboard
- **S2.4** Switch active org (P9 multi-org): org switcher in sidebar → queries refetch, sidebar shows new org name
- **S2.5** Edit org settings: name, logo, timezone, currency, area unit, fiscal year, invoice numbering
- **S2.6** Org slug validation: duplicate slug → error
- **S2.7** Delete org (owner only): confirm dialog → cascade delete → session ended
- **S2.8** Non-owner attempts delete org → 403

### Suite 2.3 — Member Management + RBAC Matrix

#### 2.3.A Invitation flow
- **S3.1** Owner invites email with role=admin → invite created, email sent (log or stub)
- **S3.2** Invite link → accept → role assigned
- **S3.3** Invite link expired → error
- **S3.4** Invite duplicate email → merge or error
- **S3.5** Change member role after accept
- **S3.6** Remove member → loses access
- **S3.7** Transfer ownership → previous owner becomes admin
- **S3.8** Invite with custom dynamic role (created at runtime)

#### 2.3.B Role permission matrix (positive + negative)

For each persona P2–P7, attempt one action per resource. Table of what must PASS vs FAIL:

| Resource: action | Owner | Admin | PM | Leasing | Maint | Acct | Viewer |
|---|---|---|---|---|---|---|---|
| property:create | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| property:delete | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| unit:assign | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| lease:create | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| lease:terminate | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| tenant:create | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| maintenance:assign | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| work-order:complete | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| work-order:approve-cost | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| procurement:request | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| procurement:approve | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| vendor:rate | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| contact:export | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| contact:merge | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| pipeline:create | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| deal:close | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| listing:publish | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| invoice:record-payment | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| invoice:void | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| report:view-financial | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| report:export | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| member:invite | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| organization:delete | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| audit-log:read | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

- **S3.9..S3.31** — one test per row × positive+negative cells = ~46 checks. UI level: menu/button hidden. API level: direct API call returns 403.
- **S3.32** UI hides menu items for unauthorized persona (e.g. Viewer does not see "Delete" buttons)
- **S3.33** Direct URL hack: Viewer navigates to `/properties/new` → redirect or 403

### Suite 2.4 — Property Module

- **S4.1** Create building: all fields, geocode, photos upload
- **S4.2** Validation: missing required → error
- **S4.3** Edit building → audit log entry
- **S4.4** Archive vs delete: cannot delete with active leases
- **S4.5** Duplicate building creates clone
- **S4.6** Add floor with area + floor plan
- **S4.7** Create single unit + bulk create 20 units → all appear
- **S4.8** Unit status transitions: available → reserved → occupied (on lease active) → available (on lease end)
- **S4.9** Unit status history persisted
- **S4.10** Upload 10 photos to unit, reorder (if UI supports)
- **S4.11** Add amenities (predefined + custom)
- **S4.12** Unit meters CRUD (electric/water/gas)
- **S4.13** Custom fields: create def → fill on unit → saved
- **S4.14** Estate / compound: create, attach buildings
- **S4.15** Portfolio dashboard KPIs render, match data
- **S4.16** Export buildings CSV → file downloads, columns correct
- **S4.17** CSV import (if flagged on) — missing per audit, expect to skip/flag

### Suite 2.5 — Lease Module

- **S5.1** Create residential lease: pick unit + contact, dates, rent, deposit, co-renters, upload doc
- **S5.2** Status workflow: draft → pending_signature → active
- **S5.3** Activation side-effects: unit → occupied, first invoice generated if enabled
- **S5.4** Create commercial NNN lease: base rent, CAM categories, TIA, critical dates
- **S5.5** Add rent escalation (fixed % annual) → effective date future
- **S5.6** Modify lease: rent adjustment → LeaseModification row, audit trail
- **S5.7** Add lease charge: pet rent, parking → shows on invoice line items
- **S5.8** Security deposit settlement: deductions, refund, forwarding address
- **S5.9** Terminate lease early with fee → status=terminated, unit available, deposit settled
- **S5.10** Renew lease → new lease record, old marked renewed
- **S5.11** Expiring leases list (90/60/30 day views)
- **S5.12** CAM reconcile → variance report
- **S5.13** Commercial percentage rent calc (flag as missing if not wired)
- **S5.14** Residential proration on mid-month move-in (flag as missing)
- **S5.15** Manual invoice create with multiple line items
- **S5.16** Record payment: full, partial, overpayment → status changes
- **S5.17** Batch payment entry (if UI exposes)
- **S5.18** Aging report 30/60/90+
- **S5.19** Rent roll export
- **S5.20** Auto invoice generation (missing per audit — flag)

### Suite 2.6 — Maintenance Module

- **S6.1** Create work order from unit: category, priority, description, photos
- **S6.2** Assign WO to internal staff → P5 sees in queue
- **S6.3** Assign WO to vendor → vendor record linked
- **S6.4** Status state-machine: new → acknowledged → assigned → in_progress → waiting_parts → completed → verified → closed
- **S6.5** Time log start/stop
- **S6.6** Material cost itemization
- **S6.7** Before/after photo upload
- **S6.8** Renter satisfaction rating entry
- **S6.9** SLA policy: set response 1h for Emergency, check breach flag
- **S6.10** Preventive schedule create (monthly HVAC filter) → run now generates WO
- **S6.11** Asset register: create HVAC unit with serial+warranty
- **S6.12** Inspection: schedule move-in, fill checklist, auto-gen WO from failed items
- **S6.13** Vendor directory CRUD, insurance expiration
- **S6.14** Vendor rate after WO
- **S6.15** Dashboard: open vs closed, SLA compliance
- **S6.16** Negative: Viewer attempts WO create → 403

### Suite 2.7 — Procurement Module

- **S7.1** Create purchase request from WO, link item lines
- **S7.2** Submit PR → Status=submitted
- **S7.3** Approval rules: set threshold $500 Manager / $5000 Admin / >$5k Owner
- **S7.4** PM submits $300 → auto-approve or manager-only
- **S7.5** PM submits $3000 → admin approves → status=approved
- **S7.6** Reject with reason → requestor notified
- **S7.7** Delegate approval to peer
- **S7.8** Create PO from approved PR → PO number generated
- **S7.9** PO lifecycle: draft → sent → acknowledged → partially_received → fully_received → invoiced → closed
- **S7.10** Record receiving: partial + quality notes + discrepancy
- **S7.11** Budget setup per building + category
- **S7.12** Budget tracking: committed vs spent, over-budget alert
- **S7.13** PO PDF (missing per audit — flag)
- **S7.14** RFQ (missing — flag)
- **S7.15** Negative: Viewer attempts PR → 403; PM attempts approve → 403

### Suite 2.8 — CRM Module

- **S8.1** Create contact with multi-email, multi-phone, socials
- **S8.2** Assign multiple types (Renter + Prospect)
- **S8.3** Merge duplicates
- **S8.4** Archive vs hard delete
- **S8.5** Tag create with color, assign, filter by tag
- **S8.6** Static segment: manual add
- **S8.7** Dynamic segment: criteria tag=VIP AND source=website → count correct
- **S8.8** Activity types: note, call (direction + duration + outcome), email, meeting, viewing
- **S8.9** Activity scheduling: future date → overdue alert if passes
- **S8.10** Timeline per contact displays chronological
- **S8.11** Email template with variables, preview
- **S8.12** Send single email → queued + logged as activity
- **S8.13** Bulk email to segment → batch log
- **S8.14** Automation rule: contact.created → add_tag "new" → verify applied
- **S8.15** Automation rule: contact.tag_added=VIP → create_activity
- **S8.16** Automation execution log
- **S8.17** Search full-text: name + email + company
- **S8.18** Views: table + card + kanban
- **S8.19** Contact relationship: link two contacts (spouse)
- **S8.20** Negative: Leasing role cannot export contacts → 403

### Suite 2.9 — Sales Module

- **S9.1** Create listing from unit: price, description, photos, highlights
- **S9.2** Listing status: draft → active → under_offer → sold
- **S9.3** Price reduction tracked with history
- **S9.4** Days-on-market counter increments
- **S9.5** Create lead: budget, location, timeline, temperature
- **S9.6** Assign lead to agent
- **S9.7** Pipeline kanban: drag-drop stage → probability updates
- **S9.8** Create deal linked to lead + listing
- **S9.9** Record offer: price, earnest, contingencies → submit
- **S9.10** Counteroffer flow
- **S9.11** Accept offer → status=accepted, deal stage=closing
- **S9.12** Commission calc on deal close → report correct
- **S9.13** Agent profile: specialties, active/closed counts
- **S9.14** Schedule viewing → appears in agent calendar
- **S9.15** Log viewing feedback + follow-up required
- **S9.16** Negative: Maintenance staff attempts listing create → 403

### Suite 2.10 — Finance Module

- **S10.1** Invoice generation: manual + from lease
- **S10.2** Line items: rent + CAM + late fee + parking
- **S10.3** Invoice PDF (flag if missing)
- **S10.4** Email invoice (flag if stub driver only)
- **S10.5** Payment recording: methods (bank, cash, check, card, other)
- **S10.6** Partial payment → status=partially_paid, remaining balance
- **S10.7** Overpayment → credit balance
- **S10.8** Payment reversal (if exposed)
- **S10.9** Aging report AR
- **S10.10** Income statement per property
- **S10.11** Cash flow statement
- **S10.12** Rent roll export
- **S10.13** Owner statement (flag — missing)
- **S10.14** Chart of accounts: default accounts loaded
- **S10.15** Manual journal entry (if present)
- **S10.16** QuickBooks/Xero export (flag — missing)
- **S10.17** Negative: Leasing agent attempts record-payment → 403

### Suite 2.11 — Notifications & Real-time

- **S11.1** User A creates WO → User B (PM) receives in-app notification (WebSocket) in live session
- **S11.2** Unread count badge increments
- **S11.3** Mark all read → count zero
- **S11.4** Email notification on WO assigned (check backend log / mail catcher)
- **S11.5** Notification preferences per-user: toggle off WO assigned emails → verify no email
- **S11.6** Bulk announcement to segment → all recipients get entry
- **S11.7** Toast for critical event (emergency WO)

### Suite 2.12 — Reporting

- **S12.1** Main dashboard KPIs correct after data created
- **S12.2** Revenue trend chart 12m
- **S12.3** Property dashboard per-building
- **S12.4** Financial dashboard: Accountant can view, Viewer cannot
- **S12.5** CRM dashboard: pipeline funnel, conversion
- **S12.6** Maintenance dashboard: SLA compliance %
- **S12.7** Custom report builder: select columns, filter, group, aggregate
- **S12.8** Export CSV, Excel, PDF
- **S12.9** Schedule report: weekly → run manually → email delivered
- **S12.10** Dashboard cache invalidation after write event

### Suite 2.13 — Platform / Multi-tenant

- **S13.1** Org B cannot read Org A's buildings: direct API call with Org B session → empty/404
- **S13.2** Org B cannot read Org A's invoices, contacts, leases, WOs (one per module)
- **S13.3** File storage scoping: upload in A, fetch URL from B session → 403
- **S13.4** P9 multi-org switch: create data in A, switch to B → A data invisible
- **S13.5** Create custom field def in A → invisible in B
- **S13.6** API key created in A → cannot access B data
- **S13.7** Audit log: every write logs user+oldVal+newVal, visible to Admin+Owner only
- **S13.8** Audit log filter by user, by resource, by date
- **S13.9** Org settings change: currency, timezone, locale updates dashboard format

### Suite 2.14 — Subscription / Billing

Given billing is schema-only, test reachable pieces:

- **S14.1** Platform admin login at `/admin-login` → admin dashboard
- **S14.2** Platform admin creates/lists Plans (Starter, Professional, etc.)
- **S14.3** Plan feature matrix visible (per seed-plans entitlements)
- **S14.4** Assign org to Plan → Subscription row created
- **S14.5** Feature-flag gating: Starter org attempts `property.csv-import` → blocked with upgrade prompt
- **S14.6** Upgrade org to Professional → gated features unlock immediately
- **S14.7** Downgrade → features re-gate
- **S14.8** Usage limits: Starter limit 10 units → attempt 11th → blocked
- **S14.9** Billing cycle trigger: manual run subscription invoice job (if exposed)
- **S14.10** Subscription invoice list in org billing page
- **S14.11** Flag missing: no Stripe checkout, no payment method UI, no webhook handlers, no proration

### Suite 2.15 — Security / Guard Edge Cases

- **S15.1** CSRF: POST without CSRF token → 403 (if Better Auth enforces)
- **S15.2** SQL injection: `' OR 1=1` in search → no crash, no data leak
- **S15.3** XSS: `<script>` in building name → rendered escaped
- **S15.4** Rate limiting on auth: 6 wrong passwords in row → lockout
- **S15.5** Session fixation: change password → all other sessions revoked
- **S15.6** IDOR: Owner A guesses Org B's building ID in URL → 404
- **S15.7** Mass-assignment: POST with extra `organizationId=otherOrg` → ignored or rejected
- **S15.8** JWT/cookie tamper → 401
- **S15.9** Uploaded file type check: upload .exe → rejected
- **S15.10** File size limit enforced

### Suite 2.16 — Internationalization / UX

- **S16.1** Language switcher (en / am / etc.) → routes render translated
- **S16.2** Date/number formatting per org timezone+currency
- **S16.3** Responsive: mobile width 375px → nav collapses, tables scroll
- **S16.4** Dark mode toggle

### Suite 2.17 — Performance smoke

- **S17.1** Dashboard loads < 2s with 100 units + 50 leases
- **S17.2** Property list page < 2s with 1000 units (seed helper)
- **S17.3** No console errors on any visited page
- **S17.4** No 500 errors in API logs during run

---

## 3. Test Harness Design

### 3.1 Folder layout (if Option A picked)

```
apps/web/e2e/
├── playwright.config.ts
├── fixtures/
│   ├── auth.ts          # Login helpers, signup helpers, role setup
│   ├── org.ts           # Create org + invite members at all roles
│   ├── data-seed.ts     # Create buildings, leases, contacts via UI or API
│   └── personas.ts      # 10 personas factory
├── pages/               # Page-Object-Model
│   ├── LoginPage.ts
│   ├── SignupPage.ts
│   ├── CreateOrgPage.ts
│   ├── DashboardPage.ts
│   ├── PropertyPage.ts
│   ├── UnitPage.ts
│   ├── LeasePage.ts
│   ├── MaintenancePage.ts
│   ├── ProcurementPage.ts
│   ├── CrmPage.ts
│   ├── SalesPage.ts
│   ├── FinancePage.ts
│   ├── SettingsPage.ts
│   └── AdminPage.ts
├── suites/
│   ├── 01-auth.spec.ts
│   ├── 02-org.spec.ts
│   ├── 03-rbac.spec.ts       # matrix-driven (data-driven)
│   ├── 04-property.spec.ts
│   ├── 05-lease.spec.ts
│   ├── 06-maintenance.spec.ts
│   ├── 07-procurement.spec.ts
│   ├── 08-crm.spec.ts
│   ├── 09-sales.spec.ts
│   ├── 10-finance.spec.ts
│   ├── 11-notifications.spec.ts  # multi-context realtime
│   ├── 12-reporting.spec.ts
│   ├── 13-tenant-isolation.spec.ts
│   ├── 14-billing.spec.ts
│   ├── 15-security.spec.ts
│   ├── 16-i18n.spec.ts
│   └── 17-perf.spec.ts
└── utils/
    ├── api-client.ts    # Thin wrapper for direct API calls (assertions + seeding)
    ├── mailcatcher.ts   # Stub: read queued emails from API
    └── cleanup.ts       # Soft-cleanup via prefix-based deletion
```

### 3.2 Playwright config highlights

- `projects` per browser (chromium, firefox) — start chromium-only
- `workers: 4` — parallel
- `retries: 1`
- Traces on retain-on-failure, video on retain-on-failure
- Global setup: check server health, run seed-plans once
- `storageState` per persona saved after first login for reuse

### 3.3 Multi-session pattern

```ts
test('realtime: PM sees new WO from Admin', async ({ browser }) => {
  const adminCtx = await browser.newContext({ storageState: 'auth/admin.json' });
  const pmCtx    = await browser.newContext({ storageState: 'auth/pm.json' });
  const adminPg  = await adminCtx.newPage();
  const pmPg     = await pmCtx.newPage();
  await pmPg.goto('/maintenance');
  await adminPg.goto('/maintenance/new');
  await adminPg.fill('#title', 'Realtime test');
  await adminPg.click('button:has-text("Create")');
  await expect(pmPg.locator('[data-toast]')).toContainText('new work order');
});
```

### 3.4 Data-driven RBAC matrix

Single `.spec.ts` iterates a JSON matrix of [persona, resource, action, expected]. Each produces one test. 80+ generated tests from one file.

---

## 4. Execution Plan

1. **User approval of plan** (this doc)
2. **Install Playwright** (`pnpm --filter web add -D @playwright/test` + `pnpm --filter web exec playwright install chromium`)
3. **Seed database**: reset + seed super admin + seed plans
4. **Start servers** — user confirms running
5. **Write fixtures + page objects** — ~1 day
6. **Write suites 1→17** — ~2 days (parallelizable by suite)
7. **First dry run** → fix flakes + selectors
8. **Produce test report** — pass/fail + screenshots + list of flagged gaps (features not yet implemented vs spec)
9. **Optional: CI integration** — GitHub Actions job

---

## 5. Deliverables

- `apps/web/e2e/` full harness + suites
- `docs/E2E_TEST_REPORT.md` — run results, pass/fail, gap list
- `playwright-report/` HTML report (generated, git-ignored)
- Screenshots + traces on failures

---

## 6. Risks / Caveats

- **Billing flow** mostly untestable until Stripe wired — will test plan CRUD + feature gating only
- **Emails** need capture: either use mailhog container, API log peek, or set `EMAIL_DRIVER=stub` and read from DB
- **Real-time assertions** fragile on slow CI — need sensible timeouts
- **CSV import** feature-flagged off, skip test
- **Shared dev DB** — prefix-based cleanup recommended to avoid polluting user data
- **Audit findings already surfaced gaps** — some E2E tests will fail by design, documenting what's missing

---

## 7. Open Questions for User

1. Approve Option A (install Playwright) — yes/no
2. Test against shared dev DB or stand up `propflow_test` DB?
3. Email capture strategy: mailhog / DB stub / skip?
4. Should I pre-install Playwright + seed plans now, or wait?
5. Any role behavior you want re-defined before matrix test runs? Example: current spec says Accountant can `procurement:approve` — matches your intent?
6. Billing — test what exists now (plans + feature gating) or wait until Stripe landed?
7. Preferred language for i18n smoke test (en + am default)?

---

Ready to execute once user confirms decisions above.

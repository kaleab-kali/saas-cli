# EIMS SaaS Template Implementation Plan

This is the implementation plan for making the generated SaaS template
able to include the V3 EIMS architecture cleanly.

Controlling architecture reference:

- `docs/EIMS_FINAL_AGREED_SAAS_ARCHITECTURE_PLAN_V3.md`

This document is about the template and generated project implementation.
It does not replace V3. It translates V3 into concrete scaffold work.

## 1. Implementation Position

EIMS should be generated as an optional domain starter pack, not forced
into every SaaS project by default.

Reason:

- Not every SaaS needs Ethiopian EIMS.
- The EIMS module is compliance-heavy and adds large schema, UI, tests,
  operational docs, and onboarding flows.
- The base template should stay clean for CRM, booking, AI SaaS,
  marketplace, helpdesk, and other non-tax-specific products.

Final target:

```bash
create-vyllion-saas my-restaurant --starter restaurant --starter eims

# or after project creation
create-vyllion-saas add starter eims
```

The EIMS starter pack should generate:

- API modules.
- Web features and routes.
- Prisma models.
- Permissions and feature keys.
- Seeds.
- Phase 0 test assets.
- Acceptance/API/E2E/performance/security tests.
- Deployment and compliance docs.

## 2. What Stays Always in the Base Template

The existing template already has these foundations and they should stay
generic:

```text
apps/api/src/modules/
  admin
  api-key
  audit-log
  auth
  billing
  health
  notification
  organization-settings
  reporting
  role
  security-settings
  team
  upload

apps/
  api-tests
  e2e
  acceptance
  performance
  security
  ai-eval
```

Base template keeps:

- Application-level tenant isolation.
- Custom roles.
- Plan/entitlement system.
- Billing and subscription state guards.
- Team/member management.
- File uploads.
- Audit logging.
- Metrics.
- Notifications.
- Testing apps.

The base template does **not** get all EIMS tables/routes by default.

## 3. EIMS Starter Pack Output

When EIMS is selected, scaffold these API modules:

```text
apps/api/src/modules/
  invoicing/
    domain/
    application/
    infrastructure/
    presentation/
    invoicing.module.ts

  eims/
    setup/
    submission/
    receipts/
    compliance/
    shared/
      constants/
      lookups/
      schemas/
      client/
      signing/
      canonicalization/
      crypto/
      queues/
      errors/
      printing/
      notifications/
```

Scaffold these web features:

```text
apps/web/src/features/
  invoicing/
  eims/

apps/web/src/routes/_authenticated/
  invoices/
  receipts/
  eims/
    setup.tsx
    enterprises.tsx
    establishments.tsx
    sources.tsx
    credentials.tsx
    certificates.tsx
    submissions.tsx
    bulk.tsx
    compliance.tsx

apps/web/src/routes/admin/eims/
  index.tsx
  tenants.tsx
  failures.tsx
  certificates.tsx
  resources.tsx
  compliance.tsx
```

Scaffold these test assets:

```text
apps/api-tests/bruno/EIMS-Phase0/
apps/api-tests/tests/eims.spec.ts
apps/e2e/tests/eims.spec.ts
apps/acceptance/features/eims.feature
apps/performance/k6/eims-submit.js
apps/performance/k6/eims-bulk.js
apps/security/scripts/eims-security-smoke.mjs
```

Scaffold these docs:

```text
docs/EIMS_SETUP_GUIDE.md
docs/EIMS_PHASE0_RUNBOOK.md
docs/EIMS_VAULT_RUNBOOK.md
docs/EIMS_COMPLIANCE_EVIDENCE.md
docs/EIMS_TENANT_ONBOARDING.md
docs/EIMS_DR_RUNBOOK.md
```

## 4. Schema Implementation

Add Prisma models in a focused EIMS block. Do not scatter them across
unrelated modules.

Minimum schema groups:

```text
Branch/source:
  EimsEnterprise
  EimsEstablishment
  EimsSourceSystem
  UserEstablishmentAssignment
  UserSourceSystemAssignment

Invoicing:
  TaxInvoice
  TaxInvoiceLine
  TenantBuyer

Submission:
  EimsSourceSystemCounter
  EimsCounterReservation
  EimsSubmission
  EimsBulkBatch
  EimsBulkBatchItem

Credentials/certificates:
  EimsCredential
  EimsCertificate

Receipts/cancellation:
  EimsReceipt
  EimsCancellation

Compliance:
  EimsAuditEvent
  EimsLookupValue
  EimsComplianceExport
  NotificationLog
```

Rules:

- Every table includes `organizationId`.
- EIMS branch/source tables also include `enterpriseId`,
  `establishmentId`, or `sourceSystemId` where relevant.
- Use Prisma `Decimal`/PostgreSQL `numeric` for money and quantity.
- Keep accepted invoices immutable through service-level rules and tests.
- Add targeted RLS only to the V3 table list.

## 5. Permissions and Feature Keys

Patch `apps/api/src/modules/auth/permissions.ts` with EIMS resources:

```text
eims-enterprise
eims-establishment
eims-source
eims-credential
eims-certificate
eims-submission
eims-bulk
eims-compliance
invoice
receipt
```

Patch billing feature keys with:

```text
eims.enabled
eims.enterprises
eims.establishments
eims.source-systems
eims.monthly-invoices
eims.bulk-registration
eims.offline-mode
eims.compliance-export
eims.api-requests-per-minute
eims.retention-months
```

Plan enforcement points:

- Creating enterprise/establishment/source.
- Submitting invoice.
- Bulk registration.
- Offline mode.
- Compliance export.
- Per-tenant EIMS rate limit.

## 6. Implementation Phases

### Phase 0: Template Wiring

Goal: the CLI can add EIMS files without breaking the generated project.

Tasks:

- Add `eims` to starter pack registry.
- Make starter pack idempotence checks strict.
- Generate API module folders.
- Generate web feature/route folders.
- Patch `AppModule`.
- Patch auth permission registry.
- Patch feature key registry.
- Patch seed plans.
- Patch docs index/README references.
- Add EIMS env variables to `.env.example`.

Exit criteria:

- New project scaffolds successfully with `--starter eims`.
- Existing generated project can run `add starter eims`.
- `pnpm typecheck` passes.

### Phase 1: Local Domain Foundation

Goal: compile-safe EIMS domain scaffolding without real EIMS network
calls.

Tasks:

- Add Prisma models.
- Add migrations/db push path.
- Add `InvoicingModule`.
- Add `EimsModule` parent with internal submodules.
- Add `CanonicalInvoice` interface.
- Add lookup constants and lookup API endpoints.
- Add buyer/government buyer directory.
- Add branch/source assignment services.
- Add branch context resolver.
- Add DTOs and validators.
- Add seed data for lookup values.

Exit criteria:

- `pnpm db:generate` passes.
- `pnpm typecheck:api` passes.
- Lookup API returns seeded values.
- Branch/source permission unit tests pass.

### Phase 2: Phase 0 Layer A Assets

Goal: local proof tools exist before sandbox credentials arrive.

Tasks:

- Add local signing experiment scripts.
- Add canonicalization tests.
- Add date/time format tests.
- Add decimal precision tests.
- Add counter reservation concurrency tests.
- Add `EIMS_SIGNING_CONFIG.lock.example.json`.
- Add report output path under `scripts/phase0/reports/`.
- Add Bruno Phase 0 skeleton.

Exit criteria:

- `pnpm test:api` includes EIMS unit tests.
- `pnpm test:property` covers decimal/tax invariants.
- Local Phase 0 scripts run without MoR credentials.
- Phase 0 report can be generated locally.

### Phase 3: Counter, Queue, and State Machine

Goal: safe submission mechanics before real EIMS calls.

Tasks:

- Add per-source BullMQ queue naming.
- Add `EimsSourceSystemCounter`.
- Add `EimsCounterReservation`.
- Add reservation lifecycle:
  - `reserved`
  - `submitting`
  - `accepted`
  - `rejected_reusable`
  - `rejected_consumed`
  - `unknown`
  - `manual_review`
- Add previous-IRN chain handling.
- Add source queue blocking on unknown submissions.
- Add reconciliation job interface.
- Use fake/mock EIMS client first.

Exit criteria:

- Race-condition tests prove no duplicate counter reservations.
- Unknown submission blocks only the affected source.
- Other source queues continue normally.
- Audit events are written for reservation transitions.

### Phase 4: Signing and Secrets Boundary

Goal: signing abstraction exists without exposing private keys.

Tasks:

- Add `SigningProvider` interface.
- Add `LocalSigningProvider` for local/dev only.
- Add `VaultSigningProvider` shell with clear configuration errors.
- Add field-level encryption service for EIMS credentials/PII.
- Add credential redaction middleware/log tests.
- Add certificate metadata model and expiry job.
- Add Vault runbook docs.

Exit criteria:

- No controller handles raw private keys.
- Local signing tests pass.
- Vault unavailable path returns retryable operational failure.
- Secret redaction tests pass.

### Phase 5: UI and Onboarding Wizard

Goal: tenant can configure EIMS setup through UI shell.

Tasks:

- Add EIMS setup routes.
- Add enterprise form.
- Add establishment/branch form.
- Add source system form.
- Add credential form with redacted display.
- Add certificate upload metadata UI.
- Add setup progress component.
- Add branch switcher.
- Add branch health cards.
- Add admin EIMS dashboard shell.

Exit criteria:

- Playwright smoke covers onboarding route navigation.
- Branch manager cannot see other branch invoices.
- Cashier sees only assigned source system.
- Admin can view cross-tenant EIMS status without secret leakage.

### Phase 6: Print, Receipt, Cancellation, Notification

Goal: full local business flow exists with mock EIMS.

Tasks:

- Add compact thermal print renderer.
- Add A4 print renderer.
- Add pending-offline print marker.
- Add receipt model/service.
- Add cancellation model/service.
- Add cancellation reason/remark validation.
- Add buyer notification service abstraction.
- Reuse existing email/notification module.
- Add SMS provider interface, but keep provider keys optional.

Exit criteria:

- PDF/text extraction tests confirm mandatory print fields.
- Pending print cannot be confused with accepted QR.
- Cancellation remark is required for reason `4`.
- Notification failure does not block invoice acceptance.

### Phase 7: Targeted RLS and Audit Evidence

Goal: compliance-grade isolation exists only where needed.

Tasks:

- Add RLS SQL migration snippets for EIMS tables.
- Add RLS-aware transaction helper.
- Add background job tenant-context helper.
- Add hash-chained `EimsAuditEvent`.
- Add DB trigger to reject update/delete on audit table.
- Add compliance evidence export skeleton.

Exit criteria:

- RLS tests prove cross-tenant reads fail.
- Background jobs set `app.organization_id`.
- Audit hash chain integrity test passes.
- Compliance export includes schema, RLS policy list, and audit sample.

### Phase 8: Sandbox Integration Layer

Goal: real EIMS integration is enabled only after Phase 0 Layer B.

Tasks:

- Add EIMS HTTP client.
- Add auth/token refresh.
- Add register/cancel/verify/receipt/bulk clients.
- Add strict sandbox/production environment separation.
- Add callback endpoint skeleton.
- Add error classification catalog.
- Add Phase 0 Layer B Bruno requests.
- Add `EIMS_SIGNING_CONFIG.lock.json` generation after proof.

Exit criteria:

- Sandbox credentials can run Bruno Phase 0.
- Real accepted IRN can be stored.
- Signing/canonicalization config is locked.
- Unknown behavior is documented in Phase 0 report.

### Phase 9: Test and Documentation Hardening

Goal: generated project teams know how to run and validate EIMS.

Tasks:

- Update `template/docs/TESTING_GUIDE.md` with EIMS commands.
- Add EIMS acceptance tests.
- Add k6 EIMS mock load test.
- Add security smoke tests for secrets, auth, and RLS.
- Add mutation tests for validators/counter/error classification.
- Add tenant onboarding docs.
- Add founder paperwork checklist.

Exit criteria:

- `pnpm test:smoke` still passes without MoR credentials.
- `pnpm test:eims:local` passes without MoR credentials.
- `pnpm test:eims:sandbox` is documented and skipped unless env exists.
- Documentation explains install, setup, testing, and production readiness.

## 7. New Dependency Impact

Do not install these until the implementation phase that needs them.

Already present in the template:

```text
bullmq
ioredis
pdfkit
prom-client
nodemailer
zod
fast-check
Stryker
Bruno CLI
Playwright
k6 wrappers
security wrappers
```

Likely new dependencies:

```text
decimal.js
  Needed if Prisma Decimal alone is not enough for domain math.

qrcode
  Needed to render QR images from EIMS signed QR payload or pending
  marker data.

speakeasy or otplib
  Needed only if Better Auth two-factor plugin is not already enough.

hashicorp vault client or small HTTP wrapper
  Needed for Vault Transit signing.

pdf-parse or equivalent
  Needed only if print tests extract PDF text directly.
```

Decision rule:

- Prefer existing dependencies first.
- Add new dependency only when a testable feature requires it.
- Install with pinned exact versions, no `^`.
- Tell the user before adding any dependency.

## 8. What Not to Implement in the Template

Do not hardcode:

- MoR production credentials.
- Sandbox credentials.
- Real certificate/private key.
- Bank guarantee files.
- Tenant-specific TIN/sub-TIN.
- EIMS signing algorithm final value before Phase 0 Layer B.

Do not auto-install:

- Vault on the developer machine.
- k6/nuclei/gitleaks/osv external CLIs.
- Any cloud provider SDK unless explicitly selected.

Do not make every SaaS EIMS-first:

- EIMS stays optional through starter pack.
- Normal SaaS signup stays normal.
- EIMS onboarding begins after tenant chooses/needs EIMS.

## 9. Commands to Add

Template-level scripts:

```json
{
  "test:eims:local": "pnpm --filter api test -- --runTestsByPath src/modules/eims/**/*.spec.ts",
  "test:eims:phase0": "pnpm --filter api-tests test:bruno -- EIMS-Phase0",
  "test:eims:sandbox": "pnpm --filter api-tests test:eims:sandbox",
  "phase0:eims:local": "pnpm --filter api exec tsx scripts/phase0/layer-a/run-all.ts",
  "phase0:eims:sandbox": "pnpm --filter api-tests test:eims:sandbox"
}
```

Keep sandbox commands env-gated:

```text
If EIMS_SANDBOX_URL or EIMS_CLIENT_ID is missing:
  skip with clear message.
```

## 10. Implementation Checklist

Before coding:

- Confirm V3 is the current reference.
- Confirm EIMS should be optional starter pack.
- Confirm no new dependency installation without approval.
- Confirm Phase 0 Layer A first, not real EIMS API first.

During coding:

- Keep EIMS constants under `apps/api/src/modules/eims/shared`.
- Keep web lookup data fetched from API.
- Keep EIMS module isolated from business verticals.
- Keep branch/source context mandatory for taxable business events.
- Keep submission through per-source queue.
- Keep RLS targeted.

Before marking done:

- Scaffold a sample project with EIMS starter.
- Run `pnpm install`.
- Run `pnpm db:generate`.
- Run `pnpm typecheck`.
- Run `pnpm test:smoke`.
- Run EIMS local tests.
- Run Playwright UI flow for setup pages.
- Confirm no placeholder secrets are committed.
- Confirm docs link back to V3.

## 11. Immediate Next Work

The first implementation batch should be small and verifiable:

1. Add EIMS starter-pack entry to the CLI.
2. Generate empty module/route/test/doc skeletons.
3. Patch permissions and feature keys.
4. Add EIMS docs and env examples.
5. Scaffold a sample project and run typecheck.

After that, implement Phase 1 domain foundation.

This avoids a large risky rewrite and gives a clean checkpoint before
adding schema, queues, signing, and UI.

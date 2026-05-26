# EIMS V3 Scaffold Test Report

Date: 2026-05-26

## Generated Project Tested

Generated project:

```text
C:\Users\kali\Desktop\novek\testing\vyllion-eims-v3-api-ui-proof
```

Generation command:

```bash
node packages/cli/bin/index.js C:\Users\kali\Desktop\novek\testing\vyllion-eims-v3-api-ui-proof --yes
```

Dependency install command:

```bash
cd C:\Users\kali\Desktop\novek\testing\vyllion-eims-v3-api-ui-proof
pnpm install
```

## Generated Project Full Gate

Command:

```bash
pnpm test:eims:mock
```

Result: PASS

What ran inside the generated project:

```text
pnpm db:generate
pnpm lint
pnpm typecheck
pnpm test:eims:local
pnpm phase0:eims:local
pnpm test:eims:api
pnpm test:eims:phase0
pnpm test:eims:ui
```

Detailed generated-project results:

```text
Prisma generate: PASS
Biome lint: PASS, 505 files checked
API typecheck: PASS
Web typecheck: PASS
Backend EIMS unit tests: PASS, 5 suites / 13 tests
Phase 0 Layer A local signing/canonicalization smoke: PASS
Backend API EIMS mock contract tests: PASS, 8 tests
Bruno EIMS Phase 0 mock collection: PASS, 6 EIMS requests / 7 tests
Frontend EIMS browser tests via backend mock API: PASS, 6 tests
  - desktop tenant routes: PASS
  - desktop admin routes: PASS
  - mobile tenant routes: PASS
  - mobile admin routes: PASS
```

Visible headed UI command executed against the generated project:

```bash
pnpm --filter e2e exec playwright test -c playwright.eims.config.ts tests/eims-mock.spec.ts --headed --project=chromium
```

Result: PASS, 3 Chromium headed tests.

## Scaffold Structure Verification

Command:

```bash
pnpm test:eims:scaffold
```

Result: PASS

The verifier performs 191 explicit checks against the generated project.

It checks:

```text
apps/api/src/modules/eims/admin/application
apps/api/src/modules/eims/admin/presentation
apps/api/src/modules/eims/compliance/application
apps/api/src/modules/eims/compliance/presentation
apps/api/src/modules/eims/receipts/application
apps/api/src/modules/eims/receipts/presentation
apps/api/src/modules/eims/setup/application
apps/api/src/modules/eims/setup/domain
apps/api/src/modules/eims/setup/infrastructure
apps/api/src/modules/eims/setup/presentation
apps/api/src/modules/eims/shared/client
apps/api/src/modules/eims/shared/constants
apps/api/src/modules/eims/shared/lookups
apps/api/src/modules/eims/shared/mock
apps/api/src/modules/eims/shared/presentation
apps/api/src/modules/eims/submission/application
apps/api/src/modules/eims/submission/domain
apps/api/src/modules/eims/submission/presentation
apps/api/src/modules/invoicing/domain
apps/web/src/features/eims
apps/web/src/routes/_authenticated/eims
apps/web/src/routes/admin/eims
apps/api-tests/bruno/EIMS-Phase0
apps/api-tests/tests/eims-v3-mock.spec.ts
apps/e2e/tests/eims-mock.spec.ts
```

It also checks generated `apps/api/src/app.module.ts` imports and registers:

```text
InvoicingModule
EimsModule
```

It checks Prisma contains the V3 models:

```text
EimsEnterprise
EimsEstablishment
EimsSourceSystem
EimsCredential
EimsCertificate
EimsSourceSystemCounter
EimsCounterReservation
UserEstablishmentAssignment
UserSourceSystemAssignment
TenantBuyer
TaxInvoice
TaxInvoiceLine
EimsSubmission
EimsReceipt
EimsCancellation
EimsAuditEvent
EimsNotificationLog
```

## Backend Mock API Data Verified

The generated-project verifier starts the generated backend mock API and checks
actual response data, not only status codes.

Verified tenant-side API data:

```text
GET /api/v1/eims/overview
  mode = mock
  enterprise TIN = 10 digits
  sub-TIN = 0074136947-01
  approved source exists
  pending MoR approval source exists
  last accepted counter = 128
  sandbox blocker is explicit

GET /api/v1/eims/lookups/*
  document types: INV, CRE, DEB, INT, RTN, FIN, MIX, INC, PRF, OVD
  transaction types: B2B, B2C, B2G, G2B, G2C
  source system types: POS, ERP, CRM, SYS, MAN, EFD
  cancellation reasons: 1, 2, 3, 4, 6
  tax codes: VAT15, VAT0, VATEX, TOT2, TOT10, EXC5, EXC10
  payment modes: CASH, CHEQUE, CPO, Local Bank Transfer, SWIFT, Wire Transfer
  units: PCS, KG, L, SVC, NT
  nature of supply: Goods, Service
  regions: 14, 15, 4
  CRE requires related document
  B2C buyer TIN is optional
  MAN does not require item code
  reason 4 requires remark
  reason 6 is marked mock-observed/unconfirmed

GET /api/v1/eims/submissions
  accepted
  pending_offline
  failed_retryable
  unknown_submission
  offline invoice has no official IRN or ackDate

POST /api/v1/eims/submissions/mock-submit
  preserves document number
  returns accepted state
  returns backend mock IRN

GET /api/v1/eims/credentials
  tested lifecycle
  api key/password/client secret/refresh token configured flags
  raw secrets are not returned

GET /api/v1/eims/certificates
  Vault Transit provider
  vault-generated CSR strategy
  expiry status

GET /api/v1/eims/branch-health
  Bole Branch health
  MoR approval alert

GET /api/v1/eims/buyers
  business buyer
  government buyer
  10-digit buyer TIN shape

GET /api/v1/eims/bulk
  /api/v1/bulkInvoice candidate endpoint
  conversationId
  callback state
  item counts reconcile
  15-minute reconciliation threshold

GET /api/v1/eims/cancellations
  reason code 4
  required remark
  cancellation limit state

GET /api/v1/eims/print-layouts
  compact thermal layout
  A4 layout
  QR source is EIMS accepted signedQR only

GET /api/v1/eims/notifications
  Africa's Talking SMS provider
  AWS SES email provider

GET /api/v1/eims/receipts
  sales receipt has RRN
  withholding draft has no RRN

GET /api/v1/eims/compliance/evidence
  includes Phase 0 Layer A
  includes targeted RLS evidence item
```

Verified super-admin API data:

```text
GET /api/v1/admin/eims/overview
  exposes failure code 7015
  classifies 7015 as rule_error

GET /api/v1/admin/eims/resources
  exposes paused_pending_approval queue
  exposes signing provider state
```

## UI Routes Verified

The Playwright EIMS UI tests run against the backend mock API and wait for the
specific backend responses before checking page data.

Tenant routes verified on desktop and mobile:

```text
/eims
/eims/setup
/eims/enterprises
/eims/establishments
/eims/sources
/eims/credentials
/eims/certificates
/eims/submissions
/eims/receipts
/eims/bulk
/eims/compliance
```

Super-admin routes verified on desktop and mobile:

```text
/admin/eims
/admin/eims/tenants
/admin/eims/failures
/admin/eims/certificates
/admin/eims/resources
/admin/eims/compliance
```

## Template Source Full Gate

Command:

```bash
cd template
pnpm test:eims:mock
```

Result: PASS

Template-source results:

```text
Prisma generate: PASS
Biome lint: PASS, 505 files checked
API typecheck: PASS
Web typecheck: PASS
Backend EIMS unit tests: PASS, 5 suites / 13 tests
Phase 0 Layer A local signing/canonicalization smoke: PASS
Backend API EIMS mock contract tests: PASS, 8 tests
Bruno EIMS Phase 0 mock collection: PASS, 6 EIMS requests / 7 tests
Frontend EIMS browser tests via backend mock API: PASS, 6 tests
```

## Still Not Proven Until Sandbox Access

These cannot be honestly marked complete until INSA/MoR sandbox access exists:

```text
Real MoR authentication and JWT refresh
Real SHA512withRSA padding/canonicalization acceptance
Real INSA certificate chain validation
Real IRN and official QR response
Real bulk endpoint URL/callback authentication
Real cancellation limits and reason-code 6 confirmation
Real PreviousIrn and counter gap behavior
Real offline delayed-submission acceptance window
Real withholding receipt validation rules
Real Vault Transit signing against an issued certificate
```

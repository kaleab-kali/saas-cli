# Generated SaaS EIMS Architecture

> Current controlling plan: see `docs/EIMS_FINAL_AGREED_SAAS_ARCHITECTURE_PLAN_V3.md`.
>
> This file is the earlier generated-SaaS architecture draft. The final agreed V3 plan adds the targeted-RLS strategy, first-class Enterprise/Establishment/SourceSystem branch management, source approval workflow, per-source invoice counter and PreviousIrn chain, Vault signing provider and operations runbook, offline pending-sync design, compact/A4 print layouts, bulk reconciliation, buyer notifications, compliance evidence package, legal/hosting evidence, existing tenant migration, and restaurant pilot rollout.

This document describes how EIMS/e-invoicing should be integrated **inside a SaaS project after it has already been scaffolded**.

This is not a CLI implementation plan. The goal is to define the folder structure, architecture, module boundaries, design patterns, workflows, and testing approach for any generated SaaS product that needs Ethiopian e-invoicing.

The same architecture should work for:

- Restaurant management.
- Hotel management.
- Supermarket/POS.
- Retail shop.
- CRM.
- Booking.
- Marketplace.
- Any other SaaS that must issue compliant invoices.

## 1. Core Architecture

Every SaaS should integrate EIMS through a shared invoicing and EIMS layer.

Business modules must not call MoR/EIMS directly.

```text
Business Module
restaurant / hotel / retail / supermarket / booking / CRM
        |
        v
Canonical Invoice Module
        |
        v
EIMS Integration Module
        |
        v
MoR / EIMS API
```

Examples:

```text
Restaurant order paid       -> canonical invoice -> EIMS submit
Hotel checkout completed    -> canonical invoice -> EIMS submit
Retail sale completed       -> canonical invoice -> EIMS submit
Supermarket POS sale paid   -> canonical invoice -> EIMS submit
Booking payment completed   -> canonical invoice -> EIMS submit
```

The business module decides **when** an invoice should be created.

The invoice module decides **whether the invoice is valid**.

The EIMS module decides **how to sign, submit, verify, cancel, retry, and store EIMS results**.

## 2. Main Design Rule

Every SaaS product should produce a single internal invoice format first.

```text
Business sale/order/folio/payment
    -> CanonicalInvoice
    -> EimsInvoicePayload
    -> signed EIMS request
    -> MoR/EIMS API
```

This keeps the system reusable across every vertical.

Bad design:

```text
restaurant/orders -> MoR API
hotel/folio       -> MoR API
retail/sales      -> MoR API
```

Good design:

```text
restaurant/orders -> invoicing -> eims -> MoR API
hotel/folio       -> invoicing -> eims -> MoR API
retail/sales      -> invoicing -> eims -> MoR API
```

## 3. Backend Folder Structure

Inside a generated SaaS project:

```text
apps/
  api/
    src/
      modules/
        invoicing/
          domain/
            entities/
              invoice.entity.ts
              invoice-line.entity.ts
              receipt.entity.ts
              buyer.entity.ts
              seller-profile.entity.ts
            value-objects/
              money.vo.ts
              tin.vo.ts
              vat-number.vo.ts
              tax-code.vo.ts
              document-number.vo.ts
              invoice-status.vo.ts
              transaction-type.vo.ts
            services/
              invoice-total.service.ts
              invoice-validation.service.ts
              tax-calculation.service.ts
              document-number.service.ts
            repositories/
              invoice.repository.ts
              receipt.repository.ts

          application/
            commands/
              create-invoice.handler.ts
              update-draft-invoice.handler.ts
              validate-invoice.handler.ts
              submit-invoice.handler.ts
              cancel-invoice.handler.ts
              verify-invoice.handler.ts
              register-sales-receipt.handler.ts
              register-withholding-receipt.handler.ts
            queries/
              list-invoices.handler.ts
              get-invoice.handler.ts
              list-receipts.handler.ts
              get-receipt.handler.ts
            dto/
              invoice.dto.ts
              receipt.dto.ts

          infrastructure/
            repositories/
              prisma-invoice.repository.ts
              prisma-receipt.repository.ts
            mappers/
              invoice.mapper.ts
              receipt.mapper.ts

          presentation/
            controllers/
              invoice.controller.ts
              receipt.controller.ts

          invoicing.module.ts

        eims/
          domain/
            entities/
              eims-source-system.entity.ts
              eims-credential.entity.ts
              eims-certificate.entity.ts
              eims-submission.entity.ts
              eims-bulk-batch.entity.ts
              eims-bulk-batch-item.entity.ts
            value-objects/
              eims-status.vo.ts
              irn.vo.ts
              source-system-number.vo.ts
              certificate-fingerprint.vo.ts
              eims-error.vo.ts
            services/
              eims-payload-validation.service.ts
            repositories/
              eims-source-system.repository.ts
              eims-credential.repository.ts
              eims-certificate.repository.ts
              eims-submission.repository.ts
              eims-bulk-batch.repository.ts

          application/
            commands/
              configure-eims-profile.handler.ts
              configure-source-system.handler.ts
              save-eims-credentials.handler.ts
              test-eims-credentials.handler.ts
              rotate-eims-credentials.handler.ts
              import-eims-certificate.handler.ts
              submit-eims-invoice.handler.ts
              cancel-eims-invoice.handler.ts
              verify-eims-invoice.handler.ts
              create-bulk-registration.handler.ts
              handle-bulk-callback.handler.ts
            queries/
              get-eims-setup-status.handler.ts
              list-source-systems.handler.ts
              list-eims-submissions.handler.ts
              get-eims-submission.handler.ts
              list-bulk-batches.handler.ts
            services/
              eims-submission.service.ts
              eims-certificate.service.ts
              eims-credential.service.ts
              eims-bulk.service.ts
              eims-compliance-export.service.ts
            dto/
              eims-profile.dto.ts
              eims-source-system.dto.ts
              eims-credential.dto.ts
              eims-certificate.dto.ts

          infrastructure/
            client/
              eims-auth.client.ts
              eims-invoice.client.ts
              eims-receipt.client.ts
            signing/
              json-canonicalizer.ts
              eims-signing.service.ts
            crypto/
              secret-encryption.service.ts
            queues/
              eims-submit.queue.ts
              eims-retry.queue.ts
              eims-bulk.queue.ts
              eims-certificate-expiry.queue.ts
            repositories/
              prisma-eims-source-system.repository.ts
              prisma-eims-credential.repository.ts
              prisma-eims-certificate.repository.ts
              prisma-eims-submission.repository.ts
              prisma-eims-bulk-batch.repository.ts
            mappers/
              eims-source-system.mapper.ts
              eims-credential.mapper.ts
              eims-certificate.mapper.ts
              eims-submission.mapper.ts

          presentation/
            controllers/
              eims-settings.controller.ts
              eims-submission.controller.ts
              eims-callback.controller.ts
              eims-admin.controller.ts

          eims.module.ts
```

## 4. Frontend Folder Structure

Inside the generated SaaS web app:

```text
apps/
  web/
    src/
      features/
        invoicing/
          api/
            invoice.hooks.ts
            receipt.hooks.ts
          components/
            InvoiceTable.tsx
            InvoiceDetailPanel.tsx
            InvoiceStatusBadge.tsx
            InvoiceLinesEditor.tsx
            ReceiptTable.tsx
          types/
            invoice.types.ts
            receipt.types.ts

        eims/
          api/
            eims-setup.hooks.ts
            eims-submission.hooks.ts
            eims-admin.hooks.ts
          components/
            EimsSetupWizard.tsx
            EimsSourceSystemTable.tsx
            EimsCredentialForm.tsx
            EimsCertificateStatus.tsx
            EimsSubmissionStatusBadge.tsx
            EimsSubmissionTimeline.tsx
            EimsBulkBatchTable.tsx
            EimsComplianceExportPanel.tsx
          types/
            eims.types.ts

      routes/
        _authenticated/
          invoices/
            index.tsx
            $invoiceId.tsx
          receipts/
            index.tsx
          eims/
            setup.tsx
            sources.tsx
            credentials.tsx
            certificates.tsx
            submissions.tsx
            bulk.tsx
            compliance.tsx

        admin/
          eims/
            index.tsx
            tenants.tsx
            failures.tsx
            certificates.tsx
            resources.tsx
```

## 5. Architecture Pattern

Use Clean Architecture with ports and adapters.

```text
domain
    Business rules only.
    No Prisma.
    No HTTP.
    No EIMS API client.
    No framework-specific code.

application
    Use cases.
    Commands.
    Queries.
    Transaction orchestration.

infrastructure
    Prisma repositories.
    HTTP clients.
    EIMS client.
    Crypto.
    Signing.
    Queues.

presentation
    REST controllers.
    Request DTOs.
    Guards.
```

The EIMS API is an external adapter.

The business SaaS should depend on the internal invoicing module, not on EIMS directly.

## 6. Module Responsibilities

### 6.1 Business Modules

Examples:

```text
restaurant/orders
hotel/folios
retail/sales
supermarket/pos-sales
booking/reservations
```

Responsibilities:

- Own business workflow.
- Create sale/order/folio/payment.
- Decide when an invoice should be created.
- Send invoice input to the invoicing module.
- Display business status to the user.

Must not:

- Store EIMS credentials.
- Sign EIMS payloads.
- Call MoR/EIMS API.
- Know EIMS token logic.
- Know certificate logic.

### 6.2 Invoicing Module

Responsibilities:

- Own canonical invoice data model.
- Validate invoice totals.
- Validate buyer/seller/tax/document rules.
- Own invoice lifecycle.
- Own receipt records.
- Expose `submitInvoice` use case.
- Keep invoices tenant-scoped.

Must not:

- Directly call MoR/EIMS.
- Store API keys/client secrets.
- Own external authentication tokens.

### 6.3 EIMS Module

Responsibilities:

- Own EIMS source systems.
- Own EIMS credentials.
- Own certificate metadata.
- Own private-key reference/signing.
- Convert canonical invoice to EIMS payload.
- Canonicalize JSON.
- Sign payload.
- Authenticate with EIMS.
- Submit, verify, cancel, and register receipts.
- Handle bulk registration and callbacks.
- Persist EIMS submission logs.
- Export compliance evidence.

Must not:

- Own restaurant/hotel/retail business rules.
- Let UI or controllers read private keys.
- Leak credentials in logs or API responses.

## 7. Tenant Data Model

Each tenant needs its own EIMS setup.

```text
Organization
  has many Users
  has many Members
  has many Branches
  has one EimsTaxpayerProfile
  has many EimsSourceSystems
  has many EimsCredentials
  has many EimsCertificates
  has many Invoices
  has many Receipts
  has many EimsSubmissions
```

Tenant-specific EIMS data:

```text
TIN
legal name
VAT number
seller email
seller phone
seller address
source system number
source system type
clientId
clientSecret
apiKey
certificate
private key reference
access token
refresh token
certificate expiry
source approval status
```

These must be stored per tenant/source, not as global environment variables.

Environment variables should only hold deployment-level config:

```env
EIMS_BASE_URL=
EIMS_ENV=sandbox
EIMS_CALLBACK_BASE_URL=
EIMS_ENCRYPTION_KEY=
EIMS_SIGNING_PROVIDER=local
```

## 8. Invoice Lifecycle

Use an explicit state machine.

```text
draft
validated
queued
submitting
accepted
rejected
failed_retryable
failed_final
verified
cancel_requested
cancelled
```

Rules:

- Draft invoices can be edited.
- Validated invoices can be submitted.
- Queued/submitting invoices should not be edited.
- Accepted invoices must not be edited or deleted normally.
- Accepted invoices should use correction, cancellation, credit note, or debit note flows.
- Rejected invoices can be corrected and resubmitted if allowed.
- Cancelled invoices must keep full audit history.

## 9. Submission Flow

```text
1. Business module creates sale/order/folio/payment.
2. Business module calls CreateInvoice.
3. Invoicing module creates draft canonical invoice.
4. Invoicing module validates totals, buyer, seller, tax, and document type.
5. SubmitInvoice checks permission, tenant, plan, source, credential, and certificate status.
6. EIMS module converts canonical invoice to EIMS payload.
7. EIMS module validates EIMS JSON schema.
8. EIMS module canonicalizes request JSON.
9. EIMS module signs request with tenant/source private key.
10. EIMS module attaches Base64 certificate.
11. EIMS module authenticates or refreshes EIMS token.
12. EIMS module submits to EIMS.
13. SaaS stores IRN, QR, signed invoice, ack date, and status.
14. SaaS records audit event and submission log.
15. SaaS notifies user if submission failed or requires action.
```

## 10. Bulk Flow

Bulk registration should be asynchronous.

```text
1. User selects invoices or system creates a batch.
2. Invoicing module validates all invoices.
3. EIMS module creates EimsBulkBatch.
4. EIMS module submits batch.
5. EIMS returns conversation ID.
6. System stores conversation ID.
7. EIMS callback or polling returns result.
8. Each invoice gets accepted/rejected status.
9. Failed invoices can be corrected or retried.
```

Bulk batch status:

```text
draft
submitted
processing
partially_accepted
accepted
failed
cancelled
```

## 11. Cancellation Flow

```text
1. User requests cancellation.
2. System checks permission.
3. System checks invoice is accepted and cancellable.
4. User provides reason code and remark.
5. EIMS module submits cancellation.
6. System stores cancellation response.
7. Audit event is recorded.
8. UI shows cancelled status.
```

Cancellation must never delete the original invoice record.

## 12. Receipt Flow

Sales receipt:

```text
1. Payment is collected.
2. Receipt is created against invoice IRN.
3. EIMS receipt payload is generated.
4. EIMS receipt is submitted.
5. RRN/QR/status is stored.
```

Withholding receipt:

```text
1. Withholding applies to invoice.
2. Withholding detail is calculated.
3. EIMS withholding receipt payload is generated.
4. Receipt is submitted.
5. Status is stored.
```

## 13. Certificate and Key Flow

Setup:

```text
1. Tenant enters taxpayer profile.
2. Tenant records source/system number.
3. System generates CSR helper data.
4. Tenant submits CSR/certificate request through the official process.
5. Tenant imports issued certificate.
6. System validates certificate metadata.
7. System enables invoice signing.
```

Runtime:

```text
1. EIMS submission requests certificate and key reference.
2. Signing service loads key securely.
3. Request JSON is canonicalized.
4. Signature is generated.
5. Signature and certificate are attached.
```

Rules:

- Private key must never be returned to the frontend.
- Private key must never be logged.
- Private key access should only exist in `EimsSigningService`.
- Certificate expiry must block submission.
- Certificate rotation must preserve old audit metadata.

## 14. Background Jobs

Use queues for unreliable or slow work.

```text
eims-submit
eims-retry
eims-bulk
eims-callback
eims-token-refresh
eims-certificate-expiry
eims-compliance-export
```

Job responsibilities:

- Retry transient EIMS failures.
- Process bulk callbacks.
- Poll bulk result if callback fails.
- Refresh tokens before expiry if needed.
- Notify about certificate expiry.
- Generate compliance exports.
- Record queue health for admin dashboard.

## 15. Permissions

Add EIMS and invoicing permissions.

```text
invoice:read
invoice:create
invoice:update-draft
invoice:submit
invoice:verify
invoice:cancel
invoice:export

receipt:read
receipt:create
receipt:submit

eims.profile:read
eims.profile:update
eims.source:read
eims.source:create
eims.source:update
eims.credential:read
eims.credential:create
eims.credential:rotate
eims.certificate:read
eims.certificate:import
eims.submission:read
eims.bulk:read
eims.bulk:create
eims.bulk:retry
eims.compliance:export
```

Suggested roles:

| Role | Access |
|---|---|
| Owner | Full tenant EIMS and invoicing access. |
| Admin | Manage setup, sources, credentials, certificates, invoices, receipts. |
| Accountant | Create, submit, verify, cancel invoices; manage receipts and exports. |
| Branch manager | Manage invoices for assigned branch/source. |
| Cashier | Create invoices/receipts from POS flow only. |
| Auditor | Read invoices, receipts, audit logs, and exports. |
| Viewer | Read-only where granted. |

The app should support custom roles by exposing these permissions in the role matrix.

## 16. Billing and Plan Enforcement

EIMS should be plan-gated server-side.

Feature keys:

```text
eims.enabled
eims.sources
eims.monthly-invoices
eims.bulk-registration
eims.receipts
eims.withholding-receipts
eims.compliance-export
eims.api-requests-per-minute
eims.retention-months
```

Enforcement points:

- Source creation checks source limit.
- Invoice submission checks monthly invoice limit.
- Bulk registration checks bulk feature.
- Compliance export checks export feature.
- API request rate checks plan rate limit.
- UI hides disabled features, but API remains the source of truth.

## 17. Admin Dashboard

Platform admin should see operational/compliance state, not secrets.

Admin dashboard should show:

```text
tenants missing EIMS setup
tenants with invalid credentials
tenants with expiring certificates
failed EIMS submissions
invoice volume per tenant
queue depth
EIMS API latency
EIMS API error rate
plan usage
storage usage
audit/export status
```

Admin must not see:

```text
clientSecret
apiKey
access token
refresh token
private key
raw certificate private material
```

## 18. Tenant UI

Tenant admin/settings UI should include:

```text
/settings/eims/profile
/settings/eims/sources
/settings/eims/credentials
/settings/eims/certificates
/eims/submissions
/eims/bulk
/eims/compliance
/invoices
/invoices/:invoiceId
/receipts
```

Setup wizard steps:

```text
1. Taxpayer profile
2. Source/system number
3. Credentials
4. Certificate
5. Test connection
6. Submit test invoice in sandbox
7. Compliance checklist
```

## 19. Vertical Usage

### 19.1 Restaurant

```text
Order paid
    -> CreateInvoice
    -> SubmitInvoice
    -> Store IRN/QR
    -> Print receipt/invoice
```

Special requirements:

- Table orders.
- Split bills.
- Service charge.
- Cashier shifts.
- Kitchen order flow.
- Refund/cancel flow.
- Branch/register to source system mapping.

### 19.2 Hotel

```text
Folio checkout completed
    -> CreateInvoice
    -> SubmitInvoice
    -> Attach IRN/QR to folio
```

Special requirements:

- Room folio.
- Guest/company billing.
- Deposits.
- Partial payments.
- Service charges.
- Checkout invoice.
- Cancellation/credit-note flow.

### 19.3 Supermarket

```text
POS sale paid
    -> CreateInvoice
    -> SubmitInvoice or queue
    -> Store IRN/QR
    -> Print receipt
```

Special requirements:

- High transaction volume.
- Barcode/products.
- Inventory.
- Cashier/register mapping.
- Returns.
- Offline/retry handling if approved.

### 19.4 Retail

```text
Sale completed
    -> CreateInvoice
    -> SubmitInvoice
    -> Store IRN/QR
```

Special requirements:

- B2B buyer TIN handling.
- B2C no-TIN handling where allowed.
- Returns.
- Branch/source mapping.

## 20. Testing Structure

Inside the generated SaaS:

```text
apps/
  api/
    src/
      modules/
        invoicing/
          **/*.spec.ts
        eims/
          **/*.spec.ts

  api-tests/
    tests/
      eims.spec.ts
    bruno/
      EIMS/

  e2e/
    tests/
      eims.spec.ts

  acceptance/
    features/
      eims.feature

  performance/
    k6/
      eims-submit.js
      eims-bulk.js

  security/
    scripts/
      eims-security-smoke.mjs
```

Required tests:

```text
tenant isolation
role permissions
plan enforcement
invoice validation
tax calculation
certificate expiry
credential redaction
private key access boundary
signature generation
single invoice submission
bulk invoice submission
bulk callback handling
invoice cancellation
invoice verification
sales receipt registration
withholding receipt registration
load/performance
security
mutation
property testing
```

## 21. Testing Commands

Expected commands inside the generated SaaS:

```bash
pnpm test:api
pnpm test:property
pnpm test:mutation
pnpm test:api:http
pnpm test:api:bruno
pnpm test:acceptance
pnpm test:e2e
pnpm test:load:k6
pnpm test:security
```

EIMS-specific examples:

```bash
pnpm test:api -- eims
pnpm test:api:http -- eims
pnpm test:e2e -- eims
pnpm test:acceptance -- eims
K6_API_BASE_URL=http://127.0.0.1:3000 pnpm test:load:k6:api
```

## 22. Monitoring

Expose EIMS metrics:

```text
eims_invoice_submissions_total
eims_invoice_accepts_total
eims_invoice_rejections_total
eims_invoice_cancellations_total
eims_receipt_submissions_total
eims_api_latency_ms
eims_retry_queue_depth
eims_bulk_batches_active
eims_certificate_expiring_total
eims_credentials_invalid_total
```

Use:

- Prometheus for metrics.
- Grafana for dashboards.
- Pino/Loki/plain log files for logs.
- Admin dashboard for SaaS operator visibility.

## 23. Source Document Mapping

The architecture is based on the supplied documents:

| Document | Used for |
|---|---|
| `EIMS_compliance_Draft.pdf` | EIMS auth, invoice registration, schema, signing, bulk, receipts, verification, cancellation, security. |
| `EimsCoreApiMockCollection2.postman_collection.json` | API endpoints, request fields, credential variables. |
| `certificate_guideline.pdf` / `.docx` | Private key, CSR, certificate, signing process. |
| `einvoice.cnf` | CSR subject shape: country, organization, system ID, TIN, SAN email. |
| `Certificate Request form v.1.docx` | Taxpayer/contact/system ID requirements. |
| `Self-onboarding and Source Registration Guide.pdf` | Source registration and approval workflow. |
| `MoR_BSP_Master.docx` | SaaS/cloud compliance checklist, credentials, auth, invoice/receipt tests, architecture model. |
| `compliance check list.pdf` | Security audit areas. |
| `Cybersecurity Audit minimum Requirements2.pdf` | Secure communication, access control, data protection, key management, update/security controls. |

## 24. Final Decision

The correct architecture for a generated SaaS is:

```text
apps/api/src/modules/invoicing
apps/api/src/modules/eims
apps/web/src/features/invoicing
apps/web/src/features/eims
```

The EIMS gateway should live inside the generated SaaS first.

A separate `eims-gateway` service should only be created later if multiple SaaS products need to share one hardened integration service.

The most important rule is:

```text
Business modules create canonical invoices.
Only the EIMS module talks to MoR/EIMS.
```

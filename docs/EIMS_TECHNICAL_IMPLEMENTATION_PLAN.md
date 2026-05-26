# EIMS Technical Implementation Plan

> Current implementation architecture plan: `docs/EIMS_FINAL_AGREED_SAAS_ARCHITECTURE_PLAN_V3.md`.
>
> This file is the broader template/compliance planning draft. Use the V3 generated-SaaS architecture plan as the controlling technical design for how each scaffolded SaaS integrates EIMS after project creation.

This document defines how `create-vyllion-saas` should become an EIMS-ready SaaS template, and how each generated SaaS product should integrate with Ethiopian e-invoicing without mixing tax-compliance code into restaurant, hotel, supermarket, or retail business logic.

This is a technical plan, not a legal certification. Final approval still depends on the Ministry of Revenues, INSA/security audit process, taxpayer/source onboarding, certificate issuance, and any BSP/provider agreement requirements that apply to the business model.

## 1. Source Documents Used

The plan is based on the local documents supplied for this review:

| Source | Evidence used |
|---|---|
| `EIMS_compliance_Draft.pdf` | EIMS process flows, authentication, single invoice registration, bulk invoice registration, schema structure, cancellation, verification, receipt registration, security. |
| `EimsCoreApiMockCollection2.postman_collection.json` | API surface for auth, token refresh, single/bulk register, single/bulk cancel, verification, sales receipts, withholding receipts, and required variables. |
| `certificate_guideline.pdf` and `certificate_guideline.docx` | Private key generation, CSR, certificate request, certificate integration, digital invoice signing. |
| `einvoice.cnf` | CSR configuration pattern: country `ET`, organization, organization unit, system ID in serial number, TIN in common name, email in SAN. |
| `Certificate Request form v.1.docx` | Contact, taxpayer, TIN, organization, and at least one System ID required for certificate request. |
| `Self-onboarding and Source Registration Guide.pdf` | Taxpayer portal signup, OTP, login credentials, 2FA, source registration, source approval workflow. |
| `MoR_BSP_Master.docx` | Master compliance checklist: credentials, API keys, client IDs, TIN, certificates, authentication/authorization, invoice registration, receipt registration, SaaS/cloud section, on-prem/POS/hardware sections, architecture model, legal/compliance sign-off. |
| `compliance check list.pdf` | INSA checklist areas: governance, device security, data protection, secure communication, access control, update mechanisms, physical security. |
| `Cybersecurity Audit minimum Requirements2.pdf` | Security requirements: secure boot, software integrity, data security, secure communication, access control, secure provisioning/key management, OTA/update handling, logging/audit. |
| `Commitment Form v1.1.docx` | Provider commitment concept: retesting when directive changes, implementing required improvements, onboarding taxpayers within a defined period, meeting administrative and technical requirements. |
| `Letter of Guarantee-after comment-V1.2.docx` | Possible provider/commercial onboarding requirement. Treat as legal/process evidence, not a software feature. |
| `buyer list .docx` and `Gov.t inst. list .docx` | Buyer/government buyer fields and sample records for seed/test data design. |

## 2. Current Scaffold Baseline

The current template is a strong base for SaaS infrastructure, but not yet an EIMS-compliant product by itself.

Existing scaffold capabilities that should be reused:

| Capability | Existing location | How EIMS should reuse it |
|---|---|---|
| Multi-tenant organization model | `apps/api/prisma/schema.prisma` and tenant context | Every invoice, certificate, source, branch, and credential must be scoped by `organizationId`. |
| Custom tenant roles | `apps/api/src/modules/role` and `/settings/roles` | Add EIMS/POS permissions and allow tenant-defined roles such as cashier, branch manager, accountant, auditor. |
| Platform admin roles | `apps/api/src/modules/admin` | Super admin can inspect tenant compliance/resource state but must not access private keys. |
| Billing, plans, entitlements | `apps/api/src/modules/billing` | Gate invoice volume, branch/source count, users, API requests, bulk registration, and advanced compliance exports. |
| API keys | `apps/api/src/modules/api-key` | Keep app API keys separate from EIMS credentials. Do not reuse app API keys as MoR/EIMS credentials. |
| Audit log | `apps/api/src/modules/audit-log` | Record compliance events: credential changes, certificate rotation, invoice submission, cancellation, source approval. |
| Notifications | `apps/api/src/modules/notification` | Notify certificate expiry, failed submission, callback failures, plan limit issues, source approval changes. |
| Background jobs | `apps/api/src/modules/admin` job monitor plus BullMQ support | Run retry queue, token refresh, bulk result polling, daily usage snapshots, certificate expiry checks. |
| Reporting/export | `apps/api/src/modules/reporting` | Export compliance evidence, invoice submission logs, IRN reports, failed invoice reports. |
| File/object storage | `apps/api/src/modules/upload` and shared storage | Store non-secret certificate files and generated evidence exports. Private keys need stronger handling. |
| Metrics/admin server dashboard | `/admin/server`, `/api/v1/metrics` | Track request rate, latency, failures, queue depth, EIMS error rate, invoice throughput. |
| Test apps | `apps/api-tests`, `apps/e2e`, `apps/acceptance`, `apps/performance`, `apps/security`, `apps/ai-eval` | Add EIMS-specific API, acceptance, browser, load, security, property, and mutation tests. |

Current gap: there is no dedicated EIMS domain, no invoice registration schema/domain, no EIMS API adapter, no certificate/key lifecycle, no source registration workflow, and no EIMS compliance evidence dashboard.

## 3. Target Architecture

The EIMS integration should be a reusable domain starter pack with a clean gateway boundary.

```text
Restaurant / Hotel / Retail / Supermarket SaaS
    |
    | creates business sale/order/folio/receipt
    v
Canonical Invoice Engine
    |
    | validates tax/business rules
    v
EIMS Gateway Module
    |
    | signs, authenticates, retries, submits, verifies
    v
MoR / EIMS API
```

The gateway should start as an embedded module inside each generated SaaS because the user wants local/VPS-first deployments. Later it can be extracted into a separate internal service if multiple apps or high volume justify it.

### 3.1 Embedded Module First

Use this for the initial template:

```text
apps/api/src/modules/eims
apps/web/src/features/eims
apps/web/src/routes/_authenticated/eims
apps/web/src/routes/admin/eims
```

Benefits:

- Easier local development.
- Easier VPS deployment.
- No extra service to operate.
- Reuses the existing auth, tenant, audit, billing, and testing system.

### 3.2 Optional External Gateway Later

Use this only after the embedded module is stable:

```text
eims-gateway service
    - owns signing and EIMS API integration
    - exposes internal API to generated SaaS apps
    - stores no business UI state
```

This is useful if several SaaS products must share one hardened integration service. It should not be the first implementation because it increases operational complexity.

## 4. Template-Level CLI Plan

The CLI should support e-invoicing as an optional starter pack, not as part of every generic SaaS app.

Target commands:

```bash
create-vyllion-saas my-app --yes
create-vyllion-saas add starter eims
create-vyllion-saas add starter restaurant --with-eims
create-vyllion-saas add starter hotel --with-eims
create-vyllion-saas add starter retail --with-eims
create-vyllion-saas add starter supermarket --with-eims
```

Rules:

- `eims` adds the shared tax/invoice/gateway domain.
- Vertical starters create business flows and call the invoice engine.
- Vertical starters must not directly call MoR/EIMS APIs.
- Each generated project stores tenant-specific EIMS credentials separately.
- Each generated project includes EIMS tests and docs.

Generated docs per project:

```text
docs/EIMS_SETUP.md
docs/EIMS_REQUIREMENTS_MATRIX.md
docs/EIMS_OPERATIONS.md
docs/EIMS_TESTING.md
docs/EIMS_SECURITY_EVIDENCE.md
docs/POS_VERTICAL_GUIDE.md
```

## 5. Per-SaaS Integration Model

Every generated SaaS should use the same EIMS core, but each tenant keeps its own legal and technical identity.

```text
Tenant A
    TIN A
    source/system numbers A
    certificate A
    EIMS client credentials A

Tenant B
    TIN B
    source/system numbers B
    certificate B
    EIMS client credentials B
```

The shared EIMS module provides the same code path for:

- Authentication.
- Token refresh.
- Invoice validation.
- Digital signing.
- Single invoice registration.
- Bulk invoice registration.
- Verification.
- Cancellation.
- Sales receipt registration.
- Withholding receipt registration.
- Status polling/callback handling.
- Retry and audit.

## 6. Domain Model

The EIMS starter should add these domain models. Names are proposed; final names should follow existing Prisma conventions.

### 6.1 Compliance Identity

```text
EimsTaxpayerProfile
    id
    organizationId
    tin
    legalName
    vatNumber
    email
    phone
    region
    zone
    woreda
    kebele
    city
    houseNumber
    status
    createdAt
    updatedAt
```

Purpose:

- Stores seller/taxpayer profile per tenant.
- Maps to seller fields visible in the Postman collection and EIMS schema.
- Supports buyer/government buyer seed data later.

### 6.2 Source System

```text
EimsSourceSystem
    id
    organizationId
    branchId
    systemNumber
    systemType
    displayName
    status
    approvalStatus
    approvedAt
    lastUsedAt
    createdAt
    updatedAt
```

Source evidence:

- `Self-onboarding and Source Registration Guide.pdf` says source systems are added in the portal and move through pending/back-office approval.
- `einvoice.cnf` uses the system ID as `serialNumber`.
- `Certificate Request form v.1.docx` requires at least one System ID.

### 6.3 EIMS Credentials

```text
EimsCredential
    id
    organizationId
    sourceSystemId
    clientIdEncrypted
    clientSecretEncrypted
    apiKeyEncrypted
    tokenEncrypted
    refreshTokenEncrypted
    tokenExpiresAt
    lastRotatedAt
    status
    createdAt
    updatedAt
```

Rules:

- Encrypt secrets at rest.
- Never log client secret, API key, access token, refresh token, certificate private key, or raw signing material.
- Keep app API keys separate from EIMS credentials.
- Audit every create/update/rotate/test action.

### 6.4 Certificate and Key Metadata

```text
EimsCertificate
    id
    organizationId
    sourceSystemId
    certificatePemEncrypted
    certificateFingerprint
    serialNumber
    commonNameTin
    subjectAltEmail
    validFrom
    validTo
    status
    uploadedAt
    rotatedAt
```

Private key handling:

```text
EimsPrivateKeyRef
    id
    organizationId
    sourceSystemId
    keyProvider
    keyRef
    fingerprint
    status
    createdAt
```

Initial local/VPS option:

- Store encrypted private key in the database or filesystem using a strong application encryption key.
- Restrict access to a signing service only.

Preferred hardened option:

- Store the private key outside the database through an OS key store, HSM, or dedicated secret manager.

Source evidence:

- Certificate guideline requires generating a private key, CSR, certificate request, certificate integration, digital signing, and EIMS submission.
- `einvoice.cnf` shows CSR subject details and SAN email pattern.

### 6.5 Invoice Core

```text
TaxInvoice
    id
    organizationId
    sourceSystemId
    transactionType
    documentType
    documentNumber
    invoiceCounter
    invoiceCurrency
    previousIrn
    sellerSnapshotJson
    buyerSnapshotJson
    valueDetailsJson
    paymentDetailsJson
    referenceDetailsJson
    status
    irn
    signedQr
    signedInvoice
    ackDate
    eimsStatus
    submittedAt
    acceptedAt
    rejectedAt
    canceledAt
    createdAt
    updatedAt
```

```text
TaxInvoiceLine
    id
    invoiceId
    lineNumber
    itemCode
    productDescription
    natureOfSupplies
    unit
    quantity
    unitPrice
    discount
    preTaxValue
    taxCode
    taxAmount
    exciseTaxValue
    totalLineAmount
```

Source evidence:

- `EIMS_compliance_Draft.pdf` lists top-level invoice elements: `TransactionType`, `DocumentDetails`, `SourceSystem`, `SellerDetails`, `BuyerDetails`, `ItemList`, `PaymentDetails`, `ValueDetails`, and `ReferenceDetails`.
- The Postman collection includes fields such as `DocumentNumber`, `Type`, `BuyerDetails`, `SellerDetails`, `ItemList`, `TaxCode`, `TaxAmount`, `TotalLineAmount`, `SourceSystem`, `SystemNumber`, `SystemType`, `InvoiceCounter`, and `PreviousIrn`.

### 6.6 Submission Log

```text
EimsSubmission
    id
    organizationId
    invoiceId
    sourceSystemId
    type
    endpoint
    requestHash
    responseHash
    status
    statusCode
    errorCode
    errorMessage
    conversationId
    retryCount
    nextRetryAt
    createdAt
    updatedAt
```

Rules:

- Do not store raw secrets.
- Store canonical request hash for audit.
- Store enough response details to troubleshoot schema/rule failures.
- Use audit log for user/admin actions and submission log for machine/API events.

### 6.7 Bulk Registration

```text
EimsBulkBatch
    id
    organizationId
    sourceSystemId
    conversationId
    callbackUrl
    status
    invoiceCount
    acceptedCount
    failedCount
    submittedAt
    completedAt
```

```text
EimsBulkBatchItem
    id
    batchId
    invoiceId
    status
    irn
    errorMessage
```

Source evidence:

- EIMS bulk registration returns a conversation ID and processes asynchronously.
- Results can be returned through callback URL or fetched later.
- Rule failures are handled per invoice.

### 6.8 Receipt and Withholding

```text
EimsReceipt
    id
    organizationId
    sourceSystemId
    receiptNumber
    receiptType
    receiptDate
    receiptCounter
    sellerTin
    collectedAmount
    currency
    rrn
    qr
    status
```

```text
EimsWithholdingReceipt
    id
    organizationId
    sourceSystemId
    invoiceIrn
    type
    rate
    preTaxAmount
    withholdingAmount
    status
```

Source evidence:

- Postman collection includes `/v1/receipt/sales` and `/v1/receipt/withholding`.
- EIMS compliance draft contains receipt registration examples and response formats.

## 7. Application Services

The EIMS module should use the same clean architecture style as the existing module generator.

```text
apps/api/src/modules/eims/
    domain/
        entities/
        value-objects/
        repositories/
        services/
    application/
        commands/
        queries/
        services/
        dto/
    infrastructure/
        eims-client/
        signing/
        crypto/
        repositories/
        mappers/
        queues/
    presentation/
        controllers/
```

Core services:

| Service | Responsibility |
|---|---|
| `EimsCredentialService` | Store, rotate, validate, and test EIMS credentials. |
| `EimsCertificateService` | Upload/import certificates, track expiry, generate CSR helper data, expose non-secret metadata. |
| `EimsSigningService` | Canonicalize request JSON and sign with the tenant/source private key. |
| `EimsSchemaValidationService` | Validate invoice payloads against the local EIMS JSON schema before submission. |
| `EimsAuthClient` | Login and refresh token using `clientId`, `clientSecret`, `apiKey`, and `tin`. |
| `EimsInvoiceClient` | Register, bulk register, verify, cancel invoices. |
| `EimsReceiptClient` | Register sales and withholding receipts. |
| `EimsSubmissionService` | Orchestrates validation, signing, token, API call, persistence, retry. |
| `EimsBulkService` | Batch creation, conversation ID tracking, callback/poll result handling. |
| `EimsRetryService` | Retries transient failures without duplicating accepted invoices. |
| `EimsComplianceExportService` | Produces MoR/INSA evidence exports. |

## 8. API Surface

Tenant APIs:

```text
GET    /api/v1/eims/profile
PUT    /api/v1/eims/profile

GET    /api/v1/eims/sources
POST   /api/v1/eims/sources
PATCH  /api/v1/eims/sources/:id

GET    /api/v1/eims/credentials
POST   /api/v1/eims/credentials
POST   /api/v1/eims/credentials/:id/test
POST   /api/v1/eims/credentials/:id/rotate

GET    /api/v1/eims/certificates
POST   /api/v1/eims/certificates/import
POST   /api/v1/eims/certificates/csr-preview

GET    /api/v1/eims/invoices
POST   /api/v1/eims/invoices
GET    /api/v1/eims/invoices/:id
POST   /api/v1/eims/invoices/:id/submit
POST   /api/v1/eims/invoices/:id/verify
POST   /api/v1/eims/invoices/:id/cancel

POST   /api/v1/eims/bulk-batches
GET    /api/v1/eims/bulk-batches
GET    /api/v1/eims/bulk-batches/:id
POST   /api/v1/eims/bulk-batches/:id/retry-failed

POST   /api/v1/eims/receipts/sales
POST   /api/v1/eims/receipts/withholding
```

Callback API:

```text
POST /api/v1/eims/callbacks/bulk/:sourceSystemId
```

Callback rules:

- Authenticate callback if EIMS supports callback signing/secrets.
- Validate conversation ID.
- Persist per-invoice success/failure.
- Never trust callback data without matching an existing batch.

Platform admin APIs:

```text
GET /api/v1/admin/eims/overview
GET /api/v1/admin/eims/tenants
GET /api/v1/admin/eims/tenants/:orgId
GET /api/v1/admin/eims/failures
GET /api/v1/admin/eims/certificate-expiry
GET /api/v1/admin/eims/resource-usage
```

Admin must see compliance/resource state, not private keys or secrets.

## 9. UI Plan

Tenant routes:

```text
/settings/eims/profile
/settings/eims/sources
/settings/eims/credentials
/settings/eims/certificates
/eims/invoices
/eims/invoices/:id
/eims/bulk
/eims/receipts
/eims/compliance
```

Tenant screens:

- Taxpayer profile setup.
- Source/system number registry.
- Credential setup and test connection.
- Certificate import and expiry status.
- Invoice list with submission status.
- Invoice detail with IRN, QR, signed invoice, errors.
- Bulk batch status.
- Cancellation flow with reason and remark.
- Receipt registration.
- Compliance evidence export.

Platform admin routes:

```text
/admin/eims
/admin/eims/tenants
/admin/eims/failures
/admin/eims/certificates
/admin/eims/resources
```

Platform admin screens:

- Tenants missing credentials.
- Tenants with expiring certificates.
- Failed submissions by error type.
- EIMS queue depth and retry count.
- Invoice volume by tenant/source.
- Resource usage against plan limits.
- Audit/evidence export status.

## 10. Permissions

Add EIMS resources to the permission matrix:

```text
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
eims.invoice:read
eims.invoice:create
eims.invoice:submit
eims.invoice:cancel
eims.invoice:verify
eims.receipt:read
eims.receipt:create
eims.bulk:read
eims.bulk:create
eims.bulk:retry
eims.compliance:export
```

Suggested system-role defaults:

| Role | Access |
|---|---|
| Owner | Full EIMS tenant access. |
| Admin | Manage sources, credentials, certificates, invoices, receipts. |
| Accountant | Create/submit/verify/cancel invoices and receipts, export reports. |
| Branch manager | Manage branch/source invoices and receipts. |
| Cashier | Create sale invoices/receipts only for assigned source. |
| Auditor | Read invoices, receipts, audit, compliance exports. |
| Viewer | Read-only invoice/report access if granted. |

Custom roles should be supported through the existing role module.

## 11. Billing and Plan Enforcement

Add feature keys:

```text
eims.enabled
eims.sources
eims.users
eims.monthly-invoices
eims.bulk-registration
eims.receipts
eims.withholding-receipts
eims.compliance-export
eims.api-requests-per-minute
eims.retention-months
```

Enforcement rules:

- If `eims.enabled` is false, hide EIMS routes and reject EIMS API writes.
- Source count cannot exceed `eims.sources`.
- Invoice submission cannot exceed `eims.monthly-invoices`.
- Bulk registration requires `eims.bulk-registration`.
- Compliance evidence export requires `eims.compliance-export`.
- API request rate uses both app-level and EIMS-specific rate limits.
- Plan checks must happen server-side. UI feature gates are only convenience.

Important: failed schema/rule submissions should still count as usage only if the business decides they consume paid volume. Accepted invoice count and attempted submission count should be tracked separately.

## 12. Vertical SaaS Usage

The vertical starter owns business workflows. The EIMS module owns tax submission.

### 12.1 Restaurant SaaS

Business modules:

```text
tables
menu-items
orders
kitchen-tickets
payments
cashier-shifts
branches
```

Integration:

```text
Order paid
    -> create canonical TaxInvoice
    -> validate invoice
    -> submit to EIMS
    -> store IRN/QR
    -> print customer receipt/invoice
```

Special rules:

- Split bills produce separate invoices or correctly allocated invoice lines.
- Voids/refunds map to cancellation or credit note workflow.
- Cashier identity should map to `CashierName`.
- Branch/register maps to source system number.

### 12.2 Hotel SaaS

Business modules:

```text
rooms
reservations
folios
guests
corporate-accounts
services
payments
check-in-checkout
```

Integration:

```text
Folio finalized at checkout
    -> create canonical TaxInvoice
    -> submit to EIMS
    -> attach IRN/QR to folio invoice
```

Special rules:

- Deposits, partial payments, service charges, room tax/VAT must be explicit.
- Company guest billing may be B2B and require buyer TIN.
- Personal guest billing may be B2C and buyer TIN can be absent where allowed by schema rules.

### 12.3 Supermarket SaaS

Business modules:

```text
products
barcodes
inventory
cashiers
registers
sales
returns
daily-close
```

Integration:

```text
POS sale completed
    -> create TaxInvoice
    -> submit immediately when online
    -> queue/retry if transient failure
    -> print receipt with QR/IRN when accepted
```

Special rules:

- High volume requires careful queueing and rate limits.
- Returns require cancellation or credit note mapping.
- Offline operation needs explicit compliance approval before implementation.

### 12.4 Retail Shop SaaS

Business modules:

```text
items
customers
sales
payments
returns
branches
```

Integration:

```text
Sale posted
    -> create TaxInvoice
    -> submit to EIMS
    -> store IRN/QR
```

Special rules:

- B2B sales require buyer TIN unless schema/rules say otherwise.
- B2C sales can use allowed no-TIN flow.

## 13. EIMS Request Construction

The canonical request should include:

```text
TransactionType
DocumentDetails
SourceSystem
SellerDetails
BuyerDetails
ItemList
PaymentDetails
ValueDetails
ReferenceDetails
```

Before submission:

1. Build canonical invoice object from business sale.
2. Validate local business rules.
3. Validate EIMS JSON schema draft-07.
4. Canonicalize the request JSON deterministically.
5. Sign canonical JSON with the tenant/source private key.
6. Base64 encode signature.
7. Attach Base64 certificate.
8. Authenticate or refresh EIMS token.
9. Submit to EIMS.
10. Persist IRN, QR, signed invoice, ack date, and status.

Source evidence:

- EIMS compliance draft states the top-level registration object has `request`, `signature`, and `certificate`.
- Signature is generated over the canonicalized request object, not over the `signature` and `certificate` fields.
- Certificate must correspond to the private key used for signing.

## 14. EIMS API Mapping

From the Postman collection:

| Integration capability | Endpoint in collection | SaaS service |
|---|---|---|
| Login | `POST /auth/login` | `EimsAuthClient.login` |
| Refresh token | `POST /auth/refresh-token` | `EimsAuthClient.refresh` |
| Single registration | `POST /v1/register` | `EimsInvoiceClient.registerSingle` |
| Bulk registration | `POST /v1/bulkRegister` | `EimsInvoiceClient.registerBulk` |
| Single cancellation | `POST /v1/cancel` | `EimsInvoiceClient.cancelSingle` |
| Bulk cancellation | `POST /v1/bulkCancel` | `EimsInvoiceClient.cancelBulk` |
| Verification | `POST /v1/verify` | `EimsInvoiceClient.verify` |
| Sales receipt | `POST /v1/receipt/sales` | `EimsReceiptClient.registerSalesReceipt` |
| Withholding receipt | `POST /v1/receipt/withholding` | `EimsReceiptClient.registerWithholdingReceipt` |

Required credential/config variables:

```text
clientId
clientSecret
apiKey
sellerTin
systemType
systemNumber
sellerEmail
sellerRegion
sellerPhone
sellerLegalName
sellerWoreda
sellerVatNumber
documentNumber
invoiceCounter
previousIrn
```

These should be stored in tenant/source configuration, not global `.env`, except for environment-level EIMS base URL and feature toggles.

## 15. Certificate Lifecycle

Setup flow:

1. Tenant enters taxpayer profile.
2. Tenant registers or records source/system number from MoR portal.
3. System generates CSR preview/config using TIN, organization, source system ID, and email.
4. Tenant submits CSR and certificate request form to the authority.
5. Tenant imports issued certificate.
6. System validates certificate matches TIN/system/source metadata.
7. System enables signing only after certificate and private key are valid.

Operational flow:

- Notify owners/admins before certificate expiry.
- Block submission if certificate expired.
- Support certificate rotation.
- Keep old certificate metadata for audit.
- Never show or export private key through UI.

## 16. Security Plan

Security requirements come from the INSA checklist and cybersecurity audit documents.

### 16.1 Application Security

- Enforce tenant scoping on every EIMS model.
- Use server-side permission checks for all EIMS actions.
- Encrypt credentials and certificates at rest.
- Redact all EIMS secrets from logs.
- Use HTTPS in production.
- Use callback verification where supported.
- Rate-limit EIMS submit endpoints.
- Keep submission idempotency to prevent duplicate registrations.
- Store request/response hashes for evidence.

### 16.2 Key Management

- Keep private-key access inside `EimsSigningService`.
- Do not let controllers or UI read private keys.
- Support rotation and revocation.
- Record fingerprint and certificate validity dates.
- Add startup doctor checks for encryption key presence.

### 16.3 Audit and Evidence

Audit events:

```text
eims.profile.update
eims.source.create
eims.source.update
eims.credential.create
eims.credential.rotate
eims.certificate.import
eims.certificate.rotate
eims.invoice.create
eims.invoice.submit
eims.invoice.accept
eims.invoice.reject
eims.invoice.cancel
eims.receipt.submit
eims.bulk.submit
eims.bulk.callback
eims.compliance.export
```

Evidence exports:

- Tenant EIMS configuration summary.
- Certificate validity summary.
- Source system approval/status summary.
- Invoice submission report.
- Failed submission report.
- Cancellation report.
- Receipt report.
- User/role/permission report.
- Security setting report.

## 17. Testing Plan

EIMS must be tested across all existing test layers.

### 17.1 API Unit and Integration Tests

Location:

```text
apps/api/src/modules/eims/**/*.spec.ts
```

Coverage:

- Canonical invoice validation.
- B2B/B2C/G2C buyer TIN rules.
- Document type rules.
- Tax total calculations.
- Line total calculations.
- Certificate expiry behavior.
- Credential redaction.
- Idempotent submission behavior.
- Plan limit enforcement.
- Tenant isolation.

### 17.2 Property Tests

Use `fast-check` for:

- Line totals equal quantity, unit price, discount, and tax constraints.
- Sum of lines equals value details.
- Invalid buyer/TIN combinations never pass validation.
- Random invoice lines do not produce negative totals.
- Canonical JSON signing input is stable for equivalent objects.

### 17.3 Mutation Tests

Use Stryker on:

- Tax calculation.
- Schema/business-rule validators.
- Entitlement enforcement.
- Cancellation rules.
- Idempotency rules.
- Tenant scoping rules.

### 17.4 HTTP API Tests

Location:

```text
apps/api-tests
```

Coverage:

- Credential setup rejects missing fields.
- Unauthorized users cannot submit invoices.
- Tenant A cannot read Tenant B invoices.
- Submit endpoint returns validation errors before hitting EIMS when schema is wrong.
- Mock EIMS accepted response stores IRN/QR.
- Mock EIMS rejected response stores failure details.

### 17.5 Bruno Collections

Add a tracked collection:

```text
apps/api-tests/bruno/EIMS
```

Use for:

- Profile setup.
- Source setup.
- Credential test.
- Create invoice.
- Submit invoice.
- Verify invoice.
- Cancel invoice.
- Register receipt.

### 17.6 Acceptance Tests

Location:

```text
apps/acceptance/features/eims-compliance.feature
```

Example scenarios:

```gherkin
Feature: EIMS invoice compliance

  Scenario: Accountant submits a valid B2B invoice
    Given a tenant has valid EIMS credentials, source, and certificate
    And the tenant has remaining monthly invoice quota
    When an accountant submits a valid B2B invoice
    Then the invoice is accepted
    And the IRN and QR code are stored
    And an audit event is recorded

  Scenario: Cashier cannot rotate EIMS credentials
    Given a user has the cashier role
    When the user attempts to rotate EIMS credentials
    Then the request is forbidden
```

### 17.7 Browser E2E Tests

Location:

```text
apps/e2e/tests/eims.spec.ts
```

Coverage:

- Tenant setup wizard.
- Credential test connection.
- Certificate import UI.
- Invoice list/detail/status.
- Cancellation dialog.
- Compliance export.
- Admin EIMS overview.
- Feature gates for plan limits.

### 17.8 Load and Performance Tests

Location:

```text
apps/performance/k6/eims-submit.js
apps/performance/k6/eims-bulk.js
```

Coverage:

- Authenticated invoice create/submit smoke load.
- Bulk submission queue behavior.
- Callback processing load.
- Rate-limit behavior.
- p95 latency thresholds.
- error rate thresholds.

### 17.9 Security Tests

Location:

```text
apps/security
```

Coverage:

- Gitleaks: no EIMS secrets committed.
- Dependency scan: no known critical vulnerable dependency.
- Semgrep: no unsafe crypto/logging patterns.
- Nuclei: common HTTP exposure checks.
- API security smoke: auth, tenant isolation, RBAC, forbidden secret reads.

## 18. Operations and Monitoring

Add EIMS metrics:

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

Admin server dashboard should show:

- EIMS health by tenant.
- Queue depth.
- Failure rate.
- Certificate expiry count.
- Invoice volume by hour/day.
- Plan usage.
- Storage usage for invoice/evidence artifacts.
- API latency and error rate.

Recommended VPS monitoring stack:

- Prometheus for `/api/v1/metrics`.
- Grafana for dashboards.
- Loki or Pino log files for logs.
- Uptime checks for API and web.
- PostHog only if product analytics are needed. It is not required for compliance.

## 19. Deployment Plan

Per generated SaaS:

```text
PostgreSQL
Redis
NestJS API
React web app
Caddy HTTPS reverse proxy
PM2 process manager
local or self-hosted object storage
```

EIMS environment variables:

```env
EIMS_BASE_URL=
EIMS_MOCK_BASE_URL=
EIMS_ENV=sandbox
EIMS_CALLBACK_BASE_URL=
EIMS_ENCRYPTION_KEY=
EIMS_SIGNING_PROVIDER=local
EIMS_SUBMISSION_QUEUE=eims-submissions
EIMS_BULK_QUEUE=eims-bulk
```

Do not put tenant-specific `clientId`, `clientSecret`, `apiKey`, certificate, or private key in `.env`. Those belong to encrypted tenant/source records.

## 20. Implementation Phases

### Phase 0: Requirements Lock

Deliverables:

- Initial `docs/EIMS_REQUIREMENTS_MATRIX.md`.
- Expand the matrix with exact document section/page references as implementation begins.
- Exact requirement IDs from supplied documents.
- Status: supported, partial, missing, legal/process, not applicable.

Exit criteria:

- Every EIMS/MoR/INSA requirement has an owner and implementation status.

### Phase 1: EIMS Module Skeleton

Deliverables:

- CLI starter `eims`.
- Prisma models.
- API module with repository pattern.
- Web routes.
- Permissions.
- Entitlement keys.
- Seed data for test tenant/source.

Exit criteria:

- Project scaffolds with `create-vyllion-saas add starter eims`.
- Typecheck and smoke tests pass.

### Phase 2: Credential and Certificate Lifecycle

Deliverables:

- Encrypted credential storage.
- Certificate import.
- CSR helper/preview.
- Certificate expiry checks.
- Redaction tests.

Exit criteria:

- No secret exposed in logs, API responses, UI, or exports.
- Certificate expiry blocks submit.

### Phase 3: Invoice Engine

Deliverables:

- Canonical invoice model.
- EIMS schema validator.
- Tax/value validation.
- B2B/B2C/G2C conditional rules.
- Draft invoice UI.

Exit criteria:

- Valid/invalid EIMS payload tests pass.
- Mutation tests protect key validators.

### Phase 4: EIMS Gateway

Deliverables:

- Auth and refresh token.
- Single registration.
- Verification.
- Cancellation.
- Mock EIMS test server or contract fixtures.

Exit criteria:

- Mock accepted invoice stores IRN/QR.
- Mock rejected invoice stores failure reason.
- Retry does not duplicate accepted invoice.

### Phase 5: Bulk and Receipts

Deliverables:

- Bulk batch submission.
- Conversation ID tracking.
- Callback handler.
- Poll/fetch fallback if needed.
- Sales receipt and withholding receipt registration.

Exit criteria:

- Partial bulk failure is persisted per invoice.
- Callback cannot update unknown batch.

### Phase 6: Admin and Compliance Evidence

Deliverables:

- Tenant EIMS setup dashboard.
- Admin EIMS dashboard.
- Evidence exports.
- MoR/INSA checklist mapping.

Exit criteria:

- Admin can see compliance status without viewing secrets.
- Tenant can export required operational evidence.

### Phase 7: Vertical Starters

Deliverables:

- Restaurant starter with EIMS integration.
- Hotel starter with EIMS integration.
- Retail starter with EIMS integration.
- Supermarket starter with EIMS integration.

Exit criteria:

- Each starter creates business transaction and hands off to canonical invoice engine.
- No vertical starter calls MoR/EIMS directly.

### Phase 8: Sandbox and Compliance Validation

Deliverables:

- Sandbox credential setup guide.
- Sandbox test run evidence.
- Compliance test report.
- Security test report.

Exit criteria:

- End-to-end invoice, verify, cancel, receipt, and bulk flows pass against mock and then sandbox.
- Requirements matrix updated with evidence links.

## 21. Validation Loop

For every phase:

1. Read the related source document section again.
2. Update the requirements matrix.
3. Implement only the smallest phase scope.
4. Add tests before treating the phase as complete.
5. Run all relevant tests.
6. Record evidence in the requirements matrix.
7. Compare implementation against MoR/INSA wording.
8. Correct mismatches before moving to the next phase.

No EIMS feature should be called complete without:

- Document source reference.
- Test coverage.
- UI/API behavior.
- Tenant isolation check.
- Permission check.
- Audit event.
- Failure mode handling.
- Compliance evidence entry.

## 22. Compliance Status After This Plan

If this plan is implemented, the SaaS template can become a clean EIMS-ready technical base.

It still should not be marketed as fully compliant until:

- MoR/EIMS sandbox tests pass.
- Certificate issuance process is completed.
- Source registration/approval is completed for the taxpayer/source.
- INSA cybersecurity audit evidence is accepted where required.
- Any BSP/provider legal/commercial requirements are completed where applicable.

## 23. Immediate Next Work

Recommended next work order:

1. Review and tighten `docs/EIMS_REQUIREMENTS_MATRIX.md` against exact MoR/INSA section/page references.
2. Add CLI `eims` starter design spec before coding.
3. Implement Phase 1 only.
4. Generate a test SaaS project and validate scaffold output.
5. Implement credential/certificate lifecycle.
6. Continue phase-by-phase with evidence and tests.

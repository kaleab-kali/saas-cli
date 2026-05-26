# EIMS Final Agreed SaaS Architecture Plan V2

> Superseded by `docs/EIMS_FINAL_AGREED_SAAS_ARCHITECTURE_PLAN_V3.md`.
>
> Keep this file as the V2 baseline. Use V3 for implementation planning and template work.

This is the V2 controlling plan for integrating Ethiopian EIMS/EIRMS e-invoicing inside a generated SaaS project after scaffolding.

V2 merges:

- The final agreed SaaS architecture plan.
- The comprehensive audit gaps.
- The five-area deep dive.
- The agreed pushbacks and corrections.

This is still a generated-SaaS architecture plan, not a CLI plan. It describes the application architecture after a SaaS project exists.

## 1. V2 Executive Summary

The architecture remains:

```text
Vertical business modules
restaurant / hotel / retail / supermarket / manufacturing / wholesale / spare parts
        |
        v
Canonical invoicing module
        |
        v
EIMS bounded context
setup / submission / receipts / compliance / shared
        |
        v
MoR / EIMS API
```

The most important V2 additions are:

1. First-class Enterprise -> Establishment/Branch -> SourceSystem management.
2. Per-source invoice counter and previous-IRN chain.
3. EIMS lookup/code registry for document types, transaction types, source system types, cancellation reason codes, tax code prefixes, payment modes, units, regions, and error codes.
4. Source approval workflow with hard submission guards.
5. Targeted PostgreSQL RLS for EIMS/invoicing compliance tables only.
6. 2FA enforcement for EIMS-permission users.
7. Compact thermal and A4 print layout infrastructure.
8. Buyer and government-buyer directory.
9. Decimal-safe money and quantity handling.
10. Expanded Phase 0 sandbox proof.

## 2. Final Pushbacks Preserved

These are deliberate constraints.

### 2.1 Do Not Extract Gateway Too Early

Keep EIMS embedded inside each generated SaaS first.

Extract to a standalone gateway only when one of these is true:

- Three or more SaaS products are in production.
- External companies want to consume the EIMS integration.
- A separate EIMS operations team exists.
- Compliance audit requires a hardened standalone service.
- EIMS traffic/queue isolation becomes operationally necessary.

### 2.2 Do Not Fake Official Offline Invoice Acceptance

Offline mode creates a local pending invoice only.

Do not:

- Fabricate IRN.
- Render an official-looking QR before EIMS acceptance.
- Tell buyers or auditors that pending invoices are EIMS-accepted.

Final official IRN and QR come from EIMS accepted response only.

### 2.3 Do Not Migrate the Whole Template to RLS

The base SaaS template keeps application-level tenant isolation.

Use targeted PostgreSQL RLS only for EIMS/invoicing compliance tables.

### 2.4 Do Not Hardcode Signing Algorithm Yet

The certificate guideline mentions `SHA512withRSA`, but Phase 0 must prove:

- Hash algorithm.
- RSA padding mode.
- Canonical JSON format.
- Base64 encoding.
- Vault Transit signature output normalization.

### 2.5 Do Not Add Root Packages Prematurely

The generated SaaS workspace currently uses:

```yaml
packages:
  - "apps/*"
```

Therefore V2 keeps EIMS constants inside the generated app first:

```text
apps/api/src/modules/eims/shared/constants/
apps/api/src/modules/eims/shared/lookups/
apps/api/src/modules/eims/shared/schemas/
```

The web app should consume active lookup values from API endpoints:

```text
GET /api/v1/eims/lookups/document-types
GET /api/v1/eims/lookups/transaction-types
GET /api/v1/eims/lookups/source-system-types
GET /api/v1/eims/lookups/cancellation-reasons
GET /api/v1/eims/lookups/tax-codes
```

Only extract to a shared workspace package later if the generated SaaS adds shared packages intentionally.

## 3. Source Documents Used

| Source | Used for |
|---|---|
| `EIMS_compliance_Draft.pdf` | Authentication, invoice registration, schema, signing shape, bulk, receipts, verification, cancellation, callback, error codes, print layouts, datetime, decimal precision, document/source/transaction types. |
| `EimsCoreApiMockCollection2.postman_collection.json` | Request examples, variables, sample endpoints, cancellation code `6` in mock bulk cancel, receipt/withholding examples. |
| `certificate_guideline.pdf` and `.docx` | Private key, CSR, certificate request, signing process, `SHA512withRSA` mention, JSON serialization guidance. |
| `einvoice.cnf` | CSR subject shape and `default_md=sha256`; proof that signing details must be verified, not guessed. |
| `Certificate Request form v.1.docx` | Taxpayer/contact fields and at least one system ID requirement. |
| `Self-onboarding and Source Registration Guide.pdf` | Portal signup, verification, 2FA, enterprise -> establishment -> source registration, pending approval. |
| `MoR_BSP_Master.docx` | SaaS/cloud checklist, branch/source traceability, source numbers, sub-TIN, offline mode, auto resend, per-merchant rate limits, buyer SMS/email notification, paper print, NTP, datacenter, export/deletion. |
| `compliance check list.pdf` | Governance, security controls, TLS, access control, retention/deletion, WORM logs, offline cache. |
| `Cybersecurity Audit minimum Requirements2.pdf` | WORM/immutable logs, trusted time, offline cache encryption/integrity, secure communication, key management, secure provisioning. |
| `Commitment Form v1.1.docx` | Provider retesting and improvement process. |
| `Letter of Guarantee-after comment-V1.2.docx` | Possible provider/legal guarantee and two-year renewal tracking. |
| `ERCA Admin authorization letter` | Authorization request format. |
| `buyer list .docx` | Buyer master-data seed shape. |
| `Gov.t inst. list .docx` | Government buyer master-data seed shape. |

## 4. Module Layout

Inside generated SaaS:

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
      domain/
      application/
      infrastructure/
      presentation/
      eims-setup.module.ts

    submission/
      domain/
      application/
      infrastructure/
      presentation/
      eims-submission.module.ts

    receipts/
      domain/
      application/
      infrastructure/
      presentation/
      eims-receipts.module.ts

    compliance/
      domain/
      application/
      infrastructure/
      presentation/
      eims-compliance.module.ts

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
```

Frontend:

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

## 5. Enterprise, Establishment, Branch, and SourceSystem

This is first-class in V2.

```text
Organization
  SaaS tenant account.

EimsEnterprise
  Legal taxpayer identity.
  Owns TIN, legal name, trade name, VAT number.

EimsEstablishment
  Registered branch/outlet under enterprise.
  Owns branch address, establishment number, optional sub-TIN.

EimsSourceSystem
  POS/register/ERP/source under establishment.
  Owns system number, source type, source approval status, credential, certificate.

EimsSourceSystemCounter
  Owns invoice counter and previous IRN chain per source.
```

Every business event must resolve to:

```text
organizationId
enterpriseId
establishmentId
sourceSystemId
```

The source system determines:

- Seller TIN/sub-TIN.
- Seller branch address.
- System number.
- Source type.
- Certificate.
- EIMS credential.
- Invoice counter.
- Previous IRN.

## 6. Core Data Model Additions

### 6.1 Enterprise

```text
EimsEnterprise
  id
  organizationId
  tin
  legalName
  tradeName
  vatNumber
  email
  phone
  status
  createdAt
  updatedAt
```

### 6.2 Establishment

```text
EimsEstablishment
  id
  organizationId
  enterpriseId
  establishmentNo
  name
  code
  subTin
  region
  zone
  city
  subCity
  wereda
  kebele
  locality
  houseNumber
  managerUserId
  status
  openedAt
  closedAt
  createdAt
  updatedAt
```

### 6.3 Source System

```text
EimsSourceSystem
  id
  organizationId
  enterpriseId
  establishmentId
  name
  systemNumber
  systemType
  model
  manufacturer
  softwareVersion
  serviceType
  serviceCenterTin
  serviceDate
  lastUpgradeDate
  permitNo
  machineRegNo
  simCardNo
  inHouseDeveloped
  approvalStatus
  active
  credentialId
  certificateId
  createdAt
  updatedAt
```

Status values:

```text
draft
pending_mor_approval
approved
rejected
suspended
decommissioned
```

Submission guard:

```text
sourceSystem.approvalStatus == approved
sourceSystem.active == true
credential configured and tested
certificate valid and not expired
counter available
```

### 6.4 User Branch/Source Assignments

```text
UserEstablishmentAssignment
  id
  organizationId
  userId
  establishmentId
  role
  isPrimary
  assignedAt
  revokedAt

UserSourceSystemAssignment
  id
  organizationId
  userId
  sourceSystemId
  assignedAt
  revokedAt
```

This supports:

- Branch managers limited to their establishment.
- Cashiers locked to one POS/source system.
- Owners/admins with all-branch access.
- Auditors with read-only branch or all-branch access.

## 7. Branch Context and UI

Every relevant request must include or resolve branch/source context:

Priority:

```text
1. Explicit sourceSystemId
2. Explicit establishmentId
3. Active branch/source from user session
4. User primary assignment
5. Reject if ambiguous
```

UI:

```text
BranchSwitcher
SourceSystemSelector
BranchHealthCard
EimsSetupProgress
SourceApprovalStatusBadge
```

Views:

```text
Owner/admin:
  all branches and aggregate stats

Branch manager:
  assigned branch only

Cashier:
  assigned source system only

Auditor:
  read-only branch/all-branch based on assignment
```

## 8. Lookup Codes and Validators

Known values must be encoded as defaults, but active lists must be configurable because the EIMS documents say several fields are "select from list" and some values may be configured in backoffice.

### 8.1 Cancellation Reason Codes

Formal schema lists:

```text
1 = Duplicate
2 = Data entry mistake
3 = Order Cancelled
4 = Others
```

Mock collection also uses:

```text
6 = Calculation Error
```

V2 decision:

- Ship known defaults `1-4`.
- Include `6` as `mock_observed_unconfirmed`.
- Phase 0 must confirm whether `6` is official in production.
- `Remark` is required when code is `4 = Others`.
- Store reason code and remark in audit log.

### 8.2 Document Types

Known document type defaults:

```text
INV = Invoice
CRE = Credit Note
DEB = Debit Note
INT = Interim Invoice
RTN = Retainer Invoice
FIN = Final Invoice
MIX = Mixed Invoice
INC = Intercompany Invoice
PRF = Proforma Invoice
OVD = Overdue Invoice
```

Rules:

- `CRE`, `DEB`, `INT`, `FIN` require reason/related document where schema requires.
- Restaurant paid order normally maps to `INV`.
- Hotel deposit may map to `INT`.
- Hotel checkout may map to `FIN`.
- Quotes may map to `PRF`.
- Returns/refunds may map to `CRE`.
- Price adjustments may map to `DEB`.

Phase 0 must confirm which document types are enabled for each tenant/source type.

### 8.3 Source System Types

Known defaults:

```text
POS = Point of Sale
ERP = Enterprise Resource Planning
CRM = Customer Relationship Management
SYS = System
MAN = Manual
EFD = Electronic Fiscal Device
```

Rule:

```text
ItemCode is required when SourceSystem.SystemType is not MAN.
```

Vertical defaults:

```text
restaurant -> POS
retail -> POS
supermarket -> POS
hotel -> ERP or POS depending outlet
manufacturing -> ERP
wholesale -> ERP
spare parts -> POS or ERP
```

### 8.4 Transaction Types

Known defaults:

```text
B2B = Business to Business
B2C = Business to Consumer
B2G = Business to Government
G2B = Government to Business
G2C = Government to Consumer
```

Rules:

- Buyer TIN is required unless transaction type is `B2C` or `G2C`.
- For `B2C` and `G2C`, BuyerDetails.Tin can be null and BuyerDetails.VatNumber should be null.
- Government buyer lookup should help classify `B2G`.

### 8.5 Tax Codes

Known prefix convention:

```text
VAT = VAT tax code prefix
TOT = Turnover tax prefix
EXC = Excise prefix
```

Known examples:

```text
VAT15
VAT0
VATEX
```

Rules:

- If any item tax code starts with `VAT`, seller VAT number is required.
- Full active tax-code list must be configurable per tenant/source because tax accounts vary.
- Store tax code definitions in lookup/config table, not only TypeScript constants.

### 8.6 Payment Modes and Terms

Known examples include:

```text
CASH
CHEQUE
CPO
Local Bank Transfer
SWIFT
Wire Transfer
Letter of Credit
Card
Credit
Direct Transfer
```

Payment term note:

- The spec/mock uses spelling `IMMIDIATE`; support the official spelling exactly while displaying "Immediate" in UI.
- Phase 0 must confirm whether corrected spelling `IMMEDIATE` is accepted.

### 8.7 Units and Nature of Supply

Known examples:

```text
PCS
Goods
Service
```

V2 decision:

- Use lookup table for units and nature of supply.
- Seed common defaults.
- Phase 0/MoR liaison must confirm official active list.

### 8.8 Region and Address Codes

Region/zone/wereda/kebele codes must be master data.

Rules:

- Use dropdowns, not free text, when official code list is available.
- Support import from MoR source if available.
- Keep temporary configured values if official API/list is unavailable.

## 9. Buyer and Government Buyer Directory

Add buyer master data to the invoicing module.

```text
TenantBuyer
  id
  organizationId
  buyerTin
  buyerSubTin
  legalName
  tradeName
  vatNumber
  buyerType
  isGovernment
  email
  phone
  region
  zone
  city
  subCity
  wereda
  kebele
  locality
  houseNumber
  frequentBuyer
  active
```

Use cases:

- Fast B2B buyer lookup at POS/accounting screen.
- Government buyer lookup for B2G/G2B/G2C classification.
- Avoid retyping buyer TIN and address.
- Validate buyer TIN before submission.

Seed/import sources:

- `buyer list .docx`
- `Gov.t inst. list .docx`
- Tenant-uploaded CSV.

Pushback:

- Do not make the entire SaaS signup TIN-first by default.
- EIMS onboarding should verify TIN/contact, but non-EIMS SaaS users may still start with normal account creation.

## 10. Decimal and Date Handling

### 10.1 Money and Quantity

Do not use native JavaScript floating-point numbers for tax/money calculations.

Use:

- Prisma `Decimal` mapped to PostgreSQL `numeric`.
- Decimal.js or equivalent in domain logic.
- String serialization for exact payload values when needed.

Known precision from documents:

```text
money: Decimal 20,2
quantity: Decimal 20,4
exchangeRate: confirm in Phase 0
```

Tests:

- Line totals.
- Tax sums.
- Total value.
- Withholding.
- Foreign currency exchange rate.
- Decimal serialization in payload.

### 10.2 Date and Time

Phase 0 must confirm exact accepted format.

Known conflicting examples:

```text
ISO 8601 requirement
GMT+3 default
yyyy-mm-dd hh:mm:ss.fff+/-hh:mm
21-03-2025T00:00:00 in examples
2024-12-20T10:18:35.346863361+03:00[Africa/Addis_Ababa] in responses
```

Rules until confirmed:

- Store all times in UTC in DB.
- Store/display business invoice time in `Africa/Addis_Ababa`.
- Send EIMS payload in the Phase 0-confirmed format.
- Audit both local creation time and EIMS acceptance time.

## 11. Invoice Counter and Previous IRN Chain

This is critical.

### 11.1 Data Model

```text
EimsSourceSystemCounter
  id
  organizationId
  sourceSystemId
  lastAcceptedCounter
  lastAcceptedIrn
  lastIssuedAt
  status
  version
  updatedAt

EimsCounterReservation
  id
  organizationId
  sourceSystemId
  invoiceId
  counter
  previousIrn
  payloadHash
  status
  eimsRequestId
  createdAt
  submittedAt
  acceptedAt
  failedAt
```

Reservation statuses:

```text
reserved
submitting
accepted
rejected_reusable
rejected_consumed
unknown
manual_review
```

### 11.2 Pushback on Long DB Transactions

Do not hold a database transaction open across:

- Vault signing.
- Network calls to EIMS.
- Long-running retries.

Holding a `SELECT ... FOR UPDATE` lock while calling EIMS can block POS lanes and still does not make the external EIMS operation atomic.

### 11.3 Final Counter Strategy

Use per-source queue serialization plus short DB transactions.

```text
1. One queue lane per source system, concurrency 1.
2. Validate invoice before reserving counter.
3. Reserve counter in a short DB transaction.
4. Submit to EIMS outside long DB transaction.
5. On accepted response, confirm counter and lastIrn.
6. On clear pre-submission failure, release reservation.
7. On ambiguous network failure, mark reservation unknown and block/reconcile that source.
```

Why this is safer:

- No duplicate counters.
- No concurrent submissions for same source.
- No long DB locks during network calls.
- Ambiguous cases are visible and auditable.

### 11.4 Previous IRN

Every accepted invoice updates:

```text
lastAcceptedIrn
lastAcceptedCounter
```

Every new payload includes:

```text
ReferenceDetails.PreviousIrn = lastAcceptedIrn
SourceSystem.InvoiceCounter = next counter
```

Phase 0 must confirm whether `PreviousIrn` is always required in practice or conditionally required.

### 11.5 Ambiguous Submission Handling

If the request may have reached EIMS but the app did not receive a response:

```text
1. Mark reservation unknown.
2. Stop further submissions for that source.
3. Try verification/reconciliation.
4. If accepted, confirm IRN/counter.
5. If not accepted, decide if counter can be reused based on Phase 0/MoR rule.
6. Record audit event.
```

Do not blindly reuse counters after an ambiguous network failure.

## 12. Source Approval and Source Metadata Workflow

Source approval flow:

```text
draft
submitted_to_mor_portal
pending_mor_approval
approved
rejected
suspended
decommissioned
```

Submission guard:

```text
approvalStatus == approved
active == true
systemNumber present
credential tested
certificate valid
counter initialized
```

Metadata fields:

```text
serviceDate
lastUpgradeDate
serviceType
serviceCenterTin
softwareVersion
permitNo
machineRegNo
simCardNo
updateRequestedStatus
```

Rules:

- `permitNo` and `machineRegNo` are MoR-assigned when applicable.
- `simCardNo` is optional and relevant for connected/mobile POS.
- `lastUpgradeDate` changes when software version changes.
- Phase 0/MoR liaison must confirm whether MoR must be notified through API or portal when software version changes.

## 13. EIMS Credentials and API Key Lifecycle

Credential lifecycle:

```text
initial_setup
tested
active
rotation_requested
rotated
suspected_compromise
retired
```

Fields:

```text
clientIdEncrypted
clientSecretEncrypted
apiKeyEncrypted
usernameEncrypted?       // if issued separately
passwordEncrypted?       // if required for auth flow
accessTokenEncrypted
refreshTokenEncrypted
tokenExpiresAt
lastTestedAt
lastRotatedAt
```

Rules:

- Store encrypted at rest.
- Redact in logs and API responses.
- Separate sandbox and production credentials.
- Rotation can be tenant-requested or policy-triggered.
- Emergency rotation must disable affected source until tested again.

## 14. 2FA for EIMS Permissions

Users with EIMS-sensitive permissions must have 2FA enabled.

Sensitive permissions:

```text
eims.credential:*
eims.certificate:*
eims.source:update
eims.compliance:export
invoice:submit
invoice:cancel
```

Supported authenticators:

- Microsoft Authenticator.
- Google Authenticator.
- FreeOTP.
- Any standard TOTP app supported by the SaaS auth layer.

Rules:

- Read-only auditor access may be allowed without 2FA only if policy allows.
- Credential/certificate/source actions require 2FA.
- 2FA status belongs in compliance evidence.

## 15. Signing and Key Management

Use:

```ts
interface SigningProvider {
  sign(input: {
    canonicalJson: string;
    organizationId: string;
    sourceSystemId: string;
    algorithm: string;
  }): Promise<{
    signature: string;
    keyVersion?: string;
  }>;
}
```

Providers:

```text
LocalSigningProvider
  Dev/sandbox fallback only.

VaultSigningProvider
  Production default.

KmsSigningProvider
  Future cloud option.

SoftHsmSigningProvider
  Future only if INSA requires PKCS#11/HSM.
```

Invoice submission records must store:

```text
keyProvider
keyRef
keyVersion
signatureAlgorithm
canonicalizationVersion
payloadHash
```

This supports future key rotation and audit verification.

## 16. CSR and Certificate Flow

Strategy A: Vault-generated keypair.

```text
Vault creates keypair.
System exports CSR only.
Tenant submits CSR to INSA with certificate request form.
Tenant uploads certificate.
Vault retains private key.
```

Strategy B: Tenant-generated keypair.

```text
Tenant generates keypair locally using instructions.
Tenant submits CSR.
Tenant uploads certificate and encrypted private key.
System imports private key into Vault.
Temporary upload is destroyed.
```

CSR subject:

```text
C = ET
ST = region
L = locality
O = legal organization name
OU = establishment or organization unit
CN = taxpayer TIN
serialNumber = EIMS source system number
subjectAltName/email = registered email
```

Certificate expiry job:

```text
daily check
notify at 90/60/30/7 days
block after expiry
show in admin dashboard
include in evidence export
```

## 17. Invoice State Machine

```text
draft
validated
pending_offline
queued
counter_reserved
submitting
accepted
rejected
failed_retryable
failed_final
unknown_submission
verified
cancel_requested
cancelled
```

Accepted invoices:

- Store IRN.
- Store signed QR.
- Store signed invoice if returned.
- Store ack date.
- Become immutable for normal edit/delete.

Unknown submissions:

- Block source queue.
- Require reconciliation before continuing.

## 18. Offline Pending-Sync Mode

Offline mode applies to:

- Tenant network loss.
- EIMS endpoint outage.
- Temporary EIMS auth/certificate validation service outage.

Offline flow:

```text
1. Create local pending invoice.
2. Assign local temporary reference.
3. Print/display pending tax clearance state.
4. Optional pending marker QR must be visibly different from official QR.
5. Queue for sync.
6. Submit when connectivity returns.
7. Replace pending state with final IRN/QR after EIMS acceptance.
8. Audit both local creation and EIMS acceptance.
```

Offline cache:

- Encrypt at rest.
- Integrity-check with HMAC or SHA-256.
- Sync automatically.
- Alert on aging pending invoices.

Phase 0 must confirm:

- Maximum allowed offline delay.
- Document date rule behavior.
- Whether delayed offline invoices can be rejected due tax period/date rules.

## 19. Print Layouts

EIMS requires print evidence and MoR test cases require supported print types.

Implement:

```text
InvoicePrintService
  renderCompact(invoice)
  renderA4(invoice)

PrintLayoutStrategy
  restaurant
  hotel
  retail
  supermarket
  wholesale
  manufacturing
```

Layouts:

```text
Compact thermal
  80mm POS receipt.
  Monospace.
  IRN and QR from EIMS.
  Seller, buyer, items, totals, tax, payment, source system.

A4
  Office printer/PDF.
  More detailed seller/buyer sections.
  Item table.
  Full totals/tax/withholding.
  EIMS registration section.
```

Mandatory print fields include:

- Transaction type.
- Document type.
- Manual invoice number when applicable.
- Document number.
- Date.
- Currency and exchange rate when applicable.
- Tax/excise/withholding/total values.
- Payment term and mode.
- Reason/related document for correction documents.
- Cashier and source system.
- Seller details.
- Buyer details where required.
- Item list.
- IRN.
- QR code.

Tests:

- Extract PDF text and assert required fields.
- Check QR image exists.
- Scan QR with official scanner if available.
- Validate compact layout on thermal printer.
- Validate A4 layout on regular printer.

## 20. Receipts and Withholding

Sales receipt flow:

```text
payment collected
receipt created
EIMS receipt submitted
RRN/QR/status stored
buyer notified
```

Withholding receipt flow:

```text
withholding applies
rate/type calculated
receipt submitted
status stored
```

Phase 0 must confirm:

- When withholding `Rate` is required vs nullable.
- Valid withholding types and rates.
- Receipt currency values and accepted payment modes.

## 21. Cancellation

Cancellation request must store:

```text
invoiceIrn
reasonCode
remark
requestedBy
requestedAt
eimsResponse
status
```

Rules:

- Remark required for `Others`.
- Cancellation limits must be tracked if EIMS enforces daily/monthly limits.
- Bulk cancellation limit error must become manual-intervention alert.
- Cancelled invoice remains stored.

## 22. Error Classification and Retry Policy

Classify errors into:

```text
retryable
non_retryable
re_auth_then_retry
manual_intervention
schema_error
rule_error
```

Examples:

```text
retryable:
  endpoint unreachable
  EIMS 5xx
  OCSP unreachable
  network timeout

re_auth_then_retry:
  token issue
  refresh-token issue
  session encryption/decryption issue

manual_intervention:
  certificate expired
  certificate revoked
  cancellation limit exceeded
  source not approved

non_retryable:
  bad credentials
  invalid TIN
  schema errors
  most rule validation errors
```

V2 rule:

- Error-code catalog starts from docs and sandbox results.
- Unknown error code defaults to manual intervention, not blind retry.
- Retry policy must be auditable.

## 23. Buyer Notifications

Add:

```text
BuyerNotificationService
  sendInvoiceNotification
  sendCancellationNotification
  sendReceiptNotification
```

Channels:

```text
email
sms
print
```

Notification logs:

```text
invoiceId
receiptId
buyerEmail
buyerPhone
channel
status
sentAt
providerResponse
```

MoR evidence expects notification within a defined time window, so tests must cover this.

## 24. Targeted RLS

Do not migrate every SaaS table to RLS.

Use RLS for:

```text
eims_enterprise
eims_establishment
eims_source_system
eims_source_system_counter
eims_counter_reservation
eims_credential
eims_certificate
eims_submission
eims_bulk_batch
eims_bulk_batch_item
eims_receipt
tax_invoice
tax_invoice_line
tenant_buyer
eims_audit_event
```

Repository rule:

```text
EIMS/invoicing repositories use RLS-aware transaction helper.
Background jobs set app.organization_id before querying.
Admin metadata access uses explicit admin services.
Secrets are never returned through admin bypass.
```

Evidence wording:

- Base SaaS: application-level tenant isolation.
- EIMS/invoicing: targeted PostgreSQL RLS plus app-level scoping.

## 25. Tamper-Evident Audit Log

```text
EimsAuditEvent
  id
  organizationId
  enterpriseId
  establishmentId
  sourceSystemId
  actorId
  eventType
  payloadJson
  prevHash
  hash
  createdAt
```

Rules:

- Append-only.
- App role inserts only.
- Optional trigger blocks update/delete.
- Hash chain uses canonical payload.
- Uses trusted timestamp.
- Exportable for audit.

Events:

- Setup changes.
- Source approval changes.
- Credential access/rotation.
- Certificate import/rotation.
- Signing operation.
- Invoice state transitions.
- Submission attempts.
- Cancellation requests.
- Receipt submissions.
- Bulk callbacks.
- Compliance exports.

## 26. Phase 0 Technical Proof V2

Phase 0 must produce a written evidence report.

### Signing

- Confirm SHA512withRSA.
- Confirm padding: PKCS#1 v1.5 vs PSS.
- Confirm UTF-8 encoding.
- Confirm Base64 signature format.
- Confirm Vault Transit output normalization.
- Confirm certificate chain behavior.

### Canonicalization

- Confirm JSON serialization rules.
- Confirm key-order behavior.
- Confirm whitespace behavior.
- Confirm null handling.
- Confirm number formatting.
- Produce `EIMS_SIGNING_CONFIG.lock.json`.

### Schema and Payload

- Confirm datetime format.
- Confirm decimal precision.
- Confirm TIN/sub-TIN format.
- Confirm country/region/address code values.
- Confirm active document types.
- Confirm active transaction types.
- Confirm active cancellation reason codes.
- Confirm source system type behavior.
- Confirm tax codes and VAT-number rules.

### Authentication

- Confirm login request shape.
- Confirm whether login/auth payload itself must be signed.
- Confirm JWT validity duration.
- Confirm refresh-token behavior.
- Confirm credential rotation steps.

### Counter and Chain

- Confirm invoice counter strictness.
- Confirm gap behavior.
- Confirm duplicate counter behavior.
- Confirm `PreviousIrn` requirement.
- Confirm how to reconcile ambiguous network failures.

### Offline

- Confirm maximum offline duration.
- Confirm delayed submission/date rule behavior.
- Confirm whether pending local print is acceptable and exact wording if required.

### Callback

- Confirm callback authentication.
- Confirm headers.
- Confirm body shape.
- Confirm idempotency expectations.
- Confirm polling endpoint for reconciliation.

### Source and Version

- Confirm source approval workflow.
- Confirm whether softwareVersion changes require MoR notification.
- Confirm whether `permitNo`, `machineRegNo`, and `simCardNo` are required for the target deployment type.

### Exit Criteria

- Accepted sandbox invoice proves signing/canonicalization path.
- Phase 0 report records pass/fail/inconclusive findings.
- `CanonicalInvoice` v1 is locked.
- EIMS signing config is locked.
- Counter/PreviousIrn behavior is documented.
- Offline/callback/source approval rules are documented.

## 27. Phase 0 Test Assets

Use both Bruno and a Node runner.

```text
apps/api-tests/bruno/EIMS-Phase0/
  authentication/
  signing/
  invoice-registration/
  cancellation/
  verification/
  receipts/
  bulk/
  edge-cases/

scripts/phase0/
  run-phase0.ts
  fixtures/
  reports/
```

Important correction:

- Test keypairs generated locally are useful for local signing experiments.
- Real sandbox acceptance requires certificate/key material that EIMS/INSA recognizes.
- Phase 0 must use real sandbox credential/certificate flow once available.

Output:

```text
reports/eims-phase0-results.md
reports/eims-signing-config.lock.json
reports/eims-lookup-values-confirmed.json
reports/eims-counter-chain-findings.md
```

## 28. Build Order V2

### Phase 0: Technical Proof

Run expanded Phase 0 before production implementation.

### Phase 1: Foundation

- Enterprise/Establishment/SourceSystem.
- User branch/source assignments.
- Targeted RLS proof.
- Lookup/code registry.
- Decimal/date utilities.
- CanonicalInvoice v1.

### Phase 2: Vault and Signing

- Vault setup.
- SigningProvider.
- CSR strategy A/B.
- Certificate metadata/import/expiry.
- Vault key version tracking.

### Phase 3: EIMS Auth and Credential Lifecycle

- Encrypted credentials.
- Token refresh.
- Credential test.
- Rotation lifecycle.
- 2FA gates.

### Phase 4: Source Counter and Single Invoice

- Per-source queue.
- Counter reservation.
- PreviousIrn chain.
- Restaurant order paid -> CanonicalInvoice.
- Submit to sandbox.
- Store IRN/QR.
- Audit chain.

### Phase 5: Print, Receipt, Verification

- Compact print.
- A4 print.
- QR rendering from EIMS response.
- Sales receipt.
- Withholding receipt.
- IRN verification.
- Buyer notification.

### Phase 6: Cancellation and Bulk

- Cancellation reason/remark UI.
- Bulk registration.
- Bulk cancellation.
- Callback handling.
- Reconciliation polling.
- Error classification.

### Phase 7: Offline Pending-Sync

- Pending local invoice.
- Pending print marker.
- Offline cache encryption/integrity.
- Reconciliation.
- Aging alerts.

### Phase 8: Admin, Compliance, Operations

- Admin EIMS dashboard.
- Branch health dashboard.
- Compliance evidence generator.
- Data export/offboarding.
- Per-tenant rate limits.
- Hosting/datacenter evidence.
- DR runbook.

### Phase 9: Other Verticals

Apply the same EIMS core to:

- Retail.
- Supermarket.
- Hotel.
- Manufacturing.
- Wholesale.
- Spare parts.

## 29. Testing Plan V2

Required tests:

```text
lookup enum validators
buyer TIN rules
government buyer transaction type
document type related-document requirements
tax prefix VAT-number requirement
decimal precision and total calculations
datetime serialization
source approval guard
branch/source permission isolation
targeted RLS behavior
counter reservation race condition
ambiguous submission handling
PreviousIrn chain
signing provider boundary
certificate expiry
credential redaction
2FA enforcement
single submit
receipt submit
cancellation reason/remark
bulk callback/reconciliation
offline pending-sync
compact print required fields
A4 print required fields
QR scannability
buyer notification
error classification
per-tenant rate limiting
audit hash chain
```

Test locations:

```text
apps/api/src/modules/invoicing/**/*.spec.ts
apps/api/src/modules/eims/**/*.spec.ts
apps/api-tests/tests/eims.spec.ts
apps/api-tests/bruno/EIMS/
apps/e2e/tests/eims.spec.ts
apps/acceptance/features/eims.feature
apps/performance/k6/eims-submit.js
apps/performance/k6/eims-bulk.js
apps/security/scripts/eims-security-smoke.mjs
```

## 30. Compliance Evidence V2

Generate evidence continuously.

Technical:

- Architecture diagram.
- Data-flow diagram.
- Enterprise/Establishment/SourceSystem map.
- Component inventory in MoR format.
- Database schema.
- RLS policy list.
- Network diagram.
- Vault setup.
- NTP setup.
- Phase 0 report.

Security:

- Secret scan.
- Dependency scan.
- SAST results.
- TLS config.
- RBAC matrix.
- 2FA evidence.
- Vault audit sample.
- EIMS audit hash-chain sample.
- Key management procedure.

Operational:

- Backup/restore test.
- DR runbook.
- Monitoring screenshots.
- Uptime/SLA evidence.
- Certificate expiry procedure.
- Data export/offboarding policy.
- Guarantee renewal calendar if applicable.

Functional:

- B2C VAT invoice.
- B2B invoice.
- Government buyer invoice.
- Multi-VAT items.
- Credit/debit note.
- Cancellation.
- Sales receipt.
- Withholding receipt.
- Bulk registration.
- Print compact/A4.
- QR scan.
- Multi-branch/source isolation.
- Offline reconciliation.
- Buyer notification.

Legal/process:

- Authorization letter template.
- Certificate request form.
- Commitment form.
- Letter of guarantee if applicable.
- Guarantee renewal tracking if applicable.

## 31. Risk Register V2

| Risk | Mitigation |
|---|---|
| MoR/EIMS outage | Treat as offline/pending-sync, queue, status page, tenant notifications. |
| Cancellation limits | Track limit errors, warn tenant, manual MoR support workflow. |
| Certificate revocation | Detect, disable source, notify tenant, re-cert workflow. |
| Sub-TIN not issued | Track blocked establishment setup, allow operation only where rules permit. |
| Time-zone boundary errors | Store local creation and EIMS acceptance timestamps, use Addis Ababa timezone in payload. |
| Concurrent source edits | Add version/optimistic locking and audit diff. |
| Software version mismatch | Track lastUpgradeDate/softwareVersion, Phase 0 confirms MoR notification requirement. |
| EIMS table migration risk | Senior review, backup, migration safety checklist, production-like test data. |
| Tenant disputes submission status | Audit hash chain, submission logs, tenant-accessible evidence export. |
| Single VPS failure | Scaling triggers and DR plan. |
| Unknown EIMS error code | Manual intervention by default, add to error catalog after review. |
| Ambiguous network failure after submit | Mark source unknown/manual-review until reconciled. |

## 32. Scaling Triggers

Single VPS is acceptable early, but define scale triggers.

```text
> 10 active tenants:
  Add stronger backup/restore automation and uptime monitoring.

> 100 invoices/min peak:
  Separate worker process and tune queues.

> 50 active tenants:
  Consider dedicated PostgreSQL VPS.

Multiple verticals in production:
  Consider separate Vault VPS.

3+ SaaS products in production:
  Re-evaluate standalone EIMS gateway.
```

## 33. Final V2 Position

The final V2 architecture is:

```text
Business event
  -> Branch/source context
    -> CanonicalInvoice
      -> Source counter + PreviousIrn
        -> EIMS signing/submission
          -> IRN/QR/audit/notification
```

The highest-priority additions before implementation are:

1. Expanded Phase 0.
2. Lookup/code registry.
3. Enterprise/Establishment/SourceSystem plus source approval workflow.
4. Per-source counter and PreviousIrn chain.
5. Decimal/date validation.
6. 2FA for EIMS-sensitive actions.
7. Print layouts.
8. Buyer/government buyer directory.
9. Error classification.
10. Targeted RLS proof.

This plan is now ready for Phase 0. Implementation should not start with the full EIMS module; it should start by proving the unknowns and locking the canonical contract.

# EIMS Final Agreed SaaS Architecture Plan V3

This is the V3 controlling plan for integrating Ethiopian EIMS/EIRMS
e-invoicing inside a generated SaaS project after scaffolding.

Template implementation plan:

- `docs/EIMS_SAAS_TEMPLATE_IMPLEMENTATION_PLAN.md`

V3 merges:

- V2 plan (preserved in full where correct).
- V2 critique fixes (16 new gaps closed).
- Restored content dropped between V1 and V2 (Vault ops, hosting,
  guarantee strategy, migration path, notification providers).
- Reviewer pushbacks (offline QR, gateway extraction, signing deferral,
  RLS scope, no premature root packages).

V3 is the version you take to INSA paperwork and Phase 0 execution.

---

## 1. V3 Executive Summary

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

V3 controlling decisions:

1. First-class Enterprise -> Establishment/Branch -> SourceSystem.
2. Per-source invoice counter with reservation lifecycle.
3. EIMS lookup/code registry runtime-configurable via API endpoints.
4. Source approval workflow with hard submission guards.
5. Targeted PostgreSQL RLS for EIMS/invoicing compliance tables only.
6. 2FA enforcement with explicit bootstrap flow.
7. Compact thermal and A4 print layouts.
8. Buyer and government-buyer directory.
9. Decimal-safe money/quantity, Addis Ababa timezone.
10. Expanded Phase 0 with Layer A (local) and Layer B (sandbox).
11. Vault Transit signing with documented operational runbook.
12. Bank Letter of Guarantee held by one parent legal entity.
13. Restaurant SaaS as first integration with explicit pilot rollout.
14. Existing tenant migration documented.
15. SMS/email provider defaults selected.

## 2. Final Pushbacks Preserved

These are deliberate constraints. Do not relax them without team review.

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

Use targeted PostgreSQL RLS only for EIMS/invoicing compliance tables
(listed in Section 25).

### 2.4 Do Not Hardcode Signing Algorithm Yet

The certificate guideline mentions `SHA512withRSA`, but Phase 0 must
prove:

- Hash algorithm.
- RSA padding mode (PKCS#1 v1.5 vs PSS).
- Canonical JSON format.
- Base64 encoding.
- Vault Transit signature output normalization.

### 2.5 Do Not Add Root Packages Prematurely

The generated SaaS workspace currently uses:

```yaml
packages:
  - "apps/*"
```

V3 keeps EIMS constants inside the generated app:

```text
apps/api/src/modules/eims/shared/constants/
apps/api/src/modules/eims/shared/lookups/
apps/api/src/modules/eims/shared/schemas/
```

The web app consumes active lookup values from API endpoints:

```text
GET /api/v1/eims/lookups/document-types
GET /api/v1/eims/lookups/transaction-types
GET /api/v1/eims/lookups/source-system-types
GET /api/v1/eims/lookups/cancellation-reasons
GET /api/v1/eims/lookups/tax-codes
GET /api/v1/eims/lookups/payment-modes
GET /api/v1/eims/lookups/units
GET /api/v1/eims/lookups/nature-of-supply
GET /api/v1/eims/lookups/regions
```

Lookup endpoint behavior:

- Global lookups (document-types, transaction-types, etc): cacheable
  by all tenants, 5-minute client cache, ETag/version header.
- Per-tenant lookups (tax-codes): scoped by tenant, since registered
  tax accounts vary.
- Response includes `version` and `updatedAt` headers.
- Admin "Refresh lookups from MoR" button invalidates cache.

Extract to a shared workspace package only when 3+ SaaS products are in
production and need a common version.

### 2.6 Do Not Hold Long DB Transactions Across External Calls

Counter reservation, signing, and EIMS submission must not be wrapped in
one long `SELECT ... FOR UPDATE` transaction. Use the per-source queue
strategy in Section 11.

## 3. Source Documents Used

| Source | Used for |
|---|---|
| `EIMS_compliance_Draft.pdf` | Auth, registration, schema, signing, bulk, receipts, verification, cancellation, callback, error codes, print, datetime, decimal, document/source/transaction types. |
| `EimsCoreApiMockCollection2.postman_collection.json` | Request/response examples, field names, reason code 6 in mock bulk cancel, receipt/withholding examples. |
| `certificate_guideline.pdf` and `.docx` | Private key, CSR, certificate request, signing process, SHA512withRSA mention, JSON serialization guidance. |
| `einvoice.cnf` | CSR subject shape, `default_md=sha256` proves signing details must be verified. |
| `Certificate Request form v.1.docx` | Taxpayer/contact fields and system ID requirements. |
| `Self-onboarding and Source Registration Guide.pdf` | Portal signup, verification, 2FA (Microsoft/Google Auth, FreeOTP), enterprise/establishment/source workflow. |
| `MoR_BSP_Master.docx` | SaaS checklist, branch traceability, sub-TIN, offline mode, NTP, buyer notification, paper print, datacenter, export/deletion, rate limits. |
| `compliance check list.pdf` | Governance, security, TLS, access control, retention, WORM, offline cache. |
| `Cybersecurity Audit minimum Requirements2.pdf` | WORM logs, trusted time, offline cache encryption/integrity, secure comms, key management, provisioning. |
| `Commitment Form v1.1.docx` | Provider retesting and improvement process. |
| `Letter of Guarantee-after comment-V1.2.docx` | USD 30K guarantee, 2-year renewable. |
| `ERCA Admin authorization letter` | Authorization request format. |
| `buyer list .docx` | Buyer master-data seed shape. |
| `Gov.t inst. list .docx` | Government buyer master-data seed shape. |

## 4. Workspace Layout

Top-level workspace:

```text
packages:
  - "apps/*"

apps/
  api/                  NestJS backend
  web/                  Vite + React frontend
  api-tests/            Bruno + integration tests
  e2e/                  Playwright end-to-end
  acceptance/           BDD-style compliance tests
  performance/          k6 load tests
  security/             Security smoke tests
```

Inside `apps/api`:

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
      notifications/
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

First-class hierarchy. Every business event resolves to all four IDs.

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
  Owns system number, source type, source approval status,
  credential, certificate.

EimsSourceSystemCounter
  Owns invoice counter and previous IRN chain per source.
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

## 6. Core Data Model

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
  status                    // draft, pending_verification, active, suspended
  createdAt
  updatedAt
```

### 6.2 Establishment

```text
EimsEstablishment
  id
  organizationId
  enterpriseId
  establishmentNo           // assigned by MoR
  name                      // user-defined
  code                      // user-defined short code
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
  status                    // draft, pending_subtin, active, closed
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
  name                      // user-defined
  systemNumber              // from MoR portal
  systemType                // POS, ERP, CRM, SYS, MAN, EFD
  model
  manufacturer
  softwareVersion
  serviceType
  serviceCenterTin
  serviceDate
  lastUpgradeDate
  permitNo                  // MoR-assigned
  machineRegNo              // MoR-assigned
  simCardNo
  inHouseDeveloped
  approvalStatus            // draft, submitted_to_mor_portal,
                            // pending_mor_approval, approved,
                            // rejected, suspended, decommissioned
  active
  credentialId
  certificateId
  createdAt
  updatedAt
  version                   // optimistic locking
```

Submission guard:

```text
sourceSystem.approvalStatus == approved
sourceSystem.active == true
credential configured and tested within last 24h
certificate valid and not expired
counter row initialized
```

### 6.4 User Branch/Source Assignments

```text
UserEstablishmentAssignment
  id
  organizationId
  userId
  establishmentId
  role                      // branch_manager, accountant, cashier, viewer, auditor
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

### 6.5 Canonical Invoice (V1 Contract)

Locked in Phase 0. Initial shape:

```text
CanonicalInvoice
  id
  organizationId
  enterpriseId
  establishmentId
  sourceSystemId
  transactionType           // B2B, B2C, B2G, G2B, G2C
  documentType              // INV, CRE, DEB, INT, RTN, FIN, MIX, INC, PRF, OVD
  documentNumber
  manualInvoiceNumber       // for paper-to-digital migration
  documentDate              // business creation time, Addis Ababa TZ
  reason                    // required for CRE, DEB, INT, FIN
  invoiceCurrency           // ISO 4217
  exchangeRate              // required if currency != ETB
  previousIrn               // chain reference
  relatedDocument           // required for CRE, DEB, INT, FIN
  purchaseOrder
  contract
  firstTicket
  lastTicket
  seller {
    tin
    subTin
    legalName
    tradeName
    vatNumber
    email
    phone
    address { ... }
  }
  buyer {
    tin
    subTin
    legalName
    tradeName
    vatNumber
    email
    phone
    idType
    idNumber
    isGovernment
    address { ... }
  }
  lines [{
    lineNumber
    natureOfSupplies
    itemCode
    harmonizationCode
    productDescription
    unitPrice
    quantity
    unit
    preTaxValue
    discount
    exciseTaxValue
    taxCode
    taxAmount
    totalLineAmount
  }]
  payment {
    paymentTerm             // IMMIDIATE (spec spelling)
    mode
  }
  valueDetails {
    totalValue
    taxValue
    discount
    exciseValue
    transactionWithholdValue
    incomeWithholdValue
  }
  cashierName
  salesPersonName
  sourceBusinessEvent       // for traceability back to business module
```

## 7. Branch Context and UI

Every relevant request must include or resolve branch/source context.

### 7.1 Context Resolution Priority

```text
1. Explicit sourceSystemId in request
2. Explicit establishmentId in request
3. URL parameter (?branch=X) for shareable links
4. User session active branch (localStorage)
5. User's primary establishment assignment
6. If single branch access: implicit, no switcher needed
7. If no establishment: redirect to setup
8. Reject if ambiguous and required
```

### 7.2 UI Components

```text
BranchSwitcher
  Hidden when user has access to only one branch.
  Shows current active branch.
  "All Branches" overview option for owners/admins.

SourceSystemSelector
  For cashiers locked to a specific POS.

BranchHealthCard
  Per-branch metrics, alerts, source approval status.

EimsSetupProgress
  Step-by-step completion indicator.

SourceApprovalStatusBadge
  PENDING / APPROVED / REJECTED visual indicator.
```

### 7.3 Branch Switching Behavior

- Switching branch: clear cached branch-scoped data, then navigate.
- URL with branch user cannot access: redirect with explanatory notice.
- Logout: clear branch context from session storage.
- Deep-link with `?branch=X`: respected if user has access.

### 7.4 Views by Role

```text
Owner / admin:
  All branches and aggregate stats.
  Can switch between branches.

Branch manager:
  Assigned branch only.
  Switcher hidden if single assignment.

Cashier:
  Assigned source system only.
  Locked to one POS at one branch.

Accountant:
  May span all branches or be branch-scoped per assignment.

Auditor:
  Read-only branch or all-branch based on assignment.
```

## 8. Lookup Codes and Validators

Known values encoded as defaults. Active lists configurable via lookup
endpoints because spec says many fields are "select from list" and may
be backoffice-configured.

### 8.1 Cancellation Reason Codes

```text
1 = Duplicate
2 = Data entry mistake
3 = Order Cancelled
4 = Others
6 = Calculation Error           (mock-observed, Phase 0 confirms)
```

Rules:

- `Remark` is required when code is `4`.
- Store reason code and remark in audit log.
- `6` shipped as `mock_observed_unconfirmed` until Phase 0 confirms.

### 8.2 Document Types

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

- `CRE`, `DEB`, `INT`, `FIN` require `Reason` and `RelatedDocument`.

Vertical defaults:

```text
Restaurant paid order        -> INV
Restaurant refund            -> CRE
Hotel deposit                -> INT
Hotel checkout               -> FIN
Hotel quote                  -> PRF
Retail sale                  -> INV
Retail return                -> CRE
Retail price adjustment      -> DEB
Supermarket POS sale         -> INV
Manufacturing quote          -> PRF
Manufacturing delivery       -> INV
Wholesale order              -> INV
Wholesale intercompany       -> INC
```

### 8.3 Source System Types

```text
POS = Point of Sale
ERP = Enterprise Resource Planning
CRM = Customer Relationship Management
SYS = System
MAN = Manual
EFD = Electronic Fiscal Device
```

Rule: `ItemCode` is required when SystemType is not `MAN`.

Vertical defaults:

```text
restaurant     -> POS
retail         -> POS
supermarket    -> POS
hotel          -> ERP or POS depending on outlet
manufacturing  -> ERP
wholesale      -> ERP
spare parts    -> POS or ERP
```

### 8.4 Transaction Types

```text
B2B = Business to Business
B2C = Business to Consumer
B2G = Business to Government
G2B = Government to Business
G2C = Government to Consumer
```

Rules:

- Buyer TIN required unless type is `B2C` or `G2C`.
- For `B2C`/`G2C`, BuyerDetails.Tin must be null.
- If BuyerDetails.Tin is null, BuyerDetails.VatNumber must be null.
- Government buyer lookup helps classify `B2G`.

### 8.5 Tax Codes

Prefix convention:

```text
VAT = VAT prefix
TOT = Turnover tax prefix
EXC = Excise prefix
```

Known examples:

```text
VAT15, VAT0, VATEX, TOT2, TOT10, EXC5, EXC10
```

Rules:

- If any item tax code starts with `VAT`, seller VAT number is required.
- Full active list is per-tenant (varies by registered tax accounts).
- Store in lookup/config table, not only TypeScript constants.

### 8.6 Payment Modes and Terms

Modes:

```text
CASH, CHEQUE, CPO, Local Bank Transfer, SWIFT, Wire Transfer,
Letter of Credit, Card, Credit, Direct Transfer
```

Terms:

```text
IMMIDIATE (sic, spec spelling - support exactly while displaying "Immediate")
ADVANCE
CREDIT
COD
N days terms (free text, e.g. "10/15, 5/20, N/30")
```

Rules:

- If `PaymentTerm` is not `IMMIDIATE`, `TransactionWithholdValue` or
  `IncomeWithholdValue` must be present.
- Phase 0 confirms whether corrected spelling `IMMEDIATE` is accepted.

### 8.7 Units and Nature of Supply

Known seeds:

```text
Units: PCS, KG, G, L, ML, M, CM, M2, M3, BOX, CTN, DZ, PKT,
       ROLL, HR, DAY, MO, NT, PER, SVC
Nature: Goods, Service
```

Phase 0/MoR liaison confirms official active list.

### 8.8 Region and Address Codes

Seed Ethiopian region codes:

```text
1  = Tigray
2  = Afar
3  = Amhara
4  = Oromia
5  = Somali
6  = Benishangul-Gumuz
7  = SNNPR (Southern Nations)
8  = Gambela
9  = Harari
10 = (reserved)
11 = Sidama
12 = South West Ethiopia Peoples
13 = (reserved or transitional)
14 = Addis Ababa
15 = Dire Dawa
```

Use dropdowns, not free text. Support import from MoR source if
available. Keep configurable values as fallback.

### 8.9 TIN and Sub-TIN Format Validators

Provisional rules (Phase 0 confirms):

```text
TIN          : 10 digits numeric (e.g., "0074136947")
Sub-TIN      : TIN-NN format (e.g., "0074136947-01")
Foreign TIN  : 10-20 digits per schema (rare)
```

Validate at canonical invoice creation, not at EIMS submission. Reject
malformed TINs before they reach EIMS for better UX.

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
  buyerType                 // individual, business, government
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
  idType                    // for B2C with national ID
  idNumber                  // field-level encrypted (see Section 10.3)
  frequentBuyer
  active
  createdAt
  updatedAt
```

Use cases:

- Fast B2B buyer lookup at POS/accounting screen.
- Government buyer lookup for B2G/G2B classification.
- Avoid retyping buyer TIN and address.
- Validate buyer TIN before submission.

Seed/import sources:

- `buyer list .docx`
- `Gov.t inst. list .docx`
- Tenant-uploaded CSV.

Pushback:

- Do not make SaaS signup TIN-first. Non-EIMS SaaS users may still start
  with normal account creation.
- EIMS onboarding adds TIN/contact verification.

## 10. Decimal, Date, and PII Handling

### 10.1 Money and Quantity

Use Prisma `Decimal` mapped to PostgreSQL `numeric`.

Use Decimal.js or equivalent in domain logic.

Precision from spec:

```text
money         : Decimal 20,2
quantity      : Decimal 20,4
exchangeRate  : Decimal (Phase 0 confirms scale)
```

Tests:

- Line totals.
- Tax sums.
- Total value.
- Withholding.
- Foreign currency exchange rate.
- Decimal serialization in payload.

Never use native JavaScript Number for amounts.

### 10.2 Date and Time

Phase 0 confirms exact accepted format.

Known examples from spec:

```text
ISO 8601 expected
GMT+3 default
Format: yyyy-mm-dd hh:mm:ss.fff+/-hh:mm
Example in spec: 2024-12-20T10:18:35.346863361+03:00[Africa/Addis_Ababa]
Example in cert guideline: 21-03-2025T00:00:00
```

Until confirmed:

- Store all times in UTC in DB.
- Display business time in `Africa/Addis_Ababa`.
- Send EIMS payload in Phase 0-confirmed format.
- Audit both local creation time and EIMS acceptance time.

`DocumentDetails.Date` rule:

- Reflects business creation time, not submission time.
- If pending offline crosses day boundary, original creation date is
  preserved.
- Phase 0 confirms whether EIMS rule 7026 rejects yesterday's date
  arriving today.

### 10.3 Field-Level PII Encryption

Sensitive PII columns get envelope encryption at rest:

```text
TenantBuyer.idNumber              // national ID, sensitive
EimsCredential.clientSecret       // secret
EimsCredential.apiKey             // secret
EimsCredential.password           // secret
EimsCredential.refreshToken       // long-lived secret
```

Not field-encrypted (not secret, or volatile elsewhere):

```text
TIN, sub-TIN                      // public identifier
clientId                          // identifier, not secret
username                          // identifier
accessToken                       // stored in Redis with TTL instead
```

Envelope encryption:

```text
columnName              : ciphertext bytes
columnName_keyVersion   : envelope key version (rotated annually)
columnName_iv           : initialization vector

Master key in Vault transit/keys/pii-envelope-key
```

Library: Prisma client extension or interceptor-based encryption.

## 11. Invoice Counter and Previous IRN Chain

This is critical and easy to get wrong.

### 11.1 Data Model

```text
EimsSourceSystemCounter
  id
  organizationId
  sourceSystemId            // unique
  lastAcceptedCounter       // last counter that produced an accepted IRN
  lastAcceptedIrn           // for PreviousIrn chain
  lastIssuedAt
  status                    // healthy, blocked_unknown, blocked_manual
  version
  updatedAt

EimsCounterReservation
  id
  organizationId
  sourceSystemId
  invoiceId
  counter
  previousIrn
  payloadHash               // SHA-256 of canonical JSON
  status                    // see below
  eimsRequestId
  createdAt
  submittedAt
  acceptedAt
  failedAt
  errorCode
  errorDetail
```

### 11.2 Reservation Status Policy

```text
reserved
  Counter allocated, payload not yet sent to EIMS.

submitting
  Payload sent, awaiting EIMS response.

accepted
  EIMS returned IRN. Counter consumed, lastAcceptedIrn updated.

rejected_reusable
  Pre-submission validation failed OR EIMS returned 4xx auth/schema
  error BEFORE processing payload content. Counter may be reused for
  the next attempt (which gets a new reservation).

rejected_consumed
  EIMS returned rule validation error (406) AFTER processing payload.
  Counter is consumed. Next invoice must use the next counter value.
  This preserves the EIMS-side perception of the counter sequence.

unknown
  Network failure, timeout, or ambiguous response. Cannot determine
  if EIMS processed. Source queue is BLOCKED until reconciliation.

manual_review
  Operator decision required. Source queue BLOCKED.
```

Rule of thumb:

- If EIMS never saw the payload, counter is reusable.
- If EIMS saw the payload (even if rejected on rules), counter is
  consumed.
- If you do not know, treat as unknown and reconcile.

Phase 0 must confirm:

- Does EIMS reject duplicate counters?
- Does EIMS reject gaps in counter sequence?
- How does reconciliation API work?

### 11.3 Per-Source Queue Strategy

Use per-source queue serialization plus short DB transactions.

```text
Queue infrastructure: BullMQ on Redis
Queue per source     : eims:submission:source:{sourceSystemId}
Concurrency per queue: 1
Submission timeout   : 60 seconds (configurable per tenant tier)
```

Flow:

```text
1. Validate invoice before reserving counter.
2. Reserve counter in a short DB transaction.
3. Submit to EIMS outside long DB transaction.
4. On accepted response, confirm counter and lastAcceptedIrn.
5. On clear pre-submission failure, mark reservation rejected_reusable.
6. On rule-validation failure, mark reservation rejected_consumed.
7. On timeout or ambiguous failure, mark reservation unknown and
   block source queue.
8. Reconciliation worker polls EIMS verify endpoint for unknown
   reservations after configurable delay.
```

Why this is safer than long `FOR UPDATE` locks:

- No duplicate counters across concurrent POS lanes.
- No long DB locks during network calls.
- No POS lane blocking due to DB contention.
- Ambiguous cases are visible and auditable.

### 11.4 Previous IRN Chain

Every accepted invoice updates:

```text
lastAcceptedIrn
lastAcceptedCounter
lastIssuedAt
```

Every new payload includes:

```text
ReferenceDetails.PreviousIrn = lastAcceptedIrn
SourceSystem.InvoiceCounter  = next counter
```

Phase 0 confirms whether `PreviousIrn` is always required or
conditionally required for the first invoice from a source.

### 11.5 Ambiguous Submission Handling

If the request may have reached EIMS but no response received:

```text
1. Mark reservation as unknown.
2. Set source counter status to blocked_unknown.
3. Stop further submissions on this source queue.
4. Run reconciliation:
   a. Call EIMS verify endpoint with payload hash (if supported)
   b. Or call /verify with expected IRN format if predictable
   c. Or wait and try registration again (may get duplicate error
      if EIMS accepted, which tells you it was accepted)
5. If accepted: confirm IRN and counter, unblock queue.
6. If not accepted: counter is reusable (per Phase 0 policy).
7. Record audit event with full chain of attempts.
```

Do not blindly reuse counters after an ambiguous failure.

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
credential tested within 24h
certificate valid (not expired, not revoked)
counter row initialized
```

Metadata fields:

```text
serviceDate
lastUpgradeDate
serviceType
serviceCenterTin
softwareVersion
permitNo                    // MoR-assigned
machineRegNo                // MoR-assigned
simCardNo                   // for mobile/connected POS
updateRequestedStatus
```

Rules:

- `lastUpgradeDate` updates when software version changes.
- `permitNo` and `machineRegNo` are MoR-assigned at approval time.
- `simCardNo` is optional for connected/mobile POS.
- Phase 0 confirms whether MoR must be notified via API or portal
  when softwareVersion changes.

## 13. EIMS Credentials and Sandbox/Production Separation

### 13.1 Environment Configuration

```text
EIMS_ENV                       = sandbox | production
EIMS_BASE_URL_SANDBOX          = https://sandbox.eims.mor.gov.et/api/v1
EIMS_BASE_URL_PRODUCTION       = https://eims.mor.gov.et/api/v1
EIMS_BULK_URL_SANDBOX          = https://sandbox.eims.mor.gov.et/api/v1/bulkInvoice
EIMS_BULK_URL_PRODUCTION       = https://eims.mor.gov.et/api/v1/bulkInvoice
```

Rules:

- Sandbox and production never share credentials, certificates, or
  signing keys.
- Vault namespaces separate sandbox and production:
  - `transit/keys/sandbox/org-{orgId}-source-{sourceId}`
  - `transit/keys/production/org-{orgId}-source-{sourceId}`
- Database column `environment` on EimsCredential and EimsCertificate
  to prevent cross-environment use.

### 13.2 Credential Lifecycle

```text
initial_setup
tested
active
rotation_requested
rotated
suspected_compromise
retired
```

### 13.3 Credential Storage

```text
EimsCredential
  id
  organizationId
  sourceSystemId
  environment                     // sandbox or production
  clientId                        // plain (identifier)
  username                        // plain (identifier)
  clientSecret_encrypted          // envelope encrypted
  clientSecret_keyVersion
  apiKey_encrypted
  apiKey_keyVersion
  password_encrypted
  password_keyVersion
  refreshToken_encrypted
  refreshToken_keyVersion
  tokenExpiresAt
  lastTestedAt
  lastTestStatus
  lastRotatedAt
  status                          // see lifecycle
  createdAt
  updatedAt
```

Access tokens are kept in Redis with TTL, not in PostgreSQL.

```text
Redis key: eims:token:{environment}:{sourceSystemId}
TTL      : tokenExpiresAt - now
```

Rules:

- Store secrets envelope-encrypted at rest.
- Redact in logs and API responses.
- Rotation can be tenant-requested or policy-triggered.
- Emergency rotation disables source until tested again.

## 14. 2FA Enforcement and Bootstrap

### 14.1 Sensitive Permissions Requiring 2FA

Always required (no exceptions):

```text
invoice:submit
invoice:cancel
eims.credential:create
eims.credential:rotate
eims.certificate:import
eims.certificate:rotate
eims.source:create
eims.source:update
eims.compliance:export
```

Required by default, tenant admin can grant per-user exception:

```text
eims.*:read
invoice:read
audit:read
```

Exceptions are logged in audit log and re-prompted every 90 days.

### 14.2 Supported Authenticators

- Microsoft Authenticator.
- Google Authenticator.
- FreeOTP.
- Any standard TOTP app.

Match MoR portal's supported list to reduce tenant confusion.

### 14.3 2FA Bootstrap Flow

Solves the chicken-and-egg problem: new owner cannot access EIMS setup
without 2FA, but cannot easily set up 2FA without onboarding.

```text
First-login for users with EIMS-sensitive roles:

Step 1: Profile completion (forced)
Step 2: 2FA setup (forced before any EIMS access)
   - Display QR code
   - User scans with authenticator app
   - User enters TOTP code to confirm
   - Recovery codes generated and downloaded
Step 3: Proceed to EIMS onboarding wizard
   - Enterprise creation
   - Establishment creation
   - Source system addition
   - CSR generation / certificate upload
   - Credential testing
```

Existing users gaining EIMS-sensitive roles:

```text
On next login, forced 2FA setup flow before accessing EIMS routes.
Other SaaS features remain accessible without 2FA.
```

Lost authenticator recovery:

```text
- Recovery codes (downloaded at 2FA setup)
- Tenant admin can disable 2FA for affected user (logged in audit)
- New 2FA setup forced on next login
```

## 15. Signing and Key Management

### 15.1 Signing Provider Abstraction

```ts
interface SigningProvider {
  sign(input: {
    canonicalJson: string;
    organizationId: string;
    sourceSystemId: string;
    environment: 'sandbox' | 'production';
    algorithm: string;
  }): Promise<{
    signature: string;
    keyVersion: string;
    algorithm: string;
  }>;
}
```

Implementations:

```text
LocalSigningProvider
  Dev/sandbox fallback only. Encrypted private key in DB.

VaultSigningProvider
  Production default. Uses Vault Transit.

KmsSigningProvider
  Future cloud option (AWS KMS, etc).

SoftHsmSigningProvider
  Future only if INSA requires PKCS#11/HSM.
```

Provider selection via `EIMS_SIGNING_PROVIDER` environment variable.

### 15.2 Submission Records Include Cryptographic Context

```text
EimsSubmission stores:
  keyProvider
  keyRef
  keyVersion
  signatureAlgorithm
  canonicalizationVersion
  payloadHash
```

This supports key rotation and historical signature verification.

### 15.3 Key Rotation Policy

Trigger conditions:

```text
Scheduled    : Annual rotation
Emergency    : Suspected compromise
Operational  : Source decommission
Administrative: Certificate expiry approaching
```

Rotation procedure:

```text
1. Generate new key version in Vault Transit:
   transit/keys/{env}/org-{orgId}-source-{sourceId}/rotate
2. Generate CSR with new public key.
3. Tenant submits CSR to INSA.
4. New certificate uploaded.
5. SigningProvider updated to use new key version for new signatures.
6. Old key version retained for verifying historical signatures.
7. Audit event for rotation.
```

Verification of historical invoices:

```text
- Each EimsSubmission records keyVersion.
- Vault retains old key versions for verify operations.
- Public certificate kept indefinitely for chain validation.
- Historical signatures verifiable years after rotation.
```

## 16. Vault Operational Runbook

### 16.1 Deployment Topology

```text
First 50 tenants:
  Vault co-located on same VPS as API.
  6GB VPS budget:
    API + workers          ~1.5GB
    PostgreSQL             ~1GB
    Redis                  ~200MB
    Vault                  ~500MB
    nginx                  ~50MB
    Linux + headroom       ~1.5GB
    Swap (recommended)     2-4GB

After 50 tenants:
  Vault on its own VPS.
  Vault server reachable only from API VPS (private network).

After 3+ SaaS products:
  Re-evaluate Vault HA topology.
```

### 16.2 Installation

```bash
# Install via apt
curl -fsSL https://apt.releases.hashicorp.com/gpg | sudo gpg --dearmor \
  -o /usr/share/keyrings/hashicorp-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] \
  https://apt.releases.hashicorp.com $(lsb_release -cs) main" | \
  sudo tee /etc/apt/sources.list.d/hashicorp.list
sudo apt update && sudo apt install vault

# Configure as systemd service (NOT under PM2)
sudo systemctl enable vault
sudo systemctl start vault
```

### 16.3 Configuration

```hcl
# /etc/vault.d/vault.hcl

storage "file" {
  path = "/opt/vault/data"
}

listener "tcp" {
  address     = "127.0.0.1:8200"
  tls_disable = "false"
  tls_cert_file = "/etc/vault.d/tls/cert.pem"
  tls_key_file  = "/etc/vault.d/tls/key.pem"
}

api_addr = "https://127.0.0.1:8200"
ui = false

audit {
  type = "file"
  options = {
    file_path = "/var/log/vault/audit.log"
  }
}
```

### 16.4 Initialization

```bash
# Initialize with Shamir 5-of-3
vault operator init -key-shares=5 -key-threshold=3

# Output: 5 unseal keys + 1 root token
# Distribute unseal keys to 5 trusted people:
#   - You (CEO/CTO)
#   - Your co-founder
#   - Your senior engineer
#   - Your legal counsel (sealed envelope)
#   - Your accountant (sealed envelope)
# Threshold of 3 needed to unseal.
# Root token: stored in offline encrypted backup, not used routinely.
```

### 16.5 Unseal Strategy

Production: Manual unseal preferred for security.

```bash
# After every restart or system reboot
vault operator unseal <shard-1>
vault operator unseal <shard-2>
vault operator unseal <shard-3>
```

Automation alternative (for unattended recovery):

```text
Vault auto-unseal with Cloud KMS (AWS/Azure/GCP) if you have a cloud
account separate from the SaaS infrastructure.

This is optional and only if 24/7 availability without manual
intervention is required.
```

### 16.6 Auto-Restart Behavior

```bash
# /etc/systemd/system/vault.service has:
Restart=on-failure
RestartSec=5

# But Vault starts SEALED after restart.
# Until unsealed, signing fails.
# API must handle this:
#   - Detect sealed state via Vault status endpoint
#   - Mark all submissions as failed_retryable
#   - Pause all source queues
#   - Alert operators (PagerDuty / email)
#   - Resume after manual unseal
```

### 16.7 Backup and Restore

```bash
# Daily encrypted snapshot
vault operator raft snapshot save \
  /var/backups/vault/snapshot-$(date +%Y%m%d).snap

# Encrypt snapshot
gpg --encrypt --recipient ops@yourdomain \
  /var/backups/vault/snapshot-*.snap

# Upload to off-server storage (S3-compatible)
rclone copy /var/backups/vault/ remote:vault-backups/
```

Restore procedure (quarterly drill):

```bash
# On staging environment
vault operator raft snapshot restore \
  /tmp/snapshot-decrypted.snap
# Then unseal with original shards
```

### 16.8 When Vault Is Unreachable

API behavior:

```text
1. SigningProvider detects Vault timeout (5s threshold).
2. Mark current submission as failed_retryable.
3. Source queue paused (concurrency 0).
4. Health check fails.
5. Admin alert raised (email + dashboard).
6. NO fallback to plain-text key. Security boundary preserved.
7. On Vault recovery, source queues resume automatically.
```

### 16.9 Audit Log Retention

```text
Vault audit log path: /var/log/vault/audit.log
Rotation            : daily via logrotate
Retention on server : 30 days
Off-server archive  : 7 years (compliance requirement)
```

logrotate config:

```text
/var/log/vault/audit.log {
  daily
  rotate 30
  compress
  delaycompress
  missingok
  postrotate
    /bin/kill -HUP $(cat /var/run/vault.pid)
  endscript
}
```

## 17. CSR and Certificate Flow

### 17.1 Strategy A: Vault-Generated Keypair (Recommended)

```text
1. Vault creates keypair inside Transit engine.
2. System exports CSR only (private key never leaves Vault).
3. Tenant submits CSR to INSA (ica@insa.gov.et) with required forms.
4. Tenant uploads issued certificate to SaaS.
5. System validates certificate chain to Ethiopian National Root CA.
6. Vault retains private key.
```

### 17.2 Strategy B: Tenant-Generated Keypair

```text
1. System provides OpenSSL instructions and einvoice.cnf template.
2. Tenant generates keypair locally on their workstation.
3. Tenant submits CSR to INSA.
4. Tenant uploads certificate AND encrypted private key.
5. System imports private key into Vault.
6. Temporary upload artifacts are securely destroyed.
```

### 17.3 CSR Subject

Per einvoice.cnf template:

```text
C            = ET
ST           = (region name)
L            = (locality)
O            = (legal organization name)
OU           = (establishment or organizational unit, optional)
CN           = (taxpayer TIN)
serialNumber = (EIMS source system number)
subjectAltName = email:(registered email)
```

### 17.4 Certificate Expiry Job

```text
Daily cron job:
  for each EimsCertificate:
    if validTo < now + 90 days:
      notify tenant owner (email)
      flag in admin dashboard
    if validTo < now + 60 days:
      notify tenant admin (email + in-app)
    if validTo < now + 30 days:
      notify all EIMS users (email + in-app)
      escalate in admin dashboard
    if validTo < now + 7 days:
      daily reminder + executive escalation
    if validTo < now:
      disable source (block submissions)
      raise critical alert
```

## 18. Invoice State Machine

```text
draft
validated
pending_offline           // network/EIMS unreachable, local pending
queued                    // in BullMQ queue for submission
counter_reserved          // counter allocated, pre-submit
submitting                // in-flight to EIMS
accepted                  // EIMS returned IRN
rejected                  // EIMS returned error (terminal)
failed_retryable          // retry per error classification
failed_final              // gave up after retries (terminal)
unknown_submission        // ambiguous failure, blocked
verified                  // verified post-acceptance via /verify
cancel_requested
cancelled                 // EIMS confirmed cancellation
```

Rules:

- Accepted invoices store IRN, signedQR, signedInvoice, ackDate.
- Accepted invoices become immutable for normal edit/delete.
- Corrections via cancellation, credit note, or debit note flows.
- Unknown submissions block source queue until reconciliation.

## 19. Online Submission Flow

```text
1. Business module emits event (order paid, sale completed, etc).
2. Business module resolves enterprise, establishment, source.
3. Business module calls CreateInvoice with source context.
4. Invoicing module creates canonical invoice.
5. Invoicing validates totals, buyer/seller rules, tax, document type.
6. Submit command checks:
   - Permission and plan tier
   - Source approval status == approved
   - Source active
   - Credential tested
   - Certificate valid
7. EIMS mapper builds request payload.
8. JSON canonicalizer serializes payload (Phase 0 locked format).
9. Counter reservation (short DB transaction).
10. SigningProvider signs canonical JSON.
11. EIMS client authenticates / refreshes token if needed.
12. EIMS client POSTs to EIMS register endpoint.
13. On 200: store IRN, signedQR, signedInvoice, ackDate, status.
14. On 4xx/406: classify error, mark reservation appropriately.
15. On timeout/unknown: mark reservation unknown, block source queue.
16. Audit event written with hash chain.
17. Buyer notification sent (SMS, email).
18. Business module marks source record as invoiced.
```

## 20. Offline Pending-Sync Mode

### 20.1 Triggers

```text
- Tenant network loss
- EIMS endpoint outage
- EIMS auth service outage
- Certificate validation service outage
```

### 20.2 Flow

```text
1. Create local pending invoice.
2. Assign temporary local reference number.
3. Print/display "PENDING TAX CLEARANCE" state clearly.
4. Optional pending marker QR is visually distinct from official QR
   (different color, watermark, "PENDING" label).
5. Queue for sync.
6. Submit when connectivity returns.
7. Replace pending state with final IRN/QR after EIMS acceptance.
8. Audit both local creation and EIMS acceptance times.
9. DocumentDetails.Date preserves original business creation time.
```

### 20.3 What Not To Do

```text
- Do NOT fabricate IRN.
- Do NOT render official-looking QR before EIMS acceptance.
- Do NOT generate IRN-shaped strings locally.
- Do NOT tell buyers/auditors that pending invoices are accepted.
```

### 20.4 Offline Cache Security

```text
- AES-256 encryption at rest.
- Per-record HMAC or SHA-256 integrity.
- Sync automatically on connectivity restoration.
- Alert on aging pending invoices (> 24 hours).
```

### 20.5 Phase 0 Confirmation Required

```text
- Maximum allowed offline-to-submission delay (rule 7026).
- "Document creation time should be within 3 days" rule behavior.
- Whether delayed offline invoices can be rejected due to tax period.
- Whether the original creation date is honored or re-stamped.
```

## 21. Bulk Registration and Reconciliation

### 21.1 Endpoint

Per spec:

```text
URL    : https://eims.mor.gov.et/api/v1/bulkInvoice
Method : POST
Headers:
  TIN            : Taxpayer Identification Number
  callback       : URL for asynchronous response
  system_number  : EIMS-assigned system number
```

Note: spec URL is `/api/v1/bulkInvoice` (camelCase), but mock collection
uses `/bulk/register`. Phase 0 confirms the actual endpoint.

### 21.2 Flow

```text
1. Build batch (validate each invoice locally).
2. Submit batch to EIMS bulk endpoint.
3. EIMS returns conversationId (HTTP 202).
4. Store conversationId.
5. Wait for callback OR poll.
6. Process per-item results (accepted with IRN, or rule errors).
7. Retry/correct failed items.
```

### 21.3 Required Failure Handling

```text
Missing callback           : polling/reconciliation job
Duplicate callback         : idempotency key based on conversationId
Partial failure            : per-item status and error
Still processing           : keep batch open
Unknown conversationId     : reject callback and alert
Schema error (400)         : entire batch fails, no conversationId
```

### 21.4 Callback Security

Phase 0 confirms:

- Callback authentication mechanism (signed body, mutual TLS, IP allowlist).
- Headers EIMS sends with callback.
- Body schema variations.

Implementation:

```text
Callback endpoint: POST /api/eims/callback/bulk
Authentication   : per Phase 0 confirmation
Idempotency      : keyed on conversationId
Processing       : enqueue for async processing, respond 202 immediately
```

### 21.5 Reconciliation Threshold

```text
default: 15 minutes
configurable per deployment or tenant tier
```

Reconciliation worker polls EIMS for batches where conversationId exists
but no final status has been recorded.

## 22. Receipts and Withholding

### 22.1 Data Model

```text
EimsReceipt
  id
  organizationId
  enterpriseId
  establishmentId
  sourceSystemId
  receiptType                  // sales | withholding
  receiptNumber
  manualReceiptNumber
  receiptCounter               // separate from invoice counter
  sourceSystemType             // POS, ERP, MAN, etc.
  invoiceIrn                   // linked invoice
  rrn                          // EIMS-assigned receipt reference number
  signedQR                     // from EIMS
  signedReceipt                // from EIMS
  status
  totalAmount
  paidAmount
  remainingAmount
  paymentMode
  paymentCoverage              // full | partial
  collectorName
  chequeNumber
  cponumber
  documentNumber
  paymentServiceProvider
  withholdingType              // TWHT (transaction) | IWHT (income)
  withholdingRate
  preTaxAmount
  withholdingAmount
  createdAt
  submittedAt
  acceptedAt
```

### 22.2 Receipt State Machine

```text
draft -> queued -> submitting -> accepted -> rejected -> verified
```

### 22.3 Receipt Counter

Receipt counter is separate from invoice counter, same per-source
pattern.

### 22.4 Withholding Receipt

```text
Withholding types:
  TWHT = Transaction Withholding Tax
  IWHT = Income Withholding Tax

Phase 0 confirms:
  - When `Rate` is null vs required.
  - Valid withholding types and rates.
  - Receipt cancellation rules.
```

## 23. Cancellation

### 23.1 Cancellation Request

```text
EimsCancellation
  id
  organizationId
  sourceSystemId
  invoiceIrn
  reasonCode                   // 1, 2, 3, 4, 6
  remark                       // required if reasonCode = 4
  requestedBy
  requestedAt
  eimsResponse
  status                       // pending, accepted, rejected, manual_review
```

### 23.2 Rules

- Remark required for `4 = Others`.
- Cancellation limits tracked per source per day/month.
- Bulk cancellation limit error (7009) -> manual intervention alert.
- Cancelled invoice remains stored, marked cancelled.

### 23.3 Cancellation Limit Tracking

```text
Per source system, track:
  countCancellationsToday
  countCancellationsThisMonth
  totalValueCancelledToday
  totalValueCancelledThisMonth

UI warnings:
  > 75% of known limit: yellow indicator
  > 90% of known limit: red indicator + email to owner
  100%: block further cancellations, escalation prompt

Phase 0 confirms default limits.
Until confirmed, start conservative (e.g., 10/day, 50/month).
```

## 24. Buyer Notifications

### 24.1 Service Abstraction

```text
BuyerNotificationService
  sendInvoiceNotification(invoice, channels)
  sendCancellationNotification(invoice, reason, channels)
  sendReceiptNotification(receipt, channels)
```

Channels: `email`, `sms`, `print`.

### 24.2 Provider Defaults

Ethiopian-context recommendations:

```text
SMS:
  Primary  : Africa's Talking (broad coverage, USD billing)
  Fallback : Telebirr SMS gateway (local, ETB billing)

Email:
  Primary  : AWS SES (cheap, reliable)
  Fallback : Local SMTP (data residency requirements)
```

Per-tenant configuration:

```text
- Tenants can BYO SMS/email provider keys.
- Default to platform-provided with cost passed through.
- Plan tier may include notification quota.
```

### 24.3 Notification Logs

```text
NotificationLog
  id
  organizationId
  invoiceId / receiptId / cancellationId
  buyerEmail
  buyerPhone
  channel
  status                       // queued, sent, failed, bounced
  providerResponse
  sentAt
  retryCount
```

### 24.4 Failed Notification Policy

```text
- Retry 3x with exponential backoff (5s, 30s, 5min).
- Log failure in audit.
- Do not block invoice flow on notification failure.
- Alert tenant admin if failure rate > 5% in 24h.
```

## 25. Targeted RLS

Do not migrate every SaaS table to RLS.

Apply PostgreSQL RLS to these tables:

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
eims_cancellation
tax_invoice
tax_invoice_line
tenant_buyer
eims_audit_event
notification_log
```

Policy shape:

```sql
ALTER TABLE eims_submission ENABLE ROW LEVEL SECURITY;

CREATE POLICY eims_submission_tenant_isolation
ON eims_submission
USING (
  organization_id = current_setting('app.organization_id', true)
);
```

Every EIMS transaction sets DB tenant context:

```sql
SELECT set_config('app.organization_id', '<org-id>', true);
```

Repository rule:

```text
EIMS/invoicing repositories use RLS-aware transaction helper.
Background jobs set app.organization_id before querying.
Admin metadata access uses explicit admin services.
Secrets never returned through admin bypass.
```

Evidence wording:

- Base SaaS: application-level tenant isolation.
- EIMS/invoicing: targeted PostgreSQL RLS plus app-level scoping.

## 26. Tamper-Evident Audit Log

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
  hash                        // SHA-256(prevHash || canonicalJson(payload))
  createdAt                   // NTP-synced
```

Rules:

- Append-only.
- App role inserts only (separate role for migrations).
- DB trigger blocks UPDATE/DELETE.
- Hash chain uses canonical payload.
- Uses trusted timestamp (chrony with NTS).
- Exportable for audit.
- Retention target: 7+ years.

Events:

```text
eims.setup.profile.updated
eims.enterprise.created
eims.establishment.created
eims.source.created
eims.source.submitted_to_mor
eims.source.approval_status_changed
eims.credential.created
eims.credential.tested
eims.credential.rotated
eims.certificate.imported
eims.certificate.rotated
eims.certificate.expired
signing.operation
invoice.created
invoice.validated
invoice.pending_offline
invoice.counter_reserved
invoice.submitted
invoice.accepted
invoice.rejected
invoice.unknown_submission
invoice.reconciled
invoice.cancel_requested
invoice.cancelled
receipt.submitted
receipt.accepted
bulk.submitted
bulk.callback_received
bulk.reconciled
compliance.export_requested
compliance.export_completed
notification.sent
notification.failed
user.2fa_enabled
user.2fa_exception_granted
```

## 27. Permissions and Roles

### 27.1 Permission Catalog

```text
eims.enterprise:read
eims.enterprise:update
eims.establishment:read
eims.establishment:create
eims.establishment:update
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
```

### 27.2 Suggested Tenant Roles

```text
Owner            : Full tenant EIMS/invoicing access
Admin            : Setup, sources, credentials, certificates, invoices,
                   receipts (with 2FA)
Accountant       : Submit, verify, cancel, receipts, exports
Branch Manager   : Manage invoices for assigned establishment/source
Cashier          : Create POS invoices/receipts for assigned source
Auditor          : Read invoices, receipts, audit, exports
Viewer           : Read-only where granted
```

Custom roles expose these permissions in the existing role matrix.

## 28. Plan Tiers and Limits

```text
free:
  enterprises              : 1
  establishments           : 1
  sourceSystems            : 1
  usersPerEstablishment    : 3
  monthlyInvoices          : 100
  eims.enabled             : false

starter:
  enterprises              : 1
  establishments           : 1
  sourceSystems            : 3
  usersPerEstablishment    : 10
  monthlyInvoices          : 1000
  eims.enabled             : true
  eims.bulk-registration   : false
  eims.offline-mode        : true
  eims.compliance-export   : true
  eims.api-requests/min    : 30

growth:
  enterprises              : 2
  establishments           : 5
  sourceSystems            : 20
  usersPerEstablishment    : 50
  monthlyInvoices          : 10000
  eims.enabled             : true
  eims.bulk-registration   : true
  eims.offline-mode        : true
  eims.compliance-export   : true
  eims.api-requests/min    : 120
  eims.retention-months    : 84

enterprise:
  all                      : unlimited
  eims.api-requests/min    : 300
  eims.retention-months    : 120
  custom SLA               : yes
```

Enforcement: at creation time and per-request rate limiting.

## 29. Per-Tenant Rate Limiting

One large tenant must not block other tenants (MoR BSP Section C).

```text
Token bucket per organization (Redis).
Separate or weighted-fair queues per tenant for EIMS submissions.
Per-tenant metrics.
Plan-based rate limits.
```

Track:

```text
eims_tenant_rate_limited_total
eims_submission_queue_depth_by_tenant
eims_submission_latency_by_tenant
```

## 30. Hosting and Datacenter Evidence

MoR_BSP_Master Section E requires explicit declaration.

For each deployment (sandbox, production):

```text
Hosting provider              : (e.g., Hetzner Cloud, AWS, DigitalOcean)
Region / datacenter location  : (e.g., Frankfurt, Falkenstein, Ashburn)
Tier classification           : provider-declared (most VPS are
                                "unclassified", be honest)
VPS specifications            : 6GB RAM, 4 vCPU, 80GB SSD
Backup storage location       : (separate from primary, encrypted)
Data residency stance         : if non-Ethiopian provider, prepare legal
                                opinion for compliance
Migration plan                : path to Ethiopian-hosted infra if INSA
                                requires it
DR site                       : even if just encrypted off-server
                                backups
```

### 30.1 For Initial 6GB VPS

```text
Provider         : (your choice)
Region           : (your choice; consider proximity to MoR
                    endpoint, latency to Addis Ababa)
Specs            : 6GB RAM, 4 vCPU minimum, 80GB SSD
Backups          : daily PostgreSQL dump + Vault snapshot to S3-
                    compatible object storage (e.g., Backblaze B2,
                    Hetzner Storage Box)
Backup encryption: AES-256 with key in separate location
Backup retention : 30 days hot, 12 months archived
DR site          : initially backup-only; promote to standby VPS
                    when scaling triggers hit
```

### 30.2 Data Residency Strategy

```text
Initial          : non-Ethiopian provider acceptable with legal opinion
Mid-term         : evaluate Ethiopian Datacenter (e.g., ethio telecom DC,
                    Webdox, Raxio) as INSA-friendly migration target
Trigger          : INSA explicit requirement or audit finding
Timeline         : 90-day migration window from trigger
```

### 30.3 Required Documentation for Audit

```text
Architecture diagram
Network diagram
Component inventory (MoR BSP Section G format)
Hosting agreement (MSA/contract)
DARA identifier for hosting contract (if required)
Data residency legal opinion (if non-Ethiopian)
DR test report (quarterly)
Backup restore test report (quarterly)
```

## 31. Legal Entity and Bank Guarantee Strategy

The Letter of Guarantee is USD 30,000, 2-year renewable.

### 31.1 Options

```text
Option A: One parent entity holds guarantee covering all SaaS products
  Cheapest. Simplest. Recommended for current stage.
  One 30K guarantee covers all products under the entity.

Option B: Each SaaS is a separate legal entity with its own guarantee
  Most expensive.
  Only if tax/liability reason overrides cost.
  Multiple 30K guarantees.

Option C: Parent entity operates EIMS gateway service; SaaS apps as
  internal consumers
  Cleanest long-term if Rust gateway commercializes.
  Aligns with future "extract gateway" trigger.
```

### 31.2 V3 Decision

**Default: Option A.**

- One parent entity holds USD 30K guarantee.
- All 7 SaaS products operate under this entity.
- Annual cost: ~USD 450-900 bank fees + collateral.
- Revisit when extracting gateway (Option C).

### 31.3 Guarantee Renewal Tracking

```text
Calendar entries:
  T-90 days: bank engagement begins
  T-60 days: renewal application submitted to bank
  T-30 days: new guarantee in place
  T-7 days : verify with MoR if needed

Admin dashboard widget:
  Days to guarantee expiry
  Renewal status
  Bank contact information
```

## 32. Restaurant SaaS Pilot Rollout

Existing restaurant SaaS tenants need controlled rollout.

### Phase A: Internal Alpha (Week 1)

```text
- Your own test tenant only.
- Sandbox EIMS endpoint.
- Verify all flows: invoice, cancel, receipt, bulk.
- Verify all printers and QR scanning.
- Verify offline pending-sync.
```

### Phase B: Friendly Tenant Beta (Weeks 2-4)

```text
- 1-3 friendly tenants (in your network).
- Production EIMS endpoint.
- Daily monitoring meeting.
- Direct support line.
- Easy rollback if issues.
```

### Phase C: Gradual Rollout (Weeks 5-8)

```text
- Feature flag per tenant.
- Enable 5 tenants/week.
- Monitor failure rates.
- Pause if issues exceed threshold (e.g., > 2% submission failure rate).
```

### Phase D: General Availability (Week 8+)

```text
- All existing tenants migrated.
- Required for new tenants.
- Existing pre-EIMS data marked as historical.
```

### Rollback Plan

```text
- Feature flag flip disables EIMS for tenant.
- Tenant returns to pre-EIMS invoice flow.
- Invoices created during EIMS mode remain valid and accessible.
- Submitted IRNs cannot be "unsubmitted" - they exist at MoR.
```

## 33. Existing Tenant Migration

Existing restaurant tenants will not have Enterprise/Establishment/
SourceSystem records.

### 33.1 Migration Script

```text
For each existing organization:

1. Create default EimsEnterprise from organization data:
   - tin = organization.tin (or 'PENDING' if missing)
   - legalName = organization.name
   - status = 'draft' (force user verification)

2. Create default Establishment:
   - name = 'Main Branch'
   - code = 'MAIN'
   - status = 'draft'

3. Create default SourceSystem:
   - name = 'Default POS'
   - systemNumber = 'TO_BE_ASSIGNED'
   - systemType = 'POS'
   - approvalStatus = 'draft'
   - active = false (cannot submit yet)

4. Backfill existing orders/invoices:
   - Set enterpriseId, establishmentId, sourceSystemId to defaults
   - Mark as 'historical' (not eligible for EIMS submission)

5. Backfill user-establishment assignments:
   - For each existing org user:
     - Create UserEstablishmentAssignment for default establishment
     - Assign role based on existing role

6. Show migration wizard on first admin login:
   "Your existing data has been auto-configured.
    Please verify your Enterprise details and add additional
    branches before enabling EIMS submission."

7. Block EIMS submission until tenant verifies setup:
   - Enterprise verified (TIN confirmed)
   - At least one Establishment active
   - At least one SourceSystem approved by MoR
   - Credential tested
   - Certificate uploaded and valid
```

### 33.2 Historical Data Handling

```text
Historical invoices (created before EIMS):
  - Stored as-is
  - Marked 'historical = true'
  - Not submitted to EIMS retroactively
  - Visible in reports but excluded from compliance metrics
  - Available for tenant export

New invoices (after EIMS enabled):
  - Full EIMS submission flow
  - Counter starts at 1 for each source
```

## 34. Phase 0 Technical Proof V3

Phase 0 has two layers.

### 34.1 Layer A: Local (Can Start Today)

No INSA sandbox needed.

```text
Signing experiments:
  - SHA512withRSA with PKCS#1 v1.5 padding
  - SHA512withRSA with PSS padding
  - Verify each produces parseable signatures
  - Lock candidate algorithm

JSON canonicalization:
  - Test JSON.stringify default
  - Test sorted keys
  - Test no whitespace
  - Test pretty-print
  - Lock canonical form

DateTime formats:
  - yyyy-mm-dd hh:mm:ss
  - With timezone offset
  - With ISO 8601 bracket suffix
  - With dd-mm-yyyy
  - Lock target format (subject to Layer B confirmation)

Decimal precision:
  - Integer
  - 2 decimals
  - 4 decimals
  - String representation
  - Lock representation

Vault setup:
  - Install on dev VPS
  - Initialize with test shards
  - Enable Transit engine
  - Generate test keypair
  - Sign canonical JSON
  - Verify signature parseable

Lookup endpoints:
  - Implement /api/v1/eims/lookups/*
  - Seed default values
  - Test versioning headers

CanonicalInvoice draft:
  - Define TypeScript interface
  - Build mapper to EIMS payload
  - Build mapper from restaurant order
  - Validate with sample data

Counter reservation:
  - Implement per-source queue
  - Implement reservation lifecycle
  - Test concurrent reservation requests
  - Test unknown_submission handling

Reference implementations:
  - Spend 1 day reviewing publicly available Odoo Ethiopian EIMS modules
  - Note field mappings, edge cases, print layouts
```

### 34.2 Layer B: Sandbox (Blocked Until INSA Onboarding)

Requires INSA-issued sandbox credentials and certificate.

```text
Signing verification:
  - Submit signed test invoice
  - Confirm padding mode (PKCS#1 v1.5 vs PSS)
  - Confirm canonical JSON format
  - Confirm Base64 signature format
  - Lock EIMS_SIGNING_CONFIG.lock.json

Schema validation:
  - Submit various datetime formats
  - Submit various decimal precisions
  - Confirm exact accepted format
  - Lock format choices

Authentication:
  - Login request shape
  - Whether login payload itself must be signed
  - JWT validity duration
  - Refresh token behavior
  - Credential rotation steps

Counter and chain:
  - Strict counter sequence behavior
  - Gap behavior
  - Duplicate counter rejection
  - PreviousIrn requirement (always or conditional)
  - Reconciliation API for ambiguous failures

Offline rules:
  - Maximum offline duration before rejection
  - Document date rule (rule 7026)
  - Whether pending local prints have wording requirements

Callback security:
  - Authentication mechanism
  - Headers EIMS sends
  - Body shape variations
  - Idempotency expectations

Source approval:
  - Workflow timing
  - Whether softwareVersion changes require API notification

Lookup values:
  - Active document types for tenant
  - Active transaction types
  - Active cancellation reason codes
  - Confirm code 6 (Calculation Error) is official
  - Active tax codes
  - Whether `IMMEDIATE` spelling is accepted (vs spec `IMMIDIATE`)

Bulk:
  - Endpoint URL (spec /api/v1/bulkInvoice vs mock /bulk/register)
  - conversationId format
  - Callback payload structure
  - Polling endpoint for reconciliation
```

### 34.3 Exit Criteria

Layer A complete when:

```text
- All local signing experiments pass parseability checks
- CanonicalInvoice v1 contract is locked
- Lookup endpoints serve seed data
- Counter reservation passes concurrency tests
- Phase 0 Layer A report committed
```

Layer B complete when:

```text
- Real INSA sandbox accepts test invoice
- EIMS_SIGNING_CONFIG.lock.json finalized
- All schema format choices confirmed
- Callback security mechanism documented
- Counter/chain behavior documented
- Lookup values confirmed
```

Both must complete before Phase 1 production work.

## 35. Phase 0 Test Assets

```text
apps/api-tests/bruno/EIMS-Phase0/
  collection.bru
  environments/
    sandbox.bru
  01-authentication/
  02-signing/
  03-invoice-registration/
  04-cancellation/
  05-verification/
  06-receipts/
  07-bulk/
  08-edge-cases/

scripts/phase0/
  layer-a/
    run-local-signing.ts
    run-canonicalization-tests.ts
    run-datetime-tests.ts
    run-decimal-tests.ts
  layer-b/
    run-sandbox-end-to-end.ts
    fixtures/
  reports/
    phase0-layer-a.md
    phase0-layer-b.md
    eims-signing-config.lock.json
    eims-lookup-values-confirmed.json
    eims-counter-chain-findings.md
```

Why Bruno over Postman:

```text
- Git-friendly file-based collections
- Reviewable in pull requests
- Runnable in CI
- No cloud-stored secrets
- Critical for audit compliance evidence
```

## 36. Build Order V3

### Phase 0: Technical Proof

- Layer A (no sandbox): now.
- Layer B (sandbox): when INSA credentials arrive.

### Phase 1: Foundation

- Enterprise/Establishment/SourceSystem schema and CRUD.
- User branch/source assignments.
- Targeted RLS proof on EIMS tables.
- Lookup/code registry and API endpoints.
- Decimal/date utilities.
- CanonicalInvoice v1.
- Field-level PII encryption.

### Phase 2: Vault and Signing

- Vault setup with operational runbook.
- SigningProvider interface and VaultSigningProvider implementation.
- CSR Strategy A and B.
- Certificate metadata, import, expiry job.
- Key version tracking.
- Sandbox/production environment separation.

### Phase 3: EIMS Auth and Credential Lifecycle

- Encrypted credential storage.
- Token refresh logic.
- Credential test endpoint.
- Rotation lifecycle.
- 2FA enforcement and bootstrap flow.

### Phase 4: Source Counter and Single Invoice Submission

- Per-source BullMQ queue.
- Counter reservation lifecycle.
- PreviousIrn chain.
- Restaurant order paid -> CanonicalInvoice.
- Submit to sandbox.
- Store IRN/QR.
- Audit hash chain.
- Source approval submission guard.

### Phase 5: Print, Receipt, Verification

- Compact thermal print layout.
- A4 print layout.
- Vertical-specific layout strategies.
- QR rendering from EIMS response.
- Sales receipt submission.
- Withholding receipt submission.
- IRN verification.
- Buyer notification (SMS + email).
- SMS/email provider integration.

### Phase 6: Cancellation and Bulk

- Cancellation reason/remark UI.
- Cancellation limit tracking.
- Bulk registration.
- Bulk callback handling.
- Reconciliation polling.
- Error classification and retry policy.

### Phase 7: Offline Pending-Sync

- Pending local invoice.
- Pending print marker (visually distinct from official).
- Offline cache AES-256 encryption.
- Per-record HMAC integrity.
- Reconciliation worker.
- Aging alerts.

### Phase 8: Admin, Compliance, Operations

- Admin EIMS dashboard.
- Branch health dashboard.
- Compliance evidence auto-generator.
- Tenant data export/offboarding.
- Per-tenant rate limits enforced.
- Hosting/datacenter evidence docs.
- DR runbook executed.
- Quarterly DR drill scheduled.
- Bank guarantee renewal calendar.

### Phase 9: Restaurant Pilot

- Existing tenant migration script run in staging.
- Internal alpha (your test tenant).
- Friendly beta (1-3 tenants).
- Gradual rollout (feature flag, 5/week).
- General availability.

### Phase 10: Other Verticals

Apply the same EIMS core to:

- Retail.
- Supermarket (heavy on offline mode).
- Hotel (multi-source per establishment).
- Manufacturing.
- Wholesale.
- Spare parts.

Each vertical only maps its business events to CanonicalInvoice.

### Parallel Track: Rust Gateway Learning

Side project, not on critical path.

Build Rust EIMS gateway using:

- Same JSON schemas.
- Same test fixtures.
- Same MoR sandbox endpoint.

If conflict between Rust learning and NestJS shipping, NestJS wins.

Rust gateway becomes commercial option only when:

- NestJS production stable for 6+ months.
- Multiple tenants want managed EIMS access.
- Team and time capacity available.

## 37. Multi-SaaS Code Sharing Strategy

You have 7 SaaS products planned. Decide EIMS code sharing approach
before Phase 10.

### 37.1 Options

```text
Option 1: Monorepo with shared package
  packages/eims-core
  Tradeoff: requires changing workspace structure (was pushed back
  against in Section 2.5)

Option 2: EIMS module copied per SaaS, synced via CLI/script
  Each SaaS has its own apps/api/src/modules/eims/
  Sync tool keeps them aligned
  Tradeoff: divergence risk

Option 3: Private npm package
  Publish @your-org/eims-core to private npm
  Each SaaS imports it
  Tradeoff: requires npm registry setup
```

### 37.2 V3 Recommendation

```text
Phase 4-9 (single SaaS): Module lives inside apps/api/src/modules/eims/
                          (per Section 2.5)

Phase 10 (second SaaS):  Decide between Options 1, 2, 3.
                          Default recommendation: Option 3 (private npm).
                          Re-evaluate based on actual divergence
                          experience.

Phase 10+ (3+ SaaS):     Re-evaluate gateway extraction (per Section 2.1).
                          If extracting, EIMS becomes a service, not a
                          shared library.
```

Document the decision when Phase 10 starts.

## 38. Tenant Onboarding Operations

EIMS setup has many steps. Most tenants cannot do this self-serve.

### 38.1 Onboarding Paths

```text
Self-service path (technical tenants):
  - In-app wizard
  - Documentation
  - Email support
  - Suitable for IT-staffed businesses

Assisted path (most tenants):
  - Onboarding specialist
  - Scheduled video call
  - Specialist completes setup with tenant
  - Charges per onboarding or included in plan tier
  - Suitable for restaurants, retail, small businesses

Concierge path (enterprise tenants):
  - Dedicated account manager
  - On-site visit if needed
  - Multi-establishment setup
  - Custom timeline
```

### 38.2 Onboarding Wizard Steps

```text
Step 1: 2FA setup (forced)
Step 2: Enterprise profile (TIN, legal name, VAT)
Step 3: Verify enterprise via email + (optional) MoR portal cross-check
Step 4: First establishment (branch address, sub-TIN if applicable)
Step 5: First source system (POS info)
Step 6: Submit source to MoR portal (external process)
Step 7: Wait for MoR approval (pending state, can be days)
Step 8: Generate CSR / upload certificate
Step 9: Configure credentials (TIN, API key, password from MoR)
Step 10: Test connection
Step 11: Sandbox test invoice
Step 12: Compliance checklist confirmation
Step 13: Switch to production
```

### 38.3 Documentation Requirements

```text
- English documentation (primary)
- Amharic translation for tenant-facing screens (Phase 5+)
- Video walkthrough of each step (Phase 6+)
- FAQ for common errors (continuously updated)
- Support runbook for operations team
```

### 38.4 Operational Staffing

```text
Phase 9 (pilot):        Founder/CTO handles onboarding personally
Phase 10 (other SaaS):  1 onboarding specialist
Phase 10+ (scale):      Onboarding team + tier-based service
```

## 39. Disaster Recovery and Runbooks

### 39.1 Scenarios with Runbooks

```text
Scenario: VPS Dies Entirely
  Detection: Monitoring alerts (UptimeRobot, custom health checks)
  Response:
    1. Confirm VPS unrecoverable with provider
    2. Provision new VPS from snapshot or fresh image
    3. Restore PostgreSQL from latest backup
    4. Restore Vault from latest snapshot
    5. Update DNS to new VPS IP
    6. Unseal Vault (manual)
    7. Test sandbox + production EIMS connectivity
    8. Notify tenants
  RTO: 4 hours
  RPO: 24 hours (last backup)

Scenario: Vault Data Corrupts
  Detection: Vault status returns errors, signing fails
  Response:
    1. Stop Vault service
    2. Restore from latest snapshot
    3. Unseal with shards
    4. Verify signing works
    5. Resume source queues
  RTO: 1 hour
  RPO: 24 hours

Scenario: PostgreSQL Data Corrupts
  Detection: Application errors, integrity check failures
  Response:
    1. Stop API
    2. Restore PostgreSQL from latest backup
    3. Run integrity checks
    4. Restart API
    5. Replay any in-flight transactions from queue
  RTO: 2 hours
  RPO: 24 hours

Scenario: Certificate Revoked Mid-Operation
  Detection: EIMS error 67008
  Response:
    1. Disable affected source system
    2. Notify tenant immediately
    3. Guide tenant through re-certification (Strategy A or B)
    4. Test new certificate in sandbox
    5. Resume source
  RTO: 24-72 hours (depends on INSA timeline)

Scenario: INSA Root CA Changes
  Detection: All certificate validations start failing
  Response:
    1. Update Vault trust store with new root CA
    2. Verify with INSA whether existing certs are grandfathered
    3. Plan rotation if needed
    4. Notify all tenants

Scenario: MoR Changes API Format
  Detection: Submission failures with new error patterns
  Response:
    1. Document the change from MoR communications
    2. Update EIMS client to new format
    3. Test in sandbox
    4. Deploy
    5. Backfill any failed submissions

Scenario: Tenant Data Leaked
  Detection: Security monitoring, tenant report
  Response:
    1. Activate incident response team
    2. Identify scope (which tenant, which data)
    3. Notify affected tenants within 24h
    4. Preserve evidence
    5. Rotate any exposed secrets
    6. Notify INSA per regulatory requirement
    7. Post-incident review

Scenario: Tenant Disputes a Submission
  Detection: Tenant support ticket
  Response:
    1. Pull audit trail for the IRN
    2. Verify hash chain integrity
    3. Compare with EIMS verify endpoint
    4. Provide evidence to tenant
    5. If error is on our side, document and fix
    6. If error is at MoR, escalate via support channel
```

### 39.2 Quarterly DR Drill

```text
Quarterly schedule:
  Q1: PostgreSQL restore drill
  Q2: Vault restore drill
  Q3: Full VPS restore drill
  Q4: End-to-end DR (full failover to backup environment)

For each drill:
  - Document time taken (actual RTO)
  - Document data loss (actual RPO)
  - Update runbook with findings
  - File results in compliance evidence package
```

## 40. Testing Plan V3

Required test coverage:

```text
Lookup enum validators
Buyer TIN rules and government detection
Document type related-document requirements
Tax prefix VAT-number requirement
Decimal precision and total calculations
Datetime serialization (Addis Ababa timezone)
Source approval submission guard
Branch/source permission isolation
Targeted RLS behavior
Counter reservation race conditions
Counter reservation status transitions
Ambiguous submission handling and reconciliation
PreviousIrn chain
Signing provider boundary
Vault unreachable handling
Certificate expiry job
Credential redaction in logs
2FA enforcement and bootstrap
2FA bypass attempt detection
Single submit (sandbox)
Receipt submit (sandbox)
Cancellation with reason and remark
Cancellation limit warnings
Bulk callback handling
Bulk reconciliation polling
Offline pending-sync state
Offline cache encryption
Pending QR visually distinct from official QR
Compact print required fields
A4 print required fields
QR scannability with MoR mobile app
Buyer notification (SMS, email, print)
Notification retry policy
Error classification and retry
Per-tenant rate limiting
Audit hash chain integrity
Vault audit log presence
NTP clock drift monitoring
Existing tenant migration
Field-level PII encryption
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

## 41. Compliance Evidence Package

Continuously generated, not compiled at audit time.

### 41.1 Technical Evidence

- Architecture diagram (auto-updated from infrastructure-as-code).
- Data-flow diagram.
- Enterprise/Establishment/SourceSystem topology map.
- Component inventory in MoR BSP format.
- Database schema export.
- RLS policy list.
- Network diagram.
- Vault setup documentation.
- NTP configuration documentation.
- Phase 0 report (Layer A + Layer B).
- DR test reports (quarterly).

### 41.2 Security Evidence

- Secret scan results.
- Dependency scan (Renovate, Dependabot).
- SAST results.
- TLS 1.3 configuration.
- Mutual TLS configuration (if applicable).
- RBAC matrix.
- 2FA enrollment evidence.
- Vault audit log sample.
- EIMS audit hash chain sample.
- Key management procedures.
- Incident response plan.
- Penetration test report (annual).

### 41.3 Operational Evidence

- SLA document (99.5%+ uptime).
- 24/7 support contact info.
- Maintenance agreement template.
- Data ownership clause.
- Exit policy with 30-day export.
- Backup/restore test logs.
- Monitoring dashboard screenshots (Grafana).
- Uptime monitoring history.
- Change management process.
- Tenant onboarding runbook.

### 41.4 Legal Evidence

- Bank Letter of Guarantee (USD 30,000, 2-year).
- Guarantee renewal calendar.
- Commitment Form (የውዴታ ግዴታ ቅጽ) signed.
- ERCA authorization letter.
- Certificate Request Form submitted to INSA.
- Signed MSA and service agreements.
- Company registration documents.
- Data residency legal opinion (if non-Ethiopian hosting).

### 41.5 Functional Test Evidence

- IRC-P01 (B2C VAT invoice).
- IRC-P02 (B2B invoice with buyer TIN).
- IRC-P03 (sales receipt linked to invoice).
- IRC-P04 (withholding receipt).
- IRC-P06 (credit memo).
- Multi-VAT items test (VAT0, VAT15, VATEX).
- Government buyer invoice.
- Cancellation with each reason code.
- Bulk operation test.
- Print layout test (thermal and A4).
- QR scan test with MoR mobile app.
- Multi-branch isolation test.
- Offline mode reconciliation test.
- Buyer notification test (SMS + email).

### 41.6 Compliance Evidence Auto-Generator

```text
GenerateComplianceEvidenceCommand
  scope                 : { tenant, platform }
  period                : { from, to }
  outputs:
    architecture-diagram.pdf
    data-flow-diagram.pdf
    component-inventory.xlsx
    database-schema.sql
    audit-log-sample.csv
    signed-invoices-sample.zip
    vault-audit-sample.log
    ntp-drift-report.pdf
    performance-report.pdf
    security-scan-report.pdf
    certificate-validity-report.pdf
    rls-policy-export.sql
    test-results.html
  output_format         : encrypted ZIP
  signed_manifest       : SHA-256 of each artifact
```

Available as feature in admin dashboard. Hugely valuable during audits.

## 42. Risk Register V3

| Risk | Mitigation | Owner |
|---|---|---|
| MoR/EIMS outage | Treat as offline/pending-sync, queue, status page, tenant notifications | Ops |
| Cancellation limits hit | Track limit, warn tenant at 75/90%, manual MoR support workflow | Ops |
| Certificate revocation | Detect via 67008, disable source, notify tenant, re-cert workflow | Ops |
| Sub-TIN not yet issued | Track blocked establishment setup, allow operation where rules permit | Ops |
| Time-zone boundary errors | Store local + EIMS timestamps, use Addis Ababa TZ in payload, business date preserved | Eng |
| Concurrent source edits | Optimistic version locking, audit diff | Eng |
| Software version mismatch | Track lastUpgradeDate/softwareVersion, Phase 0 confirms notification need | Ops |
| EIMS table migration risk | Senior review, backup, migration safety checklist, production-like test data | Eng |
| Tenant disputes submission status | Audit hash chain, submission logs, tenant-accessible evidence export | Eng |
| Single VPS failure | Scaling triggers per Section 43, DR runbook per Section 39 | Ops |
| Unknown EIMS error code | Manual intervention by default, add to error catalog after review | Eng |
| Ambiguous network failure after submit | Mark source unknown/manual-review until reconciled | Eng |
| INSA sandbox unavailable | Start onboarding paperwork in parallel, do Layer A work in parallel | Founder |
| Vault data corruption | Daily encrypted snapshots, quarterly restore drill | Ops |
| Tenant data leaked | Field-level encryption, incident response runbook | Eng + Founder |
| Bank guarantee expires | 90/60/30 day calendar reminders, renewal procedure documented | Founder |
| Notification provider outage | Multi-provider fallback (Africa's Talking + Telebirr) | Eng |
| Cross-environment credential leak | Strict sandbox/production Vault namespace separation, environment column on DB | Eng |
| 2FA bootstrap chicken-and-egg | Forced 2FA setup on first login, recovery codes | Eng |

## 43. Scaling Triggers

Single VPS is acceptable early. Define explicit triggers.

```text
> 10 active tenants:
  Stronger backup automation, uptime monitoring (UptimeRobot, etc).

> 100 invoices/min peak:
  Separate worker processes from API, tune BullMQ.

> 50 active tenants:
  Move PostgreSQL to dedicated VPS.
  Move Vault to dedicated VPS.

Multiple verticals in production:
  Re-evaluate single VPS sufficiency.
  Consider hot-standby for HA.

3+ SaaS products in production:
  Evaluate gateway extraction per Section 2.1.
  Evaluate shared EIMS code strategy per Section 37.
```

## 44. Open Questions Going Into Paperwork

These need answers via INSA/MoR liaison or Phase 0.

```text
1. Exact bulk endpoint URL (/api/v1/bulkInvoice vs /bulk/register)
2. SHA512withRSA padding mode (PKCS#1 v1.5 vs PSS)
3. Exact accepted datetime format
4. Whether "IMMEDIATE" spelling is accepted alongside "IMMIDIATE"
5. Active document types per tenant type
6. Active cancellation reason codes (is "6" official?)
7. Default per-tenant cancellation limits
8. Whether PreviousIrn is always required or only after first invoice
9. Maximum offline-to-submission delay
10. Whether MoR softwareVersion update requires API notification
11. Callback authentication mechanism
12. Reconciliation API for unknown submissions
13. Withholding Rate field requirement conditions
14. Whether one tenant certification covers all SaaS products
15. Data residency requirements (non-Ethiopian hosting acceptable?)
16. Whether sandbox has separate URL from production
```

## 45. V3 Final Position

The agreed architecture is:

```text
Business event
  -> Branch/source context resolution
    -> CanonicalInvoice
      -> Counter reservation + PreviousIrn
        -> EIMS signing/submission via per-source queue
          -> IRN/QR/audit/notification
```

With:

```text
Enterprise -> Establishment/Branch -> SourceSystem
```

as first-class hierarchy.

The base template keeps application-level tenant scoping.
EIMS/invoicing compliance tables add targeted PostgreSQL RLS.

Vault Transit is the production signing provider with full operational
runbook documented.

One parent legal entity holds the USD 30K bank guarantee.

Phase 0 Layer A starts now. Phase 0 Layer B starts when INSA sandbox
credentials arrive.

## 46. Immediate Next Steps for the Founder

```text
This week:

1. Submit ERCA authorization letter to MoR
2. Email ica@insa.gov.et with certificate request form for sandbox
3. Engage bank for Letter of Guarantee setup
4. Start Phase 0 Layer A locally (no sandbox needed)
5. Decide hosting provider for sandbox deployment
6. Identify 1-3 friendly restaurant tenants for Phase B beta later

Next 2-4 weeks:

7. Complete Phase 0 Layer A
8. Receive INSA sandbox credentials
9. Receive bank Letter of Guarantee
10. Start Phase 0 Layer B against real sandbox
11. Lock EIMS_SIGNING_CONFIG.lock.json
12. Begin Phase 1 implementation

Through Phase 1-4:

13. Build EIMS module per build order
14. Run quarterly DR drills as you go
15. Compile compliance evidence continuously
16. Prepare Amharic documentation translations

Going to production:

17. Internal alpha with your test tenant
18. Friendly beta with 1-3 real tenants
19. Gradual rollout with feature flag
20. General availability
```

V3 is complete. Begin Phase 0 Layer A and INSA paperwork today.

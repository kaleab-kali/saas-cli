# EIMS Final Agreed SaaS Architecture Plan

> Superseded by `docs/EIMS_FINAL_AGREED_SAAS_ARCHITECTURE_PLAN_V3.md`.
>
> Keep this file as the V1 baseline. Use V3 for implementation planning, because it incorporates the later audit gaps, the five deep-dive areas, restored Vault/hosting/legal/rollout content, and the pushbacks on RLS, source-counter transactions, offline QR/IRN handling, signing verification, and shared-package extraction timing.

This is the controlling plan for integrating Ethiopian EIMS/EIRMS e-invoicing inside a generated SaaS project after scaffolding.

It is not a CLI plan. It describes how the generated SaaS application should be structured, how every vertical uses the same invoice/EIMS core, how branch/source management works, and where compliance/security hardening belongs.

## 1. Final Decisions

These decisions are agreed for the next implementation plan.

| Decision | Final choice |
|---|---|
| EIMS deployment shape | Embedded inside each generated SaaS first. Do not extract a gateway too early. |
| Business integration | Every vertical maps business events into one `CanonicalInvoice`. |
| EIMS API access | Only the EIMS module talks to MoR/EIMS. Business modules never call EIMS directly. |
| Module structure | One EIMS bounded context, internally split into setup, submission, receipts, compliance, and shared. |
| Key management | Use `SigningProvider`. Vault Transit is production default. Local encrypted provider is dev/sandbox fallback only. |
| RLS strategy | Do not migrate the entire SaaS template to RLS now. Use targeted Postgres RLS for EIMS/invoicing compliance tables. |
| Branch/source model | Make Enterprise -> Establishment/Branch -> SourceSystem first-class. This is critical. |
| Offline mode | Allow pending local invoices only. Do not fabricate official IRN or official-looking QR before EIMS acceptance. |
| QR rendering | Final official QR comes from EIMS accepted response. Pending offline marker must be visually distinct. |
| Signing algorithm | Do not hardcode until Phase 0 proves algorithm, hash, padding, and canonicalization against sandbox. |
| First vertical | Restaurant is the reference implementation. Other verticals map into the same canonical invoice later. |
| Rust gateway | Learning side track only. Not on the critical path. |

## 2. Source Documents Used

| Source | Used for |
|---|---|
| `EIMS_compliance_Draft.pdf` | EIMS authentication, invoice registration, schema, signing, bulk, receipts, verification, cancellation, callback shape, security. |
| `EimsCoreApiMockCollection2.postman_collection.json` | Auth, token refresh, register, bulk register, cancel, bulk cancel, verify, sales receipt, withholding receipt, request field examples. |
| `certificate_guideline.pdf` and `.docx` | Private key, CSR, certificate request, signing process, SHA512withRSA mention. |
| `einvoice.cnf` | CSR subject shape: `C=ET`, organization, system ID in `serialNumber`, TIN in `commonName`, email SAN, `default_md=sha256`. |
| `Certificate Request form v.1.docx` | Taxpayer/contact info and at least one System ID requirement. |
| `Self-onboarding and Source Registration Guide.pdf` | Portal flow: enterprise -> establishment -> source system approval. |
| `MoR_BSP_Master.docx` | SaaS/cloud checklist, offline mode, auto resend, source numbers, sub-TIN, NTP, buyer notification, data export/deletion, per-merchant rate limits, datacenter declaration. |
| `compliance check list.pdf` | Governance, device security, data protection, secure communication, access control, update mechanisms, physical security. |
| `Cybersecurity Audit minimum Requirements2.pdf` | WORM/immutable logs, trusted time source, secure offline caching, encryption, integrity validation, secure communication, key management. |
| `Commitment Form v1.1.docx` | Provider commitment, retesting, improvements, taxpayer onboarding support. |
| `Letter of Guarantee-after comment-V1.2.docx` | Possible provider/legal guarantee requirement. This is process/legal, not application code. |
| `ERCA Admin authorization letter` | Authorization request evidence format. |

## 3. Core Architecture

Every SaaS vertical uses the same EIMS integration pipeline.

```text
Vertical business module
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

Business modules decide when a business event creates an invoice.

The invoicing module validates the internal invoice and owns the invoice lifecycle.

The EIMS module signs, submits, verifies, cancels, retries, stores EIMS results, and exports compliance evidence.

## 4. Non-Negotiable Design Rules

1. Business modules must not call MoR/EIMS directly.
2. Business modules must not store EIMS credentials, client secrets, certificates, or private keys.
3. Every invoice must belong to exactly one tenant organization.
4. Every EIMS invoice must resolve to an Enterprise, Establishment, and SourceSystem.
5. Every SourceSystem has its own system number and may have its own credential/certificate.
6. Accepted EIMS invoices must not be edited or deleted normally.
7. Corrections use cancellation, credit note, debit note, or allowed correction flows.
8. Final QR/IRN must come from EIMS. Local offline references are temporary only.
9. Private key access must go through `SigningProvider`.
10. EIMS secrets must never be returned to frontend, logs, errors, exports, or admin screens.

## 5. Project Folder Structure

Inside a generated SaaS project:

```text
apps/
  api/
    src/
      modules/
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
            client/
            signing/
            canonicalization/
            crypto/
            queues/
            errors/

          eims.module.ts
```

Frontend:

```text
apps/
  web/
    src/
      features/
        invoicing/
        eims/

      routes/
        _authenticated/
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

        admin/
          eims/
            index.tsx
            tenants.tsx
            failures.tsx
            certificates.tsx
            resources.tsx
            compliance.tsx
```

## 6. Enterprise, Establishment, and SourceSystem

Branch/source management is first-class because EIMS traceability depends on it.

The MoR onboarding guide uses enterprise and establishment before source registration. The BSP checklist also references source numbers, sub-TIN branch management, and traceability to the exact merchant/branch/source.

Use this hierarchy:

```text
Organization
  SaaS tenant account in this application

EimsEnterprise
  Legal taxpayer identity
  Has TIN, legal name, VAT number

EimsEstablishment
  Registered branch/outlet under the enterprise
  Has branch address and optional sub-TIN

EimsSourceSystem
  POS/register/ERP/source under an establishment
  Has EIMS system number, source type, status, credentials, certificate
```

Example:

```text
Organization: Habesha Restaurants
  EimsEnterprise: Habesha Restaurants PLC, TIN 0074136947
    Establishment: Bole Branch, Sub-TIN 0074136947-01
      SourceSystem: Front POS, systemNumber 329D03B6F0
      SourceSystem: Bar POS, systemNumber 4A12BBF77E
    Establishment: Sarbet Branch, Sub-TIN 0074136947-02
      SourceSystem: Main Cashier, systemNumber 5C99DD22EE
```

Every business transaction must carry source context:

```text
RestaurantOrder
  organizationId
  eimsEnterpriseId
  establishmentId
  sourceSystemId
  cashierName
```

Deterministic source selection:

```text
business event -> establishment/branch -> source system -> credential/certificate -> EIMS submission
```

The source system determines:

- Seller TIN or sub-TIN.
- Seller legal name and branch address.
- Source system number.
- Source system type.
- Certificate used for signing.
- EIMS credential used for auth.
- Invoice numbering/counter scope.

## 7. Data Model Sketch

Use final Prisma naming conventions during implementation. These names describe the target model.

```prisma
model EimsEnterprise {
  id             String @id @default(cuid())
  organizationId String @unique
  tin            String
  legalName      String
  tradeName      String?
  vatNumber      String?
  email          String?
  phone          String?
  status         String

  establishments EimsEstablishment[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([organizationId])
  @@map("eims_enterprise")
}

model EimsEstablishment {
  id              String @id @default(cuid())
  organizationId  String
  enterpriseId    String
  establishmentNo String?
  name            String
  subTin          String?
  region          String?
  city            String?
  subCity         String?
  wereda          String?
  kebele          String?
  zone            String?
  locality        String?
  houseNumber     String?
  status          String

  sourceSystems EimsSourceSystem[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([organizationId])
  @@index([enterpriseId])
  @@map("eims_establishment")
}

model EimsSourceSystem {
  id                 String @id @default(cuid())
  organizationId     String
  enterpriseId       String
  establishmentId    String
  systemNumber       String
  systemType         String
  model              String?
  manufacturer       String?
  softwareVersion    String?
  serviceType        String?
  serviceCenterTin   String?
  serviceDate        DateTime?
  lastUpgradeDate    DateTime?
  permitNo           String?
  machineRegNo       String?
  simCardNo          String?
  inHouseDeveloped   Boolean @default(false)
  approvalStatus     String
  active             Boolean @default(true)

  credential  EimsCredential?
  certificate EimsCertificate?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([organizationId, systemNumber])
  @@index([organizationId])
  @@index([establishmentId])
  @@map("eims_source_system")
}
```

Invoice and submission records must include these IDs:

```text
organizationId
enterpriseId
establishmentId
sourceSystemId
```

This lets the system answer:

- Which tenant submitted the invoice?
- Which legal taxpayer identity was used?
- Which branch/outlet issued it?
- Which POS/source system signed and submitted it?
- Which credential/certificate was used?

## 8. RLS Strategy

The current SaaS template does not use PostgreSQL row-level security. It uses application-level tenant scoping through `organizationId`, tenant context, permissions, and repository queries.

Do not migrate the entire SaaS template to RLS now.

Use a three-level isolation model:

```text
Level 1: Normal SaaS tables
  Application-level organizationId scoping.
  Tenant isolation tests.

Level 2: Sensitive business tables
  Application-level scoping.
  Repository guard helpers.
  Strong cross-tenant tests.

Level 3: Compliance/security tables
  Application-level scoping.
  PostgreSQL RLS.
  Audit tests.
```

Apply Level 3 to:

```text
eims_enterprise
eims_establishment
eims_source_system
eims_credential
eims_certificate
eims_submission
eims_bulk_batch
eims_bulk_batch_item
eims_receipt
tax_invoice
tax_invoice_line
eims_audit_event
```

Example policy shape:

```sql
ALTER TABLE eims_submission ENABLE ROW LEVEL SECURITY;

CREATE POLICY eims_submission_tenant_isolation
ON eims_submission
USING (
  organization_id = current_setting('app.organization_id', true)
);
```

Every EIMS transaction must set DB tenant context:

```sql
SELECT set_config('app.organization_id', '<org-id>', true);
```

Implementation rule:

```text
EIMS repositories must run through an RLS-aware transaction helper.
Normal scaffold modules do not need to change.
```

Super-admin access:

- Super-admin can read operational metadata through explicit admin services.
- Super-admin must not read raw secrets, private keys, access tokens, or refresh tokens.
- Admin bypass must be explicit and tested, not accidental.

Evidence wording:

- For the base SaaS template, say "application-level tenant isolation".
- For EIMS/invoicing tables after implementation, say "targeted PostgreSQL RLS for compliance tables".

## 9. Signing and Key Management

Use this abstraction:

```ts
interface SigningProvider {
  sign(input: {
    canonicalJson: string;
    organizationId: string;
    sourceSystemId: string;
    algorithm: string;
  }): Promise<{ signature: string; keyVersion?: string }>;
}
```

Implementations:

```text
LocalSigningProvider
  Dev/sandbox fallback only.
  Encrypted private key in DB or local file.
  Not final production.

VaultSigningProvider
  Production default.
  Uses Vault Transit.
  Private key does not leave Vault.

KmsSigningProvider
  Future cloud option.

SoftHsmSigningProvider
  Future option only if INSA requires HSM/PKCS#11.
```

Phase 0 must prove:

- Algorithm.
- Hash.
- RSA padding mode.
- Vault signature output normalization.
- EIMS accepted signature format.

Do not assume `SHA512withRSA` is sufficient by itself. The certificate guideline mentions it, but padding/canonicalization still need sandbox proof, and `einvoice.cnf` uses `default_md=sha256` for CSR signing.

## 10. CSR and Certificate Flow

Two supported strategies:

### Strategy A: Vault-generated keypair

Recommended for most tenants.

```text
1. System creates keypair inside Vault Transit.
2. System exports CSR only.
3. Tenant submits CSR and certificate request form through the official process.
4. Tenant uploads issued X.509 certificate.
5. System stores public certificate metadata.
6. Vault keeps private key.
```

### Strategy B: Tenant-generated keypair

Advanced option.

```text
1. System gives OpenSSL instructions and `einvoice.cnf` template.
2. Tenant generates keypair and CSR locally.
3. Tenant submits CSR through official process.
4. Tenant uploads issued certificate and encrypted private key.
5. System imports private key into Vault.
6. System deletes temporary uploaded private key material after import.
```

Certificate metadata:

```text
organizationId
enterpriseId
establishmentId
sourceSystemId
certificateFingerprint
serialNumber
subjectCommonNameTin
subjectAltEmail
validFrom
validTo
status
keyProvider
keyRef
```

Certificate expiry must:

- Notify tenant owners/admins before expiry.
- Block submission after expiry.
- Appear in platform admin EIMS dashboard.
- Be included in compliance evidence export.

## 11. Canonical Invoice Contract

Every vertical maps to a canonical invoice shape.

Phase 0 must lock this contract before implementation.

Minimum shape:

```text
CanonicalInvoice
  organizationId
  enterpriseId
  establishmentId
  sourceSystemId
  transactionType
  documentType
  documentNumber
  documentDate
  invoiceCurrency
  previousIrn
  seller
  buyer
  lines
  payment
  valueDetails
  referenceDetails
  cashierName
  salesPersonName
  sourceBusinessEvent
```

The EIMS mapper converts this into the EIMS request fields:

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

## 12. Invoice State Machine

Use explicit states:

```text
draft
validated
pending_offline
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

- `draft` can be edited.
- `validated` can be queued/submitted.
- `pending_offline` is not official EIMS acceptance.
- `accepted` has IRN/QR from EIMS and cannot be normally edited/deleted.
- `cancelled` keeps original invoice and cancellation evidence.
- Every state transition creates an audit event.

## 13. Online Submission Flow

```text
1. Business module emits event: order paid, sale completed, hotel checkout.
2. Business module resolves enterprise, establishment, source system.
3. Business module calls CreateInvoice with source context.
4. Invoicing module creates canonical invoice.
5. Invoicing validates totals, buyer/seller, tax, document type.
6. Submit command checks permission, plan, source approval, credential, certificate.
7. EIMS mapper builds request.
8. JSON canonicalizer serializes payload.
9. SigningProvider signs payload.
10. EIMS client authenticates or refreshes token.
11. EIMS client submits invoice.
12. System stores IRN, signed QR, signed invoice, ack date, status.
13. Audit event is written.
14. Buyer notification is sent.
15. Business module marks source record as invoiced.
```

## 14. Offline Pending-Sync Mode

Offline mode is required for continuity, especially POS-heavy verticals.

Offline mode must not pretend to be official EIMS acceptance.

Correct flow:

```text
1. EIMS/network is unreachable.
2. POS creates local pending invoice.
3. System assigns temporary local reference number.
4. UI and print clearly show pending sync / pending tax clearance.
5. Optional pending marker QR is visually different from official EIMS QR.
6. Background job submits when connectivity returns.
7. EIMS returns IRN/QR.
8. Invoice transitions from pending_offline to accepted.
9. Final IRN/QR replaces pending marker.
10. Audit log records local creation time and EIMS acceptance time.
```

What not to do:

- Do not fabricate IRN.
- Do not render official-looking QR before EIMS acceptance.
- Do not tell buyer/tax authority that pending invoice is accepted.

Offline security:

- Encrypt offline cache.
- Integrity-check pending invoice files/records with HMAC or SHA-256.
- Sync automatically when connectivity returns.
- Record every pending -> accepted transition.

Phase 0 must confirm MoR rules:

- Maximum allowed offline duration.
- Offline resend limits.
- Required fields and timestamps.
- Rule validation behavior for delayed submissions.

## 15. Bulk Registration and Reconciliation

Bulk flow:

```text
1. Create batch.
2. Validate each invoice.
3. Submit batch to EIMS.
4. Store conversation ID.
5. Receive callback or poll status.
6. Store per-item accepted/rejected/processing state.
7. Retry/correct failed items.
```

Required failure handling:

- Missing callback -> polling/reconciliation job.
- Duplicate callback -> idempotency key.
- Partial failure -> per-item status and error.
- Still processing -> keep batch open.
- Unknown conversation ID -> reject callback and alert.

Reconciliation threshold:

```text
default: 15 minutes
configurable per deployment or tenant tier
```

## 16. Receipts and Withholding

Sales receipt:

```text
payment collected -> receipt created -> EIMS receipt submitted -> RRN/QR/status stored
```

Withholding receipt:

```text
withholding applies -> detail calculated -> withholding receipt submitted -> status stored
```

Receipts must link to invoice IRN where required.

## 17. Buyer Notification and Print

MoR BSP evidence references buyer notification by email/SMS and paper print on demand.

Add:

```text
BuyerNotificationService
  sendInvoiceNotification(invoice, channels)
  sendCancellationNotification(invoice, reason, channels)
  sendReceiptNotification(receipt, channels)
```

Canonical invoice should include:

```text
buyerPhone
buyerEmail
notificationPreference
```

Supported channels:

```text
email
sms
print
```

Notification logs must be auditable.

## 18. Tamper-Evident Audit Log

Add EIMS-specific audit table:

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
- App role can insert only.
- No app-level update/delete.
- Optional DB trigger blocks update/delete.
- Hash = SHA-256(prevHash || canonicalJson(payload)).
- Use trusted time source.
- Retention target: 7+ years for tax records unless legal guidance says otherwise.

Events:

```text
eims.setup.profile.updated
eims.source.created
eims.source.approval_status.changed
eims.credential.created
eims.credential.rotated
eims.certificate.imported
eims.certificate.rotated
invoice.created
invoice.validated
invoice.pending_offline
invoice.submitted
invoice.accepted
invoice.rejected
invoice.cancel_requested
invoice.cancelled
receipt.submitted
bulk.submitted
bulk.callback_received
signing.operation
compliance.exported
```

## 19. Permissions

Add permissions:

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

Suggested tenant roles:

| Role | Access |
|---|---|
| Owner | Full tenant EIMS/invoicing access. |
| Admin | Setup, sources, credentials, certificates, invoices, receipts. |
| Accountant | Submit, verify, cancel, receipts, exports. |
| Branch manager | Manage invoices for assigned establishment/source. |
| Cashier | Create POS invoices/receipts for assigned source. |
| Auditor | Read invoices, receipts, audit, exports. |
| Viewer | Read-only where granted. |

Custom roles must expose these permissions in the existing role matrix.

## 20. Billing and Plan Enforcement

Feature keys:

```text
eims.enabled
eims.enterprises
eims.establishments
eims.sources
eims.monthly-invoices
eims.bulk-registration
eims.offline-mode
eims.receipts
eims.withholding-receipts
eims.compliance-export
eims.api-requests-per-minute
eims.retention-months
```

Enforcement:

- Source creation checks source limit.
- Establishment creation checks branch limit.
- Invoice submission checks monthly invoice limit.
- Offline mode requires enabled feature.
- Bulk requires enabled feature.
- Compliance export requires enabled feature.
- API rate limit is per tenant, not global.

## 21. Per-Tenant Rate Limiting

One large tenant must not block other tenants.

Use:

- Token bucket per organization.
- Separate or weighted-fair queues per tenant for EIMS submissions.
- Per-tenant metrics.
- Plan-based rate limits.

Track:

```text
eims_tenant_rate_limited_total
eims_submission_queue_depth_by_tenant
eims_submission_latency_by_tenant
```

## 22. Admin and Tenant UI

Tenant EIMS setup:

```text
/settings/eims/profile
/settings/eims/enterprises
/settings/eims/establishments
/settings/eims/sources
/settings/eims/credentials
/settings/eims/certificates
/eims/submissions
/eims/bulk
/eims/compliance
```

Tenant setup wizard:

```text
1. Enterprise/taxpayer profile
2. Establishment/branch
3. Source system
4. Credential
5. Certificate/CSR
6. Test connection
7. Sandbox test invoice
8. Compliance checklist
```

Platform admin:

```text
/admin/eims
/admin/eims/tenants
/admin/eims/failures
/admin/eims/certificates
/admin/eims/resources
/admin/eims/compliance
```

Admin dashboard shows:

- Tenants missing setup.
- Source systems pending approval.
- Certificate expiry.
- Invalid credentials.
- Failed submissions.
- Offline pending count.
- Bulk batches stuck.
- Per-tenant invoice volume.
- Queue depth.
- EIMS API latency/error rate.
- Plan usage.
- Data export/offboarding status.

Admin must not show raw secrets or private key material.

## 23. Monitoring and Operations

Metrics:

```text
eims_invoice_submissions_total
eims_invoice_accepts_total
eims_invoice_rejections_total
eims_invoice_cancellations_total
eims_receipt_submissions_total
eims_offline_pending_total
eims_bulk_batches_active
eims_bulk_reconciliation_total
eims_certificate_expiring_total
eims_credentials_invalid_total
eims_api_latency_ms
eims_retry_queue_depth
eims_tenant_rate_limited_total
```

Operational stack:

- Prometheus for metrics.
- Grafana for dashboards.
- Pino/Loki/plain logs for app logs.
- Vault audit logs for signing/key access.
- NTP/chrony monitoring for time drift.

NTP requirements:

- Use authenticated NTP/NTS where practical.
- Alert on clock drift greater than 1 second.
- Include time-sync config in compliance evidence.

## 24. Data Export, Deletion, and Offboarding

MoR BSP evidence references full data export and deletion within 30 days.

Add:

```text
ExportTenantDataCommand
  organizationId
  formats: json, csv, pdf
  includes:
    enterprises
    establishments
    source systems
    invoices
    invoice lines
    receipts
    EIMS submissions
    EIMS audit events
    public certificate metadata
    notification logs
```

Rules:

- Export archive must be encrypted.
- Include manifest and checksums.
- Do not export private keys or raw client secrets.
- Deletion must respect legal/tax retention rules.
- If tax records must be retained, offboarding deletes active access but preserves compliance archive according to legal retention.

## 25. Hosting and Datacenter Evidence

MoR BSP asks for hosting/deployment evidence.

Document per deployment:

- Hosting model: VPS/cloud IaaS, dedicated hosting, colocation, own bare metal.
- Datacenter tier if available.
- DC name/location.
- Backup location.
- Data residency position.
- DR/restore process.
- Monitoring and support contacts.

For VPS-first:

- Record VPS provider and region.
- Keep encrypted off-server backups.
- Prepare migration path to Ethiopian-hosted infrastructure if required.
- Do not claim Tier III/IV unless provider gives evidence.

## 26. Compliance Evidence Package

Build evidence during implementation, not after.

Technical evidence:

- Architecture diagram.
- Data flow diagram.
- Component inventory in MoR BSP format.
- Enterprise/Establishment/SourceSystem mapping.
- Database schema.
- RLS policy list for EIMS tables.
- Network diagram.
- Vault setup docs.
- NTP docs.
- DR test report.

Security evidence:

- Security test results.
- Dependency scan results.
- Secret scan results.
- TLS configuration.
- Access control matrix.
- Vault audit log sample.
- EIMS audit hash chain sample.
- Key management procedure.
- Incident response plan.

Operational evidence:

- SLA/support contacts.
- Backup/restore logs.
- Monitoring screenshots.
- Change management.
- Data export/offboarding policy.
- Certificate expiry procedure.

Test evidence:

- B2C VAT invoice.
- B2B invoice with buyer TIN.
- Sales receipt linked to invoice.
- Withholding receipt.
- Cancellation with reason.
- Bulk operation.
- Multi-branch/source test.
- Offline pending-sync reconciliation.
- QR scan test with official scanner if available.
- Buyer notification test.

Legal/process evidence:

- Commitment form where applicable.
- Letter of guarantee where applicable.
- Certificate request form.
- Authorization letter package.
- Company registration/service agreements.

## 27. Testing Plan

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

Required coverage:

- Tenant isolation.
- Targeted RLS behavior for EIMS tables.
- Enterprise/Establishment/SourceSystem mapping.
- Source approval status.
- Credential redaction.
- Certificate expiry.
- SigningProvider boundary.
- JSON canonicalization.
- Invoice tax/total validation.
- B2B/B2C buyer rules.
- Single submit.
- Verification.
- Cancellation.
- Sales receipt.
- Withholding receipt.
- Bulk callback/reconciliation.
- Offline pending-sync.
- Buyer notifications.
- Plan enforcement.
- Per-tenant rate limit.
- Admin metadata visibility without secrets.
- Audit hash chain.
- Mutation tests for critical validators.
- Property tests for totals/canonicalization.
- k6 load tests for submit/bulk flows.

## 28. Phase 0: Technical Proof

Do this before production implementation.

1. Confirm signing algorithm, hash, padding, and Vault signature normalization against EIMS sandbox.
2. Prove Vault CSR flow and certificate import/signing against sandbox.
3. Confirm JSON canonicalization rules.
4. Confirm offline-mode rules and delayed submission behavior.
5. Confirm callback security model.
6. Lock `CanonicalInvoice` contract with restaurant reference flow.
7. Confirm Enterprise/Establishment/SourceSystem mapping against MoR source registration expectations.
8. Confirm RLS implementation pattern works with Prisma transactions and background jobs.

Exit criteria:

- Real or sandbox accepted invoice proves signing/canonicalization path.
- Clear answer on offline limits.
- Clear callback validation strategy.
- Canonical invoice contract frozen for v1.
- Targeted RLS proof passes with Prisma.

## 29. Build Order

### Phase 1: Foundation

- Vault setup.
- SigningProvider.
- NTP.
- Enterprise/Establishment/SourceSystem models.
- Targeted RLS proof.
- CanonicalInvoice model.

### Phase 2: EIMS Auth and Credential Lifecycle

- Encrypted credential storage.
- Token refresh.
- Credential test.
- Redaction tests.

### Phase 3: Certificate and CSR

- CSR Strategy A and B.
- Certificate import.
- Certificate expiry.
- Vault key references.

### Phase 4: Single Invoice Submission

- Restaurant order paid -> CanonicalInvoice.
- EIMS payload validation.
- Signing.
- Submit to sandbox.
- Store IRN/QR.
- Audit hash chain.

### Phase 5: Receipt and Verification

- Sales receipt.
- Withholding receipt.
- Verify by IRN.
- QR rendering.
- Buyer notification.

### Phase 6: Cancellation and Bulk

- Cancellation with reason.
- Bulk registration.
- Callback.
- Reconciliation polling.

### Phase 7: Offline Mode

- Pending local invoice.
- Pending UI/print marker.
- Offline cache encryption/integrity.
- Reconciliation.

### Phase 8: Admin and Compliance

- Admin dashboard.
- Compliance export.
- Per-tenant rate limits.
- Data export/offboarding.
- Hosting/evidence docs.

### Phase 9: Other Verticals

Apply the same EIMS core to:

- Retail.
- Supermarket.
- Hotel.
- Manufacturing.
- Wholesale.
- Spare parts.

Each vertical only maps its business event to `CanonicalInvoice`.

## 30. Gateway Extraction Triggers

Keep EIMS embedded until one of these is true:

- Three or more SaaS products are in production.
- External companies want to use the EIMS integration.
- A separate EIMS operations team exists.
- Compliance audit requires a hardened standalone service.
- EIMS traffic/queue isolation becomes operationally necessary.

Until then, embedded is simpler, cheaper, and easier to run on a VPS.

## 31. Open Questions

These need answers before serious build starts:

- Which legal entity holds any required guarantee?
- One certification for parent/provider or per SaaS product?
- Exact offline submission limits and accepted UX.
- Self-serve or assisted CSR submission?
- Who holds Vault unseal shards?
- Data residency requirements.
- Backup/DR location.
- SMS provider.
- Email provider.
- Restaurant beta rollout plan.
- Whether Postgres RLS is required by auditor for all tables or targeted EIMS tables is enough.

## 32. Final Position

The agreed architecture is:

```text
Generated SaaS
  Business modules
    -> Canonical invoicing
      -> EIMS bounded context
        -> MoR/EIMS
```

With:

```text
Enterprise -> Establishment/Branch -> SourceSystem
```

as a first-class model.

The base template keeps application-level tenant scoping. EIMS/invoicing compliance tables add targeted PostgreSQL RLS.

Vault is the production signing provider, but signing details must be proven in Phase 0 before hardcoding algorithm/canonicalization assumptions.

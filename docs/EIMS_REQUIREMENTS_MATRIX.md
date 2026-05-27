# EIMS Requirements Matrix

This matrix is the control document for turning `create-vyllion-saas` into an EIMS-ready SaaS scaffold. It maps the supplied MoR/EIMS/INSA documents to the current scaffold and the required implementation work.

Status values:

- `supported`: current scaffold already has the needed generic capability.
- `partial`: current scaffold has a reusable base, but EIMS-specific work is still needed.
- `missing`: not implemented yet.
- `process`: legal, administrative, audit, or external approval requirement outside normal application code.
- `verify`: document evidence exists, but exact production behavior must be validated against MoR/EIMS sandbox or authority guidance.

Current implementation note:

- The template now includes an executable MoR BSP acceptance harness under
  `apps/api/src/modules/eims/compliance` and
  `apps/api-tests/tests/eims-acceptance.spec.ts`.
- Mock mode covers the BSP case IDs `IRC-P01`, `IRC-P02`, `IRC-P03`,
  `IRC-P04`, `IRC-P05`, `IRC-P06`, `IRC-P07`, `IRC-N08`, `IRC-N09`,
  `IRC-N010`, `ADD-N001`, `ADD-C001`, and `ADD-P001`.
- These are marked `verify` until the same case IDs are replayed against the
  official INSA/MoR sandbox.

## 0. MoR BSP Acceptance Harness

| Case | Source evidence | Current status | Required sandbox completion |
|---|---|---:|---|
| IRC-P01 B2C VAT invoice | `MoR_BSP_Master.docx` Table 2 | verify | Replay `POST /v1/register` against sandbox and attach official IRN, signed QR, printouts, mobile scan result. |
| IRC-P02 B2B invoice | `MoR_BSP_Master.docx` Table 3 | verify | Replay `POST /v1/register` with real buyer TIN/legal name and attach official IRN, printout, withholding/excise evidence. |
| IRC-P03 Sales receipt | `MoR_BSP_Master.docx` IRC-P03; Postman `/v1/receipt/sales` | verify | Replay with accepted invoice IRN and attach official RRN/signed QR. |
| IRC-P04 Withholding receipt | `MoR_BSP_Master.docx` IRC-P04; Postman `/v1/receipt/withholding` | verify | Replay with accepted invoice IRN and confirmed TWHT/IWHT fields. |
| IRC-P05 Cancellation | `MoR_BSP_Master.docx` IRC-P05; Postman `/v1/cancel` | verify | Replay cancellation with official reason code and audit evidence. |
| IRC-P06 Credit memo | `MoR_BSP_Master.docx` IRC-P06 | verify | Replay credit note with reason and related document. |
| IRC-P07 Debit memo | `MoR_BSP_Master.docx` IRC-P07 | verify | Replay debit note with reason and related document. |
| IRC-N08 Invalid buyer | `MoR_BSP_Master.docx` IRC-N08 | verify | Confirm sandbox rejects invalid B2B buyer and issues no IRN. |
| IRC-N09 Invalid receipt source | `MoR_BSP_Master.docx` IRC-N09 | verify | Confirm sandbox rejects receipt from missing/cancelled invoice and issues no RRN. |
| IRC-N010 Invalid cancellation | `MoR_BSP_Master.docx` IRC-N010 | verify | Confirm sandbox rejects missing/already-cancelled IRN. |
| ADD-N001 Notification service | `MoR_BSP_Master.docx` ADD-N001 | partial | Attach SMS/email provider delivery evidence from production-capable provider. |
| ADD-C001 Setup/configuration | `MoR_BSP_Master.docx` ADD-C001 | verify | Attach real tenant setup evidence, MoR source reference, credential test, certificate validity. |
| ADD-P001 Print layout/content | `MoR_BSP_Master.docx` ADD-P001 | verify | Attach thermal and A4 print samples from accepted sandbox/production invoices. |

## 1. Core EIMS Integration

| Requirement | Source evidence | Current status | Required implementation |
|---|---|---:|---|
| EIMS API authentication with API key, client ID, client secret, and TIN | `EIMS_compliance_Draft.pdf` authentication section; `EimsCoreApiMockCollection2.postman_collection.json` login body uses `apikey`, `clientId`, `clientSecret`, `tin` | missing | Add `EimsAuthClient`, encrypted per-tenant/source credentials, token storage, refresh-token support, redaction tests. |
| JWT token and refresh token lifecycle | `EIMS_compliance_Draft.pdf` says EIMS issues JWT and refresh token; Postman collection has refresh-token request | missing | Store encrypted token/refresh token, expiry time, refresh before submit, retry once on token expiry. |
| Single invoice registration | `EIMS_compliance_Draft.pdf` invoice registration section; Postman endpoint `POST /v1/register` | missing | Add canonical invoice model, local validation, signing, submit service, response persistence. |
| Registration request top-level shape: `request`, `signature`, `certificate` | `EIMS_compliance_Draft.pdf` request schema section | missing | Wrap canonical request with signature and certificate. Add contract tests. |
| Digital signing over canonicalized request | `EIMS_compliance_Draft.pdf` digital signing requirements; certificate guideline | missing | Add deterministic JSON canonicalization and `EimsSigningService`. Mutation/property-test signature input stability. |
| Base64 certificate attached to request | `EIMS_compliance_Draft.pdf` registration schema; certificate guideline | missing | Store/import certificate, attach Base64 certificate, validate certificate/private key pairing. |
| Success response stores IRN and QR | `EIMS_compliance_Draft.pdf` process flow and response examples | missing | Persist `irn`, `signedQr`, `signedInvoice`, `ackDate`, status. |
| Schema validation error handling | `EIMS_compliance_Draft.pdf` response type 400/schema validation | missing | Store schema errors, show user-actionable validation messages, test invalid payloads. |
| Rule validation error handling | `EIMS_compliance_Draft.pdf` response type 406/rule validation | missing | Store rule errors separately from schema errors; support correction/retry workflow. |
| Invoice verification | Postman endpoint `POST /v1/verify`; EIMS process flow references verification | missing | Add verify endpoint/client, update invoice verification status, audit event. |
| Single invoice cancellation | Postman endpoint `POST /v1/cancel`; EIMS process flow references cancellation | missing | Add cancellation workflow requiring reason code and remark, role permission, audit log. |
| Bulk invoice cancellation | Postman endpoint `POST /v1/bulkCancel` | missing | Add bulk cancel batch, per-invoice result tracking, retry/failure handling. |
| Bulk invoice registration | `EIMS_compliance_Draft.pdf` bulk section; Postman endpoint `POST /v1/bulkRegister` | missing | Add batch model, conversation ID, callback handler, poll/fetch fallback if supported. |
| Bulk async callback handling | `EIMS_compliance_Draft.pdf` bulk section says callback URL/conversation ID is used | missing | Add callback endpoint, validate batch/conversation, persist per-invoice accept/fail results. |
| Sales receipt registration | EIMS receipt section; Postman endpoint `POST /v1/receipt/sales` | missing | Add receipt model/client/UI; link receipts to invoice IRNs. |
| Withholding receipt registration | Postman endpoint `POST /v1/receipt/withholding` | missing | Add withholding receipt model/client/UI and validation. |

## 2. Invoice Schema and Business Rules

| Requirement | Source evidence | Current status | Required implementation |
|---|---|---:|---|
| Top-level invoice elements | `EIMS_compliance_Draft.pdf` schema overview lists `TransactionType`, `DocumentDetails`, `SourceSystem`, `SellerDetails`, `BuyerDetails`, `ItemList`, `PaymentDetails`, `ValueDetails`, `ReferenceDetails` | missing | Create canonical invoice object and JSON schema draft-07 validator. |
| B2B/B2C/G2C buyer TIN conditions | `EIMS_compliance_Draft.pdf` schema detail says buyer TIN required unless transaction type allows no-TIN flow | missing | Add transaction-type validator, property tests, API tests. |
| Document type support | `EIMS_compliance_Draft.pdf` lists document types such as invoice, credit note, debit note, interim/final/retainer/mixed/proforma/overdue | missing | Add enum/value object, document reason rules, credit/debit/cancellation mapping. |
| Document number and date validation | `EIMS_compliance_Draft.pdf` schema detail | missing | Add document-number policy per source and ISO/date validation. |
| Source system number/type in invoice | Postman fields `SystemNumber`, `SystemType`; source registration guide | missing | Link every invoice to an approved `EimsSourceSystem`. |
| Seller details | Postman variables and invoice body fields include seller legal name, TIN, VAT, email, phone, region, woreda | missing | Add taxpayer profile setup and seller snapshot at invoice time. |
| Buyer details | Postman sample and buyer/government list files include buyer TIN, legal name, address/contact fields | missing | Add buyer model or reusable customer mapping. |
| Item list fields | Postman body includes item code, description, quantity, unit, unit price, tax code, tax amount, total line amount | missing | Add invoice line model and validation. |
| Value details and totals | Postman body includes tax/excise/withholding/total values | missing | Add value calculation service and mutation tests. |
| Payment details | Postman body includes payment mode/term fields; receipt section includes payment transaction details | missing | Add payment mapping from vertical apps to invoice/receipt payload. |
| Previous IRN support | Postman variable `previousIrn`; schema references related documents/reference details | missing | Add related document/previous IRN support for credit/debit/correction flows. |

## 3. Certificate, Source, and Onboarding

| Requirement | Source evidence | Current status | Required implementation |
|---|---|---:|---|
| Private key generation guidance | `certificate_guideline.pdf` and `.docx` | missing | Add docs and optional CSR helper. Do not expose private key in UI. |
| CSR configuration | `einvoice.cnf` shows country `ET`, organization, organization unit, `serialNumber` as system ID, `commonName` as TIN, email SAN | missing | Add CSR preview/generator inputs from taxpayer profile and source system. |
| Certificate request requires contact, taxpayer, TIN, and at least one System ID | `Certificate Request form v.1.docx` | missing | Add setup checklist and validation that source/system ID exists before certificate setup. |
| Certificate import | Certificate guideline requires using certificate for signed submissions | missing | Add certificate import, fingerprint, validity dates, TIN/source match checks. |
| Certificate expiry handling | Certificate/security requirements imply certificate lifecycle management | missing | Add expiry warnings, blocking behavior, rotation flow, admin dashboard. |
| Source registration pending/approval workflow | `Self-onboarding and Source Registration Guide.pdf` | missing | Add source status fields and UI: draft, submitted, pending, approved, rejected, disabled. |
| Taxpayer self-onboarding and 2FA | Self-onboarding guide says signup, OTP, login credentials, enable 2FA | partial | Scaffold has auth/security settings; add EIMS onboarding docs/checklist, not a direct MoR portal replacement. |

## 4. Multi-Tenant SaaS and Admin Operations

| Requirement | Source evidence | Current status | Required implementation |
|---|---|---:|---|
| SaaS/cloud system type support | `MoR_BSP_Master.docx` has SaaS SP section | partial | Add EIMS-specific SaaS evidence: tenant isolation, hosting, source mapping, architecture diagram, audit/export. |
| Tenant isolation | Existing scaffold tenant context and database guide | partial | Add EIMS tenant isolation tests for invoices, sources, credentials, certificates, receipts. |
| Tenant roles and authorization | Existing role module; `MoR_BSP_Master.docx` references auth/authz/security components | partial | Add EIMS permission resources and default roles: cashier, accountant, branch manager, auditor. |
| Custom tenant roles | Existing `/settings/roles` and role module | supported | Add EIMS permission keys into the custom-role matrix. |
| Platform admin tenant view | Existing admin organizations/detail/server dashboards | partial | Add EIMS compliance/resource detail without exposing secrets. |
| Resource management | Existing server metrics/resource dashboard | partial | Add EIMS invoice volume, source count, failed submissions, queue depth, certificate expiry. |
| Billing plan enforcement | Existing billing entitlement system | partial | Add EIMS feature keys and server-side policy checks for source count, invoice volume, bulk, exports. |
| Audit logs | Existing audit-log module | partial | Add EIMS-specific audit events and evidence exports. |
| Reporting exports | Existing reporting/export modules | partial | Add EIMS compliance, IRN, failure, cancellation, and receipt reports. |

## 5. Security and INSA Readiness

| Requirement | Source evidence | Current status | Required implementation |
|---|---|---:|---|
| Governance/security evidence | `compliance check list.pdf` | partial | Add security evidence checklist and admin export. |
| Data protection | INSA checklist and cybersecurity audit document | partial | Encrypt credentials/certificates/private key references; redact logs; add tests. |
| Secure communication | INSA documents; EIMS security section | partial | Production HTTPS requirement, EIMS HTTPS base URL, callback security, TLS checklist. |
| Access control | INSA documents; MoR checklist | partial | EIMS RBAC, admin role checks, tenant role tests, forbidden secret-read tests. |
| Secure provisioning/key management | `Cybersecurity Audit minimum Requirements2.pdf` | missing | Add key management docs, encryption key doctor, rotation workflow. |
| Software integrity/update mechanism | INSA documents | partial | Document deployment/update process, exact dependency versions, dependency scanning, changelog/release evidence. |
| Device/POS/hardware-specific controls | INSA documents include POS/device topics | verify | For cloud SaaS only, mark hardware controls not applicable unless deploying local POS devices. For POS terminals, add separate device controls later. |
| Security testing | Current scaffold has gitleaks, audit/OSV, semgrep, nuclei, API security smoke | partial | Add EIMS-specific security tests for secret redaction, private key access, tenant isolation, callback validation. |

## 6. Vertical SaaS Starters

| Vertical | Current status | Required EIMS integration |
|---|---:|---|
| Restaurant | missing | Orders/tables/menu/payments create canonical invoices; cashier maps to source; split bill/refund maps to invoice/cancel/credit flow. |
| Hotel | missing | Folio checkout creates invoice; company billing maps B2B; guest billing maps B2C; deposits/partial payments map to receipts. |
| Supermarket | missing | POS sale creates immediate invoice; high-volume submit/retry; returns map cancellation/credit; barcode/inventory integration. |
| Retail shop | missing | Sale/payment creates invoice; B2B requires buyer TIN; B2C no-TIN flow where allowed; branch maps source system. |

## 7. Legal and Administrative Process Items

| Requirement/process | Source evidence | Current status | Required action |
|---|---|---:|---|
| Provider commitment/retesting/improvements | `Commitment Form v1.1.docx` | process | Treat as external provider obligation. Maintain implementation evidence and retest process. |
| Bank guarantee/provider commercial obligation | `Letter of Guarantee-after comment-V1.2.docx` | process | Confirm with MoR/legal advisor whether it applies to the intended business model. Not a software feature. |
| MoR/INSA testing and sign-off | `MoR_BSP_Master.docx`, INSA documents | process | Prepare evidence, sandbox results, security report, and sign-off package. |
| Taxpayer/source approval | Self-onboarding/source guide | process | Provide tenant checklist and status tracking; approval happens through official portal/back office. |

## 8. Validation Rules for Future Work

No EIMS task should be marked done unless it has:

- Source document reference.
- Tenant isolation test.
- Permission/RBAC test.
- Plan entitlement test if it affects paid capability.
- Audit event.
- Failure handling.
- Security/redaction check if secrets, certificates, keys, or tokens are involved.
- Browser/API/acceptance coverage for user-visible workflows.
- Updated row in this matrix.

# EIMS V3 SaaS Template Implementation Plan

This is the implementation control plan for the SaaS template. It is based on
the EMIS source documents in `docs/EMIS`, especially:

- `MoR_BSP_Master.docx`
- `EIMS_compliance_Draft.pdf`
- `EimsCoreApiMockCollection2.postman_collection.json`
- `compliance check list.pdf`
- `Cybersecurity Audit minimum Requirements2.pdf`
- `Self-onboarding and Source Registration Guide.pdf`
- `certificate_guideline.pdf`
- `Certificate  Request form v.1.docx`
- `einvoice.cnf`
- `buyer list .docx`
- `Gov.t inst. list .docx`

## Controlling Interpretation

The SaaS does not replace the MoR portal. Source registration and official
approval happen outside the SaaS. The SaaS must store the approved MoR source
reference, credentials, certificate, counters, previous IRN chain, and use them
for EIMS API operations.

The template must prove readiness in two modes:

1. Mock mode until sandbox access is available.
2. Sandbox mode after INSA/MoR credentials and certificates are issued.

The same case IDs, request shapes, assertions, and evidence records must run in
both modes.

## MoR BSP Acceptance Cases

These cases are now the template's executable acceptance target:

| Case | Required operation | Endpoint target | Required result |
|---|---|---|---|
| IRC-P01 | B2C VAT invoice without buyer TIN | `POST /v1/register` | Accepted IRN, signed QR, VAT0/VAT15/VATEX, thermal and A4 print evidence |
| IRC-P02 | B2B invoice with buyer TIN/legal name | `POST /v1/register` | Accepted IRN, buyer validation, withholding/excise/tax evidence |
| IRC-P03 | Sales receipt from accepted invoice | `POST /v1/receipt/sales` | Accepted RRN and signed receipt QR |
| IRC-P04 | Withholding receipt from accepted invoice | `POST /v1/receipt/withholding` | Accepted RRN, TWHT/IWHT fields |
| IRC-P05 | Cancel registered invoice | `POST /v1/cancel` | Cancelled status and audit evidence |
| IRC-P06 | Credit memo from registered invoice | `POST /v1/register` | Accepted credit note IRN, reason and related document |
| IRC-P07 | Debit memo from registered invoice | `POST /v1/register` | Accepted debit note IRN, reason and related document |
| IRC-N08 | Invalid B2B buyer TIN/legal name | `POST /v1/register` | Rejected, no IRN or official QR |
| IRC-N09 | Receipt from missing/cancelled invoice | `POST /v1/receipt/sales` | Rejected, no RRN |
| IRC-N010 | Cancel missing/already-cancelled invoice | `POST /v1/cancel` | Rejected, status unchanged |
| ADD-N001 | Buyer notification service | Internal notification operation | SMS/email provider logs and non-blocking retry policy |
| ADD-C001 | Setup/configuration evidence | SaaS setup endpoints | TIN, sub-TIN, source reference, credential test, certificate status |
| ADD-P001 | Print layout/content evidence | Print layout endpoints | Compact and A4 layouts with official QR only after EIMS acceptance |

## Backend Implementation

The backend owns the acceptance truth:

```text
apps/api/src/modules/eims/
  compliance/
    application/eims-acceptance.service.ts
    presentation/eims-acceptance.controller.ts
  shared/
    constants/eims-acceptance-cases.ts
```

New API:

```text
GET  /api/v1/eims/acceptance/cases
GET  /api/v1/eims/acceptance/cases/:caseId
POST /api/v1/eims/acceptance/cases/:caseId/run
POST /api/v1/eims/acceptance/run-all
```

Each case-run response includes:

- Case ID and source document reference.
- Operation and target EIMS endpoint.
- Mock request payload matching the EIMS API collection shape.
- Mock response payload.
- Assertion list with expected and actual values.
- Compliance evidence list.
- Print/notification evidence where required.

Mock mode is explicit: `executionMode = mock_until_sandbox`.

## Frontend Implementation

Tenant-side EIMS compliance now consumes backend acceptance data:

```text
apps/web/src/features/eims/api/eims.hooks.ts
apps/web/src/features/eims/components/eims-tenant-pages.tsx
```

The Compliance page provides:

- MoR BSP acceptance case table.
- Run-one-case action.
- Run-all-cases action.
- Assertion table for the latest run.
- Evidence/artifact summary.

The source setup UI is labelled as "MoR Sources" to avoid implying that the
SaaS performs official MoR portal registration.

## Test Implementation

Detailed backend API tests:

```text
apps/api-tests/tests/eims-acceptance.spec.ts
apps/api-tests/tests/eims-v3-mock.spec.ts
```

The tests validate data, not only HTTP 200:

- Catalog exactly includes all BSP case IDs.
- `run-all` executes all cases.
- Positive cases return IRN/RRN/signed QR evidence.
- Negative cases return errors and no IRN/RRN.
- B2C buyer TIN is null.
- B2B buyer TIN is 10 digits.
- VAT0/VAT15/VATEX item coverage exists.
- Credit/debit notes include reason and related document.
- Print evidence includes compact and A4 layouts.
- Notification evidence includes SMS and email providers.

Visible UI tests:

```text
apps/e2e/tests/eims-mock.spec.ts
```

The UI tests navigate through real sidebar/menu buttons, submit real forms, run
acceptance actions from the Compliance page, and assert the returned backend
data is visible in the UI.

## Sandbox Cutover

When INSA/MoR sandbox access arrives:

1. Replace deterministic mock transport with sandbox EIMS client for the same
   case IDs.
2. Keep the same request/response assertion structure.
3. Attach official IRN/RRN/QR evidence to each run result.
4. Lock signing, canonicalization, datetime and decimal settings.
5. Export `phase0-layer-b.md` and evidence artifacts.

No case is considered production-complete until it passes in sandbox mode.

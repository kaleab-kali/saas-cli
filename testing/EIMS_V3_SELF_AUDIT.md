# EIMS V3 Self-Audit

Date: 2026-05-27

Scope:

- Template source under `template/`
- Clean generated scaffold at `C:\Users\kali\Desktop\novek\testing\vyllion-eims-v3-full-structure-proof`
- V3 controlling plan in `docs/EIMS_FINAL_AGREED_SAAS_ARCHITECTURE_PLAN_V3.md`

## Audit Position

The current implementation is a scaffolded, mock-backed EIMS foundation. It is
not a complete production EIMS integration.

What is done cleanly:

- The generated project contains an EIMS bounded context, frontend EIMS routes,
  mock backend API, API tests, Bruno mock collection, and Playwright UI tests.
- The mock backend now covers the main V3 operational surfaces needed before
  sandbox access.
- Tests verify real response data, not only HTTP 200 status.
- Browser tests navigate tenant and super-admin EIMS pages on desktop and mobile.
- A headed Playwright CLI command has been run and added for repeatable visible
  UI verification.

What is not done yet:

- Real MoR/INSA integration.
- Real Vault Transit signing.
- Real per-source BullMQ queue and counter reservation lifecycle.
- Real targeted PostgreSQL RLS policies.
- Real encrypted credential persistence.
- Real print PDF rendering and QR scan validation.
- Real bulk callback security and reconciliation.
- Real offline encrypted pending-sync cache.

## V3 Coverage Matrix

| V3 Area | Scaffold Status | Test Status | Notes |
|---|---|---|---|
| Workspace layout | Implemented | Scaffold verifier | `apps/api`, `web`, `api-tests`, `e2e`, `acceptance`, `performance`, `security` are present in generated project. |
| EIMS bounded context | Structure implemented, behavior partial | Scaffold verifier | `setup`, `submission`, `receipts`, `compliance`, `shared`, and `admin` exist with V3 folder skeleton. Some subfolders are placeholders until production implementation. |
| Enterprise -> Establishment -> SourceSystem | Scaffolded | API + scaffold verifier | Data model and mock overview expose hierarchy, TIN, sub-TIN, approval state, counter. |
| Lookup/code registry | Implemented as seed/mock API | API tests | Document, transaction, source, cancellation, tax, payment, unit, nature, and region values verified. ETag/cache refresh is not implemented yet. |
| Source approval guard | Partially implemented | Unit/API tests | Guard and mock approval states exist. Full MoR portal workflow is not production-built. |
| Counter and PreviousIrn chain | Data model/mock only | Unit/API tests | Model/statuses exist; real per-source BullMQ queue and reconciliation are not built. |
| Credentials lifecycle | Mock API only | API/UI tests | Redaction is tested. Real encrypted storage and rotation workflows are not complete. |
| Certificates/CSR | Mock API only | API/UI tests | Certificate metadata and expiry state are exposed. Real Vault/INSA certificate flow is not complete. |
| 2FA enforcement | Planned/partially existing platform auth | Not EIMS-specific | EIMS-specific permission enforcement and bootstrap test coverage still need implementation. |
| Buyer/government directory | Mock API + data model | API/UI tests | Buyer and government buyer data verified. CRUD/import is not complete. |
| Print layouts | Mock metadata only | API/UI tests | Compact/A4 metadata and official-QR rule verified. PDF rendering and QR scan tests are not complete. |
| Receipts/withholding | Mock API | API/UI/Bruno mock | Sales and withholding states verified. Real EIMS receipt submission is not complete. |
| Cancellation | Mock API | API/UI tests | Reason code 4/remark and limit state verified. Real MoR cancellation rules still require sandbox. |
| Bulk | Mock API | API/UI tests | Conversation, callback state, and count reconciliation verified. Real callback auth/polling not complete. |
| Offline pending-sync | Mock state only | API/UI tests | Pending state has no IRN/ackDate. Real encrypted offline cache is not complete. |
| Buyer notifications | Mock API | API/UI tests | SMS/email providers and retry state verified. Real provider integration is not complete. |
| Targeted RLS | Data model/evidence item only | Scaffold verifier | Real SQL RLS policies and policy tests are not complete. |
| Audit hash chain | Data model/evidence item only | Scaffold verifier | Real append-only trigger/hash-chain implementation is not complete. |
| Admin operations | Mock API/UI | API/UI tests | Tenants, failures, certificates, resources, compliance routes verified. |
| Phase 0 Layer A | Implemented | `phase0:eims:local` | Local signing/canonicalization smoke passes. |
| Phase 0 Layer B | Blocked | Not testable | Requires INSA/MoR sandbox credentials and issued certificate. |

## Commands Run

Template:

```bash
cd C:\Users\kali\Desktop\novek\saas\pmss\create-vyllion-saas\template
pnpm test:eims:mock
pnpm test:eims:ui:headed
pnpm lint
```

Generated scaffold:

```bash
cd C:\Users\kali\Desktop\novek\testing\vyllion-eims-v3-full-structure-proof
pnpm test:eims:mock
pnpm --filter e2e exec playwright test -c playwright.eims.config.ts tests/eims-mock.spec.ts --headed --project=chromium
```

Root verifier:

```bash
cd C:\Users\kali\Desktop\novek\saas\pmss\create-vyllion-saas
pnpm test:eims:scaffold
```

## Audit Conclusion

The scaffold is now testable and useful before sandbox access. The UI tests are
real Playwright route walkthroughs and include a headed CLI path.

The implementation should not be described as production-complete EIMS. It is a
clean V3 scaffold foundation with detailed mock API/UI verification. Production
completion still requires the V3 phases for Vault, RLS, queues/counters,
offline cache, print rendering, real MoR APIs, and sandbox proof.

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

- Production EIMS SDK package install and running contract proof against the real package.
- Real Vault Transit signing.
- BullMQ/Redis worker consumers for multi-node per-source submission queue locking.
- Applied production PostgreSQL RLS migrations beyond the generated policy export.
- Running SDK-bound credential validation against the published SDK package and real sandbox credentials.
- Production printer/device QR scan certification across real hardware.
- Background authority polling workers around durable bulk callback receipts.

## V3 Coverage Matrix

| V3 Area | Scaffold Status | Test Status | Notes |
|---|---|---|---|
| Workspace layout | Implemented | Scaffold verifier | `apps/api`, `web`, `api-tests`, `e2e`, `acceptance`, `performance`, `security` are present in generated project. |
| EIMS bounded context | Structure implemented, behavior partial | Scaffold verifier | `setup`, `submission`, `receipts`, `compliance`, `shared`, and `admin` exist with V3 folder skeleton. Some subfolders are placeholders until production implementation. |
| Enterprise -> Establishment -> SourceSystem | Scaffolded | API + scaffold verifier | Data model and mock overview expose hierarchy, TIN, sub-TIN, approval state, counter. |
| Lookup/code registry | Seeded with ETag/cache metadata | Unit/API tests | Document, transaction, source, cancellation, tax, payment, unit, nature, and region values verified. The Nest lookup service emits deterministic ETags, cache-control metadata, and conditional 304 support; live authority refresh is still pending. |
| Source approval guard | Partially implemented | Unit/API tests | Guard and mock approval states exist. Full MoR portal workflow is not production-built. |
| Counter and PreviousIrn chain | Source-scoped coordinator plus durable reservations implemented; multi-node submission workers pending | Unit/API/security tests | Starter now serializes submissions per source, hydrates counter state from durable rows after restart, persists `EimsCounterReservation` before SDK dispatch, records accepted/rejected/unknown outcomes, attaches `previousIrn`, keeps retryable/unknown outcomes out of the accepted chain, and registers EIMS BullMQ queue names for `/admin/jobs` monitoring. Multi-node BullMQ/Redis submission locking workers are still deployment work. |
| EIMS SDK boundary | Adapter/provider boundary and explicit contract command implemented, real package proof pending | Unit/scaffold/security tests | `EIMS_EXTERNAL_CLIENT` switches from the mock client to `EimsSdkExternalClient` when `EIMS_MOCK_MODE=false`; the generated provider dynamically loads `EIMS_SDK_PACKAGE_NAME`, validates that the SDK exposes `registerInvoice`, `registerReceipt`, `verifyIrn`, and credential validation, and fails closed if the package is missing or incompatible. Generated projects now include `pnpm test:eims:sdk-contract`; running it against the published SDK package remains pending. |
| Credentials lifecycle | Encryption, rotation boundary, durable Prisma persistence, and SDK-bound validation implemented | Unit/API/UI tests | Credential POST and rotate payloads are sealed with `CipherService`, raw secret fields are stripped, encrypted secret material is persisted in `EimsCredential` byte columns, rotation evidence/revisions are stored, credential test decrypts secrets only in memory, calls `EIMS_EXTERNAL_CLIENT.validateCredential`, records the durable result, and responses expose only redaction/evidence metadata. Real proof still requires the published SDK package and sandbox credentials. |
| Certificates/CSR | Mock API only | API/UI tests | Certificate metadata and expiry state are exposed. Real Vault/INSA certificate flow is not complete. |
| 2FA enforcement | Planned/partially existing platform auth | Not EIMS-specific | EIMS-specific permission enforcement and bootstrap test coverage still need implementation. |
| Buyer/government directory | Mock API + data model | API/UI tests | Buyer and government buyer data verified. CRUD/import is not complete. |
| Print layouts | PDF proof service implemented, hardware scan certification pending | Unit/API/UI tests | Compact/A4 metadata and official-QR rule verified. Starter now renders PDF proof buffers, fingerprints them, and rejects official QR proof unless the invoice is accepted and the signed QR matches the IRN. Real printer/device QR scan certification is not complete. |
| Receipts/withholding | Mock API | API/UI/Bruno mock | Sales and withholding states verified. Real EIMS receipt submission is not complete. |
| Cancellation | Mock API | API/UI tests | Reason code 4/remark and limit state verified. Real cancellation validation still requires SDK-backed sandbox proof. |
| Bulk | Signed callback boundary and durable receipt persistence implemented, polling pending | Unit/API/UI tests | Callback HMAC verification, timestamp replay window, known conversation validation, idempotency, count reconciliation, encrypted payload receipt storage, and durable duplicate tracking are covered. Authority polling/replay workers are still pending. |
| Offline pending-sync | Encrypted cache, durable Prisma persistence, SDK-bound replay, and BullMQ replay queue implemented; scheduler tuning pending | Unit/API/UI tests | Pending state has no IRN/ackDate. Offline payloads are encrypted with `CipherService`, integrity-hashed, redacted from list responses, persisted in tenant-scoped `EimsOfflinePendingSync` rows, claimed only after hash verification, replayed through `EIMS_EXTERNAL_CLIENT`, marked synced on accepted IRN, marked retryable on SDK/authority failure, and poisoned on tamper before sync. `EimsOfflineReplayQueueService` enqueues tenant-scoped `eims-offline-replay` jobs and worker processing delegates back through the SDK-bound replay service. Production scheduler cadence and retry tuning remain deployment work. |
| Buyer notifications | Mock API | API/UI tests | SMS/email providers and retry state verified. Real provider integration is not complete. |
| Targeted RLS | SQL policy export implemented, migration application pending | Scaffold/security verifier | Generated `apps/api/prisma/eims-rls-policies.sql` enables and forces RLS for every EIMS tenant table using `app.current_organization_id` and write-side `WITH CHECK` policies. Running this against production PostgreSQL remains a deployment step. |
| Audit hash chain | SQL trigger export implemented, migration application pending | Scaffold/security verifier | Generated `apps/api/prisma/eims-audit-hash-chain.sql` creates the pgcrypto-backed insert hash trigger and update/delete blockers for `eims_audit_event`. Running this against production PostgreSQL remains a deployment step. |
| Admin operations | Mock API/UI | API/UI tests | Tenants, failures, certificates, resources, compliance routes verified. |
| Phase 0 Layer A | Implemented | `phase0:eims:local` | Local signing/canonicalization smoke passes. |
| Phase 0 Layer B | Blocked | Not testable | Requires the published EIMS SDK package plus issued sandbox credentials/certificate. |

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
completion still requires the V3 phases for Vault, applying RLS/audit SQL in production, BullMQ/Redis
submission worker consumers, durable callback polling, scheduled offline replay tuning, real printer/device QR certification,
the production EIMS SDK package install/contract proof, and sandbox proof.

# EIMS Starter Pack

This starter pack is installed with:

```bash
create-vyllion-saas add starter eims
```

The base scaffold is intentionally domain-neutral. EIMS files are added only when this pack is installed, and install state is tracked in `.scaffold-state.json` so repeat installs are safe.

To update an existing generated project after this starter's UI changes:

```bash
create-vyllion-saas add starter eims --refresh
```

Refresh reapplies the starter-owned web UI, routes, EIMS browser tests, package scripts, seed chain, env examples, landing policy, and sidebar patches. It deliberately does not overwrite API modules.

The installer copies EIMS source artifacts from `packages/cli/starters/eims/artifacts` and applies the required Prisma, route, permission, script, environment, seed, and sidebar patches. After install, authenticated users still land on `/onboarding` because the concierge workflow is the primary EIMS launch surface; tax operations stay available under `/eims`. The generated `db:seed` chain registers the `eims-restaurant` concierge onboarding template so `/admin/onboarding/new` can start the 15-step MoR, INSA, credential, SDK validation, and production-readiness workflow.

Production readiness is enforced by `pnpm doctor:production`. For an EIMS install it blocks launch when the app is still in mock mode, still points at the placeholder SDK package name, lacks production EIMS SDK endpoint configuration, lacks an HTTPS callback URL, lacks a callback HMAC secret, uses local signing, or has Phase 0 strict mode disabled. The SaaS starter consumes the EIMS SDK through the `EIMS_SDK_CLIENT` adapter boundary. In production mode the generated app dynamically loads `EIMS_SDK_PACKAGE_NAME` and fails closed if that package is missing or does not expose the `registerInvoice`, `registerReceipt`, `verifyIrn`, bulk-status polling, and credential-validation methods consumed by the SaaS adapter. Direct authority request/signing logic belongs in the SDK.

Credential save/rotation stays SaaS-side because it owns tenant storage and redaction. Credential testing decrypts stored secret material only in memory, calls the EMIS SDK credential validation method, records the durable result, and returns no raw secrets or ciphertext.

Invoice submission lanes persist `EimsCounterReservation` rows before calling the SDK and hydrate source counters from durable state after restart. `EimsSubmissionSourceLockService` adds a Redis source lock around reservation plus SDK dispatch so multi-node API or worker processes do not reserve the same source concurrently. Bulk reconciliation refresh uses the same adapter boundary through `pollBulkStatus` or one of the accepted SDK aliases (`pollBulkConversation`, `getBulkStatus`, `getBulkConversationStatus`) and stores the polled result in durable callback receipt rows.

Installing the starter appends `eims-submission-retry`, `eims-bulk-callback`, and `eims-offline-replay` to `BULLMQ_QUEUES` so the base `/admin/jobs` queue monitor can inspect and retry EIMS worker queues. `EimsOfflineReplaySchedulerService` scans durable pending offline records and enqueues tenant-scoped jobs into BullMQ; `EimsOfflineReplayQueueService` workers process those jobs through the existing SDK replay service. `pnpm doctor:production` blocks EIMS go-live if those queues are not visible, `EIMS_WORKERS_ENABLED` is not true, `EIMS_SUBMISSION_DISTRIBUTED_LOCKS` is not true, or `EIMS_OFFLINE_REPLAY_SCHEDULER_ENABLED` is not true.

The `pack.json` manifest is the source-of-truth metadata for routes, models, permissions, environment variables, seed data, queues, and cron jobs.

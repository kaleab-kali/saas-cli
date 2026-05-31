# EIMS Queues

Per-source submission queues and reconciliation workers live here. Do not hold
database locks across external EIMS calls.

The starter includes `EimsSubmissionQueueService` as the first production
boundary for invoice submission ordering:

- one serial lane per organization/source system
- local counter reservation metadata on each outbound EIMS call
- durable `EimsCounterReservation` rows before SDK dispatch
- restart hydration from `EimsSourceSystemCounter` and latest reservation rows
- previous-IRN chaining from the last accepted response only
- retryable/unknown outcomes kept out of the accepted counter chain

Replace the in-process submission coordinator with BullMQ-backed workers when
enabling multi-node production deployment; keep the same payload metadata
contract and Prisma reservation audit trail.

`EimsOfflineReplayQueueService` provides the durable offline replay worker path.
It enqueues tenant-scoped replay jobs into `eims-offline-replay`; the worker calls
the existing SDK-bound replay service and never talks to the authority directly.
Set `EIMS_WORKERS_ENABLED=true` with `REDIS_URL` in production.

Generated EIMS installs append `eims-submission-retry`, `eims-bulk-callback`,
and `eims-offline-replay` to `BULLMQ_QUEUES` so platform operators can inspect
and retry worker queues from `/admin/jobs`.

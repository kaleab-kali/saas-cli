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
- optional Redis source locks around reservation plus SDK dispatch

`EimsSubmissionSourceLockService` is the multi-node guard. Set
`EIMS_SUBMISSION_DISTRIBUTED_LOCKS=true` with `REDIS_URL` in production so only
one API or worker process can reserve and submit for the same source at a time.

`EimsBulkReconciliationSchedulerService` scans durable processing bulk
conversations every minute when `EIMS_BULK_RECONCILIATION_SCHEDULER_ENABLED=true`.
`EimsBulkReconciliationQueueService` enqueues tenant-scoped polling jobs into
`eims-bulk-callback`; the worker calls the SDK-bound bulk polling service and
never talks to the authority directly.

`EimsOfflineReplaySchedulerService` scans durable pending offline records every
minute when `EIMS_OFFLINE_REPLAY_SCHEDULER_ENABLED=true`.
`EimsOfflineReplayQueueService` enqueues tenant-scoped replay jobs into
`eims-offline-replay`; the worker calls the existing SDK-bound replay service and
never talks to the authority directly. Set `EIMS_WORKERS_ENABLED=true` with
`REDIS_URL` in production.

Generated EIMS installs append `eims-submission-retry`, `eims-bulk-callback`,
and `eims-offline-replay` to `BULLMQ_QUEUES` so platform operators can inspect
and retry worker queues from `/admin/jobs`.

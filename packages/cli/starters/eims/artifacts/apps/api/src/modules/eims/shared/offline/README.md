The offline pending-sync boundary is the server-side path for invoices captured
while a branch cannot reach EIMS. The in-memory cache keeps local tests fast, and
the Prisma persistence service stores the same encrypted payload contract in the
tenant-scoped `eims_offline_pending_sync` table for production use.

Both paths expose only redacted metadata to list views, verify a SHA-256
integrity hash before sync, and mark tampered records as poisoned before
dispatch. `EimsOfflineReplayService` claims durable rows, submits through the
`EIMS_EXTERNAL_CLIENT` SDK adapter boundary, then marks rows as synced or
retryable with the recorded error. Production deployments should schedule that
service with the queue/worker runtime and retry policy they operate.

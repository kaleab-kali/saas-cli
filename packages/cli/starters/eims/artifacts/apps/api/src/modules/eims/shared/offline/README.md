The offline pending-sync boundary is the server-side path for invoices captured
while a branch cannot reach EIMS. The in-memory cache keeps local tests fast, and
the Prisma persistence service stores the same encrypted payload contract in the
tenant-scoped `eims_offline_pending_sync` table for production use.

Both paths expose only redacted metadata to list views, verify a SHA-256
integrity hash before sync, and mark tampered records as poisoned before
dispatch. Production replay workers should claim rows through the durable
persistence service, submit through the EIMS SDK adapter, then mark rows as
synced or retryable with the recorded error.

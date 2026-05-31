The offline pending-sync cache is the server-side boundary for invoices captured
while a branch cannot reach EIMS. It stores encrypted payload JSON, exposes only
redacted metadata to list views, verifies a SHA-256 integrity hash before sync,
and marks tampered records as poisoned before dispatch.

Production deployments should back this service with a tenant-scoped database
table or queue. The starter keeps the same encrypted payload and redaction
contract in memory so local tests can prove the safety boundary without external
infrastructure.

# Observability

Production services must be debuggable without shelling into the server.

## Logs

- API logs include request ID, method, route, status, latency, user ID when known, and organization ID when known.
- Background jobs log job name, job ID, attempts, duration, and final status.
- Do not log secrets, access tokens, payment payloads, private keys, or uploaded file contents.

## Metrics

Expose operational metrics through the metrics module:

- HTTP request count and latency.
- Error count by route and status.
- Queue depth and failed job count.
- Database query latency if enabled.
- Process memory and uptime.

Keep the metrics endpoint private or protected by infrastructure controls.

## Health Endpoints

- `GET /health/live`: process liveness. Use this for container or process manager restart checks; it does not touch downstream dependencies.
- `GET /health/ready`: readiness for traffic. It checks the database and checks Redis when `REDIS_URL` is configured. A failed dependency returns HTTP 503.
- `GET /health`: compatibility health endpoint backed by Terminus.
- `GET /api/v1/health/detailed`: admin-only detailed system health. It includes DB/Redis/disk/memory/EIMS reachability checks, recent job failures, and HTTP metric snapshots. Do not expose it publicly; it requires the super-admin session guard.

## Alerts

Minimum alerts before launch:

- API health check failing.
- Database unavailable.
- Redis unavailable.
- Queue failed jobs above threshold.
- 5xx rate above baseline.
- Disk usage above 80%.
- Certificate, payment, or email provider failures.

## Dashboards

Create a dashboard with:

- API p50/p95/p99 latency.
- Request volume.
- Error rate.
- Queue depth.
- Failed jobs.
- Database connection count.
- CPU, memory, and disk.

## Incident Notes

For every production incident, record:

- Start and end time.
- Customer impact.
- Root cause.
- Detection source.
- Fix.
- Follow-up prevention task.

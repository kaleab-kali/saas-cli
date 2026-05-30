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

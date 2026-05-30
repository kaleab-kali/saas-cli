# Admin Operations Guide

The super-admin app manages tenants, plans, billing state, server health, and operational resources from one place.

## Tenant Management
Route: `/admin/organizations`

Tenant detail pages include:
- Members and roles
- Suspension state and reason
- Subscription and plan status
- Latest usage snapshot
- Active API key count
- Saved report count
- Notification count
- Tenant audit event count
- Per-tenant entitlement overrides

## Plan And Subscription Management
Routes:
- `/admin/plans`
- `/admin/billing`
- `/admin/billing/dashboard`

Included billing primitives:
- Free, Pro, and Enterprise seed plans
- Monthly and annual plan prices in minor currency units
- Feature entitlements and per-plan limits
- Per-tenant entitlement overrides
- Subscription lifecycle states: `trialing`, `active`, `past_due`, `grace`, `read_only`, `locked`, `canceled`, `suspended`
- Invoice lifecycle: draft, sent, paid, overdue, void, refunded
- Manual invoice creation and payment recording
- Stripe and Chapa gateway slots
- Stripe billing portal deep links for tenant self-service card and invoice management
- Dunning email templates and logs
- Daily lifecycle and usage snapshot jobs

## Server Management
Route: `/admin/server`

The server page shows:
- Database health and latency
- Node version, environment, PID, uptime
- Host CPU, load, and memory
- Process memory
- HTTP request totals, one-minute RPS, active requests, error rate, and p50/p95 latency
- Whether Redis, Stripe, Chapa, and object storage are configured
- Platform resource counts across tenants, users, sessions, subscriptions, invoices, API keys, file assets, reports, notifications, audit logs, and job runs

The API also exposes Prometheus-format metrics at `/api/v1/metrics`. Set `METRICS_TOKEN` to require `Authorization: Bearer <token>` for scrapes.

For a small VPS, the recommended open-source stack is:
- Prometheus to scrape `/api/v1/metrics`
- Grafana for dashboards and alerts
- Loki or plain Pino log files for searchable application logs
- PostHog only when you need product analytics such as funnels, retention, and feature usage

## Job Management
Route: `/admin/jobs`

Included jobs:
- `billing.daily`
- `billing.usage`

The same page also inspects configured BullMQ queues when `REDIS_URL` is set. Configure queue names with:

```env
BULLMQ_QUEUES=billing,notifications,reports
BULLMQ_PREFIX=
```

## File Storage
Route: `/files`

Uploads use local filesystem storage by default and store metadata in the `file_asset` table. For a VPS, this is usually enough if the `uploads` directory is backed up and served by the API.

For self-hosted object storage, set `STORAGE_DRIVER=object` and point the object-storage variables at a S3-compatible service such as MinIO, Garage, or SeaweedFS:

```env
STORAGE_DRIVER=object
OBJECT_STORAGE_ENDPOINT=https://objects.example.com
OBJECT_STORAGE_BUCKET=my-app
OBJECT_STORAGE_REGION=us-east-1
OBJECT_STORAGE_ACCESS_KEY=change-me
OBJECT_STORAGE_SECRET_KEY=change-me
OBJECT_STORAGE_PUBLIC_URL=https://objects.example.com/my-app
```

No AWS account is required. The driver signs S3-compatible requests directly so the same app can run against self-hosted object storage.

## Team Management
Route: `/settings/members`

The scaffold includes member listing, role changes, member removal, invitation creation, cancellation, and invitation acceptance. The default UI copies an invite link. Hook it to your transactional email provider when you are ready to send invites automatically.

Plan seat limits are enforced through the centralized billing policy service with the `platform.members` feature. Custom tenant roles are supported in `/settings/roles` through the `platform.custom-roles` entitlement. Super-admin platform roles remain fixed by design.

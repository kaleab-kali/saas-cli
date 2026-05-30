# Architecture

This template is a SaaS skeleton, not a finished business application.

## Backend

- `apps/api/src/modules/auth` handles tenant authentication and RBAC.
- `apps/api/src/modules/admin` handles platform administration.
- `apps/api/src/modules/billing` handles plans, subscriptions, invoices, and payments.
- `apps/api/src/modules/notification` handles notification delivery and preferences.
- `apps/api/src/modules/reporting` handles saved reports and scheduled exports.
- `apps/api/src/shared` holds cross-cutting infrastructure.

## Frontend

- `apps/web/src/routes` defines app and admin routes.
- `apps/web/src/features` contains feature API hooks and feature components.
- `apps/web/src/shared` contains reusable app infrastructure.

## Tenant Isolation

Tenant-owned models should include `organizationId`, and service/query code should scope reads and writes to the current organization.

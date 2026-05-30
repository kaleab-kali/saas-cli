# Scaffold Audit

Current audit status for the `create-vyllion-saas` template.

## Done

- Domain-specific legacy backend modules removed.
- Product-specific billing fields and currency assumptions replaced with generic minor-unit/currency fields.
- Hidden scaffold files and workflows scanned for stale legacy domain references.
- API keys use the neutral `sk_` prefix.
- CLI supports `doctor`, `add module <name>`, `add starter <pack>`, `--install`, `--db-push`, `--seed`, and `--bootstrap`.
- Module generator scaffolds repository-pattern API modules with domain entity, abstract repository, Prisma repository placeholder, mapper, command/query handlers, controller, DTO, handler spec, web feature files, routes, permissions, and sidebar navigation.
- Starter packs are available for CRM, marketplace, project management, AI SaaS, booking, and helpdesk.
- CLI ignores local-only artifacts when copying the template: `.env`, build output, `.turbo`, `.tanstack`, reports, coverage, and test temp directories.
- Generated project dependencies are exact-pinned in all package manifests.
- Root test scripts cover API unit, property tests, acceptance/Gherkin tests, API HTTP tests, Bruno collections, OpenAPI contract linting, web E2E, AI eval, k6 load/performance, security tooling, and mutation testing.
- Black-box test scaffolds are app-owned: `apps/api-tests`, `apps/e2e`, `apps/acceptance`, `apps/performance`, `apps/security`, and `apps/ai-eval`.
- API unit, property, and mutation tests stay inside `apps/api`.
- Playwright scaffold exists for desktop and mobile browser smoke tests.
- Playwright API test scaffold exists under `apps/api-tests`.
- Bruno API collection scaffold exists under `apps/api-tests`.
- Spectral OpenAPI contract linting scaffold exists under `apps/api-tests`.
- AI eval scaffold exists and skips intentionally without `AI_TEST_ENDPOINT`.
- k6 load/performance scaffold exists with p95 and error-rate thresholds and skips intentionally when k6 is not installed.
- Cucumber/Gherkin acceptance scaffold exists under `apps/acceptance` and skips by default until pointed at a local API.
- Security scaffold exists with gitleaks, pnpm audit/osv-scanner, semgrep, nuclei, and API security smoke wrappers. Missing external CLIs are allowed locally unless `SECURITY_STRICT_TOOLS=1`.
- fast-check property tests cover billing value objects and plan-limit policy behavior.
- Stryker mutation testing is installed and configured for centralized policy enforcement with an 80% break threshold.
- Centralized billing policy enforcement is available through `PolicyService`, `@RequireFeature`, `@RequireUsageLimit`, and tenant capability APIs.
- UI feature gates and sidebar filtering use `/billing/capabilities`.
- Admin tenant detail includes subscription, usage, API key, report, notification, and audit counts.
- Admin server dashboard includes runtime, DB health, dependency flags, storage mode, host/process memory, HTTP metrics, and platform resource counts.
- Prometheus-format metrics are exposed at `/api/v1/metrics` with optional `METRICS_TOKEN` protection.
- Billing includes a tenant-facing Stripe customer portal deep link when a Stripe customer exists.
- API key rate limiting enforces explicit per-key limits and falls back to the plan entitlement `platform.api-requests-per-minute`.
- Upload scaffold includes tenant file metadata, a local filesystem flow, and optional self-hosted S3-compatible object storage configuration for MinIO/Garage/SeaweedFS style services.
- Team management includes members, invitations, role changes, cancellation, removal, and invitation acceptance endpoints plus a settings UI.
- Admin jobs dashboard shows scheduled job history and configured BullMQ queue counts when Redis is configured.
- GitHub workflows are genericized and no longer contain legacy deployment names.
- Local container orchestration and built-in local mail preview tooling were intentionally not added.

## Tested

- CLI help output includes `add starter <pack>` and all starter-pack names.
- CLI rejects unknown starter packs with a clear available-pack list.
- Fresh scaffold generated into `C:\tmp\vyllion-final-20260525150311`.
- CRM starter pack generated `accounts`, `contacts`, `deals`, and `activities` into the fresh project.
- Generated project install with `pnpm install --frozen-lockfile`.
- Generated project `pnpm run doctor`.
- Generated project Prisma client generation with `pnpm db:generate`.
- Generated project API and web TypeScript checks with `pnpm typecheck`.
- Generated project full smoke suite with `pnpm test:smoke`.
- Generated project production build with `pnpm build`.
- Generated project focused Stryker mutation run with `pnpm test:mutation`.
- Generated project dependency security audit with `pnpm test:security:deps`.
- API unit tests and generated starter-pack handler specs.
- fast-check property tests.
- Playwright API mock tests: 3 passed, 1 intentionally skipped authenticated scenario.
- Bruno mock collection.
- Spectral OpenAPI contract lint.
- Live OpenAPI contract lint against Swagger JSON exposed one ambiguous lookup route and the scaffold was updated to use `/lookups/items/{id}` for item updates/deletes.
- Acceptance test skip behavior without `ACCEPTANCE_BASE_URL`.
- k6 skip behavior when k6 is not installed.
- Security tooling smoke behavior when external tools are not installed.
- AI eval skip behavior without `AI_TEST_ENDPOINT`.
- Focused Jest open-handle diagnostic run with `--detectOpenHandles --runInBand`.
- Exact dependency-version assertion across package manifests.
- Hidden stale-domain scan for legacy product-specific tokens.

## Known Warnings

- Web production build succeeds but Vite warns that the main JS chunk is larger than 500 kB. Add route-level lazy loading/manual chunks when the app surface stabilizes.
- `pnpm test:security:deps` passes at the configured high-severity gate, but current transitive dependencies still report low/moderate advisories.
- Stryker reports a 100% mutation score on the configured policy target, with mutants killed by timeout. The gate is active, but should be tuned for speed and clearer kill reasons as more business rules are added.

## Still Requires Live Services

- Full browser E2E run with API and web servers running.
- Real authenticated tenant acceptance scenarios with `ACCEPTANCE_BASE_URL` and `ACCEPTANCE_SESSION_COOKIE`.
- Real API security smoke scenarios with `SECURITY_API_BASE_URL`.
- Strict k6 run after installing the k6 CLI.
- Strict security run after installing gitleaks, osv-scanner, semgrep, and nuclei.
- Real payment-provider integration tests against Stripe/Chapa sandbox credentials.
- Real production deploy test to a VPS.
- Real Redis-backed BullMQ dashboard check with `REDIS_URL` and `BULLMQ_QUEUES`.
- Real transactional email delivery for team invitations. The scaffold creates/copies invitation links and leaves email provider delivery to the app.

## Excluded By Request

- Local container orchestration for Postgres/Redis/mail.
- Built-in local mail preview setup.

# Testing Guide

This scaffold separates major test types into workspace apps so teams can own each layer cleanly.

## Install After Scaffolding

Node-based test tools are installed by `pnpm install`:

- `@playwright/test` in `apps/e2e` and `apps/api-tests`
- `@usebruno/cli` in `apps/api-tests`
- `@stoplight/spectral-cli` in `apps/api-tests`
- `@cucumber/cucumber` in `apps/acceptance`
- `fast-check` and Stryker in `apps/api`

Free external CLIs are optional and intentionally not installed as Node dependencies:

- k6: https://grafana.com/docs/k6/latest/set-up/install-k6/
- gitleaks: https://github.com/gitleaks/gitleaks
- osv-scanner: https://google.github.io/osv-scanner/
- semgrep: https://semgrep.dev/docs/getting-started/
- nuclei: https://docs.projectdiscovery.io/tools/nuclei/install

External CLI wrappers are optional for local development. Security wrappers skip missing external scanners unless strict mode is enabled; the mock performance gate runs a built-in HTTP load smoke when k6 is missing. Use strict mode in CI when you want external tools to be mandatory:

```bash
SECURITY_STRICT_TOOLS=1 pnpm test:security
PERFORMANCE_STRICT_TOOLS=1 pnpm test:load:k6:mock
```

## Test App Layout

- `apps/api`: Nest tests, property tests, mutation testing
- `apps/api-tests`: HTTP API tests, Bruno collections, OpenAPI contract linting
- `apps/e2e`: Playwright browser E2E tests
- `apps/acceptance`: Cucumber/Gherkin acceptance specs
- `apps/performance`: k6 load/performance scripts
- `apps/security`: free local security checks
- `apps/ai-eval`: optional endpoint-based AI eval cases

## Core Local Checks

```bash
pnpm db:generate
pnpm typecheck
pnpm lint
pnpm test:unit
pnpm test:integration
pnpm test:smoke
pnpm test:all
pnpm test:full
pnpm deploy:check
```

`test:unit` is the fast white-box API unit suite and should be the default command while editing backend logic.

`test:integration` runs the API e2e harness, the deterministic mock HTTP API suite, and the OpenAPI smoke contract so integration tooling works before a developer has a database-backed app running.

`test:smoke` validates the scaffold without requiring Postgres, Redis, k6, nuclei, or a running SaaS server. It includes deterministic source/API security checks that run against the checked-out code, local mock API coverage, and browser smoke coverage for the visible tenant/admin onboarding UI.

`test:all` is the full local quality gate. It adds lint, mutation testing, browser smoke, mock HTTP/Bruno API checks, performance, security, acceptance, and AI eval harnesses while still avoiding a required deployed environment.

`test:full` is an explicit alias for `test:all` so teams can wire nightly jobs to the plan's "full" test category without remembering scaffold-specific naming.

`deploy:check` is the pre-release gate. It runs Prisma generation, production doctor checks, CI lint/type checks, API and web production builds, then the broad smoke suite. That means deploy readiness includes mock HTTP and Bruno API checks, browser smoke, acceptance, deterministic source/API security checks, security tooling smoke tests, AI eval harnesses, and the mock k6 load check.

The generated GitHub workflows enforce these checks:

- `.github/workflows/code-quality.yml` runs lint, type checks, API unit tests, installs Playwright Chromium for the production gate, then runs `pnpm deploy:check` without forcing `NODE_ENV=test`, so the web build uses production defaults.
- `.github/workflows/playwright.yml` runs browser E2E on pushes and pull requests to `main`.

## API Unit And Integration Tests

White-box API tests live inside `apps/api`.

```bash
pnpm test:api
pnpm test:unit
pnpm test:coverage
pnpm test:property
pnpm test:mutation
```

Use these for domain logic, billing rules, entitlement enforcement, and Nest service/controller tests.

Generated modules and starter-pack modules include a starter handler spec under each module's `application/commands` folder. Keep those tests close to the module and add deeper unit/property/mutation coverage for business rules as the module becomes real.

`pnpm test:coverage` excludes generated Prisma code, DTOs, Nest modules, entity shape files, presentation controllers, and mapper boilerplate so the report stays focused on executable business logic. It enforces a low global scaffold baseline plus strict per-file thresholds for currently covered critical logic: billing policy decisions, tenant-scoped throttling, and encryption.

`pnpm test:mutation` runs Stryker against the current high-signal billing policy target and writes the HTML report under `apps/api/reports/mutation/`. The Stryker test runner uses explicit Node heap headroom so the command can run as a reliable nightly/full gate instead of restarting under memory pressure on fresh scaffolds.

## HTTP API Tests

Black-box API tests live in `apps/api-tests`.

```bash
API_BASE_URL=http://127.0.0.1:3000 pnpm test:api:http
```

The mock command validates the Playwright API test toolchain:

```bash
pnpm test:api:http:mock
```

The mock HTTP suite includes a tenant-isolation smoke test. It verifies that tenant-scoped endpoints reject writes that try to name a different `organizationId` and that switching the active test organization returns only that tenant's settings and members.

Authenticated capability checks can use a real session cookie:

```bash
API_BASE_URL=http://127.0.0.1:3000 \
API_TEST_SESSION_COOKIE="better-auth.session_token=..." \
pnpm test:api:http
```

## Bruno API Collections

Bruno collections are Git-tracked API examples and smoke checks under `apps/api-tests/bruno`.

```bash
BRUNO_BASE_URL=http://127.0.0.1:3000 pnpm test:api:bruno
pnpm test:api:bruno:mock
```

Use Bruno for manual API exploration, team handoff, and simple repeatable request collections. Use Playwright API tests for deeper dynamic assertions.

## OpenAPI Contract Checks

Spectral lints the OpenAPI contract.

```bash
pnpm test:api:contract
OPENAPI_SPEC=http://127.0.0.1:3000/api/docs-json pnpm test:api:contract
```

The default target is `apps/api-tests/openapi/openapi-smoke.yaml`, so the contract toolchain can run even before your API is started.

## Browser E2E

Playwright browser tests live in `apps/e2e/tests`.

```bash
pnpm test:e2e
pnpm test:e2e:smoke
```

Use browser E2E for user-visible workflows: login, tenant switching, plan upgrade flows, upload UI, member invitations, and admin screens.

The default smoke spec covers the public shell, admin login reachability, the mocked tenant launch console with command palette, and the mocked admin concierge onboarding table on desktop and mobile. Keep this suite focused on first-screen regressions that would make a fresh scaffold feel broken.

## Acceptance Tests

Acceptance tests use Cucumber/Gherkin under `apps/acceptance`.

```bash
pnpm test:acceptance
pnpm test:acceptance:dry
```

Without `ACCEPTANCE_BASE_URL`, the runner starts a local deterministic API mock so Cucumber scenarios execute in a fresh scaffold. Set `ACCEPTANCE_BASE_URL` to point the same scenarios at a running API.

```bash
ACCEPTANCE_BASE_URL=http://127.0.0.1:3000 \
ACCEPTANCE_SESSION_COOKIE="better-auth.session_token=..." \
pnpm test:acceptance
```

## k6 Load And Performance

k6 scripts live under `apps/performance/k6`.

```bash
K6_TARGET=http://127.0.0.1:3000/health pnpm test:load:k6
K6_API_BASE_URL=http://127.0.0.1:3000 pnpm test:load:k6:api
pnpm test:load:k6:mock
```

Useful knobs:

- `K6_VUS`, default `10` for health checks and `1` for tenant API checks
- `K6_DURATION`, default `30s`
- `K6_RAMP_UP`, `K6_STEADY`, and `K6_RAMP_DOWN`, optional tenant API stage durations
- `K6_P95_MS`, default `750`
- `K6_MAX_ERROR_RATE`, default `0.01`
- `K6_SESSION_COOKIE`, optional authenticated session cookie
- `PERFORMANCE_BUILTIN_REQUESTS`, default `40` when k6 is not installed
- `PERFORMANCE_BUILTIN_CONCURRENCY`, default `8` when k6 is not installed

The tenant API load test starts as a low-volume authenticated smoke load so it does not accidentally fail on the scaffold's default rate limit. Raise `K6_VUS` when you intentionally want to test throttling or higher traffic.

`test:load:k6:mock` always exercises a performance gate. With k6 installed it runs `k6/health.js`; without k6 it starts a local mock `/health` endpoint and checks request failures plus p95 latency against `K6_MAX_ERROR_RATE` and `K6_P95_MS`.

## Security Tests

Security tests live in `apps/security`.

```bash
pnpm test:security:secrets
pnpm test:security:deps
pnpm test:security:sast
pnpm test:security:http
pnpm test:security:api
pnpm test:security:source
pnpm test:security
```

Security layers:

- `test:security:secrets`: gitleaks secret scanning
- `test:security:deps`: `pnpm audit` plus optional osv-scanner
- `test:security:sast`: semgrep with local rules
- `test:security:http`: deterministic exposed-file HTTP scan; add nuclei with `SECURITY_RUN_NUCLEI=1`
- `test:security:api`: deterministic auth/RBAC/API smoke checks
- `test:security:source`: source hardening checks for Helmet, validation, CORS, Swagger exposure, unsafe Prisma, direct Axios imports, and fetch-in-effect drift

Runtime examples:

```bash
NUCLEI_TARGET=http://127.0.0.1:3000 pnpm test:security:http
SECURITY_RUN_NUCLEI=1 NUCLEI_TARGET=http://127.0.0.1:3000 pnpm test:security:http
SECURITY_API_BASE_URL=http://127.0.0.1:3000 pnpm test:security:api
```

The built-in HTTP scan is deterministic for fresh scaffolds. Nuclei adds external template coverage when explicitly enabled or when `SECURITY_STRICT_TOOLS=1` is set. It does not understand business rules like tenant isolation; keep those as Playwright API/security tests.

## AI Eval Scaffold

AI evals are optional and skip unless `AI_TEST_ENDPOINT` is set.
AI evals use a deterministic local harness when `AI_TEST_ENDPOINT` is not set, so the test type still executes in local and CI scaffold checks.

```bash
pnpm test:ai
AI_TEST_ENDPOINT=http://127.0.0.1:3000/api/ai/test pnpm test:ai
```

Cases live in `apps/ai-eval/cases.json`.

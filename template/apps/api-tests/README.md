# API Tests

This app owns black-box HTTP API testing for the generated SaaS.

- Playwright API tests live in `tests`.
- Bruno collections live in `bruno`.
- OpenAPI/Spectral checks live in `openapi` and `.spectral.yaml`.

Commands:

```bash
pnpm --filter api-tests test:http
pnpm --filter api-tests test:bruno
pnpm --filter api-tests test:contract
```

Set `API_BASE_URL` or `BRUNO_BASE_URL` to test a running API.
When no API URL is set, `test:bruno` starts the local deterministic mock API and runs the collection against it instead of skipping.

```bash
API_BASE_URL=http://127.0.0.1:3000 pnpm --filter api-tests test:http
BRUNO_BASE_URL=http://127.0.0.1:3000 pnpm --filter api-tests test:bruno
OPENAPI_SPEC=http://127.0.0.1:3000/api/docs-json pnpm --filter api-tests test:contract
```

Authenticated API tests can either use a ready cookie or create an active tenant session from the seeded owner:

```bash
API_BASE_URL=http://127.0.0.1:3000 \
API_TEST_EMAIL=owner@example.com \
API_TEST_PASSWORD='OwnerPass123!' \
API_TEST_ORG_SLUG=acme \
pnpm --filter api-tests test:http
```

Toolchain validation commands start a tiny local mock API:

```bash
pnpm --filter api-tests test:http:mock
pnpm --filter api-tests test:bruno
pnpm --filter api-tests test:bruno:mock
pnpm --filter api-tests test:contract:smoke
```

# E2E Test App

Playwright browser tests for the generated SaaS live here.

```bash
pnpm --filter e2e test
pnpm --filter e2e test:smoke
```

Set `E2E_BASE_URL` to point tests at an already running web app. If it is not set, Playwright starts Vite from `apps/web`. Set `E2E_WEB_PORT` to change the managed dev-server port. Set `E2E_REUSE_EXISTING_SERVER=true` only when you intentionally want to test a server that is already running.

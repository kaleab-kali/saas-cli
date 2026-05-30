# E2E Test App

Playwright browser tests for the generated SaaS live here.

```bash
pnpm --filter e2e test
pnpm --filter e2e test:smoke
```

Set `E2E_BASE_URL` to point tests at an already running web app. If it is not set, Playwright starts `apps/web` through `pnpm --filter web dev`.

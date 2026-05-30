# Acceptance Test App

Cucumber/Gherkin business acceptance specs live here.

```bash
pnpm --filter acceptance test
```

The runner skips unless `ACCEPTANCE_BASE_URL` is set. Authenticated scenarios can use `ACCEPTANCE_SESSION_COOKIE` or create an active tenant session from seeded owner credentials.

```bash
ACCEPTANCE_BASE_URL=http://127.0.0.1:3000 \
ACCEPTANCE_USER_EMAIL=owner@example.com \
ACCEPTANCE_USER_PASSWORD='OwnerPass123!' \
ACCEPTANCE_ORG_SLUG=acme \
pnpm --filter acceptance test
```

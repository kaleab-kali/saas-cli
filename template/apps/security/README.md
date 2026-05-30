# Security Tests

This app owns free, local-first security checks.

The default commands skip missing external tools unless `SECURITY_STRICT_TOOLS=1` is set. This keeps a fresh scaffold usable while still giving CI a strict mode. Runtime HTTP and API security checks run against local deterministic mock targets when no URL is provided.

External tools:

- gitleaks: secret scanning
- osv-scanner: lockfile vulnerability scanning
- semgrep: local SAST rules
- nuclei: lightweight HTTP/security template scanning

Commands:

```bash
pnpm --filter security test:secrets
pnpm --filter security test:deps
pnpm --filter security test:sast
pnpm --filter security test:http
pnpm --filter security test:api
pnpm --filter security test:source
pnpm --filter security test
```

Source hardening check:

```bash
pnpm --filter security test:source
```

This deterministic check inspects the generated API and web source for core hardening drift: Helmet, strict validation, credentialed CORS, development-only Swagger, unsafe Prisma raw SQL, direct Axios imports, and fetch-in-effect patterns that bypass TanStack Query.

Runtime HTTP security scan:

```bash
pnpm --filter security test:http
NUCLEI_TARGET=http://127.0.0.1:3000 pnpm --filter security test:http
SECURITY_RUN_NUCLEI=1 pnpm --filter security test:http
```

`test:http` always runs the deterministic built-in exposure scan. The external nuclei binary is opt-in for local runs via `SECURITY_RUN_NUCLEI=1` and required in `SECURITY_STRICT_TOOLS=1` mode.

Business/API security smoke:

```bash
pnpm --filter security test:api
SECURITY_API_BASE_URL=http://127.0.0.1:3000 pnpm --filter security test:api
```

Strict CI mode:

```bash
SECURITY_STRICT_TOOLS=1 pnpm --filter security test
```

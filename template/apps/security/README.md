# Security Tests

This app owns free, local-first security checks.

The default commands skip missing external tools unless `SECURITY_STRICT_TOOLS=1` is set. This keeps a fresh scaffold usable while still giving CI a strict mode.

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
pnpm --filter security test
```

Runtime HTTP security scan:

```bash
NUCLEI_TARGET=http://127.0.0.1:3000 pnpm --filter security test:http
```

Business/API security smoke:

```bash
SECURITY_API_BASE_URL=http://127.0.0.1:3000 pnpm --filter security test:api
```

Strict CI mode:

```bash
SECURITY_STRICT_TOOLS=1 pnpm --filter security test
```

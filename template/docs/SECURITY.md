# Security Guide

This template assumes every production deployment is multi-tenant and internet-facing. Treat security checks as release blockers, not cleanup tasks.

## Required Secrets

- `BETTER_AUTH_SECRET`: 32-byte hex value generated at scaffold time.
- `MASTER_KEY`: 32-byte hex value generated at scaffold time. Used by `CipherService` for encrypted secrets.

Generate replacement production values with `openssl rand -hex 32` and store them in your deployment secret manager.
- Provider keys such as `STRIPE_SECRET_KEY`, `CHAPA_SECRET_KEY`, object storage keys, SMTP credentials, and webhook secrets must never be committed.

Rotate secrets when a staff member with production env access leaves, when a deployment artifact leaks, or before a compliance audit if rotation history is unclear.

## Deployment Gate

Run this before deploy:

```bash
pnpm deploy:check
```

The gate runs Prisma generation, production doctor checks, lint/type checks, API and web production builds, CI tests, deterministic source/API security checks, security tooling smoke tests, and mock load checks.

## Authentication And Sessions

- Keep cookies `httpOnly`, `secure` in production, and `sameSite=lax`.
- Enforce two-factor authentication for admins and sensitive tenant roles.
- Rotate sessions after password changes, role changes, and impersonation transitions.
- Use the security settings module to expose active session controls to tenants.

## Upload Safety

- Enforce MIME, extension, and file-signature allowlists per upload use case. Configure the allowed set with `UPLOAD_ALLOWED_MIME_TYPES` when a product needs a narrower policy.
- Enforce `UPLOAD_MAX_BYTES` at the API and reverse proxy.
- Store uploads outside the app source tree.
- Prefer object storage with a dedicated public host for production.
- Do not render user-uploaded HTML inline. SVG and HTML uploads are rejected by default, and locally served uploads include `nosniff` plus a restrictive content security policy.

## Tenant Isolation

Every query that reads tenant data must be scoped by `organizationId` or run through a shared tenant-aware repository/service. API tests must include tenant isolation and permission denial cases for new modules.

## Secret Encryption

Use `CipherService` from `#shared/crypto/cipher.service` for API keys, integration credentials, private tokens, and starter-pack secrets. It uses AES-256-GCM with a random IV per value and refuses to start when `MASTER_KEY` is missing or malformed.

Do not add feature-local encryption helpers. Keep ciphertext values opaque to the frontend and redact them from logs, exports, and admin API responses.

## Security Tooling

The generated project includes:

- `apps/security`: security smoke, dependency, Semgrep, gitleaks, deterministic HTTP exposure checks, and opt-in nuclei wrappers.
- `.gitleaks.toml`: committed secret detection.
- `pnpm test:security`: aggregate security checks.
- `pnpm test:security:source`: deterministic source checks for core API/web hardening.
- `pnpm test:security:tooling`: CI-safe tooling smoke.

## Reporting

Set a responsible disclosure address before launch. At minimum document:

- Security contact email.
- Supported scope.
- Expected response time.
- Out-of-scope systems.

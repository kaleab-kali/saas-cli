# create-vyllion-saas

Scaffold a production-ready multi-tenant SaaS in seconds.

**Stack baked in:** NestJS 11 + React 19 + Vite + PostgreSQL 16 + Prisma + Better Auth + BullMQ + Redis + Stripe + Chapa + shadcn/ui + TanStack Query/Router/Table + Turborepo + pnpm workspaces + i18next.

**Infra baked in:**
- 4-role tenant RBAC (`owner`, `admin`, `member`, `viewer`) + custom roles
- 4-role platform super-admin (`superAdmin`, `support`, `billingAdmin`, `readOnly`)
- Impersonation, audit log, broadcasts, cron job monitor
- API keys, feature flags, entitlement overrides
- Gateway-agnostic billing (Stripe + Chapa + manual), invoices in smallest currency unit
- Notifications (in-app + email + bulk + delivery tracking)
- Reporting (saved reports + scheduler — bring your own data sources)
- Custom fields, lookups, saved views (generic infra)
- i18n (English + Amharic seeded)
- Caddy + PM2 deploy + Docker option

---

## Quickstart (local)

### One-time CLI install

```bash
git clone https://github.com/YOUR-ORG/create-vyllion-saas ~/code/create-vyllion-saas
cd ~/code/create-vyllion-saas
pnpm install
cd packages/cli
pnpm link --global
```

Verify:
```bash
which create-vyllion-saas
create-vyllion-saas --help
```

### Scaffold a new project

```bash
cd ~/projects
create-vyllion-saas my-app --yes
```

`--yes` skips all prompts. Remove it to customize.

### Run it

```bash
cd my-app
createdb my_app_dev            # or use pgAdmin
pnpm install
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Open `http://localhost:5173/admin-login`. Credentials are in `my-app/.scaffold-credentials.txt`.

---

## What you get

| Doc | What |
|---|---|
| [docs/TEMPLATE_SPEC.md](./docs/TEMPLATE_SPEC.md) | The locked spec — what the skeleton ships, what's intentionally out |
| [docs/FEATURES.md](./docs/FEATURES.md) | Full feature list (modules, routes, infra) |
| [docs/USAGE.md](./docs/USAGE.md) | CLI flags, prompts, workflows |
| [docs/ADDING_DOMAIN.md](./docs/ADDING_DOMAIN.md) | Build your first business module on the skeleton |
| [docs/BILLING.md](./docs/BILLING.md) | Stripe + Chapa + Manual gateway, lifecycle, dunning |
| [docs/I18N.md](./docs/I18N.md) | Add locales, translation keys |
| [docs/OAUTH.md](./docs/OAUTH.md) | Wire Google, GitHub, Microsoft providers |
| [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) | Production deploy (Caddy + PM2 + Postgres + Redis) |

---

## Repo layout

```
create-vyllion-saas/
├── packages/
│   └── cli/              # The CLI (published to npm as create-vyllion-saas)
│       ├── bin/
│       └── src/
├── template/             # The scaffold source — copied to target dir
│   ├── apps/api/
│   ├── apps/web/
│   └── ...
├── docs/
└── package.json
```

---

## Publishing to npm

```bash
cd packages/cli
npm publish --access public
```

Then anywhere:
```bash
pnpm create vyllion-saas my-app
# or
npx create-vyllion-saas my-app
```

---

## License

MIT

# create-vyllion-saas

Scaffold a production-ready multi-tenant SaaS in seconds.

**Stack baked in:** NestJS 11 + React 19 + Vite + PostgreSQL 16 + Prisma + Better Auth + BullMQ + Redis + Stripe + shadcn/ui + TanStack Query/Router/Table + Turborepo + pnpm workspaces.

**Infra baked in:** RBAC, super admin panel, impersonation, audit log, API keys, billing (Stripe), feature flags, entitlements, notifications, reporting, multi-tenant org model, Caddy + PM2 deploy.

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

See [docs/FEATURES.md](./docs/FEATURES.md) for the full list of modules, routes, and infra.

See [docs/USAGE.md](./docs/USAGE.md) for every CLI flag, prompt, and workflow.

See [docs/STRIPPING_DOMAIN.md](./docs/STRIPPING_DOMAIN.md) for notes on the stubbed services (no manual stripping required — schema is pure infra).

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

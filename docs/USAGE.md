# USAGE.md — create-vyllion-saas CLI

Complete reference for the CLI, every prompt, every flag, every workflow.

---

## Install

### Option A — `pnpm link --global` (recommended for local dev)

One-time:
```bash
git clone https://github.com/YOUR-ORG/create-vyllion-saas ~/code/create-vyllion-saas
cd ~/code/create-vyllion-saas
pnpm install
cd packages/cli
pnpm link --global
```

Verify:
```bash
create-vyllion-saas --help
```

To uninstall:
```bash
cd ~/code/create-vyllion-saas/packages/cli
pnpm unlink --global
```

### Option B — direct node run (no install)

```bash
node ~/code/create-vyllion-saas/packages/cli/bin/index.js my-app
```

### Option C — `npx` from local path

```bash
npx ~/code/create-vyllion-saas my-app
```

### Option D — after publishing to npm

```bash
pnpm create vyllion-saas my-app
# or
npx create-vyllion-saas my-app
```

Publish:
```bash
cd ~/code/create-vyllion-saas/packages/cli
npm publish --access public
```

---

## Commands

```
create-vyllion-saas [project-name] [options]
create-vyllion-saas doctor [--production]
create-vyllion-saas add module <name>
create-vyllion-saas add starter <pack>
create-vyllion-saas remove starter <pack>
create-vyllion-saas list starters
```

### Options

| Flag        | Default | Description |
|-------------|---------|-------------|
| `--yes`, `-y` | `false` | Skip all prompts. Use all defaults. Fastest path. |
| `--install` | `false` | Run `pnpm install` after scaffold. |
| `--db-push` | `false` | Run `pnpm db:push` after scaffold. |
| `--seed` | `false` | Run `pnpm db:seed` after scaffold. |
| `--bootstrap` | `false` | Run install, db push, and seed after scaffold. |
| `--starter <pack>` | none | Install one or more starter packs during scaffold. Repeat the flag or pass a comma-separated list. Unknown packs fail before files are created. |
| `--production`, `--prod` | `false` | Make `doctor` fail on missing production prerequisites. |
| `--help`, `-h` | -     | Show help |

### Positional

- `project-name` — target folder name. Slugified (lowercase, dashes). Also used as the pnpm package name.

---

### Utility commands

`create-vyllion-saas doctor` runs local environment checks from the current project directory:
- Node and pnpm availability
- `package.json`, API/web env files, and generated Prisma client
- `DATABASE_URL`, `BETTER_AUTH_SECRET`, and `MASTER_KEY` presence
- release documentation, scripts, workspaces, and security/performance test scaffolds
- common local ports for Postgres, Redis, API, and web

Use `create-vyllion-saas doctor --production` or `pnpm doctor:production` in CI/release checks. Production mode exits non-zero when required setup is missing.

`create-vyllion-saas add module <name>` scaffolds a neutral business module:
- `apps/api/src/modules/<name>` module, controller, service, and DTO
- `apps/web/src/features/<name>` hooks and list component
- `apps/web/src/routes/_authenticated/<name>/index.tsx`
- `apps/api/src/app.module.ts` registration

`create-vyllion-saas add starter <pack>` expands a domain starter pack into several generated modules. Available packs:
- `crm`
- `marketplace`
- `project-management`
- `ai-saas`
- `booking`
- `helpdesk`
- `eims`

During project creation, `--starter eims,crm` and `--starter eims --starter crm` are equivalent. Starter names are validated before the target directory is created.

`create-vyllion-saas list starters` prints pack metadata, generated modules, env variables, routes, and permissions.

`create-vyllion-saas remove starter <pack>` removes starter packs that support automated uninstall. The EIMS starter supports uninstall because the base template must remain domain-neutral.

---

## Prompts (interactive mode)

Running `create-vyllion-saas` without `--yes` walks you through:

| Prompt | Default | Notes |
|---|---|---|
| Project name | arg or `my-app` | Slugified for folder + package name. |
| Database name | `{slug}_dev` | Postgres db to connect to. |
| Super admin email | `admin@example.com` | Seeded into platform admin table. |
| Super admin password | auto-generated | Blank = CLI generates 20-char strong password. |
| Production domain | `localhost` | Used in Caddy + README hints. Can change later. |

Auto-generated (no prompt):
- `MASTER_KEY` - 32-byte hex, unique per scaffold
- `BETTER_AUTH_SECRET` — 32-byte hex, unique per scaffold
- Super admin password (if blank) — 20 chars, mixed symbol set

---

## What gets written

Target directory gets:

```
my-app/
├── apps/
│   ├── api/                  # NestJS backend (Clean Architecture)
│   │   ├── .env              # generated: DB, auth secret, super admin creds
│   │   ├── .env.example
│   │   ├── prisma/
│   │   └── src/modules/      # infra modules only (see FEATURES.md)
│   └── web/
│       ├── .env              # generated: API_URL, APP_NAME
│       └── src/
│           ├── features/     # auth, admin, billing, settings, roles, etc.
│           └── routes/       # TanStack Router
├── docs/
├── .env.example              # documentation reference
├── .scaffold-credentials.txt # super admin login — DO NOT COMMIT
├── Caddyfile
├── ecosystem.config.cjs
├── package.json
├── pnpm-lock.yaml            # locked versions from the template
└── turbo.json
```

**Important:** `.scaffold-credentials.txt` contains your super admin password in plain text. It is in `.gitignore`. Delete it after saving the password to a password manager.

---

## Token replacement

The CLI rewrites these tokens in every text file:

| Token | Source |
|---|---|
| `{{projectName}}` | Prompt answer (display name) |
| `{{projectSlug}}` | Slugified project name |
| `{{dbName}}` | Prompt answer (db name) |
| `{{authSecret}}` | Auto-generated 32-byte hex |
| `{{masterKey}}` | Auto-generated 32-byte hex |
| `{{superAdminEmail}}` | Prompt answer |
| `{{superAdminPassword}}` | Prompt answer or auto-generated |
| `{{caddyDomain}}` | Prompt answer |

Plus literal replacements:
- `{{projectName}}` -> configured project name
- `{{projectSlug}}` -> generated project slug

---

## End-to-end workflow

```bash
# 1. Scaffold
create-vyllion-saas my-app --yes
cd my-app

# 2. Save credentials, then delete
cat .scaffold-credentials.txt   # copy password to password manager
rm .scaffold-credentials.txt

# 3. Create database (Postgres must be running)
createdb my_app_dev

# 4. Install deps
pnpm install

# 5. Prisma
pnpm db:generate               # generates Prisma client
pnpm db:migrate                # creates schema
pnpm db:seed                   # seeds super admin + sample org

# 6. Run dev servers
pnpm dev                       # API: :3000, Web: :5173

# 7. Login
open http://localhost:5173/admin-login
```

Fast local path:

```bash
create-vyllion-saas my-app --yes --bootstrap
cd my-app
pnpm dev
```

---

## After scaffold — regenerate route tree

TanStack Router has a generated file `apps/web/src/routeTree.gen.ts`. It's copied from the template. On first `pnpm dev`, TanStack will regenerate it automatically from the `routes/` folder. No manual action needed.

If you see stale route errors, run the web build once. The Vite router plugin regenerates the route tree before TypeScript validation:
```bash
pnpm --filter web build
```

---

## Generated project quality commands

```bash
pnpm doctor
pnpm doctor:production
pnpm deploy:check
pnpm typecheck
pnpm test:api
pnpm test:property
pnpm test:e2e
pnpm test:acceptance
pnpm test:ai
pnpm test:load
pnpm test:security
pnpm test:mutation
```

The generated project includes dedicated test apps in `apps/api-tests`, `apps/e2e`, `apps/acceptance`, `apps/performance`, `apps/security`, and `apps/ai-eval`. API unit/property/mutation tests stay in `apps/api`. Details live in `docs/TESTING_GUIDE.md` inside the generated project.

---

## Troubleshooting

### `Target directory already exists`
Pick a different project name or delete the folder.

### `Database connection failed`
- Is Postgres running? `pg_isready`
- Did you `createdb`? The CLI does not create the database.
- Check `apps/api/.env` → `DATABASE_URL`

### `Seed failed: SUPER_ADMIN_EMAIL must be set`
The CLI wrote `apps/api/.env`. Make sure you didn't delete it before running `pnpm db:seed`.

### `Cannot find module '#modules/...'`
Path aliases (`#modules/*`, `#shared/*`) are in `apps/api/package.json` under `imports`. Run `pnpm install` again.

### Stripe errors in billing
Stripe keys are blank by default. Billing endpoints throw when called. Fill `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` in `apps/api/.env` when ready.

---

## Publishing your scaffolded project

```bash
cd my-app
git init
git add -A
git commit -m "chore: initial scaffold"
git remote add origin git@github.com:you/my-app.git
git push -u origin main
```

`.scaffold-credentials.txt` is gitignored — safe.

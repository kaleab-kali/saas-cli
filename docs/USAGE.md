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
```

### Options

| Flag        | Default | Description |
|-------------|---------|-------------|
| `--yes`, `-y` | `false` | Skip all prompts. Use all defaults. Fastest path. |
| `--help`, `-h` | -     | Show help |

### Positional

- `project-name` — target folder name. Slugified (lowercase, dashes). Also used as the pnpm package name.

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
| `{{superAdminEmail}}` | Prompt answer |
| `{{superAdminPassword}}` | Prompt answer or auto-generated |
| `{{caddyDomain}}` | Prompt answer |

Plus literal replacements:
- `PropFlow` → `{{projectName}}`
- `propflow` → `{{projectSlug}}`

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
pnpm db:migrate                # creates schema
pnpm db:seed                   # seeds super admin + sample org

# 6. Run dev servers
pnpm dev                       # API: :3000, Web: :5173

# 7. Login
open http://localhost:5173/admin-login
```

---

## After scaffold — regenerate route tree

TanStack Router has a generated file `apps/web/src/routeTree.gen.ts`. It's copied from the template. On first `pnpm dev`, TanStack will regenerate it automatically from the `routes/` folder. No manual action needed.

If you see stale route errors, force-regen:
```bash
pnpm --filter web exec tsr generate
```

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

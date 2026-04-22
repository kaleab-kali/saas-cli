# create-novek-saas CLI — Features

Location: `pmss/create-novek-saas/` (separate from propflow).

## What It Does

Scaffold full-stack SaaS project in seconds. One command, whole stack ready.

```bash
npx create-novek-saas my-app
```

## Stack It Creates

| Layer | Tech |
|---|---|
| Backend | NestJS 11 + Clean Architecture + Prisma 7 (driver adapter pattern) + PostgreSQL |
| Frontend | React 19 + Vite + TanStack Router/Query/Table/Virtual + shadcn/ui + Tailwind v4 |
| Auth | Better Auth + Organization plugin (multi-tenant RBAC, 7 roles) |
| Logging | Pino + pino-roll (file rotation) + pino-telegram (alerts) |
| Linting | Biome (replaces ESLint + Prettier) |
| Monorepo | pnpm workspaces + Turborepo |
| Hooks | Lefthook pre-commit (biome + typecheck) |
| Deploy | PM2 + Caddy (no Docker) |

## Interactive Prompts

When run, asks:

```
What is your project name?      my-app
Database host?                  localhost
Database port?                  5432
Database user?                  postgres
Database password?              ******
Database name?                  my-app
API port?                       3000
Web port?                       5173
```

All have defaults. Press Enter to accept.

## What Gets Generated

Full monorepo:

```
my-app/
├── apps/
│   ├── api/                    # NestJS backend
│   │   ├── src/
│   │   │   ├── modules/
│   │   │   │   ├── auth/       # Better Auth + RBAC permissions.ts
│   │   │   │   ├── health/     # @nestjs/terminus health check
│   │   │   │   ├── error-reporting/  # Frontend error ingestion
│   │   │   │   ├── property/   # Example Clean Architecture module
│   │   │   │   └── ... 9 more empty module skeletons
│   │   │   └── shared/
│   │   │       ├── database/   # Prisma service w/ query logging
│   │   │       ├── decorators/ # @RequirePermissions, @CurrentUser
│   │   │       ├── filters/    # Global exception filter (Pino)
│   │   │       ├── interceptors/ # Audit interceptor, org context
│   │   │       └── logger/     # Pino module, correlation ID, redact
│   │   └── prisma/
│   │       ├── schema.prisma   # Better Auth tables + Building example
│   │       └── seed.ts
│   └── web/
│       └── src/
│           ├── routes/         # TanStack Router file-based
│           ├── features/       # Per-domain folders
│           ├── shared/
│           │   ├── components/ # ErrorBoundary, QueryErrorBoundary
│           │   └── lib/        # api-client, auth-client, error-reporter
│           └── components/ui/  # 16 shadcn components pre-installed
├── docs/                       # 6 docs: architecture, api conventions, etc
├── CLAUDE.md                   # AI coding instructions
├── biome.json
├── lefthook.yml
├── turbo.json
├── ecosystem.config.cjs        # PM2 config
└── Caddyfile                   # Reverse proxy
```

## Pre-Wired Features

### Backend out of box

- Rate limiting (60 req/min per IP via `@nestjs/throttler`, global)
- Health check at `GET /health` with DB ping
- Structured logging (Pino pretty in dev, JSON in prod)
- File log rotation (pino-roll, daily, 10MB, 14 day retention)
- Telegram error alerts (set `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID`)
- Correlation IDs (`x-correlation-id` header, auto UUID)
- Audit interceptor (logs all POST/PUT/PATCH/DELETE w/ user, org, redacted body)
- Global exception filter (structured errors, stack in dev, clean in prod)
- Compression (gzip)
- Graceful shutdown (SIGTERM/SIGINT)
- Swagger at `/api/docs`
- 7 RBAC roles (owner, admin, propertyManager, leasingAgent, maintenanceStaff, accountant, viewer)
- Multi-tenancy via `organizationId` column pattern

### Frontend out of box

- Error boundary w/ fallback UI, reports to API
- Query error boundary w/ TanStack reset
- Global `window.onerror` + `unhandledrejection` handlers
- Error reporter (debounced 2s, 10/min rate limit, silent failure)
- TanStack Query global QueryCache/MutationCache error handlers
- 16 shadcn components: button, card, table, input, label, select, dialog, dropdown-menu, separator, badge, tabs, sonner, tooltip, skeleton, sheet, sidebar

### DX

- `#` import aliases everywhere (`#modules/*`, `#shared/*`, `#features/*`, `#routes/*`)
- Biome config matching PropFlow (tabs, double quotes, custom rules)
- Lefthook pre-commit (Biome check + TypeScript typecheck)
- Turborepo parallel dev + build

## How It Works Technically

- Template dir: `create-novek-saas/template/` — full PropFlow stack copy
- Placeholder vars: `{{PROJECT_NAME}}`, `{{DATABASE_URL}}`, `{{API_PORT}}`, `{{WEB_PORT}}`, `{{DB_HOST}}`, `{{DB_PORT}}`, `{{DB_USER}}`, `{{DB_PASSWORD}}`, `{{DB_NAME}}`
- On run: prompts user, copies template dir recursively, replaces placeholders in text files only (skips binary), writes to target dir
- Excludes from copy: `node_modules`, `dist`, `.turbo`, `.git`, `generated`, `*.log`, `coverage`

## Usage Variations

```bash
# npm
npx create-novek-saas my-app

# pnpm
pnpm dlx create-novek-saas my-app

# yarn
yarn dlx create-novek-saas my-app

# without name (prompts)
npx create-novek-saas

# local dev (before publish)
cd create-novek-saas
pnpm build
node dist/index.js my-app

# global link
pnpm link --global
create-novek-saas my-app
```

## Post-Scaffold Commands

```bash
cd my-app
pnpm install
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
pnpm db:generate
pnpm db:push
pnpm dev
```

Opens API at `:3000`, Web at `:5173`, Swagger at `:3000/api/docs`, Health at `:3000/health`.

## Source Code Structure

```
create-novek-saas/
├── src/
│   ├── index.ts            # CLI entry (#!/usr/bin/env node), @clack/prompts
│   ├── prompts.ts          # Interactive prompt definitions
│   └── create-project.ts   # Template copy + variable replacement logic
├── template/               # Full PropFlow stack with placeholders
├── package.json            # "bin": "create-novek-saas" maps to dist/index.js
├── tsconfig.json           # ES2022 module, bundler resolution
└── README.md               # Full usage docs
```

Deps used: `@clack/prompts` (interactive UI), `picocolors` (output colors), `fs-extra` (file ops).

## Context Dump for Other Claude Session

```
Project: create-novek-saas CLI at C:\Users\kali\Desktop\novek\saas\pmss\create-novek-saas

Type: npm package, "bin" field maps to dist/index.js, runnable via npx create-novek-saas <name>

Source: TypeScript ESM, compiled to dist/ via tsc. Uses @clack/prompts for interactive CLI, fs-extra for file ops, picocolors for output.

Template: ./template/ dir — exact clone of PropFlow stack (NestJS 11 + React 19 + Prisma 7 + Better Auth + Pino + shadcn + Biome + Lefthook + pnpm + Turborepo).

Placeholders: {{PROJECT_NAME}}, {{DATABASE_URL}}, {{API_PORT}}, {{WEB_PORT}}, {{DB_HOST}}, {{DB_PORT}}, {{DB_USER}}, {{DB_PASSWORD}}, {{DB_NAME}} — replaced during copy.

Build: pnpm build (tsc)
Test locally: node dist/index.js test-project
Publish: npm publish (prepublishOnly hook runs build)

Not yet published to npm. Local dev only.
```

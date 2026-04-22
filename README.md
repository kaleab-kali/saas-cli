# create-novek-saas

Scaffold a production-ready full-stack SaaS project in seconds.

## Stack

| Layer | Technology |
|-------|-----------|
| Backend | NestJS 11, Clean Architecture, Prisma 7, PostgreSQL |
| Frontend | React 19, Vite, TanStack Router + Query + Table, shadcn/ui, Tailwind CSS v4 |
| Auth | Better Auth with Organization plugin (multi-tenancy, RBAC) |
| Logging | Pino (structured JSON, file rotation, Telegram alerts) |
| Linting | Biome (replaces ESLint + Prettier) |
| Monorepo | pnpm workspaces + Turborepo |
| Deployment | PM2 + Caddy (no Docker) |

---

## Usage

### From npm (after publishing)

```bash
# Using npx
npx create-novek-saas my-app

# Using pnpm
pnpm dlx create-novek-saas my-app

# Using yarn
yarn dlx create-novek-saas my-app

# Without a project name (CLI will prompt you)
npx create-novek-saas
```

### Local Development (without publishing)

If you cloned this repo and want to use it locally:

```bash
# 1. Clone and enter the CLI repo
cd create-novek-saas

# 2. Install dependencies
pnpm install

# 3. Build the CLI
pnpm build

# 4. Option A: Run directly with node
node dist/index.js my-app

# 5. Option B: Run with a project name argument
node dist/index.js my-app

# 6. Option C: Run without a name (CLI will prompt)
node dist/index.js

# 7. Option D: Link globally so you can use it like a real CLI
pnpm link --global
create-novek-saas my-app

# 8. Option E: Use pnpm dlx from the local build
pnpm dlx ./create-novek-saas my-app
```

### Unlink Global (if you used Option D)

```bash
pnpm unlink --global create-novek-saas
```

---

## CLI Prompts

When you run the CLI, it will ask:

```
  create-novek-saas

  Scaffold a full-stack SaaS project
  NestJS + React + Prisma + Better Auth + Pino + shadcn/ui

  What is your project name?  my-app
  Database host?              localhost
  Database port?              5432
  Database user?              postgres
  Database password?          ********
  Database name?              my-app
  API port?                   3000
  Web port?                   5173
```

All prompts have sensible defaults. Press Enter to accept the default.

---

## After Scaffolding

### 1. Enter the project

```bash
cd my-app
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Set up environment files

The CLI creates `.env.example` files with your values pre-filled. Copy them:

```bash
# Copy API env
cp apps/api/.env.example apps/api/.env

# Copy Web env
cp apps/web/.env.example apps/web/.env
```

Or create them manually if you need different values:

```bash
# API
cat > apps/api/.env << 'EOF'
NODE_ENV=development
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/my-app
REDIS_URL=redis://localhost:6379
BETTER_AUTH_SECRET=generate-with-openssl-rand-base64-32
BETTER_AUTH_URL=http://localhost:3000
FRONTEND_URL=http://localhost:5173
API_PORT=3000
API_HOST=0.0.0.0
LOG_LEVEL=debug
SLOW_QUERY_THRESHOLD_MS=200
EOF

# Web
cat > apps/web/.env << 'EOF'
VITE_API_URL=http://localhost:3000
VITE_APP_NAME=my-app
EOF
```

### 4. Set up the database

Make sure PostgreSQL is running, then:

```bash
# Generate Prisma client (creates TypeScript types)
pnpm db:generate

# Push schema to database (creates all tables)
pnpm db:push

# Or use migrations (recommended for production)
pnpm db:migrate
```

### 5. Start development

```bash
# Start both API + Web in parallel
pnpm dev

# Or start them individually
pnpm dev:api    # API only (port 3000)
pnpm dev:web    # Web only (port 5173)
```

### 6. Verify everything works

| Check | URL | Expected |
|-------|-----|----------|
| API running | http://localhost:3000/health | `{"status":"ok","info":{"database":{"status":"up"}}}` |
| Swagger docs | http://localhost:3000/api/docs | Swagger UI with endpoints |
| Web app | http://localhost:5173 | "Welcome to PropFlow" page |
| Auth endpoints | http://localhost:3000/api/auth | Better Auth routes |

---

## Project Structure

```
my-app/
├── apps/
│   ├── api/                            # NestJS backend
│   │   ├── src/
│   │   │   ├── modules/
│   │   │   │   ├── auth/               # Better Auth + RBAC permissions
│   │   │   │   ├── health/             # Health check endpoint
│   │   │   │   ├── error-reporting/    # Frontend error ingestion
│   │   │   │   ├── property/           # Example module (Clean Architecture)
│   │   │   │   ├── lease/
│   │   │   │   ├── maintenance/
│   │   │   │   ├── crm/
│   │   │   │   ├── sales/
│   │   │   │   ├── procurement/
│   │   │   │   ├── finance/
│   │   │   │   ├── notification/
│   │   │   │   └── reporting/
│   │   │   ├── shared/
│   │   │   │   ├── database/           # Prisma service (with query logging)
│   │   │   │   ├── decorators/         # @RequirePermissions, @CurrentUser
│   │   │   │   ├── filters/            # Global exception filter (Pino)
│   │   │   │   ├── interceptors/       # Audit interceptor, org context
│   │   │   │   ├── logger/             # Pino module, correlation ID, redact util
│   │   │   │   └── types/              # Shared TypeScript interfaces
│   │   │   ├── generated/prisma/       # Prisma 7 generated client (.ts files)
│   │   │   ├── app.module.ts
│   │   │   └── main.ts
│   │   ├── prisma/
│   │   │   ├── schema.prisma           # Database schema
│   │   │   └── seed.ts                 # Database seeder
│   │   └── logs/                       # Pino log files (rotated)
│   └── web/                            # React frontend
│       ├── src/
│       │   ├── routes/                 # TanStack Router (file-based)
│       │   ├── features/               # Business logic per domain
│       │   ├── shared/
│       │   │   ├── components/         # ErrorBoundary, QueryErrorBoundary
│       │   │   ├── hooks/
│       │   │   └── lib/                # API client, auth client, error reporter
│       │   └── components/ui/          # shadcn/ui (auto-managed)
│       └── vite.config.ts
├── docs/                               # Architecture, conventions, guides
│   ├── ARCHITECTURE.md                 # Full feature map and domain model
│   ├── CODING_STANDARDS.md             # Code patterns and rules
│   ├── MODULE_GUIDE.md                 # How to create a new backend module
│   ├── API_CONVENTIONS.md              # Endpoint patterns, response format
│   ├── FRONTEND_CONVENTIONS.md         # React + TanStack patterns
│   ├── DATABASE_GUIDE.md               # Prisma schema rules
│   └── PERMISSIONS_GUIDE.md            # RBAC system and roles
├── CLAUDE.md                           # AI coding instructions
├── biome.json                          # Biome linter + formatter config
├── lefthook.yml                        # Pre-commit hooks (biome + typecheck)
├── turbo.json                          # Turborepo task config
├── pnpm-workspace.yaml                 # pnpm workspace definition
├── ecosystem.config.cjs                # PM2 production config
├── Caddyfile                           # Caddy reverse proxy (production)
├── .env.example                        # All env vars reference (documentation)
├── .env.production.example             # Production env template
├── .gitignore
└── .nvmrc                              # Node version (20)
```

---

## All Commands Reference

### Development

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start both API and Web servers in parallel via Turborepo |
| `pnpm dev:api` | Start only the NestJS API server (port 3000) |
| `pnpm dev:web` | Start only the Vite dev server (port 5173) |

### Building

| Command | Description |
|---------|-------------|
| `pnpm build` | Build all apps for production via Turborepo |
| `pnpm build:api` | Build only the NestJS API |
| `pnpm build:web` | Build only the Vite frontend |

### Linting & Formatting

| Command | Description |
|---------|-------------|
| `pnpm lint` | Run Biome check on all files |
| `pnpm lint:fix` | Auto-fix all Biome issues |

### Database

| Command | Description |
|---------|-------------|
| `pnpm db:generate` | Generate Prisma client TypeScript types |
| `pnpm db:migrate` | Create and apply a new migration |
| `pnpm db:push` | Push schema directly to database (no migration file) |
| `pnpm db:studio` | Open Prisma Studio GUI in browser |
| `pnpm db:seed` | Run the database seed script |

### Production (PM2)

| Command | Description |
|---------|-------------|
| `pnpm pm2:start` | Start the API with PM2 |
| `pnpm pm2:stop` | Stop the PM2 process |
| `pnpm pm2:restart` | Restart the PM2 process |
| `pnpm pm2:logs` | View PM2 logs |

### API-specific (run from `apps/api/`)

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start NestJS in watch mode |
| `pnpm build` | Build NestJS for production |
| `pnpm start` | Start built NestJS (production) |
| `pnpm start:prod` | Alias for `pnpm start` |
| `pnpm test` | Run Jest unit tests |
| `pnpm test:e2e` | Run Jest end-to-end tests |
| `pnpm lint` | Run Biome check |
| `pnpm lint:fix` | Auto-fix Biome issues |
| `pnpm db:generate` | Generate Prisma client |
| `pnpm db:migrate` | Run Prisma migrations |
| `pnpm db:push` | Push Prisma schema |
| `pnpm db:studio` | Open Prisma Studio |
| `pnpm db:seed` | Seed the database |

### Web-specific (run from `apps/web/`)

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start Vite dev server |
| `pnpm build` | Build for production (tsc + vite build) |
| `pnpm preview` | Preview production build locally |
| `pnpm typecheck` | Run TypeScript type checking |

---

## What's Included

### Backend Features

- **Rate limiting** - 60 requests/min per IP via `@nestjs/throttler`
- **Health check** - `GET /health` with database ping via `@nestjs/terminus`
- **Structured logging** - Pino with pretty dev output, JSON production output
- **File log rotation** - via `pino-roll` (daily rotation, 10MB max, 14 day retention)
- **Telegram alerts** - error-level logs sent to Telegram bot (optional, set env vars)
- **Correlation IDs** - `x-correlation-id` header auto-generated on every request/response
- **Audit trail** - auto-logs all mutations (POST/PUT/PATCH/DELETE) with user, org, resource
- **Global exception filter** - structured error responses, stack traces in dev, clean in prod
- **Compression** - gzip response compression via `compression` middleware
- **Graceful shutdown** - clean database disconnect on SIGTERM/SIGINT
- **Swagger** - auto-generated API docs at `/api/docs` (dev only)
- **RBAC** - 7 roles (owner, admin, propertyManager, leasingAgent, maintenanceStaff, accountant, viewer)
- **Multi-tenancy** - every business table scoped by `organizationId`
- **Sensitive field redaction** - passwords, tokens, secrets auto-stripped from logs

### Frontend Features

- **Error boundary** - catches React rendering errors, shows fallback UI, reports to API
- **Query error boundary** - TanStack Query specific with retry button
- **Global error handlers** - `window.onerror` + `unhandledrejection` listeners
- **Error reporter** - batched (2s debounce), rate-limited (10/min), silent failures
- **TanStack Query** - with global QueryCache/MutationCache error handling
- **File-based routing** - TanStack Router auto-generates route tree from `src/routes/`
- **shadcn/ui** - 16 components pre-installed (button, card, table, input, label, select, dialog, dropdown-menu, separator, badge, tabs, sonner, tooltip, skeleton, sheet, sidebar)
- **API client** - typed fetch wrapper at `#shared/lib/api-client`
- **Auth client** - Better Auth React hooks at `#shared/lib/auth-client`

### Developer Experience

- **Biome** - linter + formatter in one tool (replaces ESLint + Prettier)
- **Lefthook** - pre-commit hooks auto-run biome check + TypeScript typecheck
- **Turborepo** - parallel builds and dev servers with caching
- **`#` import aliases** - no relative paths (`#modules/*`, `#shared/*`, `#features/*`)
- **Hot reload** - both API (NestJS watch) and Web (Vite HMR) auto-reload on save

---

## Import Aliases

### Backend (`apps/api`)

```typescript
// Module imports
import { AuthModule } from "#modules/auth/auth.module";
import { PropertyModule } from "#modules/property/property.module";

// Shared imports
import { PrismaService } from "#shared/database/prisma.service";
import { RequirePermissions } from "#shared/decorators/permissions.decorator";
import { CurrentUser } from "#shared/decorators/current-user.decorator";
import { GlobalExceptionFilter } from "#shared/filters/global-exception.filter";
import { AuditInterceptor } from "#shared/interceptors/audit.interceptor";
import { LoggerModule } from "#shared/logger/logger.module";

// Prisma generated (exception: uses relative import)
import { PrismaClient } from "../../generated/prisma/client";
```

### Frontend (`apps/web`)

```typescript
// Shared imports
import { api } from "#shared/lib/api-client";
import { useSession, signIn, signOut } from "#shared/lib/auth-client";
import { reportError } from "#shared/lib/error-reporter";
import { AppErrorBoundary } from "#shared/components/ErrorBoundary";
import { QueryErrorBoundary } from "#shared/components/QueryErrorBoundary";

// Feature imports (as you build features)
import { useProperties } from "#features/properties/api/property-queries";
import { PropertyList } from "#features/properties/components/PropertyList";

// shadcn components (keep @ alias)
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
```

---

## Environment Variables

### API (`apps/api/.env`)

| Variable | Default | Required | Description |
|----------|---------|----------|-------------|
| `NODE_ENV` | `development` | Yes | `development` or `production` |
| `DATABASE_URL` | - | Yes | PostgreSQL connection string |
| `REDIS_URL` | `redis://localhost:6379` | No | Redis/Valkey connection (for BullMQ queues) |
| `BETTER_AUTH_SECRET` | - | Yes | Secret key for session signing. Generate with `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | `http://localhost:3000` | Yes | Base URL where the API is accessible |
| `FRONTEND_URL` | `http://localhost:5173` | Yes | Frontend URL for CORS |
| `API_PORT` | `3000` | No | Port the API listens on |
| `API_HOST` | `0.0.0.0` | No | Host the API binds to. Use `127.0.0.1` in production behind Caddy |
| `LOG_LEVEL` | `debug` | No | Pino log level: `debug`, `info`, `warn`, `error`, `fatal` |
| `SLOW_QUERY_THRESHOLD_MS` | `200` | No | Log database queries slower than this (milliseconds) |
| `TELEGRAM_BOT_TOKEN` | - | No | Telegram bot token for error alerts. Create at @BotFather |
| `TELEGRAM_CHAT_ID` | - | No | Telegram chat/group ID to receive alerts |

### Web (`apps/web/.env`)

| Variable | Default | Required | Description |
|----------|---------|----------|-------------|
| `VITE_API_URL` | `http://localhost:3000` | Yes | API base URL (used by Vite at build time) |
| `VITE_APP_NAME` | project name | No | App name displayed in the UI |

> **Note**: Vite only exposes variables prefixed with `VITE_` to the frontend bundle.

---

## Production Deployment

### Prerequisites

```bash
# On your VPS
sudo apt update && sudo apt install -y postgresql valkey-server caddy nodejs npm
npm install -g pnpm pm2
```

### Deploy

```bash
# Clone your project
git clone <your-repo> /var/www/my-app
cd /var/www/my-app

# Install dependencies
pnpm install

# Create production env
cp apps/api/.env.example apps/api/.env
# Edit apps/api/.env with production values:
#   NODE_ENV=production
#   DATABASE_URL=postgresql://user:STRONG_PASSWORD@localhost:5432/mydb
#   BETTER_AUTH_SECRET=<generate with openssl rand -base64 32>
#   BETTER_AUTH_URL=https://yourdomain.com
#   FRONTEND_URL=https://yourdomain.com
#   API_HOST=127.0.0.1
#   LOG_LEVEL=info

# Build
pnpm build

# Run database migrations
cd apps/api && pnpm dlx prisma migrate deploy && cd ../..

# Set up Caddy
sudo cp Caddyfile /etc/caddy/Caddyfile
# Edit /etc/caddy/Caddyfile: replace {$DOMAIN} with your domain
sudo systemctl restart caddy

# Start with PM2
pm2 start ecosystem.config.cjs --env production
pm2 save
pm2 startup
```

### PM2 Commands (production)

```bash
pnpm pm2:start      # Start the API
pnpm pm2:stop       # Stop the API
pnpm pm2:restart    # Restart the API
pnpm pm2:logs       # View live logs
pm2 monit            # Real-time monitoring dashboard
pm2 status           # Process status table
```

---

## CLI Development

### Build the CLI

```bash
cd create-novek-saas
pnpm install
pnpm build
```

### Watch mode (auto-rebuild on changes)

```bash
pnpm dev
```

### Test locally

```bash
# From parent directory
node create-novek-saas/dist/index.js test-project

# Or link globally
cd create-novek-saas
pnpm link --global
cd ..
create-novek-saas test-project
```

### Publish to npm

```bash
cd create-novek-saas

# Login to npm
npm login

# Publish (runs build automatically via prepublishOnly)
npm publish

# Publish with scope
npm publish --access public
```

After publishing, anyone can run:

```bash
npx create-novek-saas my-app
```

---

## License

MIT

# CLAUDE.md — PropFlow

## Project Overview

Multi-tenant SaaS for property management + CRM with RBAC.

**Stack:** NestJS 11 + React 19 + Vite + PostgreSQL 16 + Prisma + Better Auth + BullMQ + Redis
**Monorepo:** pnpm workspaces + Turborepo
**Deployment:** PM2 + Caddy (no Docker)

## Structure

```
apps/
├── api/           # NestJS backend (Clean Architecture)
└── web/           # React frontend (TanStack Router + shadcn/ui)
```

## Commands

```bash
pnpm dev              # Both API + Web (Turborepo)
pnpm dev:api          # API only (port 3000)
pnpm dev:web          # Web only (port 5173)
pnpm build            # Build all
pnpm lint             # Lint all

# Database (from root)
pnpm db:generate      # Generate Prisma client
pnpm db:migrate       # Run migrations
pnpm db:push          # Push schema (dev)
pnpm db:studio        # Prisma Studio GUI
```

---

## GENERAL CODE RULES

- ALWAYS use pnpm/CLI commands for package installation and project initialization first, THEN edit config files.
- NEVER manually write package.json dependencies - use `pnpm add` commands instead.
- NEVER insert emoji into any file. Use unicode codepoints instead.
- ONLY use valid, working unicode codepoints that render correctly.
- ALWAYS respect `.gitignore` patterns.
- NEVER allow a branch or PR to contain more than 40 changed files. Split into smaller branches.
- ALWAYS check latest official docs (NestJS, Prisma, React, Better Auth) BEFORE writing code.
- ALWAYS verify installed package versions.
- NEVER assume API patterns from older versions.
- ALWAYS test each small step before moving to the next.

---

## GIT COMMIT RULES

- ALWAYS use single-line commit messages only.
- NEVER include multi-line body text.
- NEVER include "Co-Authored-By" or "Generated with Claude Code".
- ALWAYS use conventional commit: `type(scope): description`
- Example: `feat(property): add building CRUD endpoints`
- ALWAYS commit when changes exceed 8 new files OR 10 edited files.
- NEVER let a single commit grow too large.

---

## TYPESCRIPT RULES

- ALWAYS use `const`. NEVER use `let` or `var`.
- ALWAYS specify exact package versions in `package.json`.
- NEVER add unnecessary `console.log()`. Use NestJS `Logger` on backend.
- NEVER use relative paths for imports. Use aliases.
- ALWAYS use import aliases (`#modules/*`, `#shared/*`, `#features/*`). This is MANDATORY and CRITICAL.
- shadcn components use `@/components/ui/*` — that is the only exception.
- NEVER add explicit types if inferable.
- ALWAYS add `as const` to object literals when helpful.
- NEVER add return type annotations unless type stubs.
- NEVER use try/catch in controllers (let GlobalExceptionFilter handle it).
- ALWAYS prefer functional style. Avoid mutable variables.
- NEVER add code comments unless requested.
- NEVER allow a file larger than 600 lines.
- NEVER allow a function larger than 100 lines (except React components).
- NEVER use `forEach()`. Use `for...of`.
- ALWAYS use arrow functions. Never function declarations unless overloads needed.
- NEVER use `.then()` promises. Use `async`/`await`.
- NEVER use magic numbers/strings. Use named constants.
- ALWAYS define config values in constant object with `as const`.

---

## REACT RULES

- ALWAYS use `React.useCallback()` for functions inside components.
- ALWAYS use `React.useMemo()` for computed values inside components.
- ALWAYS use `React.memo()` for all components.
- ALWAYS provide `displayName` to all components.
- ALWAYS provide comparison function to `React.memo()`.
- NEVER set state from `scroll`, `resize`, `keyDown`, `keyPress` handlers.
- NEVER allow a component larger than 300 lines.
- NEVER render a component as function call. Use JSX element.
- NEVER create `index.ts` barrel files except rare essential cases.
- ALWAYS make components responsive (mobile, tablet, desktop).
- ALWAYS use TanStack Table for data tables.
- ALWAYS use TanStack Query for data fetching. NEVER use `useEffect` for fetching.

---

## MEMORY LEAK PREVENTION (React)

- ALWAYS cleanup subscriptions, timers, event listeners in useEffect cleanup.
- NEVER create subscriptions/timers without cleanup.
- ALWAYS use AbortController for fetch requests that may cancel.
- NEVER store component refs in module-level variables.
- ALWAYS check mounted state before updating state in async callbacks.
- NEVER create closures capturing large objects unnecessarily.
- ALWAYS use WeakMap/WeakSet when caching component instances.
- NEVER add window/document listeners without cleanup.
- NEVER create new object/array refs in render without useMemo.
- ALWAYS use stable callback refs with useCallback for handlers passed to children.

---

## NESTJS BACKEND RULES

- ALWAYS add Swagger decorators to every controller endpoint.
- ALWAYS create DTO with class-validator for request bodies.
- ALWAYS use `@RequirePermissions('resource:action')` for protected endpoints.
- ALWAYS use `@UseGuards(AuthGuard, PermissionsGuard)` on controllers.
- Controllers are thin — call handlers only. No business logic.
- Modules communicate via domain events only. No cross-module imports.

### Controller with Swagger

```typescript
@Controller('properties')
@ApiTags('Properties')
@UseGuards(AuthGuard, PermissionsGuard)
export class PropertyController {
  @Get()
  @RequirePermissions('property:read')
  @ApiOperation({ summary: 'List all properties' })
  @ApiResponse({ status: 200, description: 'Paginated list of properties' })
  async findAll(@Query() query: ListBuildingsDto, @Req() req: Request) {
    return this.listBuildingsHandler.execute(req.organizationId, query);
  }

  @Post()
  @RequirePermissions('property:create')
  @ApiOperation({ summary: 'Create a property' })
  @ApiBody({ type: CreateBuildingDto })
  @ApiResponse({ status: 201, description: 'Property created' })
  async create(@Body() dto: CreateBuildingDto) {
    return this.createBuildingHandler.execute(dto);
  }
}
```

### DTO Example

```typescript
export class CreateBuildingDto {
  @ApiProperty({ example: 'Main Office Building' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'commercial' })
  @IsEnum(BuildingType)
  type: BuildingType;

  @ApiProperty({ example: '123 Main St' })
  @IsString()
  address: string;
}
```

---

## MULTI-TENANCY

Every business database table MUST have:
- `organizationId` column with relation to Organization
- `@@index([organizationId])`
- `createdAt` and `updatedAt` fields
- `@id @default(cuid())` for IDs

Every query MUST filter by `organizationId`.

---

## API RESPONSE FORMAT

```json
// Single item
{ "data": { ... } }

// List with pagination
{ "data": [...], "meta": { "total": 100, "page": 1, "limit": 20, "totalPages": 5 } }

// Error
{ "error": { "code": "NOT_FOUND", "message": "Building not found" } }
```

---

## FRONTEND PATTERNS

### Data Fetching (TanStack Query)

```typescript
const PropertyList = React.memo(() => {
  const { data, isLoading, error } = useQuery({
    queryKey: propertyKeys.list({}),
    queryFn: () => api.get('/properties'),
  });

  if (isLoading) return <Skeleton />;
  if (error) return <ErrorMessage message={error.message} />;
  return <DataTable data={data} columns={columns} />;
});
PropertyList.displayName = 'PropertyList';
```

### Component with Memo

```typescript
interface Props {
  readonly building: Building;
  readonly onSelect: (id: string) => void;
}

const BuildingCard = React.memo(
  ({ building, onSelect }: Props) => (
    <Card onClick={() => onSelect(building.id)}>
      <CardHeader>{building.name}</CardHeader>
    </Card>
  ),
  (prev, next) => prev.building.id === next.building.id
);
BuildingCard.displayName = 'BuildingCard';
```

---

## SWAGGER DOCUMENTATION

Access: `http://localhost:3000/api/docs`

Every endpoint MUST have:
- `@ApiTags('Module Name')`
- `@ApiOperation({ summary: '...' })`
- `@ApiResponse({ status: xxx, description: '...' })`
- `@ApiBody({ type: DtoClass })` for POST/PUT

---

## FILE NAMING

- Components: `PascalCase.tsx` -> `BuildingCard.tsx`
- Hooks: `useProperties.ts`
- Services: `property.service.ts`
- Tests: `property.service.spec.ts`
- DTOs: `create-building.dto.ts`
- Handlers: `create-building.handler.ts`
- Controllers: `property.controller.ts`
- Modules: `property.module.ts`

---

## TESTING RULES

- DEFAULT: Always test through the browser UI using Playwright CLI tools (click, type, snapshot, navigate).
- Do NOT use API fetch calls, curl, or `browser_evaluate` with HTTP requests unless explicitly instructed to.
- To verify data, navigate to the relevant UI page and read it visually.
- The API and Web dev servers are ALREADY running in separate terminals (with hot-reload). NEVER start, restart, or kill them. Code changes auto-reload.

## YOUR ROLE

You write code. I test it. If I report a bug, fix it and ask me to verify.

Ask questions when unclear. Don't assume.

Read files before making changes.

---

## RELATED DOCS

Read these docs BEFORE making changes to the relevant area. They are the source of truth.

- `./docs/CODING_STANDARDS.md` — naming, patterns, function signatures
- `./docs/MODULE_GUIDE.md` — how to create a new backend module
- `./docs/API_CONVENTIONS.md` — endpoint patterns, response format
- `./docs/FRONTEND_CONVENTIONS.md` — React, TanStack patterns
- `./docs/DATABASE_GUIDE.md` — Prisma schema rules, multi-tenancy
- `./docs/PERMISSIONS_GUIDE.md` — RBAC system, roles, adding permissions
- `./docs/ARCHITECTURE.md` — full feature map, flows, domain model

---

## GSTACK (Browser & Workflow Skills)

ALWAYS use `/browse` for all web browsing. NEVER use `mcp__Claude_in_Chrome__*` tools.

### Available Skills

- `/office-hours` — YC-style office hours (startup or builder mode)
- `/plan-ceo-review` — CEO/founder plan review
- `/plan-eng-review` — Eng manager plan review
- `/plan-design-review` — Designer plan review
- `/plan-devex-review` — Developer experience plan review
- `/design-consultation` — Design system creation
- `/design-shotgun` — Generate multiple design variants
- `/design-html` — Production HTML/CSS from designs
- `/design-review` — Visual QA and fix
- `/review` — Pre-landing PR review
- `/ship` — Ship workflow (tests, review, PR)
- `/land-and-deploy` — Merge PR and verify production
- `/canary` — Post-deploy monitoring
- `/benchmark` — Performance regression detection
- `/browse` — Headless browser for QA and browsing
- `/connect-chrome` — Launch AI-controlled Chromium
- `/qa` — QA test and fix bugs
- `/qa-only` — QA report without fixes
- `/setup-browser-cookies` — Import browser cookies for auth
- `/setup-deploy` — Configure deploy settings
- `/retro` — Weekly engineering retrospective
- `/investigate` — Systematic debugging
- `/document-release` — Post-ship docs update
- `/codex` — Codex CLI wrapper (review, challenge, consult)
- `/cso` — Security audit
- `/autoplan` — Auto-review pipeline (CEO + design + eng + DX)
- `/devex-review` — Live DX audit
- `/careful` — Destructive command warnings
- `/freeze` — Restrict edits to directory
- `/guard` — Combined careful + freeze
- `/unfreeze` — Remove freeze boundary
- `/gstack-upgrade` — Upgrade gstack
- `/learn` — Manage project learnings

## gstack (REQUIRED — global install)

**Before doing ANY work, verify gstack is installed:**

```bash
test -d ~/.claude/skills/gstack/bin && echo "GSTACK_OK" || echo "GSTACK_MISSING"
```

If GSTACK_MISSING: STOP. Do not proceed. Tell the user:

> gstack is required for all AI-assisted work in this repo.
> Install it:
> ```bash
> git clone --depth 1 https://github.com/garrytan/gstack.git ~/.claude/skills/gstack
> cd ~/.claude/skills/gstack && ./setup --team
> ```
> Then restart your AI coding tool.

Do not skip skills, ignore gstack errors, or work around missing gstack.

Using gstack skills: After install, skills like /qa, /ship, /review, /investigate,
and /browse are available. Use /browse for all web browsing.
Use ~/.claude/skills/gstack/... for gstack file paths (the global path).

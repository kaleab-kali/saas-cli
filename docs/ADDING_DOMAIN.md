# ADDING_DOMAIN.md

Build your first business module on the skeleton.

---

## Overview

The skeleton is **pure infra**. No domain (no Properties / Contacts / Orders / etc.). To add your domain:

1. Add Prisma model(s)
2. Migrate
3. Scaffold NestJS module (Clean Architecture: domain → application → infrastructure → presentation)
4. Wire into `AppModule`
5. Add permissions
6. Add web feature folder
7. Add web routes
8. Update sidebar nav

---

## 1. Prisma model

Edit `apps/api/prisma/schema.prisma`. Multi-tenancy is mandatory.

```prisma
model Project {
  id             String   @id @default(cuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  name           String
  description    String?
  status         String   @default("active")  // active | archived
  ownerId        String?  // User.id
  archivedAt     DateTime?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([organizationId])
  @@index([organizationId, status])
  @@map("project")
}
```

Add back-relation on Organization:
```prisma
model Organization {
  // ...
  projects   Project[]
}
```

Migrate:
```bash
pnpm db:migrate    # creates migration
# or for dev iteration:
pnpm db:push       # writes schema directly
```

---

## 2. Module skeleton

Create folder `apps/api/src/modules/project/`:

```
project/
├── application/
│   ├── commands/
│   │   ├── create-project.handler.ts
│   │   ├── update-project.handler.ts
│   │   └── archive-project.handler.ts
│   ├── queries/
│   │   ├── list-projects.handler.ts
│   │   └── get-project.handler.ts
│   └── dto/project.dto.ts
├── domain/
│   ├── entities/project.entity.ts
│   └── repositories/project.repository.ts
├── infrastructure/
│   ├── mappers/project.mapper.ts
│   └── repositories/prisma-project.repository.ts
├── presentation/
│   └── controllers/project.controller.ts
└── project.module.ts
```

### Domain entity (no Prisma import)

`domain/entities/project.entity.ts`:
```typescript
export interface ProjectProps {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  status: "active" | "archived";
  ownerId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class Project {
  private constructor(private props: ProjectProps) {}
  static create(props: ProjectProps) { return new Project(props); }
  static rehydrate(props: ProjectProps) { return new Project(props); }

  get id() { return this.props.id; }
  archive() {
    this.props.status = "archived";
    this.props.updatedAt = new Date();
  }
  toPrimitives() { return { ...this.props }; }
}
```

### Repository abstract

`domain/repositories/project.repository.ts`:
```typescript
import type { Project } from "../entities/project.entity";

export abstract class ProjectRepository {
  abstract findById(id: string): Promise<Project | null>;
  abstract listByOrg(organizationId: string): Promise<Project[]>;
  abstract save(p: Project): Promise<Project>;
  abstract update(p: Project): Promise<Project>;
}
```

### DTO

`application/dto/project.dto.ts`:
```typescript
import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsString, MinLength } from "class-validator";

export class CreateProjectDto {
  @ApiProperty() @IsString() @MinLength(1) name!: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() description?: string;
}
```

### Controller

`presentation/controllers/project.controller.ts`:
```typescript
import { Body, Controller, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { AuthGuard } from "@thallesp/nestjs-better-auth";
import { PermissionsGuard } from "#modules/auth/guards/permissions.guard";
import { RequirePermissions } from "#shared/decorators/permissions.decorator";

@ApiTags("Projects")
@Controller("projects")
@UseGuards(AuthGuard, PermissionsGuard)
export class ProjectController {
  constructor(/* inject handlers */) {}

  @Get()
  @RequirePermissions("project:read")
  @ApiOperation({ summary: "List projects" })
  @ApiResponse({ status: 200 })
  async list(@Req() req: { organizationId: string }) {
    // return await this.listProjects.execute(req.organizationId);
  }

  @Post()
  @RequirePermissions("project:create")
  @ApiOperation({ summary: "Create project" })
  async create(@Body() dto: CreateProjectDto, @Req() req: { organizationId: string }) {
    // return await this.createProject.execute(req.organizationId, dto);
  }
}
```

### Module

`project.module.ts`:
```typescript
import { Module } from "@nestjs/common";
import { ProjectController } from "./presentation/controllers/project.controller";
import { ProjectRepository } from "./domain/repositories/project.repository";
import { PrismaProjectRepository } from "./infrastructure/repositories/prisma-project.repository";
// ...handler imports

@Module({
  controllers: [ProjectController],
  providers: [
    { provide: ProjectRepository, useClass: PrismaProjectRepository },
    // ...handlers
  ],
})
export class ProjectModule {}
```

Wire into `apps/api/src/app.module.ts`:
```typescript
import { ProjectModule } from "#modules/project/project.module";
// ...
@Module({
  imports: [/* ... */, ProjectModule],
})
```

---

## 3. Permissions

Add to `apps/api/src/modules/auth/permissions.ts`:

```typescript
export const statement = {
  // ...existing
  project: ["create", "read", "update", "archive", "delete"],
} as const;

export const owner = ac.newRole({
  // ...existing
  project: ["create", "read", "update", "archive", "delete"],
});

export const admin = ac.newRole({
  // ...existing
  project: ["create", "read", "update", "archive"],
});

export const member = ac.newRole({
  // ...existing
  project: ["read", "update"],
});

export const viewer = ac.newRole({
  // ...existing
  project: ["read"],
});
```

---

## 4. Web feature

Create `apps/web/src/features/projects/`:

```
projects/
├── api/
│   ├── project.queries.ts      (TanStack Query hooks for reads)
│   └── project.mutations.ts    (mutations)
├── components/
│   ├── ProjectCard.tsx
│   └── ProjectFormDialog.tsx
└── types/project.types.ts
```

### Query hooks

```typescript
import { useQuery } from "@tanstack/react-query";
import { api } from "#shared/lib/api-client";

export const useProjects = () =>
  useQuery({
    queryKey: ["projects"],
    queryFn: () => api.get<{ data: Project[] }>("/projects"),
    select: (r) => r.data,
  });
```

### Mutation hooks

```typescript
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "#shared/lib/api-client";

export const useCreateProject = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: { name: string; description?: string }) => api.post("/projects", dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["projects"] }),
  });
};
```

---

## 5. Web routes (TanStack Router)

Create `apps/web/src/routes/_authenticated/projects/`:

```
projects/
├── index.tsx               (list page)
└── $projectId.tsx          (detail page)
```

Example `index.tsx`:
```typescript
import { createFileRoute } from "@tanstack/react-router";
import React from "react";
import { useProjects } from "#features/projects/api/project.queries";

export const Route = createFileRoute("/_authenticated/projects/")({
  component: ProjectsList,
});

function ProjectsList() {
  const { data, isLoading } = useProjects();
  if (isLoading) return <p>Loading...</p>;
  return <pre>{JSON.stringify(data, null, 2)}</pre>;
}
```

TanStack Router auto-regenerates `routeTree.gen.ts` on `pnpm dev`.

---

## 6. Sidebar

Edit `apps/web/src/components/layout/AppSidebar.tsx`. Add to `NAV_ITEMS`:

```typescript
{
  labelKey: "sidebar.projects",
  to: "/projects",
  icon: SomeIcon,
  children: [
    { labelKey: "sidebar.allProjects", to: "/projects" },
  ],
},
```

Add translation keys to `apps/web/src/shared/i18n/locales/en.ts` (and `am.ts`).

---

## 7. Audit + RBAC integration

Audit log is **automatic** for all mutations through `AuditInterceptor`. No code needed.

Permission checks happen in `PermissionsGuard` (server) + `usePermission()` hook (web):

```typescript
// Web — hide button if no permission
import { usePermission } from "#shared/hooks/usePermission";
const canCreate = usePermission("project:create");
{canCreate && <Button onClick={...}>New project</Button>}
```

---

## 8. Plan entitlement (gating premium features)

Gate features by plan:

```typescript
// Server
@RequirePermissions("project:create")
@Post()
async create(@Body() dto: CreateProjectDto, @Req() req) {
  await this.entitlements.assertCan(req.organizationId, "project.advanced-fields");
  // ...
}
```

Add entitlement key to `apps/api/src/modules/billing/domain/value-objects/feature-keys.vo.ts`:
```typescript
export const FEATURE_KEYS = [
  // ...existing
  "project.advanced-fields",
] as const;
```

Then add per-plan entry in `seed-plans.ts`.

---

## 9. Custom field support (free)

Generic `CustomFieldDefinition` + `CustomFieldValue` infra is already there. Use for any entity:

```typescript
const fields = await prisma.customFieldDefinition.findMany({
  where: { organizationId, entityType: "project" },
});
const values = await prisma.customFieldValue.findMany({
  where: { entityType: "project", entityId: projectId },
});
```

UI for managing fields is at `/settings/custom-fields` (skeleton route deleted — re-add when ready).

---

## 10. Lookup support (per-org enums)

Replace hardcoded enums with `Lookup` rows for user-editable taxonomies:

```typescript
const statuses = await prisma.lookup.findMany({
  where: { organizationId, kind: "project_status", archived: false },
  orderBy: { sortOrder: "asc" },
});
```

---

## Cheat sheet — files touched per new module

| File | Purpose |
|---|---|
| `prisma/schema.prisma` | Add model |
| `src/modules/<x>/domain/entities/<x>.entity.ts` | Domain object |
| `src/modules/<x>/domain/repositories/<x>.repository.ts` | Repo abstract |
| `src/modules/<x>/infrastructure/repositories/prisma-<x>.repository.ts` | Repo impl |
| `src/modules/<x>/infrastructure/mappers/<x>.mapper.ts` | Domain ↔ Prisma |
| `src/modules/<x>/application/commands/*.handler.ts` | Command handlers |
| `src/modules/<x>/application/queries/*.handler.ts` | Query handlers |
| `src/modules/<x>/application/dto/<x>.dto.ts` | Request DTOs |
| `src/modules/<x>/presentation/controllers/<x>.controller.ts` | REST controller |
| `src/modules/<x>/<x>.module.ts` | Nest module |
| `src/app.module.ts` | Wire in |
| `src/modules/auth/permissions.ts` | RBAC permissions |
| `apps/web/src/features/<x>/...` | Web feature |
| `apps/web/src/routes/_authenticated/<x>/...` | Web routes |
| `apps/web/src/components/layout/AppSidebar.tsx` | Nav link |
| `apps/web/src/shared/i18n/locales/{en,am}.ts` | Translations |

That's the full surface for one new feature.

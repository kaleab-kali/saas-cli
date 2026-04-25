# PropFlow Coding Standards

## File Naming
- Always `kebab-case.ts` for all files
- Example: `property.controller.ts`, `create-building.handler.ts`, `building.entity.ts`

## Class Naming Conventions
- Controllers: `PropertyController`
- Services: `PropertyService`
- Handlers: `CreateBuildingHandler`, `ListBuildingsHandler`
- Entities: `Building`, `Unit`, `Lease`
- DTOs: `CreateBuildingDto`, `UpdateBuildingDto`
- Guards: `PermissionsGuard`, `AuthGuard`
- Events: `BuildingCreatedEvent`, `LeaseTerminatedEvent`

## Controller Method Pattern
```typescript
@Get()
@RequirePermissions('property:read')
@ApiOperation({ summary: 'List all properties' })
@ApiResponse({ status: 200, description: 'Returns paginated list of properties' })
async findAll(
  @Query() query: ListBuildingsDto,
  @CurrentUser('id') userId: string,
  @Req() req: Request & { organizationId: string },
): Promise<PaginatedResponse<BuildingResponseDto>> {
  return this.listBuildingsHandler.execute(req.organizationId, query);
}
```

## Command Handler Pattern
```typescript
@Injectable()
export class CreateBuildingHandler {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: DomainEventBus,
  ) {}

  async execute(organizationId: string, dto: CreateBuildingDto): Promise<BuildingResponseDto> {
    const building = await this.prisma.building.create({
      data: { ...dto, organizationId },
    });

    this.eventBus.emit({
      eventName: 'building.created',
      organizationId,
      occurredAt: new Date(),
      payload: { buildingId: building.id },
    });

    return BuildingMapper.toResponse(building);
  }
}
```

## Query Handler Pattern
```typescript
@Injectable()
export class ListBuildingsHandler {
  constructor(private readonly prisma: PrismaService) {}

  async execute(organizationId: string, params: ListBuildingsDto): Promise<PaginatedResponse<BuildingResponseDto>> {
    const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = params;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.building.findMany({
        where: { organizationId },
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.building.count({ where: { organizationId } }),
    ]);

    return {
      data: data.map(BuildingMapper.toResponse),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }
}
```

## Frontend Query File Pattern
```typescript
// features/properties/api/property-queries.ts
import { useQuery } from '@tanstack/react-query';
import { api } from '#shared/lib/api-client';

export const propertyKeys = {
  all: ['properties'] as const,
  lists: () => [...propertyKeys.all, 'list'] as const,
  list: (params: Record<string, unknown>) => [...propertyKeys.lists(), params] as const,
  details: () => [...propertyKeys.all, 'detail'] as const,
  detail: (id: string) => [...propertyKeys.details(), id] as const,
};

export function useProperties(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: propertyKeys.list(params ?? {}),
    queryFn: () => api.get('/properties', { params }),
  });
}
```

## Frontend Mutation File Pattern
```typescript
// features/properties/api/property-mutations.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '#shared/lib/api-client';
import { propertyKeys } from './property-queries';

export function useCreateProperty() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePropertyInput) => api.post('/properties', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: propertyKeys.lists() });
    },
  });
}
```

## Error Handling
- No try/catch in controllers — let GlobalExceptionFilter handle it
- Use typed NestJS exceptions: `NotFoundException`, `BadRequestException`, `ForbiddenException`
- Never throw generic `Error` — always use HTTP exceptions

## Strict Rules
- No `any` type — use `unknown` and type-narrow
- No default exports (except TanStack Router route files)
- No magic strings — use enums or `as const` objects
- No `console.log` — use `PinoLogger` from `nestjs-pino` (backend) or `reportError` (frontend)
- No `let` or `var` — always `const`
- No `forEach()` — use `for...of`
- No `.then()` — use `async`/`await`
- No file larger than 600 lines
- No function larger than 100 lines (except React components, max 300)

## Linting & Formatting
- **Biome** (NOT ESLint/Prettier) — configured at root `biome.json`
- Tabs for indentation, double quotes
- Run: `pnpm lint` (check) or `pnpm lint:fix` (auto-fix)
- Pre-commit hooks via **lefthook** auto-run biome + typecheck

## Logging
- Backend: inject `PinoLogger` from `nestjs-pino`, never use `console.log`
- Structured logging with correlation IDs on every request
- Audit interceptor auto-logs all mutations (POST/PUT/PATCH/DELETE)
- Frontend: use `reportError()` from `#shared/lib/error-reporter`

## Git Commit Format
- Single-line messages only. No multi-line body.
- No "Co-Authored-By" or "Generated with Claude Code"
- `feat(module): description` — new feature
- `fix(module): description` — bug fix
- `chore: description` — tooling, deps, config
- `refactor(module): description` — code restructure
- `docs: description` — documentation only

# Module Creation Guide

Step-by-step template for creating a new backend module in PropFlow.

## Steps

### 1. Create folder structure
```bash
cd apps/api/src/modules
mkdir -p <module-name>/{domain/{entities,value-objects,events,repositories},application/{commands,queries,dto},infrastructure/{repositories,mappers},presentation/{controllers,validators}}
```

### 2. Define domain entities
Create entity classes in `domain/entities/`. These are plain TypeScript classes representing your domain objects.

### 3. Define domain events
Create event interfaces in `domain/events/`. Example: `BuildingCreatedEvent`.

### 4. Define repository interfaces in domain
Create abstract repository interfaces in `domain/repositories/`. These define the contract — NOT the implementation.

### 5. Create DTOs in application/dto
Use `class-validator` decorators for validation:
```typescript
import { IsString, IsOptional, IsEnum } from 'class-validator';

export class CreateBuildingDto {
  @IsString()
  name: string;

  @IsEnum(BuildingType)
  type: BuildingType;

  @IsString()
  address: string;

  @IsOptional()
  @IsString()
  description?: string;
}
```

### 6. Create command handlers in application/commands
Each command handler does ONE thing. Inject PrismaService and DomainEventBus.

### 7. Create query handlers in application/queries
Query handlers are read-only. They return data with pagination support.

### 8. Implement Prisma repositories in infrastructure
These implement the domain repository interfaces using PrismaService.

### 9. Create controllers in presentation
Controllers are thin — they validate input (via DTOs) and delegate to handlers.

### 10. Create validators in presentation
Custom validation pipes for complex validation logic.

### 11. Register everything in the module
```typescript
@Module({
  controllers: [PropertyController],
  providers: [
    CreateBuildingHandler,
    UpdateBuildingHandler,
    ListBuildingsHandler,
    GetBuildingByIdHandler,
  ],
})
export class PropertyModule {}
```

### 12. Add module to app.module.ts
Import and add to the `imports` array in `app.module.ts`.

### 13. Add Prisma schema for new tables
Every business table MUST have:
- `organizationId` column with relation to Organization
- `@@index([organizationId])`
- `createdAt` and `updatedAt` fields
- `@id @default(cuid())` for IDs
- `@@map("snake_case")` for table naming

### 14. Run migration
```bash
pnpm db:migrate
```

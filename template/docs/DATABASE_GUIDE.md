# Database Guide

## Multi-tenancy Rule
Every business table MUST have:
- `organizationId String` column
- `organization Organization @relation(...)` with `onDelete: Cascade`
- `@@index([organizationId])`

## Required Fields
Every business table MUST have:
- `id String @id @default(cuid())`
- `createdAt DateTime @default(now())`
- `updatedAt DateTime @updatedAt`

## Naming
- Table mapping: `@@map("snake_case")` — singular (e.g., `"building"`, `"lease"`)
- Column naming: camelCase in Prisma, auto-maps to snake_case in PostgreSQL

## Relations
Always specify `onDelete` behavior:
- Parent-child: `onDelete: Cascade`
- Reference: `onDelete: Restrict` or `onDelete: SetNull`

## Migration Workflow
- Development: `pnpm db:migrate` (creates migration + applies)
- Production: `prisma migrate deploy` (applies pending migrations)
- Quick prototyping: `pnpm db:push` (syncs schema without migration file)

## Rules
- Never edit generated migration files
- Never delete migration files from version control
- Always review generated SQL before applying in production
- Use `pnpm db:studio` to inspect data during development

## Example Table
```prisma
model WorkOrder {
  id             String       @id @default(cuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  title       String
  description String?
  status      String    @default("open")
  priority    String    @default("normal")

  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@index([organizationId])
  @@map("work_order")
}
```

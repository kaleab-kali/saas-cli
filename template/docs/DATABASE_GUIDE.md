# Database Guide

## Multi-Tenancy Rule
Every tenant-owned table must have:
- `organizationId String`
- `organization Organization @relation(...)` with `onDelete: Cascade`
- `@@index([organizationId])`

## Required Fields
Every business table should have:
- `id String @id @default(cuid())`
- `createdAt DateTime @default(now())`
- `updatedAt DateTime @updatedAt`

## Naming
- Table mapping: `@@map("snake_case")`, singular, for example `"project"` or `"task"`
- Column names are camelCase in Prisma and map to snake_case in PostgreSQL

## Relations
Always specify delete behavior:
- Parent-child: `onDelete: Cascade`
- Reference: `onDelete: Restrict` or `onDelete: SetNull`

## Migration Workflow
- Development: `pnpm db:migrate`
- Production: `prisma migrate deploy`
- Prototyping: `pnpm db:push`

## Rules
- Never edit generated migration files
- Never delete migration files from version control
- Always review generated SQL before production deploys
- Use `pnpm db:studio` to inspect data during development

## Example Table
```prisma
model Task {
  id             String       @id @default(cuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  title       String
  description String?
  status      String   @default("open")
  priority    String   @default("normal")

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([organizationId])
  @@map("task")
}
```

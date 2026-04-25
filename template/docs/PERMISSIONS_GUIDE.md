# Permissions Guide

## How RBAC Works
PropFlow uses Better Auth's organization plugin with `createAccessControl` for fine-grained RBAC.

Permissions are defined as `resource:action` pairs in `apps/api/src/modules/auth/permissions.ts`.

## Checking Permissions (Backend)
Use the `@RequirePermissions` decorator on controller methods:
```typescript
@RequirePermissions('property:create')
async create(@Body() dto: CreateBuildingDto) { ... }
```

The `PermissionsGuard` calls `auth.api.hasPermission()` with the request headers to verify.

## Checking Permissions (Frontend)
Use the Better Auth client:
```typescript
const { data } = authClient.organization.checkRolePermission({
  permission: { property: ['read'] },
});
```

## Adding a New Resource
1. Add the resource and actions to `statement` in `permissions.ts`
2. Add the resource to relevant role definitions
3. Use `@RequirePermissions('resource:action')` in controllers

## Adding ABAC (Attribute-Based)
For resource-level checks (e.g., "user can only edit their own properties"):
1. Create a custom guard extending `CanActivate`
2. Query the resource and check ownership
3. Stack with `@UseGuards(AuthGuard, PermissionsGuard, OwnershipGuard)`

## Roles
- **owner** — full access to everything
- **admin** — full access except org deletion
- **propertyManager** — manage properties, units, leases, maintenance
- **leasingAgent** — manage leases, contacts, pipeline, listings
- **maintenanceStaff** — read properties, manage work orders
- **accountant** — read-only properties, full finance access
- **viewer** — read-only access to basics

## Dynamic Roles
Better Auth supports dynamic roles at runtime. Enable via `dynamicAccessControl: { enabled: true }` in auth config.

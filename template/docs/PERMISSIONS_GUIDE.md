# Permissions Guide

Permissions are defined in `apps/api/src/modules/auth/permissions.ts`.

The template ships with four tenant roles:

- `owner`
- `admin`
- `member`
- `viewer`

When adding a new domain resource, add it to the access-control statement, then assign actions to each system role. Use `@RequirePermissions("resource:action")` on protected controllers.

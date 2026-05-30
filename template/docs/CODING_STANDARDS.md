# Coding Standards

- Keep modules small and organized by feature.
- Keep controllers thin; put application behavior in handlers/services.
- Validate request DTOs with `class-validator`.
- Return consistent `{ data, meta? }` API responses.
- Scope tenant data by `organizationId`.
- Add permissions for every new protected resource.
- Prefer typed API hooks on the frontend instead of ad hoc `fetch` calls.

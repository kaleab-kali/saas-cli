# Coding Standards

- Keep modules small and organized by feature.
- Keep controllers thin; put application behavior in handlers/services.
- Validate request DTOs with `class-validator`.
- Return consistent `{ data, meta? }` API responses.
- Scope tenant data by `organizationId`.
- Add permissions for every new protected resource.
- Format money and tenant-local dates through `#shared/i18n` utilities instead of ad hoc `toFixed` or `toLocaleDateString` calls.
- Normalize tenant phone numbers through `#shared/i18n/phone.util` and reuse `#shared/types/address` for address payloads.
- The source security gate rejects API-side ad hoc money/date formatting outside `#shared/i18n`.
- Prefer typed API hooks on the frontend instead of ad hoc `fetch` calls.

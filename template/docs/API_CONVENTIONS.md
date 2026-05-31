# API Conventions

## URL Pattern
- Base: `/api/v1/{resource}` using plural, kebab-case resource names
- Examples: `/api/v1/projects`, `/api/v1/tasks`, `/api/v1/audit-logs`

## HTTP Methods
- `GET /resources` - list, paginated
- `GET /resources/:id` - get one
- `POST /resources` - create
- `PUT /resources/:id` - full update
- `PATCH /resources/:id` - partial update
- `DELETE /resources/:id` - delete

## Pagination
Query params: `?page=1&limit=20&sortBy=createdAt&sortOrder=desc`

## Filtering
Query params should stay explicit and typed, for example `?status=active&ownerId=user_123`.

## Response Format

### Success
```json
{ "data": { "id": "abc123", "name": "Launch Plan" } }
```

### Paginated List
```json
{
  "data": [{ "id": "abc123", "name": "Launch Plan" }],
  "meta": { "total": 100, "page": 1, "limit": 20, "totalPages": 5 }
}
```

### Error
```json
{ "error": { "code": "NOT_FOUND", "message": "Resource not found" } }
```

Use `DomainError` for expected business failures so modules return stable, safe error codes without leaking internals:

```ts
throw new DomainError({
  code: "ONBOARDING_STEP_BLOCKED",
  message: "This onboarding step is blocked",
  status: HttpStatus.CONFLICT,
});
```

The global exception filter maps `DomainError` instances directly to `{ error: { code, message } }`. Unexpected `Error` instances are logged and returned as a generic `INTERNAL_SERVER_ERROR`.

## Status Codes
- `200` - success
- `201` - created
- `204` - deleted, no body
- `400` - validation error
- `401` - unauthorized
- `403` - forbidden
- `404` - not found
- `429` - rate limited
- `500` - server error

## Rate Limiting
- Global: `TenantThrottlerGuard` scopes authenticated traffic by `organizationId`, admin traffic by admin session/user, API-key traffic by key id when present, and anonymous traffic by client IP.
- Defaults: `API_RATE_LIMIT_PER_TENANT=60`, `API_RATE_LIMIT_TTL_MS=60000`, `API_RATE_LIMIT_BLOCK_MS=60000`.
- Override per route: `@Throttle({ default: { ttl: 1000, limit: 3 } })`
- Skip for a route: `@SkipThrottle()`

## Health Check
- `GET /health` returns DB ping status and is not prefixed with `/api/v1`
- `GET /health/live` and `GET /health/ready` are public process-manager probes
- `GET /api/v1/health/detailed` is super-admin only and may include runtime diagnostics
- Used by PM2, load balancers, and monitoring

## Correlation IDs
- Every request gets an `x-correlation-id` response header
- The same ID appears in logs for request tracing
- Frontend callers should pass an existing ID when retrying or chaining calls

## Audit Metadata
Every mutating controller action should either follow the standard REST resource/action inference or provide explicit audit metadata:

```ts
@Controller("admin/onboarding")
@AuditResource("onboarding:task")
export class AdminOnboardingController {
  @Post(":id/steps/:stepKey/complete")
  @AuditAction("complete_step")
  async completeStep() {
    // ...
  }
}
```

The global audit interceptor persists success and failure records, redacts request bodies, and uses `@AuditResource` / `@AuditAction` metadata when present.

## Validation
- Use `class-validator` decorators on DTOs
- `ValidationPipe` runs globally
- Whitelist mode strips unknown properties

## Swagger
Every endpoint should include:
- `@ApiTags("ResourceName")`
- `@ApiOperation({ summary: "..." })`
- `@ApiResponse({ status: 200, description: "..." })`

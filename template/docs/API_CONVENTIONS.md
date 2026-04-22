# API Conventions

## URL Pattern
- Base: `/api/v1/{resource}` (plural, kebab-case)
- Examples: `/api/v1/properties`, `/api/v1/work-orders`, `/api/v1/audit-logs`

## HTTP Methods
- `GET /resources` — list (paginated)
- `GET /resources/:id` — get single
- `POST /resources` — create
- `PUT /resources/:id` — full update
- `PATCH /resources/:id` — partial update
- `DELETE /resources/:id` — delete

## Pagination
Query params: `?page=1&limit=20&sortBy=createdAt&sortOrder=desc`

## Filtering
Query params: `?type=residential&status=available`

## Response Format

### Success — single item
```json
{ "data": { "id": "abc123", "name": "Main Building" } }
```

### Success — list with pagination
```json
{
  "data": [{ "id": "abc123", "name": "Main Building" }],
  "meta": { "total": 100, "page": 1, "limit": 20, "totalPages": 5 }
}
```

### Error
```json
{ "error": { "code": "NOT_FOUND", "message": "Building not found" } }
```

## Status Codes
- `200` — success
- `201` — created
- `204` — deleted (no content)
- `400` — validation error
- `401` — unauthorized
- `403` — forbidden (missing permission)
- `404` — not found
- `429` — too many requests (rate limited)
- `500` — server error

## Rate Limiting
- Global: 60 requests per minute per IP (`@nestjs/throttler`)
- Override per route: `@Throttle({ default: { ttl: 1000, limit: 3 } })`
- Skip for a route: `@SkipThrottle()`

## Health Check
- `GET /health` — returns DB ping status (not prefixed with /api/v1)
- Used by PM2, load balancers, and monitoring

## Correlation IDs
- Every request gets an `x-correlation-id` header (auto-generated UUID if not provided)
- Same ID appears in response headers and all log entries for that request
- Pass `x-correlation-id` from frontend to trace requests end-to-end

## Compression
- All responses are gzip compressed via `compression` middleware
- Enabled globally in `main.ts`

## Validation
- Use `class-validator` decorators on DTOs
- `ValidationPipe` handles globally (configured in `main.ts`)
- Whitelist mode strips unknown properties

## Swagger
Every endpoint MUST have:
- `@ApiTags('ResourceName')`
- `@ApiOperation({ summary: '...' })`
- `@ApiResponse({ status: 200, description: '...' })`

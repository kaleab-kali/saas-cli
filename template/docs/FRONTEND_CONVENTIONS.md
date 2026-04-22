# Frontend Conventions

## Route Files
Route files are thin — just `createFileRoute` with component:
```typescript
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/properties')({
  component: PropertiesPage,
});

function PropertiesPage() {
  return <PropertyList />;
}
```

## Feature Structure
Each feature has:
- `api/` — query keys factory, useQuery wrappers, useMutation wrappers
- `components/` — UI components specific to this feature
- `types/` — TypeScript type definitions

## Query Keys Factory Pattern
```typescript
export const propertyKeys = {
  all: ['properties'] as const,
  lists: () => [...propertyKeys.all, 'list'] as const,
  list: (params: Record<string, unknown>) => [...propertyKeys.lists(), params] as const,
  details: () => [...propertyKeys.all, 'detail'] as const,
  detail: (id: string) => [...propertyKeys.details(), id] as const,
};
```

## Mutations Always Invalidate
```typescript
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: propertyKeys.lists() });
}
```

## DataTable
Wrap TanStack Table + TanStack Virtual for virtualized, sortable, filterable tables.

## Forms
Use shadcn form components + zod validation schemas.

## API Calls
All API calls go through `#shared/lib/api-client.ts` — never use `fetch` directly.

## Auth State
Use `#shared/lib/auth-client.ts` — Better Auth React hooks (`useSession`, `signIn`, `signUp`, `signOut`).

## Loading States
Use skeleton components from shadcn/ui.

## Error States
Use sonner toast notifications from shadcn/ui.

## Import Rules
- Feature code: `import { X } from '#features/properties/...'`
- Shared code: `import { X } from '#shared/...'`
- shadcn components: `import { Button } from '@/components/ui/button'` (keep @ alias)

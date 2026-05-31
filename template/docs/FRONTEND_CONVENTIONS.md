# Frontend Conventions

## Route Files
Route files should stay thin:
```typescript
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/projects")({
  component: ProjectsPage,
});

function ProjectsPage() {
  return <ProjectList />;
}
```

## Feature Structure
Each feature should keep this shape:
- `api/` - query keys, `useQuery` wrappers, `useMutation` wrappers
- `components/` - feature-specific UI components
- `types/` - TypeScript type definitions

## Query Keys
```typescript
export const projectKeys = {
  all: ["projects"] as const,
  lists: () => [...projectKeys.all, "list"] as const,
  list: (params: Record<string, unknown>) => [...projectKeys.lists(), params] as const,
  details: () => [...projectKeys.all, "detail"] as const,
  detail: (id: string) => [...projectKeys.details(), id] as const,
};
```

## Mutations
```typescript
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
}
```

## Shared Rules
- Wrap tables with the shared TanStack Table/DataTable utilities
- Do not render raw `<table>`, `<thead>`, `<tbody>`, `<tr>`, `<th>`, or `<td>` tags outside `components/ui/table.tsx`; the source security gate rejects drift
- Use `useDataTableState` for list pages that need bookmarkable search, sorting, and pagination state
- Enable `enableCsvExport` on operational list pages so visible, filtered rows can be handed off without bespoke table export code
- Let DataTable virtualize large pages with TanStack Virtual by passing `virtualizeRows` or using a page size of 100 rows
- Use `savedViewsEntity` when a recurring operational table should persist search, filters, sorting, and column visibility through the shared SavedView API
- Add `bulkActions` and `getRowId` for admin queues where staff naturally select multiple rows for a handoff action
- Use shadcn form components with zod validation schemas
- Route all HTTP calls through `#shared/lib/api-client.ts`
- Use `#shared/lib/auth-client.ts` for Better Auth hooks
- Use skeleton components for loading states
- Use sonner toast notifications for recoverable errors

## Imports
- Feature code: `import { X } from "#features/projects/..."`
- Shared code: `import { X } from "#shared/..."`
- shadcn components: `import { Button } from "@/components/ui/button"`
- Hugeicons: import individual icons from `@hugeicons/core-free-icons/IconName` instead of the package barrel to keep production bundles small

# Design Tokens

The template uses Tailwind and shadcn-style CSS variables. Keep product UI consistent by changing tokens rather than one-off component styles.

## Tenant Branding

Tenant branding should be applied through organization settings:

- Logo file.
- App display name.
- Accent color.
- Locale.
- Timezone.

Do not hardcode tenant-specific colors or logos in feature modules.

## Component Rules

- Use shared UI primitives under `apps/web/src/components/ui`.
- Use shared layout components for page shells.
- Use consistent spacing and table patterns.
- Avoid feature-specific button, input, or modal variants unless they become shared primitives.

## Accessibility

- Buttons and icon controls need accessible labels.
- Inputs need labels or explicit `aria-label`.
- Color must not be the only status signal.
- Keep keyboard navigation intact for menus, dialogs, and tables.

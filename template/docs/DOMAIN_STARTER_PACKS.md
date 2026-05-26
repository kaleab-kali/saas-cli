# Domain Starter Packs

Starter packs generate several neutral repository-pattern modules at once. They are intentionally scaffolds, not finished vertical products. Each generated module includes an API slice, web feature folder, route, permissions, sidebar entry, and a starter unit test.

## Commands

```bash
pnpm gen:starter crm
pnpm gen:starter marketplace
pnpm gen:starter project-management
pnpm gen:starter ai-saas
pnpm gen:starter booking
pnpm gen:starter helpdesk
pnpm gen:starter eims
```

Equivalent direct CLI form:

```bash
create-vyllion-saas add starter crm
```

## Packs

| Pack | Generated modules |
| --- | --- |
| `crm` | `accounts`, `contacts`, `deals`, `activities` |
| `marketplace` | `vendors`, `listings`, `orders`, `reviews` |
| `project-management` | `projects`, `tasks`, `milestones`, `comments` |
| `ai-saas` | `ai-workflows`, `prompt-runs`, `model-usage`, `knowledge-bases` |
| `booking` | `services`, `bookings`, `availability`, `customers` |
| `helpdesk` | `tickets`, `ticket-comments`, `support-slas`, `knowledge-base` |
| `eims` | EIMS/EIRMS invoicing scaffold: `invoicing`, `eims`, Phase 0 assets, permissions, feature keys, docs |

## After Generation

1. Add Prisma models for each generated module.
2. Replace placeholder Prisma repositories with real queries.
3. Add feature keys and plan entitlements for premium workflows.
4. Add route-specific acceptance, API, E2E, property, and mutation tests for business rules.
5. Run `pnpm typecheck`, `pnpm test:api`, `pnpm test:property`, and `pnpm test:smoke`.

The base template stays domain-neutral. Starter packs speed up file layout, permissions, navigation, and test placement without choosing your final data model.

The `eims` starter is intentionally compliance-heavy and optional. It follows `docs/EIMS_FINAL_AGREED_SAAS_ARCHITECTURE_PLAN_V3.md` and starts with local Phase 0 proof assets before any real MoR/EIMS calls.

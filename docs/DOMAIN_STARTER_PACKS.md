# Domain Starter Packs

`create-vyllion-saas add starter <pack>` expands a common SaaS vertical into multiple generated modules. The modules follow the same repository-pattern scaffold as `add module`: API module, domain entity, abstract repository, Prisma repository placeholder, handlers, controller, DTO, web feature hook/component, route, permissions, and sidebar navigation.

## Available Packs

| Pack | Generated modules |
| --- | --- |
| `crm` | `accounts`, `contacts`, `deals`, `activities` |
| `marketplace` | `vendors`, `listings`, `orders`, `reviews` |
| `project-management` | `projects`, `tasks`, `milestones`, `comments` |
| `ai-saas` | `ai-workflows`, `prompt-runs`, `model-usage`, `knowledge-bases` |
| `booking` | `services`, `bookings`, `availability`, `customers` |
| `helpdesk` | `tickets`, `ticket-comments`, `support-slas`, `knowledge-base` |
| `eims` | EIMS/EIRMS invoicing starter: `invoicing`, `eims`, Phase 0 assets, permissions, feature keys, docs |

## Usage

From a generated project root:

```bash
create-vyllion-saas add starter crm
create-vyllion-saas add starter eims
```

Or through the generated project script:

```bash
pnpm gen:starter crm
pnpm gen:starter eims
```

The command refuses to overwrite existing module folders. After generation, add Prisma models and replace the placeholder repositories with real queries.

The `eims` starter is special: it creates the V3 EIMS/EIRMS scaffold, not a finished integration. Start with `docs/EIMS_PHASE0_RUNBOOK.md` and do Phase 0 Layer A before adding real MoR/EIMS sandbox calls.

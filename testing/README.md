# EIMS Scaffold Verification

This folder is for generated-project verification. The generated SaaS project
used for local proof is intentionally ignored by git:

```bash
node packages/cli/bin/index.js testing/eims-v3-generated --yes
cd testing/eims-v3-generated
pnpm install
pnpm test:eims:mock
```

From the repository root, run:

```bash
pnpm test:eims:scaffold
```

That verifier checks the generated project, not only the template. It asserts:

- `apps/api/src/modules/eims` has the V3 backend submodules.
- EIMS and invoicing are imported by the generated API app module.
- Prisma contains the EIMS V3 data models.
- Generated test scripts exist.
- The backend mock API returns real V3-shaped data for tenant and admin flows.


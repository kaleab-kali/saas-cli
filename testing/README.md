# EIMS Scaffold Verification

This folder is for generated-project verification. The generated SaaS project
used for local proof lives in the shared Novek testing workspace:

```bash
node packages/cli/bin/index.js C:\Users\kali\Desktop\novek\testing\vyllion-eims-v3-api-ui-proof --yes
cd C:\Users\kali\Desktop\novek\testing\vyllion-eims-v3-api-ui-proof
pnpm install
pnpm test:eims:mock
```

Visible headed UI run:

```bash
pnpm --filter e2e exec playwright test -c playwright.eims.config.ts tests/eims-mock.spec.ts --headed --project=chromium
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
- Credentials, certificates, bulk, cancellations, buyer directory, print layouts,
  notifications, branch health, lookups, submissions, receipts, compliance, and
  super-admin operations are checked with data assertions.
- Desktop and mobile browser tests navigate all tenant and super-admin EIMS pages
  against the backend mock API.

Override the generated project path when needed:

```bash
$env:EIMS_GENERATED_PROJECT_ROOT="C:\Users\kali\Desktop\novek\testing\your-project"
pnpm test:eims:scaffold
```

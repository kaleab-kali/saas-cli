# EIMS Starter Pack Specification

This document is the complete specification for the EIMS starter pack — every file that goes into `packages/cli/starters/eims/`, what it does, and how `pnpm gen:starter eims` installs it.

The pack is **idempotent** (re-running it doesn't break things) and **uninstallable** (every change is reversible).

---

## 1. What this pack does for a SaaS

After running `pnpm gen:starter eims`, a fresh SaaS project gains:

- All EIMS Prisma models (credentials, certificates, submissions, etc.)
- NestJS module with full DDD layering (domain, application, infrastructure, presentation)
- Frontend feature folder with setup wizard, dashboards, submission tables
- Tenant-side routes under `/eims/*`
- Admin-side routes under `/admin/eims/*`
- Sidebar entries for both areas
- Permission statements
- Seed data for codes (transaction types, document types, reason codes)
- Environment variables in `.env.example`
- The `@yourcompany/eims-sdk` dependency
- Background cron jobs (certificate expiry, retry queue drain)
- Tests scaffolded for each layer
- Documentation file in the project's `docs/` folder

After install, the developer only needs to:
1. Run `pnpm db:migrate`
2. Set `EIMS_API_URL` in `.env`
3. Onboard their first tenant through the wizard UI

---

## 2. Pack folder structure

```
packages/cli/starters/eims/
|-- pack.json                              # metadata, install plan
|-- install.js                             # main installer script
|-- uninstall.js                           # reverses install
|-- README.md                              # pack overview
|
|-- api/                                   # files copied to apps/api/src/modules/eims/
|   |-- eims.module.ts
|   |-- index.ts
|   |
|   |-- domain/
|   |   |-- entities/
|   |   |   |-- eims-credential.entity.ts
|   |   |   |-- eims-certificate.entity.ts
|   |   |   |-- eims-source.entity.ts
|   |   |   |-- eims-submission.entity.ts
|   |   |   |-- eims-submission-queue.entity.ts
|   |   |   |-- eims-cancellation.entity.ts
|   |   |   |-- eims-receipt.entity.ts
|   |   |   `-- tenant-buyer.entity.ts
|   |   |-- value-objects/
|   |   |   |-- tin.vo.ts
|   |   |   |-- irn.vo.ts
|   |   |   |-- system-number.vo.ts
|   |   |   `-- transaction-type.vo.ts
|   |   |-- events/
|   |   |   |-- invoice-submitted.event.ts
|   |   |   |-- invoice-cancelled.event.ts
|   |   |   |-- certificate-expiring.event.ts
|   |   |   |-- certificate-uploaded.event.ts
|   |   |   `-- credentials-configured.event.ts
|   |   `-- repositories/
|   |       |-- eims-credential.repository.ts
|   |       |-- eims-certificate.repository.ts
|   |       |-- eims-source.repository.ts
|   |       |-- eims-submission.repository.ts
|   |       |-- eims-submission-queue.repository.ts
|   |       |-- eims-cancellation.repository.ts
|   |       `-- tenant-buyer.repository.ts
|   |
|   |-- application/
|   |   |-- commands/
|   |   |   |-- store-credentials/
|   |   |   |   |-- store-credentials.command.ts
|   |   |   |   |-- store-credentials.handler.ts
|   |   |   |   `-- store-credentials.handler.spec.ts
|   |   |   |-- upload-certificate/
|   |   |   |-- generate-csr/
|   |   |   |-- register-source/
|   |   |   |-- submit-invoice/
|   |   |   |-- cancel-invoice/
|   |   |   |-- submit-bulk/
|   |   |   |-- submit-receipt/
|   |   |   `-- retry-queued-submission/
|   |   |-- queries/
|   |   |   |-- list-submissions.handler.ts
|   |   |   |-- get-submission.handler.ts
|   |   |   |-- verify-invoice.handler.ts
|   |   |   |-- check-compliance.handler.ts
|   |   |   |-- get-compliance-status.handler.ts
|   |   |   |-- list-cancellations.handler.ts
|   |   |   `-- list-buyers.handler.ts
|   |   |-- services/
|   |   |   |-- eims-tenant-config.service.ts
|   |   |   |-- credential-cipher.service.ts
|   |   |   |-- certificate-parser.service.ts
|   |   |   |-- certificate-lifecycle.service.ts
|   |   |   |-- csr-generator.service.ts
|   |   |   |-- invoice-builder.service.ts
|   |   |   |-- compliance-checker.service.ts
|   |   |   `-- offline-queue.service.ts
|   |   `-- dto/
|   |       |-- canonical-invoice.dto.ts
|   |       `-- compliance-status.dto.ts
|   |
|   |-- infrastructure/
|   |   |-- repositories/
|   |   |   |-- prisma-eims-credential.repository.ts
|   |   |   |-- prisma-eims-certificate.repository.ts
|   |   |   |-- prisma-eims-source.repository.ts
|   |   |   |-- prisma-eims-submission.repository.ts
|   |   |   |-- prisma-eims-submission-queue.repository.ts
|   |   |   |-- prisma-eims-cancellation.repository.ts
|   |   |   `-- prisma-tenant-buyer.repository.ts
|   |   |-- mappers/
|   |   |   |-- credential.mapper.ts
|   |   |   |-- certificate.mapper.ts
|   |   |   |-- submission.mapper.ts
|   |   |   `-- invoice.mapper.ts
|   |   |-- crons/
|   |   |   |-- certificate-expiry.cron.ts
|   |   |   |-- retry-queued-submissions.cron.ts
|   |   |   `-- cleanup-stale-queue.cron.ts
|   |   |-- adapters/
|   |   |   `-- eims-sdk.adapter.ts
|   |   `-- queue/
|   |       `-- eims-submission.processor.ts
|   |
|   |-- presentation/
|   |   |-- controllers/
|   |   |   |-- eims-setup.controller.ts
|   |   |   |-- eims-credentials.controller.ts
|   |   |   |-- eims-certificates.controller.ts
|   |   |   |-- eims-sources.controller.ts
|   |   |   |-- eims-submissions.controller.ts
|   |   |   |-- eims-cancellations.controller.ts
|   |   |   |-- eims-bulk.controller.ts
|   |   |   |-- eims-receipts.controller.ts
|   |   |   |-- eims-buyers.controller.ts
|   |   |   |-- eims-compliance.controller.ts
|   |   |   `-- admin-eims.controller.ts
|   |   |-- guards/
|   |   |   |-- eims-configured.guard.ts
|   |   |   `-- eims-certificate-valid.guard.ts
|   |   `-- dto/
|   |       |-- store-credentials.dto.ts
|   |       |-- upload-certificate.dto.ts
|   |       |-- submit-invoice.dto.ts
|   |       |-- cancel-invoice.dto.ts
|   |       `-- ...
|   |
|   `-- tests/
|       |-- e2e/
|       |   |-- eims-setup.e2e.spec.ts
|       |   |-- submit-invoice.e2e.spec.ts
|       |   `-- tenant-isolation.e2e.spec.ts
|       |-- integration/
|       |   |-- credential-cipher.integration.spec.ts
|       |   `-- certificate-lifecycle.integration.spec.ts
|       `-- fixtures/
|           |-- sample-invoice.json
|           |-- sample-cert.pem
|           `-- sample-key.pem
|
|-- web/                                   # files copied to apps/web/src/features/eims/
|   |-- api/
|   |   |-- eims-credentials.hooks.ts
|   |   |-- eims-certificates.hooks.ts
|   |   |-- eims-submissions.hooks.ts
|   |   |-- eims-cancellations.hooks.ts
|   |   |-- eims-buyers.hooks.ts
|   |   `-- eims-compliance.hooks.ts
|   |-- components/
|   |   |-- setup-wizard/
|   |   |   |-- SetupWizard.tsx
|   |   |   |-- StepWelcome.tsx
|   |   |   |-- StepCredentials.tsx
|   |   |   |-- StepGenerateCsr.tsx
|   |   |   |-- StepUploadCertificate.tsx
|   |   |   |-- StepVerify.tsx
|   |   |   `-- StepComplete.tsx
|   |   |-- submissions/
|   |   |   |-- SubmissionsTable.tsx
|   |   |   |-- SubmissionDetail.tsx
|   |   |   |-- SubmissionStatusBadge.tsx
|   |   |   `-- ResubmitButton.tsx
|   |   |-- compliance/
|   |   |   |-- ComplianceDashboard.tsx
|   |   |   |-- ComplianceScore.tsx
|   |   |   |-- ComplianceChecklist.tsx
|   |   |   `-- ExpiringCertificatesCard.tsx
|   |   |-- credentials/
|   |   |   |-- CredentialsForm.tsx
|   |   |   `-- CredentialsCard.tsx
|   |   |-- certificates/
|   |   |   |-- CertificateUpload.tsx
|   |   |   |-- CertificateCard.tsx
|   |   |   `-- CsrGenerator.tsx
|   |   |-- buyers/
|   |   |   |-- BuyersTable.tsx
|   |   |   `-- BuyerForm.tsx
|   |   `-- shared/
|   |       |-- IrnDisplay.tsx
|   |       |-- QrPreview.tsx
|   |       `-- EimsStatusIndicator.tsx
|   |-- types/
|   |   |-- credential.types.ts
|   |   |-- certificate.types.ts
|   |   |-- submission.types.ts
|   |   `-- compliance.types.ts
|   `-- utils/
|       |-- format-irn.ts
|       |-- format-status.ts
|       `-- compliance-rules.ts
|
|-- web-routes/                            # files copied to apps/web/src/routes/_authenticated/eims/
|   |-- index.tsx                          # dashboard
|   |-- setup.tsx                          # wizard entry
|   |-- credentials.tsx
|   |-- certificates.tsx
|   |-- sources.tsx
|   |-- submissions.tsx                    # main submissions table
|   |-- submissions.$id.tsx                # detail page
|   |-- cancellations.tsx
|   |-- bulk.tsx
|   |-- receipts.tsx
|   |-- buyers.tsx
|   `-- compliance.tsx
|
|-- web-admin-routes/                      # files copied to apps/web/src/routes/admin/eims/
|   |-- index.tsx
|   |-- tenants.tsx                        # cross-tenant EIMS health
|   |-- failures.tsx                       # failed submissions across all tenants
|   |-- certificates.tsx                   # cert expiry across all tenants
|   |-- resources.tsx                      # MoR lookup tables
|   `-- compliance.tsx                     # platform-wide compliance metrics
|
|-- prisma/
|   `-- models.prisma.snippet              # appended to schema.prisma
|
|-- snippets/                              # files patched into existing template files
|   |-- app-module-imports.snippet.ts      # added to apps/api/src/app.module.ts
|   |-- permissions.snippet.ts             # added to apps/api/src/modules/auth/permissions.ts
|   |-- sidebar.snippet.ts                 # added to apps/web/src/shared/navigation/registry.ts
|   |-- admin-sidebar.snippet.ts
|   |-- i18n-en.snippet.ts                 # added to apps/web/src/shared/i18n/locales/en.ts
|   |-- i18n-am.snippet.ts
|   |-- seed.snippet.ts                    # added to apps/api/prisma/seed.ts
|   `-- env.snippet                        # appended to .env.example
|
`-- docs/                                  # copied to project's docs/
    |-- EIMS_STARTER_GUIDE.md
    |-- EIMS_ONBOARDING_FLOW.md
    |-- EIMS_TROUBLESHOOTING.md
    `-- EIMS_COMPLIANCE_CHECKLIST.md
```

---

## 3. The pack.json metadata

```json
{
  "name": "eims",
  "displayName": "EIMS — Ethiopia Electronic Invoice Management",
  "description": "Adds full EIMS/EIRMS integration with MoR including credentials, certificates, invoice submission, cancellation, receipts, and compliance dashboards.",
  "version": "0.1.0",
  "author": "Your Company",
  "requires": [],
  "conflicts": [],
  "addsRoutes": [
    "/eims",
    "/eims/setup",
    "/eims/credentials",
    "/eims/certificates",
    "/eims/sources",
    "/eims/submissions",
    "/eims/submissions/:id",
    "/eims/cancellations",
    "/eims/bulk",
    "/eims/receipts",
    "/eims/buyers",
    "/eims/compliance",
    "/admin/eims",
    "/admin/eims/tenants",
    "/admin/eims/failures",
    "/admin/eims/certificates",
    "/admin/eims/resources",
    "/admin/eims/compliance"
  ],
  "addsModels": [
    "EimsCredential",
    "EimsCertificate",
    "EimsSource",
    "EimsSubmission",
    "EimsSubmissionQueue",
    "EimsCancellation",
    "EimsReceipt",
    "TenantBuyer",
    "EimsAuditEvent",
    "EimsNotificationLog"
  ],
  "addsPermissions": [
    "eims:read",
    "eims:write",
    "eims:configure",
    "eims:submit",
    "eims:cancel",
    "eims:admin"
  ],
  "addsEnvVars": [
    "EIMS_API_URL",
    "EIMS_SANDBOX_URL",
    "EIMS_TIMEOUT_MS",
    "EIMS_MAX_RETRIES",
    "EIMS_INSA_EMAIL",
    "EIMS_NOTIFICATION_EMAILS"
  ],
  "addsDependencies": {
    "@yourcompany/eims-sdk": "^0.1.0"
  },
  "addsDevDependencies": {},
  "addsSeedData": [
    "eims-transaction-types",
    "eims-document-types",
    "eims-cancel-reason-codes",
    "eims-payment-modes",
    "eims-unit-of-measure-codes",
    "eims-tax-codes"
  ],
  "addsCrons": [
    "certificate-expiry-daily",
    "retry-queued-submissions-every-5min",
    "cleanup-stale-queue-weekly"
  ],
  "addsQueues": [
    "eims-submission-retry",
    "eims-bulk-callback"
  ]
}
```

---

## 4. The Prisma models snippet

`packages/cli/starters/eims/prisma/models.prisma.snippet`:

```prisma
// ====================================================================
// EIMS / EIRMS Models
// ====================================================================

enum EimsSourceStatus {
  PENDING
  APPROVED
  REJECTED
  SUSPENDED
}

enum EimsSubmissionStatus {
  PENDING
  REGISTERED
  FAILED
  RETRYING
  CANCELLED
}

enum EimsCertificateStatus {
  ACTIVE
  EXPIRING
  EXPIRED
  REVOKED
}

model EimsCredential {
  id                   String       @id @default(cuid())
  organizationId       String
  organization         Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  tin                  String
  systemNumber         String
  clientId             String
  clientSecretEnc      String       // AES-256-GCM
  apiKeyEnc            String       // AES-256-GCM

  isActive             Boolean      @default(true)
  approvedAt           DateTime?
  lastUsedAt           DateTime?

  createdAt            DateTime     @default(now())
  updatedAt            DateTime     @updatedAt
  createdByUserId      String?

  certificates         EimsCertificate[]
  submissions          EimsSubmission[]
  source               EimsSource?

  @@unique([organizationId, tin, systemNumber])
  @@index([organizationId])
  @@index([tin])
}

model EimsCertificate {
  id                   String       @id @default(cuid())
  organizationId       String
  organization         Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  credentialId         String
  credential           EimsCredential @relation(fields: [credentialId], references: [id], onDelete: Cascade)

  certificatePem       String       @db.Text
  privateKeyEnc        String       @db.Text   // AES-256-GCM
  csrPem               String?      @db.Text

  subjectCn            String       // TIN
  subjectO             String       // org legal name
  serialNumber         String
  issuerCn             String

  validFrom            DateTime
  validUntil           DateTime
  status               EimsCertificateStatus @default(ACTIVE)

  isActive             Boolean      @default(true)

  createdAt            DateTime     @default(now())
  updatedAt            DateTime     @updatedAt

  @@index([organizationId])
  @@index([validUntil])
  @@index([status])
}

model EimsSource {
  id                   String       @id @default(cuid())
  organizationId       String
  organization         Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  credentialId         String       @unique
  credential           EimsCredential @relation(fields: [credentialId], references: [id], onDelete: Cascade)

  systemType           String       // POS, ERP, CRM, MAN
  systemNumber         String
  model                String?
  manufacturer         String?
  softwareVersion      String?
  machineRegNo         String?
  permitNo             String?

  establishmentId      String?
  establishmentName    String?

  status               EimsSourceStatus @default(PENDING)
  approvedAt           DateTime?
  rejectedAt           DateTime?
  rejectionReason      String?

  createdAt            DateTime     @default(now())
  updatedAt            DateTime     @updatedAt

  @@index([organizationId])
  @@index([status])
}

model TenantBuyer {
  id                   String       @id @default(cuid())
  organizationId       String
  organization         Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  tin                  String?
  subTin               String?
  vatNumber            String?
  legalName            String
  tradeName            String?
  email                String?
  phone                String?

  isGovernment         Boolean      @default(false)
  isVatRegistered      Boolean      @default(false)

  country              String?
  region               String?
  zone                 String?
  city                 String?
  subCity              String?
  woreda               String?
  kebele               String?
  houseNumber          String?

  isActive             Boolean      @default(true)

  createdAt            DateTime     @default(now())
  updatedAt            DateTime     @updatedAt

  @@unique([organizationId, tin])
  @@index([organizationId])
  @@index([tin])
  @@index([legalName])
}

model EimsSubmission {
  id                   String       @id @default(cuid())
  organizationId       String
  organization         Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  credentialId         String?
  credential           EimsCredential? @relation(fields: [credentialId], references: [id])

  irn                  String?      @unique
  documentNumber       String
  documentType         String
  transactionType      String

  sellerTin            String
  buyerTin             String?
  totalAmount          BigInt       // minor units, e.g. santim
  taxAmount            BigInt
  currency             String       @default("ETB")

  status               EimsSubmissionStatus @default(PENDING)
  signedQR             String?      @db.Text
  signedInvoice        String?      @db.Text
  errorCode            String?
  errorMessage         String?

  submittedAt          DateTime?
  registeredAt         DateTime?
  ackDate              String?

  correlationId        String?
  payloadJson          Json
  responseJson         Json?

  submittedByUserId    String?

  createdAt            DateTime     @default(now())
  updatedAt            DateTime     @updatedAt

  cancellation         EimsCancellation?
  receipts             EimsReceipt[]

  @@index([organizationId])
  @@index([irn])
  @@index([status])
  @@index([documentNumber])
  @@index([submittedAt])
}

model EimsSubmissionQueue {
  id                   String       @id @default(cuid())
  organizationId       String
  organization         Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  payloadJson          Json
  attempts             Int          @default(0)
  maxAttempts          Int          @default(10)
  lastAttemptAt        DateTime?
  lastError            String?
  nextAttemptAt        DateTime?

  status               String       @default("PENDING")  // PENDING, PROCESSING, FAILED, COMPLETED
  resultSubmissionId   String?

  createdAt            DateTime     @default(now())
  updatedAt            DateTime     @updatedAt

  @@index([organizationId])
  @@index([status, nextAttemptAt])
}

model EimsCancellation {
  id                   String       @id @default(cuid())
  organizationId       String
  organization         Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  submissionId         String       @unique
  submission           EimsSubmission @relation(fields: [submissionId], references: [id], onDelete: Cascade)

  irn                  String
  reasonCode           String
  remark               String?

  cancelledAt          DateTime?
  status               String       @default("PENDING")
  errorMessage         String?

  cancelledByUserId    String?

  createdAt            DateTime     @default(now())
  updatedAt            DateTime     @updatedAt

  @@index([organizationId])
  @@index([irn])
}

model EimsReceipt {
  id                   String       @id @default(cuid())
  organizationId       String
  organization         Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  submissionId         String
  submission           EimsSubmission @relation(fields: [submissionId], references: [id], onDelete: Cascade)

  receiptNumber        String
  receiptType          String       // sales, withholding
  amount               BigInt
  paymentMode          String

  irn                  String?
  signedQR             String?      @db.Text
  signedReceipt        String?      @db.Text
  status               String       @default("PENDING")

  createdAt            DateTime     @default(now())
  updatedAt            DateTime     @updatedAt

  @@index([organizationId])
  @@index([submissionId])
}

model EimsAuditEvent {
  id                   String       @id @default(cuid())
  organizationId       String
  organization         Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  eventType            String       // submit, cancel, verify, etc.
  resourceType         String?
  resourceId           String?
  userId               String?

  payloadHash          String       // SHA256 of redacted payload
  responseStatus       Int?

  correlationId        String?
  ipAddress            String?
  userAgent            String?

  createdAt            DateTime     @default(now())

  @@index([organizationId, createdAt])
  @@index([eventType])
  @@index([correlationId])
}

model EimsNotificationLog {
  id                   String       @id @default(cuid())
  organizationId       String
  organization         Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  type                 String       // cert-expiring, submission-failed, etc.
  channel              String       // email, in-app
  recipient            String
  payload              Json
  sentAt               DateTime?
  status               String       @default("PENDING")

  createdAt            DateTime     @default(now())

  @@index([organizationId])
  @@index([type])
}
```

Plus add the back-references to Organization:

```prisma
model Organization {
  // ... existing fields ...

  eimsCredentials      EimsCredential[]
  eimsCertificates     EimsCertificate[]
  eimsSources          EimsSource[]
  eimsSubmissions      EimsSubmission[]
  eimsSubmissionQueue  EimsSubmissionQueue[]
  eimsCancellations    EimsCancellation[]
  eimsReceipts         EimsReceipt[]
  eimsAuditEvents      EimsAuditEvent[]
  eimsNotificationLogs EimsNotificationLog[]
  tenantBuyers         TenantBuyer[]
}
```

The installer appends the model definitions and patches the Organization back-references using a marker-based patch (`// EIMS_BACK_REFS_START` / `// EIMS_BACK_REFS_END`).

---

## 5. NestJS module structure

`packages/cli/starters/eims/api/eims.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bullmq';
import { EimsModule as SdkModule } from '@yourcompany/eims-sdk/nestjs';

// Controllers
import { EimsSetupController } from './presentation/controllers/eims-setup.controller';
import { EimsCredentialsController } from './presentation/controllers/eims-credentials.controller';
import { EimsCertificatesController } from './presentation/controllers/eims-certificates.controller';
import { EimsSourcesController } from './presentation/controllers/eims-sources.controller';
import { EimsSubmissionsController } from './presentation/controllers/eims-submissions.controller';
import { EimsCancellationsController } from './presentation/controllers/eims-cancellations.controller';
import { EimsBulkController } from './presentation/controllers/eims-bulk.controller';
import { EimsReceiptsController } from './presentation/controllers/eims-receipts.controller';
import { EimsBuyersController } from './presentation/controllers/eims-buyers.controller';
import { EimsComplianceController } from './presentation/controllers/eims-compliance.controller';
import { AdminEimsController } from './presentation/controllers/admin-eims.controller';

// Command handlers
import { StoreCredentialsHandler } from './application/commands/store-credentials/store-credentials.handler';
import { UploadCertificateHandler } from './application/commands/upload-certificate/upload-certificate.handler';
import { GenerateCsrHandler } from './application/commands/generate-csr/generate-csr.handler';
import { RegisterSourceHandler } from './application/commands/register-source/register-source.handler';
import { SubmitInvoiceHandler } from './application/commands/submit-invoice/submit-invoice.handler';
import { CancelInvoiceHandler } from './application/commands/cancel-invoice/cancel-invoice.handler';
import { SubmitBulkHandler } from './application/commands/submit-bulk/submit-bulk.handler';
import { SubmitReceiptHandler } from './application/commands/submit-receipt/submit-receipt.handler';
import { RetryQueuedSubmissionHandler } from './application/commands/retry-queued-submission/retry-queued-submission.handler';

// Query handlers
import { ListSubmissionsHandler } from './application/queries/list-submissions.handler';
import { GetSubmissionHandler } from './application/queries/get-submission.handler';
import { VerifyInvoiceHandler } from './application/queries/verify-invoice.handler';
import { CheckComplianceHandler } from './application/queries/check-compliance.handler';
import { GetComplianceStatusHandler } from './application/queries/get-compliance-status.handler';
import { ListCancellationsHandler } from './application/queries/list-cancellations.handler';
import { ListBuyersHandler } from './application/queries/list-buyers.handler';

// Services
import { EimsTenantConfigService } from './application/services/eims-tenant-config.service';
import { CredentialCipherService } from './application/services/credential-cipher.service';
import { CertificateParserService } from './application/services/certificate-parser.service';
import { CertificateLifecycleService } from './application/services/certificate-lifecycle.service';
import { CsrGeneratorService } from './application/services/csr-generator.service';
import { InvoiceBuilderService } from './application/services/invoice-builder.service';
import { ComplianceCheckerService } from './application/services/compliance-checker.service';
import { OfflineQueueService } from './application/services/offline-queue.service';

// Infrastructure
import { EimsSdkAdapter } from './infrastructure/adapters/eims-sdk.adapter';
import { CertificateExpiryCron } from './infrastructure/crons/certificate-expiry.cron';
import { RetryQueuedSubmissionsCron } from './infrastructure/crons/retry-queued-submissions.cron';
import { CleanupStaleQueueCron } from './infrastructure/crons/cleanup-stale-queue.cron';
import { EimsSubmissionProcessor } from './infrastructure/queue/eims-submission.processor';

// Repositories (Prisma implementations)
import { PrismaEimsCredentialRepository } from './infrastructure/repositories/prisma-eims-credential.repository';
import { PrismaEimsCertificateRepository } from './infrastructure/repositories/prisma-eims-certificate.repository';
// ... etc

const commandHandlers = [
  StoreCredentialsHandler,
  UploadCertificateHandler,
  GenerateCsrHandler,
  RegisterSourceHandler,
  SubmitInvoiceHandler,
  CancelInvoiceHandler,
  SubmitBulkHandler,
  SubmitReceiptHandler,
  RetryQueuedSubmissionHandler,
];

const queryHandlers = [
  ListSubmissionsHandler,
  GetSubmissionHandler,
  VerifyInvoiceHandler,
  CheckComplianceHandler,
  GetComplianceStatusHandler,
  ListCancellationsHandler,
  ListBuyersHandler,
];

const services = [
  EimsTenantConfigService,
  CredentialCipherService,
  CertificateParserService,
  CertificateLifecycleService,
  CsrGeneratorService,
  InvoiceBuilderService,
  ComplianceCheckerService,
  OfflineQueueService,
];

const repositories = [
  { provide: 'EimsCredentialRepository', useClass: PrismaEimsCredentialRepository },
  { provide: 'EimsCertificateRepository', useClass: PrismaEimsCertificateRepository },
  // ... etc
];

@Module({
  imports: [
    CqrsModule,
    ScheduleModule.forRoot(),
    BullModule.registerQueue(
      { name: 'eims-submission-retry' },
      { name: 'eims-bulk-callback' },
    ),
    SdkModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        endpoint: config.getOrThrow('EIMS_API_URL'),
        timeoutMs: config.get('EIMS_TIMEOUT_MS', 30000),
        maxRetries: config.get('EIMS_MAX_RETRIES', 3),
      }),
    }),
  ],
  controllers: [
    EimsSetupController,
    EimsCredentialsController,
    EimsCertificatesController,
    EimsSourcesController,
    EimsSubmissionsController,
    EimsCancellationsController,
    EimsBulkController,
    EimsReceiptsController,
    EimsBuyersController,
    EimsComplianceController,
    AdminEimsController,
  ],
  providers: [
    ...commandHandlers,
    ...queryHandlers,
    ...services,
    ...repositories,
    EimsSdkAdapter,
    CertificateExpiryCron,
    RetryQueuedSubmissionsCron,
    CleanupStaleQueueCron,
    EimsSubmissionProcessor,
  ],
  exports: [
    EimsTenantConfigService,
    EimsSdkAdapter,
    InvoiceBuilderService,
  ],
})
export class EimsModule {}
```

---

## 6. Frontend route structure

### 6.1 Tenant routes

Every route uses TanStack Router file-based routing, TanStack Query for all data, TanStack Table for all tables.

`apps/web/src/routes/_authenticated/eims/index.tsx` — main dashboard:

```typescript
import { createFileRoute } from '@tanstack/react-router';
import { PageHeader } from '@/shared/components/PageHeader';
import { ComplianceDashboard } from '@/features/eims/components/compliance/ComplianceDashboard';
import { useEimsCompliance } from '@/features/eims/api/eims-compliance.hooks';

export const Route = createFileRoute('/_authenticated/eims/')({
  component: EimsDashboard,
});

function EimsDashboard() {
  const { data, isLoading } = useEimsCompliance();
  return (
    <>
      <PageHeader
        title="EIMS Compliance"
        description="Your e-invoice integration status with the Ministry of Revenue"
      />
      <ComplianceDashboard data={data} isLoading={isLoading} />
    </>
  );
}
```

`apps/web/src/routes/_authenticated/eims/submissions.tsx` — submissions table:

```typescript
import { createFileRoute } from '@tanstack/react-router';
import { SubmissionsTable } from '@/features/eims/components/submissions/SubmissionsTable';

export const Route = createFileRoute('/_authenticated/eims/submissions')({
  component: () => <SubmissionsTable />,
});
```

The actual table component is detailed in section 7.

### 6.2 Admin routes

`apps/web/src/routes/admin/eims/tenants.tsx` — cross-tenant submission health:

```typescript
import { createFileRoute } from '@tanstack/react-router';
import { TenantsHealthTable } from '@/features/eims/components/admin/TenantsHealthTable';

export const Route = createFileRoute('/admin/eims/tenants')({
  component: () => <TenantsHealthTable />,
});
```

---

## 7. The professional data table component

This is shared base infrastructure but the EIMS pack uses it heavily. The base template provides:

`apps/web/src/shared/components/DataTable/DataTable.tsx`:

```typescript
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  type PaginationState,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useState, useRef, useMemo } from 'react';
import { useDebouncedValue } from '@/shared/hooks/use-debounced-value';

interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  totalCount: number;
  pagination: PaginationState;
  onPaginationChange: (state: PaginationState) => void;
  sorting: SortingState;
  onSortingChange: (state: SortingState) => void;
  filters: ColumnFiltersState;
  onFiltersChange: (state: ColumnFiltersState) => void;
  globalFilter: string;
  onGlobalFilterChange: (filter: string) => void;
  isLoading?: boolean;
  emptyState?: React.ReactNode;
  virtualizeRows?: boolean;
  bulkActions?: BulkAction[];
  exportable?: boolean;
  savedViewsKey?: string;
}

export function DataTable<T>({
  columns,
  data,
  totalCount,
  pagination,
  onPaginationChange,
  sorting,
  onSortingChange,
  filters,
  onFiltersChange,
  globalFilter,
  onGlobalFilterChange,
  isLoading,
  emptyState,
  virtualizeRows = false,
  bulkActions,
  exportable,
  savedViewsKey,
}: DataTableProps<T>) {
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const debouncedSearch = useDebouncedValue(globalFilter, 300);

  const table = useReactTable({
    data,
    columns,
    pageCount: Math.ceil(totalCount / pagination.pageSize),
    state: { sorting, columnFilters: filters, pagination, globalFilter: debouncedSearch },
    onSortingChange,
    onColumnFiltersChange: onFiltersChange,
    onPaginationChange,
    onGlobalFilterChange,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
  });

  const rows = table.getRowModel().rows;

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 48,
    overscan: 10,
    enabled: virtualizeRows,
  });

  return (
    <div className="flex flex-col gap-4">
      {/* Top toolbar — search, filters, export, bulk actions */}
      <DataTableToolbar
        table={table}
        globalFilter={globalFilter}
        onGlobalFilterChange={onGlobalFilterChange}
        bulkActions={bulkActions}
        exportable={exportable}
        savedViewsKey={savedViewsKey}
      />

      {/* Table */}
      <div
        ref={tableContainerRef}
        className="relative overflow-auto rounded-md border"
        style={{ maxHeight: virtualizeRows ? '600px' : undefined }}
      >
        <table className="w-full">
          <thead className="sticky top-0 z-10 bg-card">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <DataTableHeaderCell key={header.id} header={header} />
                ))}
              </tr>
            ))}
            {/* Column filter row */}
            <tr>
              {table.getHeaderGroups()[0].headers.map((header) => (
                <DataTableColumnFilter key={header.id} header={header} />
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <DataTableLoadingRows columnCount={columns.length} />
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length}>
                  {emptyState ?? <DefaultEmptyState />}
                </td>
              </tr>
            ) : virtualizeRows ? (
              <>
                <tr style={{ height: rowVirtualizer.getVirtualItems()[0]?.start ?? 0 }} />
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                  const row = rows[virtualRow.index];
                  return (
                    <tr key={row.id} data-index={virtualRow.index}>
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  );
                })}
                <tr
                  style={{
                    height:
                      rowVirtualizer.getTotalSize() -
                      (rowVirtualizer.getVirtualItems().at(-1)?.end ?? 0),
                  }}
                />
              </>
            ) : (
              rows.map((row) => (
                <tr key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination footer with << < > >> and rows per page */}
      <DataTablePagination table={table} totalCount={totalCount} />
    </div>
  );
}
```

### 7.1 The pagination component

`apps/web/src/shared/components/DataTable/DataTablePagination.tsx`:

```typescript
import { ChevronFirst, ChevronLast, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function DataTablePagination<T>({ table, totalCount }: Props<T>) {
  const { pageIndex, pageSize } = table.getState().pagination;
  const pageCount = table.getPageCount();
  const start = pageIndex * pageSize + 1;
  const end = Math.min((pageIndex + 1) * pageSize, totalCount);

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="text-sm text-muted-foreground">
        Showing {start.toLocaleString()} to {end.toLocaleString()} of {totalCount.toLocaleString()}
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Rows per page</span>
          <Select
            value={String(pageSize)}
            onValueChange={(v) => table.setPageSize(Number(v))}
          >
            <SelectTrigger className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[10, 20, 50, 100].map((n) => (
                <SelectItem key={n} value={String(n)}>{n}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="text-sm">
          Page <strong>{pageIndex + 1}</strong> of <strong>{pageCount}</strong>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
            aria-label="First page"
          >
            <ChevronFirst className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => table.setPageIndex(pageCount - 1)}
            disabled={!table.getCanNextPage()}
            aria-label="Last page"
          >
            <ChevronLast className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
```

This gives you the `<<  <  >  >>` controls plus page X of Y, rows per page selector, and total count. All standard, all expected.

### 7.2 The toolbar

`apps/web/src/shared/components/DataTable/DataTableToolbar.tsx`:

```typescript
export function DataTableToolbar<T>({
  table,
  globalFilter,
  onGlobalFilterChange,
  bulkActions,
  exportable,
  savedViewsKey,
}: Props<T>) {
  const selectedRowCount = table.getSelectedRowModel().rows.length;

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-2 flex-1">
        {/* Global search */}
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={globalFilter}
            onChange={(e) => onGlobalFilterChange(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Active filter chips */}
        <DataTableActiveFilters table={table} />

        {/* Reset filters */}
        {(table.getState().columnFilters.length > 0 || globalFilter) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              table.resetColumnFilters();
              onGlobalFilterChange('');
            }}
          >
            Reset
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* Bulk actions when rows selected */}
        {bulkActions && selectedRowCount > 0 && (
          <DataTableBulkActionsMenu
            count={selectedRowCount}
            actions={bulkActions}
            selectedRows={table.getSelectedRowModel().rows.map((r) => r.original)}
          />
        )}

        {/* Saved views */}
        {savedViewsKey && <DataTableSavedViews table={table} viewKey={savedViewsKey} />}

        {/* Column visibility */}
        <DataTableColumnVisibility table={table} />

        {/* Export */}
        {exportable && <DataTableExportMenu table={table} />}
      </div>
    </div>
  );
}
```

### 7.3 The header cell with sort + filter

`apps/web/src/shared/components/DataTable/DataTableHeaderCell.tsx`:

```typescript
export function DataTableHeaderCell({ header }) {
  const canSort = header.column.getCanSort();
  const sortDirection = header.column.getIsSorted();

  return (
    <th className="px-3 py-2 text-left text-sm font-medium">
      {canSort ? (
        <button
          className="flex items-center gap-1 hover:text-foreground"
          onClick={header.column.getToggleSortingHandler()}
        >
          {flexRender(header.column.columnDef.header, header.getContext())}
          {sortDirection === 'asc' && <ArrowUp className="h-3 w-3" />}
          {sortDirection === 'desc' && <ArrowDown className="h-3 w-3" />}
          {!sortDirection && <ArrowUpDown className="h-3 w-3 opacity-50" />}
        </button>
      ) : (
        flexRender(header.column.columnDef.header, header.getContext())
      )}
    </th>
  );
}
```

### 7.4 The per-column filter row

`apps/web/src/shared/components/DataTable/DataTableColumnFilter.tsx`:

```typescript
export function DataTableColumnFilter({ header }) {
  const filterConfig = header.column.columnDef.meta?.filter;
  if (!filterConfig) return <td />;

  switch (filterConfig.type) {
    case 'text':
      return (
        <td className="px-3 py-1">
          <Input
            placeholder={`Filter ${header.column.id}`}
            value={(header.column.getFilterValue() ?? '') as string}
            onChange={(e) => header.column.setFilterValue(e.target.value)}
            className="h-8"
          />
        </td>
      );
    case 'select':
      return (
        <td className="px-3 py-1">
          <Select
            value={(header.column.getFilterValue() ?? '') as string}
            onValueChange={(v) => header.column.setFilterValue(v || undefined)}
          >
            <SelectTrigger className="h-8"><SelectValue placeholder="All" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">All</SelectItem>
              {filterConfig.options.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </td>
      );
    case 'date-range':
      return <td><DateRangeFilter column={header.column} /></td>;
    case 'number-range':
      return <td><NumberRangeFilter column={header.column} /></td>;
    default:
      return <td />;
  }
}
```

### 7.5 Usage in EIMS submissions

`apps/web/src/features/eims/components/submissions/SubmissionsTable.tsx`:

```typescript
import { useState } from 'react';
import { DataTable } from '@/shared/components/DataTable/DataTable';
import { useEimsSubmissions } from '@/features/eims/api/eims-submissions.hooks';
import { columns } from './submissions-columns';

export function SubmissionsTable() {
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 });
  const [sorting, setSorting] = useState([{ id: 'submittedAt', desc: true }]);
  const [filters, setFilters] = useState([]);
  const [globalFilter, setGlobalFilter] = useState('');

  const { data, isLoading } = useEimsSubmissions({
    page: pagination.pageIndex + 1,
    limit: pagination.pageSize,
    sort: sorting[0],
    filters,
    search: globalFilter,
  });

  return (
    <DataTable
      columns={columns}
      data={data?.data ?? []}
      totalCount={data?.meta?.total ?? 0}
      pagination={pagination}
      onPaginationChange={setPagination}
      sorting={sorting}
      onSortingChange={setSorting}
      filters={filters}
      onFiltersChange={setFilters}
      globalFilter={globalFilter}
      onGlobalFilterChange={setGlobalFilter}
      isLoading={isLoading}
      virtualizeRows={pagination.pageSize >= 100}
      exportable
      savedViewsKey="eims-submissions"
      bulkActions={[
        { label: 'Resubmit selected', action: handleBulkResubmit, icon: RefreshCw },
        { label: 'Mark as reviewed', action: handleBulkReview, icon: Check },
      ]}
    />
  );
}
```

And the columns file:

```typescript
import type { ColumnDef } from '@tanstack/react-table';
import type { EimsSubmission } from '../types/submission.types';

export const columns: ColumnDef<EimsSubmission>[] = [
  {
    id: 'select',
    header: ({ table }) => <Checkbox checked={table.getIsAllRowsSelected()} onCheckedChange={(v) => table.toggleAllRowsSelected(!!v)} />,
    cell: ({ row }) => <Checkbox checked={row.getIsSelected()} onCheckedChange={(v) => row.toggleSelected(!!v)} />,
    enableSorting: false,
  },
  {
    accessorKey: 'documentNumber',
    header: 'Document #',
    cell: ({ getValue }) => <span className="font-mono text-sm">{getValue() as string}</span>,
    meta: { filter: { type: 'text' } },
  },
  {
    accessorKey: 'irn',
    header: 'IRN',
    cell: ({ getValue }) => <IrnDisplay irn={getValue() as string} />,
    meta: { filter: { type: 'text' } },
  },
  {
    accessorKey: 'transactionType',
    header: 'Type',
    cell: ({ getValue }) => <Badge>{getValue() as string}</Badge>,
    meta: {
      filter: {
        type: 'select',
        options: [
          { value: 'B2B', label: 'B2B' },
          { value: 'B2C', label: 'B2C' },
          { value: 'B2G', label: 'B2G' },
          { value: 'G2B', label: 'G2B' },
          { value: 'G2C', label: 'G2C' },
        ],
      },
    },
  },
  {
    accessorKey: 'totalAmount',
    header: 'Total',
    cell: ({ row }) => <MoneyDisplay value={row.original.totalAmount} currency={row.original.currency} />,
    meta: { filter: { type: 'number-range' } },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ getValue }) => <SubmissionStatusBadge status={getValue() as string} />,
    meta: {
      filter: {
        type: 'select',
        options: [
          { value: 'PENDING', label: 'Pending' },
          { value: 'REGISTERED', label: 'Registered' },
          { value: 'FAILED', label: 'Failed' },
          { value: 'RETRYING', label: 'Retrying' },
          { value: 'CANCELLED', label: 'Cancelled' },
        ],
      },
    },
  },
  {
    accessorKey: 'submittedAt',
    header: 'Submitted',
    cell: ({ getValue }) => <RelativeTime date={getValue() as Date} />,
    meta: { filter: { type: 'date-range' } },
  },
  {
    id: 'actions',
    cell: ({ row }) => <SubmissionRowActions submission={row.original} />,
    enableSorting: false,
  },
];
```

Result: a table with global search at top, per-column filters below headers, sortable columns, `<< < > >>` pagination, page X of Y, rows-per-page selector, column visibility toggle, saved views, export, bulk actions, virtualization when >100 rows. Every feature you expect.

---

## 8. TanStack Query as the default

The template should mandate TanStack Query for all server state. Every API hook in the pack follows this pattern:

`apps/web/src/features/eims/api/eims-submissions.hooks.ts`:

```typescript
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { apiClient } from '@/shared/lib/api-client';

const submissionsKeys = {
  all: ['eims', 'submissions'] as const,
  lists: () => [...submissionsKeys.all, 'list'] as const,
  list: (params: ListParams) => [...submissionsKeys.lists(), params] as const,
  details: () => [...submissionsKeys.all, 'detail'] as const,
  detail: (id: string) => [...submissionsKeys.details(), id] as const,
};

export function useEimsSubmissions(params: ListParams) {
  return useQuery({
    queryKey: submissionsKeys.list(params),
    queryFn: () => apiClient.get('/eims/submissions', { params }),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

export function useEimsSubmission(id: string) {
  return useQuery({
    queryKey: submissionsKeys.detail(id),
    queryFn: () => apiClient.get(`/eims/submissions/${id}`),
    enabled: !!id,
  });
}

export function useSubmitInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (invoice: CanonicalInvoice) =>
      apiClient.post('/eims/submissions', invoice),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: submissionsKeys.lists() });
    },
  });
}

export function useResubmit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.post(`/eims/submissions/${id}/resubmit`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: submissionsKeys.all });
    },
  });
}
```

Standardize the **query key factory pattern** — every feature follows it. Predictable, testable, type-safe invalidation.

Default `QueryClient` config in the base template:

```typescript
// apps/web/src/main.tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      retry: (failureCount, error) => {
        if (error?.response?.status === 404) return false;
        if (error?.response?.status === 401) return false;
        return failureCount < 3;
      },
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
});
```

---

## 9. Test conventions for the EIMS module

Match what your base template already has. Every command handler ships with:

```
application/commands/submit-invoice/
|-- submit-invoice.command.ts
|-- submit-invoice.handler.ts
|-- submit-invoice.handler.spec.ts           # unit
|-- submit-invoice.handler.integration.ts    # integration with real db
`-- submit-invoice.handler.property.ts       # property-based for edge cases
```

Plus e2e tests in `apps/api-tests/`:

```
apps/api-tests/eims/
|-- setup.e2e.ts
|-- submit-invoice.e2e.ts
|-- cancel-invoice.e2e.ts
|-- tenant-isolation.e2e.ts
|-- permissions.e2e.ts
|-- offline-queue.e2e.ts
`-- certificate-lifecycle.e2e.ts
```

### 9.1 Mutation testing

You mentioned you have mutation testing. Apply Stryker to the EIMS module:

`stryker.conf.json` (in apps/api or apps/api-tests):

```json
{
  "$schema": "./node_modules/@stryker-mutator/core/schema/stryker-schema.json",
  "packageManager": "pnpm",
  "testRunner": "vitest",
  "reporters": ["html", "clear-text", "progress"],
  "mutate": [
    "src/modules/eims/application/commands/**/*.ts",
    "src/modules/eims/application/services/**/*.ts",
    "!src/modules/eims/**/*.spec.ts",
    "!src/modules/eims/**/*.test.ts"
  ],
  "thresholds": { "high": 80, "low": 60, "break": 50 },
  "timeoutMS": 60000
}
```

Run nightly. Mutation score below 50 fails CI. This catches tests that pass but don't actually verify behavior.

### 9.2 Browser E2E tests

```
apps/e2e/eims/
|-- setup-wizard.spec.ts            # full wizard click-through
|-- submit-invoice.spec.ts          # end-to-end with mock EIMS
|-- view-submissions-table.spec.ts  # pagination, search, filter
|-- export-submissions.spec.ts
`-- compliance-dashboard.spec.ts
```

### 9.3 Acceptance tests (Cucumber)

```
apps/acceptance/features/eims/
|-- setup.feature
|-- submit-invoice.feature
|-- cancel-invoice.feature
|-- offline-mode.feature
`-- compliance.feature
```

Example:

```gherkin
Feature: Tenant submits invoice to EIMS
  Scenario: Successful submission
    Given a tenant with active EIMS credentials and certificate
    When the cashier issues a B2C invoice for 350 ETB
    Then the invoice is registered in EIMS
    And an IRN is returned and stored
    And the QR code is printed on the receipt
```

### 9.4 Performance tests

```
apps/performance/eims/
|-- submission-throughput.js        # 100 invoices/second per tenant
|-- bulk-upload.js                  # 10,000-invoice bulk file
`-- concurrent-tenants.js           # 50 tenants submitting in parallel
```

### 9.5 Security tests

```
apps/security/eims/
|-- credential-encryption.spec.ts   # verify ciphertext, not plaintext, in DB
|-- tenant-isolation.spec.ts        # verify tenant A can't read tenant B's data
|-- certificate-validation.spec.ts  # invalid cert rejected
|-- signature-tampering.spec.ts     # tampered payload rejected
`-- credential-redaction.spec.ts    # secrets never appear in logs
```

---

## 10. The installer script

`packages/cli/starters/eims/install.js`:

```javascript
import fs from 'node:fs/promises';
import path from 'node:path';
import { execa } from 'execa';
import {
  copyDir,
  appendFile,
  patchFile,
  loadPackMetadata,
  recordInstallStep,
} from '../../src/installer-utils.js';

export async function installEimsStarter(projectRoot, options = {}) {
  console.log('Installing EIMS starter pack...');

  const pack = await loadPackMetadata(import.meta.url);
  const packDir = path.dirname(new URL(import.meta.url).pathname);

  // 1. Copy API module
  await copyDir(
    path.join(packDir, 'api'),
    path.join(projectRoot, 'apps/api/src/modules/eims'),
  );
  recordInstallStep('copy:api');

  // 2. Copy web feature
  await copyDir(
    path.join(packDir, 'web'),
    path.join(projectRoot, 'apps/web/src/features/eims'),
  );
  recordInstallStep('copy:web');

  // 3. Copy web routes
  await copyDir(
    path.join(packDir, 'web-routes'),
    path.join(projectRoot, 'apps/web/src/routes/_authenticated/eims'),
  );
  await copyDir(
    path.join(packDir, 'web-admin-routes'),
    path.join(projectRoot, 'apps/web/src/routes/admin/eims'),
  );
  recordInstallStep('copy:routes');

  // 4. Append Prisma models
  const modelsSnippet = await fs.readFile(
    path.join(packDir, 'prisma/models.prisma.snippet'),
    'utf8',
  );
  await appendFile(
    path.join(projectRoot, 'apps/api/prisma/schema.prisma'),
    `\n// ===== EIMS_START =====\n${modelsSnippet}\n// ===== EIMS_END =====\n`,
  );
  recordInstallStep('append:prisma');

  // 5. Patch AppModule
  await patchFile(
    path.join(projectRoot, 'apps/api/src/app.module.ts'),
    path.join(packDir, 'snippets/app-module-imports.snippet.ts'),
    { marker: '// MODULES_END', position: 'before' },
  );

  // 6. Patch permissions
  await patchFile(
    path.join(projectRoot, 'apps/api/src/modules/auth/permissions.ts'),
    path.join(packDir, 'snippets/permissions.snippet.ts'),
    { marker: '// PERMISSIONS_END', position: 'before' },
  );

  // 7. Patch sidebar
  await patchFile(
    path.join(projectRoot, 'apps/web/src/shared/navigation/registry.ts'),
    path.join(packDir, 'snippets/sidebar.snippet.ts'),
    { marker: '// NAV_END', position: 'before' },
  );

  // 8. Patch i18n
  await patchFile(
    path.join(projectRoot, 'apps/web/src/shared/i18n/locales/en.ts'),
    path.join(packDir, 'snippets/i18n-en.snippet.ts'),
    { marker: '// I18N_END', position: 'before' },
  );
  await patchFile(
    path.join(projectRoot, 'apps/web/src/shared/i18n/locales/am.ts'),
    path.join(packDir, 'snippets/i18n-am.snippet.ts'),
    { marker: '// I18N_END', position: 'before' },
  );

  // 9. Append env vars
  const envSnippet = await fs.readFile(path.join(packDir, 'snippets/env.snippet'), 'utf8');
  await appendFile(path.join(projectRoot, '.env.example'), `\n${envSnippet}\n`);

  // 10. Append seed
  await patchFile(
    path.join(projectRoot, 'apps/api/prisma/seed.ts'),
    path.join(packDir, 'snippets/seed.snippet.ts'),
    { marker: '// SEED_END', position: 'before' },
  );

  // 11. Copy docs
  await copyDir(
    path.join(packDir, 'docs'),
    path.join(projectRoot, 'docs'),
  );

  // 12. Add dependency
  await execa('pnpm', ['add', '@yourcompany/eims-sdk@^0.1.0'], {
    cwd: path.join(projectRoot, 'apps/api'),
    stdio: 'inherit',
  });

  // 13. Generate Prisma client
  if (!options.skipDbGenerate) {
    await execa('pnpm', ['db:generate'], { cwd: projectRoot, stdio: 'inherit' });
  }

  // 14. Save install state
  await saveInstallState(projectRoot, pack);

  console.log('\nEIMS starter pack installed.\n');
  console.log('Next steps:');
  console.log('  1. Run `pnpm db:migrate` to apply new database tables');
  console.log('  2. Set `EIMS_API_URL` in your .env');
  console.log('  3. Restart `pnpm dev` and visit /eims to begin setup');
}
```

The uninstaller reverses each `recordInstallStep` in reverse order.

---

## 11. Environment variables added to .env.example

```bash
# ===== EIMS_START =====
# Endpoint for the Ministry of Revenue EIMS API
EIMS_API_URL=https://eims-sandbox.mor.gov.et
EIMS_SANDBOX_URL=https://eims-sandbox.mor.gov.et

# SDK behavior
EIMS_TIMEOUT_MS=30000
EIMS_MAX_RETRIES=3

# Notification destinations
EIMS_INSA_EMAIL=ica@insa.gov.et
EIMS_NOTIFICATION_EMAILS=admin@yourcompany.com

# Note: MASTER_KEY (32-byte hex) is set in the base template's .env
# and is used to encrypt EIMS credentials and private keys at rest.
# ===== EIMS_END =====
```

---

## 12. Permissions snippet

```typescript
// snippets/permissions.snippet.ts (excerpt)

export const eimsPermissions = {
  'eims:read': {
    description: 'View EIMS submissions, certificates, and compliance status',
    defaultRoles: ['owner', 'admin', 'member', 'viewer'],
  },
  'eims:configure': {
    description: 'Configure EIMS credentials, upload certificates, register sources',
    defaultRoles: ['owner', 'admin'],
  },
  'eims:submit': {
    description: 'Submit invoices to EIMS',
    defaultRoles: ['owner', 'admin', 'member'],
  },
  'eims:cancel': {
    description: 'Cancel previously submitted invoices',
    defaultRoles: ['owner', 'admin'],
  },
  'eims:admin': {
    description: 'Platform-admin EIMS operations across all tenants',
    defaultRoles: ['superAdmin'],
  },
};
```

---

## 13. Seed data

`snippets/seed.snippet.ts`:

```typescript
async function seedEimsLookups(prisma: PrismaClient) {
  await prisma.lookup.createMany({
    skipDuplicates: true,
    data: [
      // Transaction types
      { category: 'eims:transactionType', code: 'B2B', label: 'Business to Business' },
      { category: 'eims:transactionType', code: 'B2C', label: 'Business to Consumer' },
      { category: 'eims:transactionType', code: 'B2G', label: 'Business to Government' },
      { category: 'eims:transactionType', code: 'G2B', label: 'Government to Business' },
      { category: 'eims:transactionType', code: 'G2C', label: 'Government to Consumer' },

      // Document types
      { category: 'eims:documentType', code: 'INV', label: 'Invoice' },
      { category: 'eims:documentType', code: 'CRE', label: 'Credit Note' },
      { category: 'eims:documentType', code: 'DEB', label: 'Debit Note' },
      { category: 'eims:documentType', code: 'INT', label: 'Interim' },
      { category: 'eims:documentType', code: 'RTN', label: 'Retainer' },
      { category: 'eims:documentType', code: 'FIN', label: 'Final' },
      { category: 'eims:documentType', code: 'MIX', label: 'Mixed Invoice' },
      { category: 'eims:documentType', code: 'INC', label: 'Intercompany' },
      { category: 'eims:documentType', code: 'PRF', label: 'Proforma' },
      { category: 'eims:documentType', code: 'OVD', label: 'Overdue' },

      // Cancellation reason codes
      { category: 'eims:cancelReason', code: '1', label: 'Duplicate submission' },
      { category: 'eims:cancelReason', code: '2', label: 'Data entry error' },
      { category: 'eims:cancelReason', code: '3', label: 'Customer cancellation' },
      { category: 'eims:cancelReason', code: '4', label: 'Other' },

      // Payment modes (per EIMS spec)
      { category: 'eims:paymentMode', code: 'CASH', label: 'Cash' },
      { category: 'eims:paymentMode', code: 'CHEQUE', label: 'Cheque' },
      { category: 'eims:paymentMode', code: 'CPO', label: 'CPO' },
      { category: 'eims:paymentMode', code: 'LBT', label: 'Local Bank Transfer' },
      { category: 'eims:paymentMode', code: 'SWIFT', label: 'SWIFT' },
      { category: 'eims:paymentMode', code: 'WIRE', label: 'Wire Transfer' },
      { category: 'eims:paymentMode', code: 'LC', label: 'Letter of Credit' },
      { category: 'eims:paymentMode', code: 'CARD', label: 'Card' },

      // Tax codes
      { category: 'eims:taxCode', code: 'VAT0', label: 'VAT 0%' },
      { category: 'eims:taxCode', code: 'VAT15', label: 'VAT 15%' },
      { category: 'eims:taxCode', code: 'VATEX', label: 'VAT Exempt' },
      { category: 'eims:taxCode', code: 'TOT', label: 'TOT' },
      { category: 'eims:taxCode', code: 'TWHT', label: 'Withholding Tax' },
    ],
  });
}
```

---

## 14. The setup wizard UX

The single most important user-facing piece. A tenant lands on `/eims/setup` and walks through 6 steps. Each step has its own TanStack Query mutation and validation.

### Step 1 — Welcome
- Explain what EIMS is and why they need it
- Link to MoR portal signup
- Confirmation checkbox: "I have completed MoR portal registration and received credentials"

### Step 2 — Credentials
- Form fields: TIN, system_number, clientId, clientSecret, apiKey
- Validates against backend (which uses SDK to attempt auth)
- On success, stores encrypted via `CredentialCipherService`

### Step 3 — Generate CSR
- Two paths: generate locally (recommended) or upload your own
- "Generate" calls backend, returns CSR PEM, offers download
- Form for org details required for CSR

### Step 4 — Submit to INSA
- Shows the email template with subject and body
- Pre-fills with org info
- Download CSR file button
- Download request form (DOCX with org info pre-filled) button
- Confirmation: "I have sent the email to ica@insa.gov.et"

### Step 5 — Upload returned certificate
- Wait for INSA to reply (typically 1-3 business days)
- When ready, drag-and-drop the .crt/.pem file
- Backend parses, validates expiry, validates against the private key
- Encrypts and stores

### Step 6 — Verify
- Send a test invoice to EIMS sandbox
- If success, show IRN
- Mark tenant as `EIMS_READY`

---

## 15. Compliance dashboard

`/eims` route shows compliance status, the key signals a tenant cares about:

- Overall score (0-100) based on a checklist
- Submissions this month (count)
- Failed submissions (count, action required)
- Certificate expiry countdown
- Active source status
- Last successful submission timestamp
- Cancellation rate (should be below MoR's threshold)
- Buyer registry coverage (% of invoices with valid buyer TIN)

The dashboard pulls from `useEimsCompliance()` hook which calls a single backend endpoint that aggregates all of this.

---

## 16. Admin-side features

The platform admin gets a cross-tenant view:

- `/admin/eims/tenants` — list of all tenants with EIMS setup status
- `/admin/eims/failures` — failed submissions across all tenants, sortable by tenant or error code
- `/admin/eims/certificates` — every cert in the platform with expiry date, sortable
- `/admin/eims/resources` — MoR lookup tables (transaction types, regions, tax codes) editable from admin
- `/admin/eims/compliance` — aggregate compliance scores, identify tenants at risk

Each is a TanStack Table with all the standard features.

---

## 17. Documentation files installed

The pack copies these to the project's `docs/` folder:

### EIMS_STARTER_GUIDE.md
What the pack adds, how to verify install, common gotchas.

### EIMS_ONBOARDING_FLOW.md
Step-by-step for a new tenant — MoR portal signup → credentials → CSR → INSA email → cert upload → first invoice. Includes screenshots of the wizard.

### EIMS_TROUBLESHOOTING.md
- "401 Auth error" → check credentials, regenerate JWT
- "Schema error" → check field in error response, common pitfalls per field
- "Rule error" → cancellation window exceeded, daily limits hit
- "Certificate expired" → run renewal flow
- "EIMS unreachable" → check sandbox vs prod URL, network connectivity, buffer queue status

### EIMS_COMPLIANCE_CHECKLIST.md
The BSP master checklist items mapped to features in the pack. For each requirement: what implements it, where the test lives, how to demonstrate compliance to an auditor.

---

## 18. Verification after install

After running `pnpm gen:starter eims`, run these to verify:

```bash
pnpm doctor                    # EIMS-specific checks pass
pnpm db:migrate                # new tables created
pnpm db:seed                   # lookups inserted
pnpm typecheck                 # no TS errors
pnpm lint                      # no lint errors
pnpm test:smoke                # smoke tests pass
pnpm test --filter eims        # all EIMS module tests pass
pnpm dev                       # api + web start, /eims route loads
```

Add this verification as the final step of the installer with a clear success/failure summary.

---

## 19. Future starter packs that depend on this one

Verticals like `restaurant-pos` and `hotel-pms` will declare EIMS as a requirement:

```json
{
  "name": "restaurant-pos",
  "requires": ["eims"],
  ...
}
```

The CLI auto-installs `eims` first if the developer runs `pnpm gen:starter restaurant-pos` without it already present.

The vertical pack maps its domain model to the canonical invoice shape (see SDK doc section 4.3) and submits via the EIMS module. The vertical never talks to the SDK directly — always through the EIMS module's services.

---

## 20. Final note

This pack is the foundation of every Ethiopian SaaS you'll ship. Getting it right means every restaurant, hotel, retail, or other vertical you build inherits e-invoicing for free. Spend the time here — it pays back many times over.

# Concierge Onboarding System Specification

This document specifies the **concierge onboarding system** that lives in your base SaaS template. It addresses the reality of the Ethiopian SMB market where 95% of tenants need your staff to walk them through MoR/INSA registration and certificate setup rather than doing it themselves.

This document complements:
- Document 01 — Base template improvement plan
- Document 02 — EIMS SDK v2 spec
- Document 03 — EIMS starter pack spec

The concierge onboarding system is added to the **base template** (not the EIMS starter pack) because every vertical needs structured tenant onboarding. The EIMS starter pack contributes the EIMS-specific task template (15 steps for EIMS setup); restaurant/hotel/retail packs add their own steps.

---

## Table of contents

1. Why this exists
2. Two onboarding modes
3. Architecture overview
4. Data model
5. Task templates and how packs contribute
6. The certificate handling end-to-end
7. The .env approach explained
8. Admin UI specification
9. NestJS module structure
10. Permissions and audit
11. Reminders and stuck-task handling
12. Tenant-facing notifications
13. Self-service mode UI (for tech-savvy tenants)
14. Hybrid mode
15. Real-world walkthrough — Tenant Z
16. Migration from current state
17. Testing strategy
18. Final notes

---

## 1. Why this exists

### 1.1 The market reality

The Ethiopian SaaS market is dominated by clients who:
- Don't have technical staff
- Are not comfortable with multi-step web portals
- Expect the vendor to handle setup as part of the service
- Will give you their TIN, phone, and email and expect everything else
- Use WhatsApp/phone calls more than email for support
- Often pay in person at your office with cash, telebirr, or bank transfer

Building a pure self-service onboarding flow for this market means most tenants get stuck halfway and abandon. The Ethiopian fintech sector learned this lesson — every successful product (Telebirr, M-Birr, ZemenPay, even most banking apps) supports either branch-assisted setup or agent-assisted setup as a primary path.

For your e-invoice SaaS, **concierge is the primary onboarding mode, not the fallback**.

### 1.2 What concierge onboarding solves

It turns the abstract task "get this tenant operational with EIMS" into a **shared operational playbook** for your team:

- Every tenant has a tracked workflow with explicit current state
- Every step is auditable — who did what when
- Stuck tasks surface to management before they become problems
- New staff can pick up a tenant mid-flow without context loss
- The system handles the boring parts (reminders, validation, data capture) so staff can focus on the human parts

### 1.3 What concierge onboarding does NOT do

- It does NOT automate MoR portal signup. OTPs go to tenant phones, captchas exist, MoR officers must approve. Staff still does this manually on portal.mor.gov.et.
- It does NOT automate INSA cert issuance. INSA is email-driven (ica@insa.gov.et), CSRs are physically reviewed.
- It does NOT replace the human relationship. Tenants still call your team for help.

What it does is **structure** the manual work so it's reliable, auditable, and scalable to dozens of tenants per onboarding staff member.

---

## 2. Two onboarding modes

The system supports three modes per tenant:

| Mode | Who does the work | When to use |
|---|---|---|
| **CONCIERGE** | Your staff, on behalf of tenant | Default — 95% of Ethiopian SMB tenants |
| **SELF_SERVICE** | Tenant themselves via their login | Tech-savvy tenants who explicitly request it |
| **HYBRID** | Some steps tenant, others staff | Rare but supported |

The mode is set when the tenant is created and can be changed during onboarding. Every step in a task template declares:

```typescript
interface TaskStepTemplate {
  key: string;
  title: string;
  description: string;
  canBeSelfService: boolean;      // does this step have a tenant-facing UI?
  defaultAssignee: 'TENANT' | 'STAFF';
  estimatedHours: number;
  blocking: boolean;
  category: 'setup' | 'mor-portal' | 'insa-cert' | 'verification' | 'training';
}
```

The current assignee on each step is what determines who sees it on their dashboard. Staff sees STAFF-assigned steps in `/admin/onboarding/{taskId}`. Tenants see TENANT-assigned steps in their own `/onboarding` wizard.

---

## 3. Architecture overview

```
Base template (this document):
├── onboarding module (NEW)
│   ├── Task and step management
│   ├── Activity log
│   ├── Reminder cron
│   ├── Admin workflow UI
│   └── Tenant wizard UI (for self-service)
│
├── crypto module (existing, called from onboarding)
│   └── CipherService for secret storage
│
└── notification module (existing, called from onboarding)
    └── SMS, email templates for tenant notifications

EIMS starter pack (Document 03):
├── Registers an EIMS task template with 15 steps
├── Adds EimsCredential and EimsCertificate models
├── Adds csr-generator.service.ts
└── Adds CertValidationService

Vertical packs (restaurant/hotel/retail):
└── Each adds their own steps to the task template
    (e.g., restaurant pack adds "Set up menu" step)
```

The `onboarding` module is **generic**. It knows nothing about EIMS, restaurants, or hotels. It just runs task workflows. The packs contribute task templates that the module executes.

---

## 4. Data model

### 4.1 Prisma schema additions to the base template

```prisma
model OnboardingTask {
  id                String   @id @default(cuid())
  organizationId    String   @unique
  organization      Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  templateKey       String   // "eims-restaurant", "eims-hotel", etc.
  mode              OnboardingMode @default(CONCIERGE)
  status            OnboardingTaskStatus @default(ACTIVE)

  currentStepKey    String?
  assignedToUserId  String?
  assignedTo        User? @relation("AssignedTasks", fields: [assignedToUserId], references: [id])

  contactName       String
  contactPhone      String
  contactEmail      String

  startedAt         DateTime @default(now())
  completedAt       DateTime?
  blockedReason     String?  @db.Text

  metadata          Json?

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  steps             OnboardingTaskStep[]
  activities        OnboardingActivity[]

  @@index([status])
  @@index([assignedToUserId])
  @@index([templateKey, status])
}

enum OnboardingMode {
  CONCIERGE
  SELF_SERVICE
  HYBRID
}

enum OnboardingTaskStatus {
  ACTIVE
  COMPLETED
  BLOCKED
  CANCELLED
}

model OnboardingTaskStep {
  id                String   @id @default(cuid())
  taskId            String
  task              OnboardingTask @relation(fields: [taskId], references: [id], onDelete: Cascade)

  stepKey           String
  stepOrder         Int
  title             String
  description       String?  @db.Text
  category          String

  assigneeType      String   // "TENANT" or "STAFF"
  canBeSelfService  Boolean  @default(false)

  status            OnboardingStepStatus @default(PENDING)
  startedAt         DateTime?
  completedAt       DateTime?
  completedByUserId String?
  notes             String?  @db.Text

  capturedData      Json?   // step-specific data, e.g. credentials, cert info

  blocked           Boolean  @default(false)
  blockedReason     String?  @db.Text

  @@index([taskId, stepOrder])
  @@index([status])
  @@unique([taskId, stepKey])
}

enum OnboardingStepStatus {
  PENDING
  IN_PROGRESS
  COMPLETED
  SKIPPED
  FAILED
}

model OnboardingActivity {
  id                String   @id @default(cuid())
  taskId            String
  task              OnboardingTask @relation(fields: [taskId], references: [id], onDelete: Cascade)

  type              String   // STAFF_ACTION, SYSTEM_ACTION, TENANT_ACTION, REMINDER_SENT, etc.
  message           String   @db.Text
  userId            String?

  metadata          Json?

  createdAt         DateTime @default(now())

  @@index([taskId, createdAt])
}

model OnboardingTaskTemplate {
  // This table is seeded by starter packs at install time
  id                String   @id @default(cuid())
  key               String   @unique  // "eims-restaurant"
  name              String
  description       String?  @db.Text
  vertical          String   // "restaurant", "hotel", "retail", or "generic"
  estimatedDays     Int

  // The step definitions live in JSON
  stepDefinitions   Json     // Array<TaskStepTemplate>

  isActive          Boolean  @default(true)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}
```

### 4.2 EIMS-specific tables (from EIMS starter pack)

These come from Document 03 but I include them here for context because the onboarding module interacts with them:

```prisma
model EimsCredential {
  id              String   @id @default(cuid())
  organizationId  String   @unique
  organization    Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  tin             String                            // public — not encrypted
  clientId        String                            // public identifier
  clientSecretEnc String  @db.Text                  // ENCRYPTED via CipherService
  apiKeyEnc       String  @db.Text                  // ENCRYPTED
  systemNumber    String
  systemType      String   // ERP, POS, MAN

  isActive        Boolean  @default(true)
  validatedAt     DateTime?                          // when test invoice succeeded
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model EimsCertificate {
  id              String   @id @default(cuid())
  organizationId  String
  organization    Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  certificatePem  String   @db.Text                 // PUBLIC — stored as plain PEM
  privateKeyEnc   String   @db.Text                 // ENCRYPTED via CipherService
  csrPem          String?  @db.Text                 // saved for audit, also public

  subjectCn       String
  issuerCn        String
  serialNumber    String
  keySizeBits     Int
  algorithm       String
  validFrom       DateTime
  validUntil      DateTime

  isActive        Boolean  @default(true)
  insaRequestSentAt DateTime?
  insaResponseReceivedAt DateTime?

  createdAt       DateTime @default(now())

  @@index([organizationId, isActive])
  @@index([validUntil])
}
```

---

## 5. Task templates and how packs contribute

### 5.1 How a starter pack registers its template

When the EIMS starter pack installs, its install script runs:

```typescript
// packages/cli/starters/eims/install.js calls this seed
await prisma.onboardingTaskTemplate.upsert({
  where: { key: 'eims-restaurant' },
  update: { /* updated definitions */ },
  create: {
    key: 'eims-restaurant',
    name: 'EIMS Restaurant Onboarding',
    description: 'Complete onboarding for a restaurant to start issuing fiscal invoices via EIMS',
    vertical: 'restaurant',
    estimatedDays: 8,
    stepDefinitions: [
      // ... 15 step definitions, see section 5.2
    ],
  },
});
```

If multiple packs install (e.g., EIMS pack + restaurant pack), the restaurant pack appends restaurant-specific steps:

```typescript
await prisma.onboardingTaskTemplate.upsert({
  where: { key: 'restaurant-only' },
  // ...
  stepDefinitions: [
    { key: 'menu-setup', title: 'Set up menu items', ... },
    { key: 'table-layout', title: 'Configure table layout', ... },
    // ...
  ],
});
```

For tenants that need both EIMS and restaurant setup, the system creates an `OnboardingTask` with `templateKey: 'eims-restaurant'` whose steps come from BOTH templates merged. The pack metadata declares which templates apply.

### 5.2 The 15-step EIMS task template

This is what the EIMS starter pack registers (full content of `stepDefinitions`):

```json
[
  {
    "key": "tenant-info-collected",
    "stepOrder": 1,
    "title": "Tenant info collected",
    "description": "Company details, contact, business license",
    "category": "setup",
    "assigneeType": "STAFF",
    "canBeSelfService": true,
    "estimatedHours": 0.5,
    "blocking": true
  },
  {
    "key": "payment-received",
    "stepOrder": 2,
    "title": "Subscription payment received",
    "description": "Cash, telebirr, bank transfer recorded",
    "category": "setup",
    "assigneeType": "STAFF",
    "canBeSelfService": false,
    "estimatedHours": 0.25,
    "blocking": true
  },
  {
    "key": "organization-created",
    "stepOrder": 3,
    "title": "Organization created in SaaS",
    "description": "Org record, owner user, settings populated",
    "category": "setup",
    "assigneeType": "STAFF",
    "canBeSelfService": true,
    "estimatedHours": 0.25,
    "blocking": true
  },
  {
    "key": "mor-portal-signup",
    "stepOrder": 4,
    "title": "MoR portal signup",
    "description": "Sign up on portal.mor.gov.et using tenant TIN and phone OTP",
    "category": "mor-portal",
    "assigneeType": "STAFF",
    "canBeSelfService": true,
    "estimatedHours": 1,
    "blocking": true
  },
  {
    "key": "totp-configured",
    "stepOrder": 5,
    "title": "TOTP set up for 2FA",
    "description": "Configure 2FA, save backup codes",
    "category": "mor-portal",
    "assigneeType": "STAFF",
    "canBeSelfService": true,
    "estimatedHours": 0.5,
    "blocking": true
  },
  {
    "key": "source-registered",
    "stepOrder": 6,
    "title": "Source system registered on MoR portal",
    "description": "Enterprise → Establishment → Source registration",
    "category": "mor-portal",
    "assigneeType": "STAFF",
    "canBeSelfService": true,
    "estimatedHours": 0.5,
    "blocking": true
  },
  {
    "key": "mor-approval-received",
    "stepOrder": 7,
    "title": "MoR approved source registration",
    "description": "Wait for back-office approval (1-5 business days)",
    "category": "mor-portal",
    "assigneeType": "STAFF",
    "canBeSelfService": false,
    "estimatedHours": 0,
    "blocking": true
  },
  {
    "key": "credentials-captured",
    "stepOrder": 8,
    "title": "Credentials captured and encrypted",
    "description": "clientId, clientSecret, apiKey stored in EimsCredential",
    "category": "mor-portal",
    "assigneeType": "STAFF",
    "canBeSelfService": true,
    "estimatedHours": 0.25,
    "blocking": true
  },
  {
    "key": "csr-generated",
    "stepOrder": 9,
    "title": "RSA key + CSR generated",
    "description": "3024-bit key, CSR for INSA, private key encrypted in vault",
    "category": "insa-cert",
    "assigneeType": "STAFF",
    "canBeSelfService": true,
    "estimatedHours": 0.1,
    "blocking": true
  },
  {
    "key": "insa-email-sent",
    "stepOrder": 10,
    "title": "INSA email sent with CSR",
    "description": "Email to ica@insa.gov.et with CSR and form attached",
    "category": "insa-cert",
    "assigneeType": "STAFF",
    "canBeSelfService": true,
    "estimatedHours": 0.25,
    "blocking": true
  },
  {
    "key": "insa-cert-received",
    "stepOrder": 11,
    "title": "Signed certificate uploaded",
    "description": "Upload .crt from INSA, validate and store",
    "category": "insa-cert",
    "assigneeType": "STAFF",
    "canBeSelfService": true,
    "estimatedHours": 0.25,
    "blocking": true
  },
  {
    "key": "test-invoice-succeeded",
    "stepOrder": 12,
    "title": "Test invoice succeeded",
    "description": "Submit test invoice to EIMS sandbox, verify IRN returned",
    "category": "verification",
    "assigneeType": "STAFF",
    "canBeSelfService": false,
    "estimatedHours": 0.25,
    "blocking": true
  },
  {
    "key": "tenant-notified-live",
    "stepOrder": 13,
    "title": "Tenant notified — system is live",
    "description": "SMS + email with login link",
    "category": "verification",
    "assigneeType": "STAFF",
    "canBeSelfService": false,
    "estimatedHours": 0.1,
    "blocking": false
  },
  {
    "key": "training-completed",
    "stepOrder": 14,
    "title": "Cashier training completed",
    "description": "On-site or remote training session done",
    "category": "training",
    "assigneeType": "STAFF",
    "canBeSelfService": false,
    "estimatedHours": 4,
    "blocking": false
  },
  {
    "key": "first-production-invoice",
    "stepOrder": 15,
    "title": "First production invoice issued",
    "description": "Tenant issues their first real invoice, IRN received",
    "category": "verification",
    "assigneeType": "TENANT",
    "canBeSelfService": false,
    "estimatedHours": 0.1,
    "blocking": false
  }
]
```

When a task is created from this template, all 15 step records get created in `OnboardingTaskStep` with `status: PENDING`. The first one is set to `IN_PROGRESS` automatically.

---

## 6. The certificate handling end-to-end

This is the section that bridges the technical and operational. Read carefully.

### 6.1 What a certificate actually is

An X.509 certificate is a file that says:
- "The entity with TIN 1234567890 owns the private key matching this public key"
- "INSA vouches for this fact (their signature is at the bottom)"
- "Valid from date A to date B"

When EIMS receives an invoice signed with the tenant's private key, it:
1. Reads the certificate field of the envelope
2. Verifies INSA's signature on the certificate (their public CA cert is preinstalled in EIMS)
3. Extracts the tenant's public key from the certificate
4. Uses the public key to verify the signature on the request
5. If both verifications pass, accepts the invoice

The private key is what you keep secret. The certificate (which contains the public key) is what you send with every request.

### 6.2 Generation flow (stage 1-3 from the diagram)

When the staff clicks "Generate CSR" in the admin UI, this runs server-side:

```typescript
// apps/api/src/modules/eims/infrastructure/services/csr-generator.service.ts
import { generateKeyPairSync, createSign } from 'node:crypto';
import forge from 'node-forge';

@Injectable()
export class CsrGeneratorService {
  constructor(private readonly cipher: CipherService) {}

  async generateForTenant(orgId: string, tin: string, legalName: string) {
    // 1. Generate 3024-bit RSA key pair
    const { publicKey, privateKey } = generateKeyPairSync('rsa', {
      modulusLength: 3024,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });

    // 2. Build the CSR using node-forge
    const forgeKey = forge.pki.privateKeyFromPem(privateKey);
    const forgePubKey = forge.pki.publicKeyFromPem(publicKey);
    const csr = forge.pki.createCertificationRequest();
    csr.publicKey = forgePubKey;
    csr.setSubject([
      { name: 'commonName', value: tin },
      { name: 'organizationName', value: legalName },
      { name: 'countryName', value: 'ET' },
    ]);
    csr.sign(forgeKey, forge.md.sha256.create());
    const csrPem = forge.pki.certificationRequestToPem(csr);

    // 3. Encrypt private key with CipherService
    const privateKeyEnc = this.cipher.encrypt(privateKey);

    // 4. Store in EimsCertificate (cert column is null until INSA replies)
    await this.prisma.eimsCertificate.create({
      data: {
        organizationId: orgId,
        certificatePem: '',          // empty until INSA reply
        privateKeyEnc,
        csrPem,
        subjectCn: tin,
        issuerCn: '',
        serialNumber: '',
        keySizeBits: 3024,
        algorithm: 'RSA-SHA256',
        validFrom: new Date(0),
        validUntil: new Date(0),
        isActive: false,             // not active until cert uploaded
      },
    });

    return { csrPem };
  }
}
```

After this runs:
- Private key exists ONLY in encrypted form in the database
- The plaintext private key was in memory for ~10ms during this function
- The CSR (public) is returned to the staff to email INSA

### 6.3 Storage flow (stage 4-5)

Staff sends `csrPem` and a filled INSA form (template attached to the system) to ica@insa.gov.et.

Days later, INSA emails back a `.crt` file. Staff opens the admin page, drags the file in.

```typescript
// apps/api/src/modules/eims/presentation/controllers/admin-onboarding.controller.ts
@Post('certificates/upload')
@UseInterceptors(FileInterceptor('cert'))
async uploadCert(
  @UploadedFile() file: Express.Multer.File,
  @Body('organizationId') orgId: string,
) {
  const certPem = file.buffer.toString('utf8');
  return this.certUploadService.upload(orgId, certPem);
}
```

```typescript
@Injectable()
export class CertUploadService {
  async upload(orgId: string, certPem: string) {
    // 1. Find the pending cert for this org (the one we created the CSR for)
    const cert = await this.prisma.eimsCertificate.findFirstOrThrow({
      where: { organizationId: orgId, isActive: false },
      orderBy: { createdAt: 'desc' },
    });

    // 2. Decrypt private key for validation
    const privateKeyPem = this.cipher.decrypt(cert.privateKeyEnc);

    // 3. Run preflight validation (the SDK validation function from doc 02)
    const result = validateCertificate(certPem, privateKeyPem, /*expectedTin*/);
    if (!result.valid) {
      throw new BadRequestException({
        message: 'Certificate validation failed',
        errors: result.errors,
      });
    }

    // 4. Update the record with the cert info
    await this.prisma.eimsCertificate.update({
      where: { id: cert.id },
      data: {
        certificatePem: certPem,
        subjectCn: result.meta.subjectCn,
        issuerCn: result.meta.issuerCn,
        serialNumber: result.meta.serialNumber,
        validFrom: result.meta.validFrom,
        validUntil: result.meta.validUntil,
        algorithm: result.meta.algorithm,
        isActive: true,
        insaResponseReceivedAt: new Date(),
      },
    });

    // 5. Advance the onboarding step
    await this.onboardingService.completeStep(orgId, 'insa-cert-received');
  }
}
```

After this:
- `EimsCertificate.certificatePem` contains the signed PEM (public, plaintext)
- `EimsCertificate.privateKeyEnc` still contains the encrypted private key
- The pair is ready to sign invoices

### 6.4 Signing flow at invoice time (stage 6-10)

When a cashier creates an invoice:

```typescript
// apps/api/src/modules/eims/application/services/eims-submission.service.ts
async submitInvoice(dto: CreateInvoiceDto, orgId: string) {
  // 1. Load tenant config — decrypts secrets in memory
  const tenantConfig = await this.tenantConfigService.buildForOrg(orgId);
  
  // tenantConfig now has:
  //   tenantConfig.tin                = "1234567890"            (from DB, plaintext)
  //   tenantConfig.clientId           = "a8d877..."             (from DB, plaintext)
  //   tenantConfig.clientSecret       = "0cc1a9ba-..."          (DECRYPTED from clientSecretEnc)
  //   tenantConfig.apiKey             = "471555f9-..."          (DECRYPTED from apiKeyEnc)
  //   tenantConfig.certificate        = "-----BEGIN CERT...-----" (from DB, plaintext PEM)
  //   tenantConfig.privateKey         = "-----BEGIN RSA...-----" (DECRYPTED from privateKeyEnc)
  
  // 2. Build the InvoiceWire (PascalCase shape, see SDK doc section 5)
  const invoice = this.invoiceBuilder.build(dto, tenantConfig);
  
  // 3. Hand to SDK — SDK signs, envelopes, sends
  return this.sdkAdapter.registerInvoice(invoice, tenantConfig);
}
```

The SDK does this internally:

```typescript
// In @yourcompany/eims-sdk
async registerInvoice(invoice: InvoiceWire, tenant: EimsTenantConfig) {
  // Validate the cert is healthy (cached after first run for this tenant)
  await this.preflightCert(tenant);
  
  // Canonicalize the invoice (deterministic JSON bytes)
  const canonical = canonicalize(invoice);
  
  // Sign with the tenant's private key
  const signature = sign(canonical, tenant.privateKey);
  
  // Build envelope
  const envelope = {
    request: invoice,
    signature,
    certificate: this.formatCertForWire(tenant.certificate),
  };
  
  // Get JWT (cached, refreshes if expiring)
  const jwt = await this.tokenCache.getJwt(tenant);
  
  // POST
  const response = await this.httpClient.post('/v1/register', envelope, {
    headers: { Authorization: `Bearer ${jwt}` },
  });
  
  // After this function returns, tenant.privateKey is no longer referenced
  // and JS garbage collection will eventually free it from memory
  
  return parseResponse(response);
}
```

### 6.5 Why this is secure even without a vault

The private key is plaintext in memory for **milliseconds** during signing, then garbage-collected. An attacker would need:

1. Live access to the running Node process memory (requires server-level compromise, not DB leak)
2. AND they'd only get the keys of tenants who happened to be signing at that exact moment
3. AND they'd need to do this without being noticed (logs, monitoring would detect)

Compared to a vault setup:
- Vault keys also live in process memory during use — same exposure window
- Vault adds network round-trip latency to every encryption operation
- Vault adds operational complexity (HA, replication, sealed/unsealed state)

For your scale, the .env approach matches vault security but is simpler. See SDK doc section 21 for the full security checklist.

---

## 7. The .env approach explained

### 7.1 What's in .env

```bash
# /home/node/yourapp/apps/api/.env
# chmod 600, owned by node user, never in git

MASTER_KEY=a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456
```

64 hex characters = 32 raw bytes = the AES-256 key.

### 7.2 How it's generated

When you scaffold a new SaaS project:

```bash
$ create-vyllion-saas my-restaurant-saas
✓ Generating master encryption key (32 bytes random)...
✓ Writing to apps/api/.env
✓ Writing to .scaffold-credentials.txt

CRITICAL: Save this master key in your password manager NOW.
If you lose it, all encrypted secrets become permanently unrecoverable:
  - Tenant EIMS credentials
  - Tenant private keys
  - Any future encrypted data

Master Key: a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456

Press Enter when you have saved it...
```

Doctor (`pnpm doctor`) verifies the key exists and is the correct length on every run.

### 7.3 How it's loaded

```typescript
// apps/api/src/shared/crypto/cipher.service.ts (full implementation in doc 01 section 14.3)
onModuleInit() {
  const hex = this.config.getOrThrow<string>('MASTER_KEY');
  if (hex.length !== 64) throw new Error('MASTER_KEY must be 32 bytes hex');
  this.key = Buffer.from(hex, 'hex');
}
```

Loaded once at NestJS startup. Held in process memory for the lifetime of the Node process. Never written to disk by the application.

### 7.4 The packed ciphertext format

Every encrypted value in the database has this format:

```
v1:K3pQ8R2nM7vB4xWf:NhDc9pXbVf1m:lZ8kP3qR7vN2...
^^                  ^^            ^^
|                   |             |
|                   |             ciphertext (base64)
|                   auth tag (base64, 16 bytes)
|                   
IV (base64, 12 bytes)

(v1 = cipher version, allows future migration)
```

When you decrypt, you parse those 4 parts back out, set the auth tag, and AES-GCM either decrypts successfully OR throws (if the tag doesn't match — meaning tampering or wrong key).

### 7.5 Backup discipline

Critical operational rule:

```
DATABASE BACKUPS:        include all tables                        no .env file
.env FILE BACKUPS:       offsite secure (password manager)          NOT in DB backup
DISASTER RECOVERY:       restore DB + restore .env from password manager = working system
                         restore DB only = encrypted data is permanently lost
```

If you back up everything together, you've negated the security benefit. The whole point of two-factor encryption is that the two factors live separately.

### 7.6 Key rotation procedure

Documented in `docs/SECURITY.md`:

1. Generate new key `MASTER_KEY_V2`, add to .env alongside old one
2. Update CipherService to recognize a `v2:` prefix and use the new key for it
3. Run migration: read every `v1:` ciphertext, decrypt with v1 key, encrypt with v2 key, write back as `v2:`
4. Verify by spot-checking decryption
5. Remove `MASTER_KEY_V1` from .env
6. Restart app
7. Document rotation date in your security log

You do this every 12 months, or immediately when a staff member with .env access leaves.

---

## 8. Admin UI specification

The admin onboarding system has three main pages.

### 8.1 List view: `/admin/onboarding`

Shows all tenants currently in onboarding. Built on the standardized DataTable component from base template.

**Columns:**
- Tenant name + business type
- TIN
- Mode (CONCIERGE / SELF_SERVICE / HYBRID)
- Current step (with progress bar X/15)
- Status badge (color-coded)
- Assigned to (staff member avatar + name)
- Days in current step (highlighted red if >5)
- Actions menu (assign, view, archive)

**Filters:**
- Status: ACTIVE / BLOCKED / COMPLETED
- Mode: CONCIERGE / SELF_SERVICE / HYBRID
- Assigned to: staff dropdown
- Vertical: restaurant / hotel / retail
- Stuck more than N days

**Top summary cards:**
- In onboarding (count)
- Stuck >5 days (count, red if >0)
- Completed this month (count)
- Avg onboarding time (days)

**Actions:**
- New tenant button (top right)
- Bulk: assign N tenants to a staff member, archive completed

### 8.2 Detail view: `/admin/onboarding/{taskId}`

Per-tenant workflow page (sketched in our conversation).

**Layout:**
- Header: tenant name, TIN, days since started, mode badge
- Action buttons: "Assign to me", "Impersonate" (uses base template impersonation feature)

**Left column — Step timeline:**
- All 15 (or N) steps listed in order
- Each step shows: completed (green check), current (highlighted blue dot), pending (gray)
- Each completed step shows: completed by whom, when
- Clicking a step opens its details/notes/captured data

**Right column — Current action panel:**
- What needs to happen next (one sentence)
- Action buttons relevant to the current step
- Show step-specific UI (form, upload, checklist)

**Right column — Tenant info card:**
- Contact name, phone, email
- Business location
- Quick links: open WhatsApp, copy phone, send email

**Right column — Activity log:**
- Chronological feed of every action on this task
- Each entry: timestamp, actor (staff name or "System"), action description

### 8.3 New tenant: `/admin/onboarding/new`

Multi-step form (uses Wizard component from base template):

**Step A — Company info:**
- Legal name, trade name, TIN, VAT number
- Business type (driven by installed verticals)
- Region, sub-city, woreda, house number

**Step B — Contact:**
- Owner full name, phone, email
- Manager phone (optional, sometimes same)
- Preferred contact channel (WhatsApp, call, email)

**Step C — Subscription:**
- Plan selection
- Payment method (cash, telebirr, bank, etc.)
- Amount, reference number
- Receipt upload (optional)

**Step D — Setup options:**
- Mode: CONCIERGE (default), SELF_SERVICE, HYBRID
- Task template (auto-selected from vertical)
- Assigned staff member

On submit:
1. Creates `Organization`, `OrganizationSettings`, `User` (owner), `Subscription`
2. Marks subscription as PAID
3. Creates `OnboardingTask` with selected template
4. Auto-marks steps 1-3 (info, payment, org-creation) as complete
5. Sets step 4 (MoR portal) as IN_PROGRESS
6. Redirects to detail view
7. Activity log: "Tenant created and onboarding started"

### 8.4 Step-specific UI

Each step in the EIMS template has its own UI panel that shows when the staff is on that step.

**Step 4 — MoR portal signup:**
- Checklist UI with steps to follow on portal.mor.gov.et
- Copy buttons for TIN, expected username
- Embedded screenshots (from `Selfonboarding and Source Registration Guide.pdf`)
- Notes field
- "Mark complete when MoR welcome email arrives" button

**Step 8 — Credentials capture:**
- Form with fields: clientId, clientSecret, apiKey, systemNumber, systemType
- Warning: "These will be encrypted before storage"
- Validate format on input (UUID patterns, etc.)
- On submit: call CipherService, store in EimsCredential

**Step 9 — Generate CSR:**
- Single button "Generate CSR now"
- Shows generated CSR in a read-only code block
- Download CSR button
- Auto-advances to step 10

**Step 10 — INSA email:**
- Pre-filled email composer (To, Subject, Body)
- Pre-attached CSR file and INSA form template
- "Send via system" button (uses your notification module)
- After sending: shows sent timestamp, expected response window
- "Send reminder" button activates after 3 days

**Step 11 — Upload cert:**
- File upload zone for .crt file
- Validation results display (key match, expiry, key size, CN match)
- "Upload and activate" button

**Step 12 — Test invoice:**
- "Run sandbox test" button
- Shows test invoice payload (minimal)
- Shows EIMS response (IRN if success, error code if not)
- Auto-advances on success

**Step 13 — Notify tenant:**
- Checkboxes: send SMS, send email, schedule training
- Preview of SMS and email templates
- Send button

---

## 9. NestJS module structure

```
apps/api/src/modules/onboarding/
├── domain/
│   ├── entities/
│   │   ├── onboarding-task.entity.ts
│   │   ├── onboarding-step.entity.ts
│   │   └── onboarding-activity.entity.ts
│   └── events/
│       ├── task-started.event.ts
│       ├── step-completed.event.ts
│       ├── task-completed.event.ts
│       └── task-blocked.event.ts
│
├── application/
│   ├── commands/
│   │   ├── create-task.command.ts
│   │   ├── create-task.handler.ts
│   │   ├── advance-step.command.ts
│   │   ├── advance-step.handler.ts
│   │   ├── assign-task.command.ts
│   │   ├── assign-task.handler.ts
│   │   ├── block-task.command.ts
│   │   ├── unblock-task.command.ts
│   │   └── capture-step-data.command.ts
│   │
│   ├── queries/
│   │   ├── list-tasks.query.ts
│   │   ├── get-task-detail.query.ts
│   │   ├── get-task-template.query.ts
│   │   └── list-stuck-tasks.query.ts
│   │
│   └── services/
│       ├── task-template.service.ts        # loads templates from DB
│       ├── task-orchestrator.service.ts    # advances state, triggers events
│       ├── reminder.service.ts             # cron-driven reminders
│       └── activity-log.service.ts
│
├── infrastructure/
│   ├── repositories/
│   │   ├── onboarding-task.repository.ts
│   │   ├── onboarding-step.repository.ts
│   │   └── onboarding-activity.repository.ts
│   │
│   └── crons/
│       ├── stale-task-reminder.cron.ts     # alerts on tasks stuck >N days
│       └── insa-followup.cron.ts           # auto-reminders to INSA after N days
│
└── presentation/
    ├── controllers/
    │   ├── admin-onboarding.controller.ts   # staff endpoints
    │   └── tenant-onboarding.controller.ts  # tenant self-service endpoints
    │
    ├── dtos/
    │   ├── create-task.dto.ts
    │   ├── advance-step.dto.ts
    │   ├── capture-credentials.dto.ts
    │   └── upload-cert.dto.ts
    │
    └── guards/
        └── task-assignee.guard.ts           # only assignee or admin can advance
```

### 9.1 Key service signatures

```typescript
@Injectable()
export class TaskOrchestratorService {
  constructor(
    private readonly stepRepo: OnboardingStepRepository,
    private readonly taskRepo: OnboardingTaskRepository,
    private readonly activityLog: ActivityLogService,
    private readonly eventBus: EventBus,
  ) {}

  async completeStep(taskId: string, stepKey: string, userId: string, data?: Json) {
    const step = await this.stepRepo.findByTaskAndKey(taskId, stepKey);
    
    step.status = 'COMPLETED';
    step.completedAt = new Date();
    step.completedByUserId = userId;
    if (data) step.capturedData = data;
    await this.stepRepo.save(step);
    
    // Find next step
    const nextStep = await this.stepRepo.findNextPending(taskId, step.stepOrder);
    if (nextStep) {
      nextStep.status = 'IN_PROGRESS';
      nextStep.startedAt = new Date();
      await this.stepRepo.save(nextStep);
      
      // Update task currentStepKey
      await this.taskRepo.updateCurrentStep(taskId, nextStep.stepKey);
    } else {
      // All steps done
      await this.taskRepo.markCompleted(taskId);
      this.eventBus.publish(new TaskCompletedEvent(taskId));
    }
    
    this.eventBus.publish(new StepCompletedEvent(taskId, stepKey, userId));
    await this.activityLog.add(taskId, {
      type: 'STAFF_ACTION',
      message: `Completed step: ${step.title}`,
      userId,
    });
  }
}
```

### 9.2 EIMS-specific integrations

The onboarding module is generic but listens to specific step keys via event handlers in the EIMS module:

```typescript
// In EIMS starter pack: apps/api/src/modules/eims/application/handlers/
@EventsHandler(StepCompletedEvent)
export class EimsStepCompletionHandler implements IEventHandler<StepCompletedEvent> {
  constructor(
    private readonly csrService: CsrGeneratorService,
    private readonly notificationService: NotificationService,
  ) {}

  async handle(event: StepCompletedEvent) {
    // When step 8 (credentials-captured) completes, kick off step 9 (CSR gen) automatically
    if (event.stepKey === 'credentials-captured') {
      const task = await this.getTask(event.taskId);
      await this.csrService.generateForTenant(
        task.organizationId,
        task.metadata.tin,
        task.metadata.legalName,
      );
    }
    
    // When step 13 (tenant-notified-live) completes, send the actual SMS/email
    if (event.stepKey === 'tenant-notified-live') {
      const task = await this.getTask(event.taskId);
      await this.notificationService.sendTenantLiveNotification(task);
    }
  }
}
```

This way the generic onboarding module doesn't know about EIMS internals, but EIMS-specific behavior triggers from generic events.

---

## 10. Permissions and audit

### 10.1 Permission statements

Added by base template:

```typescript
'onboarding:read'      // view tasks (read-only)
'onboarding:write'     // advance steps, capture data
'onboarding:assign'    // change task assignee
'onboarding:create'    // create new tenant onboarding
'onboarding:admin'     // full access including cancel, block, override
```

Default role mappings:
- `platform-admin`: all onboarding permissions
- `onboarding-staff`: read, write, create (new role added by template)
- `viewer`: read only
- `tenant-owner`: read on their own task (for self-service mode)

### 10.2 Audit log integration

Every onboarding action triggers an audit log entry via the existing `AuditInterceptor` decorator:

```typescript
@Controller('admin/onboarding')
@AuditResource('onboarding:task')
export class AdminOnboardingController {
  @Post(':id/steps/:stepKey/complete')
  @AuditAction('complete_step')
  @RequirePermissions('onboarding:write')
  async completeStep(...) { ... }
}
```

Audit entry payload (auto-redacted by interceptor):
- Who: staff user ID
- What: action name
- Where: task ID, step key
- When: timestamp
- Result: success/failure
- Metadata: sanitized (no secrets logged)

For step 8 (credentials capture), the audit metadata records "credentials captured for TIN 1234567890" but NEVER the actual secret values.

---

## 11. Reminders and stuck-task handling

### 11.1 Stale task cron (daily at 8 AM)

```typescript
@Cron('0 8 * * *')
async checkStaleTasks() {
  const stuck = await this.repo.findStuckTasks({ moreThanDays: 5 });
  
  for (const task of stuck) {
    // Notify the assigned staff member
    if (task.assignedToUserId) {
      await this.notificationService.send({
        userId: task.assignedToUserId,
        type: 'onboarding.task.stale',
        payload: { taskId: task.id, tenantName: task.contactName, daysStuck: 5 },
      });
    }
    
    // Notify platform admin for visibility
    await this.notificationService.sendToRole({
      role: 'platform-admin',
      type: 'onboarding.task.escalation',
      payload: { taskId: task.id, daysStuck: 5 },
    });
    
    await this.activityLog.add(task.id, {
      type: 'REMINDER_SENT',
      message: `Auto-reminder: task stuck for 5+ days on step ${task.currentStepKey}`,
    });
  }
}
```

### 11.2 INSA follow-up cron (daily at 9 AM)

For tasks where step 10 (insa-email-sent) is complete but step 11 (insa-cert-received) isn't:

```typescript
@Cron('0 9 * * *')
async followUpOnInsa() {
  const waiting = await this.repo.findTasksWaitingOnInsa({ moreThanDays: 3 });
  
  for (const task of waiting) {
    const daysSinceEmail = ...;
    
    // Auto-send a follow-up email every 3 days
    if (daysSinceEmail % 3 === 0) {
      await this.notificationService.sendInsaFollowUp(task);
      
      await this.activityLog.add(task.id, {
        type: 'SYSTEM_ACTION',
        message: `Sent follow-up to INSA (${daysSinceEmail} days since initial)`,
      });
    }
  }
}
```

### 11.3 Cert expiry cron (daily at 6 AM)

For active tenants whose certs are expiring:

```typescript
@Cron('0 6 * * *')
async checkCertExpiry() {
  const expiring = await this.eimsRepo.findCertsExpiringSoon({ withinDays: 60 });
  
  for (const cert of expiring) {
    const daysUntilExpiry = ...;
    
    // Notify staff to start re-issuance flow
    if (daysUntilExpiry === 60 || daysUntilExpiry === 30 || daysUntilExpiry === 7) {
      await this.notificationService.sendCertExpiryWarning(cert);
    }
    
    // Notify tenant
    if (daysUntilExpiry === 14) {
      await this.notificationService.notifyTenantCertExpiring(cert);
    }
  }
}
```

---

## 12. Tenant-facing notifications

### 12.1 At onboarding completion

When step 13 (tenant-notified-live) runs:

```typescript
async sendTenantLiveNotification(task: OnboardingTask) {
  const tenant = await this.userRepo.findOwnerOf(task.organizationId);
  
  // SMS
  await this.smsService.send({
    to: tenant.phone,
    template: 'tenant-live',
    params: {
      tenantName: task.contactName,
      loginUrl: `${this.config.appUrl}/login?token=${oneTimeToken}`,
    },
  });
  
  // Email
  await this.emailService.send({
    to: tenant.email,
    template: 'tenant-live-welcome',
    params: { /* ... */ },
  });
}
```

SMS template:
```
Hi [name], your [SaaS product] account is ready! Login:
[short URL]. Your account manager will schedule training soon.
- [Your Company Name]
```

### 12.2 Periodic check-ins (optional, weekly cron)

For tenants in onboarding longer than 7 days, send a friendly "we're working on your setup" message so they don't feel forgotten.

---

## 13. Self-service mode UI

For tech-savvy tenants who explicitly want to do their own setup, you provide a self-service wizard at `/onboarding`.

```
apps/web/src/routes/_authenticated/onboarding/
├── index.tsx               # task overview, current step
├── step/$stepKey.tsx       # individual step UI
└── components/
    ├── StepTimeline.tsx
    ├── MorPortalChecklist.tsx
    ├── CredentialsForm.tsx
    ├── InsaEmailComposer.tsx
    └── CertUpload.tsx
```

This is the SAME 15-step task, just with the tenant as assignee instead of staff. Only steps with `canBeSelfService: true` are visible. Steps like "MoR officer approval" (no UI possible) and "training-completed" stay assigned to staff.

In HYBRID mode, the system shows tenant-assigned steps in the tenant wizard AND staff-assigned steps in the admin dashboard. Handoffs happen automatically when assignee changes between steps.

---

## 14. Hybrid mode

Useful when a tenant wants to do MoR portal themselves but doesn't want to deal with INSA.

When task is created in HYBRID mode, the assignee distribution might be:

- Steps 1-3 (info, payment, org-creation): STAFF
- Steps 4-7 (MoR portal): TENANT
- Step 8 (credentials capture): TENANT (they paste into wizard)
- Steps 9-12 (INSA cert + testing): STAFF
- Steps 13-15 (notification, training): STAFF

Staff can override an assignee at any step via the admin UI ("Take over this step from tenant" button). This is logged in the activity log.

---

## 15. Real-world walkthrough — Tenant Z

Let's trace this end to end with concrete data.

### Day 1, 10 AM — Tenant Z arrives

Tigist from Tenant Z Cafe walks into your Bole office. She wants restaurant SaaS for her café.

Sales staff (Helen) collects:
- Legal name: "Tenant Z Cafe PLC"
- TIN: 0099887766
- Owner phone: +251 911 234 567
- Owner email: tigist@tenantz.com
- Plan: Restaurant Pro (15,000 ETB/month)
- Payment: Telebirr, reference TR9988776655

Helen takes Tigist's 15,000 ETB telebirr payment. Receipt printed.

### Day 1, 10:30 AM — Admin staff creates tenant

Yordanos (admin staff) opens `/admin/onboarding/new` and fills the wizard. On submit, system creates:

- `Organization` row: name "Tenant Z Cafe", id "org_tenantz"
- `OrganizationSettings` row with TIN, address, plan info
- `User` row: tigist@tenantz.com, role 'owner' (no password set yet)
- `Subscription` row: status 'paid', plan 'restaurant-pro'
- `OnboardingTask` row: template 'eims-restaurant', mode CONCIERGE, assignee Yordanos
- 15 `OnboardingTaskStep` rows with status PENDING (steps 1-3 auto-marked COMPLETED)
- `OnboardingActivity` entry: "Tenant created by Yordanos"

Yordanos sees the workflow page now showing step 4 as current.

### Day 1, 11:00 AM — MoR portal signup

Yordanos opens https://portal.mor.gov.et in another browser tab.

In her admin UI, the step 4 panel shows a checklist with TIN copy buttons. She:
1. Clicks "Sign up" on MoR portal
2. Copies TIN 0099887766 from her admin UI, pastes into MoR signup form
3. MoR portal asks for OTP — phones Tigist on +251 911 234 567
4. Tigist reads the OTP over the phone
5. Yordanos enters it, completes signup
6. MoR sends an email to tigist@tenantz.com with username (0099887766) and a temp password

Tigist forwards the email to onboarding@yourcompany.com.

Yordanos receives it, opens her admin UI, marks step 4 complete with notes "OTP confirmed, welcome email received".

System auto-advances to step 5.

### Day 1, 11:30 AM — TOTP setup

Yordanos:
1. Logs into MoR portal with tigist's username + temp password
2. Portal forces password change — she sets a strong password, records in admin UI under "MoR portal credentials" (encrypted)
3. Portal forces TOTP setup — she scans QR with the office Google Authenticator (one phone holds TOTP for all clients), records backup codes encrypted in admin
4. Marks step 5 complete

### Day 1-2 — Source registration on MoR

Yordanos navigates the MoR portal:
- Source Management → Enterprise (auto-shown for Tenant Z)
- Establishment list → Add New Source
- System Type: POS, System Number: auto-generated, fills required fields
- Submits

Status shows PENDING in MoR portal. Yordanos marks step 6 complete in admin and step 7 (waiting for approval) becomes current.

### Day 4 — MoR approves

MoR officer reviews and approves Tenant Z's source registration. Tigist gets an email with:
- Username: 0099887766 (confirmed)
- Password: ^e7$cz
- API Key: 644ae8c0-3b34-498a-bb6a-394bad66ba91
- Client ID: a8d87762-d96d-4dd0-95d1-01753dba5181
- Client Secret: 0cc1a9ba-0f7d-44e1-bad2-0d136572794b
- System Number: BTZ123456

Tigist forwards to onboarding@yourcompany.com.

Yordanos marks step 7 complete. System auto-advances to step 8.

### Day 4, 2:00 PM — Capture credentials

Yordanos opens step 8 panel. Form:
- TIN (auto-filled): 0099887766
- Client ID: a8d87762-d96d-4dd0-95d1-01753dba5181
- Client Secret: 0cc1a9ba-0f7d-44e1-bad2-0d136572794b
- API Key: 644ae8c0-3b34-498a-bb6a-394bad66ba91
- System Number: BTZ123456
- System Type: POS

She clicks "Encrypt and store". Backend:
1. CipherService encrypts clientSecret → `v1:abc:def:ciphertext1`
2. CipherService encrypts apiKey → `v1:ghi:jkl:ciphertext2`
3. Insert into EimsCredential

Step 8 marked complete. Event fired. `EimsStepCompletionHandler` catches it and auto-triggers step 9 (CSR generation).

### Day 4, 2:01 PM — CSR generation (automated)

System runs `CsrGeneratorService.generateForTenant('org_tenantz', '0099887766', 'Tenant Z Cafe PLC')`:
1. Generates 3024-bit RSA key pair
2. Builds CSR with subject `CN=0099887766, O=Tenant Z Cafe PLC, C=ET`
3. Encrypts private key → stores in `EimsCertificate.privateKeyEnc`
4. Stores CSR PEM in `EimsCertificate.csrPem`
5. EimsCertificate row created but `isActive: false`

Yordanos sees step 9 marked complete, step 10 active with INSA email composer pre-filled.

### Day 4, 2:30 PM — Email INSA

Yordanos reviews the pre-filled email:
- To: ica@insa.gov.et
- Subject: Certificate Request — Tenant Z Cafe (TIN 0099887766)
- Body: standard template
- Attachments: tenant-z-cafe-csr.pem, certificate-request-form.docx (pre-filled with tenant info)

She clicks "Send". System sends via your SMTP, records sent date. Step 10 marked complete. Step 11 becomes current.

System schedules INSA follow-up cron entries for day 7, 10, 13.

### Day 7 — INSA reminder #1

System cron at 9:00 AM checks tasks waiting on INSA. Tenant Z task is at day 3. Cron auto-sends a polite follow-up email to ica@insa.gov.et. Logs activity: "Auto-reminder sent to INSA".

### Day 8 — INSA replies

INSA emails back a tenant-z-cafe.crt file attached.

Tigist forwards to onboarding@yourcompany.com (since INSA emailed her, not you directly).

### Day 8, 11:00 AM — Cert upload

Yordanos opens step 11 panel, drags `tenant-z-cafe.crt` into the upload zone.

Backend `CertUploadService`:
1. Reads PEM
2. Finds pending EimsCertificate row for org_tenantz
3. Decrypts private key for validation
4. Runs preflight: key matches cert ✓, not expired ✓ (validity 2 years), key size 3024 ✓, CN=0099887766 matches TIN ✓
5. Updates EimsCertificate with the cert PEM, validity dates, marks `isActive: true`
6. Calls `taskOrchestrator.completeStep('org_tenantz_taskId', 'insa-cert-received', yordanos.userId)`

Step 11 done. Step 12 (test invoice) becomes current.

### Day 8, 11:05 AM — Test invoice

Yordanos clicks "Run sandbox test". Backend:
1. Builds minimal test invoice (1 ETB, mock buyer)
2. Loads tenant config (decrypts credentials and private key in memory)
3. Calls `eimsSdk.registerInvoice(testInvoice, tenantConfig)` against `EIMS_SANDBOX_URL`
4. SDK signs with Tenant Z's private key, envelopes, POSTs
5. Sandbox responds with IRN: `a4f3d9e2...`
6. Step 12 marked complete with `capturedData: { irn: 'a4f3d9e2...', testedAt: ... }`

System auto-advances to step 13.

### Day 8, 11:10 AM — Notify tenant

Step 13 panel shows checkboxes. Yordanos checks SMS and email, leaves training unchecked (she'll schedule separately). Clicks "Send notifications".

System:
- Generates one-time login token for tigist
- Sends SMS to +251 911 234 567 with login link
- Sends email to tigist@tenantz.com with welcome content
- Marks step 13 complete

Tigist gets the SMS, clicks link, sets her password, lands in her restaurant POS dashboard.

### Day 10 — Training

Your training staff visits Tenant Z Cafe in person. Trains 2 cashiers for 4 hours. They mark step 14 complete from a tablet.

### Day 10, 4:00 PM — First production invoice

Cashier rings up a 350 ETB pizza order. POS calls `EimsSubmissionService.submitInvoice(...)`. SDK signs with Tenant Z's cert/key, submits to production EIMS endpoint. IRN returned. Receipt with QR code printed.

System detects this as Tenant Z's first production invoice (via event `InvoiceRegisteredEvent`), marks step 15 complete. OnboardingTask status auto-flips to COMPLETED.

Yordanos sees on her admin dashboard: "Tenant Z Cafe — 100% complete — 10 days".

### Total elapsed time: 10 days, 6 hours of staff work spread over those 10 days

Yordanos handled ~5 other tenants in parallel during these 10 days, since most of the time was waiting on MoR (3 days) and INSA (4 days).

---

## 16. Migration from current state

Your current template likely doesn't have an onboarding module. Migration path:

### 16.1 Apply schema changes

```bash
pnpm prisma migrate dev --name add_onboarding_module
```

Adds the four new tables (`OnboardingTask`, `OnboardingTaskStep`, `OnboardingActivity`, `OnboardingTaskTemplate`).

### 16.2 Backfill existing tenants

For any tenants already in your system, create a "legacy" task with all steps marked COMPLETED:

```typescript
// scripts/backfill-onboarding.ts
const existingOrgs = await prisma.organization.findMany({
  where: { /* active tenants */ },
});

for (const org of existingOrgs) {
  await prisma.onboardingTask.create({
    data: {
      organizationId: org.id,
      templateKey: 'legacy-migration',
      mode: 'CONCIERGE',
      status: 'COMPLETED',
      contactName: org.settings.legalName,
      contactPhone: org.settings.phone,
      contactEmail: org.settings.email,
      completedAt: org.createdAt,
      steps: {
        create: [{
          stepKey: 'legacy-migrated',
          stepOrder: 1,
          title: 'Migrated from pre-onboarding-module era',
          status: 'COMPLETED',
          completedAt: org.createdAt,
        }],
      },
    },
  });
}
```

### 16.3 Install EIMS task template

Run `pnpm gen:starter eims` which executes the EIMS pack installer that seeds the EIMS-restaurant task template.

### 16.4 Update navigation

Add `/admin/onboarding` to the platform admin sidebar.

### 16.5 Add permissions

Run `pnpm db:seed:permissions` after schema is in place.

---

## 17. Testing strategy

### 17.1 Required tests

- Unit tests for command handlers (90%+ coverage)
- Integration tests for the controller endpoints
- Mutation tests via Stryker
- E2E test: complete an entire onboarding via the admin API
- E2E test: tenant self-service flow
- Tenant isolation test: staff from company A can't see company B's tasks
- Permission test: viewer role can't advance steps

### 17.2 Test fixtures

```typescript
// test/fixtures/onboarding-task.fixture.ts
export function makeOnboardingTask(overrides: Partial<OnboardingTask> = {}) {
  return {
    id: `task_${faker.string.alphanumeric(10)}`,
    organizationId: `org_${faker.string.alphanumeric(10)}`,
    templateKey: 'eims-restaurant',
    mode: 'CONCIERGE',
    status: 'ACTIVE',
    currentStepKey: 'mor-portal-signup',
    contactName: faker.company.name(),
    contactPhone: '+25191100' + faker.string.numeric(4),
    contactEmail: faker.internet.userName() + '@test.invalid',
    startedAt: new Date(),
    ...overrides,
  };
}
```

All fixtures use anonymized data per the SDK doc's anonymized fixtures rule.

---

## 18. Final notes

### 18.1 Why this is a base template module, not an EIMS module

Every SaaS in every vertical needs structured tenant onboarding. Restaurant POS needs menu setup. Hotel PMS needs room configuration. Retail POS needs SKU import. All of these benefit from the same task workflow infrastructure.

By putting this in the base template, you get:
- Reuse across products
- Consistent operations dashboard across products
- Single audit log infrastructure
- Single notification integration

### 18.2 Why packs contribute templates, not build their own

If each pack built its own onboarding system:
- 3 different admin UIs to maintain
- Inconsistent operations experience
- Triple the testing burden
- Tenants with multiple products see different workflows

By having packs register templates into a shared module, all of these problems go away.

### 18.3 Order of operations for implementation

1. Build the generic onboarding module in base template (no EIMS knowledge)
2. Build the admin UI with mock data
3. Implement EIMS starter pack contributions (CSR gen, cert upload, etc.)
4. Test end-to-end with sandbox EIMS
5. Pilot with 2-3 real tenants
6. Refine based on staff feedback
7. Scale up

### 18.4 What this does NOT cover

- Recurring billing for the SaaS itself (separate billing module)
- Tenant offboarding (separate concern, base template has this)
- Multi-product tenants (tenant has both restaurant and hotel) — needs design pass
- Sub-tenant hierarchies (chain restaurants with branches) — defer to v2

### 18.5 Document set relationships

```
01-template-improvement-plan-complete.md   ← base template plan (includes this module)
02-eims-sdk-spec-v2.md                     ← SDK that handles signing
03-eims-starter-pack-spec.md               ← pack that uses SDK, adds EIMS task template
04-concierge-onboarding-system.md          ← THIS FILE (the operational layer)
```

Without this document (04), document 03 says "an onboarding wizard exists" without specifying what the staff actually does day to day. This document fills that gap.

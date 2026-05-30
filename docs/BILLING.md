# BILLING.md

How billing works in scaffolded projects.

---

## Architecture

Gateway-agnostic billing. Plans + Subscriptions + Invoices + Payments are stored in Postgres. Each Subscription has a `gateway` field (`stripe | chapa | manual`). Concrete gateways are adapters under `apps/api/src/modules/billing/infrastructure/{stripe,chapa}/`.

```
[Plan] 1───* [FeatureEntitlement]      (per-plan feature gates)
[Plan] 1───* [Subscription]            (one per Org)
[Subscription] 1───* [SubscriptionInvoice] 1───* [SubscriptionPayment]
[Subscription] 1───* [DunningEmail]
[Subscription] 1───* [UsageSnapshot]
```

All money stored in **smallest currency unit** (cents, santim) as `Int`. Convert to display via `amount / 100`.

---

## Gateways

### Stripe (recommended for global)

- Native subscription support (auto-renewal, dunning, customer portal)
- Webhook: `POST /api/billing/stripe/webhook`
  - Signature header: `Stripe-Signature`
  - Raw body required (configure in `main.ts`)
- Initiate: `POST /api/billing/stripe/initiate { invoiceId }`
- Portal: redirect customer to Stripe-hosted portal for self-service
- Required env: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PUBLISHABLE_KEY`
- Plan must have `stripePriceIdMonthly` + `stripePriceIdAnnual` set (create them in Stripe dashboard or via API)

### Chapa (Ethiopia-focused)

Chapa has **no native recurring API**. Recurring is layered via cron + email checkout links (per https://developer.chapa.co/docs).

- Initialize endpoint: `POST https://api.chapa.co/v1/transaction/initialize`
- Verify endpoint: `GET https://api.chapa.co/v1/transaction/verify/<tx_ref>`
- Webhook: `POST /api/billing/chapa/webhook`
  - Signature header: `chapa-signature` and/or `x-chapa-signature` (HMAC-SHA256 of raw body)
  - Verifies either header against `CHAPA_WEBHOOK_SECRET` (or `CHAPA_SECRET_KEY` fallback)
  - Always re-verifies via `verify` endpoint before crediting
- Currency: configured per plan, stored as ISO currency codes and charged in minor units
- Required env: `CHAPA_SECRET_KEY`, `CHAPA_PUBLIC_KEY`, `CHAPA_WEBHOOK_SECRET`, `CHAPA_BASE_URL` (default `https://api.chapa.co/v1`), `CHAPA_CALLBACK_BASE_URL`
- Recurring flow:
  1. `BillingLifecycleCron.dailyLifecycle` (02:00 UTC) generates `SubscriptionInvoice` 7 days before period end
  2. `DunningService` sends T-7 / T-3 / T-0 reminder emails with checkout link
  3. Customer clicks link → pays → Chapa webhook fires `charge.success`
  4. `ChapaWebhookService.handle(txRef)` re-verifies + records `SubscriptionPayment` + applies to invoice
  5. If unpaid by T+0, lifecycle states advance: `past_due → grace → read_only → locked`

### Manual (bank transfer / cash)

- Org admin selects "Manual" → Invoice generated in `pending_payment` state
- Org pays offline. Super admin verifies via `/admin/billing/$subscriptionId` → "Mark Verified"
- `RecordManualPaymentHandler` saves `SubscriptionPayment` with `verified=false`
- `VerifyPaymentHandler` toggles `verified=true` (super-admin action)

---

## Subscription Lifecycle States

```
trialing
   │   (trialEndsAt passes)
   ▼
active
   │   (period ends, no payment)
   ▼
past_due  (day 0)
   │   (gracePeriodEndsAt — usually +3 days)
   ▼
grace
   │   (readOnlyModeEndsAt — usually +7 days)
   ▼
read_only  (UI banner: pay to continue)
   │   (lockedAt — usually +14 days)
   ▼
locked  (API rejects with 402)
   │   (canceledAt — usually +30 days)
   ▼
canceled
```

Configurable via `PlatformSettings`:
- `billing.gracePeriodDays` (default 3)
- `billing.readOnlyDays` (default 7)
- `billing.lockedDays` (default 14)
- `billing.cancellationDays` (default 30)

---

## Adding a Plan

```ts
// In apps/api/prisma/seed-plans.ts (or create via super admin UI)
await prisma.plan.create({
  data: {
    slug: "team",
    nameEn: "Team",
    nameAm: "Team",
    priceMonthlyMinor: 9900,        // $99.00 USD
    priceAnnualMinor: 99000,        // $990.00 USD
    currency: "USD",
    userCap: 50,
    supportSlaHours: 12,
    stripeSupported: true,
    stripePriceIdMonthly: "price_xxx",
    stripePriceIdAnnual: "price_yyy",
    chapaSupported: true,
    manualSupported: true,
    sortOrder: 4,
    active: true,
  },
});
```

---

## Adding a Feature Entitlement

```ts
await prisma.featureEntitlement.create({
  data: {
    planId,
    featureKey: "myapp.advanced-export",
    enabled: true,
    limit: 100,        // null = unlimited; 0 = blocked
  },
});
```

Check at runtime:
```ts
import { EntitlementService } from "#modules/billing/application/services/entitlement.service";

await this.entitlements.assertCan(orgId, "myapp.advanced-export");
// throws ForbiddenException if not allowed
```

---

## Tax

Each org has `OrganizationSettings.taxRatePct` (default 0). Invoice computes:
- `subtotalMinor` = plan price
- `taxMinor` = round(subtotal × taxRatePct / 100)
- `totalMinor` = subtotal + tax

Set per-org via `PUT /organization-settings`.

---

## Testing locally

### Stripe (test mode)
1. `STRIPE_SECRET_KEY=sk_test_xxx`
2. Create test prices in Stripe dashboard
3. Use Stripe test card: `4242 4242 4242 4242`
4. Webhook: forward via `stripe listen --forward-to http://localhost:3000/api/billing/stripe/webhook`

### Chapa (test mode)
1. Sign up: https://dashboard.chapa.co
2. Use test secret key from dashboard (`CHASECK_TEST-xxx`)
3. Test card: `4084 0840 8408 4081`
4. Webhook: configure URL in Chapa dashboard → Profile → Webhooks
5. For local testing use ngrok/Cloudflare Tunnel to expose webhook URL

---

## Files reference

```
apps/api/src/modules/billing/
├── application/
│   ├── commands/
│   │   ├── start-subscription.handler.ts
│   │   ├── change-plan.handler.ts
│   │   ├── cancel-subscription.handler.ts
│   │   ├── record-manual-payment.handler.ts
│   │   ├── initiate-stripe-payment.handler.ts
│   │   └── initiate-chapa-payment.handler.ts
│   ├── queries/billing.queries.ts
│   └── services/
│       ├── billing-lifecycle.cron.ts       (cron: daily lifecycle, usage snapshots)
│       ├── subscription-lifecycle.service.ts
│       ├── invoice-lifecycle.service.ts
│       ├── invoice-pdf.service.ts          (generic PDF)
│       ├── chapa-webhook.service.ts
│       ├── stripe-webhook.service.ts
│       ├── dunning.service.ts
│       ├── entitlement.service.ts
│       └── usage-tracker.service.ts
├── domain/
│   ├── entities/{plan,subscription,subscription-invoice,subscription-payment,usage-snapshot}.entity.ts
│   ├── repositories/...
│   └── value-objects/feature-keys.vo.ts    (FEATURE_KEYS, PLAN_SLUGS, BILLING_INTERVALS, PAYMENT_METHODS, GATEWAYS)
├── infrastructure/
│   ├── stripe/stripe.client.ts
│   ├── chapa/chapa.client.ts
│   └── repositories/...
└── presentation/controllers/{billing,chapa-webhook,stripe-webhook}.controller.ts
```

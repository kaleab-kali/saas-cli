# PropFlow Audit — Property, Lease, CRM Modules

Scope: compare implemented backend + frontend against `docs/ARCHITECTURE.md` Modules 2, 3, 6. Then benchmark against leading PM + Real Estate CRM SaaS (2026) and recommend features to add.

Date: 2026-04-21
Branch audited: `feat/phase-12c-i18n`

---

## 1. Property Module (Module 2)

Coverage: ~75% of spec. Strong CRUD core. Dashboard missing map view. No CSV import. Ownership model stub-only.

### 2.1 Building Management

| Sub-feature | Status | Notes |
|---|---|---|
| 2.1.1 Building CRUD | DONE | Incl. duplicate (extra). |
| 2.1.2 Building Details | DONE | name, type (5), address, geo, yearBuilt/Renovated, totalArea, floors, class (A/B/C), zoning, taxParcelId. |
| 2.1.3 Building Media | PARTIAL | type taxonomy (photo/floorplan/document/tour/video) + sortOrder exist. No drag-reorder UI. |
| 2.1.4 Building Amenities | DONE | Predefined + custom (`isCustom`), quantity, status. |
| 2.1.5 Building Ownership | STUB | `ownerContactId` field only. Missing: ownership %, multi-owner, management agreement, owner portal config. |

### 2.2 Floor Management

| Sub-feature | Status | Notes |
|---|---|---|
| 2.2.1 Floor CRUD | DONE | supports basement/mezzanine naming. |
| 2.2.2 Floor Layout | PARTIAL | `floorPlanUrl` stored. No viewer, no unit overlay. |

### 2.3 Unit Management

| Sub-feature | Status | Notes |
|---|---|---|
| 2.3.1 Unit CRUD | DONE | Incl. bulk-create up to 100. |
| 2.3.2 Unit Details | PARTIAL | bedrooms, baths, layoutType, condition, furnished, accessibility, keyCode. Meters implemented separately (extra). |
| 2.3.3 Unit Status | DONE | 6 statuses + `UnitStatusHistory` with user+reason. |
| 2.3.4 Unit Pricing | PARTIAL | askingRent, marketRent, deposit, pricePerSqm. Missing: rent history from lease data, per-sqm/year commercial, CAM estimates. |
| 2.3.5 Unit Media | PARTIAL | same as building media (no reorder UI). |
| 2.3.6 Unit Amenities | PARTIAL | attach/detach + notes. Missing: appliances list, heating type, internet/cable readiness — not in model. |

### 2.4 Property Dashboard

| Sub-feature | Status | Notes |
|---|---|---|
| 2.4.1 Portfolio Overview | DONE | KPIs + occupancy/vacancy, expiring-30d, avg rent. |
| 2.4.2 Property Cards | DONE | per-building metrics + quick actions. |
| 2.4.3 Map View | MISSING | no geo map component. |
| 2.4.4 Filters & Search | PARTIAL | name/address + type filter. Missing: occupancy range, saved filter views. |

### 2.5 Bulk Operations

| Sub-feature | Status | Notes |
|---|---|---|
| 2.5.1 CSV/Excel Import | MISSING | feature flag exists, no handler. |
| 2.5.2 Export | PARTIAL | Buildings+Units CSV OK. Missing: property PDF reports. |

### Extras beyond spec

- **Estate / Compound** model (groups buildings) — full CRUD.
- **Custom Fields** polymorphic system across entities.
- **Utility Meters** full CRUD per unit.

### Property — Critical Gaps

1. Map view (2.4.3)
2. CSV import pipeline (2.5.1)
3. Multi-owner + ownership % + management agreement (2.1.5)
4. Appliances/heating/internet data model on unit (2.3.6)
5. Floor plan viewer w/ unit overlay (2.2.2)

---

## 2. Lease Module (Module 3)

Coverage: ~80% lifecycle + commercial; ~55% rent-collection + renter-lifecycle ops.

### 3.1 Lease Lifecycle

| Sub-feature | Status | Notes |
|---|---|---|
| 3.1.1 Creation | DONE | types incl. commercial NNN/gross/modified-gross. |
| 3.1.2 Status Workflow | DONE | draft/pending_sign/active/expiring/expired/terminated/renewed/holdover/cancelled. |
| 3.1.3 Modification | DONE | `LeaseModification` w/ oldValue/newValue + effectiveDate. |
| 3.1.4 Termination | PARTIAL | date + deposit settlement OK. Missing: move-out inspection workflow, auto termination-fee calc. |

### 3.2 Residential Lease Features

| Sub-feature | Status | Notes |
|---|---|---|
| 3.2.1 Rent Management | PARTIAL | rent, dueDay, grace, late-fee rules + charges (pet/parking/utility/hoa/storage/amenity/custom). Missing: proration logic, non-monthly rent frequency. |
| 3.2.2 Escalation | PARTIAL | 7 types incl. CPI/step-up/FMV. Missing: escalation notice document generation. |
| 3.2.3 Security Deposit | DONE | interest, deductions, refund, forwarding address. |

### 3.3 Commercial Lease Features

| Sub-feature | Status | Notes |
|---|---|---|
| 3.3.1 Rent Structure | PARTIAL | NNN/gross/modified-gross + abatement. Missing: percentage-rent calc (fields present, no invoice logic). |
| 3.3.2 CAM | DONE | 9 categories, reconciliation variance + byCategory. Gap: multi-renter pro-rata by area. |
| 3.3.3 Lease Abstraction | PARTIAL | key terms, critical dates, TIA, co-tenancy. Missing: right of first refusal, expansion/contraction options. |
| 3.3.4 Commercial Escalation | DONE | fixed %, CPI-capped, FMV, step-up. |

### 3.4 Renter/Lessee Management

| Sub-feature | Status | Notes |
|---|---|---|
| 3.4.1 Onboarding | PARTIAL | profile, docs, checklist. Missing: screening integration, move-in photo inspection, welcome-packet tracking. |
| 3.4.2 Portal | DEFERRED | correctly scoped to future mobile app. |
| 3.4.3 Communication | MISSING | no email-to-renter, no bulk email, no comm log on contact, no SMS. |
| 3.4.4 Off-boarding | PARTIAL | move-out date, checklist, deposit settle. Missing: notice-to-vacate record, key return, final utility reading. |

### 3.5 Rent Collection & Invoicing

| Sub-feature | Status | Notes |
|---|---|---|
| 3.5.1 Invoice Generation | PARTIAL | manual-only. Missing: scheduled auto-gen (BullMQ), PDF, email delivery, batch endpoint. |
| 3.5.2 Payment Recording | DONE | methods, FIFO auto-apply, overpayment credit. Missing: receipt PDF. |
| 3.5.3 Delinquency | PARTIAL | aging report 30/60/90. Missing: auto late-fee, reminder emails, payment plans, delinquency notes log. |
| 3.5.4 Rent Roll | PARTIAL | active+expiring+holdover. Missing: vacancy loss, concessions, CSV/PDF export. |

### Lease — Critical Gaps

1. Monthly invoice auto-gen job (3.5.1) — blocks entire rent-collection flow
2. Renter email/communication pipeline (3.4.3)
3. Invoice PDF + email delivery (3.5.1)
4. Auto late-fee + reminder emails (3.5.3)
5. Rent proration (3.2.1)
6. Percentage-rent calc engine (3.3.1)
7. Move-out inspection workflow (3.1.4, 3.4.4)
8. Payment plan / installment tracking (3.5.3)

---

## 3. CRM Module (Module 6)

Coverage: ~70%. Contact + activity + tag cores strong. Cross-module automation + custom fields + map view missing.

### 6.1 Contact Management

| Sub-feature | Status | Notes |
|---|---|---|
| 6.1.1 CRUD | DONE | create/archive/delete/merge (dedup types, tags, activities) + avatar. |
| 6.1.2 Types | DONE | non-exclusive multi-type assignment + custom types. |
| 6.1.3 Details | PARTIAL | multi email/phone/address + socials (linkedin/twitter/fb/ig/tiktok/yt/site) + source + comm pref. **Missing: per-org custom fields on contact** (exists elsewhere via custom-fields module — not wired to contact). |
| 6.1.4 Relationships | PARTIAL | contact↔contact bidirectional + type + notes. Missing: explicit contact↔property, contact↔deal, contact↔lease relationship records (implied via FK only, no timeline). |

### 6.2 Activity Tracking

| Sub-feature | Status | Notes |
|---|---|---|
| 6.2.1 Types | DONE | note/call(direction,duration,outcome)/email/meeting/task/viewing/document/payment/lease_signed/maintenance/system. |
| 6.2.2 Timeline | PARTIAL | chronological + filter + creator + attachments. Missing: @mention team members. |
| 6.2.3 Scheduling | PARTIAL | scheduled/completed/overdue + assignment. Reminders field reserved but not wired to notification queue. No calendar integration. |

### 6.3 Segmentation & Search

| Sub-feature | Status | Notes |
|---|---|---|
| 6.3.1 Tags | DONE | create + multi-assign + color + count. |
| 6.3.2 Segments | PARTIAL | static + dynamic with CRM-internal criteria (name/company/source/type/tag/date). Missing: cross-module criteria (lease expiry, overdue payments, deal value, unit status). |
| 6.3.3 Search & Filters | PARTIAL | full-text + AND filter. Missing: OR/advanced builder, saved views. |
| 6.3.4 Views | PARTIAL | table + card + kanban. Missing: map view. |

### 6.4 Communication

| Sub-feature | Status | Notes |
|---|---|---|
| 6.4.1 Email | PARTIAL | compose + templates with vars (first/last/full/company/email/phone/org/today) + bulk to segment. **Stub email driver**, no open/delivery tracking. |
| 6.4.2 Comm Log | DONE | auto-log emails + manual call/meeting + attachments. |

### 6.5 Automation

| Sub-feature | Status | Notes |
|---|---|---|
| 6.5.1 Triggers | PARTIAL | CRM-internal only (contact.created/updated/archived/tag_added/type_added/merged). Missing: lease, payment, maintenance, deal-stage, unit-status, date-approaching triggers. |
| 6.5.2 Actions | PARTIAL | add_tag, create_activity, send_email. Missing: move deal stage, create work order, in-app notification, update custom field. |
| 6.5.3 Builder | DONE | trigger+conditions+actions, enable/disable, exec log. `delayMinutes` reserved but not queued. |

### CRM — Critical Gaps

1. Cross-module automation triggers + actions (6.5.1, 6.5.2) — blocks flows 4, 6, 12
2. Real email driver (SMTP/Resend) + delivery tracking (6.4.1)
3. Advanced filter builder OR + saved views (6.3.3)
4. Map view (6.3.4)
5. Cross-module segment criteria (6.3.2)
6. Custom fields on contacts wired through (6.1.3)
7. Reminder queue + calendar integration for scheduled activities (6.2.3)
8. Delayed action queue (6.5.3)

---

## 4. Competitive Benchmark (2026 PM + Real Estate CRM)

Reviewed: AppFolio, Buildium, Yardi Breeze/Voyager, DoorLoop, Propertyware, Rentec, TurboTenant, Hemlane, Rent Manager, MRI, ResMan, Entrata / Follow Up Boss, Top Producer, LionDesk (sunsetting), Wise Agent, kvCORE-BoldTrail, BoomTown, HubSpot, Salesforce, Pipedrive.

### 4.1 Table-stakes features (≥3 competitors) — PropFlow status

| Bucket | Feature | PropFlow |
|---|---|---|
| Property | Listing syndication (Zillow/Apartments/etc.) | MISSING |
| Property | Mobile app | MISSING |
| Property | AI listing description/photo generation | MISSING |
| Lease | E-sign (DocuSign or native) | MISSING |
| Lease | State-specific lease template library | MISSING |
| Lease | CAM reconciliation | DONE |
| Lease | Rent escalations | DONE |
| Lease | Renewal workflow | PARTIAL (status exists, no offer gen) |
| Renter | Online application (public web form) | MISSING |
| Renter | Tenant screening (credit/criminal/eviction) | MISSING |
| Renter | Resident portal | DEFERRED (mobile app) |
| Renter | Onboarding comms | PARTIAL |
| Finance | Online rent payment (ACH/card) | MISSING (Stripe future) |
| Finance | Auto late fees | MISSING |
| Finance | Trust accounting / double-entry GL | PARTIAL (Finance module exists — scope unclear) |
| Finance | 1099 e-filing | MISSING |
| Finance | Bank reconciliation | MISSING |
| Finance | Owner statements + distributions | MISSING |
| Finance | Rent roll export | PARTIAL |
| Maintenance | Photo-uploads on requests | DONE |
| Maintenance | Vendor dispatch + acceptance | DONE (see maintenance module) |
| Maintenance | Preventive-maintenance schedules | DONE (per recent commits) |
| Maintenance | AI maintenance triage (diagnostic Qs) | MISSING |
| Maintenance | AI inspections | MISSING |
| CRM | Pipeline / deal stages | DONE (Sales module) |
| CRM | Email automation / drip | PARTIAL |
| CRM | SMS automation | MISSING |
| CRM | 2-way texting with contacts | MISSING |
| CRM | Lead-source ROI report | MISSING |
| CRM | IDX / MLS integration | MISSING |
| CRM | Speed-to-lead auto-text | MISSING |
| Reporting | Real-time KPI dashboard | DONE |
| Reporting | P&L per property | PARTIAL |
| Reporting | Delinquency / AR aging | DONE |
| Reporting | Export CSV / Excel / PDF | PARTIAL (CSV only) |
| Reporting | Scheduled report email | MISSING |
| Platform | Open REST API + OpenAPI docs | DONE (Swagger) |
| Platform | Public webhooks | MISSING (future in spec) |
| Platform | Integrations marketplace (QB/Xero/Stripe) | MISSING |

### 4.2 Rising differentiators in 2026 (worth considering)

- **Agentic AI layer** — Entrata (100+ agents), AppFolio Realm-X, DoorLoop AI Assistant handling ~80% tenant requests, ResMan AI Leasing Assistant. Common uses: auto-reply to leasing inquiries, tour booking, maintenance triage, renewal negotiation, invoice OCR.
- **AI lease abstraction** — MRI: extract key terms + critical dates from uploaded PDFs. Fits Phase 3.3.3 gap directly.
- **AI photo/listing generation** — vacancy marketing, unit turn board (AppFolio).
- **Rent-payment credit reporting** — Rentec + RentReporters, Entrata Homebody; helps renters build credit and lifts on-time rate.
- **Resident services bundle** — Entrata Homebody (insurance, deposit alternative, credit reporting).
- **Hybrid human + software** — Hemlane on-demand local agents for showings/move-in/out.
- **Behavioral AI lead scoring** — kvCORE/BoomTown predicts conversion from site behavior.
- **MLS-native market reports** — Top Producer engagement loop.
- **Drag-and-drop workflow builder** — Entrata OXP Studio; natural evolution of CRM automation builder.
- **Metered utility billing** — Rent Manager; commercial gap in PropFlow.
- **Affordable-housing compliance** — HUD / Tax Credit / Rural flows (ResMan, Yardi); valuable vertical.

---

## 5. Recommended Feature Roadmap

Ordered by ROI + blocker status.

### Tier 1 — MUST ship before first paying customer (fills table-stakes gaps)

1. **Monthly invoice auto-generation job** (BullMQ, per flow 4) — blocks rent collection
2. **Invoice PDF + email delivery** (real SMTP driver: Resend or Postmark)
3. **Renter email pipeline** — template + delivery tracking (lease module consumes CRM comm)
4. **Auto late-fee + overdue reminder emails** — tied to aging report
5. **Online rent payment** — Stripe ACH/card, webhook → payment record
6. **Tenant screening** — TransUnion SmartMove / Experian RentBureau API
7. **E-sign on leases** — DocuSign embedded or native PDF + audit
8. **Public application form** (web) → lead capture → screening
9. **CSV import** for buildings, units, contacts, leases (feature flag exists)
10. **Cross-module automation triggers** — lease/payment/maintenance/unit events wired into CRM automation builder
11. **Scheduled report email** — attach PDF/CSV, per-user cadence

### Tier 2 — Differentiation vs. SMB competitors

12. **AI leasing assistant** (LLM-driven inquiry reply + tour scheduling) — Entrata/DoorLoop parity
13. **AI lease abstraction** — upload PDF, extract key terms + critical dates into 3.3.3 abstraction fields
14. **AI maintenance triage** — renter describes issue via form, LLM asks diagnostic questions, auto-classifies category + priority
15. **Property map view** (2.4.3) + contact map view (6.3.4) — Mapbox/MapLibre
16. **Listing syndication** — Zillow/Apartments.com/Trulia feed export
17. **Owner statements + owner portal** (read-only owner view: statements, maintenance, occupancy)
18. **Bank reconciliation** — CSV import → match invoices/payments
19. **1099 e-filing** — YE tax filing for US vendors
20. **Payment plans** — installment schedule on delinquent balances
21. **Percentage-rent calculator** — commercial retail invoicing
22. **Pro-rata rent calculation** — partial month moves
23. **Preventive maintenance PDF reports** — per-building compliance pack
24. **Advanced filter builder** (OR logic + saved views) across all lists
25. **Delayed automation actions** — wire `delayMinutes` to BullMQ delayed queue

### Tier 3 — Vertical moats

26. **Agentic workflow layer** — multi-step AI agents (à la Entrata OXP) for renewal negotiation, collection sequences
27. **Affordable-housing compliance module** — HUD + LIHTC tracking
28. **Commercial CAM multi-tenant pro-rata** — required for mixed-use
29. **Metered utility billing** — submeter reads → charges
30. **IDX / MLS integration** — sales module enhancement
31. **2-way SMS (Twilio)** — speed-to-lead auto-text, tenant comms
32. **Webhooks** — public outbound events per org (per spec 11.3.2)
33. **Integrations marketplace** — QuickBooks, Xero, Slack, Google Calendar
34. **Rent-payment credit reporting** — bundle via third-party
35. **Mobile app** — renter-facing React Native (per spec flow 10)
36. **Right of first refusal + expansion/contraction options** — commercial abstraction
37. **Multi-owner + management agreement** — 2.1.5
38. **Floor plan viewer with unit overlay** — 2.2.2

---

## 6. Key PropFlow Advantages Today

- Clean Architecture per module → easier to maintain vs Yardi/AppFolio monolith
- Cross-module domain events already wired — foundation for agentic AI automation better than legacy PMS
- Commercial lease CAM + escalation coverage stronger than most SMB tools (Buildium, TurboTenant, Rentec)
- Rich custom-fields system — matches Propertyware customization
- Proper multi-tenancy (`organizationId` on every row + Prisma middleware)
- RBAC static + dynamic roles via Better Auth — competitive with Salesforce for small orgs

## 7. Biggest Risks

1. **No online payments + no real email** = cannot run monthly rent cycle in production
2. **No tenant screening + no e-sign** = manual bottleneck on every new lease
3. **No listing syndication + no public application form** = zero top-of-funnel
4. **Finance module scope unclear** — needs separate audit (double-entry GL? bank rec? owner statements?)
5. **No AI layer while competitors consolidate around agentic** — will show as "feels old" in demos by late 2026

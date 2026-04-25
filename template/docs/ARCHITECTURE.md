# PropFlow — Complete Feature Map, Architecture & Flow Design

---

# PART 1: COMPLETE FEATURE MAP (4 LEVELS DEEP)

Every feature the system will contain. Each module lists its sub-features, and each sub-feature lists its atomic capabilities.

---

## Module 1: Authentication & Authorization (Better Auth)

### 1.1 User Authentication
- 1.1.1 Email/Password Authentication
  - Sign up with email + password
  - Email verification (magic link or OTP code)
  - Login with email + password
  - Password reset flow (email link → reset page)
  - Password strength enforcement (min length, complexity rules)
  - Account lockout after N failed attempts
- 1.1.2 Social Login (OAuth2)
  - Google OAuth2 sign-in
  - Microsoft/Azure AD sign-in
  - GitHub sign-in (for developer organizations)
  - Custom OAuth2 provider configuration per organization
- 1.1.3 Two-Factor Authentication (2FA)
  - TOTP setup (Google Authenticator, Authy)
  - TOTP verification on login
  - Recovery codes generation and redemption
  - 2FA enforcement per organization (admin can require)
  - Backup phone number for SMS fallback
- 1.1.4 Passkeys / WebAuthn
  - Register hardware key or biometric
  - Login with passkey
  - Multiple passkeys per account
  - Cross-device passkey support
- 1.1.5 Magic Link Authentication
  - Send magic link to email
  - One-time link verification
  - Link expiration (configurable TTL)
- 1.1.6 Session Management
  - Cookie-based sessions (HttpOnly, Secure, SameSite)
  - Session refresh / sliding expiration
  - View active sessions list
  - Revoke individual sessions
  - Revoke all sessions (force logout everywhere)
  - Session duration configuration per organization

### 1.2 Organization Management (Multi-Tenancy)
- 1.2.1 Organization CRUD
  - Create organization (on signup or later)
  - Update organization name, slug, logo
  - Delete organization (owner only, cascade all data)
  - Organization settings page
  - Organization metadata (plan tier, billing info, custom fields)
- 1.2.2 Member Management
  - Invite members by email
  - Accept/reject invitation
  - Invitation expiration (configurable)
  - Remove members
  - View all members with role, status, last active
  - Transfer ownership to another member
  - Member limit per organization (configurable by plan)
- 1.2.3 Organization Switching
  - User belongs to multiple organizations
  - Switch active organization (context changes all data)
  - Personal account vs organization account
  - Organization-scoped API requests (orgId in session)
- 1.2.4 Teams (within Organization)
  - Create teams (e.g., "Maintenance Crew", "Leasing Agents")
  - Assign members to teams
  - Team-level permissions (e.g., team sees only their buildings)
  - Set active team
  - Remove team

### 1.3 Role-Based Access Control (RBAC)
- 1.3.1 Static Roles (Code-Defined)
  - Owner: full control, delete org, transfer ownership
  - Admin: manage members, roles, settings, all data
  - Property Manager: manage properties, leases, renters, maintenance
  - Leasing Agent: manage listings, leads, viewings, offers
  - Maintenance Staff: manage work orders, update status, log costs
  - Accountant: manage invoices, payments, financial reports
  - Tenant (portal): view own lease, pay rent, submit requests → **REMOVED (Future: Mobile App)**
  - Viewer: read-only access to assigned properties
- 1.3.2 Custom Permissions (Resource:Action Pattern)
  - property: [create, read, update, delete, archive]
  - unit: [create, read, update, delete, assign]
  - lease: [create, read, update, terminate, renew]
  - renter: [create, read, update, remove]
  - maintenance: [create, read, update, assign, close, delete]
  - work-order: [create, read, update, assign, complete, approve-cost]
  - procurement: [request, approve, reject, create-po, receive]
  - vendor: [create, read, update, delete, rate]
  - contact: [create, read, update, delete, merge, export]
  - pipeline: [create, read, update, delete, move-stage]
  - deal: [create, read, update, close, assign]
  - listing: [create, read, update, publish, unpublish, delete]
  - invoice: [create, read, update, send, void, record-payment]
  - report: [view-dashboard, view-financial, export, create-custom]
  - organization: [update, delete, manage-billing]
  - member: [invite, read, update-role, remove]
  - audit-log: [read]
- 1.3.3 Dynamic Roles (Database-Stored, Per Organization)
  - Create custom roles at runtime from admin dashboard
  - Assign any combination of resource:action permissions
  - Edit role permissions without code deployment
  - Delete custom roles (reassign members first)
  - Maximum roles per organization (configurable)
  - Role cannot grant permissions the creator doesn't have
- 1.3.4 Permission Checking
  - Server-side: `auth.api.hasPermission({ permissions: { property: ["create"] } })`
  - Client-side: `authClient.organization.checkRolePermission()`
  - NestJS Guard: `@Permissions('property:create')` decorator
  - Multiple roles per user (union of permissions)
  - Permission caching (in-memory per request)

### 1.4 RBAC vs ABAC — What Better Auth Handles and What You Build

- 1.4.1 What Better Auth Provides (RBAC)
  - Role-to-permission mapping (static + dynamic)
  - Organization-scoped role assignment
  - `hasPermission()` API for resource:action checks
  - Type-safe permission definitions with `createAccessControl()`
  - Multiple roles per member (comma-separated, union)
  - Dynamic role CRUD at runtime per organization
  - Teams with team-level role assignment
- 1.4.2 What Better Auth Does NOT Provide (ABAC)
  - No attribute-based conditions (e.g., "only if property is in their assigned buildings")
  - No data-level filtering (e.g., "can only see units where they are the assigned agent")
  - No contextual rules (e.g., "can only approve POs under $5000")
  - No time-based access (e.g., "can only access during business hours")
  - No relationship-based access (e.g., "can edit lease only if they created it")
- 1.4.3 How to Bridge the Gap (Your Application Layer)
  - Use Better Auth RBAC for coarse-grained: "Can this user do X at all?"
  - Use Prisma middleware for data-level filtering: "Filter results by user's assigned buildings"
  - Use NestJS Guards + custom logic for fine-grained: "Can this user do X on THIS specific record?"
  - Use CASL library (optional) for declarative ability definitions
  - Pattern: Better Auth checks role → Your guard checks ownership/assignment → Prisma filters data

### 1.5 API Key Management
- 1.5.1 API Key CRUD
  - Generate API key for organization
  - Name/label API key
  - Set expiration date
  - Revoke API key
  - View last used timestamp
- 1.5.2 API Key Scoping
  - Read-only vs read-write keys
  - Scope to specific resources (e.g., properties only)
  - Rate limiting per key

### 1.6 Audit & Security
- 1.6.1 Audit Log
  - Log every write operation (who, what, when, old value, new value)
  - Log authentication events (login, logout, failed attempts)
  - Log role changes and permission modifications
  - Searchable and filterable audit log UI
  - Audit log retention policy (configurable)
  - Export audit log (CSV/JSON)
- 1.6.2 Security Settings
  - Password policy configuration per org
  - Session timeout configuration
  - IP allowlist (enterprise)
  - Force 2FA for all members
  - Account deactivation (soft delete)

---

## Module 2: Property Portfolio

### 2.1 Building Management
- 2.1.1 Building CRUD
  - Create building with name, type, address
  - Building types: Residential, Commercial, Mixed-Use, Industrial, Retail
  - Edit building details
  - Archive building (soft delete, preserves history)
  - Delete building (only if no active leases)
  - Duplicate building (template for similar properties)
- 2.1.2 Building Details
  - Full address with geocoding (lat/lng)
  - Year built, year renovated
  - Total area (sqm or sqft, configurable)
  - Number of floors
  - Number of units (auto-calculated)
  - Building class (A, B, C for commercial)
  - Zoning information
  - Tax parcel ID / cadastral number
  - Custom fields (organization-defined)
- 2.1.3 Building Media
  - Photo gallery (upload multiple, drag to reorder)
  - Floor plans (per floor, PDF or image)
  - Virtual tour URL link
  - Video upload/link
  - Document attachments (building permits, certificates, insurance)
- 2.1.4 Building Amenities
  - Predefined amenity list (elevator, parking, gym, pool, security, etc.)
  - Custom amenities per organization
  - Amenity quantity (e.g., 50 parking spots)
  - Amenity status (active, under maintenance, planned)
- 2.1.5 Building Ownership
  - Owner information (links to Contact in CRM)
  - Ownership percentage (for multi-owner properties)
  - Management agreement details
  - Owner portal access configuration

### 2.2 Floor Management
- 2.2.1 Floor CRUD
  - Create floor within building
  - Floor number/name (supports basement, mezzanine, etc.)
  - Floor area
  - Floor plan image/PDF
  - Floor-specific amenities
- 2.2.2 Floor Layout
  - Visual floor plan viewer (uploaded image with unit overlays)
  - Unit placement on floor plan (future)

### 2.3 Unit Management
- 2.3.1 Unit CRUD
  - Create unit within building/floor
  - Unit identifier (number, suite, letter)
  - Unit type: Studio, 1BR, 2BR, 3BR, Office, Retail Space, Warehouse, Parking, Storage
  - Area (sqm/sqft)
  - Edit unit details
  - Archive unit
  - Bulk create units (e.g., "create 10 units on floor 3")
- 2.3.2 Unit Details
  - Number of bedrooms, bathrooms (residential)
  - Office layout type (open plan, private, co-working) for commercial
  - Condition rating (excellent, good, fair, poor)
  - Furnished / unfurnished / semi-furnished
  - Accessibility features (wheelchair, elevator access)
  - Utility meters (electric, water, gas meter numbers)
  - Key/access code management
  - Custom fields
- 2.3.3 Unit Status
  - Available
  - Occupied (linked to active lease)
  - Reserved (hold for prospect)
  - Under Maintenance (linked to work order)
  - Off Market (temporarily not available)
  - Listed for Sale
  - Status history log with timestamps
- 2.3.4 Unit Pricing
  - Asking rent (monthly)
  - Market rent estimate
  - Rent history (all past lease amounts)
  - Price per sqm/sqft (auto-calculated)
  - Deposit amount
  - Commercial: price per sqm per year, CAM estimates
- 2.3.5 Unit Media
  - Photo gallery per unit
  - Unit floor plan
  - Video walkthrough link
  - 3D tour link
- 2.3.6 Unit Amenities
  - Unit-specific amenities (balcony, parking spot, storage unit)
  - Appliances list (washer, dryer, dishwasher, AC units)
  - Heating type (central, individual, none)
  - Internet/cable readiness

### 2.4 Property Dashboard
- 2.4.1 Portfolio Overview
  - Total buildings, units, area managed
  - Occupancy rate (overall, per building, per type)
  - Vacancy rate and trend
  - Revenue summary (monthly, quarterly, annual)
  - Outstanding payments total
  - Open maintenance tickets count
- 2.4.2 Property Cards
  - Card view showing each building with key metrics
  - Occupancy bar, revenue, open issues
  - Quick actions (view, edit, add unit)
- 2.4.3 Map View
  - All properties plotted on a map
  - Color-coded by occupancy or status
  - Click to view property details
- 2.4.4 Filters & Search
  - Filter by type, status, city, occupancy range
  - Full-text search across property names and addresses
  - Saved filter views

### 2.5 Bulk Operations
- 2.5.1 Import
  - CSV/Excel import for buildings and units
  - Column mapping UI
  - Validation report before import
  - Dry run mode
- 2.5.2 Export
  - Export property list to CSV/Excel
  - Export with all details or selected fields
  - Export property reports (PDF)

---

## Module 3: Lease & Rental Management

### 3.1 Lease Lifecycle
- 3.1.1 Lease Creation
  - Select unit + renter (or create new renter)
  - Lease type: Residential Monthly, Residential Fixed-Term, Commercial NNN, Commercial Gross, Commercial Modified Gross
  - Start date, end date (or month-to-month)
  - Rent amount (monthly, quarterly, annual)
  - Security deposit amount
  - Move-in date (can differ from lease start)
  - Lease document upload (signed PDF)
  - Co-renters / guarantors
  - Custom lease terms (free-text or structured)
- 3.1.2 Lease Status Workflow
  - Draft: being prepared, not yet active
  - Pending Signature: sent to renter for signing
  - Active: executed and in effect
  - Expiring Soon: within configurable window (30/60/90 days)
  - Month-to-Month: fixed term ended, auto-converted
  - Renewal Pending: renewal offer sent
  - Terminated Early: broken before end date
  - Expired: end date passed, not renewed
  - Cancelled: voided before activation
- 3.1.3 Lease Modification
  - Rent adjustment (with effective date)
  - Add/remove co-renters
  - Extend end date
  - Add addendum (document upload)
  - Record all modifications with audit trail
- 3.1.4 Lease Termination
  - Early termination request (renter or landlord initiated)
  - Early termination fee calculation
  - Move-out inspection scheduling
  - Security deposit deduction worksheet
  - Deposit refund processing
  - Final account settlement

### 3.2 Residential Lease Features
- 3.2.1 Rent Management
  - Fixed monthly rent
  - Rent due date (configurable, default 1st of month)
  - Grace period (e.g., 5 days)
  - Late fee rules: flat amount, percentage, daily, capped
  - Rent proration calculation (partial month move-in/out)
  - Pet rent (additional monthly charge)
  - Parking fee (additional monthly charge)
  - Utility reimbursement charges
- 3.2.2 Rent Escalation
  - Annual fixed percentage increase
  - CPI-linked increase (manual entry of CPI)
  - Custom escalation schedule
  - Escalation notice generation
  - Escalation effective date tracking
- 3.2.3 Security Deposit
  - Deposit amount recording
  - Interest calculation (where legally required)
  - Deduction categories (cleaning, repairs, unpaid rent)
  - Deduction itemization worksheet
  - Refund amount calculation
  - Refund payment tracking

### 3.3 Commercial Lease Features
- 3.3.1 Commercial Rent Structure
  - Base rent (per sqm/sqft per year or monthly lump sum)
  - Triple Net (NNN): renter pays property tax, insurance, maintenance
  - Gross Lease: landlord covers all operating expenses
  - Modified Gross: split operating expenses
  - Percentage rent (retail: base + % of gross sales above breakpoint)
  - Rent abatement periods (free rent months)
- 3.3.2 CAM (Common Area Maintenance)
  - CAM charge calculation per renter/lessee (pro-rata by area)
  - CAM budget vs. actual tracking
  - Annual CAM reconciliation
  - CAM estimate billing (monthly)
  - CAM reconciliation statement generation
  - CAM categories: cleaning, landscaping, security, utilities, repairs
- 3.3.3 Lease Abstraction
  - Key terms summary extraction from lease document
  - Critical dates tracking (renewal option, termination notice, rent review)
  - Renter improvement allowance (TIA) tracking
  - Exclusive use clauses
  - Co-tenancy clauses
  - Right of first refusal
  - Expansion/contraction options
- 3.3.4 Commercial Escalation
  - Annual fixed percentage
  - CPI adjustment with cap and floor
  - Fair market value adjustment at specified intervals
  - Step-up rent schedule

### 3.4 Renter/Lessee Management

> **TERMINOLOGY NOTE:** Throughout this document, "Renter" or "Lessee" refers to the person
> renting an apartment or leasing an office — the end-customer of the organization.
> "Organization" or "SaaS tenant" refers to the property management company using PropFlow.
> Renters/lessees do **NOT** have login access to PropFlow. All renter data is managed
> by the organization's staff. A future mobile app will provide renter self-service.

- 3.4.1 Renter Onboarding (Staff-Managed)
  - Create renter profile (stored as CRM Contact with type "Renter")
  - Renter application form (name, employer, income, references) — filled by staff
  - Renter screening integration (credit check, background check) — future
  - Document collection (ID, proof of income, references) — uploaded by staff
  - Lease signing (upload signed document — signed offline or via external e-sign)
  - Move-in checklist generation
  - Move-in inspection (photo documentation by staff)
  - Welcome packet / handbook delivery (offline, tracked in system)
- 3.4.2 ~~Renter Portal~~ → **FUTURE: Mobile App**
  - **NOT in current scope.** All renter interactions are handled by staff.
  - Future mobile app features (separate React Native project):
    - Renter login (separate Better Auth scope)
    - View lease details and documents
    - View payment history and current balance
    - Make rent payment (Stripe integration)
    - Submit maintenance request (with photos and description)
    - View maintenance request status
    - View building announcements
    - Update contact information
    - Download rent receipts
    - Push notifications
- 3.4.3 Renter Communication (Staff-Initiated)
  - Send email to renter from system (staff composes, system sends)
  - Bulk email to all renters in building
  - Communication log (all emails/messages tracked on CRM Contact)
  - SMS notifications (optional, future)
  - All communication is outbound from staff — renters reply via email/phone
- 3.4.4 Renter Off-boarding (Staff-Managed)
  - Notice to vacate (renter or landlord — recorded by staff)
  - Move-out date scheduling
  - Move-out inspection scheduling
  - Move-out inspection checklist (compare with move-in)
  - Key return tracking
  - Final utility reading
  - Security deposit settlement
  - Forwarding address collection

### 3.5 Rent Collection & Invoicing
- 3.5.1 Invoice Generation
  - Auto-generate monthly rent invoices from active leases
  - Include line items: base rent, CAM, utilities, late fees, credits
  - Invoice numbering (configurable format)
  - Invoice due date (from lease terms)
  - Invoice PDF generation
  - Email invoice to renter
  - Batch invoicing (all renters at once)
- 3.5.2 Payment Recording
  - Record payment against invoice (full or partial)
  - Payment methods: bank transfer, cash, check, card, other
  - Payment reference number
  - Payment date vs. deposit date
  - Auto-apply payment to oldest outstanding invoice
  - Overpayment handling (credit on account)
  - Payment receipt generation
- 3.5.3 Delinquency Management
  - Overdue invoice tracking
  - Aging report (30, 60, 90+ days)
  - Automatic late fee application
  - Overdue payment reminders (email, configurable schedule)
  - Delinquency notes and actions log
  - Payment plan creation (installments for overdue amount)
- 3.5.4 Rent Roll
  - Monthly rent roll report (all units, expected vs. received)
  - Vacancy loss calculation
  - Concessions tracking
  - Rent roll export (CSV, PDF)

---

## Module 4: Maintenance & Facility Management

### 4.1 Work Order System
- 4.1.1 Work Order Creation
  - Title, description, category
  - Priority: Emergency, Urgent, Normal, Low
  - Reported by: renter (logged by staff via phone/email), staff (internal), inspection
  - Associated unit/building/common area
  - Photo/video attachments (up to 10)
  - Preferred access times
  - Permission to enter (renter authorization, confirmed by staff)
- 4.1.2 Work Order Categories
  - Plumbing (leak, clog, fixture repair, water heater)
  - Electrical (outlet, lighting, breaker, wiring)
  - HVAC (heating, cooling, ventilation, thermostat)
  - Appliance (refrigerator, washer, dryer, dishwasher, oven)
  - Structural (wall, ceiling, floor, foundation, roof)
  - Doors & Windows (lock, hinge, glass, screen, frame)
  - Pest Control (insects, rodents, birds)
  - Painting & Cosmetic (paint, wallpaper, trim)
  - Landscaping (lawn, trees, irrigation, snow removal)
  - Cleaning (common area, unit turnover, deep clean)
  - Safety (fire alarm, carbon monoxide, emergency exit, security)
  - Elevator (maintenance, inspection, repair)
  - General / Other
  - Custom categories per organization
- 4.1.3 Work Order Assignment
  - Assign to internal maintenance staff
  - Assign to external vendor (from vendor directory)
  - Reassign between staff/vendors
  - Auto-assignment rules (by category, building, priority)
  - Assignment notification (email + in-app)
- 4.1.4 Work Order Status Workflow
  - New: just submitted, awaiting review
  - Acknowledged: reviewed by manager, pending assignment
  - Assigned: assigned to staff/vendor
  - In Progress: work has started
  - Waiting for Parts: on hold pending materials
  - Waiting for Access: renter not available
  - Waiting for Approval: cost approval needed
  - Completed: work finished, pending verification
  - Verified: inspected and confirmed done
  - Closed: fully resolved
  - Cancelled: no longer needed
  - Reopened: issue recurred
- 4.1.5 Work Order Tracking
  - Status update with notes (timestamped)
  - Time logging (start/stop clock)
  - Labor hours per person
  - Material costs itemization
  - Before/after photos
  - Completion signature (digital)
  - Renter satisfaction rating (logged by staff after follow-up call)
- 4.1.6 Work Order SLA
  - Response time targets by priority (e.g., Emergency: 1hr, Urgent: 4hr)
  - Resolution time targets by priority
  - SLA breach alerts (email to manager)
  - SLA compliance dashboard

### 4.2 Preventive Maintenance
- 4.2.1 Preventive Schedule
  - Create recurring maintenance tasks
  - Frequency: daily, weekly, monthly, quarterly, semi-annual, annual, custom interval
  - Task template (description, checklist, estimated duration)
  - Assign to staff or vendor
  - Asset/equipment association
  - Auto-generate work orders from schedule
- 4.2.2 Maintenance Tasks
  - HVAC filter replacement
  - Fire extinguisher inspection
  - Smoke/CO detector testing
  - Elevator inspection
  - Roof inspection
  - Plumbing inspection
  - Pest control treatment
  - Landscaping cycle
  - Common area deep cleaning
  - Boiler/water heater service
  - Custom tasks per building
- 4.2.3 Asset/Equipment Tracking
  - Register equipment (HVAC units, elevators, boilers, generators)
  - Serial number, model, manufacturer
  - Install date, warranty expiration
  - Maintenance history per asset
  - Replacement schedule / lifecycle tracking
  - Service manual document upload

### 4.3 Inspection Management
- 4.3.1 Inspection Types
  - Move-in inspection
  - Move-out inspection
  - Annual property inspection
  - Safety/compliance inspection
  - Routine unit inspection
  - Pre-listing inspection (before sale)
- 4.3.2 Inspection Workflow
  - Schedule inspection (date, time, inspector)
  - Inspection checklist template (per type)
  - Room-by-room checklist items
  - Condition rating per item (excellent, good, fair, poor, N/A)
  - Photo documentation per item
  - Inspector notes
  - Renter acknowledgment signature
  - Comparison with previous inspection (diff view)
  - Auto-generate work orders from inspection findings

### 4.4 Vendor Management
- 4.4.1 Vendor Directory
  - Create vendor profile (name, company, contact info)
  - Links to CRM Contact
  - Vendor specialties/categories (plumbing, electrical, HVAC, etc.)
  - Service area / coverage zone
  - License/insurance information and expiration dates
  - Insurance certificate upload
  - Tax ID / business registration
  - Preferred vs. approved vs. probation status
- 4.4.2 Vendor Performance
  - Rating system (1-5 stars per completed work order)
  - Average response time
  - Average completion time
  - Quality score (based on re-open rate)
  - Cost comparison (average cost by category)
  - Total spend per vendor
- 4.4.3 Vendor Communication
  - Send work order to vendor (email with details)
  - Vendor acceptance/rejection of work order
  - In-app messaging thread per work order
  - Vendor portal (future: self-service access)

---

## Module 5: Procurement

### 5.1 Purchase Request
- 5.1.1 Request Creation
  - Requestor (staff member)
  - Item/service description
  - Category (materials, services, equipment, supplies)
  - Quantity and estimated unit cost
  - Total estimated cost
  - Urgency: Normal, Urgent, Critical
  - Associated property/building/unit
  - Associated work order (optional)
  - Preferred vendor (optional)
  - Justification notes
  - Supporting document uploads (quotes, specs)
- 5.1.2 Request Status
  - Draft: not yet submitted
  - Submitted: awaiting approval
  - Approved: ready for PO creation
  - Rejected: with rejection reason
  - On Hold: pending information
  - Cancelled

### 5.2 Approval Workflow
- 5.2.1 Approval Rules
  - Single-tier: any admin/manager can approve
  - Multi-tier by amount: < $500 manager, < $5000 director, > $5000 owner
  - By category: maintenance supplies auto-approved, equipment requires owner
  - Custom approval chains per organization
- 5.2.2 Approval Actions
  - Approve with notes
  - Reject with reason
  - Request more information
  - Delegate to another approver
  - Escalation after timeout (auto-escalate if not acted on in X hours)

### 5.3 Purchase Order
- 5.3.1 PO Creation
  - Auto-generate from approved purchase request
  - Manual PO creation
  - PO number (auto-generated, configurable format)
  - Vendor selection (from vendor directory)
  - Line items with quantity, unit price, total
  - Delivery/completion date
  - Shipping address (property address)
  - Terms and conditions
  - PO PDF generation
- 5.3.2 PO Status
  - Draft
  - Sent to Vendor
  - Acknowledged by Vendor
  - Partially Received
  - Fully Received
  - Invoiced
  - Closed
  - Cancelled
- 5.3.3 Receiving
  - Record received items/services
  - Partial receiving (some items delivered)
  - Receiving date and received-by
  - Quality check notes
  - Discrepancy reporting (wrong item, damaged, quantity mismatch)
  - Photo documentation

### 5.4 Budget Management
- 5.4.1 Budget Setup
  - Annual budget per property/building
  - Budget by category (maintenance, supplies, capital improvements)
  - Monthly budget distribution
  - Budget carry-forward rules
- 5.4.2 Budget Tracking
  - Committed (approved POs not yet invoiced)
  - Spent (invoiced/paid)
  - Remaining budget
  - Budget vs. actual variance report
  - Over-budget alerts
  - Budget utilization dashboard

### 5.5 Vendor Bidding (Future)
- 5.5.1 Request for Quote (RFQ)
  - Create RFQ for specific work/materials
  - Send to multiple vendors
  - Set response deadline
  - Compare quotes side-by-side
  - Award to selected vendor

---

## Module 6: CRM (Unified Contact Management)

### 6.1 Contact Management
- 6.1.1 Contact CRUD
  - Create contact with name, email, phone, address
  - Edit contact details
  - Archive contact (soft delete)
  - Delete contact (hard delete, with confirmation)
  - Merge duplicate contacts
  - Contact photo/avatar
- 6.1.2 Contact Types (Non-Exclusive)
  - Renter/Lessee (current or past — the person renting from the organization)
  - Prospect (potential renter/buyer)
  - Buyer (looking to purchase)
  - Seller (property owner selling)
  - Vendor/Contractor
  - Property Owner
  - Agent/Broker
  - Investor
  - Lead (unqualified contact)
  - Partner
  - Custom types per organization
- 6.1.3 Contact Details
  - Multiple email addresses (primary, work, personal)
  - Multiple phone numbers (mobile, work, home)
  - Multiple addresses
  - Company name and title
  - Social media links
  - Date of birth
  - Preferred language
  - Preferred communication channel (email, phone, SMS)
  - Source (how they found you: website, referral, walk-in, ad, etc.)
  - Custom fields (per organization, per contact type)
- 6.1.4 Contact Relationships
  - Contact-to-Contact relationships (spouse, business partner, guarantor)
  - Contact-to-Property relationships (owner, renter, agent)
  - Contact-to-Deal relationships (buyer, seller)
  - Contact-to-Lease relationships (renter, co-renter, guarantor)
  - Relationship history and timeline

### 6.2 Activity Tracking
- 6.2.1 Activity Types
  - Note (free text)
  - Phone call (log direction, duration, outcome)
  - Email sent/received
  - Meeting (scheduled, in-person or virtual)
  - Property viewing/showing
  - Task completed
  - Document shared
  - Payment received
  - Lease signed
  - Maintenance request submitted
  - System event (auto-logged)
- 6.2.2 Activity Timeline
  - Chronological timeline per contact
  - Filter by activity type
  - Activity creator and timestamp
  - Attachments per activity
  - @mention other team members in notes
- 6.2.3 Activity Scheduling
  - Schedule follow-up calls/meetings
  - Set reminders (time-based)
  - Calendar integration (future)
  - Overdue activity alerts
  - Activity assignment to team members

### 6.3 Segmentation & Search
- 6.3.1 Tags
  - Create tags (e.g., "VIP", "corporate", "high-maintenance", "investor")
  - Assign multiple tags to contacts
  - Tag-based filtering
  - Tag color coding
  - Organization-wide tag management
- 6.3.2 Segments (Dynamic Groups)
  - Define segment by criteria:
    - Contact type = Renter AND lease expiring in < 60 days
    - Source = Website AND created in last 30 days
    - Tag contains "investor" AND total deal value > $500K
    - Renter AND overdue payments > 0
  - Auto-updating segments (recalculate on access)
  - Static segments (manual add/remove)
  - Segment count display
- 6.3.3 Search & Filters
  - Full-text search across all contact fields
  - Advanced filter builder (AND/OR conditions)
  - Filter by type, tag, status, source, date range, property, custom field
  - Save filter as named view
  - Quick filters (recent, my contacts, uncontacted)
- 6.3.4 Contact Views
  - Table view (TanStack Table with column sorting, filtering, pagination)
  - Card/grid view
  - Map view (contacts plotted by address)
  - Kanban view (by status or custom field)

### 6.4 Communication
- 6.4.1 Email from CRM
  - Compose and send email to contact
  - Email templates (create, edit, use)
  - Template variables ({{first_name}}, {{property_name}}, {{lease_end_date}})
  - Bulk email to segment (with template)
  - Email delivery tracking (sent, opened — basic)
  - Email history per contact
- 6.4.2 Communication Log
  - Auto-log all system emails
  - Manual log of phone calls
  - Manual log of in-person meetings
  - Attachment support in logs

### 6.5 Automation Rules
- 6.5.1 Trigger Events
  - Lease created / renewed / expired / expiring soon
  - Payment received / overdue / partial
  - Maintenance request created / completed
  - Contact created / updated / tag added
  - Deal stage changed
  - Unit status changed (vacated, occupied)
  - Custom date field approaching (e.g., insurance renewal)
- 6.5.2 Automated Actions
  - Create task for team member
  - Send email (from template)
  - Add tag to contact
  - Move deal to pipeline stage
  - Create activity note
  - Send in-app notification
  - Update custom field
  - Create work order
- 6.5.3 Automation Builder
  - IF [trigger] AND [conditions] THEN [action(s)]
  - Delay actions (e.g., send email 3 days after lease expires)
  - Multiple actions per rule
  - Enable/disable rules
  - Execution log (see what each rule did)

---

## Module 7: Sales (Property Sales CRM)

### 7.1 Listings
- 7.1.1 Listing Creation
  - Create from existing unit/property
  - Listing type: For Sale, For Rent (marketing)
  - Listing price / asking price
  - Price negotiability flag
  - Listing description (rich text)
  - Feature highlights
  - Select photos from property gallery
  - Virtual tour link
  - Floor plan attachment
- 7.1.2 Listing Status
  - Draft: being prepared
  - Active: publicly available
  - Under Offer: received offer, not yet accepted
  - Sold / Rented: deal closed
  - Withdrawn: removed from market
  - Expired: listing period ended
- 7.1.3 Listing Management
  - Edit listing details and price
  - Price reduction tracking (with dates)
  - Days on market counter
  - Listing views/interest counter
  - Comparable listings reference

### 7.2 Lead Management
- 7.2.1 Lead Capture
  - Manual lead entry
  - Web form submission (future: embeddable form)
  - Import from CSV
  - Lead source tracking (web, referral, portal, cold call, ad)
- 7.2.2 Lead Qualification
  - Budget range
  - Desired property type and size
  - Desired location/area
  - Timeline (urgency)
  - Financing status (pre-approved, cash, needs financing)
  - Lead score (manual or formula-based)
  - Lead temperature: Hot, Warm, Cold
- 7.2.3 Lead Assignment
  - Assign to agent/staff
  - Round-robin auto-assignment (future)
  - Assignment notification
  - Reassignment with history

### 7.3 Sales Pipeline
- 7.3.1 Pipeline Configuration
  - Default stages: Lead → Contacted → Qualified → Viewing → Offer → Negotiation → Closed Won → Closed Lost
  - Custom stages per organization
  - Stage probabilities (for forecasting)
  - Required fields per stage (e.g., must have budget to move to Qualified)
- 7.3.2 Pipeline View
  - Kanban board (drag-and-drop between stages)
  - Table/list view with stage column
  - Pipeline summary (count and value per stage)
  - Filters by agent, property type, date range
- 7.3.3 Deal Management
  - Create deal linked to lead + listing
  - Deal value (expected sale/rent amount)
  - Expected close date
  - Deal notes and activity timeline
  - Document attachments (offers, counteroffers, contracts)
  - Deal won/lost reason tracking

### 7.4 Offer Management
- 7.4.1 Offer Tracking
  - Record offer from buyer (amount, terms, conditions)
  - Counteroffer from seller (amount, modified terms)
  - Multiple offers on same listing
  - Offer status: Submitted, Countered, Accepted, Rejected, Expired, Withdrawn
  - Offer comparison view (side-by-side)
- 7.4.2 Offer Details
  - Offered price
  - Earnest money / deposit amount
  - Financing contingency
  - Inspection contingency
  - Closing date
  - Special conditions (free text)

### 7.5 Agent Management
- 7.5.1 Agent Profiles
  - Agent details (links to user/member)
  - Specialties (residential, commercial, area)
  - Active listings count
  - Active deals count
  - Closed deals count and value
- 7.5.2 Commission Tracking
  - Commission structure per agent (percentage, flat, tiered)
  - Commission calculation on deal close
  - Commission split (if multiple agents)
  - Commission payment status
  - Commission report

### 7.6 Viewing/Showing Management
- 7.6.1 Viewing Scheduling
  - Schedule viewing (date, time, property, agent, prospect)
  - Viewing confirmation email to prospect
  - Viewing reminder (day before)
  - Viewing cancellation/rescheduling
- 7.6.2 Viewing Feedback
  - Agent notes after viewing
  - Prospect interest level
  - Follow-up action required
  - Viewing history per property and per prospect

---

## Module 8: Finance & Accounting

### 8.1 Invoicing
- 8.1.1 Invoice Management
  - Auto-generate from lease (recurring)
  - Manual invoice creation
  - Credit note / credit memo
  - Invoice templates (customizable per org)
  - Invoice numbering scheme
  - Multi-line item invoices
  - Tax calculation (VAT/sales tax, configurable rates)
  - Invoice PDF generation
  - Email invoice to recipient
  - Invoice status: Draft, Sent, Viewed, Partially Paid, Paid, Overdue, Void
- 8.1.2 Invoice Line Items
  - Base rent
  - CAM charges
  - Utility charges
  - Late fees
  - Parking fees
  - Pet fees
  - Maintenance charges (passed to renter)
  - Credits / adjustments
  - Custom line items

### 8.2 Payment Management
- 8.2.1 Payment Recording
  - Record payment against invoice
  - Payment method tracking
  - Payment reference / receipt number
  - Partial payments
  - Overpayment → credit balance
  - Payment reversal / bounced check handling
  - Batch payment entry
- 8.2.2 Payment Methods
  - Bank transfer / wire
  - Cash
  - Check (with check number)
  - Credit/debit card (Stripe integration — future)
  - Online payment (future: renter mobile app + Stripe)
  - Other / custom
- 8.2.3 Payment Reconciliation
  - Match payments to invoices
  - Unallocated payment tracking
  - Bank statement reconciliation (manual matching)

### 8.3 Financial Reporting
- 8.3.1 Standard Reports
  - Income statement (P&L) per property, per portfolio
  - Cash flow statement
  - Rent roll (all units with lease terms and payment status)
  - Aging report (AR aging by renter)
  - Vacancy report (current and historical)
  - Expense report by category
  - Owner statement (for property owners)
  - Budget vs. actual report
- 8.3.2 Report Features
  - Date range selection
  - Filter by property, building, unit, renter
  - Comparison periods (this month vs. last month, YoY)
  - Export to PDF, CSV, Excel
  - Schedule automated report delivery (email)
- 8.3.3 Dashboard Widgets
  - Revenue trend chart (line)
  - Expense breakdown (pie/donut)
  - Occupancy rate trend
  - Outstanding balance summary
  - Top delinquent renters
  - Upcoming lease expirations
  - Cash flow forecast

### 8.4 Accounting Integration
- 8.4.1 Chart of Accounts
  - Default chart of accounts for property management
  - Custom account creation
  - Account types: Asset, Liability, Equity, Income, Expense
  - Account hierarchy (parent/child)
- 8.4.2 Journal Entries
  - Auto-generated from invoices and payments
  - Manual journal entries
  - Double-entry bookkeeping
- 8.4.3 Export
  - QuickBooks export format (IIF or QBO)
  - Xero export format (CSV)
  - General CSV export for any accounting system

---

## Module 9: Notifications & Communication

### 9.1 In-App Notifications
- 9.1.1 Notification Center
  - Bell icon with unread count
  - Notification list (newest first)
  - Mark as read / mark all as read
  - Click to navigate to relevant page
  - Notification grouping (by type)
- 9.1.2 Real-Time Updates
  - WebSocket connection (NestJS Gateway)
  - Instant notification on new event
  - Toast notifications for critical events
  - Browser notification permission (optional)

### 9.2 Email Notifications
- 9.2.1 Configurable Email Events
  - New maintenance request submitted
  - Work order assigned to you
  - Work order status changed
  - Lease expiring soon (30/60/90 days)
  - Rent payment received
  - Rent payment overdue
  - New lead assigned
  - Deal stage changed
  - Purchase request requiring approval
  - Invitation to join organization
  - New member joined
  - Weekly summary digest
- 9.2.2 Email Preferences
  - Per-user toggle for each email type
  - Instant vs. daily digest vs. weekly digest
  - Email frequency limits (no more than N per hour)
  - Unsubscribe link in every email
- 9.2.3 Email Delivery
  - HTML email templates (responsive)
  - Plain text fallback
  - From address configuration per organization
  - SMTP provider: any (Resend, Postmark, SendGrid, Mailgun, or own SMTP)
  - Delivery status tracking (sent, bounced, failed)

### 9.3 Bulk Communication
- 9.3.1 Announcements
  - Create announcement for building/property
  - Email announcement to all renters in building
  - Announcement types: General, Maintenance, Emergency, Event
  - Schedule announcement for future date
  - Future: visible in renter mobile app
- 9.3.2 Bulk Email
  - Select recipients by segment, building, or manual selection
  - Email template selection
  - Personalization with variables
  - Preview before sending
  - Send now or schedule

---

## Module 10: Reporting & Analytics

### 10.1 Dashboards
- 10.1.1 Main Dashboard
  - KPI cards: total units, occupancy %, revenue MTD, outstanding balance, open tickets
  - Revenue chart (last 12 months)
  - Occupancy trend
  - Recent activities feed
  - Upcoming events (lease expirations, inspections, scheduled maintenance)
  - Quick actions (create work order, add contact, record payment)
- 10.1.2 Property Dashboard
  - Per-property metrics: occupancy, revenue, costs, NOI
  - Unit status breakdown (pie chart)
  - Maintenance ticket status
  - Upcoming lease expirations for this property
- 10.1.3 Financial Dashboard
  - Income vs. expenses (bar chart)
  - Cash flow trend
  - AR aging summary
  - Budget utilization
  - Top revenue-generating properties
- 10.1.4 CRM Dashboard
  - Pipeline summary (funnel chart)
  - Lead sources breakdown
  - Conversion rates by stage
  - Agent performance comparison
  - Activities this week
- 10.1.5 Maintenance Dashboard
  - Open vs. closed tickets (trend)
  - Average resolution time
  - Tickets by category (bar chart)
  - SLA compliance rate
  - Vendor performance comparison
  - Upcoming preventive maintenance

### 10.2 Custom Reports
- 10.2.1 Report Builder
  - Select data source (properties, leases, contacts, work orders, finances)
  - Select columns to include
  - Filter conditions (AND/OR)
  - Group by field
  - Sort order
  - Aggregations (sum, count, average, min, max)
  - Save report as template
  - Share report with team members
- 10.2.2 Report Delivery
  - View in browser
  - Export to CSV
  - Export to Excel (.xlsx)
  - Export to PDF
  - Schedule recurring report (daily, weekly, monthly)
  - Email report to recipients

---

## Module 11: Platform & SaaS Infrastructure

### 11.1 Multi-Tenant Data Isolation (SaaS Tenancy — Organization Isolation)

> **Note:** "Tenant" here means SaaS tenant = Organization. NOT renter/lessee.

- 11.1.1 Data Scoping
  - Every database table has `organizationId` column
  - Prisma middleware auto-filters by active organization
  - API responses never leak cross-organization data
  - File storage scoped by organization (separate directories/prefixes)
- 11.1.2 Organization Onboarding
  - Self-service signup → create organization
  - Organization setup wizard (add first building, invite team)
  - Sample data option (populate with demo data to explore)
  - Onboarding checklist

### 11.2 Customization
- 11.2.1 Custom Fields
  - Add custom fields to: Properties, Units, Contacts, Leases, Work Orders
  - Field types: text, number, date, dropdown, multi-select, checkbox, URL, email
  - Required/optional toggle
  - Custom field visibility per role
  - Custom field in filters and reports
- 11.2.2 Custom Statuses/Categories
  - Customize work order categories
  - Customize lease types
  - Customize contact types
  - Customize pipeline stages
- 11.2.3 Organization Settings
  - Company name, logo, address
  - Default currency
  - Default area unit (sqm/sqft)
  - Date format
  - Timezone
  - Fiscal year start month
  - Invoice numbering format
  - Email footer text

### 11.3 Integration & API
- 11.3.1 REST API
  - OpenAPI/Swagger documentation (auto-generated from NestJS)
  - API versioning (v1, v2)
  - Rate limiting per API key
  - Pagination, sorting, filtering on all list endpoints
  - Bulk operations where applicable
- 11.3.2 Webhooks (Future)
  - Configure webhook URLs per event type
  - Events: lease.created, payment.received, work_order.completed, etc.
  - Webhook delivery retry (3 attempts with exponential backoff)
  - Webhook delivery log
- 11.3.3 Import/Export
  - CSV import for all major entities
  - CSV/Excel export for all list views
  - Data export (full organization data dump for migration)

### 11.4 Subscription & Billing (Future — Post 20 Customers)
- 11.4.1 Plan Management
  - Free tier (up to 10 units)
  - Paid tiers with unit-based pricing
  - Feature gating by plan (e.g., procurement only on Starter+)
  - Trial period for paid features
- 11.4.2 Billing
  - Stripe integration for subscription billing
  - Invoice generation for SaaS subscription
  - Payment method management
  - Upgrade/downgrade flow
  - Usage tracking (units count)

---

# PART 2: ARCHITECTURE (DETAILED)

## System Architecture Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                      PRESENTATION LAYER                         │
│  Vite + React 19 + TanStack Query + TanStack Table             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │ Property  │ │  Lease   │ │   CRM    │ │ Maint.   │ ...      │
│  │  Pages    │ │  Pages   │ │  Pages   │ │  Pages   │          │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
│  Shared: Layout, DataTable, Forms, Auth Provider, Query Client  │
├─────────────────────────────────────────────────────────────────┤
│                        API LAYER                                │
│  REST (JSON) + WebSocket (notifications)                        │
│  Caddy reverse proxy (HTTPS termination)                        │
├─────────────────────────────────────────────────────────────────┤
│                     APPLICATION LAYER                           │
│  NestJS Modular Monolith                                        │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                  AUTH MODULE (Better Auth)                │   │
│  │  AuthGuard · @Session · @Permissions · Organizations     │   │
│  ├──────────────────────────────────────────────────────────┤   │
│  │  FEATURE MODULES (each follows Clean Architecture)       │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │   │
│  │  │ Property │ │  Lease   │ │   CRM    │ │  Maint.  │   │   │
│  │  ├──────────┤ ├──────────┤ ├──────────┤ ├──────────┤   │   │
│  │  │  Sales   │ │Procurem. │ │ Finance  │ │ Notific. │   │   │
│  │  ├──────────┤ ├──────────┤ ├──────────┤ ├──────────┤   │   │
│  │  │Reporting │ │ Platform │ │          │ │          │   │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │   │
│  ├──────────────────────────────────────────────────────────┤   │
│  │                   SHARED KERNEL                          │   │
│  │  Guards · Interceptors · Decorators · Event Bus          │   │
│  │  OrgContext · Pagination · BaseEntity · ValueObjects   │   │
│  └──────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│                       DOMAIN LAYER                              │
│  Entities · Value Objects · Domain Events · Domain Services     │
│  Repository Interfaces · Business Rules                         │
├─────────────────────────────────────────────────────────────────┤
│                   INFRASTRUCTURE LAYER                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │ Prisma   │ │  Redis/  │ │   File   │ │   SMTP   │          │
│  │ (PG)     │ │  Valkey  │ │  Storage │ │  Email   │          │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

## Module Internal Architecture (Clean Architecture per Module)

Each feature module follows this internal structure:

```
modules/property/
├── property.module.ts              # NestJS module definition
├── domain/                         # PURE BUSINESS LOGIC (no framework deps)
│   ├── entities/
│   │   ├── building.entity.ts      # Building aggregate root
│   │   ├── unit.entity.ts          # Unit entity
│   │   └── floor.entity.ts         # Floor entity
│   ├── value-objects/
│   │   ├── address.vo.ts           # Address (street, city, zip, country, lat, lng)
│   │   ├── unit-type.vo.ts         # Enum: Studio, 1BR, Office, etc.
│   │   ├── unit-status.vo.ts       # Enum: Available, Occupied, etc.
│   │   └── area.vo.ts              # Area with unit (sqm/sqft) + conversion
│   ├── events/
│   │   ├── building-created.event.ts
│   │   ├── unit-status-changed.event.ts
│   │   └── unit-vacated.event.ts
│   ├── repositories/
│   │   ├── building.repository.ts  # INTERFACE (port) - not implementation
│   │   └── unit.repository.ts      # INTERFACE
│   └── services/
│       └── occupancy-calculator.service.ts  # Pure domain logic
├── application/                    # USE CASES (orchestration)
│   ├── commands/
│   │   ├── create-building/
│   │   │   ├── create-building.command.ts
│   │   │   └── create-building.handler.ts
│   │   ├── update-unit-status/
│   │   │   ├── update-unit-status.command.ts
│   │   │   └── update-unit-status.handler.ts
│   │   └── ...
│   ├── queries/
│   │   ├── get-building-by-id/
│   │   │   ├── get-building-by-id.query.ts
│   │   │   └── get-building-by-id.handler.ts
│   │   ├── list-units/
│   │   │   ├── list-units.query.ts
│   │   │   └── list-units.handler.ts
│   │   └── ...
│   └── dto/
│       ├── create-building.dto.ts
│       ├── update-building.dto.ts
│       ├── building-response.dto.ts
│       └── unit-filter.dto.ts
├── infrastructure/                 # EXTERNAL CONCERNS
│   ├── repositories/
│   │   ├── prisma-building.repository.ts  # Implements domain interface
│   │   └── prisma-unit.repository.ts
│   ├── mappers/
│   │   ├── building.mapper.ts      # Domain ↔ Prisma model mapping
│   │   └── unit.mapper.ts
│   └── event-handlers/
│       └── on-unit-vacated.handler.ts  # Listens, dispatches to other modules
└── presentation/                   # HTTP/WS LAYER
    ├── controllers/
    │   ├── building.controller.ts  # REST endpoints
    │   └── unit.controller.ts
    └── validators/
        ├── create-building.validator.ts  # Zod schemas for request validation
        └── update-unit.validator.ts
```

## Cross-Module Communication

Modules NEVER import each other's domain layers directly. Communication happens via:

```
1. Domain Events (async, fire-and-forget):
   LeaseModule emits "LeaseExpiringSoon" →
     CRMModule handler creates follow-up task
     NotificationModule handler sends email
     SalesModule handler flags unit for potential listing

2. Shared Query Service (sync, read-only):
   SalesModule needs property details →
     Calls PropertyQueryService (in shared kernel)
     Which calls PropertyModule's query handler internally

3. Application Events (NestJS EventEmitter2):
   @OnEvent('maintenance.work-order.created')
   handleWorkOrderCreated(event: WorkOrderCreatedEvent) {
     // Procurement module checks if parts needed
   }
```

## Database Schema (Prisma)

### Multi-Tenancy Strategy

Every table that stores business data has `organizationId` as a required foreign key:

```prisma
model Building {
  id             String   @id @default(cuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])
  name           String
  // ... other fields
  
  @@index([organizationId])
  @@map("buildings")
}
```

Prisma middleware auto-injects `organizationId` on all queries:

```typescript
prisma.$use(async (params, next) => {
  const tenantId = cls.get('organizationId'); // from AsyncLocalStorage
  if (tenantId && TENANT_MODELS.includes(params.model)) {
    if (params.action === 'findMany' || params.action === 'findFirst') {
      params.args.where = { ...params.args.where, organizationId: tenantId };
    }
    if (params.action === 'create') {
      params.args.data.organizationId = tenantId;
    }
  }
  return next(params);
});
```

## Permission Architecture (Better Auth RBAC + Application ABAC)

```
┌────────────────────────────────────────────────────────────────┐
│                     REQUEST FLOW                               │
│                                                                │
│  1. HTTP Request arrives                                       │
│     ↓                                                          │
│  2. Better Auth AuthGuard (global)                             │
│     → Validates session cookie                                 │
│     → Extracts user + organizationId                           │
│     → Rejects if not authenticated                             │
│     ↓                                                          │
│  3. @Permissions('property:create') Guard                      │
│     → Calls auth.api.hasPermission()                           │
│     → Checks user's role has property:create                   │
│     → Rejects if role doesn't have permission (RBAC)           │
│     ↓                                                          │
│  4. Controller → Application Service                           │
│     ↓                                                          │
│  5. Application-Level Checks (your code, ABAC-like)            │
│     → "Is this user assigned to this building?"                │
│     → "Is this PO amount within their approval limit?"         │
│     → "Is this their own lease?"                               │
│     ↓                                                          │
│  6. Prisma Middleware (automatic)                               │
│     → Filters all queries by organizationId                    │
│     → Ensures no cross-tenant data leakage                     │
│     ↓                                                          │
│  7. Database query executes, response returned                  │
└────────────────────────────────────────────────────────────────┘
```

### Better Auth Permission Definitions for PropFlow

```typescript
// shared/auth/permissions.ts
import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements } from "better-auth/plugins/organization/access";

export const statement = {
  ...defaultStatements,
  property:     ["create", "read", "update", "delete", "archive"],
  unit:         ["create", "read", "update", "delete", "assign"],
  lease:        ["create", "read", "update", "terminate", "renew"],
  tenant:       ["create", "read", "update", "remove"],  // "tenant" is the resource name in Better Auth
  // NOTE: "tenant" here is just a permission resource label, referring to renter/lessee data
  // We keep it as "tenant" in the code for brevity, but it governs renter/lessee management
  maintenance:  ["create", "read", "update", "assign", "close", "delete"],
  "work-order": ["create", "read", "update", "assign", "complete", "approve-cost"],
  procurement:  ["request", "approve", "reject", "create-po", "receive"],
  vendor:       ["create", "read", "update", "delete", "rate"],
  contact:      ["create", "read", "update", "delete", "merge", "export"],
  pipeline:     ["create", "read", "update", "delete", "move-stage"],
  deal:         ["create", "read", "update", "close", "assign"],
  listing:      ["create", "read", "update", "publish", "unpublish", "delete"],
  invoice:      ["create", "read", "update", "send", "void", "record-payment"],
  report:       ["view-dashboard", "view-financial", "export", "create-custom"],
  "audit-log":  ["read"],
} as const;

export const ac = createAccessControl(statement);

export const owner = ac.newRole({
  property: ["create", "read", "update", "delete", "archive"],
  unit: ["create", "read", "update", "delete", "assign"],
  lease: ["create", "read", "update", "terminate", "renew"],
  tenant: ["create", "read", "update", "remove"],
  maintenance: ["create", "read", "update", "assign", "close", "delete"],
  "work-order": ["create", "read", "update", "assign", "complete", "approve-cost"],
  procurement: ["request", "approve", "reject", "create-po", "receive"],
  vendor: ["create", "read", "update", "delete", "rate"],
  contact: ["create", "read", "update", "delete", "merge", "export"],
  pipeline: ["create", "read", "update", "delete", "move-stage"],
  deal: ["create", "read", "update", "close", "assign"],
  listing: ["create", "read", "update", "publish", "unpublish", "delete"],
  invoice: ["create", "read", "update", "send", "void", "record-payment"],
  report: ["view-dashboard", "view-financial", "export", "create-custom"],
  "audit-log": ["read"],
  organization: ["update", "delete"],
  member: ["create", "read", "update", "delete"],
});

export const admin = ac.newRole({
  // Same as owner except no org delete
  property: ["create", "read", "update", "delete", "archive"],
  unit: ["create", "read", "update", "delete", "assign"],
  lease: ["create", "read", "update", "terminate", "renew"],
  // ... all resources with full permissions
  organization: ["update"],
  member: ["create", "read", "update", "delete"],
});

export const propertyManager = ac.newRole({
  property: ["create", "read", "update"],
  unit: ["create", "read", "update", "assign"],
  lease: ["create", "read", "update", "renew"],
  tenant: ["create", "read", "update"],
  maintenance: ["create", "read", "update", "assign", "close"],
  "work-order": ["create", "read", "update", "assign", "complete"],
  procurement: ["request"],
  vendor: ["read", "rate"],
  contact: ["create", "read", "update"],
  invoice: ["create", "read", "send"],
  report: ["view-dashboard"],
});

export const leasingAgent = ac.newRole({
  property: ["read"],
  unit: ["read"],
  lease: ["create", "read", "update"],
  tenant: ["create", "read", "update"],
  contact: ["create", "read", "update"],
  pipeline: ["read", "update", "move-stage"],
  deal: ["create", "read", "update", "assign"],
  listing: ["create", "read", "update", "publish", "unpublish"],
  report: ["view-dashboard"],
});

export const maintenanceStaff = ac.newRole({
  property: ["read"],
  unit: ["read"],
  maintenance: ["read", "update"],
  "work-order": ["read", "update", "complete"],
  vendor: ["read"],
});

export const accountant = ac.newRole({
  property: ["read"],
  unit: ["read"],
  lease: ["read"],
  tenant: ["read"],
  invoice: ["create", "read", "update", "send", "void", "record-payment"],
  report: ["view-dashboard", "view-financial", "export", "create-custom"],
  procurement: ["approve", "receive"],
});

// NOTE: No renter/lessee role — renters do NOT log into PropFlow.
// Future mobile app will define its own auth scope and limited permissions.

export const viewer = ac.newRole({
  property: ["read"],
  unit: ["read"],
  lease: ["read"],
  contact: ["read"],
  report: ["view-dashboard"],
});
```

---

# PART 3: EVERY FLOW DESIGN

## Flow 1: User Registration & Organization Setup

```
User visits signup page
  → Enter email, password, name
  → Better Auth creates user account
  → Email verification sent (magic link or OTP)
  → User verifies email
  → Redirect to "Create Organization" page
    → Enter company name, select industry (property management)
    → Better Auth creates Organization
    → User becomes Owner of organization
    → Redirect to Onboarding Wizard
      → Step 1: Company details (address, timezone, currency, area unit)
      → Step 2: Add first building (or skip)
      → Step 3: Invite team members (email + role) (or skip)
      → Step 4: Choose to load sample data (or skip)
    → Redirect to main Dashboard
```

## Flow 2: Invite Member & Set Role

```
Admin opens Settings → Members → Invite
  → Enter email address
  → Select role (from static + dynamic roles)
  → Optionally assign to team
  → Better Auth creates Invitation record
  → System sends invitation email with link
Invitee clicks link
  → If existing user: accept invitation → added to org with role
  → If new user: signup flow → then added to org with role
  → Redirect to organization dashboard
Admin can:
  → View pending invitations
  → Cancel/resend invitation
  → Change member role after joining
  → Remove member from organization
```

## Flow 3: Create Building → Add Units → Create Lease

```
Manager opens Properties → Add Building
  → Fill form: name, type, address, details
  → Upload photos, floor plans
  → Save → Building created, event: BuildingCreated
  → System auto-creates CRM Contact for owner (if specified)

Manager opens Building → Add Unit
  → Fill form: unit number, type, floor, area, amenities
  → Set pricing (asking rent, deposit)
  → Save → Unit created with status "Available"

Manager opens Unit → Create Lease
  → Select/create renter (creates CRM Contact with type "Renter" if new)
  → Set lease type, dates, rent, deposit, terms
  → Upload signed lease document
  → Save as Draft → Review → Activate
  → Event: LeaseCreated
    → Unit status changes to "Occupied"
    → CRM Contact updated with type "Renter"
    → First rent invoice auto-generated
    → Staff notification: "Lease activated for Unit X"
```

## Flow 4: Rent Collection Cycle (Monthly)

```
1st of month (or configured date):
  → Scheduled job (BullMQ) runs "GenerateMonthlyInvoices"
  → For each active lease:
    → Create invoice with line items (rent, CAM, fees)
    → Set due date from lease terms
    → Send invoice email to renter
    → Staff notification: "Monthly invoices generated"

Renter pays rent:
  → (Future: online via renter mobile app + Stripe)
  → (Now: staff records payment manually)
  → Manager opens invoice → Record Payment
    → Enter amount, method, date, reference
    → If full payment: invoice → Paid
    → If partial: invoice → Partially Paid, remaining balance shown
    → Event: PaymentReceived
      → CRM activity logged on renter's contact
      → Financial records updated

Grace period passes without payment:
  → Scheduled job checks overdue invoices
  → Apply late fee (based on lease rules)
  → Send overdue reminder email
  → Event: PaymentOverdue
    → CRM task created: "Follow up on overdue rent"
    → Manager notification: "Unit 4B - rent 15 days overdue"

Aging thresholds:
  → 30 days: second reminder, escalation to manager
  → 60 days: third reminder, flag contact as delinquent
  → 90 days: alert owner, consider legal action
```

## Flow 5: Maintenance Request (Staff-Logged)

```
Renter calls/emails about an issue (e.g., leaking faucet in Unit 4B)

Staff member opens PropFlow → Maintenance → New Request
  → Selects unit (4B) — renter auto-populated from active lease
  → Selects category (Plumbing)
  → Describes issue (from renter's report)
  → Uploads photos (if renter sent any via email/WhatsApp)
  → Sets preferred access times (from renter conversation)
  → Records permission to enter (confirmed verbally with renter)
  → Submits → Status: New
  → Event: MaintenanceRequestCreated

System processes request:
  → In-app notification to property manager
  → Email notification to property manager
  → Request appears in Maintenance dashboard

Property Manager reviews request:
  → Opens request → Acknowledges → Status: Acknowledged
  → Assesses priority (Emergency/Urgent/Normal/Low)
  → Creates Work Order → assigns to:
    → Internal staff member, OR
    → External vendor (from vendor directory)
  → Event: WorkOrderCreated
    → Notification to assigned person
    → Email to vendor (with job details)
    → If Emergency: immediate SMS alert

Assigned person performs work:
  → Updates status: In Progress
  → Logs time (start/stop)
  → Notes materials used and costs
  → If needs parts → Status: Waiting for Parts
    → Event: PartsNeeded
    → Procurement module: auto-create Purchase Request (if enabled)
  → Completes work → Status: Completed
  → Uploads after photos
  → Digital signature

Manager verifies:
  → Reviews completion notes and photos
  → Status: Verified → Closed
  → Event: WorkOrderCompleted
  → Staff calls/emails renter to confirm resolution
  → Staff logs satisfaction rating (from renter feedback)
  → If vendor: vendor rating updated
  → Cost logged to property expenses
  → CRM activity logged on renter's contact
```

## Flow 6: Lease Expiration → CRM Follow-Up → Sales Listing

```
Scheduled job runs daily: "CheckExpiringLeases"
  → Finds leases expiring within 90/60/30 day windows

90 days before expiration:
  → Event: LeaseExpiringSoon(90)
  → CRM: Create task "Discuss renewal with renter [name] for unit [X]"
  → CRM: Tag contact "lease-expiring-90"
  → Email manager: "Lease expiring in 90 days for unit 4B"

60 days before expiration:
  → Event: LeaseExpiringSoon(60)
  → CRM: Create task "Send renewal offer to renter [name]"
  → Auto-generate renewal offer (new lease with escalated rent)
  → Email renter: "Your lease renewal options"

30 days before expiration:
  → Event: LeaseExpiringSoon(30)
  → CRM: Escalate task to urgent
  → Notification to owner: "Unit 4B lease expiring in 30 days, no renewal yet"

Lease expires without renewal:
  → Lease status → Expired
  → Event: LeaseExpired
  → Event: UnitVacated
    → Unit status → Available
    → CRM: Update contact type (Renter → Past Renter)
    → CRM: Create task "Collect keys and schedule move-out inspection"
    → Sales module: Auto-create draft listing for unit
    → Notification: "Unit 4B is now vacant"

Alternatively, renter renews:
  → Manager creates new lease (or extends existing)
  → Event: LeaseRenewed
  → CRM: Remove expiring tags
  → CRM: Log activity "Lease renewed for 12 months"
  → Close all related tasks
```

## Flow 7: Sales Pipeline (Property Sale)

```
New lead arrives:
  → Manual entry or web form or import
  → CRM Contact created with type "Lead"
  → Lead qualification:
    → Budget, preferences, timeline, financing status
    → Lead score assigned
    → Lead temperature: Hot/Warm/Cold
  → Assigned to agent
  → Pipeline stage: Lead
  → Event: LeadCreated
    → Agent notification: "New lead assigned to you"

Agent contacts lead:
  → Logs call/email in CRM activity
  → Pipeline stage: Contacted
  → Schedules property viewing

Viewing scheduled:
  → Viewing record created (date, time, property, agent, prospect)
  → Confirmation email to prospect
  → Reminder notification day before
  → Agent conducts viewing
  → Logs viewing notes and interest level
  → Pipeline stage: Viewing

Offer received:
  → Record offer (price, terms, contingencies)
  → Pipeline stage: Offer
  → Notify property owner
  → If counteroffer: update offer record
  → If multiple offers: comparison view
  → Pipeline stage: Negotiation

Offer accepted:
  → Pipeline stage: Closed Won
  → Deal value recorded
  → Commission calculated
  → Unit status updated
  → CRM contact type updated (Lead → Buyer)
  → Event: DealClosed
    → Finance: record expected payment
    → All related tasks closed
    → Agent performance metrics updated

Offer rejected or lead lost:
  → Pipeline stage: Closed Lost
  → Lost reason recorded
  → Lead moved to nurture segment
  → Future follow-up task created (3-6 months)
```

## Flow 8: Procurement (Purchase Request → PO → Receiving)

```
Maintenance staff needs parts for work order:
  → Opens "Create Purchase Request"
  → Links to work order
  → Selects items needed, estimated cost
  → Selects preferred vendor (optional)
  → Submits request → Status: Submitted
  → Event: PurchaseRequestSubmitted

Approval routing:
  → System checks approval rules:
    → Amount < $500: auto-approve (or single manager approval)
    → Amount $500-$5000: requires property manager approval
    → Amount > $5000: requires owner/admin approval
  → Notification to approver(s)

Approver reviews:
  → Opens request → reviews details and justification
  → Actions:
    → Approve → Status: Approved
    → Reject → Status: Rejected (with reason, notify requestor)
    → Request Info → Status: On Hold (with question)

Approved → Create PO:
  → Manager creates Purchase Order from approved request
  → Selects vendor (or confirms preferred)
  → Adds line items with final quantities/prices
  → Generates PO PDF
  → Sends PO to vendor (email)
  → PO Status: Sent to Vendor

Vendor delivers:
  → Staff records receiving
  → Partial or full receipt
  → Quality check notes
  → Discrepancy flagging
  → PO Status: Partially Received → Fully Received

Vendor invoice arrives:
  → Match to PO
  → Three-way match: PO ↔ Receipt ↔ Invoice
  → If match: approve for payment
  → If discrepancy: flag for review
  → Event: VendorInvoiceApproved
    → Finance: record expense
    → Budget: update committed/spent
    → Work Order: update cost
```

## Flow 9: Permission Check Flow (RBAC + ABAC)

```
Example: Property Manager tries to approve a $3000 Purchase Request

Step 1 - Authentication (Better Auth AuthGuard):
  → Session cookie validated
  → User extracted: { id: "user123", organizationId: "org456" }
  → ✅ Authenticated

Step 2 - RBAC Permission Check (Better Auth):
  → Guard checks: hasPermission({ procurement: ["approve"] })
  → User role: "propertyManager"
  → propertyManager role has: procurement: ["request"] ← only "request", NOT "approve"
  → ❌ DENIED — returns 403 Forbidden

Alternative: Admin tries the same:
  → User role: "admin"
  → admin role has: procurement: ["request", "approve", "reject", "create-po", "receive"]
  → ✅ RBAC passed

Step 3 - ABAC Check (Your Application Code):
  → Application service checks:
    → Is this PO for a building the admin is assigned to? (if building-scoping enabled)
    → Is the PO amount within admin's approval limit?
    → These are custom business rules in your code, NOT in Better Auth
  → ✅ or ❌ based on business logic

Step 4 - Data Scoping (Prisma Middleware):
  → Query automatically filtered: WHERE organizationId = 'org456'
  → Admin can only see POs from their own organization
  → ✅ Data isolation guaranteed
```

## Flow 10: ~~Tenant Portal Authentication~~ → FUTURE: Renter Mobile App

```
╔══════════════════════════════════════════════════════════════════╗
║  NOT IN CURRENT SCOPE                                           ║
║                                                                  ║
║  Currently, renters/lessees do NOT have any login or access      ║
║  to PropFlow. All renter interactions are managed by the         ║
║  organization's staff through the main PropFlow interface.       ║
║                                                                  ║
║  FUTURE PHASE: Renter Mobile App (React Native)                  ║
║                                                                  ║
║  When ready to build:                                            ║
║  → Separate React Native app (iOS + Android)                     ║
║  → Separate Better Auth scope for renter authentication          ║
║  → Renter accounts created by staff, magic link sent to renter   ║
║  → Extremely limited permissions:                                ║
║      lease: [read], maintenance: [create, read], invoice: [read] ║
║  → Data scoped to: their org + their own lease/unit only         ║
║  → Features: view lease, pay rent (Stripe), submit maintenance   ║
║    request, view request status, view announcements,             ║
║    download receipts, update contact info, push notifications    ║
║  → Separate API endpoints or same API with renter-scoped guards  ║
║                                                                  ║
║  Prerequisite: stable core platform + 20+ paying organizations   ║
╚══════════════════════════════════════════════════════════════════╝
```

## Flow 11: Multi-Organization Context Switch

```
User belongs to 2 organizations:
  → "Downtown Properties LLC" (role: owner)
  → "Sunset Beach Rentals" (role: property manager)

User logs in:
  → Better Auth session includes: activeOrganizationId
  → Frontend shows organization switcher in sidebar
  → All API calls include organizationId from session

User switches organization:
  → Clicks "Sunset Beach Rentals" in org switcher
  → Client calls: authClient.organization.setActive({ organizationId: "sunset123" })
  → Session updates with new activeOrganizationId
  → All data refreshes (TanStack Query invalidates all queries)
  → User now sees only Sunset Beach Rentals data
  → Role changes too: now they're a property manager (different permissions)
  → UI updates: some menu items may disappear (no finance access as PM)
```

## Flow 12: Domain Event Chain (Cross-Module)

```
Trigger: Renter moves out of Unit 4B

1. Lease Module:
   → Lease terminated → status: Expired
   → Emits: LeaseExpired { leaseId, unitId, renterId, orgId }

2. Property Module (listens to LeaseExpired):
   → Updates Unit 4B status: Occupied → Available
   → Emits: UnitVacated { unitId, buildingId, orgId }

3. CRM Module (listens to LeaseExpired):
   → Updates Contact: type Renter → Past Renter
   → Creates Activity: "Lease ended for Unit 4B"
   → Creates Task: "Collect keys and schedule move-out inspection"
   → Applies tag: "past-tenant"

4. Maintenance Module (listens to UnitVacated):
   → Auto-creates Work Order: "Unit turnover cleaning - Unit 4B"
   → Auto-creates Work Order: "Move-out inspection - Unit 4B"

5. Sales Module (listens to UnitVacated):
   → Creates draft Listing for Unit 4B
   → Copies unit details, photos, pricing to listing
   → Notifies leasing agents: "New unit available for listing"

6. Notification Module (listens to all above):
   → In-app: "Unit 4B is now vacant"
   → Email to property manager: "Lease ended, unit available"
   → Email to owner: "Vacancy update for your property"

7. Reporting Module:
   → Occupancy rate recalculated
   → Vacancy loss tracking begins for Unit 4B

All of this happens asynchronously via the event bus.
The Lease Module has NO IDEA that Sales will create a listing.
Each module reacts independently.
```

## Flow 13: Reporting / Dashboard Data Flow

```
User opens main Dashboard:

Frontend (React):
  → useQuery('dashboard-kpis') → GET /api/v1/dashboard/kpis
  → useQuery('revenue-chart') → GET /api/v1/dashboard/revenue?period=12m
  → useQuery('recent-activities') → GET /api/v1/dashboard/activities?limit=10
  → useQuery('upcoming-events') → GET /api/v1/dashboard/events?days=30

Backend (NestJS):
  → Each endpoint hits a DashboardQueryHandler
  → Queries run against PostgreSQL with organizationId filter
  → Some queries use materialized views / cached aggregates (Redis)
  → Response: JSON with pre-computed metrics

Dashboard KPIs query (example):
  → SELECT count(*) FROM units WHERE org_id = ? AND status = 'occupied'
  → SELECT sum(amount) FROM payments WHERE org_id = ? AND month = current_month
  → SELECT count(*) FROM work_orders WHERE org_id = ? AND status IN ('new','in-progress')
  → SELECT count(*) FROM invoices WHERE org_id = ? AND status = 'overdue'

Caching strategy:
  → Dashboard KPIs cached in Redis (TTL: 5 minutes)
  → Cache invalidated on relevant write events
  → Chart data cached longer (TTL: 15 minutes)
  → Real-time count updates via WebSocket (badge counters)
```

---

# PART 4: BETTER AUTH — RBAC vs ABAC DEEP DIVE

## What Better Auth Gives You (RBAC)

Better Auth's Organization plugin provides a resource:action permission model.

**How it works:**

1. You define a statement (all possible resources and actions):
```typescript
const statement = {
  property: ["create", "read", "update", "delete"],
  lease: ["create", "read", "update", "terminate"],
} as const;
```

2. You create roles mapping resources to allowed actions:
```typescript
const propertyManager = ac.newRole({
  property: ["create", "read", "update"],  // no delete
  lease: ["create", "read", "update"],     // no terminate
});
```

3. At runtime, you check:
```typescript
// Server-side
const allowed = await auth.api.hasPermission({
  headers,
  body: { permissions: { property: ["delete"] } }
});
// Returns false for propertyManager

// Client-side (synchronous, static roles only)
const canDelete = authClient.organization.checkRolePermission({
  role: "propertyManager",
  permissions: { property: ["delete"] }
});
```

4. Dynamic roles (per-organization, stored in DB):
```typescript
// Admin creates a custom role at runtime
await authClient.organization.createRole({
  role: "senior-manager",
  permission: { property: ["create", "read", "update", "delete"] },
  organizationId: "org123",
});
```

**This is pure RBAC**: the decision is based solely on the user's role. It doesn't consider:
- Which specific property they're trying to delete
- Whether they're assigned to that building
- Whether it's business hours
- Whether the property has active leases

## What You Must Build (ABAC Layer)

For fine-grained, context-aware access control, you build a thin ABAC layer on top:

```typescript
// NestJS Guard for building-scoped access
@Injectable()
export class BuildingAccessGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user; // from Better Auth session
    const buildingId = request.params.buildingId;
    
    // Step 1: Better Auth already checked RBAC (via @Permissions decorator)
    // Step 2: Now check ABAC - is user assigned to this building?
    const assignment = await this.prisma.buildingAssignment.findFirst({
      where: {
        userId: user.id,
        buildingId: buildingId,
        organizationId: user.organizationId,
      }
    });
    
    // Admins and Owners bypass building assignment check
    if (user.role === 'owner' || user.role === 'admin') return true;
    
    return !!assignment;
  }
}

// Usage in controller:
@UseGuards(BuildingAccessGuard)
@Permissions('property:update') // RBAC check first
@Put('buildings/:buildingId')
async updateBuilding(@Param('buildingId') id: string, @Body() dto: UpdateBuildingDto) {
  // If we get here, user has both the role permission AND building assignment
}
```

**Procurement approval limits (ABAC example):**

```typescript
@Injectable()
export class ProcurementApprovalGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const requestId = request.params.requestId;
    
    const purchaseRequest = await this.prisma.purchaseRequest.findUnique({
      where: { id: requestId, organizationId: user.organizationId }
    });
    
    // ABAC rule: approval limits by role
    const limits = {
      'propertyManager': 500,
      'admin': 5000,
      'owner': Infinity,
    };
    
    const userLimit = limits[user.role] || 0;
    return purchaseRequest.estimatedCost <= userLimit;
  }
}
```

## Summary: Better Auth Handles Auth + Coarse RBAC. You Handle Fine-Grained ABAC.

| Concern | Who Handles It | How |
|---------|---------------|-----|
| User identity | Better Auth | Session, cookies, JWT |
| Organization membership | Better Auth | Organization plugin |
| "Can this role do X?" | Better Auth | `hasPermission()` |
| "Can this user do X on THIS resource?" | Your code | NestJS Guards + Prisma queries |
| "Is the amount within their limit?" | Your code | Business logic in services |
| "Show only their assigned buildings" | Your code | Prisma middleware or query filters |
| "No cross-organization data" | Prisma middleware | Auto-filter by organizationId |

This hybrid approach is the industry standard for SaaS. Better Auth gives you 80% of what you need. The remaining 20% (resource-level, attribute-based checks) is specific to your domain and must be in your application code.

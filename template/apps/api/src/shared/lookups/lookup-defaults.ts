/**
 * Default lookup values seeded per organization on first use.
 * Tenants have full CRUD over their own catalog — these are
 * starting points, not immutable.
 *
 * To add a new kind: add entry here + update LookupKind type + KNOWN_KINDS
 * in lookup.controller.ts + add permission check if needed.
 */
export interface DefaultLookup {
	value: string;
	label: string;
	color?: string;
	sortOrder?: number;
}

export const LOOKUP_DEFAULTS = {
	contact_type: [
		{ value: "renter", label: "Renter/Lessee", sortOrder: 1 },
		{ value: "prospect", label: "Prospect", sortOrder: 2 },
		{ value: "buyer", label: "Buyer", sortOrder: 3 },
		{ value: "seller", label: "Seller", sortOrder: 4 },
		{ value: "vendor", label: "Vendor/Contractor", sortOrder: 5 },
		{ value: "owner", label: "Property Owner", sortOrder: 6 },
		{ value: "agent", label: "Agent/Broker", sortOrder: 7 },
		{ value: "investor", label: "Investor", sortOrder: 8 },
		{ value: "lead", label: "Lead", sortOrder: 9 },
		{ value: "partner", label: "Partner", sortOrder: 10 },
	] as DefaultLookup[],

	contact_source: [
		{ value: "website", label: "Website", sortOrder: 1 },
		{ value: "referral", label: "Referral", sortOrder: 2 },
		{ value: "walk_in", label: "Walk-in", sortOrder: 3 },
		{ value: "ad", label: "Advertising", sortOrder: 4 },
		{ value: "social_media", label: "Social Media", sortOrder: 5 },
		{ value: "import", label: "Import", sortOrder: 6 },
		{ value: "cold_outreach", label: "Cold Outreach", sortOrder: 7 },
		{ value: "event", label: "Event", sortOrder: 8 },
		{ value: "other", label: "Other", sortOrder: 99 },
	] as DefaultLookup[],

	comm_channel: [
		{ value: "email", label: "Email", sortOrder: 1 },
		{ value: "phone", label: "Phone", sortOrder: 2 },
		{ value: "sms", label: "SMS", sortOrder: 3 },
		{ value: "whatsapp", label: "WhatsApp", sortOrder: 4 },
		{ value: "in_person", label: "In Person", sortOrder: 5 },
	] as DefaultLookup[],

	activity_type: [
		{ value: "note", label: "Note", sortOrder: 1 },
		{ value: "call", label: "Phone Call", sortOrder: 2 },
		{ value: "email", label: "Email", sortOrder: 3 },
		{ value: "meeting", label: "Meeting", sortOrder: 4 },
		{ value: "viewing", label: "Property Viewing", sortOrder: 5 },
		{ value: "task", label: "Task", sortOrder: 6 },
		{ value: "document", label: "Document Shared", sortOrder: 7 },
	] as DefaultLookup[],

	relationship_type: [
		{ value: "spouse", label: "Spouse", sortOrder: 1 },
		{ value: "partner", label: "Partner", sortOrder: 2 },
		{ value: "guarantor", label: "Guarantor", sortOrder: 3 },
		{ value: "parent", label: "Parent", sortOrder: 4 },
		{ value: "child", label: "Child", sortOrder: 5 },
		{ value: "sibling", label: "Sibling", sortOrder: 6 },
		{ value: "business_partner", label: "Business Partner", sortOrder: 7 },
		{ value: "co_renter", label: "Co-Renter", sortOrder: 8 },
		{ value: "other", label: "Other", sortOrder: 99 },
	] as DefaultLookup[],

	work_order_category: [
		{ value: "plumbing", label: "Plumbing", sortOrder: 1 },
		{ value: "electrical", label: "Electrical", sortOrder: 2 },
		{ value: "hvac", label: "HVAC", sortOrder: 3 },
		{ value: "appliance", label: "Appliance", sortOrder: 4 },
		{ value: "structural", label: "Structural", sortOrder: 5 },
		{ value: "doors_windows", label: "Doors & Windows", sortOrder: 6 },
		{ value: "pest", label: "Pest Control", sortOrder: 7 },
		{ value: "painting", label: "Painting", sortOrder: 8 },
		{ value: "landscaping", label: "Landscaping", sortOrder: 9 },
		{ value: "cleaning", label: "Cleaning", sortOrder: 10 },
		{ value: "safety", label: "Safety", sortOrder: 11 },
		{ value: "elevator", label: "Elevator", sortOrder: 12 },
		{ value: "general", label: "General", sortOrder: 13 },
		{ value: "custom", label: "Custom", sortOrder: 99 },
	] as DefaultLookup[],

	work_order_priority: [
		{ value: "emergency", label: "Emergency", color: "#dc2626", sortOrder: 1 },
		{ value: "urgent", label: "Urgent", color: "#ea580c", sortOrder: 2 },
		{ value: "normal", label: "Normal", color: "#6b7280", sortOrder: 3 },
		{ value: "low", label: "Low", color: "#94a3b8", sortOrder: 4 },
	] as DefaultLookup[],

	asset_type: [
		{ value: "hvac", label: "HVAC", sortOrder: 1 },
		{ value: "elevator", label: "Elevator", sortOrder: 2 },
		{ value: "boiler", label: "Boiler", sortOrder: 3 },
		{ value: "generator", label: "Generator", sortOrder: 4 },
		{ value: "alarm", label: "Alarm", sortOrder: 5 },
		{ value: "pump", label: "Pump", sortOrder: 6 },
		{ value: "water_heater", label: "Water heater", sortOrder: 7 },
		{ value: "other", label: "Other", sortOrder: 99 },
	] as DefaultLookup[],

	pm_category: [
		{ value: "hvac_filter", label: "HVAC filter replacement", sortOrder: 1 },
		{ value: "fire_extinguisher", label: "Fire extinguisher inspection", sortOrder: 2 },
		{ value: "smoke_detector", label: "Smoke/CO detector test", sortOrder: 3 },
		{ value: "elevator", label: "Elevator inspection", sortOrder: 4 },
		{ value: "roof", label: "Roof inspection", sortOrder: 5 },
		{ value: "plumbing", label: "Plumbing inspection", sortOrder: 6 },
		{ value: "pest", label: "Pest control", sortOrder: 7 },
		{ value: "landscaping", label: "Landscaping", sortOrder: 8 },
		{ value: "cleaning", label: "Common area deep clean", sortOrder: 9 },
		{ value: "boiler", label: "Boiler service", sortOrder: 10 },
		{ value: "custom", label: "Custom", sortOrder: 99 },
	] as DefaultLookup[],

	vendor_specialty: [
		{ value: "plumbing", label: "Plumbing", sortOrder: 1 },
		{ value: "electrical", label: "Electrical", sortOrder: 2 },
		{ value: "hvac", label: "HVAC", sortOrder: 3 },
		{ value: "appliance", label: "Appliance", sortOrder: 4 },
		{ value: "structural", label: "Structural", sortOrder: 5 },
		{ value: "pest", label: "Pest control", sortOrder: 6 },
		{ value: "landscaping", label: "Landscaping", sortOrder: 7 },
		{ value: "cleaning", label: "Cleaning", sortOrder: 8 },
		{ value: "safety", label: "Safety", sortOrder: 9 },
		{ value: "elevator", label: "Elevator", sortOrder: 10 },
		{ value: "general", label: "General contractor", sortOrder: 11 },
	] as DefaultLookup[],

	pr_category: [
		{ value: "materials", label: "Materials", sortOrder: 1 },
		{ value: "services", label: "Services", sortOrder: 2 },
		{ value: "equipment", label: "Equipment", sortOrder: 3 },
		{ value: "supplies", label: "Supplies", sortOrder: 4 },
		{ value: "custom", label: "Custom", sortOrder: 99 },
	] as DefaultLookup[],

	pr_urgency: [
		{ value: "normal", label: "Normal", sortOrder: 1 },
		{ value: "urgent", label: "Urgent", sortOrder: 2 },
		{ value: "critical", label: "Critical", sortOrder: 3 },
	] as DefaultLookup[],

	budget_category: [
		{ value: "maintenance", label: "Maintenance", sortOrder: 1 },
		{ value: "supplies", label: "Supplies", sortOrder: 2 },
		{ value: "capital_improvements", label: "Capital Improvements", sortOrder: 3 },
		{ value: "services", label: "Services", sortOrder: 4 },
		{ value: "custom", label: "Custom", sortOrder: 99 },
	] as DefaultLookup[],

	listing_type: [
		{ value: "rent", label: "Rent", sortOrder: 1 },
		{ value: "sale", label: "Sale", sortOrder: 2 },
	] as DefaultLookup[],

	listing_feature: [
		{ value: "parking", label: "Parking", sortOrder: 1 },
		{ value: "pets_allowed", label: "Pets Allowed", sortOrder: 2 },
		{ value: "furnished", label: "Furnished", sortOrder: 3 },
		{ value: "air_conditioning", label: "Air Conditioning", sortOrder: 4 },
		{ value: "heating", label: "Heating", sortOrder: 5 },
		{ value: "gym", label: "Gym", sortOrder: 6 },
		{ value: "pool", label: "Pool", sortOrder: 7 },
		{ value: "laundry", label: "In-unit Laundry", sortOrder: 8 },
		{ value: "balcony", label: "Balcony", sortOrder: 9 },
		{ value: "view", label: "View", sortOrder: 10 },
		{ value: "security", label: "Security", sortOrder: 11 },
		{ value: "storage", label: "Storage", sortOrder: 12 },
	] as DefaultLookup[],

	lead_source: [
		{ value: "website", label: "Website", sortOrder: 1 },
		{ value: "referral", label: "Referral", sortOrder: 2 },
		{ value: "zillow", label: "Zillow", sortOrder: 3 },
		{ value: "realtor", label: "Realtor.com", sortOrder: 4 },
		{ value: "walk_in", label: "Walk-in", sortOrder: 5 },
		{ value: "cold_call", label: "Cold Call", sortOrder: 6 },
		{ value: "event", label: "Event", sortOrder: 7 },
		{ value: "social_media", label: "Social Media", sortOrder: 8 },
		{ value: "other", label: "Other", sortOrder: 99 },
	] as DefaultLookup[],

	lead_temperature: [
		{ value: "hot", label: "Hot", color: "#ef4444", sortOrder: 1 },
		{ value: "warm", label: "Warm", color: "#f59e0b", sortOrder: 2 },
		{ value: "cold", label: "Cold", color: "#3b82f6", sortOrder: 3 },
	] as DefaultLookup[],

	financing_status: [
		{ value: "cash", label: "Cash", sortOrder: 1 },
		{ value: "pre_approved", label: "Pre-approved", sortOrder: 2 },
		{ value: "approved", label: "Approved", sortOrder: 3 },
		{ value: "pending", label: "Pending", sortOrder: 4 },
		{ value: "declined", label: "Declined", sortOrder: 5 },
	] as DefaultLookup[],

	agent_specialty: [
		{ value: "residential_sale", label: "Residential Sales", sortOrder: 1 },
		{ value: "residential_rent", label: "Residential Rentals", sortOrder: 2 },
		{ value: "commercial_sale", label: "Commercial Sales", sortOrder: 3 },
		{ value: "commercial_lease", label: "Commercial Leasing", sortOrder: 4 },
		{ value: "luxury", label: "Luxury Properties", sortOrder: 5 },
		{ value: "investment", label: "Investment Properties", sortOrder: 6 },
	] as DefaultLookup[],

	interest_level: [
		{ value: "high", label: "High", color: "#10b981", sortOrder: 1 },
		{ value: "medium", label: "Medium", color: "#f59e0b", sortOrder: 2 },
		{ value: "low", label: "Low", color: "#ef4444", sortOrder: 3 },
		{ value: "none", label: "None", sortOrder: 4 },
	] as DefaultLookup[],

	approver_role: [
		{ value: "owner", label: "Owner", sortOrder: 1 },
		{ value: "admin", label: "Admin", sortOrder: 2 },
		{ value: "propertyManager", label: "Property Manager", sortOrder: 3 },
		{ value: "accountant", label: "Accountant", sortOrder: 4 },
		{ value: "maintenanceCoordinator", label: "Maintenance Coordinator", sortOrder: 5 },
		{ value: "leasingAgent", label: "Leasing Agent", sortOrder: 6 },
	] as DefaultLookup[],
} as const;

export type LookupKind = keyof typeof LOOKUP_DEFAULTS;

export const KNOWN_LOOKUP_KINDS: LookupKind[] = Object.keys(LOOKUP_DEFAULTS) as LookupKind[];

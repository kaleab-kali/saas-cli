import type { Page, Route } from "@playwright/test";
import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
	await page.route("**/api/auth/get-session", async (route) => {
		await route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify({ data: null }),
		});
	});
});

const now = () => new Date().toISOString();

const onboardingTask = {
	id: "task_smoke",
	organizationId: "org_smoke",
	templateKey: "generic-saas",
	mode: "CONCIERGE",
	status: "ACTIVE",
	currentStepKey: "company-profile",
	assignedToUserId: "staff_smoke",
	contactName: "Demo Owner",
	contactPhone: "+251911000000",
	contactEmail: "owner@example.test",
	startedAt: now(),
	completedAt: null,
	blockedReason: null,
	metadata: {
		businessType: "restaurant",
		legalName: "Demo Cafe PLC",
		tradeName: "Demo Cafe",
		taxId: "0011223344",
		vatNumber: "VAT-0011223344",
		region: "Addis Ababa",
		subCity: "Bole",
		woreda: "03",
		managerPhone: "+251922000000",
		preferredChannel: "WhatsApp",
		plan: "pro",
		paymentMethod: "telebirr",
		paymentAmount: "4500",
		paymentReference: "TX-DEMO-001",
	},
	organization: { id: "org_smoke", name: "Demo Cafe", slug: "demo-cafe", createdAt: now() },
	assignedTo: { id: "staff_smoke", name: "Yordanos", email: "staff@example.test", image: null },
	progress: { total: 4, completed: 1, currentStepKey: "company-profile", percent: 25 },
	activities: [
		{
			id: "act_smoke",
			type: "STAFF_ACTION",
			message: "Tenant created by support",
			userId: "staff_smoke",
			createdAt: now(),
		},
	],
	steps: [
		{
			id: "step_account",
			stepKey: "account-created",
			stepOrder: 1,
			title: "Account created",
			description: "Owner account and workspace exist",
			category: "setup",
			assigneeType: "STAFF",
			canBeSelfService: true,
			status: "COMPLETED",
			startedAt: null,
			completedAt: now(),
			completedByUserId: "staff_smoke",
			notes: null,
			blocked: false,
			blockedReason: null,
		},
		{
			id: "step_profile",
			stepKey: "company-profile",
			stepOrder: 2,
			title: "Company profile",
			description: "Confirm legal name, tax ID, currency, and timezone",
			category: "profile",
			assigneeType: "TENANT",
			canBeSelfService: true,
			status: "IN_PROGRESS",
			startedAt: now(),
			completedAt: null,
			completedByUserId: null,
			notes: null,
			blocked: false,
			blockedReason: null,
		},
		{
			id: "step_team",
			stepKey: "team",
			stepOrder: 3,
			title: "Invite team",
			description: "Invite the first staff members",
			category: "team",
			assigneeType: "TENANT",
			canBeSelfService: true,
			status: "PENDING",
			startedAt: null,
			completedAt: null,
			completedByUserId: null,
			notes: null,
			blocked: false,
			blockedReason: null,
		},
		{
			id: "step_live",
			stepKey: "go-live",
			stepOrder: 4,
			title: "Go live review",
			description: "Staff confirms the tenant is ready",
			category: "verification",
			assigneeType: "STAFF",
			canBeSelfService: false,
			status: "PENDING",
			startedAt: null,
			completedAt: null,
			completedByUserId: null,
			notes: null,
			blocked: false,
			blockedReason: null,
		},
	],
} as const;

const ok = (body: unknown) => ({
	status: 200,
	contentType: "application/json",
	body: JSON.stringify(body),
});

async function installAuthenticatedMocks(page: Page) {
	await page.unroute("**/api/auth/get-session").catch(() => undefined);
	await page.route("**/api/auth/**", async (route: Route) => {
		const url = route.request().url();
		if (url.includes("/organization/list")) {
			await route.fulfill(ok([{ id: "org_smoke", name: "Demo Cafe", slug: "demo-cafe" }]));
			return;
		}
		if (url.includes("/organization/get-full-organization")) {
			await route.fulfill(ok({ id: "org_smoke", name: "Demo Cafe", slug: "demo-cafe" }));
			return;
		}
		await route.fulfill(
			ok({
				session: {
					id: "session_smoke",
					userId: "user_smoke",
					activeOrganizationId: "org_smoke",
					expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
				},
				user: { id: "user_smoke", name: "Demo Owner", email: "owner@example.test" },
			}),
		);
	});

	let teamMembers = [
		{
			id: "member_owner",
			organizationId: "org_smoke",
			userId: "user_smoke",
			role: "owner",
			createdAt: now(),
			user: { id: "user_smoke", name: "Demo Owner", email: "owner@example.test", image: null },
		},
		{
			id: "member_staff",
			organizationId: "org_smoke",
			userId: "user_staff",
			role: "member",
			createdAt: now(),
			user: { id: "user_staff", name: "Staff User", email: "staff@example.test", image: null },
		},
	];
	let teamInvitations = [
		{
			id: "inv_existing",
			organizationId: "org_smoke",
			email: "pending@example.test",
			role: "viewer",
			status: "pending",
			expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
			inviterId: "user_smoke",
			createdAt: now(),
			acceptUrl: "http://localhost:5173/settings/members?invitationId=inv_existing",
		},
	];
	let apiKeys = [
		{
			id: "key_active",
			organizationId: "org_smoke",
			name: "Automation token",
			keyPrefix: "vsk_live",
			scopes: ["read:organization"],
			createdByUserId: "user_smoke",
			expiresAt: null,
			revokedAt: null,
			lastUsedAt: null,
			usageCount: 3,
			rateLimit: 60,
			createdAt: now(),
			updatedAt: now(),
		},
		{
			id: "key_revoked",
			organizationId: "org_smoke",
			name: "Old webhook",
			keyPrefix: "vsk_old",
			scopes: ["read:notification"],
			createdByUserId: "user_smoke",
			expiresAt: null,
			revokedAt: now(),
			lastUsedAt: null,
			usageCount: 1,
			rateLimit: null,
			createdAt: now(),
			updatedAt: now(),
		},
	];
	let organizationSettings = {
		id: "org_settings_smoke",
		organizationId: "org_smoke",
		timezone: "UTC",
		currency: "USD",
		areaUnit: "sqm",
		dateFormat: "YYYY-MM-DD",
		fiscalYearStartMonth: 1,
		invoiceNumberPrefix: "INV",
		invoiceNumberPadding: 5,
		emailFooter: "Demo footer",
		logoUrl: "https://example.test/logo.png",
		primaryColor: "#3b82f6",
		companyAddress: "Bole, Addis Ababa",
		companyPhone: "+251911000000",
		companyEmail: "billing@example.test",
		taxId: "0011223344",
		allowGmViewAgentContacts: false,
		allowGmExportAgentContacts: false,
		createdAt: now(),
		updatedAt: now(),
	};
	const roleMatrix = {
		organization: ["read", "update"],
		team: ["read", "invite"],
		billing: ["read"],
	};
	const systemRoles = [
		{
			slug: "owner",
			statements: { organization: ["read", "update"], team: ["read", "invite"], billing: ["read"] },
		},
		{
			slug: "admin",
			statements: { organization: ["read", "update"], team: ["read"], billing: ["read"] },
		},
		{
			slug: "viewer",
			statements: { organization: ["read"] },
		},
	];
	let customRoles = [
		{
			id: "role_existing",
			organizationId: "org_smoke",
			slug: "auditor",
			nameEn: "Auditor",
			nameAm: null,
			description: "Read-only audit access",
			inheritsFromSlug: "viewer",
			permissionsJson: { organization: ["read"] },
			scopeJson: null,
			createdByUserId: "user_smoke",
			isSystem: false,
			active: true,
			createdAt: now(),
			updatedAt: now(),
			memberCount: 0,
		},
	];
	let lookupItems = [
		{
			id: "lookup_existing",
			organizationId: "org_smoke",
			kind: "project_status",
			value: "active",
			label: "Active",
			description: "Work is currently active",
			color: "#22c55e",
			sortOrder: 10,
			isBuiltIn: false,
			archived: false,
			createdAt: now(),
			updatedAt: now(),
		},
	];
	const tenantPlans = [
		{
			id: "plan_starter",
			slug: "starter",
			nameEn: "Starter",
			nameAm: "Starter",
			description: "Entry plan for small tenant teams",
			priceMonthlyMinor: 150000,
			priceAnnualMinor: 1500000,
			currency: "ETB",
			userCap: 5,
			supportSlaHours: 72,
			stripeSupported: false,
			stripePriceIdMonthly: null,
			stripePriceIdAnnual: null,
			chapaSupported: true,
			manualSupported: true,
			sortOrder: 5,
			entitlements: [],
		},
		{
			id: "plan_pro",
			slug: "pro",
			nameEn: "Pro",
			nameAm: "Pro",
			description: "Production plan for growing tenants",
			priceMonthlyMinor: 450000,
			priceAnnualMinor: 4500000,
			currency: "ETB",
			userCap: 25,
			supportSlaHours: 24,
			stripeSupported: false,
			stripePriceIdMonthly: null,
			stripePriceIdAnnual: null,
			chapaSupported: true,
			manualSupported: true,
			sortOrder: 10,
			entitlements: [],
		},
	];
	let tenantSubscription = {
		id: "tenant_sub_smoke",
		organizationId: "org_smoke",
		planId: "plan_pro",
		planSlug: "pro",
		status: "active",
		billingInterval: "monthly",
		currency: "ETB",
		gateway: "manual",
		currentPeriodStart: now(),
		currentPeriodEnd: now(),
		canceledAt: null,
		cancelAtPeriodEnd: false,
		trialEndsAt: null,
		creditBalanceMinor: 0,
	};
	let tenantInvoice = {
		id: "tenant_invoice_smoke",
		number: "INV-TENANT-001",
		status: "sent",
		issueDate: now(),
		dueDate: now(),
		periodStart: now(),
		periodEnd: now(),
		currency: "ETB",
		subtotalMinor: 450000,
		taxMinor: 0,
		totalMinor: 450000,
		amountPaidMinor: 0,
		lineType: "subscription",
		description: "Pro monthly subscription",
		stripeInvoiceId: null,
		chapaTxRef: null,
		checkoutUrl: null,
		pdfUrl: null,
		paidAt: null,
	};

	// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: this e2e mock dispatches many independent tenant API fixtures.
	await page.route("**/api/v1/**", async (route: Route) => {
		const url = route.request().url();
		const requestUrl = new URL(url);
		const pathname = requestUrl.pathname;
		if (url.includes("/billing/me")) {
			await route.fulfill(ok({ data: { subscription: null, lifecycle: null, entitlements: {} } }));
			return;
		}
		if (url.includes("/billing/capabilities")) {
			await route.fulfill(
				ok({
					data: {
						"platform.api-keys": {
							key: "platform.api-keys",
							label: "API keys",
							category: "platform",
							enabled: true,
							limit: 10,
							used: 1,
							remaining: 9,
							reason: "included",
						},
					},
				}),
			);
			return;
		}
		if (pathname === "/api/v1/billing/plans") {
			await route.fulfill(ok({ data: tenantPlans }));
			return;
		}
		if (pathname === "/api/v1/billing/subscription") {
			if (route.request().method() === "POST") {
				const body = JSON.parse(route.request().postData() ?? "{}");
				tenantSubscription = {
					...tenantSubscription,
					planSlug: body.planSlug,
					billingInterval: body.billingInterval ?? "monthly",
				};
				await route.fulfill(ok({ data: tenantSubscription }));
				return;
			}
			await route.fulfill(
				ok({
					data: {
						subscription: tenantSubscription,
						plan: tenantPlans.find((plan) => plan.slug === tenantSubscription.planSlug) ?? tenantPlans[0],
					},
				}),
			);
			return;
		}
		if (pathname === "/api/v1/billing/subscription/change-plan" && route.request().method() === "POST") {
			const body = JSON.parse(route.request().postData() ?? "{}");
			tenantSubscription = {
				...tenantSubscription,
				planSlug: body.planSlug,
				billingInterval: body.billingInterval ?? tenantSubscription.billingInterval,
			};
			await route.fulfill(ok({ data: tenantSubscription }));
			return;
		}
		if (pathname === "/api/v1/billing/usage") {
			await route.fulfill(
				ok({
					data: {
						userCount: 2,
						apiCallCount: 128,
						emailCount: 6,
						caps: { users: 25 },
						usagePct: { users: 8 },
						metrics: { reports: 3 },
					},
				}),
			);
			return;
		}
		if (pathname === "/api/v1/billing/invoices") {
			await route.fulfill(ok({ data: [tenantInvoice], meta: { total: 1 } }));
			return;
		}
		if (pathname === "/api/v1/billing/payments/manual" && route.request().method() === "POST") {
			const body = JSON.parse(route.request().postData() ?? "{}");
			tenantInvoice = {
				...tenantInvoice,
				status: body.amountMinor >= tenantInvoice.totalMinor ? "paid" : tenantInvoice.status,
				amountPaidMinor: body.amountMinor,
				paidAt: body.paidAt ?? now(),
			};
			await route.fulfill(ok({ data: { id: "tenant_payment_smoke", ...body, verified: false } }));
			return;
		}
		if (url.includes("/notifications/stream")) {
			await route.fulfill({
				status: 200,
				contentType: "text/event-stream",
				headers: {
					"cache-control": "no-cache",
					connection: "keep-alive",
				},
				body: `event: ping\ndata: ${JSON.stringify({ connected: true })}\n\n`,
			});
			return;
		}
		if (url.includes("/notifications/email-deliveries")) {
			await route.fulfill(
				ok({
					data: [
						{
							id: "delivery_smoke_1",
							toEmail: "owner@example.test",
							subject: "Invoice ready",
							source: "invoice",
							sourceRef: "inv_smoke",
							status: "delivered",
							messageId: "msg_smoke_1",
							error: null,
							attemptCount: 1,
							sentAt: "2026-05-31T08:30:00.000Z",
							createdAt: "2026-05-31T08:25:00.000Z",
						},
						{
							id: "delivery_smoke_2",
							toEmail: "ops@example.test",
							subject: "Digest failed",
							source: "digest",
							sourceRef: "digest_smoke",
							status: "failed",
							messageId: null,
							error: "SMTP rejected",
							attemptCount: 2,
							sentAt: null,
							createdAt: "2026-05-31T07:55:00.000Z",
						},
					],
					meta: { total: 2, page: 1, limit: 20, totalPages: 1 },
				}),
			);
			return;
		}
		if (url.includes("/notifications")) {
			await route.fulfill(ok({ data: [], meta: { total: 0, unread: 0, page: 1, limit: 10, totalPages: 1 } }));
			return;
		}
		if (url.endsWith("/api/v1/onboarding")) {
			await route.fulfill(ok({ data: onboardingTask }));
			return;
		}
		if (pathname === "/api/v1/organization-settings") {
			if (route.request().method() === "PATCH") {
				const body = JSON.parse(route.request().postData() ?? "{}");
				organizationSettings = { ...organizationSettings, ...body, updatedAt: now() };
				await route.fulfill(ok({ data: organizationSettings }));
				return;
			}
			await route.fulfill(ok({ data: organizationSettings }));
			return;
		}
		if (pathname === "/api/v1/roles/matrix") {
			await route.fulfill(ok({ data: roleMatrix }));
			return;
		}
		if (pathname === "/api/v1/roles/system") {
			await route.fulfill(ok({ data: systemRoles }));
			return;
		}
		if (pathname === "/api/v1/roles") {
			if (route.request().method() === "POST") {
				const body = JSON.parse(route.request().postData() ?? "{}");
				const role = {
					id: "role_created",
					organizationId: "org_smoke",
					slug: body.slug,
					nameEn: body.nameEn,
					nameAm: body.nameAm ?? null,
					description: body.description ?? null,
					inheritsFromSlug: body.inheritsFromSlug ?? null,
					permissionsJson: body.permissionsJson ?? {},
					scopeJson: body.scopeJson ?? null,
					createdByUserId: "user_smoke",
					isSystem: false,
					active: true,
					createdAt: now(),
					updatedAt: now(),
					memberCount: 0,
				};
				customRoles = [role, ...customRoles];
				await route.fulfill(ok({ data: role }));
				return;
			}
			await route.fulfill(ok({ data: customRoles }));
			return;
		}
		if (pathname.startsWith("/api/v1/roles/") && route.request().method() === "DELETE") {
			const roleId = pathname.split("/").at(-1);
			customRoles = customRoles.filter((role) => role.id !== roleId);
			await route.fulfill(ok({ data: { id: roleId } }));
			return;
		}
		if (pathname.startsWith("/api/v1/lookups/items/")) {
			const lookupId = pathname.split("/").at(-1);
			if (route.request().method() === "PATCH") {
				const body = JSON.parse(route.request().postData() ?? "{}");
				lookupItems = lookupItems.map((item) => (item.id === lookupId ? { ...item, ...body, updatedAt: now() } : item));
				await route.fulfill(ok({ data: lookupItems.find((item) => item.id === lookupId) ?? null }));
				return;
			}
			if (route.request().method() === "DELETE") {
				lookupItems = lookupItems.filter((item) => item.id !== lookupId);
				await route.fulfill(ok({ data: { deleted: true } }));
				return;
			}
		}
		const lookupKindMatch = pathname.match(/^\/api\/v1\/lookups\/([^/]+)$/);
		if (lookupKindMatch) {
			const lookupKind = lookupKindMatch[1];
			if (route.request().method() === "POST") {
				const body = JSON.parse(route.request().postData() ?? "{}");
				const label = String(body.label ?? "").trim();
				const value =
					body.value ??
					label
						.toLowerCase()
						.replace(/[^a-z0-9]+/g, "_")
						.replace(/^_+|_+$/g, "");
				const item = {
					id: "lookup_created",
					organizationId: "org_smoke",
					kind: lookupKind,
					value,
					label,
					description: body.description ?? null,
					color: body.color ?? null,
					sortOrder: body.sortOrder ?? 100,
					isBuiltIn: false,
					archived: false,
					createdAt: now(),
					updatedAt: now(),
				};
				lookupItems = [item, ...lookupItems];
				await route.fulfill(ok({ data: item }));
				return;
			}
			const includeArchived = requestUrl.searchParams.get("includeArchived") === "true";
			const data = lookupItems.filter((item) => item.kind === lookupKind && (includeArchived || !item.archived));
			await route.fulfill(ok({ data }));
			return;
		}
		if (pathname === "/api/v1/team/members") {
			await route.fulfill(ok({ data: teamMembers }));
			return;
		}
		if (pathname.startsWith("/api/v1/team/members/")) {
			const memberId = pathname.split("/").at(-1);
			if (route.request().method() === "PATCH") {
				const body = JSON.parse(route.request().postData() ?? "{}");
				teamMembers = teamMembers.map((member) =>
					member.id === memberId ? { ...member, role: body.role ?? member.role } : member,
				);
				await route.fulfill(ok({ data: teamMembers.find((member) => member.id === memberId) ?? null }));
				return;
			}
			if (route.request().method() === "DELETE") {
				teamMembers = teamMembers.filter((member) => member.id !== memberId);
				await route.fulfill(ok({ data: { id: memberId } }));
				return;
			}
		}
		const acceptInvitationMatch = pathname.match(/^\/api\/v1\/team\/invitations\/([^/]+)\/accept$/);
		if (acceptInvitationMatch && route.request().method() === "POST") {
			const invitationId = acceptInvitationMatch[1];
			teamInvitations = teamInvitations.map((invitation) =>
				invitation.id === invitationId ? { ...invitation, status: "accepted" } : invitation,
			);
			await route.fulfill(ok({ data: teamInvitations.find((invitation) => invitation.id === invitationId) ?? null }));
			return;
		}
		if (pathname === "/api/v1/team/invitations") {
			if (route.request().method() === "POST") {
				const body = JSON.parse(route.request().postData() ?? "{}");
				const invitationId = `inv_${teamInvitations.length + 1}`;
				const invitation = {
					id: invitationId,
					organizationId: "org_smoke",
					email: body.email,
					role: body.role ?? "member",
					status: "pending",
					expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
					inviterId: "user_smoke",
					createdAt: now(),
					acceptUrl: `http://localhost:5173/settings/members?invitationId=${invitationId}`,
				};
				teamInvitations = [invitation, ...teamInvitations];
				await route.fulfill(ok({ data: invitation }));
				return;
			}
			await route.fulfill(ok({ data: teamInvitations }));
			return;
		}
		if (pathname.startsWith("/api/v1/team/invitations/") && route.request().method() === "DELETE") {
			const invitationId = pathname.split("/").at(-1);
			teamInvitations = teamInvitations.filter((invitation) => invitation.id !== invitationId);
			await route.fulfill(ok({ data: { id: invitationId } }));
			return;
		}
		if (pathname === "/api/v1/api-keys") {
			if (route.request().method() === "POST") {
				const body = JSON.parse(route.request().postData() ?? "{}");
				const apiKey = {
					id: "key_created",
					organizationId: "org_smoke",
					name: body.name,
					keyPrefix: "vsk_new",
					scopes: body.scopes ?? [],
					createdByUserId: "user_smoke",
					expiresAt: body.expiresAt ?? null,
					revokedAt: null,
					lastUsedAt: null,
					usageCount: 0,
					rateLimit: body.rateLimit ?? null,
					createdAt: now(),
					updatedAt: now(),
				};
				apiKeys = [apiKey, ...apiKeys];
				await route.fulfill(ok({ data: { apiKey, plainKey: "vsk_live_new_secret" } }));
				return;
			}
			const includeRevoked = requestUrl.searchParams.get("includeRevoked") === "true";
			await route.fulfill(ok({ data: includeRevoked ? apiKeys : apiKeys.filter((apiKey) => !apiKey.revokedAt) }));
			return;
		}
		if (pathname.startsWith("/api/v1/api-keys/") && route.request().method() === "DELETE") {
			const keyId = pathname.split("/").at(-1);
			apiKeys = apiKeys.map((apiKey) =>
				apiKey.id === keyId ? { ...apiKey, revokedAt: new Date(Date.now() + 1000).toISOString() } : apiKey,
			);
			await route.fulfill(ok({ data: { id: keyId } }));
			return;
		}
		if (url.includes("/security-settings")) {
			if (route.request().method() === "PATCH") {
				const body = JSON.parse(route.request().postData() ?? "{}");
				await route.fulfill(
					ok({
						data: {
							passwordMinLength: 10,
							passwordRequireUpper: true,
							passwordRequireLower: true,
							passwordRequireDigit: true,
							passwordRequireSymbol: true,
							passwordMaxAgeDays: 90,
							sessionTimeoutMinutes: 60,
							force2fa: false,
							ipAllowlist: [],
							...body,
						},
					}),
				);
				return;
			}
			await route.fulfill(
				ok({
					data: {
						passwordMinLength: 10,
						passwordRequireUpper: true,
						passwordRequireLower: true,
						passwordRequireDigit: true,
						passwordRequireSymbol: true,
						passwordMaxAgeDays: 90,
						sessionTimeoutMinutes: 60,
						force2fa: false,
						ipAllowlist: ["203.0.113.5"],
					},
				}),
			);
			return;
		}
		await route.fulfill(ok({ data: {} }));
	});
}

async function installAdminMocks(page: Page) {
	const onboardingListRequests: string[] = [];
	let featureFlags = [
		{
			id: "flag_api",
			name: "platform.api-keys",
			description: "Allow organizations to create scoped API keys",
			enabledGlobal: true,
			overrides: [
				{
					id: "override_demo",
					organizationId: "org_smoke",
					enabled: false,
				},
			],
		},
		{
			id: "flag_reports",
			name: "platform.reports",
			description: "Enable saved reports and dashboard exports",
			enabledGlobal: false,
			overrides: [],
		},
	];
	let entitlementOverrides = [
		{
			id: "override_demo",
			organizationId: "org_smoke",
			featureKey: "platform.api-keys",
			enabled: true,
			limit: 25,
			expiresAt: null,
			reason: "beta access",
			grantedByUserId: "admin_smoke",
			createdAt: now(),
			updatedAt: now(),
		},
	];
	let planEntitlements = [
		{ id: "ent_api", featureKey: "platform.api-keys", enabled: true, limit: 25 },
		{ id: "ent_reports", featureKey: "platform.reports", enabled: false, limit: null },
	];
	let subscriptionInvoice = {
		id: "invoice_smoke",
		number: "INV-DETAIL-001",
		status: "draft",
		issueDate: now(),
		dueDate: now(),
		periodStart: now(),
		periodEnd: now(),
		currency: "ETB",
		subtotalMinor: 450000,
		taxMinor: 0,
		totalMinor: 450000,
		amountPaidMinor: 0,
		lineType: "subscription",
		description: "Pro monthly subscription",
		payments: [],
	};
	let pendingPayments = [
		{
			id: "payment_pending",
			invoiceId: "invoice_pending",
			invoiceNumber: "INV-1002",
			organizationId: "org_smoke",
			organizationName: "Demo Cafe",
			amountMinor: 450000,
			currency: "ETB",
			method: "bank_transfer",
			receiptNumber: "RCPT-001",
			bankReference: "BANK-001",
			paidAt: now(),
			note: "manual transfer",
		},
	];

	// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: this e2e mock dispatches many independent admin API fixtures.
	await page.route("**/api/v1/**", async (route: Route) => {
		const url = route.request().url();
		const request = route.request();
		const requestUrl = new URL(url);
		const pathname = requestUrl.pathname;
		if (url.includes("/admin/auth/me")) {
			await route.fulfill(
				ok({
					data: {
						user: { id: "admin_smoke", email: "admin@example.test", name: "Platform Admin" },
						session: { id: "admin_session_smoke", expiresAt: new Date(Date.now() + 86_400_000).toISOString() },
					},
				}),
			);
			return;
		}
		if (url.includes("/admin/onboarding/templates")) {
			await route.fulfill(
				ok({
					data: [
						{
							id: "template_smoke",
							key: "generic-saas",
							name: "Generic SaaS setup",
							description: "Base setup",
							vertical: "generic",
							estimatedDays: 3,
							stepDefinitions: onboardingTask.steps,
							createdByPack: null,
							isActive: true,
						},
					],
				}),
			);
			return;
		}
		if (/\/admin\/onboarding\/task_smoke(?:\?|$)/.test(url)) {
			await route.fulfill(ok({ data: onboardingTask }));
			return;
		}
		if (/\/admin\/organizations\/org_smoke(?:\?|$)/.test(url)) {
			await route.fulfill(
				ok({
					data: {
						id: "org_smoke",
						name: "Demo Cafe",
						slug: "demo-cafe",
						logo: null,
						metadata: null,
						createdAt: now(),
						suspendedAt: null,
						suspendReason: null,
						members: [
							{
								id: "member_owner",
								userId: "user_owner",
								role: "owner",
								createdAt: now(),
								user: { id: "user_owner", name: "Demo Owner", email: "owner@example.test" },
							},
							{
								id: "member_staff",
								userId: "staff_smoke",
								role: "admin",
								createdAt: now(),
								user: { id: "staff_smoke", name: "Yordanos", email: "staff@example.test" },
							},
						],
						subscription: {
							id: "sub_smoke",
							status: "active",
							billingInterval: "monthly",
							currency: "ETB",
							currentPeriodEnd: now(),
							plan: { slug: "pro", nameEn: "Pro" },
						},
						usage: { userCount: 2, apiCallCount: 128, emailCount: 6, metricsJson: {} },
						stats: {
							memberCount: 2,
							invitationCount: 1,
							apiKeyCount: 2,
							savedReportCount: 3,
							notificationCount: 6,
							auditLogCount: 9,
						},
					},
				}),
			);
			return;
		}
		if (url.includes("/admin/organizations")) {
			await route.fulfill(
				ok({
					data: [
						{
							id: "org_smoke",
							name: "Demo Cafe",
							slug: "demo-cafe",
							logo: null,
							createdAt: now(),
							memberCount: 2,
							ownerEmail: "owner@example.test",
						},
					],
					meta: { page: 1, limit: 100, total: 1, totalPages: 1 },
				}),
			);
			return;
		}
		if (url.includes("/admin/entitlement-overrides")) {
			if (request.method() === "POST") {
				const body = JSON.parse(request.postData() ?? "{}");
				const override = {
					id: "override_created",
					organizationId: body.organizationId,
					featureKey: body.featureKey,
					enabled: body.enabled,
					limit: body.limit ?? null,
					expiresAt: body.expiresAt ?? null,
					reason: body.reason ?? null,
					grantedByUserId: "admin_smoke",
					createdAt: now(),
					updatedAt: now(),
				};
				entitlementOverrides = [
					override,
					...entitlementOverrides.filter((item) => item.featureKey !== body.featureKey),
				];
				await route.fulfill(ok({ data: override }));
				return;
			}
			if (request.method() === "DELETE") {
				const overrideId = pathname.split("/").at(-1);
				entitlementOverrides = entitlementOverrides.filter((override) => override.id !== overrideId);
				await route.fulfill(ok({ data: { id: overrideId } }));
				return;
			}
			await route.fulfill(ok({ data: entitlementOverrides }));
			return;
		}
		if (url.includes("/admin/plans/feature-keys")) {
			await route.fulfill(ok({ data: ["platform.api-keys", "platform.reports"] }));
			return;
		}
		if (pathname === "/api/v1/admin/plans/plan_pro/entitlements/bulk" && request.method() === "POST") {
			const body = JSON.parse(request.postData() ?? "{}");
			planEntitlements = (body.entitlements ?? []).map(
				(entitlement: { featureKey: string; enabled: boolean; limit: number | null }) => ({
					id: `ent_${entitlement.featureKey.replace(/\W+/g, "_")}`,
					...entitlement,
				}),
			);
			await route.fulfill(ok({ data: planEntitlements }));
			return;
		}
		if (/\/admin\/plans(?:\?|$)/.test(url)) {
			await route.fulfill(
				ok({
					data: [
						{
							id: "plan_pro",
							slug: "pro",
							nameEn: "Pro",
							nameAm: "Pro",
							description: "Production plan",
							priceMonthlyMinor: 450000,
							priceAnnualMinor: 4500000,
							currency: "ETB",
							userCap: 25,
							supportSlaHours: 24,
							stripeSupported: false,
							chapaSupported: true,
							manualSupported: true,
							active: true,
							sortOrder: 10,
							entitlements: [],
							createdAt: now(),
							updatedAt: now(),
						},
					],
				}),
			);
			return;
		}
		if (/\/admin\/plans\/plan_pro(?:\?|$)/.test(url)) {
			await route.fulfill(
				ok({
					data: {
						id: "plan_pro",
						slug: "pro",
						nameEn: "Pro",
						nameAm: "Pro",
						description: "Production plan",
						priceMonthlyMinor: 450000,
						priceAnnualMinor: 4500000,
						currency: "ETB",
						userCap: 25,
						supportSlaHours: 24,
						stripeSupported: false,
						chapaSupported: true,
						manualSupported: true,
						active: true,
						sortOrder: 10,
						entitlements: planEntitlements,
						createdAt: now(),
						updatedAt: now(),
					},
				}),
			);
			return;
		}
		if (url.includes("/admin/billing/dashboard/revenue-trend")) {
			await route.fulfill(
				ok({
					data: [
						{ month: "2026-04", revenueMinor: 350000 },
						{ month: "2026-05", revenueMinor: 450000 },
					],
				}),
			);
			return;
		}
		if (url.includes("/admin/billing/dashboard/past-due")) {
			await route.fulfill(
				ok({
					data: [
						{
							id: "invoice_past_due",
							number: "INV-1001",
							subscriptionId: "sub_past_due",
							organizationId: "org_overdue",
							organizationName: "Overdue Trading",
							dueDate: now(),
							totalMinor: 600000,
							amountPaidMinor: 100000,
							currency: "ETB",
							daysPastDue: 12,
						},
					],
				}),
			);
			return;
		}
		if (pathname === "/api/v1/admin/billing/payments/payment_pending/verify" && request.method() === "POST") {
			pendingPayments = pendingPayments.filter((payment) => payment.id !== "payment_pending");
			await route.fulfill(ok({ data: { id: "payment_pending", verified: true } }));
			return;
		}
		if (url.includes("/admin/billing/dashboard/pending-verification")) {
			await route.fulfill(ok({ data: pendingPayments }));
			return;
		}
		if (url.endsWith("/admin/billing/dashboard")) {
			await route.fulfill(
				ok({
					data: {
						mrrMinor: 450000,
						arrMinor: 5400000,
						outstandingMinor: 500000,
						paidLast30Minor: 350000,
						countsByStatus: { active: 1, past_due: 1 },
						upcomingRenewals30d: 1,
						byPlan: { pro: { count: 1, mrrMinor: 450000 }, starter: { count: 1, mrrMinor: 0 } },
						totalSubs: 2,
					},
				}),
			);
			return;
		}
		if (url.includes("/admin/billing/subscriptions/sub_smoke/dunning-log")) {
			await route.fulfill(
				ok({
					data: [
						{
							id: "dunning_smoke",
							type: "overdue",
							subject: "Your invoice is overdue",
							sentTo: "owner@example.test",
							status: "sent",
							errorMessage: null,
							sentAt: now(),
						},
					],
				}),
			);
			return;
		}
		if (url.includes("/admin/billing/subscriptions/sub_smoke/usage-history")) {
			await route.fulfill(
				ok({
					data: [
						{
							id: "usage_smoke",
							snapshotDate: now(),
							userCount: 2,
							apiCallCount: 128,
							emailCount: 6,
							metricsJson: { invoices: 12 },
						},
					],
				}),
			);
			return;
		}
		if (pathname === "/api/v1/admin/billing/invoices/invoice_smoke/send" && request.method() === "PUT") {
			subscriptionInvoice = { ...subscriptionInvoice, status: "sent" };
			await route.fulfill(ok({ data: subscriptionInvoice }));
			return;
		}
		if (pathname === "/api/v1/admin/billing/invoices/invoice_smoke/payments" && request.method() === "POST") {
			const body = JSON.parse(request.postData() ?? "{}");
			const payment = {
				id: "payment_recorded",
				amountMinor: body.amountMinor,
				method: body.method,
				paidAt: body.paidAt,
				receiptNumber: body.receiptNumber ?? null,
				bankReference: body.bankReference ?? null,
				chapaTxRef: null,
				chapaRefId: null,
				verified: true,
				note: body.note ?? null,
			};
			subscriptionInvoice = {
				...subscriptionInvoice,
				status: body.amountMinor >= subscriptionInvoice.totalMinor ? "paid" : subscriptionInvoice.status,
				amountPaidMinor: body.amountMinor,
				payments: [payment],
			};
			await route.fulfill(ok({ data: payment }));
			return;
		}
		if (/\/admin\/billing\/subscriptions\/sub_smoke(?:\?|$)/.test(url)) {
			await route.fulfill(
				ok({
					data: {
						id: "sub_smoke",
						organizationId: "org_smoke",
						organizationName: "Demo Cafe",
						organizationSlug: "demo-cafe",
						organization: { id: "org_smoke", name: "Demo Cafe", slug: "demo-cafe" },
						planId: "plan_pro",
						plan: { nameEn: "Pro", nameAm: "Pro", slug: "pro" },
						status: "active",
						billingInterval: "monthly",
						currency: "ETB",
						currentPeriodStart: now(),
						currentPeriodEnd: now(),
						gracePeriodEndsAt: null,
						readOnlyModeEndsAt: null,
						lockedAt: null,
						creditBalanceMinor: 15000,
						lifecycle: {
							status: "active",
							periodEnd: now(),
							gracePeriodEndsAt: null,
							readOnlyModeEndsAt: null,
							lockedAt: null,
							daysUntilReadOnly: null,
							daysUntilLocked: null,
							daysExpired: 0,
							isWriteBlocked: false,
							isFullyLocked: false,
						},
						invoices: [subscriptionInvoice],
					},
				}),
			);
			return;
		}
		if (url.includes("/admin/billing/subscriptions")) {
			await route.fulfill(
				ok({
					data: [
						{
							id: "sub_smoke",
							organizationId: "org_smoke",
							organizationName: "Demo Cafe",
							organizationSlug: "demo-cafe",
							planId: "plan_pro",
							plan: { nameEn: "Pro", nameAm: "Pro", slug: "pro" },
							status: "active",
							billingInterval: "monthly",
							currency: "ETB",
							currentPeriodStart: now(),
							currentPeriodEnd: now(),
							gracePeriodEndsAt: null,
							readOnlyModeEndsAt: null,
							lockedAt: null,
							creditBalanceMinor: 15000,
						},
						{
							id: "sub_past_due",
							organizationId: "org_overdue",
							organizationName: "Overdue Trading",
							organizationSlug: "overdue-trading",
							planId: "plan_starter",
							plan: { nameEn: "Starter", nameAm: "Starter", slug: "starter" },
							status: "past_due",
							billingInterval: "annual",
							currency: "ETB",
							currentPeriodStart: now(),
							currentPeriodEnd: now(),
							gracePeriodEndsAt: null,
							readOnlyModeEndsAt: null,
							lockedAt: null,
							creditBalanceMinor: 0,
						},
					],
				}),
			);
			return;
		}
		if (url.includes("/admin/users")) {
			await route.fulfill(
				ok({
					data: [
						{
							id: "staff_smoke",
							name: "Yordanos",
							email: "staff@example.test",
							emailVerified: true,
							createdAt: now(),
							organizations: [],
						},
					],
					meta: { page: 1, limit: 100, total: 1, totalPages: 1 },
				}),
			);
			return;
		}
		if (url.includes("/admin/settings/feature-flags")) {
			const globalToggleMatch = pathname.match(/\/admin\/settings\/feature-flags\/(.+)\/global$/);
			const orgToggleMatch = pathname.match(/\/admin\/settings\/feature-flags\/(.+)\/org\/([^/]+)$/);
			if (request.method() === "PUT" && globalToggleMatch) {
				const body = JSON.parse(request.postData() ?? "{}");
				const flagName = decodeURIComponent(globalToggleMatch[1]);
				featureFlags = featureFlags.map((flag) =>
					flag.name === flagName ? { ...flag, enabledGlobal: Boolean(body.enabled) } : flag,
				);
				await route.fulfill(ok({ data: featureFlags.find((flag) => flag.name === flagName) ?? null }));
				return;
			}
			if (request.method() === "PUT" && orgToggleMatch) {
				const body = JSON.parse(request.postData() ?? "{}");
				const flagName = decodeURIComponent(orgToggleMatch[1]);
				const orgId = orgToggleMatch[2];
				featureFlags = featureFlags.map((flag) => {
					if (flag.name !== flagName) return flag;
					const existingOverride = flag.overrides.find((override) => override.organizationId === orgId);
					const nextOverride = {
						id: existingOverride?.id ?? `override_${orgId}`,
						organizationId: orgId,
						enabled: Boolean(body.enabled),
					};
					return {
						...flag,
						overrides: [nextOverride, ...flag.overrides.filter((override) => override.organizationId !== orgId)],
					};
				});
				await route.fulfill(ok({ data: featureFlags.find((flag) => flag.name === flagName) ?? null }));
				return;
			}
			await route.fulfill(ok({ data: featureFlags }));
			return;
		}
		if (url.includes("/admin/audit-logs")) {
			await route.fulfill(
				ok({
					data: [
						{
							id: "audit_smoke",
							action: "tenant.suspended",
							performedBy: "admin_smoke",
							targetType: "organization",
							targetId: "org_smoke",
							details: { reason: "support review" },
							ipAddress: "203.0.113.10",
							createdAt: now(),
						},
					],
					meta: { page: 1, limit: 50, total: 1, totalPages: 1 },
				}),
			);
			return;
		}
		if (url.includes("/saved-views")) {
			await route.fulfill(ok({ data: [] }));
			return;
		}
		if (url.includes("/admin/onboarding")) {
			onboardingListRequests.push(url);
			await route.fulfill(
				ok({
					data: [onboardingTask],
					meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
					summary: { active: 1, blocked: 0, stale: 0, completedThisMonth: 2 },
				}),
			);
			return;
		}
		await route.fulfill(ok({ data: {} }));
	});

	return { onboardingListRequests };
}

interface TeamFlowUser {
	id: string;
	name: string;
	email: string;
}

interface TeamFlowState {
	baseURL: string;
	nextInvitationNumber: number;
	teamMembers: Array<{
		id: string;
		organizationId: string;
		userId: string;
		role: string;
		createdAt: string;
		user: TeamFlowUser & { image: string | null };
	}>;
	teamInvitations: Array<{
		id: string;
		organizationId: string;
		email: string;
		role: string;
		status: string;
		expiresAt: string;
		inviterId: string;
		createdAt: string;
		acceptUrl: string;
	}>;
}

const createTeamFlowState = (baseURL: string): TeamFlowState => ({
	baseURL,
	nextInvitationNumber: 1,
	teamMembers: [
		{
			id: "member_owner",
			organizationId: "org_smoke",
			userId: "user_owner",
			role: "owner",
			createdAt: now(),
			user: { id: "user_owner", name: "Demo Owner", email: "owner@example.test", image: null },
		},
	],
	teamInvitations: [],
});

const installTeamFlowMocks = async (page: Page, state: TeamFlowState, user: TeamFlowUser) => {
	await page.unroute("**/api/auth/get-session").catch(() => undefined);
	await page.route("**/api/auth/**", async (route: Route) => {
		const url = route.request().url();
		if (url.includes("/organization/list")) {
			await route.fulfill(ok([{ id: "org_smoke", name: "Demo Cafe", slug: "demo-cafe" }]));
			return;
		}
		if (url.includes("/organization/get-full-organization")) {
			await route.fulfill(ok({ id: "org_smoke", name: "Demo Cafe", slug: "demo-cafe" }));
			return;
		}
		await route.fulfill(
			ok({
				session: {
					id: `session_${user.id}`,
					userId: user.id,
					activeOrganizationId: "org_smoke",
					expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
				},
				user,
			}),
		);
	});

	// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: this isolated mock keeps a two-user invitation flow stateful.
	await page.route("**/api/v1/**", async (route: Route) => {
		const request = route.request();
		const pathname = new URL(request.url()).pathname;
		if (pathname === "/api/v1/billing/me") {
			await route.fulfill(ok({ data: { subscription: null, lifecycle: null, entitlements: {} } }));
			return;
		}
		if (pathname === "/api/v1/billing/capabilities") {
			await route.fulfill(
				ok({
					data: {
						"platform.team": {
							key: "platform.team",
							label: "Team",
							category: "platform",
							enabled: true,
							limit: 10,
							used: state.teamMembers.length,
							remaining: 10 - state.teamMembers.length,
							reason: "included",
						},
					},
				}),
			);
			return;
		}
		if (pathname === "/api/v1/notifications/stream") {
			await route.fulfill({
				status: 200,
				contentType: "text/event-stream",
				headers: { "cache-control": "no-cache", connection: "keep-alive" },
				body: `event: ping\ndata: ${JSON.stringify({ connected: true })}\n\n`,
			});
			return;
		}
		if (pathname === "/api/v1/notifications") {
			await route.fulfill(ok({ data: [], meta: { total: 0, unread: 0, page: 1, limit: 10, totalPages: 1 } }));
			return;
		}
		if (pathname === "/api/v1/onboarding") {
			await route.fulfill(ok({ data: onboardingTask }));
			return;
		}
		if (pathname === "/api/v1/team/members") {
			await route.fulfill(ok({ data: state.teamMembers }));
			return;
		}
		if (pathname === "/api/v1/team/invitations") {
			if (request.method() === "POST") {
				const body = JSON.parse(request.postData() ?? "{}");
				const email = String(body.email ?? "")
					.toLowerCase()
					.trim();
				const existing = state.teamInvitations.find(
					(invitation) => invitation.email === email && invitation.status === "pending",
				);
				if (existing) {
					await route.fulfill(ok({ data: existing }));
					return;
				}
				const id = `inv_${state.nextInvitationNumber}`;
				state.nextInvitationNumber += 1;
				const invitation = {
					id,
					organizationId: "org_smoke",
					email,
					role: body.role ?? "member",
					status: "pending",
					expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
					inviterId: user.id,
					createdAt: now(),
					acceptUrl: `${state.baseURL}/settings/members?invitationId=${id}`,
				};
				state.teamInvitations = [invitation, ...state.teamInvitations];
				await route.fulfill(ok({ data: invitation }));
				return;
			}
			await route.fulfill(ok({ data: state.teamInvitations }));
			return;
		}
		const acceptInvitationMatch = pathname.match(/^\/api\/v1\/team\/invitations\/([^/]+)\/accept$/);
		if (acceptInvitationMatch && request.method() === "POST") {
			const invitationId = acceptInvitationMatch[1];
			const invitation = state.teamInvitations.find((item) => item.id === invitationId);
			if (!invitation || invitation.status !== "pending" || invitation.email !== user.email.toLowerCase()) {
				await route.fulfill({
					status: 400,
					contentType: "application/json",
					body: JSON.stringify({ message: "invitation email does not match current user" }),
				});
				return;
			}
			state.teamInvitations = state.teamInvitations.map((item) =>
				item.id === invitationId ? { ...item, status: "accepted" } : item,
			);
			if (!state.teamMembers.some((member) => member.userId === user.id)) {
				state.teamMembers = [
					...state.teamMembers,
					{
						id: `member_${user.id}`,
						organizationId: invitation.organizationId,
						userId: user.id,
						role: invitation.role,
						createdAt: now(),
						user: { ...user, image: null },
					},
				];
			}
			await route.fulfill(ok({ data: state.teamInvitations.find((item) => item.id === invitationId) }));
			return;
		}
		await route.fulfill(ok({ data: {} }));
	});
};

async function expectNoConsoleErrors(page: Page) {
	const errors: string[] = [];
	page.on("console", (message) => {
		if (message.type() === "error") errors.push(message.text());
	});
	page.on("pageerror", (error) => errors.push(error.message));
	return () => expect(errors).toEqual([]);
}

test("public app shell loads", async ({ page }) => {
	await page.goto("/", { waitUntil: "domcontentloaded" });
	await expect(page.locator("body")).toBeVisible();
	await expect(page).toHaveTitle(/{{projectName}}|Vite|SaaS/i);
});

test("admin login route is reachable", async ({ page }) => {
	await page.goto("/admin-login", { waitUntil: "domcontentloaded" });
	await expect(page.getByRole("button", { name: /sign in|login/i })).toBeVisible();
});

test("tenant onboarding smoke renders workflow and command palette", async ({ page }) => {
	const assertNoErrors = await expectNoConsoleErrors(page);
	await installAuthenticatedMocks(page);

	await page.goto("/onboarding", { waitUntil: "networkidle" });

	await expect(page.getByRole("heading", { name: "Setup checklist", exact: true })).toBeVisible();
	await expect(page.getByRole("heading", { name: "Your setup checklist" })).toBeVisible();
	await expect(page.getByRole("heading", { name: "What happens next" })).toBeVisible();
	await expect(page.getByText("Current action").first()).toBeVisible();
	await expect(page.getByRole("heading", { name: "Company profile" }).first()).toBeVisible();
	await expect(page.getByText("25%", { exact: true })).toBeVisible();

	await page.keyboard.press(process.platform === "darwin" ? "Meta+K" : "Control+K");
	await expect(page.getByRole("dialog", { name: "Command palette" })).toBeVisible();
	await expect(page.getByRole("button", { name: /Organization settings/i })).toBeVisible();

	assertNoErrors();
});

test("tenant organization settings smoke saves regional and company profile", async ({ page }) => {
	const assertNoErrors = await expectNoConsoleErrors(page);
	await installAuthenticatedMocks(page);

	await page.goto("/settings/organization", { waitUntil: "networkidle" });

	await expect(page.getByRole("heading", { name: "Organization settings" })).toBeVisible();
	await expect(page.locator("#organization-timezone")).toContainText("UTC");
	await expect(page.getByRole("textbox", { name: "Invoice prefix" })).toHaveValue("INV");
	await expect(page.getByRole("textbox", { name: "Email", exact: true })).toHaveValue("billing@example.test");

	await page.locator("#organization-timezone").click();
	await page.getByRole("option", { name: "Africa/Addis_Ababa" }).click();
	await page.locator("#organization-currency").click();
	await page.getByRole("option", { name: "ETB" }).click();
	await page.locator("#organization-date-format").click();
	await page.getByRole("option", { name: "DD/MM/YYYY" }).click();
	await page.locator("#organization-fiscal-year-start").click();
	await page.getByRole("option", { name: "March" }).click();
	await page.getByRole("textbox", { name: "Invoice prefix" }).fill("PF-INV");
	await page.getByRole("spinbutton", { name: "Invoice padding" }).fill("6");
	await page.getByRole("textbox", { name: "Email", exact: true }).fill("finance@example.test");
	await page.getByRole("textbox", { name: "Phone" }).fill("+251922000000");
	await page.getByRole("textbox", { name: "Address" }).fill("Kazanchis, Addis Ababa");
	await page.getByRole("textbox", { name: "Tax ID" }).fill("0099887766");
	await page.getByRole("textbox", { name: "Logo URL" }).fill("https://example.test/new-logo.png");
	await page.getByRole("textbox", { name: "Primary color" }).fill("#0f766e");
	await page.getByRole("textbox", { name: "Email footer" }).fill("Thanks for choosing Demo Cafe.");

	const saveRequest = page.waitForRequest(
		(request) => request.url().includes("/api/v1/organization-settings") && request.method() === "PATCH",
	);
	await page.getByRole("button", { name: "Save" }).click();
	const payload = JSON.parse((await saveRequest).postData() ?? "{}");

	expect(payload).toMatchObject({
		timezone: "Africa/Addis_Ababa",
		currency: "ETB",
		dateFormat: "DD/MM/YYYY",
		fiscalYearStartMonth: 3,
		invoiceNumberPrefix: "PF-INV",
		invoiceNumberPadding: 6,
		companyEmail: "finance@example.test",
		companyPhone: "+251922000000",
		companyAddress: "Kazanchis, Addis Ababa",
		taxId: "0099887766",
		logoUrl: "https://example.test/new-logo.png",
		primaryColor: "#0f766e",
		emailFooter: "Thanks for choosing Demo Cafe.",
	});

	assertNoErrors();
});

test("tenant security settings smoke saves 2FA policy and IP allowlist", async ({ page }) => {
	const assertNoErrors = await expectNoConsoleErrors(page);
	await installAuthenticatedMocks(page);

	await page.goto("/settings/security", { waitUntil: "networkidle" });

	await expect(page.getByRole("heading", { name: "Security settings" })).toBeVisible();
	const force2faSwitch = page.getByRole("switch", { name: "Require 2FA for all members" });
	await expect(force2faSwitch).toBeVisible();
	await expect(force2faSwitch).not.toBeChecked();
	await page.getByRole("textbox", { name: "IP allowlist" }).fill("203.0.113.5\n198.51.100.10");

	const saveRequest = page.waitForRequest(
		(request) => request.url().includes("/api/v1/security-settings") && request.method() === "PATCH",
	);
	await force2faSwitch.click();
	await page.getByRole("button", { name: "Save" }).click();
	const payload = JSON.parse((await saveRequest).postData() ?? "{}");

	expect(payload).toMatchObject({
		force2fa: true,
		ipAllowlist: ["203.0.113.5", "198.51.100.10"],
	});
	await expect(force2faSwitch).toBeChecked();
	assertNoErrors();
});

test("tenant custom roles smoke creates and deletes delegated permissions", async ({ page }) => {
	const assertNoErrors = await expectNoConsoleErrors(page);
	await installAuthenticatedMocks(page);

	await page.goto("/settings/roles", { waitUntil: "networkidle" });

	await expect(page.getByRole("heading", { name: "Roles" })).toBeVisible();
	await expect(page.getByRole("cell", { name: "Auditor", exact: true })).toBeVisible();
	const newRoleButton = page.getByRole("button", { name: "New custom role" });
	await expect(newRoleButton).toBeVisible();
	await expect(newRoleButton).toBeEnabled();

	await newRoleButton.focus();
	await page.keyboard.press("Enter");
	await page.locator("#custom-role-copy-from").click();
	await page.getByRole("option", { name: "Admin" }).click();
	await page.getByRole("textbox", { name: "Name (English)" }).fill("Support Lead");
	await page.getByRole("textbox", { name: "Name (Amharic)" }).fill("Support Lead AM");
	await page.getByRole("textbox", { name: "Slug" }).fill("support-lead");
	await page.getByRole("textbox", { name: "Description" }).fill("Can support tenants without billing write access");
	await page.getByRole("button", { name: "Next" }).click();

	await expect(page.getByText("4 permissions selected")).toBeVisible();
	await page.getByRole("checkbox", { name: "billing read" }).uncheck();
	await expect(page.getByText("3 permissions selected")).toBeVisible();
	await page.getByRole("button", { name: "Next" }).click();
	await expect(page.getByText("support-lead")).toBeVisible();
	await expect(page.getByText("3 permissions")).toBeVisible();

	const createRequest = page.waitForRequest(
		(request) => request.url().includes("/api/v1/roles") && request.method() === "POST",
	);
	await page.getByRole("button", { name: "Create role" }).click();
	const createPayload = JSON.parse((await createRequest).postData() ?? "{}");

	expect(createPayload).toMatchObject({
		slug: "support-lead",
		nameEn: "Support Lead",
		nameAm: "Support Lead AM",
		description: "Can support tenants without billing write access",
		inheritsFromSlug: "admin",
		permissionsJson: {
			organization: ["read", "update"],
			team: ["read"],
		},
	});
	expect(createPayload.permissionsJson.billing).toBeUndefined();
	await expect(page.getByRole("row", { name: /Support Lead/ })).toContainText("support-lead");

	page.once("dialog", (dialog) => dialog.accept());
	const deleteRequest = page.waitForRequest(
		(request) => request.url().includes("/api/v1/roles/role_created") && request.method() === "DELETE",
	);
	await page.getByRole("button", { name: "Delete Support Lead" }).click();
	await deleteRequest;
	await expect(page.getByRole("row", { name: /Support Lead/ })).toBeHidden();

	assertNoErrors();
});

test("tenant lookup catalogs smoke creates archives and deletes values", async ({ page }) => {
	const assertNoErrors = await expectNoConsoleErrors(page);
	await installAuthenticatedMocks(page);

	await page.goto("/settings/lookups", { waitUntil: "networkidle" });

	await expect(page.getByRole("heading", { name: "Lookup Catalogs" })).toBeVisible();
	await expect(page.getByText("No catalogs yet. Add one below.")).toBeVisible();

	const listRequest = page.waitForRequest(
		(request) => request.url().includes("/api/v1/lookups/project_status") && request.method() === "GET",
	);
	await page.locator("#lookup-kind-input").fill("Project Status");
	await page.getByRole("button", { name: "Add", exact: true }).click();
	await listRequest;
	await expect(page.getByRole("button", { name: "Select catalog project_status" })).toBeVisible();
	await expect(page.getByRole("row", { name: /Active/ })).toContainText("active");

	await page.getByRole("textbox", { name: /Label/ }).fill("Waiting on customer");
	await page.getByRole("textbox", { name: /Value/ }).fill("waiting_customer");
	await page.getByRole("spinbutton", { name: "Sort order" }).fill("30");
	await page.locator("#lk-color").fill("#f97316");
	await page.getByRole("textbox", { name: /Description/ }).fill("Paused until the customer responds");

	const createRequest = page.waitForRequest(
		(request) => request.url().includes("/api/v1/lookups/project_status") && request.method() === "POST",
	);
	await page.getByRole("button", { name: "Add value" }).click();
	const createPayload = JSON.parse((await createRequest).postData() ?? "{}");

	expect(createPayload).toEqual({
		label: "Waiting on customer",
		value: "waiting_customer",
		description: "Paused until the customer responds",
		color: "#f97316",
		sortOrder: 30,
	});
	await expect(page.getByRole("row", { name: /Waiting on customer/ })).toContainText("waiting_customer");

	const archiveRequest = page.waitForRequest(
		(request) => request.url().includes("/api/v1/lookups/items/lookup_created") && request.method() === "PATCH",
	);
	await page.getByRole("button", { name: "Archive Waiting on customer" }).click();
	const archivePayload = JSON.parse((await archiveRequest).postData() ?? "{}");

	expect(archivePayload).toEqual({ archived: true });
	await expect(page.getByRole("row", { name: /Waiting on customer/ })).toBeHidden();

	const includeArchivedRequest = page.waitForRequest(
		(request) =>
			request.url().includes("/api/v1/lookups/project_status") &&
			new URL(request.url()).searchParams.get("includeArchived") === "true",
	);
	await page.getByRole("checkbox", { name: "Show archived" }).check();
	await includeArchivedRequest;
	await expect(page.getByRole("row", { name: /Waiting on customer/ })).toContainText("archived");

	page.once("dialog", (dialog) => dialog.accept());
	const deleteRequest = page.waitForRequest(
		(request) => request.url().includes("/api/v1/lookups/items/lookup_created") && request.method() === "DELETE",
	);
	await page.getByRole("button", { name: "Delete Waiting on customer" }).click();
	await deleteRequest;
	await expect(page.getByRole("row", { name: /Waiting on customer/ })).toBeHidden();

	assertNoErrors();
});

test("tenant members smoke invites, updates roles, and cancels invitations", async ({ page }) => {
	const assertNoErrors = await expectNoConsoleErrors(page);
	await installAuthenticatedMocks(page);

	await page.goto("/settings/members", { waitUntil: "networkidle" });

	await expect(page.getByRole("heading", { name: "Members" })).toBeVisible();
	await expect(page.getByRole("cell", { name: "owner@example.test", exact: true })).toBeVisible();
	await expect(page.getByRole("cell", { name: "staff@example.test", exact: true })).toBeVisible();
	await expect(page.getByRole("cell", { name: "pending@example.test", exact: true })).toBeVisible();

	const inviteEmail = page.getByRole("textbox", { name: "Email" });
	await inviteEmail.fill("new.member@example.test");
	await page.locator("#member-invite-role").click();
	await page.getByRole("option", { name: "Admin" }).click();

	const inviteRequest = page.waitForRequest(
		(request) => request.url().includes("/api/v1/team/invitations") && request.method() === "POST",
	);
	await page.getByRole("button", { name: "Invite" }).click();
	const invitePayload = JSON.parse((await inviteRequest).postData() ?? "{}");

	expect(invitePayload).toEqual({
		email: "new.member@example.test",
		role: "admin",
	});
	await expect(inviteEmail).toHaveValue("");
	await expect(page.getByRole("cell", { name: "new.member@example.test", exact: true })).toBeVisible();

	const staffRow = page.getByRole("row", { name: /staff@example\.test/ });
	const roleRequest = page.waitForRequest(
		(request) => request.url().includes("/api/v1/team/members/member_staff") && request.method() === "PATCH",
	);
	await staffRow.getByRole("combobox", { name: /Role for staff@example\.test/i }).click();
	await page.getByRole("option", { name: "Viewer" }).click();
	const rolePayload = JSON.parse((await roleRequest).postData() ?? "{}");

	expect(rolePayload).toEqual({ role: "viewer" });
	await expect(staffRow.getByRole("combobox", { name: /Role for staff@example\.test/i })).toContainText("Viewer");

	const cancelRequest = page.waitForRequest(
		(request) => request.url().includes("/api/v1/team/invitations/inv_existing") && request.method() === "DELETE",
	);
	await page
		.getByRole("row", { name: /pending@example\.test/ })
		.getByRole("button", { name: /Cancel/ })
		.click();
	await cancelRequest;
	await expect(page.getByText("pending@example.test")).toBeHidden();

	assertNoErrors();
});

test("tenant members smoke accepts invitation links", async ({ page }) => {
	const assertNoErrors = await expectNoConsoleErrors(page);
	await installAuthenticatedMocks(page);

	const acceptResponse = page.waitForResponse(
		(response) =>
			response.url().includes("/api/v1/team/invitations/inv_existing/accept") &&
			response.request().method() === "POST" &&
			response.ok(),
	);
	await page.goto("/settings/members?invitationId=inv_existing", { waitUntil: "networkidle" });
	await acceptResponse;

	await expect(page.getByRole("heading", { name: "Members" })).toBeVisible();
	const acceptedRow = page.getByRole("row", { name: /pending@example\.test/ });
	await expect(acceptedRow).toContainText("accepted");
	await expect(acceptedRow.getByRole("button", { name: /Cancel/ })).toHaveCount(0);

	assertNoErrors();
});

test("tenant members smoke syncs invitation acceptance across owner and invited user", async ({
	browser,
}, testInfo) => {
	test.skip(testInfo.project.name !== "chromium", "Multi-user browser flow runs once in Chromium.");
	const parsedWebPort = Number.parseInt(process.env.E2E_WEB_PORT ?? "5173", 10);
	const baseURL = process.env.E2E_BASE_URL ?? `http://127.0.0.1:${Number.isNaN(parsedWebPort) ? 5173 : parsedWebPort}`;
	const state = createTeamFlowState(baseURL);
	const invitedUser = { id: "user_invited", name: "New Teammate", email: "new.teammate@example.test" };
	const invitedEmail = new RegExp(invitedUser.email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
	const ownerContext = await browser.newContext({ baseURL });
	const invitedContext = await browser.newContext({ baseURL });
	const ownerPage = await ownerContext.newPage();
	const invitedPage = await invitedContext.newPage();
	const assertOwnerNoErrors = await expectNoConsoleErrors(ownerPage);
	const assertInvitedNoErrors = await expectNoConsoleErrors(invitedPage);
	try {
		await installTeamFlowMocks(ownerPage, state, { id: "user_owner", name: "Demo Owner", email: "owner@example.test" });
		await installTeamFlowMocks(invitedPage, state, invitedUser);

		await ownerPage.goto("/settings/members", { waitUntil: "networkidle" });
		await expect(ownerPage.getByRole("heading", { name: "Members" })).toBeVisible();
		await ownerPage.getByRole("textbox", { name: "Email" }).fill(invitedUser.email);
		await ownerPage.locator("#member-invite-role").click();
		await ownerPage.getByRole("option", { name: "Viewer" }).click();
		const inviteResponse = ownerPage.waitForResponse(
			(response) => response.url().includes("/api/v1/team/invitations") && response.request().method() === "POST",
		);
		await ownerPage.getByRole("button", { name: "Invite" }).click();
		const inviteBody = await (await inviteResponse).json();
		expect(inviteBody.data).toMatchObject({ email: invitedUser.email, role: "viewer", status: "pending" });
		await expect(ownerPage.locator("tr", { hasText: invitedEmail }).filter({ hasText: "pending" })).toBeVisible();

		const acceptResponse = invitedPage.waitForResponse(
			(response) =>
				response.url().includes(`/api/v1/team/invitations/${inviteBody.data.id}/accept`) &&
				response.request().method() === "POST" &&
				response.ok(),
		);
		await invitedPage.goto(`/settings/members?invitationId=${inviteBody.data.id}`, { waitUntil: "networkidle" });
		await acceptResponse;
		await expect(invitedPage.locator("tr", { hasText: invitedEmail }).filter({ hasText: "accepted" })).toBeVisible();
		await expect(invitedPage.locator("tr", { hasText: invitedEmail }).filter({ hasText: "Remove" })).toContainText(
			"Viewer",
		);

		await ownerPage.reload({ waitUntil: "networkidle" });
		await expect(ownerPage.locator("tr", { hasText: invitedEmail }).filter({ hasText: "accepted" })).toBeVisible();
		await expect(ownerPage.locator("tr", { hasText: invitedEmail }).filter({ hasText: "Remove" })).toContainText(
			"Viewer",
		);
		await expect(
			ownerPage
				.locator("tr", { hasText: invitedEmail })
				.filter({ hasText: "accepted" })
				.getByRole("button", {
					name: /Cancel/,
				}),
		).toHaveCount(0);

		assertOwnerNoErrors();
		assertInvitedNoErrors();
	} finally {
		await invitedContext.close();
		await ownerContext.close();
	}
});

test("tenant API keys smoke creates and revokes scoped keys", async ({ page }) => {
	const assertNoErrors = await expectNoConsoleErrors(page);
	await installAuthenticatedMocks(page);

	await page.goto("/settings/api-keys", { waitUntil: "networkidle" });

	await expect(page.getByRole("heading", { name: "API keys" })).toBeVisible();
	await expect(page.getByRole("cell", { name: "Automation token", exact: true })).toBeVisible();
	await expect(page.getByRole("button", { name: "New key" })).toBeEnabled();

	const includeRevokedRequest = page.waitForRequest(
		(request) =>
			request.url().includes("/api/v1/api-keys") &&
			new URL(request.url()).searchParams.get("includeRevoked") === "true",
	);
	await page.getByRole("checkbox", { name: "Show revoked" }).check();
	await includeRevokedRequest;
	await expect(page.getByRole("cell", { name: "Old webhook", exact: true })).toBeVisible();

	await page.getByRole("button", { name: "New key" }).click();
	await page.getByRole("textbox", { name: "Name" }).fill("Deploy hook");
	await page.getByRole("checkbox", { name: "read:organization" }).check();
	await page.getByLabel("Expires").fill("2026-12-31");
	await page.getByRole("spinbutton", { name: "Requests per minute" }).fill("120");

	const createRequest = page.waitForRequest(
		(request) => request.url().includes("/api/v1/api-keys") && request.method() === "POST",
	);
	await page.getByRole("button", { name: "Create" }).click();
	const createPayload = JSON.parse((await createRequest).postData() ?? "{}");

	expect(createPayload).toMatchObject({
		name: "Deploy hook",
		scopes: ["read:organization"],
		rateLimit: 120,
	});
	expect(createPayload.expiresAt).toBe("2026-12-31T00:00:00.000Z");
	await expect(page.getByRole("dialog", { name: "Copy this key now" })).toBeVisible();
	await expect(page.getByText("vsk_live_new_secret")).toBeVisible();
	await page.getByRole("button", { name: "Done" }).click();
	await expect(page.getByRole("cell", { name: "Deploy hook", exact: true })).toBeVisible();

	const revokeRequest = page.waitForRequest(
		(request) => request.url().includes("/api/v1/api-keys/key_active") && request.method() === "DELETE",
	);
	await page.getByRole("button", { name: "Revoke Automation token" }).click();
	await revokeRequest;
	await expect(page.getByRole("row", { name: /Automation token/ })).toContainText("Revoked");

	assertNoErrors();
});

test("tenant billing smoke renders plans and records manual payment", async ({ page }) => {
	const assertNoErrors = await expectNoConsoleErrors(page);
	await installAuthenticatedMocks(page);

	await page.goto("/settings/billing", { waitUntil: "networkidle" });

	await expect(page.getByRole("heading", { name: "Billing" })).toBeVisible();
	await expect(page.getByText("Current subscription")).toBeVisible();
	await expect(page.getByText("Production plan for growing tenants")).toBeVisible();
	await expect(page.getByText("Starter", { exact: true })).toBeVisible();
	await expect(page.getByRole("button", { name: "Annual" })).toBeVisible();
	await expect(page.getByRole("cell", { name: "INV-TENANT-001" })).toBeVisible();

	await page.getByRole("button", { name: "Annual" }).click();
	await expect(page.getByRole("button", { name: "Choose plan" })).toBeVisible();

	await page.getByRole("button", { name: "Manual" }).click();
	const paymentDialog = page.getByRole("dialog", { name: "Record manual payment" });
	await expect(paymentDialog).toBeVisible();
	await paymentDialog.getByRole("spinbutton", { name: "Amount (minor units)" }).fill("450000");
	await paymentDialog.getByRole("textbox", { name: "Receipt number" }).fill("RCPT-TENANT-001");
	await paymentDialog.getByRole("textbox", { name: "Bank reference" }).fill("BANK-TENANT-001");
	await paymentDialog.getByRole("textbox", { name: "Note" }).fill("Confirmed by finance");
	const paymentRequest = page.waitForRequest(
		(request) => request.url().includes("/api/v1/billing/payments/manual") && request.method() === "POST",
	);
	await paymentDialog.getByRole("button", { name: "Submit payment" }).click();
	expect(JSON.parse((await paymentRequest).postData() ?? "{}")).toMatchObject({
		invoiceId: "tenant_invoice_smoke",
		amountMinor: 450000,
		method: "manual_bank",
		receiptNumber: "RCPT-TENANT-001",
		bankReference: "BANK-TENANT-001",
		note: "Confirmed by finance",
	});
	await expect(page.getByRole("row", { name: /INV-TENANT-001/ })).toContainText("paid");

	assertNoErrors();
});

test("notification deliveries smoke renders searchable delivery table", async ({ page }) => {
	const assertNoErrors = await expectNoConsoleErrors(page);
	await installAuthenticatedMocks(page);

	await page.goto("/notifications/deliveries?search=invoice&limit=20", { waitUntil: "networkidle" });

	await expect(page.getByRole("heading", { name: "Email Deliveries" })).toBeVisible();
	const search = page.getByRole("textbox", { name: /Search deliveries/i });
	await expect(search).toHaveValue("invoice");
	await expect(page.getByRole("button", { name: "Columns" })).toBeVisible();
	await expect(page.getByRole("button", { name: "Export CSV" })).toBeVisible();
	await expect(page.getByRole("button", { name: "Saved views" })).toBeVisible();
	await expect(page.getByRole("button", { name: "Save view" })).toBeVisible();
	await expect(page.getByRole("cell", { name: /owner@example.test/i })).toBeVisible();
	await expect(page.getByRole("cell", { name: /Invoice ready/i })).toBeVisible();

	await search.fill("digest");
	await expect.poll(() => new URL(page.url()).searchParams.get("search")).toBe("digest");

	assertNoErrors();
});

test("admin onboarding smoke renders filterable operations table", async ({ page }) => {
	const assertNoErrors = await expectNoConsoleErrors(page);
	const { onboardingListRequests } = await installAdminMocks(page);

	await page.goto("/admin/onboarding?search=Demo&limit=100&sort=tenant%3Aasc", { waitUntil: "networkidle" });

	await expect(page.getByRole("heading", { name: "Concierge onboarding" })).toBeVisible();
	await expect(page.getByRole("heading", { name: "Queue by owner and risk" })).toBeVisible();
	const search = page.getByRole("textbox", { name: /Search tenants/i });
	await expect(search).toHaveValue("Demo");
	await expect(page.getByRole("button", { name: "Columns" })).toBeVisible();
	await expect(page.getByRole("button", { name: "Export CSV" })).toBeVisible();
	await expect(page.getByRole("button", { name: "Saved views" })).toBeVisible();
	await expect(page.getByRole("button", { name: "Save view" })).toBeVisible();
	await expect(page.getByRole("columnheader", { name: /Current step/i })).toBeVisible();
	await expect(page.getByRole("cell", { name: /Demo Cafe/i })).toBeVisible();
	await expect(page.getByRole("button", { name: /Admin command/i })).toBeVisible();
	await page.getByRole("checkbox", { name: "Select row task_smoke" }).check();
	await expect(page.getByText("1 selected")).toBeVisible();
	await expect(page.getByRole("button", { name: "Bulk actions" })).toBeVisible();
	await expect
		.poll(() => onboardingListRequests.some((url) => new URL(url).searchParams.get("search") === "Demo"))
		.toBe(true);

	await search.fill("Demo Cafe");
	await expect.poll(() => new URL(page.url()).searchParams.get("search")).toBe("Demo Cafe");
	await expect(page.getByRole("cell", { name: /Demo Cafe/i })).toBeVisible();
	await expect(page.getByText("1/4 steps")).toBeVisible();

	await page.keyboard.press(process.platform === "darwin" ? "Meta+K" : "Control+K");
	await expect(page.getByRole("dialog", { name: "Command palette" })).toBeVisible();
	await expect(page.getByRole("button", { name: /Billing dashboard/i })).toBeVisible();
	await expect(page.getByRole("button", { name: /New tenant onboarding/i })).toBeVisible();

	assertNoErrors();
});

test("admin onboarding detail exposes staff ownership and tenant impersonation actions", async ({ page }) => {
	const assertNoErrors = await expectNoConsoleErrors(page);
	await installAdminMocks(page);

	await page.goto("/admin/onboarding/task_smoke", { waitUntil: "networkidle" });

	await expect(page.getByRole("heading", { name: "Demo Cafe" })).toBeVisible();
	await expect(page.getByRole("button", { name: "Assign to me" })).toBeVisible();
	await expect(page.getByRole("button", { name: "Impersonate tenant" })).toBeEnabled();
	await expect(page.getByText("Current action panel")).toBeVisible();
	await expect(page.getByRole("link", { name: "Send email" })).toHaveAttribute("href", "mailto:owner@example.test");
	await expect(page.getByText("Step timeline")).toBeVisible();

	assertNoErrors();
});

test("admin feature flags smoke renders rollout table", async ({ page }) => {
	const assertNoErrors = await expectNoConsoleErrors(page);
	await installAdminMocks(page);

	await page.goto("/admin/feature-flags?search=api&limit=100", { waitUntil: "networkidle" });

	await expect(page.getByRole("heading", { name: "Feature Flags" })).toBeVisible();
	const search = page.getByRole("textbox", { name: /Search feature flags/i });
	await expect(search).toHaveValue("api");
	await expect(page.getByRole("button", { name: "Columns" })).toBeVisible();
	await expect(page.getByRole("button", { name: "Export CSV" })).toBeVisible();
	await expect(page.getByRole("button", { name: "Saved views" })).toBeVisible();
	await expect(page.getByRole("button", { name: "Save view" })).toBeVisible();
	await expect(page.getByText("platform.api-keys", { exact: true })).toBeVisible();
	await expect(page.getByRole("switch", { name: "Toggle platform.api-keys globally" })).toBeChecked();
	await expect(page.getByRole("button", { name: "Add override" }).first()).toBeVisible();
	await page.getByRole("checkbox", { name: "Select row flag_api" }).check();
	await expect(page.getByText("1 selected")).toBeVisible();
	await expect(page.getByRole("button", { name: "Bulk actions" })).toBeVisible();

	const globalToggleRequest = page.waitForRequest(
		(request) =>
			request.url().includes("/api/v1/admin/settings/feature-flags/platform.api-keys/global") &&
			request.method() === "PUT",
	);
	await page.getByRole("switch", { name: "Toggle platform.api-keys globally" }).click();
	expect(JSON.parse((await globalToggleRequest).postData() ?? "{}")).toEqual({ enabled: false });
	await expect(page.getByRole("switch", { name: "Toggle platform.api-keys globally" })).not.toBeChecked();

	const orgToggleRequest = page.waitForRequest(
		(request) =>
			request.url().includes("/api/v1/admin/settings/feature-flags/platform.api-keys/org/org_smoke") &&
			request.method() === "PUT",
	);
	await page.getByRole("switch", { name: "Toggle platform.api-keys for Demo Cafe" }).click();
	expect(JSON.parse((await orgToggleRequest).postData() ?? "{}")).toEqual({ enabled: true });
	await expect(page.getByRole("switch", { name: "Toggle platform.api-keys for Demo Cafe" })).toBeChecked();

	await page.getByRole("button", { name: "Add override" }).first().click();
	await page.getByRole("combobox", { name: "Organization" }).click();
	await page.getByRole("option", { name: /Demo Cafe/ }).click();
	await page.getByRole("combobox", { name: "Override state" }).click();
	await page.getByRole("option", { name: "Disable" }).click();
	const addOverrideRequest = page.waitForRequest(
		(request) =>
			request.url().includes("/api/v1/admin/settings/feature-flags/platform.api-keys/org/org_smoke") &&
			request.method() === "PUT",
	);
	await page.getByRole("button", { name: "Apply" }).click();
	expect(JSON.parse((await addOverrideRequest).postData() ?? "{}")).toEqual({ enabled: false });

	assertNoErrors();
});

test("admin users smoke renders searchable user table", async ({ page }) => {
	const assertNoErrors = await expectNoConsoleErrors(page);
	await installAdminMocks(page);

	await page.goto("/admin/users?search=staff&limit=50&sort=createdAt%3Adesc", { waitUntil: "networkidle" });

	await expect(page.getByRole("heading", { name: "All Users" })).toBeVisible();
	const search = page.getByRole("textbox", { name: /Search users/i });
	await expect(search).toHaveValue("staff");
	await expect(page.getByRole("button", { name: "Columns" })).toBeVisible();
	await expect(page.getByRole("button", { name: "Export CSV" })).toBeVisible();
	await expect(page.getByRole("button", { name: "Saved views" })).toBeVisible();
	await expect(page.getByRole("button", { name: "Save view" })).toBeVisible();
	await expect(page.getByText("staff@example.test")).toBeVisible();
	await expect(page.getByText("Verified", { exact: true })).toBeVisible();
	await expect(page.getByRole("button", { name: /Impersonate/i })).toBeVisible();

	assertNoErrors();
});

test("admin organizations smoke renders tenant directory table", async ({ page }) => {
	const assertNoErrors = await expectNoConsoleErrors(page);
	await installAdminMocks(page);

	await page.goto("/admin/organizations?search=Demo&limit=20&sort=name%3Aasc", { waitUntil: "networkidle" });

	await expect(page.getByRole("heading", { name: "All Organizations" })).toBeVisible();
	const search = page.getByRole("textbox", { name: /Search organizations/i });
	await expect(search).toHaveValue("Demo");
	await expect(page.getByRole("button", { name: "Columns" })).toBeVisible();
	await expect(page.getByRole("button", { name: "Export CSV" })).toBeVisible();
	await expect(page.getByRole("button", { name: "Saved views" })).toBeVisible();
	await expect(page.getByRole("button", { name: "Save view" })).toBeVisible();
	await expect(page.getByText("Demo Cafe", { exact: true })).toBeVisible();
	await expect(page.getByText("owner@example.test")).toBeVisible();
	await expect(page.getByRole("link", { name: "View", exact: true })).toBeVisible();

	assertNoErrors();
});

test("admin organization detail smoke renders member and entitlement tables", async ({ page }) => {
	const assertNoErrors = await expectNoConsoleErrors(page);
	await installAdminMocks(page);

	await page.goto("/admin/organizations/org_smoke", { waitUntil: "networkidle" });

	await expect(page.getByRole("heading", { name: "Demo Cafe" })).toBeVisible();
	await expect(page.getByRole("heading", { name: "Members" })).toBeVisible();
	await expect(page.getByRole("textbox", { name: /Search members/i })).toBeVisible();
	await expect(page.getByText("owner@example.test")).toBeVisible();
	await expect(page.getByText("staff@example.test")).toBeVisible();
	await expect(page.getByRole("heading", { name: "Feature entitlement overrides" })).toBeVisible();
	await expect(page.getByRole("textbox", { name: /Search overrides/i })).toBeVisible();
	await expect(page.getByText("platform.api-keys")).toBeVisible();
	await expect(page.getByText("beta access")).toBeVisible();
	await expect(page.getByRole("button", { name: "Remove platform.api-keys override" })).toBeVisible();
	await expect(page.getByRole("button", { name: "Export CSV" })).toHaveCount(2);
	await expect(page.getByRole("button", { name: "Saved views" })).toHaveCount(2);

	await page.getByRole("combobox", { name: "Feature key" }).click();
	await page.getByRole("option", { name: "platform.reports" }).click();
	await page.getByRole("combobox", { name: "Mode" }).click();
	await page.getByRole("option", { name: "Block" }).click();
	await page.getByRole("spinbutton", { name: "Limit" }).fill("5");
	await page.getByLabel("Expires").fill("2026-12-31");
	await page.getByRole("textbox", { name: "Reason" }).fill("contract exception");
	const applyRequest = page.waitForRequest(
		(request) => request.url().includes("/api/v1/admin/entitlement-overrides") && request.method() === "POST",
	);
	await page.getByRole("button", { name: "Apply entitlement override" }).click();
	expect(JSON.parse((await applyRequest).postData() ?? "{}")).toEqual({
		organizationId: "org_smoke",
		featureKey: "platform.reports",
		enabled: false,
		limit: 5,
		expiresAt: "2026-12-31",
		reason: "contract exception",
	});
	await expect(page.getByRole("row", { name: /platform\.reports/ })).toContainText("Block");

	const removeRequest = page.waitForRequest(
		(request) =>
			request.url().includes("/api/v1/admin/entitlement-overrides/override_created") && request.method() === "DELETE",
	);
	await page.getByRole("button", { name: "Remove platform.reports override" }).click();
	await removeRequest;
	await expect(page.getByRole("row", { name: /platform\.reports/ })).toBeHidden();

	assertNoErrors();
});

test("admin billing smoke renders searchable subscription table", async ({ page }) => {
	const assertNoErrors = await expectNoConsoleErrors(page);
	await installAdminMocks(page);

	await page.goto("/admin/billing", { waitUntil: "networkidle" });

	await expect(page.getByRole("heading", { name: "Billing" })).toBeVisible();
	await expect(page.getByRole("link", { name: /KPI Dashboard/i })).toBeVisible();
	await expect(page.getByRole("textbox", { name: /Search subscriptions/i })).toBeVisible();
	await expect(page.getByRole("button", { name: "Columns" })).toBeVisible();
	await expect(page.getByRole("button", { name: "Export CSV" })).toBeVisible();
	await expect(page.getByRole("button", { name: "Saved views" })).toBeVisible();
	await expect(page.getByText("Demo Cafe")).toBeVisible();
	await expect(page.getByText("Overdue Trading")).toBeVisible();
	await expect(page.getByRole("link", { name: "Manage" }).first()).toBeVisible();

	assertNoErrors();
});

test("admin subscription detail smoke renders lifecycle DataTables", async ({ page }) => {
	const assertNoErrors = await expectNoConsoleErrors(page);
	await installAdminMocks(page);

	await page.goto("/admin/billing/sub_smoke", { waitUntil: "networkidle" });

	await expect(page.getByRole("heading", { name: "Demo Cafe" })).toBeVisible();
	await expect(page.getByRole("heading", { name: "Invoices" })).toBeVisible();
	await expect(page.getByRole("textbox", { name: /Search invoices/i })).toBeVisible();
	await expect(page.getByRole("button", { name: "Columns" })).toBeVisible();
	await expect(page.getByRole("button", { name: "Export CSV" })).toBeVisible();
	await expect(page.getByRole("button", { name: "Saved views" })).toBeVisible();
	await expect(page.getByText("INV-DETAIL-001")).toBeVisible();
	await expect(page.getByRole("button", { name: "Send" })).toBeVisible();
	await expect(page.getByRole("button", { name: "Pay" })).toBeVisible();
	const invoiceRow = page.getByRole("row", { name: /INV-DETAIL-001/ });

	const sendInvoiceRequest = page.waitForRequest(
		(request) =>
			request.url().includes("/api/v1/admin/billing/invoices/invoice_smoke/send") && request.method() === "PUT",
	);
	await page.getByRole("button", { name: "Send" }).click();
	expect(JSON.parse((await sendInvoiceRequest).postData() ?? "{}")).toEqual({});
	await expect(invoiceRow).toContainText("sent");

	await invoiceRow.getByRole("button", { name: "Pay" }).click();
	const paymentDialog = page.getByRole("dialog", { name: /Record payment - INV-DETAIL-001/ });
	await expect(paymentDialog).toBeVisible();
	await paymentDialog.locator("#payment-amount-invoice_smoke").fill("450000");
	await paymentDialog.locator("#payment-receipt-invoice_smoke").fill("RCPT-002");
	await paymentDialog.locator("#payment-bank-ref-invoice_smoke").fill("BANK-002");
	await paymentDialog.locator("#payment-paid-at-invoice_smoke").fill("2026-06-01");
	await paymentDialog.locator("#payment-note-invoice_smoke").fill("Confirmed bank transfer");
	const recordPaymentRequest = page.waitForRequest(
		(request) =>
			request.url().includes("/api/v1/admin/billing/invoices/invoice_smoke/payments") && request.method() === "POST",
	);
	await paymentDialog.getByRole("button", { name: "Confirm Payment" }).click();
	expect(JSON.parse((await recordPaymentRequest).postData() ?? "{}")).toEqual({
		amountMinor: 450000,
		method: "manual_bank",
		paidAt: "2026-06-01",
		receiptNumber: "RCPT-002",
		bankReference: "BANK-002",
		note: "Confirmed bank transfer",
	});
	await expect(invoiceRow).toContainText("paid");
	await expect(invoiceRow).toContainText("4,500.00");

	await page.getByRole("tab", { name: /Dunning/i }).click();
	await expect(page.getByRole("heading", { name: "Dunning history" })).toBeVisible();
	await expect(page.getByRole("textbox", { name: /Search dunning history/i })).toBeVisible();
	await expect(page.getByText("Your invoice is overdue")).toBeVisible();

	await page.getByRole("tab", { name: "Usage" }).click();
	await expect(page.getByRole("heading", { name: "Daily usage snapshots (last 90)" })).toBeVisible();
	await expect(page.getByRole("textbox", { name: /Search usage snapshots/i })).toBeVisible();
	await expect(page.getByText("128")).toBeVisible();
	await expect(page.getByRole("button", { name: "Export CSV" })).toBeVisible();

	assertNoErrors();
});

test("admin plan detail smoke renders editable entitlement table", async ({ page }) => {
	const assertNoErrors = await expectNoConsoleErrors(page);
	await installAdminMocks(page);

	await page.goto("/admin/plans/plan_pro", { waitUntil: "networkidle" });

	await expect(page.getByRole("heading", { name: /Edit Plan: Pro/i })).toBeVisible();
	await expect(page.getByRole("heading", { name: "Feature Entitlements" })).toBeVisible();
	await expect(page.getByRole("textbox", { name: /Search entitlements/i })).toBeVisible();
	await expect(page.getByRole("button", { name: "Columns" })).toBeVisible();
	await expect(page.getByRole("button", { name: "Export CSV" })).toBeVisible();
	await expect(page.getByRole("button", { name: "Saved views" })).toBeVisible();
	await expect(page.getByText("platform.api-keys")).toBeVisible();
	await expect(page.getByText("platform.reports")).toBeVisible();
	await expect(page.getByRole("switch", { name: "Toggle platform.api-keys" })).toBeChecked();
	await expect(page.getByRole("button", { name: "Save Entitlements" })).toBeVisible();
	const reportsEntitlementRow = page.getByRole("row", { name: /platform\.reports/ });
	await reportsEntitlementRow.getByRole("switch", { name: "Toggle platform.reports" }).click();
	await reportsEntitlementRow.getByRole("spinbutton").fill("15");
	const saveEntitlementsRequest = page.waitForRequest(
		(request) =>
			request.url().includes("/api/v1/admin/plans/plan_pro/entitlements/bulk") && request.method() === "POST",
	);
	await page.getByRole("button", { name: "Save Entitlements" }).click();
	expect(JSON.parse((await saveEntitlementsRequest).postData() ?? "{}")).toEqual({
		entitlements: [
			{ featureKey: "platform.api-keys", enabled: true, limit: 25 },
			{ featureKey: "platform.reports", enabled: true, limit: 15 },
		],
	});
	await expect(reportsEntitlementRow.getByRole("spinbutton")).toHaveValue("15");

	assertNoErrors();
});

test("admin billing dashboard smoke renders operational tables", async ({ page }) => {
	const assertNoErrors = await expectNoConsoleErrors(page);
	await installAdminMocks(page);

	await page.goto("/admin/billing/dashboard", { waitUntil: "networkidle" });

	await expect(page.getByRole("heading", { name: "Billing Dashboard" })).toBeVisible();
	await expect(page.getByRole("link", { name: "View all subscriptions" })).toBeVisible();
	await expect(page.getByRole("heading", { name: "Revenue by plan" })).toBeVisible();
	await expect(page.getByRole("textbox", { name: /Search plan revenue/i })).toBeVisible();
	await expect(page.getByText("pro", { exact: true })).toBeVisible();
	await expect(page.getByRole("heading", { name: "Past-due invoices" })).toBeVisible();
	await expect(page.getByRole("textbox", { name: /Search past-due invoices/i })).toBeVisible();
	await expect(page.getByText("INV-1001")).toBeVisible();
	await expect(page.getByText("Overdue Trading")).toBeVisible();
	await expect(page.getByRole("heading", { name: "Manual payments awaiting verification" })).toBeVisible();
	await expect(page.getByRole("textbox", { name: /Search pending payments/i })).toBeVisible();
	await expect(page.getByText("INV-1002")).toBeVisible();
	await expect(page.getByRole("button", { name: "Verify" })).toBeVisible();
	const pendingPaymentRow = page.getByRole("row", { name: /INV-1002/ });
	const verifyPaymentRequest = page.waitForRequest(
		(request) =>
			request.url().includes("/api/v1/admin/billing/payments/payment_pending/verify") && request.method() === "POST",
	);
	await pendingPaymentRow.getByRole("button", { name: "Verify" }).click();
	expect(JSON.parse((await verifyPaymentRequest).postData() ?? "{}")).toEqual({});
	await expect(pendingPaymentRow).toBeHidden();
	await expect(page.getByRole("button", { name: "Export CSV" })).toHaveCount(3);
	await expect(page.getByRole("button", { name: "Saved views" })).toHaveCount(3);

	assertNoErrors();
});

test("admin audit logs smoke renders filterable evidence table", async ({ page }) => {
	const assertNoErrors = await expectNoConsoleErrors(page);
	await installAdminMocks(page);

	await page.goto("/admin/audit-logs?search=tenant&limit=50&sort=createdAt%3Adesc", { waitUntil: "networkidle" });

	await expect(page.getByRole("heading", { name: /platform audit logs/i })).toBeVisible();
	const search = page.getByRole("textbox", { name: /Search audit logs/i });
	await expect(search).toHaveValue("tenant");
	await expect(page.getByRole("button", { name: "Columns" })).toBeVisible();
	await expect(page.getByRole("button", { name: "Export CSV" })).toBeVisible();
	await expect(page.getByRole("button", { name: "Saved views" })).toBeVisible();
	await expect(page.getByRole("button", { name: "Save view" })).toBeVisible();
	await expect(page.getByRole("link", { name: "Export all CSV" })).toBeVisible();
	await expect(page.getByText("tenant.suspended")).toBeVisible();
	await expect(page.getByText("organization", { exact: true })).toBeVisible();

	assertNoErrors();
});

test("admin onboarding new tenant renders concierge intake workflow", async ({ page }) => {
	const assertNoErrors = await expectNoConsoleErrors(page);
	await installAdminMocks(page);

	await page.goto("/admin/onboarding/new", { waitUntil: "networkidle" });

	await expect(page.getByRole("heading", { name: "New tenant onboarding" })).toBeVisible();
	await expect(page.getByText("Concierge intake")).toBeVisible();
	await expect(page.getByRole("heading", { name: "Create a staff-owned workflow" })).toBeVisible();
	await expect(page.getByText("Existing organization", { exact: true })).toBeVisible();
	await expect(page.getByText("TIN", { exact: true })).toBeVisible();

	await page.getByRole("button", { name: "Contact" }).click();
	await expect(page.getByText("Owner full name")).toBeVisible();
	await expect(page.getByText("Preferred contact channel")).toBeVisible();

	await page.getByRole("button", { name: "Subscription" }).click();
	await expect(page.getByText("Payment method")).toBeVisible();
	await expect(page.getByText("Reference number")).toBeVisible();

	await page.getByRole("button", { name: "Setup" }).click();
	await expect(page.getByText("Task template")).toBeVisible();
	await expect(page.getByText("Assigned staff")).toBeVisible();

	assertNoErrors();
});

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

	await page.route("**/api/v1/**", async (route: Route) => {
		const url = route.request().url();
		const pathname = new URL(url).pathname;
		if (url.includes("/billing/me")) {
			await route.fulfill(ok({ data: { subscription: null, lifecycle: null, entitlements: {} } }));
			return;
		}
		if (url.includes("/billing/capabilities")) {
			await route.fulfill(ok({ data: {} }));
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

	// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: this e2e mock dispatches many independent admin API fixtures.
	await page.route("**/api/v1/**", async (route: Route) => {
		const url = route.request().url();
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
			await route.fulfill(
				ok({
					data: [
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
					],
				}),
			);
			return;
		}
		if (url.includes("/admin/plans/feature-keys")) {
			await route.fulfill(ok({ data: ["platform.api-keys", "platform.reports"] }));
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
						entitlements: [
							{ id: "ent_api", featureKey: "platform.api-keys", enabled: true, limit: 25 },
							{ id: "ent_reports", featureKey: "platform.reports", enabled: false, limit: null },
						],
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
		if (url.includes("/admin/billing/dashboard/pending-verification")) {
			await route.fulfill(
				ok({
					data: [
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
					],
				}),
			);
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
						invoices: [
							{
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
							},
						],
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
			await route.fulfill(
				ok({
					data: [
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
					],
				}),
			);
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

	await expect(page.getByRole("heading", { name: "Launch console" })).toBeVisible();
	await expect(page.getByRole("heading", { name: "Concierge launch workflow" })).toBeVisible();
	await expect(page.getByRole("heading", { name: "Operational handoff map" })).toBeVisible();
	await expect(page.getByText("Current action").first()).toBeVisible();
	await expect(page.getByRole("heading", { name: "Company profile" }).first()).toBeVisible();
	await expect(page.getByText("25%", { exact: true })).toBeVisible();

	await page.keyboard.press(process.platform === "darwin" ? "Meta+K" : "Control+K");
	await expect(page.getByRole("dialog", { name: "Command palette" })).toBeVisible();
	await expect(page.getByRole("button", { name: /Organization settings/i })).toBeVisible();

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
	await page.getByRole("row", { name: /pending@example\.test/ }).getByRole("button", { name: /Cancel/ }).click();
	await cancelRequest;
	await expect(page.getByText("pending@example.test")).toBeHidden();

	assertNoErrors();
});

test("tenant members smoke accepts invitation links", async ({ page }) => {
	const assertNoErrors = await expectNoConsoleErrors(page);
	await installAuthenticatedMocks(page);

	const acceptRequest = page.waitForRequest(
		(request) => request.url().includes("/api/v1/team/invitations/inv_existing/accept") && request.method() === "POST",
	);
	await page.goto("/settings/members?invitationId=inv_existing", { waitUntil: "networkidle" });
	await acceptRequest;

	await expect(page.getByRole("heading", { name: "Members" })).toBeVisible();
	await expect(page.getByRole("row", { name: /pending@example\.test/ })).toContainText("accepted");

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
	await expect(page.getByRole("button", { name: "Remove" })).toBeVisible();
	await expect(page.getByRole("button", { name: "Export CSV" })).toHaveCount(2);
	await expect(page.getByRole("button", { name: "Saved views" })).toHaveCount(2);

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

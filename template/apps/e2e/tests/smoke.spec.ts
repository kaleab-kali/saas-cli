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

	await page.route("**/api/v1/**", async (route: Route) => {
		const url = route.request().url();
		if (url.includes("/billing/me")) {
			await route.fulfill(ok({ data: { subscription: null, lifecycle: null, entitlements: {} } }));
			return;
		}
		if (url.includes("/billing/capabilities")) {
			await route.fulfill(ok({ data: {} }));
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
		await route.fulfill(ok({ data: {} }));
	});
}

async function installAdminMocks(page: Page) {
	const onboardingListRequests: string[] = [];

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

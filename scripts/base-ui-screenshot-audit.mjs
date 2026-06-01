import { createRequire } from "node:module";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { spawn } from "node:child_process";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const repoRoot = resolve(import.meta.dirname, "..");
const templateRoot = join(repoRoot, "template");
const webRoot = join(templateRoot, "apps", "web");
const e2eRoot = join(templateRoot, "apps", "e2e");
const smokeSpec = join(e2eRoot, "tests", "smoke.spec.ts");
const outputRoot = resolve(process.env.UI_AUDIT_DIR ?? join(repoRoot, "artifacts", "base-ui-audit"));
const port = Number.parseInt(process.env.UI_AUDIT_PORT ?? "5177", 10);
const baseURL = process.env.UI_AUDIT_BASE_URL ?? `http://127.0.0.1:${port}`;

const { chromium } = require(join(e2eRoot, "node_modules", "@playwright", "test"));
const ts = require(join(webRoot, "node_modules", "typescript"));

const tenantRoutes = [
	["tenant-onboarding", "/onboarding"],
	["tenant-files", "/files"],
	["tenant-notifications-inbox", "/notifications"],
	["tenant-notifications-preferences", "/notifications/preferences"],
	["tenant-notifications-templates", "/notifications/templates"],
	["tenant-notifications-deliveries", "/notifications/deliveries"],
	["tenant-reports", "/reports"],
	["tenant-reports-dashboard-main", "/reports/dashboard/main"],
	["tenant-reports-saved", "/reports/saved"],
	["tenant-reports-new", "/reports/new"],
	["tenant-reports-schedules", "/reports/schedules"],
	["tenant-settings", "/settings"],
	["tenant-settings-members", "/settings/members"],
	["tenant-settings-roles", "/settings/roles"],
	["tenant-settings-billing", "/settings/billing"],
	["tenant-settings-organization", "/settings/organization"],
	["tenant-settings-security", "/settings/security"],
	["tenant-settings-api-keys", "/settings/api-keys"],
	["tenant-settings-audit-log", "/settings/audit-log"],
	["tenant-settings-lookups", "/settings/lookups"],
];

const adminRoutes = [
	["admin-overview", "/admin"],
	["admin-organizations", "/admin/organizations"],
	["admin-organization-detail", "/admin/organizations/org_smoke"],
	["admin-onboarding", "/admin/onboarding"],
	["admin-onboarding-detail", "/admin/onboarding/task_smoke"],
	["admin-onboarding-new", "/admin/onboarding/new"],
	["admin-users", "/admin/users"],
	["admin-plans", "/admin/plans"],
	["admin-plan-new", "/admin/plans/new"],
	["admin-plan-detail", "/admin/plans/plan_pro"],
	["admin-billing", "/admin/billing"],
	["admin-billing-detail", "/admin/billing/sub_smoke"],
	["admin-billing-dashboard", "/admin/billing/dashboard"],
	["admin-feature-flags", "/admin/feature-flags"],
	["admin-system-templates", "/admin/system-templates"],
	["admin-jobs", "/admin/jobs"],
	["admin-server", "/admin/server"],
	["admin-audit-logs", "/admin/audit-logs"],
	["admin-settings", "/admin/settings"],
];

const publicRoutes = [
	["public-login", "/login"],
	["public-signup", "/signup"],
	["public-create-org", "/create-org"],
	["public-admin-login", "/admin-login"],
];

const auditNow = () => new Date("2026-06-01T09:00:00.000Z").toISOString();

const sampleReport = {
	id: "report_smoke",
	name: "Usage overview",
	description: "Member and notification activity by week",
	dataSource: "member",
	columns: [
		{ field: "name", label: "Name" },
		{ field: "role", label: "Role" },
		{ field: "createdAt", label: "Created" },
	],
	filters: [],
	groupBy: ["role"],
	sort: [{ field: "createdAt", dir: "desc" }],
	chartType: "bar",
	isTemplate: false,
	sharedWithTeam: true,
	createdAt: auditNow(),
	updatedAt: auditNow(),
};

const samplePlan = {
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
	entitlements: [{ featureKey: "platform.api-keys", enabled: true, limit: 25 }],
};

const sampleInvoice = {
	id: "invoice_smoke",
	number: "INV-1001",
	status: "sent",
	issueDate: auditNow(),
	dueDate: auditNow(),
	periodStart: auditNow(),
	periodEnd: auditNow(),
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

const wait = (ms) => new Promise((resolveWait) => setTimeout(resolveWait, ms));

function noOpTest() {}
noOpTest.beforeEach = () => undefined;
noOpTest.describe = () => undefined;
noOpTest.skip = () => undefined;
noOpTest.fixme = () => undefined;

function noOpExpect() {
	return new Proxy(
		{},
		{
			get: () => () => undefined,
		},
	);
}

async function loadSmokeMocks() {
	const source = await readFile(smokeSpec, "utf8");
	const js = ts.transpileModule(`${source}\nglobalThis.__smokeMocks = { installAuthenticatedMocks, installAdminMocks };`, {
		compilerOptions: {
			module: ts.ModuleKind.CommonJS,
			target: ts.ScriptTarget.ES2022,
			esModuleInterop: true,
		},
		fileName: smokeSpec,
	}).outputText;

	const context = vm.createContext({
		URL,
		Date,
		JSON,
		Number,
		String,
		Boolean,
		Array,
		Math,
		console,
		setTimeout,
		clearTimeout,
		globalThis: {},
		require: (id) => {
			if (id === "@playwright/test") return { expect: noOpExpect, test: noOpTest };
			return require(id);
		},
		exports: {},
		module: { exports: {} },
	});
	vm.runInContext(js, context, { filename: "smoke.spec.js" });
	return context.globalThis.__smokeMocks;
}

async function waitForServer(url) {
	for (let index = 0; index < 120; index += 1) {
		try {
			const response = await fetch(url);
			if (response.ok || response.status < 500) return;
		} catch {
			// Server is still booting.
		}
		await wait(500);
	}
	throw new Error(`Timed out waiting for ${url}`);
}

function startWebServer() {
	if (process.env.UI_AUDIT_BASE_URL) return null;
	const command = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
	const child = spawn(command, ["exec", "vite", "--host", "127.0.0.1", "--port", String(port)], {
		cwd: webRoot,
		env: { ...process.env, BROWSER: "none" },
		shell: process.platform === "win32",
		stdio: ["ignore", "pipe", "pipe"],
		windowsHide: true,
	});
	child.stdout.on("data", (chunk) => process.stdout.write(chunk));
	child.stderr.on("data", (chunk) => process.stderr.write(chunk));
	return child;
}

async function stopWebServer(server) {
	if (!server) return;
	if (process.platform === "win32") {
		await new Promise((resolveStop) => {
			const killer = spawn("taskkill", ["/pid", String(server.pid), "/T", "/F"], {
				stdio: "ignore",
				windowsHide: true,
			});
			killer.on("close", resolveStop);
			killer.on("error", resolveStop);
		});
		return;
	}
	server.kill("SIGTERM");
}

async function installTenantAuditMocks(page) {
	await page.route("**/api/v1/**", async (route) => {
		const request = route.request();
		const url = new URL(request.url());
		const pathname = url.pathname;
		if (pathname.startsWith("/api/v1/reporting/reports/allowed-fields/")) {
			await route.fulfill(ok(["id", "name", "email", "role", "createdAt"]));
			return;
		}
		if (pathname === "/api/v1/reporting/reports") {
			await route.fulfill(ok([sampleReport]));
			return;
		}
		if (pathname === "/api/v1/reporting/schedules") {
			await route.fulfill(
				ok([
					{
						id: "schedule_smoke",
						reportId: sampleReport.id,
						frequency: "weekly",
						dayOfWeek: 1,
						dayOfMonth: null,
						timeOfDay: "08:00",
						recipients: ["owner@example.test"],
						format: "csv",
						enabled: true,
						lastRunAt: null,
						nextRunAt: auditNow(),
					},
				]),
			);
			return;
		}
		if (pathname === "/api/v1/reporting/executions") {
			await route.fulfill(ok([]));
			return;
		}
		if (pathname === "/api/v1/reporting/dashboards/main") {
			await route.fulfill(ok({ kpis: { members: 2, notifications: 6, reports: 3, apiKeys: 2 } }));
			return;
		}
		if (pathname === "/api/v1/billing/plans") {
			await route.fulfill(ok([samplePlan]));
			return;
		}
		if (pathname === "/api/v1/billing/subscription") {
			await route.fulfill(
				ok({
					subscription: {
						id: "sub_smoke",
						organizationId: "org_smoke",
						planId: "plan_pro",
						planSlug: "pro",
						status: "active",
						billingInterval: "monthly",
						currency: "ETB",
						gateway: "manual",
						currentPeriodStart: auditNow(),
						currentPeriodEnd: auditNow(),
						canceledAt: null,
						cancelAtPeriodEnd: false,
						trialEndsAt: null,
						creditBalanceMinor: 0,
					},
					plan: samplePlan,
				}),
			);
			return;
		}
		if (pathname === "/api/v1/billing/usage") {
			await route.fulfill(
				ok({
					userCount: 2,
					apiCallCount: 128,
					emailCount: 6,
					caps: { users: 25 },
					usagePct: { users: 8 },
					metrics: { reports: 3 },
				}),
			);
			return;
		}
		if (pathname === "/api/v1/billing/invoices") {
			await route.fulfill(ok([sampleInvoice], { total: 1 }));
			return;
		}
		if (pathname === "/api/v1/audit-logs") {
			await route.fulfill(
				ok(
					[
						{
							id: "audit_tenant_smoke",
							action: "settings.updated",
							resource: "organization",
							resourceId: "org_smoke",
							userId: "user_smoke",
							userEmail: "owner@example.test",
							correlationId: "corr_smoke",
							ipAddress: "203.0.113.20",
							userAgent: "Playwright",
							metadata: { field: "timezone" },
							status: "success",
							errorMessage: null,
							createdAt: auditNow(),
						},
					],
					{ total: 1 },
				),
			);
			return;
		}
		await route.fallback();
	});
}

async function installAdminAuditMocks(page) {
	await page.route("**/api/v1/**", async (route) => {
		const request = route.request();
		const url = new URL(request.url());
		const pathname = url.pathname;
		if (pathname === "/api/v1/admin/stats") {
			await route.fulfill(
				ok({
					totalOrganizations: 12,
					totalUsers: 48,
					newOrgsLast7Days: 3,
					newUsersLast7Days: 9,
					activeSessionsLast24h: 18,
				}),
			);
			return;
		}
		if (pathname === "/api/v1/admin/settings") {
			await route.fulfill(
				ok([
					{ id: "set_vat", key: "billing.vatRate", value: "15", updatedAt: auditNow() },
					{ id: "set_currency", key: "billing.currencyDefault", value: "ETB", updatedAt: auditNow() },
					{ id: "set_company", key: "platform.companyName", value: "Demo Platform", updatedAt: auditNow() },
					{ id: "set_support", key: "platform.supportEmail", value: "support@example.test", updatedAt: auditNow() },
					{ id: "set_overdue", key: "dunning.templateKey.overdue", value: "billing.overdue", updatedAt: auditNow() },
				]),
			);
			return;
		}
		if (pathname === "/api/v1/admin/system-templates") {
			await route.fulfill(
				ok([
					{
						id: "tpl_overdue",
						key: "billing.overdue",
						subject: "Invoice overdue",
						bodyHtml: "<p>Your invoice is overdue.</p>",
						subjectAm: null,
						bodyHtmlAm: null,
						variables: "invoiceNumber,totalDue",
						updatedAt: auditNow(),
					},
				]),
			);
			return;
		}
		if (pathname === "/api/v1/admin/jobs") {
			await route.fulfill(
				ok([
					{
						name: "billing.lifecycle",
						lastRun: {
							id: "run_billing",
							jobName: "billing.lifecycle",
							status: "success",
							startedAt: auditNow(),
							finishedAt: auditNow(),
							durationMs: 1200,
							summary: "Processed 2 subscriptions",
							errorMessage: null,
							triggeredByUserId: null,
						},
					},
				]),
			);
			return;
		}
		if (pathname === "/api/v1/admin/jobs/runs") {
			await route.fulfill(ok([]));
			return;
		}
		if (pathname === "/api/v1/admin/jobs/queues") {
			await route.fulfill(ok({ enabled: true, reason: null, queues: [] }));
			return;
		}
		if (pathname === "/api/v1/admin/server/overview") {
			await route.fulfill(
				ok({
					app: { name: "SaaS", nodeEnv: "development", uptimeSeconds: 3600, pid: 1234, nodeVersion: "22.17.0" },
					host: {
						platform: "win32",
						arch: "x64",
						hostname: "localhost",
						cpus: 8,
						load1m: 0.25,
						load5m: 0.2,
						load15m: 0.18,
						totalMemoryBytes: 16_000_000_000,
						freeMemoryBytes: 8_000_000_000,
					},
					process: { rssBytes: 180_000_000, heapUsedBytes: 90_000_000, heapTotalBytes: 140_000_000, externalBytes: 0 },
					http: {
						uptimeSeconds: 3600,
						totalRequests: 4200,
						totalErrors: 3,
						requestsPerSecond1m: 1.2,
						errorRate1m: 0.01,
						p50LatencyMs: 34,
						p95LatencyMs: 88,
						activeRequests: 2,
					},
					dependencies: {
						database: { ok: true, latencyMs: 12 },
						redisConfigured: false,
						stripeConfigured: false,
						chapaConfigured: true,
						storageDriver: "local",
						objectStorageConfigured: false,
					},
				}),
			);
			return;
		}
		if (pathname === "/api/v1/admin/server/resources") {
			await route.fulfill(ok({ organizations: 12, users: 48, subscriptions: 9, invoices: 32 }));
			return;
		}
		await route.fallback();
	});
}

const ok = (data, meta) => ({
	status: 200,
	contentType: "application/json",
	body: JSON.stringify(meta ? { data, meta } : { data }),
});

async function capture(page, group, name, routePath) {
	const url = `${baseURL}${routePath}`;
	const file = join(outputRoot, group, `${name}.png`);
	await mkdir(dirname(file), { recursive: true });
	const errors = [];
	page.on("pageerror", (error) => errors.push(error.message));
	console.log(`Capturing ${group}/${name} ${routePath}`);
	const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });
	await page.waitForLoadState("networkidle", { timeout: 4_000 }).catch(() => undefined);
	await page.waitForTimeout(350);
	await page.screenshot({ path: file, fullPage: true });
	const title = await page.title().catch(() => "");
	const h1 = await page.locator("h1").first().textContent({ timeout: 1000 }).catch(() => "");
	const rawI18nText = await page.evaluate(() =>
		Array.from(new Set(document.body.innerText.split(/\n+/).map((text) => text.trim()).filter(Boolean)))
			.filter((text) => /\b[a-z][a-z0-9]*(?:\.[a-zA-Z0-9_{}-]+){1,}\b/.test(text))
			.filter((text) => !text.includes("@") && !/^https?:\/\//.test(text))
			.filter((text) => !text.includes("e.g."))
			.filter((text) => !/^(platform|billing|dunning|tenant)\./.test(text))
			.slice(0, 25),
	);
	return {
		group,
		name,
		path: routePath,
		status: response?.status() ?? null,
		title,
		heading: h1?.trim() ?? "",
		screenshot: file,
		relativeScreenshot: relative(repoRoot, file),
		pageErrors: errors,
		rawI18nText,
	};
}

async function run() {
	const server = startWebServer();
	try {
		await waitForServer(baseURL);
		const mocks = await loadSmokeMocks();
		await mkdir(outputRoot, { recursive: true });

		const browser = await chromium.launch();
		const manifest = [];
		try {
			const publicPage = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
			await publicPage.route("**/api/auth/get-session", (route) =>
				route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify({ data: null }),
				}),
			);
			for (const [name, routePath] of publicRoutes) {
				manifest.push(await capture(publicPage, "public", name, routePath));
			}
			await publicPage.close();

			const tenantPage = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
			await mocks.installAuthenticatedMocks(tenantPage);
			await installTenantAuditMocks(tenantPage);
			for (const [name, routePath] of tenantRoutes) {
				manifest.push(await capture(tenantPage, "tenant", name, routePath));
			}
			await tenantPage.close();

			const adminPage = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
			await mocks.installAdminMocks(adminPage);
			await installAdminAuditMocks(adminPage);
			for (const [name, routePath] of adminRoutes) {
				manifest.push(await capture(adminPage, "admin", name, routePath));
			}
			await adminPage.close();
		} finally {
			await browser.close();
		}

		const manifestPath = join(outputRoot, "manifest.json");
		await writeFile(manifestPath, `${JSON.stringify({ baseURL, generatedAt: new Date().toISOString(), pages: manifest }, null, 2)}\n`);
		console.log(`Captured ${manifest.length} pages`);
		console.log(`Manifest: ${manifestPath}`);
		const withErrors = manifest.filter((entry) => entry.pageErrors.length > 0);
		if (withErrors.length > 0) {
			console.log("Pages with page errors:");
			for (const entry of withErrors) console.log(`- ${entry.path}: ${entry.pageErrors.join(" | ")}`);
		}
		const withRawI18n = manifest.filter((entry) => entry.rawI18nText.length > 0);
		if (withRawI18n.length > 0) {
			console.log("Pages with raw-looking i18n keys:");
			for (const entry of withRawI18n) console.log(`- ${entry.path}: ${entry.rawI18nText.join(" | ")}`);
		}
	} finally {
		await stopWebServer(server);
	}
}

run().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});

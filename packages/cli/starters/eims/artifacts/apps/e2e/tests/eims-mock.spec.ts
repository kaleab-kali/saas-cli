import { expect, type Page, type Response, test } from "@playwright/test";

const visualPauseMs = Number(process.env.EIMS_UI_VISUAL_PAUSE_MS ?? 0);

type ApiEnvelope<T> = { data: T };

type Workspace = {
	operationModeLabel: string;
	plainLanguageSummary: string;
	readiness: {
		blockers: string[];
		steps: Array<{
			label: string;
			status: string;
			tenantProvides: string[];
			actionLabel?: string;
		}>;
	};
	requiredInputs: string[];
	supportNote: string;
	alerts: Array<{ level: string; message: string }>;
};

type Overview = {
	setupProgress: Array<{ key: string; label: string; status: string }>;
	stats: {
		acceptedToday: number;
		pendingOffline: number;
		unknownSubmissions: number;
		certificatesExpiring: number;
	};
	enterprises: Array<{ tin: string; legalName: string; vatNumber: string; status: string }>;
	establishments: Array<{ name: string; code: string; subTin: string; status: string; city: string }>;
	sourceSystems: Array<{
		name: string;
		systemNumber: string;
		systemType: string;
		approvalStatus: string;
		lastAcceptedCounter: number;
	}>;
	blockers: string[];
	recentSubmissions: Submission[];
};

type Submission = {
	documentNumber: string;
	documentType: string;
	transactionType: string;
	status: string;
	irn: string | null;
	sourceSystem: string;
	establishment: string;
	totalValue: string;
	taxValue: string;
	ackDate: string | null;
	errorCode?: string;
};

type BranchHealth = {
	establishmentName: string;
	status: string;
	todayInvoices: number;
	pendingOffline: number;
	activeSources: number;
	pendingSources: number;
	alerts: string[];
};

type Buyer = {
	buyerTin: string;
	legalName: string;
	buyerType: string;
	isGovernment: boolean;
	city: string;
};

type BulkBatch = {
	conversationId: string;
	endpoint: string;
	status: string;
	submitted: number;
	accepted: number;
	failed: number;
	pending: number;
	callbackStatus: string;
	reconciliationStatus: string;
	reconciliationAfterMinutes: number;
};

type Cancellation = {
	invoiceIrn: string;
	reasonCode: string;
	reasonLabel: string;
	remark: string;
	status: string;
	limitWindow: string;
	countToday: number;
	knownLimitToday: number;
	warningThreshold: string;
};

type PrintLayout = {
	layout: string;
	paper: string;
	qrSource: string;
	requiredFields: string[];
};

type NotificationLog = {
	channel: string;
	provider: string;
	status: string;
	invoiceIrn: string;
	retryCount: number;
};

type Evidence = {
	readiness: number;
	items: Array<{ label: string; status: string }>;
};

type AcceptanceRunAll = {
	total: number;
	passed: number;
	failed: number;
	results: Array<{ caseId: string; passed: boolean; assertions: Array<{ passed: boolean }> }>;
};

type AdminOverview = {
	tenantsTotal: number;
	tenantsBlocked: number;
	acceptedToday: number;
	pendingOffline: number;
	unknownSubmissions: number;
	certificateAlerts: number;
	latestFailures: AdminFailure[];
};

type AdminTenant = {
	name: string;
	status: string;
	branches: number;
	sources: number;
	acceptedToday: number;
	pendingOffline: number;
};

type AdminFailure = {
	tenant: string;
	sourceSystem: string;
	errorCode: string;
	category: string;
	recommendedAction: string;
};

type AdminCertificate = {
	tenant: string;
	sourceSystem: string;
	validTo: string;
	status: string;
};

type AdminResources = {
	queues: Array<{ name: string; depth: number; status: string }>;
	vault: { status: string; provider: string };
	mor: { sandbox: string; production: string };
};

type AdminCompliance = {
	readiness: number;
	missing: string[];
	ready: string[];
};

function waitForJson<T>(page: Page, urlFragment: string, status = 200): Promise<T> {
	return page
		.waitForResponse((response) => response.url().includes(urlFragment) && response.status() === status)
		.then((response: Response) => response.json() as Promise<T>);
}

function waitForRequestJson<T>(page: Page, urlFragment: string): Promise<T> {
	return page
		.waitForRequest((request) => request.url().includes(urlFragment) && request.method() !== "GET")
		.then((request) => JSON.parse(request.postData() ?? "{}") as T);
}

async function gotoAndWait<T>(page: Page, path: string, urlFragment: string, heading: string): Promise<T> {
	const payloadPromise = waitForJson<T>(page, urlFragment);
	await page.goto(path, { waitUntil: "domcontentloaded" });
	const payload = await payloadPromise;
	await expect(page.getByRole("heading", { name: heading })).toBeVisible();
	if (visualPauseMs > 0) await page.waitForTimeout(visualPauseMs);
	return payload;
}

async function expectVisibleTexts(page: Page, values: Array<string | number | null | undefined>) {
	for (const value of values) {
		if (value === null || value === undefined || value === "") continue;
		const expectedText = String(value);
		await expect
			.poll(
				async () =>
					page.getByText(expectedText, { exact: false }).evaluateAll((elements) =>
						elements.some((element) => {
							const style = window.getComputedStyle(element);
							const box = element.getBoundingClientRect();
							return style.display !== "none" && style.visibility !== "hidden" && box.width > 0 && box.height > 0;
						}),
					),
				{ message: `${expectedText} should be visible` },
			)
			.toBe(true);
	}
}

async function expectRowContains(page: Page, rowAnchor: string, values: Array<string | number | null | undefined>) {
	const row = page.getByRole("row").filter({ hasText: rowAnchor }).first();
	await expect(row).toBeVisible();
	for (const value of values) {
		if (value === null || value === undefined || value === "") continue;
		const expectedText = normalizeUiText(String(value));
		await expect
			.poll(async () => normalizeUiText((await row.textContent()) ?? ""), {
				message: `row anchored by ${rowAnchor} should contain ${expectedText}`,
			})
			.toContain(expectedText);
	}
}

function normalizeUiText(value: string) {
	return value.replace(/_/g, " ").replace(/\s+/g, " ").trim();
}

function businessStatusLabel(status: string) {
	const labels: Record<string, string> = {
		accepted: "accepted",
		active: "active",
		approved: "ready",
		blocked: "blocked",
		complete: "complete",
		draft: "draft",
		error: "error",
		expires_soon: "expires soon",
		failed_retryable: "will retry",
		pending: "pending",
		pending_approval: "waiting for approval",
		pending_mor_approval: "waiting for approval",
		pending_offline: "pending sync",
		ready: "ready",
		test_ready: "test ready",
		unknown_submission: "needs review",
	};
	return labels[status.toLowerCase()] ?? normalizeUiText(status);
}

async function openSidebarIfNeeded(page: Page, navButtonName: string | RegExp) {
	const navItem = page.getByRole("button", { name: navButtonName }).first();
	if (await navItem.isVisible().catch(() => false)) return;
	await page.getByRole("button", { name: "Toggle Sidebar" }).click();
	await expect(navItem).toBeVisible();
}

async function clickNavLink(page: Page, name: string) {
	const link = page.getByRole("link", { name });
	if (
		!(await link
			.first()
			.isVisible()
			.catch(() => false))
	) {
		await page.getByRole("button", { name: "Toggle Sidebar" }).click();
		await expect(link.first()).toBeVisible();
	}
	await link.first().click();
}

async function assertNoTenantInternalLanguage(page: Page) {
	await expect(page.getByText("Run all BSP cases", { exact: false })).toHaveCount(0);
	await expect(page.getByText("Provider acceptance", { exact: false })).toHaveCount(0);
	await expect(page.getByText("MoR BSP", { exact: false })).toHaveCount(0);
	await expect(page.getByText("Sandbox", { exact: false })).toHaveCount(0);
	await expect(page.getByText("Phase 0", { exact: false })).toHaveCount(0);
	await expect(page.getByText("callback", { exact: false })).toHaveCount(0);
	await expect(page.getByText("Endpoint", { exact: false })).toHaveCount(0);
	await expect(page.getByText("Mock", { exact: false })).toHaveCount(0);
	await expect(page.getByText("mock", { exact: false })).toHaveCount(0);
}

test.describe("tenant EIMS workflow is business-facing and backend-driven", () => {
	test("authenticated landing page opens the concierge onboarding console", async ({ page }) => {
		await page.goto("/", { waitUntil: "domcontentloaded" });
		await expect(page).toHaveURL(/\/onboarding\/?$/);
		await expect(page.getByRole("heading", { name: "Launch console" })).toBeVisible();
		await expect(page.getByRole("heading", { name: "Concierge launch workflow" })).toBeVisible();
		await expect(page.getByText("MoR portal signup", { exact: false }).first()).toBeVisible();
		await expect(page.getByText("3/15 steps", { exact: false }).first()).toBeVisible();
	});

	test("tenant navigation exposes business actions, not internal compliance/source modules", async ({ page }) => {
		await page.goto("/settings", { waitUntil: "domcontentloaded" });
		await openSidebarIfNeeded(page, "Tax tools");
		await page.getByRole("button", { name: "Tax tools" }).click();

		for (const label of ["Status", "Setup", "Tax invoices", "Receipts", "Cancellations", "Records & exports"]) {
			await expect(page.getByRole("link", { name: label })).toBeVisible();
		}
		for (const hidden of [
			"Enterprises",
			"Branches",
			"MoR Sources",
			"Credentials",
			"Certificates",
			"Compliance",
			"Bulk",
		]) {
			await expect(page.getByRole("link", { name: hidden })).toHaveCount(0);
		}

		await clickNavLink(page, "Status");
		await expect(page.getByRole("heading", { name: "EIMS compliance dashboard" })).toBeVisible();
		await assertNoTenantInternalLanguage(page);
	});

	test("status page renders required tenant inputs, setup state, and invoice data", async ({ page }) => {
		const overviewPromise = waitForJson<ApiEnvelope<Overview>>(page, "/api/v1/eims/overview");
		const workspacePromise = waitForJson<ApiEnvelope<Workspace>>(page, "/api/v1/eims/workspace");
		await page.goto("/eims", { waitUntil: "domcontentloaded" });
		const overview = (await overviewPromise).data;
		const workspace = (await workspacePromise).data;

		await expect(page.getByRole("heading", { name: "EIMS compliance dashboard" })).toBeVisible();
		await expect(page.getByText("Compliance command center")).toBeVisible();
		await expect(page.getByText("Submissions this month")).toBeVisible();
		await expect(page.getByText("Failed submissions")).toBeVisible();
		await expect(page.getByText("Certificate expiry")).toBeVisible();
		await expect(page.getByText("Active source status")).toBeVisible();
		await expect(page.getByText("Cancellation rate")).toBeVisible();
		await expect(page.getByText("Buyer registry coverage")).toBeVisible();
		await expect(page.getByText("Operational launch board")).toBeVisible();
		await expect(page.getByText("15-step MoR/INSA launch timeline")).toBeVisible();
		await expect(page.getByText("First live invoice").first()).toBeVisible();
		await expectVisibleTexts(page, [workspace.operationModeLabel, workspace.plainLanguageSummary]);
		for (const requiredInput of workspace.requiredInputs) await expectVisibleTexts(page, [requiredInput]);
		await expectVisibleTexts(page, [workspace.supportNote]);
		for (const alert of workspace.alerts) await expectVisibleTexts(page, [alert.message]);

		await expectVisibleTexts(page, [
			overview.stats.acceptedToday,
			overview.stats.pendingOffline,
			overview.stats.unknownSubmissions,
			overview.stats.certificatesExpiring,
		]);
		for (const step of workspace.readiness.steps) {
			await expectVisibleTexts(page, [step.label, businessStatusLabel(step.status)]);
			for (const value of step.tenantProvides) await expectVisibleTexts(page, [value]);
			if (step.actionLabel) await expectVisibleTexts(page, [step.actionLabel]);
		}
		for (const invoice of overview.recentSubmissions) {
			await expectRowContains(page, invoice.documentNumber, [
				`${invoice.documentType} / ${invoice.transactionType}`,
				businessStatusLabel(invoice.status),
				invoice.establishment,
				`${invoice.totalValue} ETB`,
				invoice.irn ?? "Pending acceptance",
			]);
			if (invoice.status === "pending_offline") {
				expect(invoice.irn).toBeNull();
				await expectRowContains(page, invoice.documentNumber, ["Pending acceptance"]);
			}
		}
		await assertNoTenantInternalLanguage(page);
	});

	test("guided setup submits tenant-provided business, branch, source, credential, and certificate data", async ({
		page,
	}) => {
		const overviewPromise = waitForJson<ApiEnvelope<Overview>>(page, "/api/v1/eims/overview");
		const workspacePromise = waitForJson<ApiEnvelope<Workspace>>(page, "/api/v1/eims/workspace");
		const branchHealthPromise = waitForJson<ApiEnvelope<BranchHealth[]>>(page, "/api/v1/eims/branch-health");
		const buyersPromise = waitForJson<ApiEnvelope<Buyer[]>>(page, "/api/v1/eims/buyers");
		await page.goto("/eims/setup", { waitUntil: "domcontentloaded" });
		const overview = (await overviewPromise).data;
		const workspace = (await workspacePromise).data;
		const branchHealth = (await branchHealthPromise).data;
		const buyers = (await buyersPromise).data;

		await expect(page.getByRole("heading", { name: "MoR/INSA launch wizard" })).toBeVisible();
		await expect(page.getByText("EIMS six-step launch wizard", { exact: false })).toBeVisible();
		await expect(page.getByText("15-step MoR/INSA launch timeline")).toBeVisible();
		await expect(page.getByText("MoR portal signup")).toBeVisible();
		await expect(page.getByText("Authority handoff packet", { exact: false })).toBeVisible();
		await expect(page.getByText("Current staff handoff")).toBeVisible();
		await expect(page.getByText("Tenant handoff dossier")).toBeVisible();
		for (const blocker of workspace.readiness.blockers) await expectVisibleTexts(page, [blocker]);

		await page.getByRole("textbox", { name: "TIN", exact: true }).fill("0074136947");
		await page.getByLabel("Legal business name").fill("Habesha Restaurant PLC");
		const enterpriseRequest = waitForRequestJson<Record<string, unknown>>(page, "/api/v1/eims/setup/enterprises");
		const enterpriseSave = waitForJson<ApiEnvelope<{ message: string }>>(page, "/api/v1/eims/setup/enterprises", 201);
		await page.getByRole("button", { name: "Save business profile" }).click();
		expect(await enterpriseRequest).toMatchObject({
			tin: "0074136947",
			legalName: "Habesha Restaurant PLC",
			vatNumber: "REGVAT123456789",
		});
		await expectVisibleTexts(page, [(await enterpriseSave).data.message]);

		await page.getByLabel("Branch name").fill("Bole Branch");
		await page.getByLabel("Branch code").fill("BOL");
		const branchRequest = waitForRequestJson<Record<string, unknown>>(page, "/api/v1/eims/setup/establishments");
		const branchSave = waitForJson<ApiEnvelope<{ message: string }>>(page, "/api/v1/eims/setup/establishments", 201);
		await page.getByRole("button", { name: "Save branch details" }).click();
		expect(await branchRequest).toMatchObject({ name: "Bole Branch", code: "BOL", subTin: "0074136947-01" });
		await expectVisibleTexts(page, [(await branchSave).data.message]);

		await page.getByLabel("Register/POS name").fill("Front POS");
		await page.getByLabel("Register number").fill("329D03B6F0");
		const sourceRequest = waitForRequestJson<Record<string, unknown>>(page, "/api/v1/eims/setup/sources");
		const sourceSave = waitForJson<ApiEnvelope<{ message: string }>>(page, "/api/v1/eims/setup/sources", 201);
		await page.getByRole("button", { name: "Save register/POS details" }).click();
		expect(await sourceRequest).toMatchObject({ name: "Front POS", systemType: "POS", systemNumber: "329D03B6F0" });
		await expectVisibleTexts(page, [(await sourceSave).data.message]);

		await page.getByLabel("Client ID").fill("client-front-pos");
		await page.getByLabel("Username").fill("TIN0074136947");
		await page.getByLabel("API key").fill("api-key-from-mor");
		await page.getByLabel("Password").fill("secret-password");
		await page.getByLabel("Client secret").fill("secret-client");
		const credentialRequest = waitForRequestJson<Record<string, unknown>>(page, "/api/v1/eims/credentials");
		const credentialSave = waitForJson<ApiEnvelope<{ message: string }>>(page, "/api/v1/eims/credentials", 201);
		await page.getByRole("button", { name: "Save connection details" }).click();
		expect(await credentialRequest).toMatchObject({
			sourceSystemId: "src_mock_1",
			clientId: "client-front-pos",
			username: "TIN0074136947",
			apiKey: "api-key-from-mor",
		});
		await expectVisibleTexts(page, [(await credentialSave).data.message]);

		const credentialTestRequest = waitForRequestJson<Record<string, unknown>>(page, "/api/v1/eims/credentials/test");
		const credentialTest = waitForJson<ApiEnvelope<{ message: string }>>(page, "/api/v1/eims/credentials/test");
		await page.getByRole("button", { name: "Test connection" }).click();
		expect(await credentialTestRequest).toMatchObject({ sourceSystemId: "src_mock_1" });
		await expectVisibleTexts(page, [(await credentialTest).data.message]);

		const csrRequest = waitForRequestJson<Record<string, unknown>>(page, "/api/v1/eims/certificates/generate-csr");
		const csr = waitForJson<ApiEnvelope<{ message: string; reference: string }>>(
			page,
			"/api/v1/eims/certificates/generate-csr",
			201,
		);
		await page.getByRole("button", { name: "Generate certificate request" }).click();
		expect(await csrRequest).toMatchObject({ sourceSystemId: "src_mock_1" });
		const csrPayload = await csr;
		await expectVisibleTexts(page, [csrPayload.data.message, csrPayload.data.reference]);

		await page.getByLabel("Issued certificate").fill("-----BEGIN CERTIFICATE-----\\nTEST\\n-----END CERTIFICATE-----");
		const certRequest = waitForRequestJson<Record<string, unknown>>(page, "/api/v1/eims/certificates/import");
		const certImport = waitForJson<ApiEnvelope<{ message: string }>>(page, "/api/v1/eims/certificates/import", 201);
		await page.getByRole("button", { name: "Save issued certificate" }).click();
		expect(await certRequest).toMatchObject({
			sourceSystemId: "src_mock_1",
			certificatePem: expect.stringContaining("BEGIN CERTIFICATE"),
		});
		await expectVisibleTexts(page, [(await certImport).data.message]);

		for (const branch of branchHealth) {
			await expectRowContains(page, branch.establishmentName, [
				businessStatusLabel(branch.status),
				branch.todayInvoices,
				branch.pendingOffline,
				`${branch.activeSources} active / ${branch.pendingSources} pending`,
				...branch.alerts,
			]);
		}
		for (const buyer of buyers) {
			await expectRowContains(page, buyer.legalName, [
				buyer.buyerTin,
				buyer.buyerType,
				buyer.isGovernment ? "yes" : "no",
				buyer.city,
			]);
		}
		expect(overview.enterprises[0].tin).toMatch(/^\d{10}$/);
		await assertNoTenantInternalLanguage(page);
	});

	test("invoice, receipt, cancellation, batch, and export pages validate live backend payloads", async ({ page }) => {
		const submissions = await gotoAndWait<ApiEnvelope<Submission[]>>(
			page,
			"/eims/submissions",
			"/api/v1/eims/submissions",
			"Tax invoices",
		);
		for (const invoice of submissions.data) {
			await expectRowContains(page, invoice.documentNumber, [
				`${invoice.documentType} / ${invoice.transactionType}`,
				businessStatusLabel(invoice.status),
				invoice.establishment,
				`${invoice.totalValue} ETB`,
				invoice.irn ?? "Pending acceptance",
			]);
		}
		const submitPayloadPromise = waitForJson<ApiEnvelope<Submission>>(page, "/api/v1/eims/submissions", 201);
		const submitRequest = waitForRequestJson<Record<string, unknown>>(page, "/api/v1/eims/submissions");
		await page.getByRole("button", { name: "Submit invoice" }).click();
		expect(await submitRequest).toMatchObject({ documentNumber: expect.stringMatching(/^INV-SAMPLE-/) });
		const submitPayload = await submitPayloadPromise;
		expect(submitPayload.data.status).toBe("accepted");
		expect(submitPayload.data.irn).toBe("TEST-IRN-NEW");
		await expectVisibleTexts(page, [submitPayload.data.irn, submitPayload.data.totalValue]);
		await assertNoTenantInternalLanguage(page);

		const receipts = await gotoAndWait<ApiEnvelope<Array<Record<string, string | null>>>>(
			page,
			"/eims/receipts",
			"/api/v1/eims/receipts",
			"Receipts",
		);
		for (const receipt of receipts.data) {
			await expectRowContains(page, String(receipt.receiptNumber), [
				receipt.receiptType,
				businessStatusLabel(String(receipt.status)),
				receipt.paymentMode,
				receipt.paidAmount,
				receipt.rrn ?? "Pending",
			]);
		}
		const receiptRequest = waitForRequestJson<Record<string, unknown>>(page, "/api/v1/eims/receipts");
		const receiptSubmit = waitForJson<ApiEnvelope<{ message: string }>>(page, "/api/v1/eims/receipts", 201);
		await page.getByRole("button", { name: "Submit receipt" }).click();
		expect(await receiptRequest).toMatchObject({
			receiptType: "sales",
			invoiceIrn: expect.stringMatching(/^TEST-IRN-/),
			paymentMode: "CASH",
			paidAmount: "517.50",
		});
		await expectVisibleTexts(page, [(await receiptSubmit).data.message]);
		await assertNoTenantInternalLanguage(page);

		const bulkPromise = waitForJson<ApiEnvelope<BulkBatch[]>>(page, "/api/v1/eims/bulk");
		const cancellationsPromise = waitForJson<ApiEnvelope<Cancellation[]>>(page, "/api/v1/eims/cancellations");
		await page.goto("/eims/bulk", { waitUntil: "domcontentloaded" });
		await expect(page.getByRole("heading", { name: "Cancellations" })).toBeVisible();
		const bulk = (await bulkPromise).data;
		const cancellations = (await cancellationsPromise).data;
		for (const cancellation of cancellations) {
			await expectRowContains(page, cancellation.invoiceIrn, [
				`${cancellation.reasonCode} - ${cancellation.reasonLabel}`,
				cancellation.remark,
				businessStatusLabel(cancellation.status),
				`${cancellation.countToday}/${cancellation.knownLimitToday} ${cancellation.limitWindow}`,
			]);
		}
		for (const batch of bulk) {
			expect(batch.accepted + batch.failed + batch.pending).toBe(batch.submitted);
			await expectRowContains(page, batch.conversationId, [
				businessStatusLabel(batch.status),
				batch.submitted,
				batch.accepted,
				batch.failed,
				batch.pending,
			]);
		}
		const cancelSubmit = waitForJson<ApiEnvelope<{ message: string }>>(page, "/api/v1/eims/cancellations", 202);
		const cancelRequest = waitForRequestJson<Record<string, unknown>>(page, "/api/v1/eims/cancellations");
		await page.getByRole("button", { name: "Submit cancellation" }).click();
		expect(await cancelRequest).toMatchObject({
			invoiceIrn: expect.stringMatching(/^TEST-IRN-/),
			reasonCode: "4",
			remark: "Customer returned the order",
		});
		await expectVisibleTexts(page, [(await cancelSubmit).data.message]);
		const batchSubmit = waitForJson<ApiEnvelope<{ message: string }>>(page, "/api/v1/eims/bulk", 202);
		await page.getByRole("button", { name: "Start batch sync" }).click();
		await expectVisibleTexts(page, [(await batchSubmit).data.message]);
		const reconcileRequest = waitForRequestJson<Record<string, unknown>>(page, "/api/v1/eims/bulk/reconcile");
		const reconcile = waitForJson<ApiEnvelope<{ message: string }>>(page, "/api/v1/eims/bulk/reconcile", 202);
		await page.getByRole("button", { name: "Refresh first batch" }).click();
		expect(await reconcileRequest).toMatchObject({ conversationId: "TEST-CONV-20260526-001" });
		await expectVisibleTexts(page, [(await reconcile).data.message]);
		await assertNoTenantInternalLanguage(page);

		const evidencePromise = waitForJson<ApiEnvelope<Evidence>>(page, "/api/v1/eims/compliance/evidence");
		const printPromise = waitForJson<ApiEnvelope<PrintLayout[]>>(page, "/api/v1/eims/print-layouts");
		const notificationPromise = waitForJson<ApiEnvelope<NotificationLog[]>>(page, "/api/v1/eims/notifications");
		await page.goto("/eims/compliance", { waitUntil: "domcontentloaded" });
		await expect(page.getByRole("heading", { name: "Records and exports" })).toBeVisible();
		const evidence = (await evidencePromise).data;
		const printLayouts = (await printPromise).data;
		const notifications = (await notificationPromise).data;
		await expectVisibleTexts(page, [`${evidence.readiness}%`]);
		for (const item of evidence.items) await expectRowContains(page, item.label, [item.status]);
		for (const layout of printLayouts) {
			await expectRowContains(page, layout.paper, [layout.layout, layout.qrSource, layout.requiredFields.join(", ")]);
			expect(layout.qrSource).toBe("EIMS accepted signedQR only");
		}
		for (const notification of notifications) {
			await expectRowContains(page, notification.provider, [
				notification.channel,
				notification.status,
				notification.invoiceIrn,
				notification.retryCount,
			]);
		}
		const exportPayload = waitForJson<ApiEnvelope<{ message: string; reference: string }>>(
			page,
			"/api/v1/eims/compliance/evidence",
			201,
		);
		await page.getByRole("button", { name: "Generate export package" }).click();
		const exportResult = await exportPayload;
		await expectVisibleTexts(page, [exportResult.data.message, exportResult.data.reference]);
		await assertNoTenantInternalLanguage(page);
	});
});

test.describe("super-admin EIMS operations owns provider compliance and BSP evidence", () => {
	test("admin pages render tenant readiness, failures, resources, certificates, and evidence data", async ({
		page,
	}) => {
		const overview = await gotoAndWait<ApiEnvelope<AdminOverview>>(
			page,
			"/admin/eims",
			"/api/v1/admin/eims/overview",
			"Platform EIMS Operations",
		);
		await expectVisibleTexts(page, [
			overview.data.tenantsTotal,
			overview.data.tenantsBlocked,
			overview.data.acceptedToday,
			overview.data.pendingOffline,
			overview.data.unknownSubmissions,
			overview.data.certificateAlerts,
		]);
		await expect(page.getByText("MoR/INSA authority desk", { exact: false })).toBeVisible();
		await expect(page.getByText("Cross-tenant launch blockers", { exact: false })).toBeVisible();
		await expect(page.getByText("15-step EIMS launch queue", { exact: false })).toBeVisible();
		await expect(page.getByText("MoR and INSA operator timeline", { exact: false })).toBeVisible();
		for (const failure of overview.data.latestFailures) {
			await expectRowContains(page, failure.tenant, [
				failure.sourceSystem,
				failure.errorCode,
				failure.category,
				failure.recommendedAction,
			]);
		}
		const healthActionRequest = waitForRequestJson<Record<string, unknown>>(page, "/api/v1/admin/eims/actions/run");
		const healthAction = waitForJson<ApiEnvelope<{ message: string; reference: string }>>(
			page,
			"/api/v1/admin/eims/actions/run",
			202,
		);
		await page.getByRole("button", { name: "Run EIMS health check" }).click();
		expect(await healthActionRequest).toMatchObject({ action: "platform.health-check" });
		const healthActionPayload = await healthAction;
		await expectVisibleTexts(page, [healthActionPayload.data.message, healthActionPayload.data.reference]);

		const tenants = await gotoAndWait<ApiEnvelope<AdminTenant[]>>(
			page,
			"/admin/eims/tenants",
			"/api/v1/admin/eims/tenants",
			"EIMS Tenants",
		);
		for (const tenant of tenants.data) {
			await expectRowContains(page, tenant.name, [
				tenant.status,
				tenant.branches,
				tenant.sources,
				tenant.acceptedToday,
				tenant.pendingOffline,
			]);
		}
		const tenantActionRequest = waitForRequestJson<Record<string, unknown>>(page, "/api/v1/admin/eims/actions/run");
		const tenantAction = waitForJson<ApiEnvelope<{ message: string; reference: string }>>(
			page,
			"/api/v1/admin/eims/actions/run",
			202,
		);
		await page.getByRole("button", { name: "Escalate Shoa credential blocker" }).click();
		expect(await tenantActionRequest).toMatchObject({
			action: "tenant.escalate-blocker",
			targetId: "org_mock_2",
		});
		const tenantActionPayload = await tenantAction;
		await expectVisibleTexts(page, [tenantActionPayload.data.message, tenantActionPayload.data.reference]);

		const failures = await gotoAndWait<ApiEnvelope<AdminFailure[]>>(
			page,
			"/admin/eims/failures",
			"/api/v1/admin/eims/failures",
			"EIMS Failures",
		);
		for (const failure of failures.data) {
			await expectRowContains(page, failure.tenant, [
				failure.sourceSystem,
				failure.errorCode,
				failure.category,
				failure.recommendedAction,
			]);
		}
		const failureActionRequest = waitForRequestJson<Record<string, unknown>>(page, "/api/v1/admin/eims/actions/run");
		const failureAction = waitForJson<ApiEnvelope<{ message: string; reference: string }>>(
			page,
			"/api/v1/admin/eims/actions/run",
			202,
		);
		await page.getByRole("button", { name: "Mark 7015 manual review" }).click();
		expect(await failureActionRequest).toMatchObject({
			action: "failure.manual-review",
			targetId: "fail_mock_1",
		});
		const failureActionPayload = await failureAction;
		await expectVisibleTexts(page, [failureActionPayload.data.message, failureActionPayload.data.reference]);

		const certificates = await gotoAndWait<ApiEnvelope<AdminCertificate[]>>(
			page,
			"/admin/eims/certificates",
			"/api/v1/admin/eims/certificates",
			"EIMS Certificates",
		);
		for (const certificate of certificates.data) {
			await expectRowContains(page, certificate.tenant, [
				certificate.sourceSystem,
				certificate.validTo,
				certificate.status,
			]);
		}

		const resources = await gotoAndWait<ApiEnvelope<AdminResources>>(
			page,
			"/admin/eims/resources",
			"/api/v1/admin/eims/resources",
			"EIMS Resources",
		);
		for (const queue of resources.data.queues) {
			await expectRowContains(page, queue.name, [queue.depth, queue.status]);
		}
		await expectRowContains(page, "Vault", [resources.data.vault.status, resources.data.vault.provider]);
		await expectRowContains(page, "MoR test environment", [resources.data.mor.sandbox, "authority test"]);

		const compliance = await gotoAndWait<ApiEnvelope<AdminCompliance>>(
			page,
			"/admin/eims/compliance",
			"/api/v1/admin/eims/compliance",
			"EIMS Compliance",
		);
		await expectVisibleTexts(page, [`${compliance.data.readiness}%`, "Provider acceptance cases"]);
		for (const item of compliance.data.ready) await expectRowContains(page, item, ["ready"]);
		for (const item of compliance.data.missing) await expectRowContains(page, item, ["missing"]);
	});

	test("admin acceptance runner executes every provider case with data assertions", async ({ page }) => {
		const casesPromise = waitForJson<
			ApiEnvelope<Array<{ caseId: string; endpoint: string; requiredEvidence: string[] }>>
		>(page, "/api/v1/admin/eims/acceptance/cases");
		await page.goto("/admin/eims/compliance", { waitUntil: "domcontentloaded" });
		await expect(page.getByRole("heading", { name: "EIMS Compliance" })).toBeVisible();
		const cases = (await casesPromise).data;
		expect(cases.map((item) => item.caseId)).toEqual([
			"IRC-P01",
			"IRC-P02",
			"IRC-P03",
			"IRC-P04",
			"IRC-P05",
			"IRC-P06",
			"IRC-P07",
			"IRC-N08",
			"IRC-N09",
			"IRC-N010",
			"ADD-N001",
			"ADD-C001",
			"ADD-P001",
		]);
		for (const testCase of cases) {
			await expectRowContains(page, testCase.caseId, [testCase.endpoint, testCase.requiredEvidence.join(", ")]);
		}

		const runAll = waitForJson<ApiEnvelope<AcceptanceRunAll>>(page, "/api/v1/admin/eims/acceptance/run-all", 201);
		await page.getByRole("button", { name: "Run all provider cases" }).click();
		const runAllPayload = await runAll;
		expect(runAllPayload.data.total).toBe(13);
		expect(runAllPayload.data.passed).toBe(13);
		expect(runAllPayload.data.failed).toBe(0);
		expect(runAllPayload.data.results.every((result) => result.passed)).toBe(true);
		expect(runAllPayload.data.results.every((result) => result.assertions.every((assertion) => assertion.passed))).toBe(
			true,
		);
		await expectVisibleTexts(page, ["Provider acceptance suite: 13/13 passed"]);

		const singleRun = waitForJson<ApiEnvelope<{ caseId: string; passed: boolean }>>(
			page,
			"/api/v1/admin/eims/acceptance/cases/IRC-P01/run",
			201,
		);
		await page.getByRole("button", { name: "Run IRC-P01" }).click();
		const single = await singleRun;
		expect(single.data).toMatchObject({ caseId: "IRC-P01", passed: true });
		await expectVisibleTexts(page, ["IRC-P01 passed"]);
	});
});

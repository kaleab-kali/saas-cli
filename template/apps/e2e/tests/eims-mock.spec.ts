import { expect, type Page, type Response, test } from "@playwright/test";

const visualPauseMs = Number(process.env.EIMS_UI_VISUAL_PAUSE_MS ?? 0);

type ApiEnvelope<T> = { data: T };

type Overview = {
	mode: string;
	environment: string;
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

type ComplianceEvidence = {
	readiness: number;
	items: Array<{ label: string; status: string }>;
};

type AcceptanceRunAll = {
	total: number;
	passed: number;
	failed: number;
	results: Array<{
		caseId: string;
		passed: boolean;
		assertions: Array<{ name: string; passed: boolean; expected: string; actual: string }>;
		evidence: { checklistEvidence: string[] };
	}>;
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
		await expect(page.getByText(String(value), { exact: false }).first()).toBeVisible();
	}
}

async function expectRowContains(page: Page, rowAnchor: string, values: Array<string | number | null | undefined>) {
	const row = page.getByRole("row").filter({ hasText: rowAnchor }).first();
	await expect(row).toBeVisible();
	for (const value of values) {
		if (value === null || value === undefined || value === "") continue;
		await expect(row).toContainText(String(value));
	}
}

async function openSidebarIfNeeded(page: Page, navButtonName: string | RegExp) {
	const navItem = page.getByRole("button", { name: navButtonName }).first();
	if (await navItem.isVisible().catch(() => false)) return;
	await page.getByRole("button", { name: "Toggle Sidebar" }).click();
	await expect(navItem).toBeVisible();
}

async function clickNavLink(page: Page, name: string) {
	const link = page.getByRole("link", { name });
	if (!(await link.first().isVisible().catch(() => false))) {
		await page.getByRole("button", { name: "Toggle Sidebar" }).click();
		await expect(link.first()).toBeVisible();
	}
	await link.first().click();
}

test.describe("tenant EIMS UI binds exact backend mock data", () => {
	test("tenant reaches EIMS through sidebar and submits onboarding/action forms", async ({ page }) => {
		await page.goto("/settings", { waitUntil: "domcontentloaded" });
		await openSidebarIfNeeded(page, /EIMS/i);
		await page.getByRole("button", { name: /EIMS/i }).click();
		await clickNavLink(page, "Enterprises");
		await expect(page.getByRole("heading", { name: "EIMS Enterprises" })).toBeVisible();

		await page.getByLabel("TIN").fill("0074136947");
		await page.getByLabel("Legal name").fill("Habesha Restaurant PLC");
		const enterpriseSave = waitForJson<ApiEnvelope<{ message: string }>>(page, "/api/v1/eims/setup/enterprises", 201);
		await page.getByRole("button", { name: "Save enterprise profile" }).click();
		await expectVisibleTexts(page, [(await enterpriseSave).data.message]);

		await clickNavLink(page, "Branches");
		await expect(page.getByRole("heading", { name: "EIMS Establishments" })).toBeVisible();
		await page.getByLabel("Branch name").fill("Bole Branch");
		await page.getByLabel("Branch code").fill("BOL");
		const branchSave = waitForJson<ApiEnvelope<{ message: string }>>(page, "/api/v1/eims/setup/establishments", 201);
		await page.getByRole("button", { name: "Save branch" }).click();
		await expectVisibleTexts(page, [(await branchSave).data.message]);

		await clickNavLink(page, "MoR Sources");
		await expect(page.getByRole("heading", { name: "EIMS MoR Sources" })).toBeVisible();
		await page.getByLabel("Source name").fill("Front POS");
		await page.getByLabel("MoR system number").fill("329D03B6F0");
		const sourceSave = waitForJson<ApiEnvelope<{ message: string }>>(page, "/api/v1/eims/setup/sources", 201);
		await page.getByRole("button", { name: "Save MoR source reference" }).click();
		await expectVisibleTexts(page, [(await sourceSave).data.message]);

		await clickNavLink(page, "Credentials");
		await expect(page.getByRole("heading", { name: "EIMS Credentials" })).toBeVisible();
		const credentialSave = waitForJson<ApiEnvelope<{ message: string }>>(
			page,
			"/api/v1/eims/credentials/mock-save",
			201,
		);
		await page.getByRole("button", { name: "Save encrypted credential" }).click();
		await expectVisibleTexts(page, [(await credentialSave).data.message]);
		const credentialTest = waitForJson<ApiEnvelope<{ message: string }>>(
			page,
			"/api/v1/eims/credentials/mock-test",
		);
		await page.getByRole("button", { name: "Test credential" }).click();
		await expectVisibleTexts(page, [(await credentialTest).data.message]);

		await clickNavLink(page, "Certificates");
		await expect(page.getByRole("heading", { name: "EIMS Certificates" })).toBeVisible();
		const csr = waitForJson<ApiEnvelope<{ message: string; reference: string }>>(
			page,
			"/api/v1/eims/certificates/mock-generate-csr",
			201,
		);
		await page.getByRole("button", { name: "Generate Vault CSR" }).click();
		const csrPayload = await csr;
		await expectVisibleTexts(page, [csrPayload.data.message, csrPayload.data.reference]);
		const certImport = waitForJson<ApiEnvelope<{ message: string }>>(
			page,
			"/api/v1/eims/certificates/mock-import",
			201,
		);
		await page.getByRole("button", { name: "Import certificate" }).click();
		await expectVisibleTexts(page, [(await certImport).data.message]);

		await clickNavLink(page, "Receipts");
		await expect(page.getByRole("heading", { name: "EIMS Receipts" })).toBeVisible();
		const receipt = waitForJson<ApiEnvelope<{ message: string }>>(page, "/api/v1/eims/receipts/mock-submit", 201);
		await page.getByRole("button", { name: "Submit mock receipt" }).click();
		await expectVisibleTexts(page, [(await receipt).data.message]);

		await clickNavLink(page, "Bulk");
		await expect(page.getByRole("heading", { name: "EIMS Bulk" })).toBeVisible();
		const bulkSubmit = waitForJson<ApiEnvelope<{ message: string }>>(page, "/api/v1/eims/bulk/mock-submit", 202);
		await page.getByRole("button", { name: "Submit mock bulk batch" }).click();
		await expectVisibleTexts(page, [(await bulkSubmit).data.message]);
		const bulkReconcile = waitForJson<ApiEnvelope<{ message: string }>>(
			page,
			"/api/v1/eims/bulk/mock-reconcile",
			202,
		);
		await page.getByRole("button", { name: "Reconcile first conversation" }).click();
		await expectVisibleTexts(page, [(await bulkReconcile).data.message]);
		const cancellation = waitForJson<ApiEnvelope<{ message: string }>>(
			page,
			"/api/v1/eims/cancellations/mock-submit",
			202,
		);
		await page.getByRole("button", { name: "Submit cancellation" }).click();
		await expectVisibleTexts(page, [(await cancellation).data.message]);

		await clickNavLink(page, "Compliance");
		await expect(page.getByRole("heading", { name: "EIMS Compliance" })).toBeVisible();
		const runAll = waitForJson<ApiEnvelope<AcceptanceRunAll>>(page, "/api/v1/eims/acceptance/run-all", 201);
		await page.getByRole("button", { name: "Run all BSP cases" }).click();
		const runAllPayload = await runAll;
		expect(runAllPayload.data.total).toBe(13);
		expect(runAllPayload.data.failed).toBe(0);
		await expectVisibleTexts(page, [`MoR BSP mock suite: ${runAllPayload.data.passed}/${runAllPayload.data.total} passed`]);
		await expectVisibleTexts(page, ["IRC-P01", "IRC-N08", "ADD-P001"]);
		const evidence = waitForJson<ApiEnvelope<{ message: string; reference: string }>>(
			page,
			"/api/v1/eims/compliance/evidence/mock-generate",
			201,
		);
		await page.getByRole("button", { name: "Generate mock evidence package" }).click();
		const evidencePayload = await evidence;
		await expectVisibleTexts(page, [evidencePayload.data.message, evidencePayload.data.reference]);
	});

	test("overview, setup, and directories render V3 hierarchy, counters, blockers, and buyer data", async ({ page }) => {
		const overview = await gotoAndWait<ApiEnvelope<Overview>>(
			page,
			"/eims",
			"/api/v1/eims/overview",
			"EIMS Control Center",
		);
		const overviewData = overview.data;

		await expectVisibleTexts(page, [
			"Mock Mode",
			overviewData.stats.acceptedToday,
			overviewData.stats.pendingOffline,
			overviewData.stats.unknownSubmissions,
			overviewData.stats.certificatesExpiring,
		]);
		for (const step of overviewData.setupProgress) {
			await expectVisibleTexts(page, [step.label, step.status.replace(/_/g, " ")]);
		}
		for (const submission of overviewData.recentSubmissions) {
			await expectRowContains(page, submission.documentNumber, [
				`${submission.documentType} / ${submission.transactionType}`,
				submission.status,
				submission.sourceSystem,
				`${submission.totalValue} ETB`,
				submission.irn ?? "Pending EIMS acceptance",
			]);
		}

		const setupOverviewPromise = waitForJson<ApiEnvelope<Overview>>(page, "/api/v1/eims/overview");
		const branchHealthPromise = waitForJson<ApiEnvelope<BranchHealth[]>>(page, "/api/v1/eims/branch-health");
		const buyersPromise = waitForJson<ApiEnvelope<Buyer[]>>(page, "/api/v1/eims/buyers");
		await page.goto("/eims/setup", { waitUntil: "domcontentloaded" });
		await expect(page.getByRole("heading", { name: "EIMS Setup" })).toBeVisible();
		const setupOverview = (await setupOverviewPromise).data;
		const branchHealth = (await branchHealthPromise).data;
		const buyers = (await buyersPromise).data;
		for (const blocker of setupOverview.blockers) await expectVisibleTexts(page, [blocker]);
		for (const branch of branchHealth) {
			await expectRowContains(page, branch.establishmentName, [
				branch.status,
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

		const directoryPages = [
			{
				path: "/eims/enterprises",
				heading: "EIMS Enterprises",
				rows: overviewData.enterprises.map((row) => ({
					anchor: row.legalName,
					values: [row.tin, row.vatNumber, row.status],
				})),
			},
			{
				path: "/eims/establishments",
				heading: "EIMS Establishments",
				rows: overviewData.establishments.map((row) => ({
					anchor: row.name,
					values: [row.code, row.subTin, row.city, row.status],
				})),
			},
			{
				path: "/eims/sources",
				heading: "EIMS MoR Sources",
				rows: overviewData.sourceSystems.map((row) => ({
					anchor: row.name,
					values: [row.systemNumber, row.systemType, row.approvalStatus, row.lastAcceptedCounter],
				})),
			},
		];

		for (const directory of directoryPages) {
			await gotoAndWait<ApiEnvelope<Overview>>(page, directory.path, "/api/v1/eims/overview", directory.heading);
			for (const row of directory.rows) await expectRowContains(page, row.anchor, row.values);
		}
	});

	test("submissions, receipts, bulk, cancellation, print, and notification pages render exact API state", async ({
		page,
	}) => {
		const submissions = await gotoAndWait<ApiEnvelope<Submission[]>>(
			page,
			"/eims/submissions",
			"/api/v1/eims/submissions",
			"EIMS Submissions",
		);
		for (const submission of submissions.data) {
			await expectRowContains(page, submission.documentNumber, [
				`${submission.documentType} / ${submission.transactionType}`,
				submission.status,
				submission.sourceSystem,
				`${submission.totalValue} ETB`,
				submission.irn ?? "Pending EIMS acceptance",
			]);
			if (submission.status === "pending_offline") {
				expect(submission.irn).toBeNull();
				expect(submission.ackDate).toBeNull();
				await expectRowContains(page, submission.documentNumber, ["Pending EIMS acceptance"]);
			}
		}

		const submitPayloadPromise = waitForJson<ApiEnvelope<Submission>>(
			page,
			"/api/v1/eims/submissions/mock-submit",
			201,
		);
		await page.getByRole("button", { name: "Create mock accepted invoice" }).click();
		const submitPayload = await submitPayloadPromise;
		expect(submitPayload.data.status).toBe("accepted");
		expect(submitPayload.data.irn).toBe("MOCK-IRN-NEW");
		await expectVisibleTexts(page, [
			submitPayload.data.irn,
			submitPayload.data.sourceSystem,
			submitPayload.data.totalValue,
		]);

		const receipts = await gotoAndWait<ApiEnvelope<Array<Record<string, string | null>>>>(
			page,
			"/eims/receipts",
			"/api/v1/eims/receipts",
			"EIMS Receipts",
		);
		for (const receipt of receipts.data) {
			await expectRowContains(page, String(receipt.receiptNumber), [
				receipt.receiptType,
				receipt.status,
				receipt.paymentMode,
				receipt.paidAmount,
				receipt.rrn ?? "Pending",
			]);
		}

		const bulkPromise = waitForJson<ApiEnvelope<BulkBatch[]>>(page, "/api/v1/eims/bulk");
		const cancellationsPromise = waitForJson<ApiEnvelope<Cancellation[]>>(page, "/api/v1/eims/cancellations");
		await page.goto("/eims/bulk", { waitUntil: "domcontentloaded" });
		await expect(page.getByRole("heading", { name: "EIMS Bulk" })).toBeVisible();
		const bulk = (await bulkPromise).data;
		const cancellations = (await cancellationsPromise).data;
		for (const batch of bulk) {
			expect(batch.accepted + batch.failed + batch.pending).toBe(batch.submitted);
			await expectRowContains(page, batch.conversationId, [
				batch.endpoint,
				batch.status,
				batch.submitted,
				batch.accepted,
				batch.failed,
				batch.pending,
				batch.callbackStatus,
				`${batch.reconciliationStatus} after ${batch.reconciliationAfterMinutes}m`,
			]);
		}
		for (const cancellation of cancellations) {
			await expectRowContains(page, cancellation.invoiceIrn, [
				`${cancellation.reasonCode} - ${cancellation.reasonLabel}`,
				cancellation.remark,
				cancellation.status,
				`${cancellation.countToday}/${cancellation.knownLimitToday} ${cancellation.limitWindow}`,
				cancellation.warningThreshold,
			]);
		}

		const evidencePromise = waitForJson<ApiEnvelope<ComplianceEvidence>>(page, "/api/v1/eims/compliance/evidence");
		const printPromise = waitForJson<ApiEnvelope<PrintLayout[]>>(page, "/api/v1/eims/print-layouts");
		const notificationPromise = waitForJson<ApiEnvelope<NotificationLog[]>>(page, "/api/v1/eims/notifications");
		const acceptanceCasesPromise = waitForJson<ApiEnvelope<Array<{ caseId: string; endpoint: string }>>>(
			page,
			"/api/v1/eims/acceptance/cases",
		);
		await page.goto("/eims/compliance", { waitUntil: "domcontentloaded" });
		await expect(page.getByRole("heading", { name: "EIMS Compliance" })).toBeVisible();
		const evidence = (await evidencePromise).data;
		const printLayouts = (await printPromise).data;
		const notifications = (await notificationPromise).data;
		const acceptanceCases = (await acceptanceCasesPromise).data;
		for (const caseId of ["IRC-P01", "IRC-P02", "IRC-P03", "IRC-P04", "IRC-P05", "IRC-P06", "IRC-P07", "IRC-N08", "IRC-N09", "IRC-N010", "ADD-N001", "ADD-C001", "ADD-P001"]) {
			await expectVisibleTexts(page, [caseId]);
		}
		expect(acceptanceCases.map((testCase) => testCase.caseId)).toContain("IRC-P01");
		await expectVisibleTexts(page, [`${evidence.readiness}%`]);
		for (const item of evidence.items) await expectRowContains(page, item.label, [item.status]);
		for (const layout of printLayouts) {
			await expectRowContains(page, layout.paper, [layout.layout, layout.qrSource, layout.requiredFields.join(", ")]);
			expect(layout.qrSource).toBe("EIMS accepted signedQR only");
		}
		for (const notification of notifications) {
			await expectRowContains(page, notification.provider, [
				notification.channel,
				notification.provider,
				notification.status,
				notification.invoiceIrn,
				notification.retryCount,
			]);
		}
	});
});

test.describe("super-admin EIMS UI binds exact backend mock data", () => {
	test("super admin reaches every EIMS operations page through sidebar and runs visible actions", async ({ page }) => {
		await page.goto("/admin", { waitUntil: "domcontentloaded" });
		await clickNavLink(page, "EIMS Tenants");
		await expect(page.getByRole("heading", { name: "EIMS Tenants" })).toBeVisible();
		await expectVisibleTexts(page, ["Habesha Restaurants", "Shoa Supermarket", "EIMS add-on"]);
		const tenantAction = waitForJson<ApiEnvelope<{ message: string }>>(
			page,
			"/api/v1/admin/eims/actions/mock-run",
			202,
		);
		await page.getByRole("button", { name: "Review Habesha onboarding" }).click();
		await expectVisibleTexts(page, [(await tenantAction).data.message]);

		await clickNavLink(page, "EIMS Failures");
		await expect(page.getByRole("heading", { name: "EIMS Failures" })).toBeVisible();
		await expectVisibleTexts(page, ["7015", "rule_error"]);
		const failureAction = waitForJson<ApiEnvelope<{ message: string }>>(
			page,
			"/api/v1/admin/eims/actions/mock-run",
			202,
		);
		await page.getByRole("button", { name: "Mark 7015 manual review" }).click();
		await expectVisibleTexts(page, [(await failureAction).data.message]);

		await clickNavLink(page, "EIMS Certificates");
		await expect(page.getByRole("heading", { name: "EIMS Certificates" })).toBeVisible();
		const certificateAction = waitForJson<ApiEnvelope<{ message: string }>>(
			page,
			"/api/v1/admin/eims/actions/mock-run",
			202,
		);
		await page.getByRole("button", { name: "Send Habesha renewal reminder" }).click();
		await expectVisibleTexts(page, [(await certificateAction).data.message]);

		await clickNavLink(page, "EIMS Resources");
		await expect(page.getByRole("heading", { name: "EIMS Resources" })).toBeVisible();
		await expectVisibleTexts(page, ["eims:submission:src_mock_1", "Vault", "MoR sandbox"]);
		const resourceAction = waitForJson<ApiEnvelope<{ message: string }>>(
			page,
			"/api/v1/admin/eims/actions/mock-run",
			202,
		);
		await page.getByRole("button", { name: "Test Vault signer" }).click();
		await expectVisibleTexts(page, [(await resourceAction).data.message]);

		await clickNavLink(page, "EIMS Compliance");
		await expect(page.getByRole("heading", { name: "EIMS Compliance" })).toBeVisible();
		await expectVisibleTexts(page, ["Bank guarantee scanned copy", "Data residency legal opinion"]);
		const complianceAction = waitForJson<ApiEnvelope<{ message: string }>>(
			page,
			"/api/v1/admin/eims/actions/mock-run",
			202,
		);
		await page.getByRole("button", { name: "Generate platform evidence" }).click();
		await expectVisibleTexts(page, [(await complianceAction).data.message]);
	});

	test("admin operations pages render tenant readiness, failures, resources, certificates, and evidence state", async ({
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
		for (const failure of overview.data.latestFailures) {
			await expectRowContains(page, failure.tenant, [
				failure.sourceSystem,
				failure.errorCode,
				failure.category,
				failure.recommendedAction,
			]);
		}

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
		await expectRowContains(page, "MoR sandbox", [resources.data.mor.sandbox, "sandbox"]);
		await expectRowContains(page, "MoR production", [resources.data.mor.production, "production"]);

		const compliance = await gotoAndWait<ApiEnvelope<AdminCompliance>>(
			page,
			"/admin/eims/compliance",
			"/api/v1/admin/eims/compliance",
			"EIMS Compliance",
		);
		await expectVisibleTexts(page, [`${compliance.data.readiness}%`]);
		for (const item of compliance.data.ready) await expectRowContains(page, item, ["ready"]);
		for (const item of compliance.data.missing) await expectRowContains(page, item, ["missing"]);
	});
});

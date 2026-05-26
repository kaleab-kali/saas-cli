import { expect, test } from "@playwright/test";

const requiredDocumentTypes = ["INV", "CRE", "DEB", "INT", "RTN", "FIN", "MIX", "INC", "PRF", "OVD"];
const requiredTransactionTypes = ["B2B", "B2C", "B2G", "G2B", "G2C"];
const requiredSourceTypes = ["POS", "ERP", "CRM", "SYS", "MAN", "EFD"];
const requiredCancellationReasons = ["1", "2", "3", "4", "6"];
const requiredTaxCodes = ["VAT15", "VAT0", "VATEX", "TOT2", "TOT10", "EXC5", "EXC10"];
const requiredPaymentModes = ["CASH", "CHEQUE", "CPO", "Local Bank Transfer", "SWIFT", "Wire Transfer"];
const requiredUnits = ["PCS", "KG", "L", "SVC", "NT"];

test.describe("EIMS V3 backend mock API contract", () => {
	test("tenant overview exposes V3 setup hierarchy and operational state", async ({ request }) => {
		const response = await request.get("/api/v1/eims/overview");
		expect(response.status()).toBe(200);

		const body = await response.json();
		expect(body.data).toMatchObject({
			mode: "mock",
			environment: "sandbox",
			organizationId: "org_mock",
		});

		const setupKeys = body.data.setupProgress.map((step: { key: string }) => step.key);
		expect(setupKeys).toEqual(
			expect.arrayContaining(["twoFactor", "enterprise", "establishment", "source", "certificate", "phase0"]),
		);
		expect(body.data.stats).toMatchObject({
			acceptedToday: expect.any(Number),
			pendingOffline: expect.any(Number),
			unknownSubmissions: expect.any(Number),
			certificatesExpiring: expect.any(Number),
		});

		const enterprise = body.data.enterprises[0];
		expect(enterprise.tin).toMatch(/^\d{10}$/);
		expect(enterprise.legalName).toContain("PLC");
		expect(enterprise.vatNumber).toBeTruthy();

		const establishment = body.data.establishments[0];
		expect(establishment.subTin).toMatch(/^\d{10}-\d{2}$/);
		expect(establishment.code).toBe("BOL");

		const approvedSource = body.data.sourceSystems.find(
			(source: { approvalStatus: string }) => source.approvalStatus === "approved",
		);
		expect(approvedSource).toMatchObject({
			systemType: "POS",
			systemNumber: "329D03B6F0",
			lastAcceptedCounter: 128,
		});

		expect(body.data.blockers).toEqual(expect.arrayContaining(["INSA sandbox credentials not yet received"]));
	});

	test("lookup endpoints expose V3 enum values and validation metadata", async ({ request }) => {
		const documentTypes = await (await request.get("/api/v1/eims/lookups/document-types")).json();
		expect(documentTypes.version).toBe("eims-lookup-seed-v3");
		expect(documentTypes.data.map((row: { code: string }) => row.code)).toEqual(
			expect.arrayContaining(requiredDocumentTypes),
		);
		expect(documentTypes.data.find((row: { code: string }) => row.code === "CRE")).toMatchObject({
			requiresRelatedDocument: true,
		});

		const transactionTypes = await (await request.get("/api/v1/eims/lookups/transaction-types")).json();
		expect(transactionTypes.data.map((row: { code: string }) => row.code)).toEqual(
			expect.arrayContaining(requiredTransactionTypes),
		);
		expect(transactionTypes.data.find((row: { code: string }) => row.code === "B2B")).toMatchObject({
			buyerTinRequired: true,
		});
		expect(transactionTypes.data.find((row: { code: string }) => row.code === "B2C")).toMatchObject({
			buyerTinRequired: false,
		});

		const sourceTypes = await (await request.get("/api/v1/eims/lookups/source-system-types")).json();
		expect(sourceTypes.data.map((row: { code: string }) => row.code)).toEqual(
			expect.arrayContaining(requiredSourceTypes),
		);
		expect(sourceTypes.data.find((row: { code: string }) => row.code === "MAN")).toMatchObject({
			itemCodeRequired: false,
		});

		const cancellationReasons = await (await request.get("/api/v1/eims/lookups/cancellation-reasons")).json();
		expect(cancellationReasons.data.map((row: { code: string }) => row.code)).toEqual(
			expect.arrayContaining(requiredCancellationReasons),
		);
		expect(cancellationReasons.data.find((row: { code: string }) => row.code === "4")).toMatchObject({
			requiresRemark: true,
		});
		expect(cancellationReasons.data.find((row: { code: string }) => row.code === "6")).toMatchObject({
			mockObservedUnconfirmed: true,
		});

		const taxCodes = await (await request.get("/api/v1/eims/lookups/tax-codes")).json();
		expect(taxCodes.data.map((row: { code: string }) => row.code)).toEqual(expect.arrayContaining(requiredTaxCodes));
		expect(taxCodes.data.filter((row: { prefix: string }) => row.prefix === "VAT").length).toBeGreaterThanOrEqual(3);

		const paymentModes = await (await request.get("/api/v1/eims/lookups/payment-modes")).json();
		expect(paymentModes.data.map((row: { code: string }) => row.code)).toEqual(
			expect.arrayContaining(requiredPaymentModes),
		);

		const units = await (await request.get("/api/v1/eims/lookups/units")).json();
		expect(units.data.map((row: { code: string }) => row.code)).toEqual(expect.arrayContaining(requiredUnits));

		const natureOfSupply = await (await request.get("/api/v1/eims/lookups/nature-of-supply")).json();
		expect(natureOfSupply.data.map((row: { code: string }) => row.code)).toEqual(
			expect.arrayContaining(["Goods", "Service"]),
		);

		const regions = await (await request.get("/api/v1/eims/lookups/regions")).json();
		expect(regions.data.map((row: { code: string }) => row.code)).toEqual(expect.arrayContaining(["14", "15", "4"]));
	});

	test("submission API includes accepted, offline, retryable, and unknown states", async ({ request }) => {
		const response = await request.get("/api/v1/eims/submissions");
		expect(response.status()).toBe(200);

		const body = await response.json();
		const statuses = body.data.map((row: { status: string }) => row.status);
		expect(statuses).toEqual(
			expect.arrayContaining(["accepted", "pending_offline", "failed_retryable", "unknown_submission"]),
		);

		const accepted = body.data.find((row: { status: string }) => row.status === "accepted");
		expect(accepted).toMatchObject({
			documentType: "INV",
			transactionType: "B2C",
			irn: expect.stringMatching(/^MOCK-IRN-/),
			ackDate: expect.any(String),
		});
		expect(Number(accepted.totalValue)).toBeGreaterThan(0);
		expect(Number(accepted.taxValue)).toBeGreaterThan(0);

		const pendingOffline = body.data.find((row: { status: string }) => row.status === "pending_offline");
		expect(pendingOffline.irn).toBeNull();
		expect(pendingOffline.ackDate).toBeNull();

		const retryable = body.data.find((row: { status: string }) => row.status === "failed_retryable");
		expect(retryable.errorCode).toBe("67005");

		const unknown = body.data.find((row: { status: string }) => row.status === "unknown_submission");
		expect(unknown.errorCode).toBe("timeout");
	});

	test("mock invoice submission validates backend-side accepted response shape", async ({ request }) => {
		const response = await request.post("/api/v1/eims/submissions/mock-submit", {
			data: { documentNumber: "INV-API-DETAIL-001" },
		});
		expect(response.status()).toBe(201);

		const body = await response.json();
		expect(body.data).toMatchObject({
			id: "sub_mock_new",
			documentNumber: "INV-API-DETAIL-001",
			documentType: "INV",
			transactionType: "B2C",
			status: "accepted",
			irn: "MOCK-IRN-NEW",
			sourceSystem: "Front POS",
			establishment: "Bole Branch",
		});
		expect(new Date(body.data.ackDate).toString()).not.toBe("Invalid Date");
		expect(Number(body.data.totalValue)).toBeGreaterThan(Number(body.data.taxValue));
	});

	test("tenant feature APIs expose V3 operational data with sensitive values redacted", async ({ request }) => {
		const credentials = await (await request.get("/api/v1/eims/credentials")).json();
		expect(credentials.data[0]).toMatchObject({
			sourceSystem: "Front POS",
			environment: "sandbox",
			status: "tested",
			apiKeyConfigured: true,
			passwordConfigured: true,
			clientSecretConfigured: true,
			refreshTokenConfigured: true,
			tokenCache: "redis-ttl",
			secretsReturned: false,
		});
		expect(credentials.data[0]).not.toHaveProperty("apiKey");
		expect(credentials.data[0]).not.toHaveProperty("password");
		expect(credentials.data[0]).not.toHaveProperty("clientSecret");
		expect(credentials.data[0]).not.toHaveProperty("refreshToken");

		const certificates = await (await request.get("/api/v1/eims/certificates")).json();
		expect(certificates.data[0]).toMatchObject({
			sourceSystem: "Front POS",
			provider: "Vault Transit",
			csrStrategy: "vault-generated",
			keyVersion: "v1",
			status: "expires_soon",
		});
		expect(Date.parse(certificates.data[0].validTo)).not.toBeNaN();

		const branchHealth = await (await request.get("/api/v1/eims/branch-health")).json();
		expect(branchHealth.data[0]).toMatchObject({
			establishmentName: "Bole Branch",
			pendingOffline: 1,
			activeSources: 1,
			pendingSources: 1,
		});
		expect(branchHealth.data[0].alerts).toEqual(expect.arrayContaining(["Bar POS awaiting MoR approval"]));

		const buyers = await (await request.get("/api/v1/eims/buyers")).json();
		expect(buyers.data.find((buyer: { isGovernment: boolean }) => buyer.isGovernment)).toMatchObject({
			buyerTin: "0999930000",
			legalName: "Ministry of Finance",
			buyerType: "government",
		});
		expect(buyers.data.find((buyer: { buyerType: string }) => buyer.buyerType === "business")).toMatchObject({
			buyerTin: expect.stringMatching(/^\d{10}$/),
			vatNumber: expect.any(String),
		});

		const printLayouts = await (await request.get("/api/v1/eims/print-layouts")).json();
		expect(printLayouts.data.map((layout: { layout: string }) => layout.layout)).toEqual(
			expect.arrayContaining(["compact", "a4"]),
		);
		for (const layout of printLayouts.data as Array<{ qrSource: string; requiredFields: string[] }>) {
			expect(layout.qrSource).toContain("EIMS accepted");
			expect(layout.requiredFields).toEqual(expect.arrayContaining(["IRN", "QR"]));
		}

		const notifications = await (await request.get("/api/v1/eims/notifications")).json();
		expect(notifications.data.map((row: { provider: string }) => row.provider)).toEqual(
			expect.arrayContaining(["Africa's Talking", "AWS SES"]),
		);
		expect(notifications.data.find((row: { channel: string }) => row.channel === "sms")).toMatchObject({
			status: "sent",
			retryCount: 0,
		});
	});

	test("bulk and cancellation APIs expose callback, reconciliation, reason, and limit state", async ({ request }) => {
		const bulk = await (await request.get("/api/v1/eims/bulk")).json();
		expect(bulk.data[0]).toMatchObject({
			conversationId: "MOCK-CONV-20260526-001",
			endpoint: "/api/v1/bulkInvoice",
			status: "processing",
			submitted: 12,
			accepted: 10,
			failed: 1,
			pending: 1,
			callbackStatus: "awaiting_callback",
			reconciliationStatus: "scheduled",
			reconciliationAfterMinutes: 15,
		});
		expect(bulk.data[0].submitted).toBe(bulk.data[0].accepted + bulk.data[0].failed + bulk.data[0].pending);

		const cancellations = await (await request.get("/api/v1/eims/cancellations")).json();
		expect(cancellations.data[0]).toMatchObject({
			invoiceIrn: expect.stringMatching(/^MOCK-IRN-/),
			reasonCode: "4",
			reasonLabel: "Others",
			remark: expect.any(String),
			status: "accepted",
			warningThreshold: "75%",
		});
		expect(cancellations.data[0].countToday).toBeLessThan(cancellations.data[0].knownLimitToday);
	});

	test("receipt and compliance APIs expose V3 evidence details", async ({ request }) => {
		const receipts = await (await request.get("/api/v1/eims/receipts")).json();
		expect(receipts.data.map((row: { receiptType: string }) => row.receiptType)).toEqual(
			expect.arrayContaining(["sales", "withholding"]),
		);
		expect(receipts.data.find((row: { receiptType: string }) => row.receiptType === "sales")).toMatchObject({
			status: "accepted",
			invoiceIrn: expect.stringMatching(/^MOCK-IRN-/),
			rrn: expect.stringMatching(/^MOCK-RRN-/),
		});
		expect(receipts.data.find((row: { receiptType: string }) => row.receiptType === "withholding")).toMatchObject({
			status: "draft",
			rrn: null,
			paymentMode: "Local Bank Transfer",
		});

		const compliance = await (await request.get("/api/v1/eims/compliance/evidence")).json();
		expect(compliance.data.readiness).toBeGreaterThanOrEqual(70);
		expect(compliance.data.items.map((item: { key: string }) => item.key)).toEqual(
			expect.arrayContaining(["phase0-layer-a", "rls", "print"]),
		);
	});

	test("super-admin EIMS APIs expose tenant, failure, certificate, resource, and compliance data", async ({
		request,
	}) => {
		const overview = await (await request.get("/api/v1/admin/eims/overview")).json();
		expect(overview.data).toMatchObject({
			tenantsTotal: 2,
			tenantsBlocked: 1,
			unknownSubmissions: 1,
			certificateAlerts: 2,
		});
		expect(overview.data.latestFailures[0]).toMatchObject({
			errorCode: "7015",
			category: "rule_error",
			recommendedAction: expect.stringContaining("counter"),
		});

		const tenants = await (await request.get("/api/v1/admin/eims/tenants")).json();
		expect(tenants.data.map((tenant: { name: string }) => tenant.name)).toEqual(
			expect.arrayContaining(["Habesha Restaurants", "Shoa Supermarket"]),
		);
		expect(tenants.data.find((tenant: { name: string }) => tenant.name === "Shoa Supermarket")).toMatchObject({
			status: "blocked_sandbox",
			branches: 8,
			sources: 32,
		});

		const resources = await (await request.get("/api/v1/admin/eims/resources")).json();
		expect(resources.data.vault).toMatchObject({ status: "mocked", provider: "local" });
		expect(resources.data.mor).toMatchObject({ sandbox: "mocked", production: "not_configured" });
		expect(resources.data.queues.map((queue: { status: string }) => queue.status)).toEqual(
			expect.arrayContaining(["running", "paused_pending_approval"]),
		);

		const certificates = await (await request.get("/api/v1/admin/eims/certificates")).json();
		expect(certificates.data.map((cert: { status: string }) => cert.status)).toEqual(
			expect.arrayContaining(["expires_soon", "valid"]),
		);

		const compliance = await (await request.get("/api/v1/admin/eims/compliance")).json();
		expect(compliance.data.ready).toEqual(expect.arrayContaining(["V3 architecture plan"]));
		expect(compliance.data.missing).toEqual(expect.arrayContaining(["Phase 0 Layer B sandbox report"]));
	});
});

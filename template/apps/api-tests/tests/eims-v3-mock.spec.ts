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
			mode: "setup_in_progress",
			environment: "not_configured",
			organizationId: "org_mock",
		});

		const setupKeys = body.data.setupProgress.map((step: { key: string }) => step.key);
		expect(setupKeys).toEqual(
			expect.arrayContaining(["twoFactor", "enterprise", "establishment", "source", "certificate"]),
		);
		expect(setupKeys).not.toContain("sandbox");
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

		expect(body.data.blockers).toEqual(
			expect.arrayContaining([
				"MoR-approved register/POS number is missing for one register",
				"EIMS certificate and API credentials still need to be added",
			]),
		);
	});

	test("tenant workspace exposes only business-facing setup inputs", async ({ request }) => {
		const response = await request.get("/api/v1/eims/workspace");
		expect(response.status()).toBe(200);
		const body = await response.json();

		expect(body.data.operationModeLabel).toBe("Setup in progress");
		expect(body.data.requiredInputs).toEqual(
			expect.arrayContaining([
				expect.stringContaining("TIN"),
				expect.stringContaining("MoR portal-approved source"),
				expect.stringContaining("INSA-issued certificate"),
			]),
		);
		expect(body.data.platformResponsibilities).toBeUndefined();
		expect(body.data.supportNote).toContain("onboarding staff");
		expect(body.data.readiness.steps.map((step: { label: string }) => step.label)).toEqual(
			expect.arrayContaining([
				"Business tax profile",
				"Branch and address",
				"MoR-approved register/POS",
				"EIMS certificate and credentials",
			]),
		);
		expect(body.data.readiness.steps.map((step: { label: string }) => step.label)).not.toContain("Sandbox invoice test");
		expect(body.data.alerts[0].message).toContain("MoR-approved system number");
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
			irn: expect.stringMatching(/^TEST-IRN-/),
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

	test("invoice submission validates backend-side accepted response shape", async ({ request }) => {
		const response = await request.post("/api/v1/eims/submissions", {
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
			irn: "TEST-IRN-NEW",
			sourceSystem: "Front POS",
			establishment: "Bole Branch",
		});
		expect(new Date(body.data.ackDate).toString()).not.toBe("Invalid Date");
		expect(Number(body.data.totalValue)).toBeGreaterThan(Number(body.data.taxValue));
	});

	test("tenant onboarding and operations endpoints accept real form payloads", async ({ request }) => {
		const enterprise = await request.post("/api/v1/eims/setup/enterprises", {
			data: {
				tin: "0074136947",
				legalName: "Habesha Restaurant PLC",
				tradeName: "Habesha Restaurant",
				vatNumber: "REGVAT123456789",
				email: "finance@habesha.example",
				phone: "+251911000111",
			},
		});
		expect(enterprise.status()).toBe(201);
		expect(await enterprise.json()).toMatchObject({
			data: { tin: "0074136947", message: expect.stringContaining("Enterprise saved") },
		});

		const branch = await request.post("/api/v1/eims/setup/establishments", {
			data: {
				enterpriseId: "ent_mock_1",
				name: "Bole Branch",
				code: "BOL",
				subTin: "0074136947-01",
				region: "14",
				city: "Addis Ababa",
			},
		});
		expect(branch.status()).toBe(201);
		expect(await branch.json()).toMatchObject({
			data: { name: "Bole Branch", code: "BOL", message: expect.stringContaining("Branch saved") },
		});

		const source = await request.post("/api/v1/eims/setup/sources", {
			data: {
				enterpriseId: "ent_mock_1",
				establishmentId: "est_mock_1",
				name: "Front POS",
				systemType: "POS",
				systemNumber: "329D03B6F0",
				softwareVersion: "restaurant-saas-v3.0.0",
				inHouseDeveloped: true,
			},
		});
		expect(source.status()).toBe(201);
		expect(await source.json()).toMatchObject({
			data: {
				name: "Front POS",
				systemType: "POS",
				message: expect.stringContaining("Submissions remain blocked until MoR approval"),
			},
		});

		const credential = await request.post("/api/v1/eims/credentials", {
			data: {
				sourceSystemId: "src_mock_1",
				clientId: "client-front-pos",
				username: "TIN0074136947",
				apiKey: "secret",
				password: "secret",
				clientSecret: "secret",
			},
		});
		expect(credential.status()).toBe(201);
		expect(await credential.json()).toMatchObject({
			data: {
				status: "tested",
				message: expect.stringContaining("Connection details saved"),
				sourceSystemId: "src_mock_1",
				clientId: "client-front-pos",
				username: "TIN0074136947",
				secretsReturned: false,
				handledBy: "backend-repository",
			},
		});

		const credentialTest = await request.post("/api/v1/eims/credentials/test", {
			data: { sourceSystemId: "src_mock_1" },
		});
		expect(credentialTest.status()).toBe(200);
		expect(await credentialTest.json()).toMatchObject({
			data: {
				status: "success",
				message: expect.stringContaining("connection test succeeded"),
				handledBy: "backend-repository",
			},
		});

		const csr = await request.post("/api/v1/eims/certificates/generate-csr", {
			data: { sourceSystemId: "src_mock_1" },
		});
		expect(csr.status()).toBe(201);
		expect(await csr.json()).toMatchObject({
			data: {
				status: "ready",
				reference: expect.stringContaining("csr-"),
				handledBy: "backend-repository",
			},
		});

		const certificate = await request.post("/api/v1/eims/certificates/import", {
			data: {
				sourceSystemId: "src_mock_1",
				certificatePem: "-----BEGIN CERTIFICATE-----\nTEST\n-----END CERTIFICATE-----",
			},
		});
		expect(certificate.status()).toBe(201);
		expect(await certificate.json()).toMatchObject({
			data: {
				status: "valid",
				message: expect.stringContaining("Certificate imported"),
				sourceSystemId: "src_mock_1",
				certificateReceived: true,
				handledBy: "backend-repository",
			},
		});

		const receipt = await request.post("/api/v1/eims/receipts", {
			data: {
				receiptType: "withholding",
				invoiceIrn: "TEST-IRN-B2B-0002",
				paymentMode: "Local Bank Transfer",
				paidAmount: "600.00",
				withholdingType: "TWHT",
			},
		});
		expect(receipt.status()).toBe(201);
		expect(await receipt.json()).toMatchObject({
			data: {
				status: "queued",
				reference: "TEST-RRN-NEW",
				receiptType: "withholding",
				invoiceIrn: "TEST-IRN-B2B-0002",
				paymentMode: "Local Bank Transfer",
				paidAmount: "600.00",
				handledBy: "backend-repository",
			},
		});
	});

	test("tenant feature APIs expose V3 operational data with sensitive values redacted", async ({ request }) => {
		const credentials = await (await request.get("/api/v1/eims/credentials")).json();
		expect(credentials.data[0]).toMatchObject({
			sourceSystem: "Front POS",
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
			conversationId: "TEST-CONV-20260526-001",
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
			invoiceIrn: expect.stringMatching(/^TEST-IRN-/),
			reasonCode: "4",
			reasonLabel: "Others",
			remark: expect.any(String),
			status: "accepted",
			warningThreshold: "75%",
		});
		expect(cancellations.data[0].countToday).toBeLessThan(cancellations.data[0].knownLimitToday);

		const bulkSubmit = await request.post("/api/v1/eims/bulk");
		expect(bulkSubmit.status()).toBe(202);
		expect(await bulkSubmit.json()).toMatchObject({
			data: { status: "processing", reference: "TEST-CONV-NEW" },
		});

		const reconcile = await request.post("/api/v1/eims/bulk/reconcile", {
			data: { conversationId: "TEST-CONV-20260526-001" },
		});
		expect(reconcile.status()).toBe(202);
		expect(await reconcile.json()).toMatchObject({
			data: { status: "scheduled", reference: "TEST-CONV-20260526-001" },
		});

		const cancel = await request.post("/api/v1/eims/cancellations", {
			data: {
				invoiceIrn: "TEST-IRN-51fa3144ae45d2a06873a1e81c59ab74",
				reasonCode: "4",
				remark: "Customer returned the order",
			},
		});
		expect(cancel.status()).toBe(202);
		expect(await cancel.json()).toMatchObject({
			data: { status: "accepted", message: expect.stringContaining("audit event") },
		});
	});

	test("receipt and compliance APIs expose V3 evidence details", async ({ request }) => {
		const receipts = await (await request.get("/api/v1/eims/receipts")).json();
		expect(receipts.data.map((row: { receiptType: string }) => row.receiptType)).toEqual(
			expect.arrayContaining(["sales", "withholding"]),
		);
		expect(receipts.data.find((row: { receiptType: string }) => row.receiptType === "sales")).toMatchObject({
			status: "accepted",
			invoiceIrn: expect.stringMatching(/^TEST-IRN-/),
			rrn: expect.stringMatching(/^TEST-RRN-/),
		});
		expect(receipts.data.find((row: { receiptType: string }) => row.receiptType === "withholding")).toMatchObject({
			status: "draft",
			rrn: null,
			paymentMode: "Local Bank Transfer",
		});

		const compliance = await (await request.get("/api/v1/eims/compliance/evidence")).json();
		expect(compliance.data.readiness).toBeGreaterThanOrEqual(70);
		expect(compliance.data.items.map((item: { key: string }) => item.key)).toEqual(
			expect.arrayContaining(["invoices", "receipts", "cancellations", "print", "notifications"]),
		);

		const generatedEvidence = await request.post("/api/v1/eims/compliance/evidence");
		expect(generatedEvidence.status()).toBe(201);
		expect(await generatedEvidence.json()).toMatchObject({
			data: {
				status: "ready",
				reference: expect.stringContaining("eims-export"),
			},
		});
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
			status: "blocked_credentials",
			branches: 8,
			sources: 32,
		});

		const resources = await (await request.get("/api/v1/admin/eims/resources")).json();
		expect(resources.data.vault).toMatchObject({ status: "test_connector", provider: "local" });
		expect(resources.data.mor).toMatchObject({ sandbox: "pending_credentials", production: "not_configured" });
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

		const action = await request.post("/api/v1/admin/eims/actions/run", {
			data: { action: "platform.health-check", targetId: "platform" },
		});
		expect(action.status()).toBe(202);
		expect(await action.json()).toMatchObject({
			data: {
				status: "accepted",
				message: "Backend EIMS test action completed: platform.health-check",
				reference: "platform",
			},
		});
	});
});

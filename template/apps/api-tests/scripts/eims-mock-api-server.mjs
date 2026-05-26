import { createServer } from "node:http";
import { fileURLToPath } from "node:url";

const fixedNow = "2026-05-26T10:30:00.000Z";

const eimsSubmissions = [
	{
		id: "sub_mock_1",
		documentNumber: "INV-2026-000128",
		documentType: "INV",
		transactionType: "B2C",
		status: "accepted",
		irn: "MOCK-IRN-51fa3144ae45d2a06873a1e81c59ab74",
		sourceSystem: "Front POS",
		establishment: "Bole Branch",
		totalValue: "517.50",
		taxValue: "67.50",
		ackDate: fixedNow,
	},
	{
		id: "sub_mock_2",
		documentNumber: "INV-2026-000129",
		documentType: "INV",
		transactionType: "B2B",
		status: "pending_offline",
		irn: null,
		sourceSystem: "Front POS",
		establishment: "Bole Branch",
		totalValue: "3200.00",
		taxValue: "417.39",
		ackDate: null,
	},
	{
		id: "sub_mock_3",
		documentNumber: "INV-2026-000130",
		documentType: "CRE",
		transactionType: "B2C",
		status: "failed_retryable",
		irn: null,
		sourceSystem: "Front POS",
		establishment: "Bole Branch",
		totalValue: "120.00",
		taxValue: "15.65",
		ackDate: null,
		errorCode: "67005",
	},
	{
		id: "sub_mock_4",
		documentNumber: "INV-2026-000131",
		documentType: "INV",
		transactionType: "B2C",
		status: "unknown_submission",
		irn: null,
		sourceSystem: "Front POS",
		establishment: "Bole Branch",
		totalValue: "780.00",
		taxValue: "101.74",
		ackDate: null,
		errorCode: "timeout",
	},
];

const lookupSeed = {
	"document-types": [
		{ code: "INV", label: "Invoice" },
		{ code: "CRE", label: "Credit Note", requiresRelatedDocument: true },
		{ code: "DEB", label: "Debit Note", requiresRelatedDocument: true },
		{ code: "INT", label: "Interim Invoice", requiresRelatedDocument: true },
		{ code: "RTN", label: "Retainer Invoice" },
		{ code: "FIN", label: "Final Invoice", requiresRelatedDocument: true },
		{ code: "MIX", label: "Mixed Invoice" },
		{ code: "INC", label: "Intercompany Invoice" },
		{ code: "PRF", label: "Proforma Invoice" },
		{ code: "OVD", label: "Overdue Invoice" },
	],
	"transaction-types": [
		{ code: "B2B", label: "Business to Business", buyerTinRequired: true },
		{ code: "B2C", label: "Business to Consumer", buyerTinRequired: false },
		{ code: "B2G", label: "Business to Government", buyerTinRequired: true },
		{ code: "G2B", label: "Government to Business", buyerTinRequired: true },
		{ code: "G2C", label: "Government to Consumer", buyerTinRequired: false },
	],
	"source-system-types": [
		{ code: "POS", label: "Point of Sale", itemCodeRequired: true },
		{ code: "ERP", label: "Enterprise Resource Planning", itemCodeRequired: true },
		{ code: "CRM", label: "Customer Relationship Management", itemCodeRequired: true },
		{ code: "SYS", label: "System", itemCodeRequired: true },
		{ code: "MAN", label: "Manual", itemCodeRequired: false },
		{ code: "EFD", label: "Electronic Fiscal Device", itemCodeRequired: true },
	],
	"cancellation-reasons": [
		{ code: "1", label: "Duplicate" },
		{ code: "2", label: "Data entry mistake" },
		{ code: "3", label: "Order Cancelled" },
		{ code: "4", label: "Others", requiresRemark: true },
		{ code: "6", label: "Calculation Error", mockObservedUnconfirmed: true },
	],
	"tax-codes": [
		{ code: "VAT15", prefix: "VAT", rate: "15" },
		{ code: "VAT0", prefix: "VAT", rate: "0" },
		{ code: "VATEX", prefix: "VAT", rate: "0" },
		{ code: "TOT2", prefix: "TOT", rate: "2" },
		{ code: "TOT10", prefix: "TOT", rate: "10" },
		{ code: "EXC5", prefix: "EXC", rate: "5" },
		{ code: "EXC10", prefix: "EXC", rate: "10" },
	],
	"payment-modes": [
		{ code: "CASH", label: "Cash" },
		{ code: "CHEQUE", label: "Cheque" },
		{ code: "CPO", label: "CPO" },
		{ code: "Local Bank Transfer", label: "Local Bank Transfer" },
		{ code: "SWIFT", label: "SWIFT" },
		{ code: "Wire Transfer", label: "Wire Transfer" },
		{ code: "Letter of Credit", label: "Letter of Credit" },
		{ code: "Card", label: "Card" },
		{ code: "Credit", label: "Credit" },
		{ code: "Direct Transfer", label: "Direct Transfer" },
	],
	units: [
		{ code: "PCS", label: "Pieces" },
		{ code: "KG", label: "Kilogram" },
		{ code: "L", label: "Litre" },
		{ code: "SVC", label: "Service" },
		{ code: "NT", label: "Night" },
	],
	"nature-of-supply": [
		{ code: "Goods", label: "Goods" },
		{ code: "Service", label: "Service" },
	],
	regions: [
		{ code: "14", label: "Addis Ababa" },
		{ code: "15", label: "Dire Dawa" },
		{ code: "4", label: "Oromia" },
	],
};

const overview = {
	data: {
		mode: "mock",
		environment: "sandbox",
		organizationId: "org_mock",
		setupProgress: [
			{ key: "twoFactor", label: "2FA enforced for EIMS users", status: "complete" },
			{ key: "enterprise", label: "Enterprise profile", status: "complete" },
			{ key: "establishment", label: "Primary establishment and sub-TIN", status: "complete" },
			{ key: "source", label: "Source system approval", status: "attention" },
			{ key: "certificate", label: "Sandbox certificate", status: "pending" },
			{ key: "phase0", label: "Phase 0 Layer B sandbox verification", status: "blocked" },
		],
		stats: {
			acceptedToday: 1,
			pendingOffline: 1,
			unknownSubmissions: 1,
			certificatesExpiring: 1,
		},
		health: [
			{ label: "MoR sandbox", status: "mocked", detail: "Waiting for INSA sandbox credentials" },
			{ label: "Vault signing", status: "local", detail: "Layer A uses local signing until Vault is configured" },
			{ label: "Lookup registry", status: "ready", detail: "Seeded from V3 plan and configurable later" },
		],
		enterprises: [
			{
				id: "ent_mock_1",
				tin: "0074136947",
				legalName: "Habesha Restaurant PLC",
				vatNumber: "REGVAT123456789",
				status: "active",
			},
		],
		establishments: [
			{
				id: "est_mock_1",
				name: "Bole Branch",
				code: "BOL",
				subTin: "0074136947-01",
				status: "active",
				city: "Addis Ababa",
			},
		],
		sourceSystems: [
			{
				id: "src_mock_1",
				name: "Front POS",
				systemNumber: "329D03B6F0",
				systemType: "POS",
				approvalStatus: "approved",
				lastAcceptedCounter: 128,
			},
			{
				id: "src_mock_2",
				name: "Bar POS",
				systemNumber: "PENDING",
				systemType: "POS",
				approvalStatus: "pending_mor_approval",
				lastAcceptedCounter: 0,
			},
		],
		blockers: [
			"INSA sandbox credentials not yet received",
			"Calculation Error cancellation reason code 6 still needs Phase 0 confirmation",
			"Exact datetime format remains unlocked until sandbox acceptance",
		],
		recentSubmissions: eimsSubmissions,
	},
};

const receipts = {
	data: [
		{
			id: "rec_mock_1",
			receiptNumber: "RCPT-2026-00044",
			receiptType: "sales",
			withholdingType: null,
			status: "accepted",
			invoiceIrn: "MOCK-IRN-51fa3144ae45d2a06873a1e81c59ab74",
			rrn: "MOCK-RRN-00044",
			paymentMode: "CASH",
			paidAmount: "517.50",
		},
		{
			id: "rec_mock_2",
			receiptNumber: "WHT-2026-00002",
			receiptType: "withholding",
			withholdingType: "TWHT",
			status: "draft",
			invoiceIrn: "MOCK-IRN-B2B-0002",
			rrn: null,
			paymentMode: "Local Bank Transfer",
			paidAmount: "600.00",
		},
	],
};

const credentials = {
	data: [
		{
			id: "cred_mock_1",
			sourceSystem: "Front POS",
			environment: "sandbox",
			username: "TIN0074136947",
			clientId: "client-front-pos",
			status: "tested",
			lifecycle: "active",
			apiKeyConfigured: true,
			passwordConfigured: true,
			clientSecretConfigured: true,
			refreshTokenConfigured: true,
			tokenCache: "redis-ttl",
			lastTestedAt: fixedNow,
			lastTestStatus: "success",
			secretsReturned: false,
		},
	],
};

const tenantCertificates = {
	data: [
		{
			id: "cert_mock_1",
			sourceSystem: "Front POS",
			environment: "sandbox",
			provider: "Vault Transit",
			csrStrategy: "vault-generated",
			keyProvider: "local",
			keyVersion: "v1",
			signatureAlgorithm: "SHA512withRSA-unlocked",
			validFrom: "2026-05-01T00:00:00.000Z",
			validTo: "2026-07-10T00:00:00.000Z",
			status: "expires_soon",
			expiryWindow: "60 days",
		},
	],
};

const bulkBatches = {
	data: [
		{
			id: "bulk_mock_1",
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
		},
	],
};

const cancellations = {
	data: [
		{
			id: "cancel_mock_1",
			invoiceIrn: "MOCK-IRN-51fa3144ae45d2a06873a1e81c59ab74",
			reasonCode: "4",
			reasonLabel: "Others",
			remark: "Customer returned the order",
			status: "accepted",
			limitWindow: "daily",
			countToday: 3,
			knownLimitToday: 10,
			warningThreshold: "75%",
		},
	],
};

const buyers = {
	data: [
		{
			id: "buyer_mock_1",
			buyerTin: "0089238373",
			legalName: "Habesha Trading PLC",
			buyerType: "business",
			isGovernment: false,
			vatNumber: "VAT0089238373",
			city: "Addis Ababa",
			frequentBuyer: true,
		},
		{
			id: "buyer_mock_2",
			buyerTin: "0999930000",
			legalName: "Ministry of Finance",
			buyerType: "government",
			isGovernment: true,
			vatNumber: null,
			city: "Addis Ababa",
			frequentBuyer: true,
		},
	],
};

const printLayouts = {
	data: [
		{
			id: "print_compact",
			layout: "compact",
			paper: "80mm thermal",
			status: "mocked",
			requiredFields: ["IRN", "QR", "seller TIN", "document number", "total value"],
			qrSource: "EIMS accepted signedQR only",
		},
		{
			id: "print_a4",
			layout: "a4",
			paper: "A4 office printer",
			status: "mocked",
			requiredFields: ["IRN", "QR", "buyer details", "seller details", "item lines"],
			qrSource: "EIMS accepted signedQR only",
		},
	],
};

const notifications = {
	data: [
		{
			id: "notif_mock_1",
			channel: "sms",
			provider: "Africa's Talking",
			status: "sent",
			invoiceIrn: "MOCK-IRN-51fa3144ae45d2a06873a1e81c59ab74",
			retryCount: 0,
			sentAt: fixedNow,
		},
		{
			id: "notif_mock_2",
			channel: "email",
			provider: "AWS SES",
			status: "queued",
			invoiceIrn: "MOCK-IRN-B2B-0002",
			retryCount: 1,
			sentAt: null,
		},
	],
};

const branchHealth = {
	data: [
		{
			establishmentId: "est_mock_1",
			establishmentName: "Bole Branch",
			status: "attention",
			todayInvoices: 96,
			pendingOffline: 1,
			activeSources: 1,
			pendingSources: 1,
			alerts: ["Bar POS awaiting MoR approval", "Sandbox certificate expires within 60 days"],
		},
	],
};

const adminOverview = {
	data: {
		mode: "mock",
		tenantsTotal: 2,
		tenantsBlocked: 1,
		acceptedToday: 184,
		pendingOffline: 7,
		unknownSubmissions: 1,
		certificateAlerts: 2,
		latestFailures: [
			{
				id: "fail_mock_1",
				tenant: "Shoa Supermarket",
				sourceSystem: "Megenagna POS 04",
				errorCode: "7015",
				category: "rule_error",
				recommendedAction: "Verify counter sequence and PreviousIrn chain",
			},
		],
		tenants: [
			{
				id: "org_mock_1",
				name: "Habesha Restaurants",
				status: "ready",
				branches: 2,
				sources: 3,
				acceptedToday: 96,
				pendingOffline: 2,
			},
			{
				id: "org_mock_2",
				name: "Shoa Supermarket",
				status: "blocked_sandbox",
				branches: 8,
				sources: 32,
				acceptedToday: 88,
				pendingOffline: 5,
			},
		],
	},
};

const sendJson = (res, status, body) => {
	res.writeHead(status, { "content-type": "application/json" });
	res.end(JSON.stringify(body));
	return true;
};

const readJson = (req) =>
	new Promise((resolve) => {
		let raw = "";
		req.on("data", (chunk) => {
			raw += chunk;
		});
		req.on("end", () => {
			try {
				resolve(raw ? JSON.parse(raw) : {});
			} catch {
				resolve({});
			}
		});
	});

export function createEimsMockApiServer() {
	return createServer(handleMockRequest);
}

async function handleMockRequest(req, res) {
	const url = new URL(req.url ?? "/", "http://127.0.0.1");
	const path = url.pathname;

	if (handleCoreRoutes(path, res)) return;
	if (handleBillingRoutes(path, res)) return;
	if (await handleTenantEimsRoutes(req, res, path)) return;
	if (handleAdminEimsRoutes(path, res)) return;

	return sendJson(res, 404, { error: { code: "NOT_FOUND", message: "Not found" } });
}

function handleCoreRoutes(path, res) {
	if (path === "/health") return sendJson(res, 200, { status: "ok" });
	if (path === "/api/v1/notifications") {
		return sendJson(res, 200, { data: [], meta: { total: 0, unread: 0, limit: 10, offset: 0 } });
	}
	if (path === "/api/v1/error-reports") return sendJson(res, 202, { data: { accepted: true } });
	if (path === "/api/auth/get-session") {
		return sendJson(res, 200, {
			user: { id: "user_1", name: "Owner", email: "owner@example.com" },
			session: { id: "sess_1", activeOrganizationId: "org_mock" },
		});
	}
	if (path.startsWith("/api/auth/")) return sendJson(res, 200, []);
	if (path === "/api/v1/admin/auth/me") {
		return sendJson(res, 200, {
			data: {
				user: { id: "admin_1", email: "admin@example.com", name: "Super Admin" },
				session: { id: "admin_sess", expiresAt: "2027-01-01T00:00:00.000Z" },
			},
		});
	}
	return false;
}

function handleBillingRoutes(path, res) {
	if (path === "/api/v1/billing/me") {
		return sendJson(res, 200, {
			data: {
				subscription: null,
				lifecycle: null,
				entitlements: {
					"platform.file-upload": { enabled: true, limit: null },
					"reporting.custom-report-builder": { enabled: true, limit: null },
					"reporting.schedule-delivery": { enabled: true, limit: null },
				},
			},
		});
	}
	if (path === "/api/v1/billing/capabilities") return sendJson(res, 200, { data: capabilityMap() });
	return false;
}

async function handleTenantEimsRoutes(req, res, path) {
	if (path === "/api/v1/eims/overview") return sendJson(res, 200, overview);
	if (path === "/api/v1/eims/submissions") return sendJson(res, 200, { data: eimsSubmissions });
	if (path === "/api/v1/eims/submissions/mock-submit" && req.method === "POST") {
		const body = await readJson(req);
		return sendJson(res, 201, acceptedMockSubmission(body.documentNumber));
	}
	if (path === "/api/v1/eims/receipts") return sendJson(res, 200, receipts);
	if (path === "/api/v1/eims/credentials") return sendJson(res, 200, credentials);
	if (path === "/api/v1/eims/certificates") return sendJson(res, 200, tenantCertificates);
	if (path === "/api/v1/eims/bulk") return sendJson(res, 200, bulkBatches);
	if (path === "/api/v1/eims/cancellations") return sendJson(res, 200, cancellations);
	if (path === "/api/v1/eims/buyers") return sendJson(res, 200, buyers);
	if (path === "/api/v1/eims/print-layouts") return sendJson(res, 200, printLayouts);
	if (path === "/api/v1/eims/notifications") return sendJson(res, 200, notifications);
	if (path === "/api/v1/eims/branch-health") return sendJson(res, 200, branchHealth);
	if (path === "/api/v1/eims/compliance/evidence") return sendJson(res, 200, complianceEvidence());
	if (path.startsWith("/api/v1/eims/lookups/")) return sendLookup(path, res);
	return false;
}

function handleAdminEimsRoutes(path, res) {
	const adminRoutes = {
		"/api/v1/admin/eims/overview": adminOverview,
		"/api/v1/admin/eims/tenants": { data: adminOverview.data.tenants },
		"/api/v1/admin/eims/failures": { data: adminOverview.data.latestFailures },
		"/api/v1/admin/eims/certificates": adminCertificates(),
		"/api/v1/admin/eims/resources": adminResources(),
		"/api/v1/admin/eims/compliance": adminCompliance(),
	};
	if (!adminRoutes[path]) return false;
	return sendJson(res, 200, adminRoutes[path]);
}

function sendLookup(path, res) {
	const name = path.split("/").at(-1);
	const data = lookupSeed[name];
	if (!data) return sendJson(res, 404, { error: { code: "LOOKUP_NOT_FOUND", message: "Unknown EIMS lookup" } });
	return sendJson(res, 200, {
		version: "eims-lookup-seed-v3",
		updatedAt: fixedNow,
		data,
	});
}

function capabilityMap() {
	const enabledCapability = (key, label, category) => ({
		key,
		label,
		category,
		enabled: true,
		limit: null,
		used: null,
		remaining: null,
		reason: "mock enabled",
	});
	return {
		"platform.file-upload": enabledCapability("platform.file-upload", "File upload", "platform"),
		"reporting.custom-report-builder": enabledCapability(
			"reporting.custom-report-builder",
			"Custom report builder",
			"reporting",
		),
		"reporting.schedule-delivery": enabledCapability("reporting.schedule-delivery", "Schedule delivery", "reporting"),
	};
}

function acceptedMockSubmission(documentNumber) {
	return {
		data: {
			id: "sub_mock_new",
			documentNumber: documentNumber ?? "INV-MOCK-NEW",
			documentType: "INV",
			transactionType: "B2C",
			status: "accepted",
			irn: "MOCK-IRN-NEW",
			sourceSystem: "Front POS",
			establishment: "Bole Branch",
			totalValue: "517.50",
			taxValue: "67.50",
			ackDate: fixedNow,
		},
	};
}

function complianceEvidence() {
	return {
		data: {
			organizationId: "org_mock",
			generatedAt: fixedNow,
			readiness: 72,
			items: [
				{ key: "phase0-layer-a", label: "Phase 0 Layer A local report", status: "ready" },
				{ key: "rls", label: "Targeted EIMS RLS policy export", status: "planned" },
				{ key: "print", label: "Thermal and A4 print evidence", status: "mocked" },
			],
		},
	};
}

function adminCertificates() {
	return {
		data: [
			{ tenant: "Habesha Restaurants", sourceSystem: "Front POS", validTo: "2026-07-10", status: "expires_soon" },
			{ tenant: "Shoa Supermarket", sourceSystem: "Piazza POS 01", validTo: "2027-02-01", status: "valid" },
		],
	};
}

function adminResources() {
	return {
		data: {
			queues: [
				{ name: "eims:submission:src_mock_1", depth: 0, status: "running" },
				{ name: "eims:submission:src_mock_2", depth: 4, status: "paused_pending_approval" },
			],
			vault: { status: "mocked", provider: "local" },
			mor: { sandbox: "mocked", production: "not_configured" },
		},
	};
}

function adminCompliance() {
	return {
		data: {
			readiness: 68,
			missing: ["Phase 0 Layer B sandbox report", "Bank guarantee scanned copy", "Data residency legal opinion"],
			ready: [
				"V3 architecture plan",
				"Layer A local test assets",
				"Tenant onboarding runbook",
				"Targeted EIMS RLS policy export",
				"Vault operational runbook",
			],
		},
	};
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
	const port = Number(process.env.MOCK_API_PORT ?? process.env.API_TEST_MOCK_PORT ?? 3000);
	const server = createEimsMockApiServer();
	server.listen(port, "127.0.0.1", () => {
		console.log(`EIMS mock API listening on http://127.0.0.1:${port}`);
	});
}

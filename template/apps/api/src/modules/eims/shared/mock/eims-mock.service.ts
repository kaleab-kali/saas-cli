import { Injectable } from "@nestjs/common";

export interface EimsMockSubmission {
	id: string;
	documentNumber: string;
	documentType: string;
	transactionType: string;
	status: "accepted" | "pending_offline" | "failed_retryable" | "unknown_submission";
	irn: string | null;
	sourceSystem: string;
	establishment: string;
	totalValue: string;
	taxValue: string;
	ackDate: string | null;
	errorCode?: string;
}

@Injectable()
export class EimsMockService {
	private readonly now = new Date("2026-05-26T10:30:00.000+03:00").toISOString();

	tenantOverview(organizationId: string) {
		const submissions = this.submissions(organizationId).data;
		return {
			data: {
				mode: process.env.EIMS_MOCK_MODE === "false" ? "sandbox-ready" : "mock",
				environment: process.env.EIMS_ENV ?? "sandbox",
				organizationId,
				setupProgress: [
					{ key: "twoFactor", label: "2FA enforced for EIMS users", status: "complete" },
					{ key: "enterprise", label: "Enterprise profile", status: "complete" },
					{ key: "establishment", label: "Primary establishment and sub-TIN", status: "complete" },
					{ key: "source", label: "Source system approval", status: "attention" },
					{ key: "certificate", label: "Sandbox certificate", status: "pending" },
					{ key: "phase0", label: "Phase 0 Layer B sandbox verification", status: "blocked" },
				],
				stats: {
					acceptedToday: submissions.filter((s) => s.status === "accepted").length,
					pendingOffline: submissions.filter((s) => s.status === "pending_offline").length,
					unknownSubmissions: submissions.filter((s) => s.status === "unknown_submission").length,
					certificatesExpiring: 1,
				},
				health: [
					{ label: "MoR sandbox", status: "mocked", detail: "Waiting for INSA sandbox credentials" },
					{ label: "Vault signing", status: "local", detail: "Layer A uses local signing until Vault is configured" },
					{ label: "Per-source queue", status: "ready", detail: "Mock flow serializes by source system" },
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
				recentSubmissions: submissions,
			},
		};
	}

	submissions(organizationId: string) {
		return {
			data: [
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
					ackDate: this.now,
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
			] satisfies EimsMockSubmission[],
			meta: { organizationId },
		};
	}

	createMockSubmission(organizationId: string, documentNumber = "INV-MOCK-NEW") {
		const acceptedAt = new Date().toISOString();
		return {
			data: {
				id: "sub_mock_new",
				documentNumber,
				documentType: "INV",
				transactionType: "B2C",
				status: "accepted",
				irn: `MOCK-IRN-${Date.now()}`,
				sourceSystem: "Front POS",
				establishment: "Bole Branch",
				totalValue: "517.50",
				taxValue: "67.50",
				ackDate: acceptedAt,
				organizationId,
			},
		};
	}

	receipts(organizationId: string) {
		return {
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
			meta: { organizationId },
		};
	}

	credentials(organizationId: string) {
		return {
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
					lastTestedAt: this.now,
					lastTestStatus: "success",
					secretsReturned: false,
				},
			],
			meta: { organizationId },
		};
	}

	certificates(organizationId: string) {
		return {
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
			meta: { organizationId },
		};
	}

	bulkBatches(organizationId: string) {
		return {
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
			meta: { organizationId },
		};
	}

	cancellations(organizationId: string) {
		return {
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
			meta: { organizationId },
		};
	}

	buyers(organizationId: string) {
		return {
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
			meta: { organizationId },
		};
	}

	printLayouts(organizationId: string) {
		return {
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
			meta: { organizationId },
		};
	}

	notificationLogs(organizationId: string) {
		return {
			data: [
				{
					id: "notif_mock_1",
					channel: "sms",
					provider: "Africa's Talking",
					status: "sent",
					invoiceIrn: "MOCK-IRN-51fa3144ae45d2a06873a1e81c59ab74",
					retryCount: 0,
					sentAt: this.now,
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
			meta: { organizationId },
		};
	}

	branchHealth(organizationId: string) {
		return {
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
			meta: { organizationId },
		};
	}

	complianceEvidence(organizationId: string) {
		return {
			data: {
				organizationId,
				generatedAt: this.now,
				readiness: 72,
				items: [
					{ key: "phase0-layer-a", label: "Phase 0 Layer A local report", status: "ready" },
					{ key: "rls", label: "Targeted EIMS RLS policy export", status: "planned" },
					{ key: "print", label: "Thermal and A4 print evidence", status: "mocked" },
					{ key: "audit", label: "Tamper-evident audit hash-chain sample", status: "planned" },
					{ key: "dr", label: "Quarterly DR drill report", status: "planned" },
				],
			},
		};
	}

	adminOverview() {
		const tenants = this.adminTenants().data;
		return {
			data: {
				mode: process.env.EIMS_MOCK_MODE === "false" ? "sandbox-ready" : "mock",
				tenantsTotal: tenants.length,
				tenantsBlocked: tenants.filter((tenant) => tenant.status !== "ready").length,
				acceptedToday: 184,
				pendingOffline: 7,
				unknownSubmissions: 1,
				certificateAlerts: 2,
				latestFailures: this.adminFailures().data,
				tenants,
			},
		};
	}

	adminTenants() {
		return {
			data: [
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
		};
	}

	adminFailures() {
		return {
			data: [
				{
					id: "fail_mock_1",
					tenant: "Shoa Supermarket",
					sourceSystem: "Megenagna POS 04",
					errorCode: "7015",
					category: "rule_error",
					recommendedAction: "Verify counter sequence and PreviousIrn chain",
				},
				{
					id: "fail_mock_2",
					tenant: "Habesha Restaurants",
					sourceSystem: "Bar POS",
					errorCode: "67005",
					category: "retryable",
					recommendedAction: "Retry after OCSP service recovery",
				},
			],
		};
	}

	adminCertificates() {
		return {
			data: [
				{ tenant: "Habesha Restaurants", sourceSystem: "Front POS", validTo: "2026-07-10", status: "expires_soon" },
				{ tenant: "Shoa Supermarket", sourceSystem: "Piazza POS 01", validTo: "2027-02-01", status: "valid" },
			],
		};
	}

	adminResources() {
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

	adminCompliance() {
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
}

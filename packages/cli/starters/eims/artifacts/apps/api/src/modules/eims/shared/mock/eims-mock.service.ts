import { Injectable } from "@nestjs/common";
import type { EimsBackendRepository } from "./eims-backend.repository";

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
export class EimsMockService implements EimsBackendRepository {
	private readonly now = new Date("2026-05-26T10:30:00.000+03:00").toISOString();
	private readonly createdSubmissionsByOrg = new Map<string, EimsMockSubmission[]>();
	private readonly createdReceiptsByOrg = new Map<string, Array<Record<string, unknown>>>();
	private readonly createdBulkBatchesByOrg = new Map<string, Array<Record<string, unknown>>>();
	private readonly createdCancellationsByOrg = new Map<string, Array<Record<string, unknown>>>();

	tenantOverview(organizationId: string) {
		const submissions = this.submissions(organizationId).data;
		return {
			data: {
				mode: process.env.EIMS_MOCK_MODE === "false" ? "connection_ready" : "setup_in_progress",
				environment: process.env.EIMS_ENV ?? "not_configured",
				organizationId,
				setupProgress: [
					{ key: "twoFactor", label: "Account security enabled", status: "complete" },
					{ key: "enterprise", label: "Business tax profile", status: "complete" },
					{ key: "establishment", label: "Branch details", status: "complete" },
					{ key: "source", label: "Register/POS details", status: "attention" },
					{ key: "certificate", label: "Secure tax connection", status: "pending" },
				],
				stats: {
					acceptedToday: submissions.filter((s) => s.status === "accepted").length,
					pendingOffline: submissions.filter((s) => s.status === "pending_offline").length,
					unknownSubmissions: submissions.filter((s) => s.status === "unknown_submission").length,
					certificatesExpiring: 1,
				},
				health: [
					{ label: "Tax connection", status: "pending", detail: "Waiting for credentials and certificate" },
					{ label: "Certificate", status: "pending", detail: "Issued certificate required" },
					{ label: "Invoice queue", status: "ready", detail: "Ready to sync accepted sales" },
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
						active: true,
						approvalSubmittedAt: "2026-05-20T08:00:00.000Z",
						approvalDecidedAt: "2026-05-22T08:00:00.000Z",
						approvalNotes: "Approved in MoR portal",
						disabledAt: null,
						lastAcceptedCounter: 128,
					},
					{
						id: "src_mock_2",
						name: "Bar POS",
						systemNumber: "PENDING",
						systemType: "POS",
						approvalStatus: "pending_mor_approval",
						active: false,
						approvalSubmittedAt: "2026-05-23T08:00:00.000Z",
						approvalDecidedAt: null,
						approvalNotes: "Waiting for MoR approval",
						disabledAt: null,
						lastAcceptedCounter: 0,
					},
				],
				blockers: ["Bar POS awaiting MoR approval", "EIMS certificate and API credentials still need to be added"],
				recentSubmissions: submissions,
			},
		};
	}

	tenantWorkspace(organizationId: string) {
		const overview = this.tenantOverview(organizationId).data;
		return {
			data: {
				organizationId,
				operationModeLabel: overview.mode === "connection_ready" ? "Connection ready" : "Setup in progress",
				plainLanguageSummary:
					"Complete tax setup once. After that, normal sales, receipts, cancellations, prints, and exports can sync automatically.",
				readiness: {
					readyForLive: false,
					blockers: overview.blockers,
					steps: [
						{
							key: "business-profile",
							label: "Business tax profile",
							status: "complete",
							tenantProvides: [
								"TIN",
								"Legal business name",
								"VAT number if VAT registered",
								"Business contact phone/email",
							],
							actionLabel: "Save business profile",
						},
						{
							key: "branch-profile",
							label: "Branch and address",
							status: "complete",
							tenantProvides: ["Branch name", "Region/city/woreda/kebele", "Branch Sub-TIN when available"],
							actionLabel: "Save branch details",
						},
						{
							key: "register-pos",
							label: "Register/POS details",
							status: "attention",
							tenantProvides: ["Register number", "Register type such as POS or ERP"],
							actionLabel: "Save register/POS details",
						},
						{
							key: "secure-connection",
							label: "Secure tax connection",
							status: "pending",
							tenantProvides: ["API credentials", "Issued certificate or certificate request file"],
							actionLabel: "Save connection details",
						},
					],
				},
				requiredInputs: [
					"TIN, legal name, VAT number, and contact information",
					"Branch address and branch Sub-TIN when available",
					"Register/POS number",
					"API credentials and issued certificate",
				],
				supportNote:
					"If the tenant does not have these yet, onboarding staff can help collect the details during setup.",
				primaryActions: [
					{ label: "Continue guided setup", href: "/eims/setup" },
					{ label: "Review tax invoices", href: "/eims/submissions" },
					{ label: "Record receipt", href: "/eims/receipts" },
					{ label: "Cancel an invoice", href: "/eims/bulk" },
					{ label: "Export records", href: "/eims/compliance" },
				],
				alerts: [
					{ level: "next step", message: "Add the register/POS number for one register." },
					{ level: "note", message: "Pending invoices receive a final tax reference after acceptance." },
				],
			},
		};
	}

	submissions(organizationId: string) {
		const created = this.createdSubmissionsByOrg.get(organizationId) ?? [];
		return {
			data: [
				...created,
				{
					id: "sub_mock_1",
					documentNumber: "INV-2026-000128",
					documentType: "INV",
					transactionType: "B2C",
					status: "accepted",
					irn: "IRN-51fa3144ae45d2a06873a1e81c59ab74",
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

	createAcceptedSubmission(organizationId: string, documentNumber = "INV-SAMPLE-NEW") {
		const acceptedAt = new Date().toISOString();
		const created: EimsMockSubmission = {
			id: `sub_${Date.now()}`,
			documentNumber,
			documentType: "INV",
			transactionType: "B2C",
			status: "accepted",
			irn: `IRN-${Date.now()}`,
			sourceSystem: "Front POS",
			establishment: "Bole Branch",
			totalValue: "517.50",
			taxValue: "67.50",
			ackDate: acceptedAt,
		};
		this.createdSubmissionsByOrg.set(organizationId, [
			created,
			...(this.createdSubmissionsByOrg.get(organizationId) ?? []),
		]);
		return { data: { ...created, organizationId } };
	}

	receipts(organizationId: string) {
		const created = this.createdReceiptsByOrg.get(organizationId) ?? [];
		return {
			data: [
				...created,
				{
					id: "rec_mock_1",
					receiptNumber: "RCPT-2026-00044",
					receiptType: "sales",
					withholdingType: null,
					status: "accepted",
					invoiceIrn: "IRN-51fa3144ae45d2a06873a1e81c59ab74",
					rrn: "RRN-00044",
					paymentMode: "CASH",
					paidAmount: "517.50",
				},
				{
					id: "rec_mock_2",
					receiptNumber: "WHT-2026-00002",
					receiptType: "withholding",
					withholdingType: "TWHT",
					status: "draft",
					invoiceIrn: "IRN-B2B-0002",
					rrn: null,
					paymentMode: "Local Bank Transfer",
					paidAmount: "600.00",
				},
			],
			meta: { organizationId },
		};
	}

	createAcceptedReceipt(organizationId: string, input: Record<string, unknown>) {
		const payload = (input.payload ?? {}) as Record<string, unknown>;
		const created = {
			id: `rec_${Date.now()}`,
			receiptNumber: String(input.receiptNumber ?? `RCPT-${Date.now()}`),
			receiptType: String(payload.receiptType ?? "sales"),
			withholdingType: payload.withholdingType ?? null,
			status: "accepted",
			invoiceIrn: String(payload.invoiceIrn ?? "IRN-51fa3144ae45d2a06873a1e81c59ab74"),
			rrn: `RRN-${Date.now()}`,
			paymentMode: String(payload.paymentMode ?? "CASH"),
			paidAmount: String(payload.paidAmount ?? "0.00"),
			handledBy: "backend-external-client",
		};
		this.createdReceiptsByOrg.set(organizationId, [created, ...(this.createdReceiptsByOrg.get(organizationId) ?? [])]);
		return { data: created };
	}

	credentials(organizationId: string) {
		return {
			data: [
				{
					id: "cred_mock_1",
					sourceSystem: "Front POS",
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

	saveCredential(organizationId: string, body: Record<string, unknown>) {
		return {
			data: {
				message: "Connection details saved",
				status: "tested",
				reference: `cred-${organizationId}-test`,
				sourceSystemId: body.sourceSystemId,
				clientId: body.clientId,
				username: body.username,
				apiKeyConfigured: body.apiKeyConfigured === true,
				passwordConfigured: body.passwordConfigured === true,
				clientSecretConfigured: body.clientSecretConfigured === true,
				refreshTokenConfigured: body.refreshTokenConfigured === true,
				secretsReturned: false,
				handledBy: "backend-repository",
			},
		};
	}

	testCredential(organizationId: string, sourceSystemId?: string) {
		return {
			data: {
				message: "Connection test succeeded",
				status: "success",
				reference: `${organizationId}:${sourceSystemId ?? "register"}:token`,
				sourceSystemId,
				handledBy: "backend-repository",
			},
		};
	}

	certificates(organizationId: string) {
		return {
			data: [
				{
					id: "cert_mock_1",
					sourceSystem: "Front POS",
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

	generateCsr(organizationId: string, sourceSystemId?: string) {
		return {
			data: {
				message: "Certificate request file generated",
				status: "ready",
				reference: `certificate-request-${organizationId}-${sourceSystemId ?? "register"}-v1.pem`,
				sourceSystemId,
				handledBy: "backend-repository",
			},
		};
	}

	importCertificate(organizationId: string, body: Record<string, unknown>) {
		return {
			data: {
				message: "Certificate saved",
				status: "valid",
				reference: `cert-${organizationId}-test`,
				sourceSystemId: body.sourceSystemId,
				certificateReceived: typeof body.certificatePem === "string" && body.certificatePem.length > 0,
				handledBy: "backend-repository",
			},
		};
	}

	bulkBatches(organizationId: string) {
		const created = this.createdBulkBatchesByOrg.get(organizationId) ?? [];
		return {
			data: [
				...created,
				{
					id: "bulk_mock_1",
					conversationId: "BATCH-20260526-001",
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

	submitBulk(organizationId: string) {
		const created = {
			id: `bulk_${Date.now()}`,
			conversationId: `BATCH-${Date.now()}`,
			endpoint: "/api/v1/bulkInvoice",
			status: "processing",
			submitted: 1,
			accepted: 0,
			failed: 0,
			pending: 1,
			callbackStatus: "awaiting_processing",
			reconciliationStatus: "scheduled",
			reconciliationAfterMinutes: 15,
		};
		this.createdBulkBatchesByOrg.set(organizationId, [
			created,
			...(this.createdBulkBatchesByOrg.get(organizationId) ?? []),
		]);
		return {
			data: {
				...created,
				message: "Batch sync started and batch ID stored",
				reference: created.conversationId,
			},
		};
	}

	reconcileBulk(organizationId: string, conversationId?: string) {
		return {
			data: {
				message: "Batch status refresh scheduled",
				status: "scheduled",
				reference: conversationId ?? `BATCH-${organizationId}`,
			},
		};
	}

	cancellations(organizationId: string) {
		const created = this.createdCancellationsByOrg.get(organizationId) ?? [];
		return {
			data: [
				...created,
				{
					id: "cancel_mock_1",
					invoiceIrn: "IRN-51fa3144ae45d2a06873a1e81c59ab74",
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

	cancelInvoice(organizationId: string, body: Record<string, unknown>) {
		const blocked = body.reasonCode === "4" && !body.remark;
		if (!blocked) {
			const created = {
				id: `cancel_${Date.now()}`,
				invoiceIrn: String(body.invoiceIrn ?? "IRN-UNKNOWN"),
				reasonCode: String(body.reasonCode ?? "4"),
				reasonLabel: body.reasonCode === "4" ? "Others" : "Configured reason",
				remark: String(body.remark ?? ""),
				status: "accepted",
				limitWindow: "daily",
				countToday: 4,
				knownLimitToday: 10,
				warningThreshold: "75%",
			};
			this.createdCancellationsByOrg.set(organizationId, [
				created,
				...(this.createdCancellationsByOrg.get(organizationId) ?? []),
			]);
		}
		return {
			data: {
				message: blocked
					? "Reason code 4 requires a remark before submission"
					: "Cancellation submitted with reason and audit event",
				status: blocked ? "blocked" : "accepted",
				reference: `${organizationId}:${String(body.invoiceIrn ?? "irn")}`,
			},
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
					status: "test_ready",
					requiredFields: ["Tax reference", "QR", "seller TIN", "document number", "total value"],
					qrSource: "Accepted invoice response only",
				},
				{
					id: "print_a4",
					layout: "a4",
					paper: "A4 office printer",
					status: "test_ready",
					requiredFields: ["Tax reference", "QR", "buyer details", "seller details", "item lines"],
					qrSource: "Accepted invoice response only",
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
					invoiceIrn: "IRN-51fa3144ae45d2a06873a1e81c59ab74",
					retryCount: 0,
					sentAt: this.now,
				},
				{
					id: "notif_mock_2",
					channel: "email",
					provider: "AWS SES",
					status: "queued",
					invoiceIrn: "IRN-B2B-0002",
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
					alerts: ["Bar POS waiting for its register number", "Certificate expires within 60 days"],
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
					{ key: "invoices", label: "Tax invoice records", status: "ready" },
					{ key: "receipts", label: "Receipt records", status: "ready" },
					{ key: "cancellations", label: "Cancellation records", status: "ready" },
					{ key: "print", label: "Printable receipt layouts", status: "test_ready" },
					{ key: "notifications", label: "Buyer notification history", status: "ready" },
				],
			},
		};
	}

	generateEvidence(organizationId: string) {
		return {
			data: {
				message: "Encrypted tenant export package manifest generated",
				status: "ready",
				reference: `eims-export-${organizationId}-20260527.zip`,
			},
		};
	}

	adminOverview() {
		const tenants = this.adminTenants().data;
		return {
			data: {
				mode: process.env.EIMS_MOCK_MODE === "false" ? "sandbox-ready" : "backend-test-connector",
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
					status: "blocked_credentials",
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
				vault: { status: "test_connector", provider: "local" },
				mor: { sandbox: "pending_credentials", production: "not_configured" },
			},
		};
	}

	adminCompliance() {
		return {
			data: {
				readiness: 68,
				missing: [
					"Controlled authority test evidence report",
					"Bank guarantee scanned copy",
					"Data residency legal opinion",
				],
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

	adminRunAction(action: string, targetId?: string) {
		return {
			data: {
				message: `Backend EIMS test action completed: ${action}`,
				status: "accepted",
				reference: targetId ?? "platform",
			},
		};
	}
}

import { createServer } from "node:http";
import { fileURLToPath } from "node:url";

const fixedNow = "2026-05-26T10:30:00.000Z";

const teamMembers = [
	{
		id: "mem_owner",
		role: "owner",
		createdAt: "2026-01-10T08:00:00.000Z",
		user: { id: "user_owner", name: "Owner User", email: "owner@example.com" },
	},
	{
		id: "mem_admin",
		role: "admin",
		createdAt: "2026-02-12T08:00:00.000Z",
		user: { id: "user_admin", name: "Operations Admin", email: "ops@example.com" },
	},
];
const teamInvitations = [
	{
		id: "inv_seed",
		email: "pending@example.com",
		role: "member",
		status: "pending",
		expiresAt: "2026-06-26T10:30:00.000Z",
		acceptUrl: "http://localhost:5173/settings/members?invitationId=inv_seed",
	},
];
let organizationSettings = {
	id: "org_settings_mock",
	organizationId: "org_mock",
	timezone: "Africa/Addis_Ababa",
	currency: "ETB",
	dateFormat: "yyyy-MM-dd",
	fiscalYearStartMonth: 7,
	invoiceNumberPrefix: "INV",
	invoiceNumberPadding: 5,
	companyEmail: "finance@example.com",
	companyPhone: "+251911000000",
	companyAddress: "Bole, Addis Ababa",
	taxId: "0074136947",
	logoUrl: "",
	primaryColor: "#2563eb",
	emailFooter: "Thank you for your business.",
	createdAt: fixedNow,
	updatedAt: fixedNow,
};
let securitySettings = {
	id: "security_settings_mock",
	organizationId: "org_mock",
	passwordMinLength: 10,
	passwordRequireUpper: true,
	passwordRequireLower: true,
	passwordRequireDigit: true,
	passwordRequireSymbol: true,
	passwordMaxAgeDays: 90,
	sessionTimeoutMinutes: 60,
	force2fa: false,
	ipAllowlist: "",
	createdAt: fixedNow,
	updatedAt: fixedNow,
};
const adminUsers = [
	{
		id: "admin_user_1",
		name: "Owner User",
		email: "owner@example.com",
		emailVerified: true,
		createdAt: "2026-01-10T08:00:00.000Z",
		organizations: [{ id: "org_mock", name: "Acme Restaurant", role: "owner" }],
	},
	{
		id: "admin_user_2",
		name: "Branch Manager",
		email: "manager@example.com",
		emailVerified: false,
		createdAt: "2026-02-15T08:00:00.000Z",
		organizations: [{ id: "org_mock", name: "Acme Restaurant", role: "admin" }],
	},
	{
		id: "admin_user_3",
		name: "Unassigned User",
		email: "unassigned@example.com",
		emailVerified: true,
		createdAt: "2026-03-20T08:00:00.000Z",
		organizations: [],
	},
];
const platformSettings = [
	{ key: "billing.vatRate", value: "15" },
	{ key: "billing.vatEnabled", value: "true" },
	{ key: "billing.currencyDefault", value: "ETB" },
	{ key: "billing.invoicePrefix", value: "PF-INV" },
	{ key: "billing.invoiceYearReset", value: "true" },
	{ key: "billing.paymentDueDays", value: "7" },
	{ key: "billing.gracePeriodDays", value: "7" },
	{ key: "billing.readOnlyPeriodDays", value: "14" },
	{ key: "billing.lockoutAfterDays", value: "30" },
	{ key: "billing.reminderSchedule", value: "[-7,-3,0,7]" },
	{ key: "billing.autoSendInvoice", value: "true" },
	{ key: "billing.autoGenerateRenewalInvoice", value: "true" },
	{ key: "billing.chapaEnabled", value: "false" },
	{ key: "billing.manualPaymentMethods", value: "[\"bank_transfer\",\"telebirr\",\"cash\"]" },
	{ key: "platform.companyName", value: "Vyllion SaaS" },
	{ key: "platform.companyAddress", value: "Addis Ababa" },
	{ key: "platform.companyTin", value: "0074136947" },
	{ key: "platform.supportEmail", value: "support@example.com" },
	{ key: "platform.supportPhone", value: "+251911000000" },
	{ key: "platform.dunningFromEmail", value: "billing@example.com" },
	{ key: "dunning.templateKey.reminder", value: "billing.reminder" },
	{ key: "dunning.templateKey.overdue", value: "billing.overdue" },
	{ key: "dunning.templateKey.grace", value: "billing.grace" },
	{ key: "dunning.templateKey.readOnly", value: "billing.read_only" },
	{ key: "dunning.templateKey.locked", value: "billing.locked" },
	{ key: "dunning.templateKey.renewal", value: "billing.renewal" },
].map((setting, index) => ({ id: `platform_setting_${index + 1}`, updatedAt: fixedNow, ...setting }));
const featureFlags = [
	{ id: "ff_1", name: "eims.enabled", description: "Enable EIMS tax tools", enabledGlobal: true },
	{ id: "ff_2", name: "billing.chapa", description: "Enable Chapa payments", enabledGlobal: false },
];

const eimsSubmissions = [
	{
		id: "sub_mock_1",
		documentNumber: "INV-2026-000128",
		documentType: "INV",
		transactionType: "B2C",
		status: "accepted",
		irn: "TEST-IRN-51fa3144ae45d2a06873a1e81c59ab74",
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
		mode: "setup_in_progress",
		environment: "not_configured",
		organizationId: "org_mock",
		setupProgress: [
			{ key: "twoFactor", label: "Account security enabled", status: "complete" },
			{ key: "enterprise", label: "Business tax profile", status: "complete" },
			{ key: "establishment", label: "Branch details", status: "complete" },
			{ key: "source", label: "MoR-approved register/POS reference", status: "attention" },
			{ key: "certificate", label: "EIMS certificate and credentials", status: "pending" },
		],
		stats: {
			acceptedToday: 1,
			pendingOffline: 1,
			unknownSubmissions: 1,
			certificatesExpiring: 1,
		},
		health: [
			{ label: "MoR connection", status: "pending", detail: "Waiting for credentials and certificate" },
			{ label: "Certificate", status: "pending", detail: "INSA-issued certificate required" },
			{ label: "Invoice queue", status: "ready", detail: "Serialized per MoR-approved register/POS" },
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
			"MoR-approved register/POS number is missing for one register",
			"EIMS certificate and API credentials still need to be added",
		],
		recentSubmissions: eimsSubmissions,
	},
};

const tenantWorkspace = {
	data: {
		organizationId: "org_mock",
		operationModeLabel: "Setup in progress",
		plainLanguageSummary:
			"Complete the business tax setup once. After that, your normal sales, receipts, cancellations, prints, and exports can use EIMS automatically.",
		readiness: {
			readyForLive: false,
			blockers: overview.data.blockers,
			steps: [
				{
					key: "business-profile",
					label: "Business tax profile",
					status: "complete",
					tenantProvides: ["TIN", "Legal business name", "VAT number if VAT registered", "Business contact phone/email"],
					actionLabel: "Save business profile",
				},
				{
					key: "branch-profile",
					label: "Branch and address",
					status: "complete",
					tenantProvides: ["Branch name", "Region/city/woreda/kebele", "Sub-TIN when MoR issues one"],
					actionLabel: "Save branch details",
				},
				{
					key: "mor-source",
					label: "MoR-approved register/POS",
					status: "attention",
					tenantProvides: ["MoR portal-approved system number", "Source type such as POS or ERP"],
					actionLabel: "Save register/POS reference",
				},
				{
					key: "secure-connection",
					label: "EIMS certificate and credentials",
					status: "pending",
					tenantProvides: ["MoR API credentials", "INSA-issued certificate or CSR result"],
					actionLabel: "Save connection details",
				},
			],
		},
		requiredInputs: [
			"TIN, legal name, VAT number, and contact information",
			"Branch address and Sub-TIN when MoR issues one",
			"MoR portal-approved source/register number",
			"MoR API credentials and INSA-issued certificate",
		],
		supportNote: "If the tenant does not have these yet, onboarding staff can guide them through the MoR portal and INSA certificate request.",
		primaryActions: [
			{ label: "Continue guided setup", href: "/eims/setup" },
			{ label: "Review tax invoices", href: "/eims/submissions" },
			{ label: "Record receipt", href: "/eims/receipts" },
			{ label: "Cancel an invoice", href: "/eims/bulk" },
			{ label: "Export records", href: "/eims/compliance" },
		],
		alerts: [
			{ level: "warning", message: "One register is waiting for its MoR-approved system number." },
			{ level: "info", message: "Invoices waiting for sync do not show an official IRN or QR until EIMS accepts them." },
		],
	},
};

const acceptanceCases = [
	{
		caseId: "IRC-P01",
		type: "positive",
		title: "Register B2C Sales Invoice Without Buyer TIN and With VAT",
		operation: "invoice.register",
		method: "POST",
		endpoint: "/v1/register",
		sourceDocument: "MoR_BSP_Master.docx",
		sourceSection: "Table 2, IRC-P01",
		requiredEvidence: ["accepted IRN", "signed QR", "thermal print", "A4 print", "mobile QR scan"],
		requiredAssertions: ["B2C", "BuyerDetails.Tin null", "VAT0/VAT15/VATEX", "IRN", "QR"],
	},
	{
		caseId: "IRC-P02",
		type: "positive",
		title: "Register B2B Sales Invoice With Buyer TIN and Legal Name",
		operation: "invoice.register",
		method: "POST",
		endpoint: "/v1/register",
		sourceDocument: "MoR_BSP_Master.docx",
		sourceSection: "Table 3, IRC-P02",
		requiredEvidence: ["accepted IRN", "signed QR", "A4 print", "withholding values", "buyer TIN validation"],
		requiredAssertions: ["B2B", "buyer TIN 10 digits", "withholding", "IRN", "buyer print details"],
	},
	{
		caseId: "IRC-P03",
		type: "positive",
		title: "Register Sales Receipt From Registered Invoice",
		operation: "receipt.sales",
		method: "POST",
		endpoint: "/v1/receipt/sales",
		sourceDocument: "MoR_BSP_Master.docx",
		sourceSection: "IRC-P03",
		requiredEvidence: ["invoice IRN", "RRN", "signed receipt QR", "payment mode"],
		requiredAssertions: ["accepted invoice", "RRN exists", "payment coverage full"],
	},
	{
		caseId: "IRC-P04",
		type: "positive",
		title: "Register Withhold Receipt From Registered Invoice",
		operation: "receipt.withholding",
		method: "POST",
		endpoint: "/v1/receipt/withholding",
		sourceDocument: "MoR_BSP_Master.docx",
		sourceSection: "IRC-P04",
		requiredEvidence: ["invoice IRN", "withholding type", "rate", "withholding amount", "RRN"],
		requiredAssertions: ["TWHT", "amount > 0", "RRN exists"],
	},
	{
		caseId: "IRC-P05",
		type: "positive",
		title: "Cancel Registered Invoice",
		operation: "invoice.cancel",
		method: "POST",
		endpoint: "/v1/cancel",
		sourceDocument: "MoR_BSP_Master.docx",
		sourceSection: "IRC-P05",
		requiredEvidence: ["invoice IRN", "reason code", "remark", "audit event"],
		requiredAssertions: ["valid reason", "remark for reason 4", "cancelled"],
	},
	{
		caseId: "IRC-P06",
		type: "positive",
		title: "Register Credit Memo From Registered Invoice",
		operation: "invoice.register",
		method: "POST",
		endpoint: "/v1/register",
		sourceDocument: "MoR_BSP_Master.docx",
		sourceSection: "IRC-P06",
		requiredEvidence: ["original IRN", "related document", "reason", "credit note IRN"],
		requiredAssertions: ["CRE", "RelatedDocument", "Reason", "IRN"],
	},
	{
		caseId: "IRC-P07",
		type: "positive",
		title: "Register Debit Memo From Registered Invoice",
		operation: "invoice.register",
		method: "POST",
		endpoint: "/v1/register",
		sourceDocument: "MoR_BSP_Master.docx",
		sourceSection: "IRC-P07",
		requiredEvidence: ["original IRN", "related document", "reason", "debit note IRN"],
		requiredAssertions: ["DEB", "RelatedDocument", "Reason", "IRN"],
	},
	{
		caseId: "IRC-N08",
		type: "negative",
		title: "Reject B2B Sales Invoice With Invalid Buyer TIN or Legal Name",
		operation: "invoice.register",
		method: "POST",
		endpoint: "/v1/register",
		sourceDocument: "MoR_BSP_Master.docx",
		sourceSection: "IRC-N08",
		requiredEvidence: ["invalid buyer payload", "validation error", "no IRN issued"],
		requiredAssertions: ["B2B", "invalid buyer", "error", "no IRN"],
	},
	{
		caseId: "IRC-N09",
		type: "negative",
		title: "Reject Receipt From Non-existent or Cancelled Invoice",
		operation: "receipt.sales",
		method: "POST",
		endpoint: "/v1/receipt/sales",
		sourceDocument: "MoR_BSP_Master.docx",
		sourceSection: "IRC-N09",
		requiredEvidence: ["bad invoice IRN", "receipt rejection", "no RRN issued"],
		requiredAssertions: ["inactive IRN", "error", "no RRN"],
	},
	{
		caseId: "IRC-N010",
		type: "negative",
		title: "Reject Cancellation of Non-existent or Already Cancelled Invoice",
		operation: "invoice.cancel",
		method: "POST",
		endpoint: "/v1/cancel",
		sourceDocument: "MoR_BSP_Master.docx",
		sourceSection: "IRC-N010",
		requiredEvidence: ["bad/cancelled IRN", "rejection response", "audit event"],
		requiredAssertions: ["inactive IRN", "error", "status unchanged"],
	},
	{
		caseId: "ADD-N001",
		type: "additional",
		title: "Notification Service Evidence",
		operation: "notification.send",
		method: "POST",
		endpoint: "/internal/notifications",
		sourceDocument: "MoR_BSP_Master.docx",
		sourceSection: "ADD-N001",
		requiredEvidence: ["SMS log", "email log", "provider response", "retry policy"],
		requiredAssertions: ["SMS", "email", "non-blocking"],
	},
	{
		caseId: "ADD-C001",
		type: "additional",
		title: "Setup and Configuration Evidence",
		operation: "setup.validate",
		method: "GET",
		endpoint: "/api/v1/eims/overview",
		sourceDocument: "MoR_BSP_Master.docx",
		sourceSection: "ADD-C001",
		requiredEvidence: ["enterprise profile", "establishment profile", "MoR source number", "credential test", "certificate status"],
		requiredAssertions: ["TIN", "Sub-TIN", "source number", "credential test"],
	},
	{
		caseId: "ADD-P001",
		type: "additional",
		title: "Printing Layout and Content Evidence",
		operation: "print.validate",
		method: "GET",
		endpoint: "/api/v1/eims/print-layouts",
		sourceDocument: "MoR_BSP_Master.docx",
		sourceSection: "ADD-P001",
		requiredEvidence: ["thermal print sample", "A4 print sample", "QR scan result", "mandatory field checklist"],
		requiredAssertions: ["compact", "a4", "official QR only"],
	},
];

const receipts = {
	data: [
		{
			id: "rec_mock_1",
			receiptNumber: "RCPT-2026-00044",
			receiptType: "sales",
			withholdingType: null,
			status: "accepted",
			invoiceIrn: "TEST-IRN-51fa3144ae45d2a06873a1e81c59ab74",
			rrn: "TEST-RRN-00044",
			paymentMode: "CASH",
			paidAmount: "517.50",
		},
		{
			id: "rec_mock_2",
			receiptNumber: "WHT-2026-00002",
			receiptType: "withholding",
			withholdingType: "TWHT",
			status: "draft",
			invoiceIrn: "TEST-IRN-B2B-0002",
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
		},
	],
};

const cancellations = {
	data: [
		{
			id: "cancel_mock_1",
			invoiceIrn: "TEST-IRN-51fa3144ae45d2a06873a1e81c59ab74",
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
			status: "test_ready",
			requiredFields: ["IRN", "QR", "seller TIN", "document number", "total value"],
			qrSource: "EIMS accepted signedQR only",
		},
		{
			id: "print_a4",
			layout: "a4",
			paper: "A4 office printer",
			status: "test_ready",
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
			invoiceIrn: "TEST-IRN-51fa3144ae45d2a06873a1e81c59ab74",
			retryCount: 0,
			sentAt: fixedNow,
		},
		{
			id: "notif_mock_2",
			channel: "email",
			provider: "AWS SES",
			status: "queued",
			invoiceIrn: "TEST-IRN-B2B-0002",
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
			alerts: ["Bar POS awaiting MoR approval", "Certificate expires within 60 days"],
		},
	],
};

const adminOverview = {
	data: {
		mode: "backend-test-connector",
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
				status: "blocked_credentials",
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
	if (await handleScaffoldManagementRoutes(req, res, url, path)) return;
	if (await handleTenantEimsRoutes(req, res, path)) return;
	if (await handleAdminEimsRoutes(req, res, path)) return;

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

async function handleScaffoldManagementRoutes(req, res, url, path) {
	if (path === "/api/v1/team/members" && req.method === "GET") {
		return sendJson(res, 200, { data: teamMembers });
	}
	if (path === "/api/v1/team/invitations" && req.method === "GET") {
		return sendJson(res, 200, { data: teamInvitations });
	}
	if (path === "/api/v1/team/invitations" && req.method === "POST") {
		const body = await readJson(req);
		const invitation = {
			id: `inv_${teamInvitations.length + 1}`,
			email: body.email,
			role: body.role ?? "member",
			status: "pending",
			expiresAt: "2026-06-26T10:30:00.000Z",
			acceptUrl: `http://localhost:5173/settings/members?invitationId=inv_${teamInvitations.length + 1}`,
		};
		teamInvitations.push(invitation);
		return sendJson(res, 201, { data: invitation });
	}
	if (path.startsWith("/api/v1/team/invitations/") && req.method === "DELETE") {
		const id = path.split("/").pop();
		const index = teamInvitations.findIndex((invitation) => invitation.id === id);
		if (index === -1) return sendJson(res, 404, { error: { message: "Invitation not found" } });
		const [deleted] = teamInvitations.splice(index, 1);
		return sendJson(res, 200, { data: deleted });
	}
	if (path.startsWith("/api/v1/team/members/") && req.method === "PATCH") {
		const id = path.split("/").pop();
		const body = await readJson(req);
		const member = teamMembers.find((item) => item.id === id);
		if (!member) return sendJson(res, 404, { error: { message: "Member not found" } });
		if (member.role === "owner" && body.role !== "owner") {
			return sendJson(res, 400, { error: { message: "Cannot demote the last owner" } });
		}
		member.role = body.role;
		return sendJson(res, 200, { data: member });
	}
	if (path.startsWith("/api/v1/team/members/") && req.method === "DELETE") {
		const id = path.split("/").pop();
		const member = teamMembers.find((item) => item.id === id);
		if (!member) return sendJson(res, 404, { error: { message: "Member not found" } });
		if (member.role === "owner") return sendJson(res, 400, { error: { message: "Cannot remove the last owner" } });
		return sendJson(res, 200, { data: member });
	}
	if (path === "/api/v1/organization-settings" && req.method === "GET") {
		return sendJson(res, 200, { data: organizationSettings });
	}
	if (path === "/api/v1/organization-settings" && req.method === "PATCH") {
		const body = await readJson(req);
		organizationSettings = { ...organizationSettings, ...body, updatedAt: fixedNow };
		return sendJson(res, 200, { data: organizationSettings });
	}
	if (path === "/api/v1/security-settings" && req.method === "GET") {
		return sendJson(res, 200, { data: securitySettings });
	}
	if (path === "/api/v1/security-settings" && req.method === "PATCH") {
		const body = await readJson(req);
		securitySettings = { ...securitySettings, ...body, updatedAt: fixedNow };
		return sendJson(res, 200, { data: securitySettings });
	}
	if (path === "/api/v1/admin/users" && req.method === "GET") {
		const search = url.searchParams.get("search")?.toLowerCase().trim();
		const data = search
			? adminUsers.filter(
					(user) => user.name.toLowerCase().includes(search) || user.email.toLowerCase().includes(search),
				)
			: adminUsers;
		return sendJson(res, 200, { data });
	}
	if (path.endsWith("/force-password-reset") && path.startsWith("/api/v1/admin/users/") && req.method === "POST") {
		const id = path.split("/").at(-2);
		const user = adminUsers.find((item) => item.id === id);
		if (!user) return sendJson(res, 404, { error: { message: "User not found" } });
		return sendJson(res, 200, { data: { userId: id, sessionsRevoked: 2, resetEmailQueued: true } });
	}
	if (path.endsWith("/impersonate") && path.startsWith("/api/v1/admin/users/") && req.method === "GET") {
		res.writeHead(302, { location: "/dashboard" });
		res.end();
		return true;
	}
	if (path === "/api/v1/admin/settings" && req.method === "GET") {
		return sendJson(res, 200, { data: platformSettings });
	}
	if (path === "/api/v1/admin/settings/feature-flags" && req.method === "GET") {
		return sendJson(res, 200, { data: featureFlags });
	}
	if (path.startsWith("/api/v1/admin/settings/") && req.method === "PUT") {
		const key = decodeURIComponent(path.slice("/api/v1/admin/settings/".length));
		const body = await readJson(req);
		const setting = platformSettings.find((item) => item.key === key);
		if (!setting) return sendJson(res, 404, { error: { message: "Setting not found" } });
		setting.value = body.value;
		setting.updatedAt = fixedNow;
		return sendJson(res, 200, { data: setting });
	}
	return false;
}

async function handleTenantEimsRoutes(req, res, path) {
	if (path === "/api/v1/eims/overview") return sendJson(res, 200, overview);
	if (path === "/api/v1/eims/workspace") return sendJson(res, 200, tenantWorkspace);
	if (path === "/api/v1/eims/setup/enterprises" && req.method === "POST") {
		const body = await readJson(req);
		return sendJson(res, 201, {
			data: {
				...body,
				id: "ent_mock_created",
				message: `Enterprise saved for TIN ${body.tin ?? "unknown"}`,
				status: "draft",
			},
		});
	}
	if (path === "/api/v1/eims/setup/establishments" && req.method === "POST") {
		const body = await readJson(req);
		return sendJson(res, 201, {
			data: {
				...body,
				id: "est_mock_created",
				message: `Branch saved: ${body.name ?? "branch"}`,
				status: "draft",
			},
		});
	}
	if (path === "/api/v1/eims/setup/sources" && req.method === "POST") {
		const body = await readJson(req);
		return sendJson(res, 201, {
			data: {
				...body,
				id: "src_mock_created",
				message: `Source system saved: ${body.name ?? "source"}. Submissions remain blocked until MoR approval.`,
				status: "draft",
			},
		});
	}
	if (path === "/api/v1/eims/submissions" && req.method === "GET") return sendJson(res, 200, { data: eimsSubmissions });
	if (
		(path === "/api/v1/eims/submissions" || path === "/api/v1/eims/submissions/mock-submit") &&
		req.method === "POST"
	) {
		const body = await readJson(req);
		return sendJson(res, 201, acceptedMockSubmission(body.documentNumber));
	}
	if (path === "/api/v1/eims/receipts" && req.method === "GET") return sendJson(res, 200, receipts);
	if ((path === "/api/v1/eims/receipts" || path === "/api/v1/eims/receipts/mock-submit") && req.method === "POST") {
		const body = await readJson(req);
		return sendJson(res, 201, {
			data: {
				message: `${body.receiptType ?? "sales"} receipt queued for EIMS test submission`,
				status: "queued",
				reference: "TEST-RRN-NEW",
				receiptType: body.receiptType,
				invoiceIrn: body.invoiceIrn,
				paymentMode: body.paymentMode,
				paidAmount: body.paidAmount,
				handledBy: "backend-repository",
			},
		});
	}
	if (path === "/api/v1/eims/credentials" && req.method === "GET") return sendJson(res, 200, credentials);
	if ((path === "/api/v1/eims/credentials" || path === "/api/v1/eims/credentials/mock-save") && req.method === "POST") {
		const body = await readJson(req);
		return sendJson(res, 201, {
			data: {
				message: `Connection details saved for ${body.sourceSystemId ?? "source"}`,
				status: "tested",
				reference: "cred-test-created",
				sourceSystemId: body.sourceSystemId,
				clientId: body.clientId,
				username: body.username,
				secretsReturned: false,
				handledBy: "backend-repository",
			},
		});
	}
	if (
		(path === "/api/v1/eims/credentials/test" || path === "/api/v1/eims/credentials/mock-test") &&
		req.method === "POST"
	) {
		return sendJson(res, 200, {
			data: {
				message: "EIMS connection test succeeded",
				status: "success",
				reference: "eims:token:src_test_1",
				handledBy: "backend-repository",
			},
		});
	}
	if (path === "/api/v1/eims/certificates") return sendJson(res, 200, tenantCertificates);
	if (
		(path === "/api/v1/eims/certificates/generate-csr" || path === "/api/v1/eims/certificates/mock-generate-csr") &&
		req.method === "POST"
	) {
		return sendJson(res, 201, {
			data: {
				message: "Vault CSR generated for INSA submission",
				status: "ready",
				reference: "csr-org-test-src-test-1-v1.pem",
				handledBy: "backend-repository",
			},
		});
	}
	if (
		(path === "/api/v1/eims/certificates/import" || path === "/api/v1/eims/certificates/mock-import") &&
		req.method === "POST"
	) {
		const body = await readJson(req);
		return sendJson(res, 201, {
			data: {
				message: "Certificate imported for source",
				status: "valid",
				reference: "cert-org-test-src-test-1",
				sourceSystemId: body.sourceSystemId,
				certificateReceived: typeof body.certificatePem === "string" && body.certificatePem.length > 0,
				handledBy: "backend-repository",
			},
		});
	}
	if (path === "/api/v1/eims/bulk" && req.method === "GET") return sendJson(res, 200, bulkBatches);
	if ((path === "/api/v1/eims/bulk" || path === "/api/v1/eims/bulk/mock-submit") && req.method === "POST") {
		return sendJson(res, 202, {
			data: {
				message: "Batch sync started and batch ID stored",
				status: "processing",
				reference: "TEST-CONV-NEW",
			},
		});
	}
	if ((path === "/api/v1/eims/bulk/reconcile" || path === "/api/v1/eims/bulk/mock-reconcile") && req.method === "POST") {
		const body = await readJson(req);
		return sendJson(res, 202, {
			data: {
				message: "Batch status refresh scheduled",
				status: "scheduled",
				reference: body.conversationId ?? "TEST-CONV-UNKNOWN",
			},
		});
	}
	if (path === "/api/v1/eims/cancellations" && req.method === "GET") return sendJson(res, 200, cancellations);
	if (
		(path === "/api/v1/eims/cancellations" || path === "/api/v1/eims/cancellations/mock-submit") &&
		req.method === "POST"
	) {
		const body = await readJson(req);
		const missingRemark = body.reasonCode === "4" && !body.remark;
		return sendJson(res, missingRemark ? 422 : 202, {
			data: {
				message: missingRemark
					? "Reason code 4 requires a remark before submission"
					: "Cancellation submitted with reason and audit event",
				status: missingRemark ? "blocked" : "accepted",
				reference: body.invoiceIrn ?? "TEST-IRN",
			},
		});
	}
	if (path === "/api/v1/eims/buyers") return sendJson(res, 200, buyers);
	if (path === "/api/v1/eims/print-layouts") return sendJson(res, 200, printLayouts);
	if (path === "/api/v1/eims/notifications") return sendJson(res, 200, notifications);
	if (path === "/api/v1/eims/branch-health") return sendJson(res, 200, branchHealth);
	if (path === "/api/v1/eims/compliance/evidence" && req.method === "GET") return sendJson(res, 200, complianceEvidence());
	if (
		(path === "/api/v1/eims/compliance/evidence" || path === "/api/v1/eims/compliance/evidence/mock-generate") &&
		req.method === "POST"
	) {
		return sendJson(res, 201, {
			data: {
				message: "Encrypted tenant export package manifest generated",
				status: "ready",
				reference: "eims-export-org-test-20260527.zip",
			},
		});
	}
	if (path.startsWith("/api/v1/eims/lookups/")) return sendLookup(path, res);
	return false;
}

async function handleAdminEimsRoutes(req, res, path) {
	if (path === "/api/v1/admin/eims/acceptance/cases") {
		return sendJson(res, 200, {
			data: acceptanceCases.map((testCase) => ({
				...testCase,
				status: "ready_for_mock",
				sandboxStatus: "blocked_until_credential",
			})),
		});
	}
	if (path === "/api/v1/admin/eims/acceptance/run-all" && req.method === "POST") {
		const results = acceptanceCases.map((testCase) => acceptanceRun(testCase.caseId));
		return sendJson(res, 201, {
			data: {
				organizationId: "platform",
				executionMode: "mock_until_sandbox",
				total: results.length,
				passed: results.filter((result) => result.passed).length,
				failed: results.filter((result) => !result.passed).length,
				results,
			},
		});
	}
	const acceptanceMatch = path.match(/^\/api\/v1\/admin\/eims\/acceptance\/cases\/([^/]+)(?:\/run)?$/);
	if (acceptanceMatch && req.method === "GET") {
		const testCase = acceptanceCases.find((candidate) => candidate.caseId === acceptanceMatch[1]);
		return testCase
			? sendJson(res, 200, { data: testCase })
			: sendJson(res, 404, { error: { code: "CASE_NOT_FOUND", message: "Unknown acceptance case" } });
	}
	if (acceptanceMatch && req.method === "POST") {
		return sendJson(res, 201, { data: acceptanceRun(acceptanceMatch[1]) });
	}

	const adminRoutes = {
		"/api/v1/admin/eims/overview": adminOverview,
		"/api/v1/admin/eims/tenants": { data: adminOverview.data.tenants },
		"/api/v1/admin/eims/failures": { data: adminOverview.data.latestFailures },
		"/api/v1/admin/eims/certificates": adminCertificates(),
		"/api/v1/admin/eims/resources": adminResources(),
		"/api/v1/admin/eims/compliance": adminCompliance(),
	};
	if (
		(path === "/api/v1/admin/eims/actions/run" || path === "/api/v1/admin/eims/actions/mock-run") &&
		req.method === "POST"
	) {
		const body = await readJson(req);
		return sendJson(res, 202, {
			data: {
				message: `Backend EIMS test action completed: ${body.action ?? "unknown"}`,
				status: "accepted",
				reference: body.targetId ?? "platform",
			},
		});
	}
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
			documentNumber: documentNumber ?? "INV-TEST-NEW",
			documentType: "INV",
			transactionType: "B2C",
			status: "accepted",
			irn: "TEST-IRN-NEW",
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
				{ key: "invoices", label: "Tax invoice records", status: "ready" },
				{ key: "receipts", label: "Receipt records", status: "ready" },
				{ key: "cancellations", label: "Cancellation records", status: "ready" },
				{ key: "print", label: "Printable receipt layouts", status: "test_ready" },
				{ key: "notifications", label: "Buyer notification history", status: "ready" },
			],
		},
	};
}

function acceptanceRun(caseId) {
	const testCase = acceptanceCases.find((candidate) => candidate.caseId === caseId);
	if (!testCase) {
		return {
			caseId,
			passed: false,
			assertions: [{ name: "case exists", passed: false, expected: "known case", actual: "unknown" }],
		};
	}

	const fixture = acceptanceFixture(caseId);
	const assertions = acceptanceAssertions(caseId, fixture.request, fixture.response);
	return {
		...testCase,
		organizationId: "org_mock",
		executionMode: "mock_until_sandbox",
		passed: assertions.every((assertion) => assertion.passed),
		runId: `org_mock-${caseId}-mock-20260526`,
		request: fixture.request,
		response: fixture.response,
		assertions,
		evidence: {
			sourceDocuments: ["MoR_BSP_Master.docx", "EimsCoreApiMockCollection2.postman_collection.json"],
			morBspCaseId: caseId,
			checklistEvidence: testCase.requiredEvidence,
			printEvidence:
				caseId === "IRC-P01" || caseId === "IRC-P02" || caseId === "ADD-P001"
					? {
							layouts: ["compact", "a4"],
							mandatoryFields: ["IRN", "QR", "seller TIN", "document number", "tax value", "total value"],
							qrSource: "EIMS accepted signedQR only",
						}
					: undefined,
			complianceArtifacts: [
				`request-payload-${caseId}.json`,
				`response-${caseId}.json`,
				`audit-event-${caseId}.json`,
			],
		},
		notes: ["Mock until INSA sandbox credentials arrive", "Replay same case ID against real sandbox in Phase 0 Layer B"],
	};
}

function acceptanceFixture(caseId) {
	const invoice = ({
		transactionType = "B2C",
		documentType = "INV",
		buyer = { Tin: null, LegalName: "Walk-in Customer", VatNumber: null },
		taxCodes = ["VAT15"],
		documentNumber = "MOCK-DOC",
		irn = "MOCK-IRN-ACCEPTED",
		relatedDocument,
		reason,
		withhold = "0.00",
	} = {}) => ({
		request: {
			request: {
				TransactionType: transactionType,
				DocumentDetails: {
					Type: documentType,
					DocumentNumber: documentNumber,
					Date: "2026-05-26T10:30:00.000+03:00",
					Reason: reason,
					RelatedDocument: relatedDocument,
				},
				SellerDetails: {
					Tin: "0074136947",
					LegalName: "Habesha Restaurant PLC",
					VatNumber: "REGVAT123456789",
				},
				BuyerDetails: buyer,
				SourceSystem: {
					SystemType: "POS",
					SystemNumber: "329D03B6F0",
					InvoiceCounter: 129,
					PreviousIrn: relatedDocument ?? null,
				},
				ItemList: taxCodes.map((taxCode, index) => ({
					LineNumber: index + 1,
					ItemCode: `ITEM-${index + 1}`,
					ProductDescription: `${taxCode} item`,
					Quantity: "1.0000",
					Unit: "PCS",
					UnitPrice: "100.00",
					TaxCode: taxCode,
					TaxAmount: taxCode === "VAT15" ? "15.00" : "0.00",
					TotalLineAmount: taxCode === "VAT15" ? "115.00" : "100.00",
				})),
				ValueDetails: {
					InvoiceCurrency: "ETB",
					TaxValue: taxCodes.includes("VAT15") ? "15.00" : "0.00",
					TransactionWithholdValue: withhold,
					TotalValue: "115.00",
				},
				PaymentDetails: { PaymentTerm: "IMMIDIATE", Mode: "CASH" },
			},
			signature: "MOCK-SHA512WITHRSA-SIGNATURE-PENDING-PHASE0",
			certificate: "MOCK-INSA-SANDBOX-CERTIFICATE-PENDING",
		},
		response: { StatusCode: 200, Message: "Accepted by EIMS mock", Irn: irn, SignedQR: `MOCK-SIGNED-QR-${caseId}` },
	});

	switch (caseId) {
		case "IRC-P01":
			return invoice({ documentNumber: "B2C-VAT-000001", taxCodes: ["VAT15", "VAT0", "VATEX"], irn: eimsSubmissions[0].irn });
		case "IRC-P02":
			return invoice({
				transactionType: "B2B",
				documentNumber: "B2B-VAT-000002",
				buyer: { Tin: "0089238373", LegalName: "Taxpayer A Trading PLC", VatNumber: "VAT0089238373" },
				taxCodes: ["VAT15", "EXC5"],
				irn: "MOCK-IRN-B2B-0002",
				withhold: "600.00",
			});
		case "IRC-P03":
			return {
				request: {
					ReceiptNumber: "RCPT-2026-00044",
					ReceiptType: "sales",
					Invoices: [{ InvoiceIRN: eimsSubmissions[0].irn, PaymentCoverage: "full", InvoicePaidAmount: "115.00" }],
					TransactionDetails: { ModeOfPayment: "CASH" },
				},
				response: { StatusCode: 200, Rrn: "MOCK-RRN-00044", SignedQR: "MOCK-SIGNED-RECEIPT-QR" },
			};
		case "IRC-P04":
			return {
				request: {
					InvoiceDetail: { InvoiceIRN: "MOCK-IRN-B2B-0002" },
					WithholdDetail: { Type: "TWHT", Rate: "2.00", PreTaxAmount: "30000.00", WithholdingAmount: "600.00" },
				},
				response: { StatusCode: 200, Rrn: "MOCK-WHT-RRN-00002", SignedQR: "MOCK-SIGNED-WHT-QR" },
			};
		case "IRC-P05":
			return { request: { Irn: eimsSubmissions[0].irn, ReasonCode: "4", Remark: "Customer returned the order" }, response: { StatusCode: 200, Status: "cancelled" } };
		case "IRC-P06":
			return invoice({ documentType: "CRE", documentNumber: "CRE-2026-00003", relatedDocument: eimsSubmissions[0].irn, reason: "Returned item", irn: "MOCK-IRN-CRE-00003" });
		case "IRC-P07":
			return invoice({ transactionType: "B2B", documentType: "DEB", documentNumber: "DEB-2026-00004", relatedDocument: "MOCK-IRN-B2B-0002", reason: "Price adjustment", irn: "MOCK-IRN-DEB-00004" });
		case "IRC-N08":
			return {
				request: invoice({ transactionType: "B2B", buyer: { Tin: "123", LegalName: "", VatNumber: null } }).request,
				response: { StatusCode: 406, ErrorCode: "7008", Message: "Invalid buyer TIN or legal name" },
			};
		case "IRC-N09":
			return { request: { Invoices: [{ InvoiceIRN: "MOCK-IRN-CANCELLED-OR-MISSING" }] }, response: { StatusCode: 406, ErrorCode: "7019", Message: "Invoice IRN is not active" } };
		case "IRC-N010":
			return { request: { Irn: "MOCK-IRN-ALREADY-CANCELLED", ReasonCode: "1" }, response: { StatusCode: 406, ErrorCode: "7002", Message: "Invoice already cancelled" } };
		case "ADD-N001":
			return { request: { channels: ["sms", "email"] }, response: { Notifications: notifications.data } };
		case "ADD-C001":
			return { request: { environment: "sandbox" }, response: { Enterprise: overview.data.enterprises[0], Establishment: overview.data.establishments[0], SourceSystem: overview.data.sourceSystems[0], Credential: credentials.data[0] } };
		case "ADD-P001":
			return { request: { layouts: ["compact", "a4"] }, response: { PrintLayouts: printLayouts.data, MandatoryFields: ["IRN", "QR", "seller TIN", "tax value", "total value"] } };
		default:
			return { request: {}, response: {} };
	}
}

function acceptanceAssertions(caseId, request, response) {
	const req = request.request ?? request;
	const assertionsByCase = {
		"IRC-P01": [
			assertion("B2C transaction type", req.TransactionType === "B2C", "B2C", req.TransactionType),
			assertion("Buyer TIN is null", req.BuyerDetails?.Tin === null, "null", String(req.BuyerDetails?.Tin)),
			assertion("VAT0 item exists", req.ItemList?.some((item) => item.TaxCode === "VAT0"), "VAT0", req.ItemList?.map((item) => item.TaxCode).join(",")),
			assertion("VAT15 item exists", req.ItemList?.some((item) => item.TaxCode === "VAT15"), "VAT15", req.ItemList?.map((item) => item.TaxCode).join(",")),
			assertion("VATEX item exists", req.ItemList?.some((item) => item.TaxCode === "VATEX"), "VATEX", req.ItemList?.map((item) => item.TaxCode).join(",")),
			assertion("IRN returned", Boolean(response.Irn), "present", response.Irn),
		],
		"IRC-P02": [
			assertion("B2B transaction type", req.TransactionType === "B2B", "B2B", req.TransactionType),
			assertion("Buyer TIN is 10 digits", /^\d{10}$/.test(req.BuyerDetails?.Tin ?? ""), "10 digits", req.BuyerDetails?.Tin),
			assertion("Withholding value exists", req.ValueDetails?.TransactionWithholdValue === "600.00", "600.00", req.ValueDetails?.TransactionWithholdValue),
			assertion("IRN returned", Boolean(response.Irn), "present", response.Irn),
		],
		"IRC-P03": [
			assertion("Receipt references accepted invoice", req.Invoices?.[0]?.InvoiceIRN === eimsSubmissions[0].irn, eimsSubmissions[0].irn, req.Invoices?.[0]?.InvoiceIRN),
			assertion("RRN returned", Boolean(response.Rrn), "present", response.Rrn),
		],
		"IRC-P04": [
			assertion("Withholding type is TWHT", req.WithholdDetail?.Type === "TWHT", "TWHT", req.WithholdDetail?.Type),
			assertion("Withholding amount greater than zero", Number(req.WithholdDetail?.WithholdingAmount) > 0, "> 0", req.WithholdDetail?.WithholdingAmount),
			assertion("RRN returned", Boolean(response.Rrn), "present", response.Rrn),
		],
		"IRC-P05": [
			assertion("Reason code is 4", req.ReasonCode === "4", "4", req.ReasonCode),
			assertion("Remark exists", Boolean(req.Remark), "present", req.Remark),
			assertion("Cancellation accepted", response.Status === "cancelled", "cancelled", response.Status),
		],
		"IRC-P06": [
			assertion("Document type is CRE", req.DocumentDetails?.Type === "CRE", "CRE", req.DocumentDetails?.Type),
			assertion("Related document exists", Boolean(req.DocumentDetails?.RelatedDocument), "present", req.DocumentDetails?.RelatedDocument),
			assertion("IRN returned", Boolean(response.Irn), "present", response.Irn),
		],
		"IRC-P07": [
			assertion("Document type is DEB", req.DocumentDetails?.Type === "DEB", "DEB", req.DocumentDetails?.Type),
			assertion("Related document exists", Boolean(req.DocumentDetails?.RelatedDocument), "present", req.DocumentDetails?.RelatedDocument),
			assertion("IRN returned", Boolean(response.Irn), "present", response.Irn),
		],
		"IRC-N08": [
			assertion("Invalid buyer TIN used", req.BuyerDetails?.Tin === "123", "123", req.BuyerDetails?.Tin),
			assertion("Error returned", Boolean(response.ErrorCode), "present", response.ErrorCode),
			assertion("No IRN issued", !response.Irn, "absent", response.Irn),
		],
		"IRC-N09": [
			assertion("Inactive IRN used", req.Invoices?.[0]?.InvoiceIRN === "MOCK-IRN-CANCELLED-OR-MISSING", "inactive", req.Invoices?.[0]?.InvoiceIRN),
			assertion("Error returned", Boolean(response.ErrorCode), "present", response.ErrorCode),
			assertion("No RRN issued", !response.Rrn, "absent", response.Rrn),
		],
		"IRC-N010": [
			assertion("Inactive cancellation IRN used", req.Irn === "MOCK-IRN-ALREADY-CANCELLED", "inactive", req.Irn),
			assertion("Error returned", Boolean(response.ErrorCode), "present", response.ErrorCode),
		],
		"ADD-N001": [
			assertion("SMS notification exists", response.Notifications?.some((item) => item.channel === "sms"), "sms", response.Notifications?.map((item) => item.channel).join(",")),
			assertion("Email notification exists", response.Notifications?.some((item) => item.channel === "email"), "email", response.Notifications?.map((item) => item.channel).join(",")),
		],
		"ADD-C001": [
			assertion("TIN is 10 digits", /^\d{10}$/.test(response.Enterprise?.tin ?? response.Enterprise?.Tin ?? ""), "10 digits", response.Enterprise?.tin ?? response.Enterprise?.Tin),
			assertion("Sub-TIN is valid", /^\d{10}-\d{2}$/.test(response.Establishment?.subTin ?? ""), "TIN-NN", response.Establishment?.subTin),
			assertion("Credential tested", response.Credential?.lastTestStatus === "success", "success", response.Credential?.lastTestStatus),
		],
		"ADD-P001": [
			assertion("Compact layout exists", response.PrintLayouts?.some((item) => item.layout === "compact"), "compact", response.PrintLayouts?.map((item) => item.layout).join(",")),
			assertion("A4 layout exists", response.PrintLayouts?.some((item) => item.layout === "a4"), "a4", response.PrintLayouts?.map((item) => item.layout).join(",")),
			assertion("IRN mandatory", response.MandatoryFields?.includes("IRN"), "IRN", response.MandatoryFields?.join(",")),
			assertion("QR mandatory", response.MandatoryFields?.includes("QR"), "QR", response.MandatoryFields?.join(",")),
		],
	};
	return assertionsByCase[caseId] ?? [assertion("case implemented", false, "implemented", "missing")];
}

function assertion(name, passed, expected, actual) {
	return { name, passed: Boolean(passed), expected: String(expected), actual: String(actual) };
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
			vault: { status: "test_connector", provider: "local" },
			mor: { sandbox: "pending_credentials", production: "not_configured" },
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

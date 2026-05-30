import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "#shared/lib/api-client";

export interface EimsLookupResponse<T = unknown> {
	version: string;
	updatedAt: string;
	data: T[];
}

export interface SetupProgressItem {
	key: string;
	label: string;
	status: "complete" | "attention" | "pending" | "blocked" | string;
}

export interface EimsSubmission {
	id: string;
	documentNumber: string;
	documentType: string;
	transactionType: string;
	status: "accepted" | "pending_offline" | "failed_retryable" | "unknown_submission" | string;
	irn: string | null;
	sourceSystem: string;
	establishment: string;
	totalValue: string;
	taxValue: string;
	ackDate: string | null;
	errorCode?: string;
}

export interface EimsOverview {
	mode: string;
	environment: string;
	organizationId: string;
	setupProgress: SetupProgressItem[];
	stats: {
		acceptedToday: number;
		pendingOffline: number;
		unknownSubmissions: number;
		certificatesExpiring: number;
	};
	health: Array<{ label: string; status: string; detail: string }>;
	enterprises: Array<{ id: string; tin: string; legalName: string; vatNumber: string; status: string }>;
	establishments: Array<{ id: string; name: string; code: string; subTin: string; status: string; city: string }>;
	sourceSystems: Array<{
		id: string;
		name: string;
		systemNumber: string;
		systemType: string;
		approvalStatus: string;
		lastAcceptedCounter?: number;
	}>;
	blockers: string[];
	recentSubmissions: EimsSubmission[];
}

export interface EimsTenantWorkspace {
	organizationId: string;
	operationModeLabel: string;
	plainLanguageSummary: string;
	readiness: {
		readyForLive: boolean;
		blockers: string[];
		steps: Array<{
			key: string;
			label: string;
			status: string;
			tenantProvides: string[];
			actionLabel?: string;
		}>;
	};
	requiredInputs: string[];
	supportNote: string;
	primaryActions: Array<{ label: string; href: string }>;
	alerts: Array<{ level: "info" | "warning" | "error" | string; message: string }>;
}

export interface EimsSetupState {
	status: string;
	counts: {
		enterprises: number;
		establishments: number;
		sourceSystems: number;
	};
	enterprises: EimsOverview["enterprises"];
	establishments: EimsOverview["establishments"];
	sourceSystems: EimsOverview["sourceSystems"];
}

export interface EimsActionResult {
	message: string;
	reference?: string;
	status?: string;
}

export interface CreateEimsEnterpriseInput {
	tin: string;
	legalName: string;
	tradeName?: string;
	vatNumber?: string;
	email?: string;
	phone?: string;
}

export interface CreateEimsEstablishmentInput {
	enterpriseId: string;
	name: string;
	code: string;
	subTin?: string;
	region?: string;
	city?: string;
}

export interface CreateEimsSourceInput {
	enterpriseId: string;
	establishmentId: string;
	name: string;
	systemType: string;
	systemNumber?: string;
	softwareVersion?: string;
	inHouseDeveloped?: boolean;
}

export interface SaveEimsCredentialInput {
	sourceSystemId: string;
	clientId: string;
	username: string;
	apiKey: string;
	password: string;
	clientSecret: string;
}

export interface ImportEimsCertificateInput {
	sourceSystemId: string;
	certificatePem: string;
}

export interface CreateEimsReceiptInput {
	receiptType: "sales" | "withholding";
	invoiceIrn: string;
	paymentMode: string;
	paidAmount: string;
	withholdingType?: string;
}

export interface CancelEimsInvoiceInput {
	invoiceIrn: string;
	reasonCode: string;
	remark?: string;
}

export interface EimsReceipt {
	id: string;
	receiptNumber: string;
	receiptType: string;
	withholdingType: string | null;
	status: string;
	invoiceIrn: string;
	rrn: string | null;
	paymentMode: string;
	paidAmount: string;
}

export interface EimsCredential {
	id: string;
	sourceSystem: string;
	username: string;
	clientId: string;
	status: string;
	lifecycle: string;
	apiKeyConfigured: boolean;
	passwordConfigured: boolean;
	clientSecretConfigured: boolean;
	refreshTokenConfigured: boolean;
	tokenCache: string;
	lastTestedAt: string;
	lastTestStatus: string;
	secretsReturned: boolean;
}

export interface EimsCertificate {
	id: string;
	sourceSystem: string;
	provider: string;
	csrStrategy: string;
	keyProvider: string;
	keyVersion: string;
	signatureAlgorithm: string;
	validFrom: string;
	validTo: string;
	status: string;
	expiryWindow: string;
}

export interface EimsBulkBatch {
	id: string;
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
}

export interface EimsCancellation {
	id: string;
	invoiceIrn: string;
	reasonCode: string;
	reasonLabel: string;
	remark: string;
	status: string;
	limitWindow: string;
	countToday: number;
	knownLimitToday: number;
	warningThreshold: string;
}

export interface EimsBuyer {
	id: string;
	buyerTin: string;
	legalName: string;
	buyerType: string;
	isGovernment: boolean;
	vatNumber: string | null;
	city: string;
	frequentBuyer: boolean;
}

export interface EimsPrintLayout {
	id: string;
	layout: string;
	paper: string;
	status: string;
	requiredFields: string[];
	qrSource: string;
}

export interface EimsNotificationLog {
	id: string;
	channel: string;
	provider: string;
	status: string;
	invoiceIrn: string;
	retryCount: number;
	sentAt: string | null;
}

export interface EimsBranchHealth {
	establishmentId: string;
	establishmentName: string;
	status: string;
	todayInvoices: number;
	pendingOffline: number;
	activeSources: number;
	pendingSources: number;
	alerts: string[];
}

export interface EimsComplianceEvidence {
	organizationId: string;
	generatedAt: string;
	readiness: number;
	items: Array<{ key: string; label: string; status: string }>;
}

export interface EimsAcceptanceCase {
	caseId: string;
	type: "positive" | "negative" | "additional";
	title: string;
	sourceDocument: string;
	sourceSection: string;
	operation: string;
	method: string;
	endpoint: string;
	requirement: string;
	expectedOutcome: string;
	requiredEvidence: string[];
	requiredAssertions: string[];
	status?: string;
	sandboxStatus?: string;
}

export interface EimsAcceptanceRun {
	caseId: string;
	title: string;
	type: string;
	operation: string;
	endpoint: string;
	executionMode: string;
	passed: boolean;
	runId: string;
	request: unknown;
	response: unknown;
	assertions: Array<{ name: string; passed: boolean; expected: string; actual: string }>;
	evidence: {
		sourceDocuments: string[];
		morBspCaseId: string;
		checklistEvidence: string[];
		printEvidence?: {
			layouts: string[];
			mandatoryFields: string[];
			qrSource: string;
		};
		notificationEvidence?: {
			channels: string[];
			providers: string[];
			retryPolicy: string;
		};
		complianceArtifacts?: string[];
	};
}

export interface EimsAcceptanceRunAll {
	organizationId: string;
	executionMode: string;
	total: number;
	passed: number;
	failed: number;
	results: EimsAcceptanceRun[];
}

export interface AdminEimsOverview {
	mode: string;
	tenantsTotal: number;
	tenantsBlocked: number;
	acceptedToday: number;
	pendingOffline: number;
	unknownSubmissions: number;
	certificateAlerts: number;
	latestFailures: AdminEimsFailure[];
	tenants: AdminEimsTenant[];
}

export interface AdminEimsTenant {
	id: string;
	name: string;
	status: string;
	branches: number;
	sources: number;
	acceptedToday: number;
	pendingOffline: number;
}

export interface AdminEimsFailure {
	id: string;
	tenant: string;
	sourceSystem: string;
	errorCode: string;
	category: string;
	recommendedAction: string;
}

export interface AdminEimsCertificate {
	tenant: string;
	sourceSystem: string;
	validTo: string;
	status: string;
}

export interface AdminEimsResources {
	queues: Array<{ name: string; depth: number; status: string }>;
	vault: { status: string; provider: string };
	mor: { sandbox: string; production: string };
}

export interface AdminEimsCompliance {
	readiness: number;
	missing: string[];
	ready: string[];
}

export const useEimsLookup = <T = unknown>(name: string) =>
	useQuery({
		queryKey: ["eims", "lookup", name],
		queryFn: () => api.get<EimsLookupResponse<T>>(`/eims/lookups/${name}`),
	});

export const useEimsOverview = () =>
	useQuery({
		queryKey: ["eims", "overview"],
		queryFn: () => api.get<{ data: EimsOverview }>("/eims/overview"),
	});

export const useEimsTenantWorkspace = () =>
	useQuery({
		queryKey: ["eims", "workspace"],
		queryFn: () => api.get<{ data: EimsTenantWorkspace }>("/eims/workspace"),
	});

export const useEimsSetup = () =>
	useQuery({
		queryKey: ["eims", "setup"],
		queryFn: () => api.get<{ data: EimsSetupState }>("/eims/setup"),
	});

const invalidateEims = (queryClient: ReturnType<typeof useQueryClient>) => {
	void queryClient.invalidateQueries({ queryKey: ["eims"] });
	void queryClient.invalidateQueries({ queryKey: ["admin", "eims"] });
};

export const useCreateEimsEnterprise = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (input: CreateEimsEnterpriseInput) =>
			api.post<{ data: EimsActionResult & CreateEimsEnterpriseInput }>("/eims/setup/enterprises", input),
		onSuccess: () => invalidateEims(queryClient),
	});
};

export const useCreateEimsEstablishment = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (input: CreateEimsEstablishmentInput) =>
			api.post<{ data: EimsActionResult & CreateEimsEstablishmentInput }>("/eims/setup/establishments", input),
		onSuccess: () => invalidateEims(queryClient),
	});
};

export const useCreateEimsSourceSystem = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (input: CreateEimsSourceInput) =>
			api.post<{ data: EimsActionResult & CreateEimsSourceInput }>("/eims/setup/sources", input),
		onSuccess: () => invalidateEims(queryClient),
	});
};

export const useEimsSubmissions = () =>
	useQuery({
		queryKey: ["eims", "submissions"],
		queryFn: () => api.get<{ data: EimsSubmission[] }>("/eims/submissions"),
	});

export const useCreateEimsSubmission = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (documentNumber: string) => api.post<{ data: EimsSubmission }>("/eims/submissions", { documentNumber }),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ["eims"] });
		},
	});
};

export const useSaveEimsCredential = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (input: SaveEimsCredentialInput) => api.post<{ data: EimsActionResult }>("/eims/credentials", input),
		onSuccess: () => invalidateEims(queryClient),
	});
};

export const useTestEimsCredential = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (sourceSystemId: string) =>
			api.post<{ data: EimsActionResult }>("/eims/credentials/test", { sourceSystemId }),
		onSuccess: () => invalidateEims(queryClient),
	});
};

export const useGenerateEimsCsr = () =>
	useMutation({
		mutationFn: (sourceSystemId: string) =>
			api.post<{ data: EimsActionResult }>("/eims/certificates/generate-csr", { sourceSystemId }),
	});

export const useImportEimsCertificate = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (input: ImportEimsCertificateInput) =>
			api.post<{ data: EimsActionResult }>("/eims/certificates/import", input),
		onSuccess: () => invalidateEims(queryClient),
	});
};

export const useEimsReceipts = () =>
	useQuery({
		queryKey: ["eims", "receipts"],
		queryFn: () => api.get<{ data: EimsReceipt[] }>("/eims/receipts"),
	});

export const useCreateEimsReceipt = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (input: CreateEimsReceiptInput) => api.post<{ data: EimsActionResult }>("/eims/receipts", input),
		onSuccess: () => invalidateEims(queryClient),
	});
};

export const useEimsCredentials = () =>
	useQuery({
		queryKey: ["eims", "credentials"],
		queryFn: () => api.get<{ data: EimsCredential[] }>("/eims/credentials"),
	});

export const useEimsCertificates = () =>
	useQuery({
		queryKey: ["eims", "certificates"],
		queryFn: () => api.get<{ data: EimsCertificate[] }>("/eims/certificates"),
	});

export const useEimsBulkBatches = () =>
	useQuery({
		queryKey: ["eims", "bulk"],
		queryFn: () => api.get<{ data: EimsBulkBatch[] }>("/eims/bulk"),
	});

export const useCreateEimsBulkBatch = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: () => api.post<{ data: EimsActionResult }>("/eims/bulk", {}),
		onSuccess: () => invalidateEims(queryClient),
	});
};

export const useReconcileEimsBulkBatch = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (conversationId: string) =>
			api.post<{ data: EimsActionResult }>("/eims/bulk/reconcile", { conversationId }),
		onSuccess: () => invalidateEims(queryClient),
	});
};

export const useEimsCancellations = () =>
	useQuery({
		queryKey: ["eims", "cancellations"],
		queryFn: () => api.get<{ data: EimsCancellation[] }>("/eims/cancellations"),
	});

export const useCancelEimsInvoice = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (input: CancelEimsInvoiceInput) => api.post<{ data: EimsActionResult }>("/eims/cancellations", input),
		onSuccess: () => invalidateEims(queryClient),
	});
};

export const useEimsBuyers = () =>
	useQuery({
		queryKey: ["eims", "buyers"],
		queryFn: () => api.get<{ data: EimsBuyer[] }>("/eims/buyers"),
	});

export const useEimsPrintLayouts = () =>
	useQuery({
		queryKey: ["eims", "print-layouts"],
		queryFn: () => api.get<{ data: EimsPrintLayout[] }>("/eims/print-layouts"),
	});

export const useEimsNotificationLogs = () =>
	useQuery({
		queryKey: ["eims", "notifications"],
		queryFn: () => api.get<{ data: EimsNotificationLog[] }>("/eims/notifications"),
	});

export const useEimsBranchHealth = () =>
	useQuery({
		queryKey: ["eims", "branch-health"],
		queryFn: () => api.get<{ data: EimsBranchHealth[] }>("/eims/branch-health"),
	});

export const useEimsComplianceEvidence = () =>
	useQuery({
		queryKey: ["eims", "compliance", "evidence"],
		queryFn: () => api.get<{ data: EimsComplianceEvidence }>("/eims/compliance/evidence"),
	});

export const useGenerateEimsEvidence = () =>
	useMutation({
		mutationFn: () => api.post<{ data: EimsActionResult }>("/eims/compliance/evidence", {}),
	});

export const useEimsAcceptanceCases = () =>
	useQuery({
		queryKey: ["admin", "eims", "acceptance", "cases"],
		queryFn: () => api.get<{ data: EimsAcceptanceCase[] }>("/admin/eims/acceptance/cases"),
	});

export const useRunEimsAcceptanceCase = () =>
	useMutation({
		mutationFn: (caseId: string) =>
			api.post<{ data: EimsAcceptanceRun }>(`/admin/eims/acceptance/cases/${caseId}/run`, {}),
	});

export const useRunAllEimsAcceptanceCases = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: () => api.post<{ data: EimsAcceptanceRunAll }>("/admin/eims/acceptance/run-all", {}),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ["admin", "eims", "acceptance"] });
		},
	});
};

export const useAdminEimsOverview = () =>
	useQuery({
		queryKey: ["admin", "eims", "overview"],
		queryFn: () => api.get<{ data: AdminEimsOverview }>("/admin/eims/overview"),
	});

export const useAdminEimsTenants = () =>
	useQuery({
		queryKey: ["admin", "eims", "tenants"],
		queryFn: () => api.get<{ data: AdminEimsTenant[] }>("/admin/eims/tenants"),
	});

export const useAdminEimsFailures = () =>
	useQuery({
		queryKey: ["admin", "eims", "failures"],
		queryFn: () => api.get<{ data: AdminEimsFailure[] }>("/admin/eims/failures"),
	});

export const useAdminEimsCertificates = () =>
	useQuery({
		queryKey: ["admin", "eims", "certificates"],
		queryFn: () => api.get<{ data: AdminEimsCertificate[] }>("/admin/eims/certificates"),
	});

export const useAdminEimsResources = () =>
	useQuery({
		queryKey: ["admin", "eims", "resources"],
		queryFn: () => api.get<{ data: AdminEimsResources }>("/admin/eims/resources"),
	});

export const useAdminEimsCompliance = () =>
	useQuery({
		queryKey: ["admin", "eims", "compliance"],
		queryFn: () => api.get<{ data: AdminEimsCompliance }>("/admin/eims/compliance"),
	});

export const useAdminEimsAction = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (input: { action: string; targetId?: string; note?: string }) =>
			api.post<{ data: EimsActionResult }>("/admin/eims/actions/run", input),
		onSuccess: () => invalidateEims(queryClient),
	});
};

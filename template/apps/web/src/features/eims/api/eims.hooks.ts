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
		lastAcceptedCounter: number;
	}>;
	blockers: string[];
	recentSubmissions: EimsSubmission[];
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
	environment: string;
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
	environment: string;
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

export const useEimsSubmissions = () =>
	useQuery({
		queryKey: ["eims", "submissions"],
		queryFn: () => api.get<{ data: EimsSubmission[] }>("/eims/submissions"),
	});

export const useCreateMockEimsSubmission = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (documentNumber: string) =>
			api.post<{ data: EimsSubmission }>("/eims/submissions/mock-submit", { documentNumber }),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ["eims"] });
		},
	});
};

export const useEimsReceipts = () =>
	useQuery({
		queryKey: ["eims", "receipts"],
		queryFn: () => api.get<{ data: EimsReceipt[] }>("/eims/receipts"),
	});

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

export const useEimsCancellations = () =>
	useQuery({
		queryKey: ["eims", "cancellations"],
		queryFn: () => api.get<{ data: EimsCancellation[] }>("/eims/cancellations"),
	});

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

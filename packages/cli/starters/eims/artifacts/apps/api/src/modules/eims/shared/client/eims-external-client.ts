export const EIMS_EXTERNAL_CLIENT = Symbol("EIMS_EXTERNAL_CLIENT");
export const EIMS_SDK_CLIENT = Symbol("EIMS_SDK_CLIENT");

export interface RegisterInvoiceInput {
	organizationId: string;
	sourceSystemId?: string;
	documentNumber?: string;
	payload?: unknown;
	queueName?: string;
	reservationId?: string;
	counter?: number;
	previousIrn?: string | null;
}

export interface RegisterReceiptInput {
	organizationId: string;
	sourceSystemId?: string;
	receiptNumber?: string;
	payload?: unknown;
}

export interface ValidateCredentialInput {
	organizationId: string;
	sourceSystemId?: string;
	environment?: string;
	clientId?: string | null;
	username?: string | null;
	credentials: Partial<Record<"apiKey" | "password" | "clientSecret" | "refreshToken", string>>;
}

export interface PollBulkStatusInput {
	organizationId: string;
	conversationId: string;
	sourceSystemId?: string;
}

export interface SubmitBulkInput {
	organizationId: string;
	sourceSystemId?: string;
	invoices?: unknown[];
	payload?: unknown;
}

export interface CancelInvoiceInput {
	organizationId: string;
	sourceSystemId?: string;
	invoiceIrn?: string;
	reasonCode?: string;
	remark?: string;
	payload?: unknown;
}

export interface EimsExternalResponse {
	data: Record<string, unknown>;
	meta?: Record<string, unknown>;
}

export interface EimsExternalClient {
	registerInvoice(input: RegisterInvoiceInput): Promise<EimsExternalResponse>;
	registerReceipt(input: RegisterReceiptInput): Promise<EimsExternalResponse>;
	verifyIrn(input: { organizationId: string; irn: string }): Promise<EimsExternalResponse>;
	validateCredential(input: ValidateCredentialInput): Promise<EimsExternalResponse>;
	submitBulk(input: SubmitBulkInput): Promise<EimsExternalResponse>;
	pollBulkStatus(input: PollBulkStatusInput): Promise<EimsExternalResponse>;
	cancelInvoice(input: CancelInvoiceInput): Promise<EimsExternalResponse>;
}

export interface EimsSdkClient {
	registerInvoice(invoice: unknown, tenantConfig: Record<string, unknown>): Promise<unknown>;
	registerReceipt?(receipt: unknown, tenantConfig: Record<string, unknown>): Promise<unknown>;
	verifyIrn?(input: { irn: string; tenantConfig: Record<string, unknown> }): Promise<unknown>;
	submitBulk?(input: {
		invoices: unknown[];
		payload: unknown;
		tenantConfig: Record<string, unknown>;
	}): Promise<unknown>;
	submitBulkInvoices?(input: {
		invoices: unknown[];
		payload: unknown;
		tenantConfig: Record<string, unknown>;
	}): Promise<unknown>;
	registerBulkInvoices?(input: {
		invoices: unknown[];
		payload: unknown;
		tenantConfig: Record<string, unknown>;
	}): Promise<unknown>;
	submitBulkDocuments?(input: {
		invoices: unknown[];
		payload: unknown;
		tenantConfig: Record<string, unknown>;
	}): Promise<unknown>;
	pollBulkStatus?(input: { conversationId: string; tenantConfig: Record<string, unknown> }): Promise<unknown>;
	pollBulkConversation?(input: { conversationId: string; tenantConfig: Record<string, unknown> }): Promise<unknown>;
	getBulkStatus?(input: { conversationId: string; tenantConfig: Record<string, unknown> }): Promise<unknown>;
	getBulkConversationStatus?(input: {
		conversationId: string;
		tenantConfig: Record<string, unknown>;
	}): Promise<unknown>;
	cancelInvoice?(input: {
		irn?: string;
		reasonCode?: string;
		remark?: string;
		payload: unknown;
		tenantConfig: Record<string, unknown>;
	}): Promise<unknown>;
	cancelDocument?(input: {
		irn?: string;
		reasonCode?: string;
		remark?: string;
		payload: unknown;
		tenantConfig: Record<string, unknown>;
	}): Promise<unknown>;
	cancelTaxInvoice?(input: {
		irn?: string;
		reasonCode?: string;
		remark?: string;
		payload: unknown;
		tenantConfig: Record<string, unknown>;
	}): Promise<unknown>;
	submitCancellation?(input: {
		irn?: string;
		reasonCode?: string;
		remark?: string;
		payload: unknown;
		tenantConfig: Record<string, unknown>;
	}): Promise<unknown>;
	validateCredential?(input: {
		credentials: ValidateCredentialInput["credentials"];
		tenantConfig: Record<string, unknown>;
		environment?: string;
		clientId?: string | null;
		username?: string | null;
	}): Promise<unknown>;
	validateCredentials?(input: {
		credentials: ValidateCredentialInput["credentials"];
		tenantConfig: Record<string, unknown>;
		environment?: string;
		clientId?: string | null;
		username?: string | null;
	}): Promise<unknown>;
}

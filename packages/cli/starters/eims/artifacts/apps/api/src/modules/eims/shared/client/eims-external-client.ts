export const EIMS_EXTERNAL_CLIENT = Symbol("EIMS_EXTERNAL_CLIENT");

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

export interface EimsExternalResponse {
	data: Record<string, unknown>;
	meta?: Record<string, unknown>;
}

export interface EimsExternalClient {
	registerInvoice(input: RegisterInvoiceInput): Promise<EimsExternalResponse>;
	registerReceipt(input: RegisterReceiptInput): Promise<EimsExternalResponse>;
	verifyIrn(input: { organizationId: string; irn: string }): Promise<EimsExternalResponse>;
}

export const EIMS_EXTERNAL_CLIENT = Symbol("EIMS_EXTERNAL_CLIENT");

export interface RegisterInvoiceInput {
	organizationId: string;
	sourceSystemId?: string;
	documentNumber?: string;
	payload?: unknown;
}

export interface RegisterReceiptInput {
	organizationId: string;
	sourceSystemId?: string;
	receiptNumber?: string;
	payload?: unknown;
}

export interface EimsExternalClient {
	registerInvoice(input: RegisterInvoiceInput): Promise<unknown>;
	registerReceipt(input: RegisterReceiptInput): Promise<unknown>;
	verifyIrn(input: { organizationId: string; irn: string }): Promise<unknown>;
}

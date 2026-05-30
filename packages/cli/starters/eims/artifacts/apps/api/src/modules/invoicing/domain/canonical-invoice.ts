export type CanonicalTransactionType = "B2B" | "B2C" | "B2G" | "G2B" | "G2C";
export type CanonicalDocumentType = "INV" | "CRE" | "DEB" | "INT" | "RTN" | "FIN" | "MIX" | "INC" | "PRF" | "OVD";

export interface CanonicalParty {
	tin?: string | null;
	subTin?: string | null;
	legalName: string;
	tradeName?: string | null;
	vatNumber?: string | null;
	email?: string | null;
	phone?: string | null;
}

export interface CanonicalInvoiceLine {
	lineNumber: number;
	natureOfSupplies: "Goods" | "Service" | string;
	itemCode?: string | null;
	productDescription: string;
	unitPrice: string;
	quantity: string;
	unit: string;
	preTaxValue: string;
	taxCode: string;
	taxAmount: string;
	totalLineAmount: string;
}

export interface CanonicalInvoice {
	id: string;
	organizationId: string;
	enterpriseId: string;
	establishmentId: string;
	sourceSystemId: string;
	transactionType: CanonicalTransactionType;
	documentType: CanonicalDocumentType;
	documentNumber: string;
	manualInvoiceNumber?: string | null;
	documentDate: string;
	invoiceCurrency: string;
	exchangeRate?: string | null;
	previousIrn?: string | null;
	relatedDocument?: string | null;
	seller: CanonicalParty;
	buyer?: CanonicalParty | null;
	lines: CanonicalInvoiceLine[];
	payment: {
		paymentTerm: string;
		mode: string;
	};
	valueDetails: {
		totalValue: string;
		taxValue: string;
		discount?: string | null;
		exciseValue?: string | null;
		transactionWithholdValue?: string | null;
		incomeWithholdValue?: string | null;
	};
	cashierName?: string | null;
	sourceBusinessEvent?: string | null;
}

export type EimsAcceptanceCaseId =
	| "IRC-P01"
	| "IRC-P02"
	| "IRC-P03"
	| "IRC-P04"
	| "IRC-P05"
	| "IRC-P06"
	| "IRC-P07"
	| "IRC-N08"
	| "IRC-N09"
	| "IRC-N010"
	| "ADD-N001"
	| "ADD-C001"
	| "ADD-P001";

export type EimsAcceptanceCaseType = "positive" | "negative" | "additional";

export interface EimsAcceptanceCaseDefinition {
	caseId: EimsAcceptanceCaseId;
	type: EimsAcceptanceCaseType;
	title: string;
	sourceDocument: string;
	sourceSection: string;
	operation: string;
	method: "GET" | "POST";
	endpoint: string;
	requirement: string;
	expectedOutcome: string;
	requiredEvidence: readonly string[];
	requiredAssertions: readonly string[];
}

export const EIMS_ACCEPTANCE_CASES: readonly EimsAcceptanceCaseDefinition[] = [
	{
		caseId: "IRC-P01",
		type: "positive",
		title: "Register B2C sales invoice without buyer TIN and with VAT",
		sourceDocument: "MoR_BSP_Master.docx",
		sourceSection: "Table 2, IRC-P01",
		operation: "invoice.register",
		method: "POST",
		endpoint: "/v1/register",
		requirement:
			"Register and print a VAT-inclusive B2C invoice. Buyer TIN must be null. Items must include VAT0, VAT15, and VATEX variants.",
		expectedOutcome:
			"EIMS accepts the invoice, returns IRN/signed QR, and print evidence contains IRN, QR, seller TIN, tax and total.",
		requiredEvidence: ["accepted IRN", "signed QR", "thermal print", "A4 print", "mobile QR scan"],
		requiredAssertions: [
			"transactionType=B2C",
			"BuyerDetails.Tin is null",
			"ItemList contains VAT0, VAT15, VATEX",
			"response.Irn exists",
			"printEvidence includes IRN and QR",
		],
	},
	{
		caseId: "IRC-P02",
		type: "positive",
		title: "Register B2B sales invoice with buyer TIN and legal name",
		sourceDocument: "MoR_BSP_Master.docx",
		sourceSection: "Table 3, IRC-P02",
		operation: "invoice.register",
		method: "POST",
		endpoint: "/v1/register",
		requirement:
			"Register B2B invoice with buyer TIN/legal name, multiple items, discount, excise, withholding and full print layout.",
		expectedOutcome: "EIMS accepts the invoice and print evidence contains seller, buyer, tax, IRN, QR and totals.",
		requiredEvidence: ["accepted IRN", "signed QR", "A4 print", "withholding values", "buyer TIN validation"],
		requiredAssertions: [
			"transactionType=B2B",
			"BuyerDetails.Tin is 10 digits",
			"ValueDetails.TransactionWithholdValue exists",
			"response.Irn exists",
			"printEvidence includes buyer details",
		],
	},
	{
		caseId: "IRC-P03",
		type: "positive",
		title: "Register sales receipt from a registered invoice",
		sourceDocument: "MoR_BSP_Master.docx",
		sourceSection: "IRC-P03",
		operation: "receipt.sales",
		method: "POST",
		endpoint: "/v1/receipt/sales",
		requirement: "Register a sales receipt linked to an accepted invoice IRN.",
		expectedOutcome: "EIMS returns a receipt reference number and signed receipt QR.",
		requiredEvidence: ["invoice IRN", "RRN", "signed receipt QR", "payment mode"],
		requiredAssertions: ["InvoiceIRN references accepted invoice", "response.Rrn exists", "payment coverage=full"],
	},
	{
		caseId: "IRC-P04",
		type: "positive",
		title: "Register withholding receipt from a registered invoice",
		sourceDocument: "MoR_BSP_Master.docx",
		sourceSection: "IRC-P04",
		operation: "receipt.withholding",
		method: "POST",
		endpoint: "/v1/receipt/withholding",
		requirement: "Register TWHT/IWHT receipt for a registered invoice.",
		expectedOutcome: "EIMS accepts withholding receipt and returns RRN/signed QR.",
		requiredEvidence: ["invoice IRN", "withholding type", "rate", "withholding amount", "RRN"],
		requiredAssertions: ["WithholdDetail.Type=TWHT", "WithholdingAmount > 0", "response.Rrn exists"],
	},
	{
		caseId: "IRC-P05",
		type: "positive",
		title: "Cancel registered invoice",
		sourceDocument: "MoR_BSP_Master.docx",
		sourceSection: "IRC-P05",
		operation: "invoice.cancel",
		method: "POST",
		endpoint: "/v1/cancel",
		requirement: "Cancel an accepted invoice using an approved reason code and remark when required.",
		expectedOutcome: "EIMS confirms cancellation and local invoice remains immutable with cancelled status.",
		requiredEvidence: ["invoice IRN", "reason code", "remark", "cancellation response", "audit event"],
		requiredAssertions: ["ReasonCode is valid", "Remark exists for ReasonCode=4", "response.Status=cancelled"],
	},
	{
		caseId: "IRC-P06",
		type: "positive",
		title: "Register credit memo from a registered invoice",
		sourceDocument: "MoR_BSP_Master.docx",
		sourceSection: "IRC-P06",
		operation: "invoice.register",
		method: "POST",
		endpoint: "/v1/register",
		requirement: "Register credit note with reason and related document pointing to the original accepted invoice.",
		expectedOutcome: "EIMS accepts credit note and returns IRN/signed QR.",
		requiredEvidence: ["original IRN", "related document", "reason", "credit note IRN"],
		requiredAssertions: ["DocumentDetails.Type=CRE", "RelatedDocument exists", "Reason exists", "response.Irn exists"],
	},
	{
		caseId: "IRC-P07",
		type: "positive",
		title: "Register debit memo from a registered invoice",
		sourceDocument: "MoR_BSP_Master.docx",
		sourceSection: "IRC-P07",
		operation: "invoice.register",
		method: "POST",
		endpoint: "/v1/register",
		requirement: "Register debit note with reason and related document pointing to the original accepted invoice.",
		expectedOutcome: "EIMS accepts debit note and returns IRN/signed QR.",
		requiredEvidence: ["original IRN", "related document", "reason", "debit note IRN"],
		requiredAssertions: ["DocumentDetails.Type=DEB", "RelatedDocument exists", "Reason exists", "response.Irn exists"],
	},
	{
		caseId: "IRC-N08",
		type: "negative",
		title: "Reject B2B sales invoice with invalid buyer TIN or legal name",
		sourceDocument: "MoR_BSP_Master.docx",
		sourceSection: "IRC-N08",
		operation: "invoice.register",
		method: "POST",
		endpoint: "/v1/register",
		requirement: "Invalid B2B buyer identity must fail before or during registration.",
		expectedOutcome: "Invoice is rejected and no IRN/official QR is issued.",
		requiredEvidence: ["invalid buyer payload", "validation error", "no IRN issued"],
		requiredAssertions: [
			"transactionType=B2B",
			"BuyerDetails.Tin invalid",
			"response.error exists",
			"response.Irn absent",
		],
	},
	{
		caseId: "IRC-N09",
		type: "negative",
		title: "Reject receipt from non-existent or cancelled invoice",
		sourceDocument: "MoR_BSP_Master.docx",
		sourceSection: "IRC-N09",
		operation: "receipt.sales",
		method: "POST",
		endpoint: "/v1/receipt/sales",
		requirement: "Receipt must not be generated from a missing or cancelled invoice IRN.",
		expectedOutcome: "Receipt registration is rejected and no RRN is issued.",
		requiredEvidence: ["bad invoice IRN", "receipt rejection", "no RRN issued"],
		requiredAssertions: ["InvoiceIRN is not active", "response.error exists", "response.Rrn absent"],
	},
	{
		caseId: "IRC-N010",
		type: "negative",
		title: "Reject cancellation of non-existent or already cancelled invoice",
		sourceDocument: "MoR_BSP_Master.docx",
		sourceSection: "IRC-N010",
		operation: "invoice.cancel",
		method: "POST",
		endpoint: "/v1/cancel",
		requirement: "Cancellation must fail for an unknown or already cancelled IRN.",
		expectedOutcome: "Cancellation is rejected and audit records the failed attempt.",
		requiredEvidence: ["bad/cancelled IRN", "rejection response", "audit event"],
		requiredAssertions: ["Irn is not active", "response.error exists", "status remains unchanged"],
	},
	{
		caseId: "ADD-N001",
		type: "additional",
		title: "Notification service evidence",
		sourceDocument: "MoR_BSP_Master.docx",
		sourceSection: "Additional/common requirements, ADD-N001",
		operation: "notification.send",
		method: "POST",
		endpoint: "/internal/notifications",
		requirement: "Buyer notification must support SMS/email and record delivery attempts.",
		expectedOutcome: "Notification log includes channel, provider, status, retry count and linked IRN.",
		requiredEvidence: ["SMS log", "email log", "provider response", "retry policy"],
		requiredAssertions: ["SMS provider exists", "email provider exists", "failure does not block invoice"],
	},
	{
		caseId: "ADD-C001",
		type: "additional",
		title: "Setup and configuration evidence",
		sourceDocument: "MoR_BSP_Master.docx",
		sourceSection: "Additional/common requirements, ADD-C001",
		operation: "setup.validate",
		method: "GET",
		endpoint: "/api/v1/eims/overview",
		requirement:
			"SaaS tenant setup must capture taxpayer, branch, source, credential, certificate and environment readiness.",
		expectedOutcome:
			"Setup report shows enterprise, establishment, MoR source reference, credentials, certificate and blockers.",
		requiredEvidence: [
			"enterprise profile",
			"establishment profile",
			"MoR source number",
			"credential test",
			"certificate status",
		],
		requiredAssertions: ["TIN is 10 digits", "Sub-TIN format valid", "sourceSystemNumber exists", "credentials tested"],
	},
	{
		caseId: "ADD-P001",
		type: "additional",
		title: "Printing layout and content evidence",
		sourceDocument: "MoR_BSP_Master.docx",
		sourceSection: "Additional/common requirements, ADD-P001",
		operation: "print.validate",
		method: "GET",
		endpoint: "/api/v1/eims/print-layouts",
		requirement:
			"Thermal and A4 print layouts must include mandatory fields and official QR only after EIMS acceptance.",
		expectedOutcome: "Both print layouts include IRN, QR, seller/buyer fields where applicable, tax values and total.",
		requiredEvidence: ["thermal print sample", "A4 print sample", "QR scan result", "mandatory field checklist"],
		requiredAssertions: ["compact layout exists", "a4 layout exists", "QR source is EIMS accepted signedQR only"],
	},
] as const;

export const EIMS_ACCEPTANCE_CASE_IDS = EIMS_ACCEPTANCE_CASES.map((testCase) => testCase.caseId);

import { Injectable, NotFoundException } from "@nestjs/common";
import {
	EIMS_ACCEPTANCE_CASES,
	type EimsAcceptanceCaseDefinition,
	type EimsAcceptanceCaseId,
} from "../../shared/constants/eims-acceptance-cases";

type AssertionResult = {
	name: string;
	passed: boolean;
	expected: string;
	actual: string;
};

type AcceptanceEvidence = {
	sourceDocuments: string[];
	morBspCaseId: string;
	checklistEvidence: readonly string[];
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

export type EimsAcceptanceRunResult = EimsAcceptanceCaseDefinition & {
	organizationId: string;
	executionMode: "mock_until_sandbox";
	passed: boolean;
	runId: string;
	request: unknown;
	response: unknown;
	assertions: AssertionResult[];
	evidence: AcceptanceEvidence;
	notes: string[];
};

const acceptedInvoiceIrn = "MOCK-IRN-51fa3144ae45d2a06873a1e81c59ab74";
const acceptedB2bIrn = "MOCK-IRN-B2B-0002";
const ackDate = "2026-05-26T10:30:35.000+03:00";

@Injectable()
export class EimsAcceptanceService {
	listCases() {
		return {
			data: EIMS_ACCEPTANCE_CASES.map((testCase) => ({
				...testCase,
				status: "ready_for_mock",
				sandboxStatus: "blocked_until_credential",
			})),
			meta: {
				source: "docs/EMIS/MoR_BSP_Master.docx plus EIMS API mock collection",
				total: EIMS_ACCEPTANCE_CASES.length,
			},
		};
	}

	getCase(caseId: string) {
		const testCase = this.findCase(caseId);
		return { data: testCase };
	}

	runCase(organizationId: string, caseId: string) {
		const definition = this.findCase(caseId);
		const run = this.buildRun(organizationId, definition);
		return { data: run };
	}

	runAll(organizationId: string) {
		const results = EIMS_ACCEPTANCE_CASES.map((definition) => this.buildRun(organizationId, definition));
		return {
			data: {
				organizationId,
				executionMode: "mock_until_sandbox" as const,
				total: results.length,
				passed: results.filter((result) => result.passed).length,
				failed: results.filter((result) => !result.passed).length,
				results,
			},
		};
	}

	private findCase(caseId: string) {
		const testCase = EIMS_ACCEPTANCE_CASES.find((candidate) => candidate.caseId === caseId);
		if (!testCase) {
			throw new NotFoundException(`Unknown EIMS acceptance case: ${caseId}`);
		}
		return testCase;
	}

	private buildRun(organizationId: string, definition: EimsAcceptanceCaseDefinition): EimsAcceptanceRunResult {
		const fixture = buildFixture(definition.caseId);
		const assertions = buildAssertions(definition.caseId, fixture.request, fixture.response);
		return {
			...definition,
			organizationId,
			executionMode: "mock_until_sandbox",
			passed: assertions.every((assertion) => assertion.passed),
			runId: `${organizationId}-${definition.caseId}-mock-20260526`,
			request: fixture.request,
			response: fixture.response,
			assertions,
			evidence: buildEvidence(definition, fixture),
			notes: [
				"This run uses deterministic backend mock responses until INSA/MoR sandbox credentials are issued.",
				"Layer B must replay the same case IDs against the real sandbox and attach official IRN/RRN/QR evidence.",
			],
		};
	}
}

function buildFixture(caseId: EimsAcceptanceCaseId) {
	switch (caseId) {
		case "IRC-P01":
			return acceptedInvoiceFixture({
				caseId,
				documentNumber: "B2C-VAT-000001",
				transactionType: "B2C",
				documentType: "INV",
				buyer: { Tin: null, LegalName: "Walk-in Customer", VatNumber: null },
				items: [
					itemLine(1, "Doro Wat", "VAT15", "280.00", "1.0000", "42.00", "322.00"),
					itemLine(2, "Bottled water", "VAT0", "40.00", "1.0000", "0.00", "40.00"),
					itemLine(3, "Exempt service", "VATEX", "100.00", "1.0000", "0.00", "100.00"),
				],
				totalValue: "462.00",
				taxValue: "42.00",
				irn: acceptedInvoiceIrn,
			});
		case "IRC-P02":
			return acceptedInvoiceFixture({
				caseId,
				documentNumber: "B2B-VAT-000002",
				transactionType: "B2B",
				documentType: "INV",
				buyer: {
					Tin: "0089238373",
					LegalName: "Taxpayer A Trading PLC",
					VatNumber: "VAT0089238373",
				},
				items: [
					itemLine(1, "Office Chair", "VAT15", "1500.00", "10.0000", "2250.00", "17250.00"),
					itemLine(2, "Office Desk", "EXC5", "3000.00", "5.0000", "750.00", "15750.00"),
				],
				totalValue: "33000.00",
				taxValue: "3000.00",
				irn: acceptedB2bIrn,
				transactionWithholdValue: "600.00",
				discount: "300.00",
				exciseValue: "750.00",
			});
		case "IRC-P03":
			return {
				request: {
					ReceiptNumber: "RCPT-2026-00044",
					ReceiptType: "sales",
					ReceiptDate: ackDate,
					ReceiptCounter: 44,
					SourceSystemType: "POS",
					SourceSystemNumber: "329D03B6F0",
					ReceiptCurrency: "ETB",
					ExchangeRate: "1.0000",
					CollectedAmount: "462.00",
					SellerTIN: "0074136947",
					Invoices: [
						{
							InvoiceIRN: acceptedInvoiceIrn,
							PaymentCoverage: "full",
							InvoicePaidAmount: "462.00",
							DiscountAmount: "0.00",
							RemainingAmount: "0.00",
							TotalAmount: "462.00",
						},
					],
					TransactionDetails: {
						ModeOfPayment: "CASH",
						CollectorName: "Yordanos S.",
						PaymentServiceProvider: "cashier",
					},
				},
				response: successResponse({ Rrn: "MOCK-RRN-00044", SignedQR: "MOCK-SIGNED-RECEIPT-QR-IRC-P03" }),
			};
		case "IRC-P04":
			return {
				request: {
					ReceiptNumber: "WHT-2026-00002",
					Reason: "Transaction withholding receipt",
					ReceiptCounter: 2,
					SourceSystemType: "ERP",
					SourceSystemNumber: "329D03B6F0",
					InvoiceDetail: { InvoiceIRN: acceptedB2bIrn, Currency: "ETB", ExchangeRate: "1.0000" },
					WithholdDetail: {
						Type: "TWHT",
						Rate: "2.00",
						PreTaxAmount: "30000.00",
						WithholdingAmount: "600.00",
					},
				},
				response: successResponse({ Rrn: "MOCK-WHT-RRN-00002", SignedQR: "MOCK-SIGNED-WHT-QR-IRC-P04" }),
			};
		case "IRC-P05":
			return {
				request: { Irn: acceptedInvoiceIrn, ReasonCode: "4", Remark: "Customer returned the order" },
				response: successResponse({ Status: "cancelled", Irn: acceptedInvoiceIrn }),
			};
		case "IRC-P06":
			return acceptedInvoiceFixture({
				caseId,
				documentNumber: "CRE-2026-00003",
				transactionType: "B2C",
				documentType: "CRE",
				reason: "Returned item",
				relatedDocument: acceptedInvoiceIrn,
				buyer: { Tin: null, LegalName: "Walk-in Customer", VatNumber: null },
				items: [itemLine(1, "Returned Doro Wat", "VAT15", "-280.00", "1.0000", "-42.00", "-322.00")],
				totalValue: "-322.00",
				taxValue: "-42.00",
				irn: "MOCK-IRN-CRE-00003",
			});
		case "IRC-P07":
			return acceptedInvoiceFixture({
				caseId,
				documentNumber: "DEB-2026-00004",
				transactionType: "B2B",
				documentType: "DEB",
				reason: "Price adjustment",
				relatedDocument: acceptedB2bIrn,
				buyer: {
					Tin: "0089238373",
					LegalName: "Taxpayer A Trading PLC",
					VatNumber: "VAT0089238373",
				},
				items: [itemLine(1, "Delivery surcharge", "VAT15", "500.00", "1.0000", "75.00", "575.00")],
				totalValue: "575.00",
				taxValue: "75.00",
				irn: "MOCK-IRN-DEB-00004",
			});
		case "IRC-N08":
			return {
				request: acceptedInvoiceFixture({
					caseId,
					documentNumber: "B2B-INVALID-00005",
					transactionType: "B2B",
					documentType: "INV",
					buyer: { Tin: "123", LegalName: "", VatNumber: null },
					items: [itemLine(1, "Invalid buyer test item", "VAT15", "100.00", "1.0000", "15.00", "115.00")],
					totalValue: "115.00",
					taxValue: "15.00",
					irn: "SHOULD-NOT-BE-ISSUED",
				}).request,
				response: errorResponse("7008", "Invalid buyer TIN or legal name for B2B invoice"),
			};
		case "IRC-N09":
			return {
				request: {
					ReceiptNumber: "RCPT-INVALID-00001",
					ReceiptType: "sales",
					Invoices: [{ InvoiceIRN: "MOCK-IRN-CANCELLED-OR-MISSING", PaymentCoverage: "full" }],
				},
				response: errorResponse("7019", "Invoice IRN is not active and cannot receive a receipt"),
			};
		case "IRC-N010":
			return {
				request: { Irn: "MOCK-IRN-ALREADY-CANCELLED", ReasonCode: "1", Remark: "Duplicate cancellation test" },
				response: errorResponse("7002", "Invoice does not exist or is already cancelled"),
			};
		case "ADD-N001":
			return {
				request: { Irn: acceptedInvoiceIrn, channels: ["sms", "email"], buyerPhone: "+251911091245" },
				response: {
					StatusCode: 200,
					Notifications: [
						{ channel: "sms", provider: "Africa's Talking", status: "sent", retryCount: 0 },
						{ channel: "email", provider: "AWS SES", status: "sent", retryCount: 0 },
					],
				},
			};
		case "ADD-C001":
			return {
				request: { organizationId: "org_mock", environment: "sandbox" },
				response: {
					StatusCode: 200,
					Enterprise: { Tin: "0074136947", LegalName: "Habesha Restaurant PLC" },
					Establishment: { SubTin: "0074136947-01", Region: "14", City: "Addis Ababa" },
					SourceSystem: { SystemNumber: "329D03B6F0", SystemType: "POS", approvalStatus: "approved" },
					Credential: { lastTestStatus: "success", secretsReturned: false },
					Certificate: { status: "valid", keyProvider: "Vault Transit" },
				},
			};
		case "ADD-P001":
			return {
				request: { Irn: acceptedInvoiceIrn, layouts: ["compact", "a4"] },
				response: {
					StatusCode: 200,
					PrintLayouts: [
						{ layout: "compact", paper: "80mm thermal", qrSource: "EIMS accepted signedQR only" },
						{ layout: "a4", paper: "A4", qrSource: "EIMS accepted signedQR only" },
					],
					MandatoryFields: ["IRN", "QR", "seller TIN", "buyer details", "item lines", "tax value", "total value"],
				},
			};
	}
}

function acceptedInvoiceFixture(input: {
	caseId: EimsAcceptanceCaseId;
	documentNumber: string;
	transactionType: "B2B" | "B2C";
	documentType: "INV" | "CRE" | "DEB";
	buyer: Record<string, string | null>;
	items: Array<Record<string, string | number>>;
	totalValue: string;
	taxValue: string;
	irn: string;
	reason?: string;
	relatedDocument?: string;
	transactionWithholdValue?: string;
	discount?: string;
	exciseValue?: string;
}) {
	return {
		request: {
			request: {
				TransactionType: input.transactionType,
				DocumentDetails: {
					Type: input.documentType,
					DocumentNumber: input.documentNumber,
					Date: "2026-05-26T10:30:00.000+03:00",
					Reason: input.reason,
					RelatedDocument: input.relatedDocument,
				},
				SellerDetails: {
					Tin: "0074136947",
					LegalName: "Habesha Restaurant PLC",
					VatNumber: "REGVAT123456789",
					Region: "14",
					City: "Addis Ababa",
				},
				BuyerDetails: input.buyer,
				SourceSystem: {
					SystemType: "POS",
					SystemNumber: "329D03B6F0",
					InvoiceCounter: input.caseId === "IRC-P01" ? 129 : 130,
					CashierName: "Yordanos S.",
					PreviousIrn: input.caseId === "IRC-P01" ? null : acceptedInvoiceIrn,
				},
				ItemList: input.items,
				ValueDetails: {
					InvoiceCurrency: "ETB",
					ExchangeRate: "1.0000",
					Discount: input.discount ?? "0.00",
					ExciseValue: input.exciseValue ?? "0.00",
					TaxValue: input.taxValue,
					TransactionWithholdValue: input.transactionWithholdValue ?? "0.00",
					IncomeWithholdValue: "0.00",
					TotalValue: input.totalValue,
				},
				PaymentDetails: { PaymentTerm: "IMMIDIATE", Mode: "CASH" },
			},
			signature: "MOCK-SHA512WITHRSA-SIGNATURE-PENDING-PHASE0",
			certificate: "MOCK-INSA-SANDBOX-CERTIFICATE-PENDING",
		},
		response: successResponse({
			Irn: input.irn,
			SignedQR: `MOCK-SIGNED-QR-${input.caseId}`,
			SignedInvoice: `MOCK-SIGNED-INVOICE-${input.caseId}`,
		}),
	};
}

function itemLine(
	lineNumber: number,
	description: string,
	taxCode: string,
	unitPrice: string,
	quantity: string,
	taxAmount: string,
	totalLineAmount: string,
) {
	return {
		LineNumber: lineNumber,
		NatureOfSupplies: "Goods",
		ItemCode: `ITEM-${lineNumber}`,
		ProductDescription: description,
		UnitPrice: unitPrice,
		Quantity: quantity,
		Unit: "PCS",
		TaxCode: taxCode,
		TaxAmount: taxAmount,
		TotalLineAmount: totalLineAmount,
	};
}

function successResponse(extra: Record<string, unknown>) {
	return { StatusCode: 200, Message: "Accepted by EIMS mock", AckDate: ackDate, ...extra };
}

function errorResponse(code: string, message: string) {
	return { StatusCode: 406, ErrorCode: code, Message: message };
}

type UnknownRecord = Record<string, unknown>;

const asRecord = (value: unknown): UnknownRecord =>
	value && typeof value === "object" && !Array.isArray(value) ? (value as UnknownRecord) : {};

const field = (record: UnknownRecord, key: string) => record[key];
const recordField = (record: UnknownRecord, key: string) => asRecord(record[key]);
const firstRecord = (value: unknown) => asRecord(Array.isArray(value) ? value[0] : undefined);
const pluck = (value: unknown, key: string) =>
	(Array.isArray(value) ? value : []).map((item) => field(asRecord(item), key));

function buildAssertions(caseId: EimsAcceptanceCaseId, request: unknown, response: unknown): AssertionResult[] {
	const req = asRecord(request);
	const res = asRecord(response);
	const invoiceRequest = asRecord(req.request);
	const buyerDetails = recordField(invoiceRequest, "BuyerDetails");
	const documentDetails = recordField(invoiceRequest, "DocumentDetails");
	const valueDetails = recordField(invoiceRequest, "ValueDetails");
	const firstInvoice = firstRecord(req.Invoices);
	const withholdDetail = recordField(req, "WithholdDetail");

	switch (caseId) {
		case "IRC-P01":
			return [
				assert("B2C transaction type", field(invoiceRequest, "TransactionType"), "B2C"),
				assert("Buyer TIN is null", String(field(buyerDetails, "Tin")), "null"),
				assertContains("VAT0 item exists", pluck(field(invoiceRequest, "ItemList"), "TaxCode"), "VAT0"),
				assertContains("VAT15 item exists", pluck(field(invoiceRequest, "ItemList"), "TaxCode"), "VAT15"),
				assertContains("VATEX item exists", pluck(field(invoiceRequest, "ItemList"), "TaxCode"), "VATEX"),
				assertExists("EIMS IRN returned", field(res, "Irn")),
				assertExists("EIMS signed QR returned", field(res, "SignedQR")),
			];
		case "IRC-P02":
			return [
				assert("B2B transaction type", field(invoiceRequest, "TransactionType"), "B2B"),
				assertRegex("Buyer TIN is 10 digits", field(buyerDetails, "Tin"), /^\d{10}$/),
				assertExists("Buyer legal name exists", field(buyerDetails, "LegalName")),
				assertExists("Withholding value exists", field(valueDetails, "TransactionWithholdValue")),
				assertExists("EIMS IRN returned", field(res, "Irn")),
			];
		case "IRC-P03":
			return [
				assert("Receipt references accepted invoice", field(firstInvoice, "InvoiceIRN"), acceptedInvoiceIrn),
				assert("Payment coverage is full", field(firstInvoice, "PaymentCoverage"), "full"),
				assertExists("RRN returned", field(res, "Rrn")),
				assertExists("Signed receipt QR returned", field(res, "SignedQR")),
			];
		case "IRC-P04":
			return [
				assert("Withholding type is TWHT", field(withholdDetail, "Type"), "TWHT"),
				assertNumberGreaterThan("Withholding amount greater than zero", field(withholdDetail, "WithholdingAmount"), 0),
				assertExists("Withholding receipt RRN returned", field(res, "Rrn")),
			];
		case "IRC-P05":
			return [
				assert("Cancellation IRN matches accepted invoice", field(req, "Irn"), acceptedInvoiceIrn),
				assert("Reason code is Others", field(req, "ReasonCode"), "4"),
				assertExists("Remark supplied for reason 4", field(req, "Remark")),
				assert("Cancellation accepted", field(res, "Status"), "cancelled"),
			];
		case "IRC-P06":
			return [
				assert("Document type is credit note", field(documentDetails, "Type"), "CRE"),
				assertExists("Credit note reason exists", field(documentDetails, "Reason")),
				assert(
					"Related document references original invoice",
					field(documentDetails, "RelatedDocument"),
					acceptedInvoiceIrn,
				),
				assertExists("Credit note IRN returned", field(res, "Irn")),
			];
		case "IRC-P07":
			return [
				assert("Document type is debit note", field(documentDetails, "Type"), "DEB"),
				assertExists("Debit note reason exists", field(documentDetails, "Reason")),
				assert(
					"Related document references original B2B invoice",
					field(documentDetails, "RelatedDocument"),
					acceptedB2bIrn,
				),
				assertExists("Debit note IRN returned", field(res, "Irn")),
			];
		case "IRC-N08":
			return [
				assert("Invalid request is B2B", field(invoiceRequest, "TransactionType"), "B2B"),
				assert("Invalid buyer TIN remains invalid", field(buyerDetails, "Tin"), "123"),
				assertExists("Validation error returned", field(res, "ErrorCode")),
				assert("No IRN is issued", String(field(res, "Irn")), "undefined"),
			];
		case "IRC-N09":
			return [
				assert("Receipt references inactive IRN", field(firstInvoice, "InvoiceIRN"), "MOCK-IRN-CANCELLED-OR-MISSING"),
				assertExists("Receipt rejection returned", field(res, "ErrorCode")),
				assert("No RRN is issued", String(field(res, "Rrn")), "undefined"),
			];
		case "IRC-N010":
			return [
				assert("Cancellation references inactive IRN", field(req, "Irn"), "MOCK-IRN-ALREADY-CANCELLED"),
				assertExists("Cancellation rejection returned", field(res, "ErrorCode")),
				assert("No cancellation status returned", String(field(res, "Status")), "undefined"),
			];
		case "ADD-N001":
			return [
				assertContains("SMS channel exists", pluck(field(res, "Notifications"), "channel"), "sms"),
				assertContains("Email channel exists", pluck(field(res, "Notifications"), "channel"), "email"),
				assertContains("SMS provider configured", pluck(field(res, "Notifications"), "provider"), "Africa's Talking"),
			];
		case "ADD-C001":
			return [
				assertRegex("Enterprise TIN is 10 digits", field(recordField(res, "Enterprise"), "Tin"), /^\d{10}$/),
				assertRegex("Sub-TIN format is valid", field(recordField(res, "Establishment"), "SubTin"), /^\d{10}-\d{2}$/),
				assertExists("MoR source number exists", field(recordField(res, "SourceSystem"), "SystemNumber")),
				assert("Credential test is successful", field(recordField(res, "Credential"), "lastTestStatus"), "success"),
				assert("Secrets are not returned", String(field(recordField(res, "Credential"), "secretsReturned")), "false"),
			];
		case "ADD-P001":
			return [
				assertContains("Compact print layout exists", pluck(field(res, "PrintLayouts"), "layout"), "compact"),
				assertContains("A4 print layout exists", pluck(field(res, "PrintLayouts"), "layout"), "a4"),
				assertContains("IRN is mandatory", field(res, "MandatoryFields"), "IRN"),
				assertContains("QR is mandatory", field(res, "MandatoryFields"), "QR"),
			];
	}
}

function buildEvidence(definition: EimsAcceptanceCaseDefinition, fixture: { request: unknown; response: unknown }) {
	const response = asRecord(fixture.response);
	const evidence: AcceptanceEvidence = {
		sourceDocuments: [definition.sourceDocument, "EimsCoreApiMockCollection2.postman_collection.json"],
		morBspCaseId: definition.caseId,
		checklistEvidence: definition.requiredEvidence,
	};

	if (definition.caseId === "IRC-P01" || definition.caseId === "IRC-P02" || definition.caseId === "ADD-P001") {
		evidence.printEvidence = {
			layouts: ["compact", "a4"],
			mandatoryFields: ["IRN", "QR", "seller TIN", "document number", "tax value", "total value"],
			qrSource: "EIMS accepted signedQR only",
		};
	}

	if (definition.caseId === "ADD-N001") {
		evidence.notificationEvidence = {
			channels: ["sms", "email"],
			providers: ["Africa's Talking", "AWS SES"],
			retryPolicy: "3 attempts with exponential backoff; notification failure does not block invoice acceptance",
		};
	}

	evidence.complianceArtifacts = [
		response.Irn ? `signed-invoice-${definition.caseId}.json` : `error-response-${definition.caseId}.json`,
		`audit-event-${definition.caseId}.json`,
		`request-payload-${definition.caseId}.json`,
	];

	return evidence;
}

function assert(name: string, actual: unknown, expected: string): AssertionResult {
	return { name, passed: String(actual) === expected, expected, actual: String(actual) };
}

function assertExists(name: string, actual: unknown): AssertionResult {
	return {
		name,
		passed: actual !== undefined && actual !== null && actual !== "",
		expected: "present",
		actual: String(actual),
	};
}

function assertContains(name: string, actual: unknown, expected: string): AssertionResult {
	const values = Array.isArray(actual) ? actual.map(String) : [String(actual)];
	return { name, passed: values.includes(expected), expected, actual: values.join(", ") };
}

function assertRegex(name: string, actual: unknown, regex: RegExp): AssertionResult {
	const value = String(actual ?? "");
	return { name, passed: regex.test(value), expected: String(regex), actual: value };
}

function assertNumberGreaterThan(name: string, actual: unknown, threshold: number): AssertionResult {
	const value = Number(actual);
	return { name, passed: value > threshold, expected: `> ${threshold}`, actual: String(actual) };
}

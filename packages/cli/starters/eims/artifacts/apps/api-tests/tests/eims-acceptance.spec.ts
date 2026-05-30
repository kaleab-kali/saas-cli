import { type APIRequestContext, expect, test } from "@playwright/test";

const expectedCaseIds = [
	"IRC-P01",
	"IRC-P02",
	"IRC-P03",
	"IRC-P04",
	"IRC-P05",
	"IRC-P06",
	"IRC-P07",
	"IRC-N08",
	"IRC-N09",
	"IRC-N010",
	"ADD-N001",
	"ADD-C001",
	"ADD-P001",
] as const;

type AcceptanceRun = {
	caseId: string;
	passed: boolean;
	endpoint: string;
	request: AcceptanceRequest;
	response: AcceptanceResponse;
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
		complianceArtifacts?: string[];
	};
};

type AcceptanceRequest = {
	request: {
		TransactionType?: string;
		BuyerDetails: { Tin?: string };
		DocumentDetails: { Type?: string; Reason?: string; RelatedDocument?: string };
	};
	Invoices: Array<{ InvoiceIRN?: string; PaymentCoverage?: string }>;
	WithholdDetail: { Type?: string; PreTaxAmount?: string; WithholdingAmount?: string };
	Irn?: string;
	ReasonCode?: string;
	Remark?: string;
	[key: string]: unknown;
};

type AcceptanceResponse = {
	Irn?: string;
	SignedQR?: string;
	Rrn?: string;
	Status?: string;
	StatusCode?: number;
	ErrorCode?: string;
	Notifications: Array<{ channel: string; provider: string }>;
	Enterprise: { tin?: string; Tin?: string };
	Establishment: { subTin: string };
	SourceSystem: { systemNumber: string };
	Credential: { lastTestStatus: string };
	PrintLayouts: Array<{ layout: string }>;
	MandatoryFields: string[];
	[key: string]: unknown;
};

test.describe("EIMS MoR BSP acceptance cases", () => {
	test("provider acceptance runner is only available through super-admin routes", async ({ request }) => {
		const tenantResponse = await request.get("/api/v1/eims/acceptance/cases");
		expect(tenantResponse.status()).toBe(404);

		const adminResponse = await request.get("/api/v1/admin/eims/acceptance/cases");
		expect(adminResponse.status()).toBe(200);
	});

	test("case catalog exactly covers MoR BSP positive, negative, and additional scenarios", async ({ request }) => {
		const response = await request.get("/api/v1/admin/eims/acceptance/cases");
		expect(response.status()).toBe(200);

		const body = await response.json();
		const caseIds = body.data.map((testCase: { caseId: string }) => testCase.caseId);
		expect(caseIds).toEqual(expectedCaseIds);

		for (const testCase of body.data) {
			expect(testCase.sourceDocument).toBe("MoR_BSP_Master.docx");
			expect(testCase.endpoint).toMatch(/^\/(v1|api\/v1|internal)\//);
			expect(testCase.operation).toMatch(/invoice|receipt|notification|setup|print/);
			expect(testCase.requiredEvidence.length).toBeGreaterThan(0);
			expect(testCase.requiredAssertions.length).toBeGreaterThan(0);
			expect(testCase.status).toBe("ready_for_mock");
			expect(testCase.sandboxStatus).toBe("blocked_until_credential");
		}
	});

	test("run-all executes every BSP case and returns detailed assertion/evidence data", async ({ request }) => {
		const response = await request.post("/api/v1/admin/eims/acceptance/run-all", { data: {} });
		expect([200, 201]).toContain(response.status());

		const body = await response.json();
		expect(body.data.total).toBe(expectedCaseIds.length);
		expect(body.data.passed).toBe(expectedCaseIds.length);
		expect(body.data.failed).toBe(0);
		expect(body.data.results.map((result: AcceptanceRun) => result.caseId)).toEqual(expectedCaseIds);

		for (const result of body.data.results as AcceptanceRun[]) {
			expect(result.passed).toBe(true);
			expect(result.assertions.length).toBeGreaterThan(0);
			expect(result.assertions.every((assertion) => assertion.passed)).toBe(true);
			expect(result.evidence.morBspCaseId).toBe(result.caseId);
			expect(result.evidence.sourceDocuments).toEqual(
				expect.arrayContaining(["MoR_BSP_Master.docx", "EimsCoreApiMockCollection2.postman_collection.json"]),
			);
			expect(result.evidence.checklistEvidence.length).toBeGreaterThan(0);
			expect(result.evidence.complianceArtifacts).toEqual(
				expect.arrayContaining([`request-payload-${result.caseId}.json`, `response-${result.caseId}.json`]),
			);
		}
	});

	test("IRC-P01 validates B2C VAT invoice fields, accepted IRN, QR and print evidence", async ({ request }) => {
		const result = await runCase(request, "IRC-P01");
		const eimsRequest = result.request.request;

		expect(eimsRequest.TransactionType).toBe("B2C");
		expect(eimsRequest.BuyerDetails.Tin).toBeNull();
		expect(eimsRequest.SellerDetails.Tin).toMatch(/^\d{10}$/);
		expect(eimsRequest.SellerDetails.VatNumber).toBeTruthy();
		expect(eimsRequest.SourceSystem.SystemNumber).toBe("329D03B6F0");
		expect(eimsRequest.SourceSystem.InvoiceCounter).toBeGreaterThan(0);
		expect(eimsRequest.ItemList.map((item: { TaxCode: string }) => item.TaxCode)).toEqual(
			expect.arrayContaining(["VAT0", "VAT15", "VATEX"]),
		);
		expect(result.response.Irn).toMatch(/^TEST-IRN-/);
		expect(result.response.SignedQR).toContain("IRC-P01");
		expect(result.evidence.printEvidence).toMatchObject({
			layouts: expect.arrayContaining(["compact", "a4"]),
			qrSource: "EIMS accepted signedQR only",
		});
		expect(result.evidence.printEvidence?.mandatoryFields).toEqual(expect.arrayContaining(["IRN", "QR", "seller TIN"]));
	});

	test("IRC-P02 validates B2B buyer identity, withholding, excise-capable items and accepted IRN", async ({
		request,
	}) => {
		const result = await runCase(request, "IRC-P02");
		const eimsRequest = result.request.request;

		expect(eimsRequest.TransactionType).toBe("B2B");
		expect(eimsRequest.BuyerDetails.Tin).toMatch(/^\d{10}$/);
		expect(eimsRequest.BuyerDetails.LegalName).toContain("Taxpayer");
		expect(eimsRequest.ValueDetails.TransactionWithholdValue).toBe("600.00");
		expect(eimsRequest.ItemList.map((item: { TaxCode: string }) => item.TaxCode)).toEqual(
			expect.arrayContaining(["VAT15", "EXC5"]),
		);
		expect(result.response.Irn).toBe("MOCK-IRN-B2B-0002");
		expect(result.evidence.checklistEvidence).toEqual(
			expect.arrayContaining(["withholding values", "buyer TIN validation"]),
		);
	});

	test("receipt cases validate linked invoice IRN, RRN and withholding detail", async ({ request }) => {
		const salesReceipt = await runCase(request, "IRC-P03");
		expect(salesReceipt.request.Invoices[0]).toMatchObject({
			InvoiceIRN: expect.stringMatching(/^TEST-IRN-/),
			PaymentCoverage: "full",
		});
		expect(salesReceipt.response.Rrn).toMatch(/^MOCK-RRN-/);
		expect(salesReceipt.response.SignedQR).toBeTruthy();

		const withholdingReceipt = await runCase(request, "IRC-P04");
		expect(withholdingReceipt.request.WithholdDetail).toMatchObject({
			Type: "TWHT",
			Rate: "2.00",
			WithholdingAmount: "600.00",
		});
		expect(Number(withholdingReceipt.request.WithholdDetail.PreTaxAmount)).toBeGreaterThan(0);
		expect(withholdingReceipt.response.Rrn).toMatch(/^MOCK-WHT-RRN-/);
	});

	test("credit, debit and cancellation cases validate related-document and reason rules", async ({ request }) => {
		const cancellation = await runCase(request, "IRC-P05");
		expect(cancellation.request).toMatchObject({
			ReasonCode: "4",
			Remark: expect.any(String),
		});
		expect(cancellation.response.Status).toBe("cancelled");

		const credit = await runCase(request, "IRC-P06");
		expect(credit.request.request.DocumentDetails).toMatchObject({
			Type: "CRE",
			Reason: expect.any(String),
			RelatedDocument: expect.stringMatching(/^TEST-IRN-/),
		});
		expect(credit.response.Irn).toMatch(/^MOCK-IRN-CRE-/);

		const debit = await runCase(request, "IRC-P07");
		expect(debit.request.request.DocumentDetails).toMatchObject({
			Type: "DEB",
			Reason: expect.any(String),
			RelatedDocument: "MOCK-IRN-B2B-0002",
		});
		expect(debit.response.Irn).toMatch(/^MOCK-IRN-DEB-/);
	});

	test("negative cases reject bad buyer, invalid receipt invoice, and duplicate cancellation without official IDs", async ({
		request,
	}) => {
		const invalidBuyer = await runCase(request, "IRC-N08");
		expect(invalidBuyer.request.request.TransactionType).toBe("B2B");
		expect(invalidBuyer.request.request.BuyerDetails.Tin).toBe("123");
		expect(invalidBuyer.response).toMatchObject({ StatusCode: 406, ErrorCode: "7008" });
		expect(invalidBuyer.response.Irn).toBeUndefined();

		const invalidReceipt = await runCase(request, "IRC-N09");
		expect(invalidReceipt.request.Invoices[0].InvoiceIRN).toBe("MOCK-IRN-CANCELLED-OR-MISSING");
		expect(invalidReceipt.response).toMatchObject({ StatusCode: 406, ErrorCode: "7019" });
		expect(invalidReceipt.response.Rrn).toBeUndefined();

		const invalidCancel = await runCase(request, "IRC-N010");
		expect(invalidCancel.request.Irn).toBe("MOCK-IRN-ALREADY-CANCELLED");
		expect(invalidCancel.response).toMatchObject({ StatusCode: 406, ErrorCode: "7002" });
		expect(invalidCancel.response.Status).toBeUndefined();
	});

	test("additional cases cover notifications, setup/configuration, and print checklist evidence", async ({
		request,
	}) => {
		const notification = await runCase(request, "ADD-N001");
		expect(notification.response.Notifications.map((item: { channel: string }) => item.channel)).toEqual(
			expect.arrayContaining(["sms", "email"]),
		);
		expect(notification.response.Notifications.map((item: { provider: string }) => item.provider)).toEqual(
			expect.arrayContaining(["Africa's Talking", "AWS SES"]),
		);

		const setup = await runCase(request, "ADD-C001");
		expect(setup.response.Enterprise.tin ?? setup.response.Enterprise.Tin).toMatch(/^\d{10}$/);
		expect(setup.response.Establishment.subTin).toMatch(/^\d{10}-\d{2}$/);
		expect(setup.response.SourceSystem.systemNumber).toBe("329D03B6F0");
		expect(setup.response.Credential.lastTestStatus).toBe("success");

		const print = await runCase(request, "ADD-P001");
		expect(print.response.PrintLayouts.map((layout: { layout: string }) => layout.layout)).toEqual(
			expect.arrayContaining(["compact", "a4"]),
		);
		expect(print.response.MandatoryFields).toEqual(expect.arrayContaining(["IRN", "QR", "seller TIN"]));
		expect(print.evidence.printEvidence?.qrSource).toBe("EIMS accepted signedQR only");
	});
});

async function runCase(request: APIRequestContext, caseId: string) {
	const response = await request.post(`/api/v1/admin/eims/acceptance/cases/${caseId}/run`, { data: {} });
	expect([200, 201]).toContain(response.status());
	const body = await response.json();
	expect(body.data.caseId).toBe(caseId);
	expect(body.data.passed).toBe(true);
	expect(body.data.assertions.every((assertion: { passed: boolean }) => assertion.passed)).toBe(true);
	return body.data as AcceptanceRun;
}

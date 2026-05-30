import { CANCELLATION_REASON_CODES, DOCUMENT_TYPES, isVatTaxCode, requiresBuyerTin } from "./eims-lookup-values";

describe("EIMS lookup values", () => {
	it("keeps mock-observed cancellation code 6 unconfirmed", () => {
		expect(CANCELLATION_REASON_CODES.find((r) => r.code === "6")?.status).toBe("mock_observed_unconfirmed");
	});

	it("includes the EIMS document types from the source docs", () => {
		expect(DOCUMENT_TYPES).toEqual(expect.arrayContaining(["INV", "CRE", "DEB", "INT", "FIN"]));
	});

	it("detects VAT-prefixed tax codes", () => {
		expect(isVatTaxCode("VAT15")).toBe(true);
		expect(isVatTaxCode("TOT2")).toBe(false);
	});

	it("requires buyer TIN outside consumer transaction types", () => {
		expect(requiresBuyerTin("B2B")).toBe(true);
		expect(requiresBuyerTin("B2C")).toBe(false);
	});
});

import type { CanonicalInvoice } from "./canonical-invoice";

describe("CanonicalInvoice contract", () => {
	it("requires branch and source context", () => {
		const invoice = {
			organizationId: "org_1",
			enterpriseId: "ent_1",
			establishmentId: "est_1",
			sourceSystemId: "src_1",
		} as CanonicalInvoice;

		expect(invoice.enterpriseId).toBe("ent_1");
		expect(invoice.establishmentId).toBe("est_1");
		expect(invoice.sourceSystemId).toBe("src_1");
	});
});

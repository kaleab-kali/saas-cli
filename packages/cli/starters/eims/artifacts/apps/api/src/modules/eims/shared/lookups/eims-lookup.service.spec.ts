import { EimsLookupService } from "./eims-lookup.service";

describe("EimsLookupService", () => {
	it("returns deterministic ETag and cache-control metadata for seeded code lists", () => {
		const service = new EimsLookupService();

		const first = service.get("document-types");
		const second = service.get("document-types");

		expect(first.version).toBe("eims-lookup-seed-v3");
		expect(first.etag).toMatch(/^"[a-f0-9]{32}"$/);
		expect(first.cacheControl).toBe("private, max-age=300");
		expect(first.etag).toBe(second.etag);
	});

	it("uses different ETags for different lookup registries", () => {
		const service = new EimsLookupService();

		expect(service.get("document-types").etag).not.toBe(service.get("transaction-types").etag);
	});

	it("matches conditional If-None-Match requests against the current ETag", () => {
		const service = new EimsLookupService();
		const etag = service.get("document-types").etag;

		expect(service.matchesEtag("document-types", `W/"older", ${etag}`)).toBe(true);
		expect(service.matchesEtag("document-types", '"missing"')).toBe(false);
	});
});

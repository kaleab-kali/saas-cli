const baseUrl = process.env.API_E2E_BASE_URL;
const describeIfServer = baseUrl ? describe : describe.skip;

describeIfServer("API health e2e", () => {
	it("GET /health returns ok", async () => {
		const response = await fetch(`${baseUrl}/health`);
		expect(response.ok).toBe(true);
		const body = await response.json();
		expect(body.status).toBe("ok");
	});
});

if (!baseUrl) {
	describe("API health e2e", () => {
		it("skips until API_E2E_BASE_URL is set", () => {
			console.log("API_E2E_BASE_URL is not set. Skipping API e2e smoke test.");
		});
	});
}

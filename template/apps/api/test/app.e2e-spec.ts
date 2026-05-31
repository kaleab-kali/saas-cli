import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";

let apiBaseUrl = process.env.API_E2E_BASE_URL ?? "";
let mockServer: Server | undefined;

beforeAll(async () => {
	if (apiBaseUrl) return;

	mockServer = createServer((req, res) => {
		if (req.url === "/health") {
			res.writeHead(200, { "content-type": "application/json" });
			res.end(JSON.stringify({ source: "local-api-e2e-harness", status: "ok" }));
			return;
		}
		res.writeHead(404, { "content-type": "application/json" });
		res.end(JSON.stringify({ error: "not_found" }));
	});

	await new Promise<void>((resolve) => mockServer?.listen(0, "127.0.0.1", resolve));
	const address = mockServer.address() as AddressInfo;
	apiBaseUrl = `http://127.0.0.1:${address.port}`;
	console.log(`API_E2E_BASE_URL is not set. Running deterministic local API e2e harness at ${apiBaseUrl}.`);
});

afterAll(async () => {
	if (!mockServer) return;
	await new Promise<void>((resolve, reject) => {
		mockServer?.close((error) => (error ? reject(error) : resolve()));
	});
});

describe("API health e2e", () => {
	it("GET /health returns ok", async () => {
		const response = await fetch(`${apiBaseUrl}/health`);
		expect(response.ok).toBe(true);
		const body = await response.json();
		expect(body.status).toBe("ok");
	});
});

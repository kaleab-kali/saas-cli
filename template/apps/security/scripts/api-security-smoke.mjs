import http from "node:http";

const createMockApi = () =>
	http.createServer((req, res) => {
		const url = new URL(req.url ?? "/", "http://127.0.0.1");
		const send = (status, body) => {
			res.writeHead(status, {
				"content-type": "application/json",
				"x-content-type-options": "nosniff",
				"x-frame-options": "DENY",
			});
			res.end(JSON.stringify(body));
		};

		if (url.pathname === "/health") return send(200, { ok: true });
		if (url.pathname === "/api/v1/admin/stats") return send(401, { error: "unauthorized" });
		if (url.pathname === "/api/v1/billing/capabilities") return send(401, { error: "unauthorized" });
		return send(404, { error: "not found" });
	});

let server = null;
let baseUrl = process.env.SECURITY_API_BASE_URL ?? process.env.API_BASE_URL;
if (!baseUrl) {
	server = createMockApi();
	await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
	const address = server.address();
	const port = typeof address === "object" && address ? address.port : 0;
	baseUrl = `http://127.0.0.1:${port}`;
	console.log(`Running API security smoke tests against local mock API at ${baseUrl}`);
}

const checks = [];

const request = async (path, init) => {
	const response = await fetch(new URL(path, baseUrl), init);
	const text = await response.text();
	return { response, text };
};

checks.push(async () => {
	const { response } = await request("/health");
	if (!response.ok) throw new Error(`health expected 200, got ${response.status}`);
});

checks.push(async () => {
	const { response } = await request("/api/v1/admin/stats");
	if (![401, 403].includes(response.status)) {
		throw new Error(`unauthenticated admin/stats expected 401/403, got ${response.status}`);
	}
});

checks.push(async () => {
	const { response } = await request("/api/v1/billing/capabilities");
	if (![401, 403].includes(response.status)) {
		throw new Error(`unauthenticated billing/capabilities expected 401/403, got ${response.status}`);
	}
});

checks.push(async () => {
	const { response } = await request("/api/v1/__missing_security_test_route__");
	if (response.status < 400 || response.status >= 600) {
		throw new Error(`missing route expected 4xx/5xx, got ${response.status}`);
	}
});

const failures = [];
try {
	for (const check of checks) {
		try {
			await check();
		} catch (error) {
			failures.push(error instanceof Error ? error.message : String(error));
		}
	}
} finally {
	if (server) await new Promise((resolve) => server.close(resolve));
}

if (failures.length > 0) {
	for (const failure of failures) console.error(`[security-api] ${failure}`);
	process.exit(1);
}

console.log(`Security API smoke passed against ${baseUrl}`);

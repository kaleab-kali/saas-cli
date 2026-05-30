const baseUrl = process.env.SECURITY_API_BASE_URL ?? process.env.API_BASE_URL;

if (!baseUrl) {
	console.log("SECURITY_API_BASE_URL/API_BASE_URL is not set. Skipping API security smoke tests.");
	process.exit(0);
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
for (const check of checks) {
	try {
		await check();
	} catch (error) {
		failures.push(error instanceof Error ? error.message : String(error));
	}
}

if (failures.length > 0) {
	for (const failure of failures) console.error(`[security-api] ${failure}`);
	process.exit(1);
}

console.log(`Security API smoke passed against ${baseUrl}`);

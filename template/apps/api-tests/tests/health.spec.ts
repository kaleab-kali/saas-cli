import { expect, test } from "@playwright/test";

const baseUrl = process.env.API_BASE_URL;

test.skip(!baseUrl, "Set API_BASE_URL to run HTTP API tests.");

test("health endpoint returns ok", async ({ request }) => {
	const response = await request.get("/health");
	expect(response.ok()).toBe(true);
	await expect(response.json()).resolves.toMatchObject({ status: "ok" });
});

test("liveness endpoint returns process status", async ({ request }) => {
	const response = await request.get("/health/live");
	expect(response.ok()).toBe(true);
	await expect(response.json()).resolves.toMatchObject({
		status: "ok",
		uptimeSeconds: expect.any(Number),
		timestamp: expect.any(String),
	});
});

test("readiness endpoint returns dependency status", async ({ request }) => {
	const response = await request.get("/health/ready");
	expect(response.ok()).toBe(true);
	const body = await response.json();
	expect(body.status).toBe("ok");
	expect(body.dependencies.database.status).toBeTruthy();
});

test("missing API route returns an HTTP error response", async ({ request }) => {
	const response = await request.get("/api/v1/__missing_api_test_route__");
	expect(response.status()).toBeGreaterThanOrEqual(400);
	expect(response.status()).toBeLessThan(600);
});

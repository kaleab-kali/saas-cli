import { expect, test } from "@playwright/test";

const baseUrl = process.env.API_BASE_URL;
const sessionCookie = process.env.API_TEST_SESSION_COOKIE;
const testEmail = process.env.API_TEST_EMAIL;
const testPassword = process.env.API_TEST_PASSWORD;
const testOrgSlug = process.env.API_TEST_ORG_SLUG ?? "acme";
const frontendOrigin = process.env.API_TEST_FRONTEND_ORIGIN ?? "http://localhost:5173";
const usesMockServer = process.env.API_TEST_USES_MOCK_SERVER === "1";

test.skip(!baseUrl, "Set API_BASE_URL to run HTTP API tests.");

test("capabilities endpoint is protected without a tenant session", async ({ request }) => {
	test.skip(usesMockServer, "The mock server keeps capabilities public so frontend smoke tests can boot without auth.");
	const response = await request.get("/api/v1/billing/capabilities");
	expect([401, 403]).toContain(response.status());
});

test("capabilities endpoint returns plan data with an authenticated session", async ({ request }) => {
	test.skip(
		!sessionCookie && (!testEmail || !testPassword),
		"Set API_TEST_SESSION_COOKIE or API_TEST_EMAIL/API_TEST_PASSWORD to test authenticated capability payloads.",
	);

	const requestOptions = sessionCookie ? { headers: { cookie: sessionCookie } } : undefined;

	if (!sessionCookie) {
		const signIn = await request.post("/api/auth/sign-in/email", {
			data: { email: testEmail, password: testPassword },
			headers: { origin: frontendOrigin },
		});
		expect(signIn.ok()).toBe(true);

		const setActive = await request.post("/api/auth/organization/set-active", {
			data: { organizationSlug: testOrgSlug },
			headers: { origin: frontendOrigin },
		});
		expect(setActive.ok()).toBe(true);
	}

	const response = await request.get("/api/v1/billing/capabilities", requestOptions);
	expect(response.ok()).toBe(true);
	const body = await response.json();
	expect(body.data).toBeTruthy();
	expect(body.data["core.access"]).toBeTruthy();
});

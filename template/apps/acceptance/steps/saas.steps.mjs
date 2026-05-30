import assert from "node:assert/strict";
import { Given, setDefaultTimeout, Then, When } from "@cucumber/cucumber";

setDefaultTimeout(15_000);

const baseUrl = () => process.env.ACCEPTANCE_BASE_URL?.replace(/\/$/, "");
let generatedSessionCookie = null;
const sessionCookie = () => process.env.ACCEPTANCE_SESSION_COOKIE ?? generatedSessionCookie;

const cookieFrom = (response) => {
	const setCookie = response.headers.get("set-cookie");
	return setCookie?.split(";")[0] ?? null;
};

const ensureTenantSession = async () => {
	if (sessionCookie()) return;

	const email = process.env.ACCEPTANCE_USER_EMAIL;
	const password = process.env.ACCEPTANCE_USER_PASSWORD;
	assert.ok(
		email && password,
		"Set ACCEPTANCE_SESSION_COOKIE or ACCEPTANCE_USER_EMAIL/ACCEPTANCE_USER_PASSWORD for authenticated tenant acceptance tests",
	);

	const origin = process.env.ACCEPTANCE_FRONTEND_ORIGIN ?? "http://localhost:5173";
	const orgSlug = process.env.ACCEPTANCE_ORG_SLUG ?? "acme";
	const signIn = await fetch(`${baseUrl()}/api/auth/sign-in/email`, {
		method: "POST",
		headers: { "Content-Type": "application/json", Origin: origin },
		body: JSON.stringify({ email, password }),
	});
	assert.equal(signIn.status, 200, await signIn.text());

	generatedSessionCookie = cookieFrom(signIn);
	assert.ok(generatedSessionCookie, "Sign-in did not return a session cookie");

	const setActive = await fetch(`${baseUrl()}/api/auth/organization/set-active`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Cookie: generatedSessionCookie,
			Origin: origin,
		},
		body: JSON.stringify({ organizationSlug: orgSlug }),
	});
	assert.equal(setActive.status, 200, await setActive.text());

	generatedSessionCookie = cookieFrom(setActive) ?? generatedSessionCookie;
};

const request = async (path, options = {}) => {
	const headers = {
		Accept: "application/json",
		...(options.body ? { "Content-Type": "application/json" } : {}),
		...(sessionCookie() ? { Cookie: sessionCookie() } : {}),
		...options.headers,
	};
	const response = await fetch(`${baseUrl()}${path}`, { ...options, headers });
	let json = null;
	const text = await response.text();
	if (text) {
		try {
			json = JSON.parse(text);
		} catch {
			json = { raw: text };
		}
	}
	return { response, json };
};

Given("I have an authenticated tenant session", async () => {
	assert.ok(baseUrl(), "ACCEPTANCE_BASE_URL is required");
	await ensureTenantSession();
	assert.ok(sessionCookie(), "Authenticated tenant session is required");
});

When("I request my billing capabilities", async function () {
	const result = await request("/api/v1/billing/capabilities");
	this.response = result.response;
	this.json = result.json;
});

When("I request my team members", async function () {
	const result = await request("/api/v1/team/members");
	this.response = result.response;
	this.json = result.json;
});

Then("the response status is {int}", function (status) {
	assert.equal(this.response?.status, status, JSON.stringify(this.json));
});

Then("the capability response includes {string}", function (featureKey) {
	assert.ok(this.json?.data?.[featureKey], `Missing capability ${featureKey}`);
});

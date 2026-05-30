import { type APIRequestContext, expect, test } from "@playwright/test";

const baseUrl = process.env.API_BASE_URL;
const tenantEmail = process.env.API_TEST_EMAIL;
const tenantPassword = process.env.API_TEST_PASSWORD;
const adminEmail = process.env.API_TEST_ADMIN_EMAIL;
const adminPassword = process.env.API_TEST_ADMIN_PASSWORD;
const orgSlug = process.env.API_TEST_ORG_SLUG ?? "acme";
const frontendOrigin = process.env.API_TEST_FRONTEND_ORIGIN ?? "http://localhost:5173";

test.skip(!baseUrl, "Set API_BASE_URL to run SaaS critical-path API tests.");
test.describe.configure({ mode: "serial" });

const signInTenant = async (request: APIRequestContext) => {
	test.skip(!tenantEmail || !tenantPassword, "Set API_TEST_EMAIL and API_TEST_PASSWORD.");

	const signIn = await request.post("/api/auth/sign-in/email", {
		data: { email: tenantEmail, password: tenantPassword },
		headers: { origin: frontendOrigin },
	});
	expect(signIn.ok(), await signIn.text()).toBe(true);

	const setActive = await request.post("/api/auth/organization/set-active", {
		data: { organizationSlug: orgSlug },
		headers: { origin: frontendOrigin },
	});
	expect(setActive.ok(), await setActive.text()).toBe(true);
};

const signInAdmin = async (request: APIRequestContext) => {
	test.skip(!adminEmail || !adminPassword, "Set API_TEST_ADMIN_EMAIL and API_TEST_ADMIN_PASSWORD.");

	const signIn = await request.post("/api/admin-auth/sign-in/email", {
		data: { email: adminEmail, password: adminPassword },
		headers: { origin: frontendOrigin },
	});
	expect(signIn.ok(), await signIn.text()).toBe(true);
};

test("seeded tenant billing has plans, entitlements, and cancel/resume lifecycle", async ({ request }) => {
	await signInTenant(request);

	const plans = await request.get("/api/v1/billing/plans");
	expect(plans.ok(), await plans.text()).toBe(true);
	const plansBody = await plans.json();
	expect(plansBody.data.map((plan: { slug: string }) => plan.slug)).toEqual(
		expect.arrayContaining(["free", "pro", "enterprise"]),
	);

	const subscription = await request.get("/api/v1/billing/subscription");
	expect(subscription.ok(), await subscription.text()).toBe(true);
	const subscriptionBody = await subscription.json();
	expect(subscriptionBody.data.subscription.status).toBe("active");
	expect(subscriptionBody.data.plan.slug).toBe("pro");

	const entitlements = await request.get("/api/v1/billing/entitlements");
	expect(entitlements.ok(), await entitlements.text()).toBe(true);
	const entitlementsBody = await entitlements.json();
	expect(entitlementsBody.data["platform.api-keys"].enabled).toBe(true);
	expect(entitlementsBody.data["platform.custom-roles"].enabled).toBe(true);

	const cancel = await request.post("/api/v1/billing/subscription/cancel", { data: { immediate: false } });
	expect(cancel.ok(), await cancel.text()).toBe(true);
	const canceled = await cancel.json();
	expect(canceled.data.cancelAtPeriodEnd).toBe(true);

	const resume = await request.post("/api/v1/billing/subscription/resume", { data: {} });
	expect(resume.ok(), await resume.text()).toBe(true);
	const resumed = await resume.json();
	expect(resumed.data.cancelAtPeriodEnd).toBe(false);
});

test("tenant team API protects the last owner from demotion or removal", async ({ request }) => {
	await signInTenant(request);

	const members = await request.get("/api/v1/team/members");
	expect(members.ok(), await members.text()).toBe(true);
	const membersBody = await members.json();
	const owner = membersBody.data.find((member: { role: string }) => member.role === "owner");
	expect(owner).toBeTruthy();

	const demote = await request.patch(`/api/v1/team/members/${owner.id}`, { data: { role: "viewer" } });
	expect(demote.status()).toBeGreaterThanOrEqual(400);

	const remove = await request.delete(`/api/v1/team/members/${owner.id}`);
	expect(remove.status()).toBeGreaterThanOrEqual(400);
});

test("platform admin API can suspend and restore a tenant", async ({ request }) => {
	await signInAdmin(request);

	const list = await request.get("/api/v1/admin/organizations", { params: { search: "Acme" } });
	expect(list.ok(), await list.text()).toBe(true);
	const listBody = await list.json();
	const org = listBody.data.find((item: { slug: string | null }) => item.slug === orgSlug);
	expect(org).toBeTruthy();

	const suspend = await request.post(`/api/v1/admin/organizations/${org.id}/suspend`, {
		data: { reason: "api test suspension" },
	});
	expect(suspend.ok(), await suspend.text()).toBe(true);

	const suspended = await request.get(`/api/v1/admin/organizations/${org.id}`);
	expect(suspended.ok(), await suspended.text()).toBe(true);
	expect((await suspended.json()).data.suspendedAt).toBeTruthy();

	const unsuspend = await request.post(`/api/v1/admin/organizations/${org.id}/unsuspend`, { data: {} });
	expect(unsuspend.ok(), await unsuspend.text()).toBe(true);

	const restored = await request.get(`/api/v1/admin/organizations/${org.id}`);
	expect(restored.ok(), await restored.text()).toBe(true);
	expect((await restored.json()).data.suspendedAt).toBeFalsy();
});

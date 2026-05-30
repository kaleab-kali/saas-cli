import { expect, test } from "@playwright/test";

test.describe("Scaffold management backend mock contract", () => {
	test("tenant team management creates and cancels invitations with persisted data", async ({ request }) => {
		const members = await request.get("/api/v1/team/members");
		expect(members.ok(), await members.text()).toBe(true);
		const membersBody = await members.json();
		expect(membersBody.data).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					id: "mem_owner",
					role: "owner",
					user: expect.objectContaining({ email: "owner@example.com" }),
				}),
			]),
		);

		const invite = await request.post("/api/v1/team/invitations", {
			data: { email: "qa-member@example.com", role: "viewer" },
		});
		expect(invite.status(), await invite.text()).toBe(201);
		const inviteBody = await invite.json();
		expect(inviteBody.data).toMatchObject({
			email: "qa-member@example.com",
			role: "viewer",
			status: "pending",
		});
		expect(inviteBody.data.acceptUrl).toContain(`/settings/members?invitationId=${inviteBody.data.id}`);

		const invitations = await request.get("/api/v1/team/invitations");
		expect(invitations.ok(), await invitations.text()).toBe(true);
		const invitationsBody = await invitations.json();
		expect(invitationsBody.data.map((item: { email: string }) => item.email)).toContain("qa-member@example.com");

		const cancel = await request.delete(`/api/v1/team/invitations/${inviteBody.data.id}`);
		expect(cancel.ok(), await cancel.text()).toBe(true);
		expect((await cancel.json()).data.email).toBe("qa-member@example.com");
	});

	test("tenant organization and security settings round-trip edited values", async ({ request }) => {
		const orgSettings = await request.get("/api/v1/organization-settings");
		expect(orgSettings.ok(), await orgSettings.text()).toBe(true);
		expect((await orgSettings.json()).data).toMatchObject({
			timezone: "Africa/Addis_Ababa",
			currency: "ETB",
			taxId: "0074136947",
		});

		const orgUpdate = await request.patch("/api/v1/organization-settings", {
			data: { companyPhone: "+251911222333", invoiceNumberPrefix: "QA" },
		});
		expect(orgUpdate.ok(), await orgUpdate.text()).toBe(true);
		expect((await orgUpdate.json()).data).toMatchObject({
			companyPhone: "+251911222333",
			invoiceNumberPrefix: "QA",
		});

		const securityUpdate = await request.patch("/api/v1/security-settings", {
			data: { force2fa: true, sessionTimeoutMinutes: 45 },
		});
		expect(securityUpdate.ok(), await securityUpdate.text()).toBe(true);
		expect((await securityUpdate.json()).data).toMatchObject({
			force2fa: true,
			sessionTimeoutMinutes: 45,
		});
	});

	test("super-admin user management lists, searches, and triggers reset workflow", async ({ request }) => {
		const allUsers = await request.get("/api/v1/admin/users");
		expect(allUsers.ok(), await allUsers.text()).toBe(true);
		const allUsersBody = await allUsers.json();
		expect(allUsersBody.data.map((user: { email: string }) => user.email)).toEqual(
			expect.arrayContaining(["owner@example.com", "manager@example.com", "unassigned@example.com"]),
		);

		const search = await request.get("/api/v1/admin/users", { params: { search: "manager" } });
		expect(search.ok(), await search.text()).toBe(true);
		const searchBody = await search.json();
		expect(searchBody.data).toHaveLength(1);
		expect(searchBody.data[0]).toMatchObject({
			email: "manager@example.com",
			emailVerified: false,
			organizations: [expect.objectContaining({ name: "Acme Restaurant", role: "admin" })],
		});

		const reset = await request.post("/api/v1/admin/users/admin_user_2/force-password-reset");
		expect(reset.ok(), await reset.text()).toBe(true);
		expect((await reset.json()).data).toMatchObject({
			userId: "admin_user_2",
			sessionsRevoked: 2,
			resetEmailQueued: true,
		});
	});

	test("super-admin platform settings expose editable billing and feature flag data", async ({ request }) => {
		const settings = await request.get("/api/v1/admin/settings");
		expect(settings.ok(), await settings.text()).toBe(true);
		const settingsBody = await settings.json();
		expect(settingsBody.data).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ key: "billing.vatRate", value: "15" }),
				expect.objectContaining({ key: "platform.supportEmail", value: "support@example.com" }),
			]),
		);

		const update = await request.put("/api/v1/admin/settings/billing.vatRate", { data: { value: "16" } });
		expect(update.ok(), await update.text()).toBe(true);
		expect((await update.json()).data).toMatchObject({ key: "billing.vatRate", value: "16" });

		const flags = await request.get("/api/v1/admin/settings/feature-flags");
		expect(flags.ok(), await flags.text()).toBe(true);
		expect((await flags.json()).data).toEqual(
			expect.arrayContaining([expect.objectContaining({ name: "platform.webhooks", enabledGlobal: true })]),
		);
	});
});

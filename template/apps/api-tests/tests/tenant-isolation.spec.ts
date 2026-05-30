import { expect, test } from "@playwright/test";

test.skip(
	process.env.API_TEST_USES_MOCK_SERVER !== "1",
	"Tenant isolation smoke uses the deterministic mock API harness.",
);

test.describe("tenant isolation API smoke", () => {
	test("tenant-scoped endpoints reject cross-organization writes and keep reads isolated", async ({ request }) => {
		const primarySettings = await request.get("/api/v1/organization-settings");
		expect(primarySettings.ok(), await primarySettings.text()).toBe(true);
		expect((await primarySettings.json()).data).toMatchObject({
			legalName: "Acme Restaurant PLC",
			taxId: "0074136947",
		});

		const crossTenantSettingsWrite = await request.patch("/api/v1/organization-settings", {
			data: { organizationId: "org_2", legalName: "Compromised Tenant" },
		});
		expect(crossTenantSettingsWrite.status()).toBe(403);

		const crossTenantInvite = await request.post("/api/v1/team/invitations", {
			data: { organizationId: "org_2", email: "intruder@example.com", role: "admin" },
		});
		expect(crossTenantInvite.status()).toBe(403);

		const otherSettings = await request.get("/api/v1/organization-settings", {
			headers: { "x-test-org-id": "org_2" },
		});
		expect(otherSettings.ok(), await otherSettings.text()).toBe(true);
		expect((await otherSettings.json()).data).toMatchObject({
			legalName: "Other Tenant PLC",
			taxId: "0011223344",
		});

		const otherMembers = await request.get("/api/v1/team/members", {
			headers: { "x-test-org-id": "org_2" },
		});
		expect(otherMembers.ok(), await otherMembers.text()).toBe(true);
		const otherMembersBody = await otherMembers.json();
		expect(otherMembersBody.data).toEqual([
			expect.objectContaining({
				id: "mem_other_owner",
				user: expect.objectContaining({ email: "other-owner@example.com" }),
			}),
		]);
		expect(otherMembersBody.data).not.toEqual(expect.arrayContaining([expect.objectContaining({ id: "mem_owner" })]));
	});
});

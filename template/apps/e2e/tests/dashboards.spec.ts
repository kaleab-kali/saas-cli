import { expect, test } from "@playwright/test";
import { expectHealthyPage, signInAdmin, signInTenant } from "./helpers";

test.describe("tenant dashboards", () => {
	test("tenant owner can open core workspace pages", async ({ page }) => {
		await signInTenant(page);

		for (const [route, heading] of [
			["/reports/dashboard/main", /Main Dashboard/i],
			["/settings/billing", /Billing/i],
			["/settings/members", /Members/i],
			["/files", /Files/i],
		] as const) {
			await page.goto(route, { waitUntil: "domcontentloaded" });
			await expectHealthyPage(page);
			await expect(page.getByText(heading).first()).toBeVisible();
		}
	});
});

test.describe("admin dashboards", () => {
	test("platform admin can open core admin pages", async ({ page }) => {
		await signInAdmin(page);

		for (const [route, heading] of [
			["/admin", /Platform Overview/i],
			["/admin/users", /Users/i],
			["/admin/organizations", /All Organizations/i],
			["/admin/billing", /Billing/i],
			["/admin/plans", /Subscription Plans/i],
			["/admin/jobs", /Scheduled Jobs/i],
			["/admin/server", /Server Management/i],
		] as const) {
			await page.goto(route, { waitUntil: "domcontentloaded" });
			await expectHealthyPage(page);
			await expect(page.getByText(heading).first()).toBeVisible();
		}
	});
});

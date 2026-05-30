import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
	await page.route("**/api/auth/get-session", async (route) => {
		await route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify({ data: null }),
		});
	});
});

test("public app shell loads", async ({ page }) => {
	await page.goto("/", { waitUntil: "domcontentloaded" });
	await expect(page.locator("body")).toBeVisible();
	await expect(page).toHaveTitle(/{{projectName}}|Vite|SaaS/i);
});

test("admin login route is reachable", async ({ page }) => {
	await page.goto("/admin-login", { waitUntil: "domcontentloaded" });
	await expect(page.getByRole("button", { name: /sign in|login/i })).toBeVisible();
});

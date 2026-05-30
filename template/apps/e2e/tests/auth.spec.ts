import { expect, test } from "@playwright/test";

test("tenant owner can sign in and reach the app", async ({ page }) => {
	const email = process.env.E2E_USER_EMAIL;
	const password = process.env.E2E_USER_PASSWORD;

	test.skip(!email || !password, "Set E2E_USER_EMAIL and E2E_USER_PASSWORD to run real login E2E.");

	await page.goto("/login", { waitUntil: "domcontentloaded" });
	await page.getByLabel(/email/i).fill(email);
	await page.getByLabel(/password/i).fill(password);
	await page.getByRole("button", { name: /sign in|login/i }).click();

	await page.waitForURL(/\/(reports\/dashboard\/main|create-org)/, { timeout: 20_000 });
	await expect(page.locator("body")).toBeVisible();
});

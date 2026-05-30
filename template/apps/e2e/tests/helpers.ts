import { expect, type Page, test } from "@playwright/test";

export const expectHealthyPage = async (page: Page) => {
	await expect(page.locator("body")).toBeVisible();
	await expect(page.locator("body")).not.toContainText(
		/Access Denied|Internal Server Error|Unhandled Runtime Error|Cannot read properties|Something went wrong/i,
	);
};

export const signInTenant = async (page: Page) => {
	const email = process.env.E2E_USER_EMAIL;
	const password = process.env.E2E_USER_PASSWORD;

	test.skip(!email || !password, "Set E2E_USER_EMAIL and E2E_USER_PASSWORD to run tenant E2E.");

	await page.goto("/login", { waitUntil: "domcontentloaded" });
	await page.getByLabel(/email/i).fill(email);
	await page.getByLabel(/password/i).fill(password);
	await page.getByRole("button", { name: /sign in|login/i }).click();
	await page.waitForURL(/\/(reports\/dashboard\/main|create-org)/, { timeout: 20_000 });
};

export const signInAdmin = async (page: Page) => {
	const email = process.env.E2E_ADMIN_EMAIL;
	const password = process.env.E2E_ADMIN_PASSWORD;

	test.skip(!email || !password, "Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run admin E2E.");

	await page.goto("/admin-login", { waitUntil: "domcontentloaded" });
	await page.getByLabel(/admin email/i).fill(email);
	await page.getByLabel(/^password$/i).fill(password);
	await page.getByRole("button", { name: /sign in to admin/i }).click();
	await page.waitForURL(/\/admin\/?$/, { timeout: 20_000 });
};

export const uniqueName = (prefix: string) => `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

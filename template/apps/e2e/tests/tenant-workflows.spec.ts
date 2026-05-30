import { expect, test } from "@playwright/test";
import { expectHealthyPage, signInTenant, uniqueName } from "./helpers";

test.describe.configure({ mode: "serial" });

const skipUnlessChromium = (projectName: string) => {
	test.skip(projectName !== "chromium", "Functional mutation tests run once in Chromium.");
};

test("tenant owner can invite and cancel a member", async ({ context, page }, testInfo) => {
	skipUnlessChromium(testInfo.project.name);
	await context.grantPermissions(["clipboard-read", "clipboard-write"], {
		origin: process.env.E2E_BASE_URL ?? "http://localhost:5173",
	});
	await signInTenant(page);

	const email = `${uniqueName("member")}@example.com`;
	await page.goto("/settings/members", { waitUntil: "domcontentloaded" });
	await expectHealthyPage(page);
	await expect(page.getByRole("heading", { name: /^members$/i })).toBeVisible();
	await expect(page.locator("tr", { hasText: "owner@example.com" })).toBeVisible();
	const emailInput = page.getByPlaceholder(/teammate@example.com/i);
	await emailInput.fill(email, { force: true });
	await expect(emailInput).toHaveValue(email);
	const inviteResponse = page.waitForResponse(
		(response) => response.url().includes("/api/v1/team/invitations") && response.request().method() === "POST",
	);
	await page.getByRole("button", { name: /^invite$/i }).click();
	await expect((await inviteResponse).ok()).toBeTruthy();

	const row = page.locator("tr", { hasText: email });
	await expect(row).toBeVisible();
	await expect(row.getByText(/pending/i)).toBeVisible();
	await row.getByRole("button", { name: /cancel/i }).click();
	await expect(row.getByText(/canceled|cancelled/i)).toBeVisible();
});

test("tenant owner can upload and delete a local file", async ({ page }, testInfo) => {
	skipUnlessChromium(testInfo.project.name);
	await signInTenant(page);

	const filename = `${uniqueName("upload")}.txt`;
	await page.goto("/files", { waitUntil: "domcontentloaded" });
	await expectHealthyPage(page);
	await page.locator('input[type="file"]').setInputFiles({
		name: filename,
		mimeType: "text/plain",
		buffer: Buffer.from("vyllion scaffold e2e upload"),
	});
	await page.getByRole("button", { name: /^upload$/i }).click();
	await expect(page.getByText(filename)).toBeVisible();

	const row = page.locator("tr", { hasText: filename });
	await row.getByRole("button", { name: /delete/i }).click();
	await expect(row).toHaveCount(0);
});

test("tenant owner can create and revoke an API key", async ({ context, page }, testInfo) => {
	skipUnlessChromium(testInfo.project.name);
	await context.grantPermissions(["clipboard-read", "clipboard-write"], {
		origin: process.env.E2E_BASE_URL ?? "http://localhost:5173",
	});
	await signInTenant(page);

	const keyName = uniqueName("e2e-key");
	await page.goto("/settings/api-keys", { waitUntil: "domcontentloaded" });
	await expectHealthyPage(page);
	await page.getByRole("button", { name: /new key/i }).click();
	const dialog = page.getByRole("dialog");
	await dialog.getByPlaceholder(/deploy hook|name/i).fill(keyName);
	await dialog.getByText("read:organization").click();
	await dialog.getByLabel(/requests per minute/i).fill("30");
	await dialog.getByRole("button", { name: /^create$/i }).click();
	await expect(page.getByRole("heading", { name: /copy this key now/i })).toBeVisible();
	await page.getByRole("button", { name: /^done$/i }).click();
	await expect(page.getByText(keyName)).toBeVisible();

	const row = page.locator("tr", { hasText: keyName });
	await row.getByRole("button", { name: /revoke/i }).click();
	await page.getByLabel(/show revoked/i).check();
	await expect(row.getByText(/revoked/i)).toBeVisible();
});

test("tenant owner can create and delete a custom role", async ({ page }, testInfo) => {
	skipUnlessChromium(testInfo.project.name);
	await signInTenant(page);

	const roleName = uniqueName("E2E Role");
	await page.goto("/settings/roles", { waitUntil: "domcontentloaded" });
	await expectHealthyPage(page);
	await expect(page.getByText(/system roles \(4\)/i)).toBeVisible();
	await expect(page.locator("tr", { hasText: "Owner" })).toBeVisible();
	await page.getByRole("button", { name: /new custom role/i }).click();
	const dialog = page.getByRole("dialog");
	await dialog.getByLabel(/name \(english\)/i).fill(roleName, { force: true });
	await expect(dialog.getByLabel(/^slug$/i)).not.toHaveValue("");
	await dialog.getByRole("button", { name: /^next$/i }).click();
	await dialog.locator('input[type="checkbox"]').first().check();
	await dialog.getByRole("button", { name: /^next$/i }).click();
	await dialog.getByRole("button", { name: /create role/i }).click();
	await expect(page.getByText(roleName)).toBeVisible();

	page.once("dialog", (dialogBox) => dialogBox.accept());
	const row = page.locator("tr", { hasText: roleName });
	await row.getByRole("button", { name: /delete/i }).click();
	await expect(row).toHaveCount(0);
});

test("tenant owner can manage local billing lifecycle actions", async ({ page }, testInfo) => {
	skipUnlessChromium(testInfo.project.name);
	await signInTenant(page);

	await page.goto("/settings/billing", { waitUntil: "domcontentloaded" });
	await expectHealthyPage(page);
	await expect(page.getByText(/current subscription/i)).toBeVisible();
	await expect(page.getByText(/pro/i).first()).toBeVisible();

	page.once("dialog", (dialogBox) => dialogBox.accept());
	await page.getByRole("button", { name: /cancel at period end/i }).click();
	await expect(page.getByText(/cancels at period end/i)).toBeVisible();
	await page.getByRole("button", { name: /resume subscription/i }).click();
	await expect(page.getByRole("button", { name: /cancel at period end/i })).toBeVisible();

	const invoiceRow = page.locator("tr", { hasText: "INV-SEED-0001" });
	await expect(invoiceRow).toBeVisible();
	await invoiceRow.getByRole("button", { name: /^manual$/i }).click();
	const dialog = page.getByRole("dialog");
	await dialog.getByLabel(/amount/i).fill("1");
	await dialog.getByLabel(/bank reference/i).fill(uniqueName("BANK"));
	await dialog.getByRole("button", { name: /submit payment/i }).click();
	await expect(invoiceRow.getByText("$0.01")).toBeVisible();
});

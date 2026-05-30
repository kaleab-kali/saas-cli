import { expect, test } from "@playwright/test";
import { expectHealthyPage, signInAdmin, uniqueName } from "./helpers";

test.describe.configure({ mode: "serial" });

const skipUnlessChromium = (projectName: string) => {
	test.skip(projectName !== "chromium", "Functional mutation tests run once in Chromium.");
};

const today = () => new Date().toISOString().slice(0, 10);
const nextMonth = () => {
	const date = new Date();
	date.setMonth(date.getMonth() + 1);
	return date.toISOString().slice(0, 10);
};

test("platform admin can suspend and unsuspend a tenant", async ({ page }, testInfo) => {
	skipUnlessChromium(testInfo.project.name);
	await signInAdmin(page);

	await page.goto("/admin/organizations", { waitUntil: "domcontentloaded" });
	await expectHealthyPage(page);
	await page.getByPlaceholder(/search/i).fill("Acme");
	await page.getByRole("button", { name: /view/i }).first().click();
	await expect(page.getByText(/acme/i).first()).toBeVisible();

	page.on("dialog", async (dialog) => {
		if (dialog.type() === "prompt") {
			await dialog.accept("e2e suspension");
			return;
		}
		await dialog.accept();
	});

	await page.getByRole("button", { name: /^suspend$/i }).click();
	await expect(page.getByText(/organization suspended/i)).toBeVisible();
	await page.getByRole("button", { name: /^unsuspend$/i }).click();
	await expect(page.getByText(/organization suspended/i)).toHaveCount(0);
});

test("platform admin can create, edit, and archive a plan", async ({ page }, testInfo) => {
	skipUnlessChromium(testInfo.project.name);
	await signInAdmin(page);

	const slug = uniqueName("e2e-plan").toLowerCase();
	const name = uniqueName("E2E Plan");
	const renamed = `${name} Updated`;

	await page.goto("/admin/plans", { waitUntil: "domcontentloaded" });
	await expectHealthyPage(page);
	await page.getByRole("button", { name: /new plan/i }).click();
	await page.getByLabel(/slug/i).fill(slug);
	await page.getByLabel(/name \(english\)/i).fill(name);
	await page.getByLabel(/name \(amharic\)/i).fill(name);
	await page.getByLabel(/description/i).fill("Created by e2e");
	await page.getByLabel(/monthly/i).fill("2500");
	await page.getByLabel(/annual/i).fill("25000");
	await page.getByLabel(/user cap/i).fill("10");
	await page.getByLabel(/sla hours/i).fill("24");
	await page.getByRole("button", { name: /create plan/i }).click();

	await expect(page.getByText(new RegExp(name, "i"))).toBeVisible();
	await page.getByLabel(/name \(english\)/i).fill(renamed);
	await page.getByRole("button", { name: /save plan/i }).click();
	await expect(page.getByText(new RegExp(renamed, "i"))).toBeVisible();

	await page.getByRole("link", { name: /back to plans/i }).click();
	page.once("dialog", (dialogBox) => dialogBox.accept());
	const card = page
		.locator("div", { hasText: renamed })
		.filter({ has: page.getByRole("button", { name: /archive/i }) });
	await card
		.getByRole("button", { name: /archive/i })
		.first()
		.click();
	await page.getByLabel(/show archived/i).check();
	await expect(page.getByText(/archived/i).first()).toBeVisible();
});

test("platform admin can operate subscription billing controls", async ({ page }, testInfo) => {
	skipUnlessChromium(testInfo.project.name);
	await signInAdmin(page);

	await page.goto("/admin/organizations", { waitUntil: "domcontentloaded" });
	await page.getByPlaceholder(/search/i).fill("Acme");
	await page.getByRole("button", { name: /view/i }).first().click();
	await page.getByRole("link", { name: /manage billing/i }).click();
	await expectHealthyPage(page);
	await expect(page.getByText(/invoices/i).first()).toBeVisible();

	await page
		.getByLabel(/amount/i)
		.first()
		.fill("1234");
	await page.getByLabel(/period start/i).fill(today());
	await page.getByLabel(/period end/i).fill(nextMonth());
	await page.getByLabel(/description/i).fill(uniqueName("Admin invoice"));
	await page.getByRole("button", { name: /create invoice/i }).click();
	await expect(page.getByRole("button", { name: /^send$/i }).first()).toBeVisible();
	await page
		.getByRole("button", { name: /^send$/i })
		.first()
		.click();

	await page.getByRole("button", { name: /^pay$/i }).first().click();
	const paymentDialog = page.getByRole("dialog");
	await paymentDialog.getByLabel(/amount/i).fill("1");
	await paymentDialog.getByLabel(/receipt/i).fill(uniqueName("REC"));
	await paymentDialog.getByRole("button", { name: /confirm payment/i }).click();
	await expect(paymentDialog).toHaveCount(0);

	await page.getByRole("tab", { name: /actions/i }).click();
	await page.getByPlaceholder(/days/i).fill("1");
	await page
		.getByPlaceholder(/reason/i)
		.first()
		.fill("e2e extension");
	await page.getByRole("button", { name: /^extend$/i }).click();

	await page.getByPlaceholder(/amount/i).fill("1");
	await page.getByPlaceholder(/note/i).fill("e2e credit");
	await page.getByRole("button", { name: /apply credit/i }).click();
	await expect(page.getByText(/credit balance/i)).toBeVisible();
});

test("platform admin can inspect server resources and trigger scheduled jobs", async ({ page }, testInfo) => {
	skipUnlessChromium(testInfo.project.name);
	await signInAdmin(page);

	await page.goto("/admin/server", { waitUntil: "domcontentloaded" });
	await expectHealthyPage(page);
	await expect(page.getByRole("heading", { name: /server management/i })).toBeVisible();
	await expect(page.getByText(/database/i).first()).toBeVisible();
	await expect(page.getByText(/process memory/i)).toBeVisible();
	await expect(page.getByText(/host memory/i)).toBeVisible();
	await expect(page.getByText(/requests/i).first()).toBeVisible();
	await expect(page.getByText(/platform resources/i)).toBeVisible();
	const resourcesCard = page.locator("[data-slot='card']", { hasText: "Platform Resources" });
	await expect(resourcesCard.getByText("organizations", { exact: true })).toBeVisible();
	await expect(resourcesCard.getByText("users", { exact: true })).toBeVisible();

	await page.goto("/admin/jobs", { waitUntil: "domcontentloaded" });
	await expectHealthyPage(page);
	await expect(page.getByRole("heading", { name: /scheduled jobs/i })).toBeVisible();
	await expect(page.getByText(/bullmq queues/i)).toBeVisible();
	await expect(page.getByText(/redis_url/i)).toBeVisible();

	const dailyJob = page.locator("[data-slot='card']", { hasText: "billing.daily" }).first();
	await expect(dailyJob).toBeVisible();
	const triggerResponse = page.waitForResponse(
		(response) =>
			response.url().includes("/api/v1/admin/jobs/billing.daily/trigger") && response.request().method() === "POST",
	);
	await dailyJob.getByRole("button", { name: /run now/i }).click();
	await expect((await triggerResponse).ok()).toBeTruthy();

	const runRow = page.locator("tr", { hasText: "billing.daily" }).first();
	await expect(runRow).toBeVisible();
	await expect(runRow.getByText(/success/i)).toBeVisible();
});

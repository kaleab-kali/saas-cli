import { expect, type Page, test } from "@playwright/test";

async function gotoAndAssert(
	page: Page,
	path: string,
	apiFragments: string[],
	heading: string,
	visibleTexts: string[],
) {
	const responses = apiFragments.map((fragment) =>
		page.waitForResponse((response) => response.url().includes(fragment) && response.status() === 200),
	);
	await page.goto(path, { waitUntil: "domcontentloaded" });
	await Promise.all(responses);
	await expect(page.getByRole("heading", { name: heading })).toBeVisible();
	for (const text of visibleTexts) {
		await expect(page.getByText(text, { exact: false }).first()).toBeVisible();
	}
}

test.describe("tenant EIMS UI backed by mock API", () => {
	test("navigates every tenant EIMS page and verifies backend data", async ({ page }) => {
		await gotoAndAssert(page, "/eims", ["/api/v1/eims/overview"], "EIMS Control Center", [
			"Mock Mode",
			"INV-2026-000128",
			"MOCK-IRN-51fa3144ae45d2a06873a1e81c59ab74",
		]);

		await gotoAndAssert(
			page,
			"/eims/setup",
			["/api/v1/eims/overview", "/api/v1/eims/branch-health", "/api/v1/eims/buyers"],
			"EIMS Setup",
			["Bar POS awaiting MoR approval", "Habesha Trading PLC", "Ministry of Finance"],
		);

		await gotoAndAssert(page, "/eims/enterprises", ["/api/v1/eims/overview"], "EIMS Enterprises", [
			"Habesha Restaurant PLC",
			"0074136947",
			"REGVAT123456789",
		]);

		await gotoAndAssert(page, "/eims/establishments", ["/api/v1/eims/overview"], "EIMS Establishments", [
			"Bole Branch",
			"0074136947-01",
			"Addis Ababa",
		]);

		await gotoAndAssert(page, "/eims/sources", ["/api/v1/eims/overview"], "EIMS Source Systems", [
			"Front POS",
			"329D03B6F0",
			"pending_mor_approval",
		]);

		await gotoAndAssert(page, "/eims/credentials", ["/api/v1/eims/credentials"], "EIMS Credentials", [
			"Front POS",
			"redis-ttl",
			"redacted",
		]);

		await gotoAndAssert(page, "/eims/certificates", ["/api/v1/eims/certificates"], "EIMS Certificates", [
			"Vault Transit",
			"vault-generated",
			"SHA512withRSA-unlocked",
			"expires_soon",
		]);

		await gotoAndAssert(page, "/eims/receipts", ["/api/v1/eims/receipts"], "EIMS Receipts", [
			"RCPT-2026-00044",
			"MOCK-RRN-00044",
			"withholding",
		]);

		await gotoAndAssert(page, "/eims/bulk", ["/api/v1/eims/bulk", "/api/v1/eims/cancellations"], "EIMS Bulk", [
			"MOCK-CONV-20260526-001",
			"/api/v1/bulkInvoice",
			"Customer returned the order",
			"75%",
		]);

		await gotoAndAssert(
			page,
			"/eims/compliance",
			["/api/v1/eims/compliance/evidence", "/api/v1/eims/print-layouts", "/api/v1/eims/notifications"],
			"EIMS Compliance",
			["Thermal and A4 print evidence", "80mm thermal", "EIMS accepted signedQR only", "Africa's Talking"],
		);
	});

	test("submits a mock invoice through the UI and validates returned IRN", async ({ page }) => {
		const submissionsResponse = page.waitForResponse(
			(response) => response.url().includes("/api/v1/eims/submissions") && response.status() === 200,
		);
		await page.goto("/eims/submissions", { waitUntil: "domcontentloaded" });
		await submissionsResponse;
		await expect(page.getByRole("heading", { name: "EIMS Submissions" })).toBeVisible();
		await expect(page.getByText("unknown_submission")).toBeVisible();

		const submitResponse = page.waitForResponse(
			(response) => response.url().includes("/api/v1/eims/submissions/mock-submit") && response.status() === 201,
		);
		await page.getByRole("button", { name: "Create mock accepted invoice" }).click();
		await submitResponse;
		await expect(page.getByText("MOCK-IRN-NEW")).toBeVisible();
	});
});

test.describe("super-admin EIMS UI backed by mock API", () => {
	test("navigates every super-admin EIMS page and verifies backend data", async ({ page }) => {
		await gotoAndAssert(page, "/admin/eims", ["/api/v1/admin/eims/overview"], "Platform EIMS Operations", [
			"Shoa Supermarket",
			"7015",
			"Verify counter sequence",
		]);

		await gotoAndAssert(page, "/admin/eims/tenants", ["/api/v1/admin/eims/tenants"], "EIMS Tenants", [
			"Habesha Restaurants",
			"Shoa Supermarket",
			"blocked_sandbox",
		]);

		await gotoAndAssert(page, "/admin/eims/failures", ["/api/v1/admin/eims/failures"], "EIMS Failures", [
			"Megenagna POS 04",
			"7015",
			"rule_error",
		]);

		await gotoAndAssert(page, "/admin/eims/certificates", ["/api/v1/admin/eims/certificates"], "EIMS Certificates", [
			"Habesha Restaurants",
			"2026-07-10",
			"expires_soon",
		]);

		await gotoAndAssert(page, "/admin/eims/resources", ["/api/v1/admin/eims/resources"], "EIMS Resources", [
			"eims:submission:src_mock_1",
			"paused_pending_approval",
		]);

		await gotoAndAssert(page, "/admin/eims/compliance", ["/api/v1/admin/eims/compliance"], "EIMS Compliance", [
			"V3 architecture plan",
			"Phase 0 Layer B sandbox report",
			"Bank guarantee scanned copy",
		]);
	});
});

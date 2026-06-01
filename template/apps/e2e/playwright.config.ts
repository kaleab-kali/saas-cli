import { defineConfig, devices } from "@playwright/test";

const parsedWebPort = Number.parseInt(process.env.E2E_WEB_PORT ?? "5173", 10);
const webPort = Number.isNaN(parsedWebPort) ? 5173 : parsedWebPort;
const baseURL = process.env.E2E_BASE_URL ?? `http://127.0.0.1:${webPort}`;
const reuseExistingServer = process.env.E2E_REUSE_EXISTING_SERVER === "true";

export default defineConfig({
	testDir: "./tests",
	timeout: 60_000,
	expect: { timeout: 10_000 },
	fullyParallel: false,
	workers: 1,
	reporter: [["list"], ["html", { open: "never" }]],
	use: {
		baseURL,
		trace: "on-first-retry",
		screenshot: "only-on-failure",
	},
	projects: [
		{ name: "chromium", use: { ...devices["Desktop Chrome"] } },
		{ name: "mobile", use: { ...devices["Pixel 7"] } },
	],
	webServer: process.env.E2E_BASE_URL
		? undefined
		: {
				command: `pnpm exec vite --host 127.0.0.1 --port ${webPort}`,
				cwd: "../web",
				url: baseURL,
				reuseExistingServer,
				timeout: 120_000,
			},
});

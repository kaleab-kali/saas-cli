import { defineConfig } from "@playwright/test";

export default defineConfig({
	testDir: "./tests",
	fullyParallel: true,
	reporter: process.env.CI ? "github" : "list",
	timeout: 30_000,
	use: {
		baseURL: process.env.API_BASE_URL,
		extraHTTPHeaders: process.env.API_TEST_TOKEN
			? { authorization: `Bearer ${process.env.API_TEST_TOKEN}` }
			: undefined,
	},
});

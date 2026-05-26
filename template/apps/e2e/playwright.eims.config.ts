import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "@playwright/test";
import baseConfig from "./playwright.config";

const eimsBaseUrl = "http://localhost:5179";
const mockApiUrl = "http://127.0.0.1:3180";
const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

export default defineConfig({
	...baseConfig,
	timeout: 300_000,
	expect: {
		...(baseConfig.expect ?? {}),
		timeout: 15_000,
	},
	use: {
		...(baseConfig.use ?? {}),
		baseURL: eimsBaseUrl,
	},
	webServer: [
		{
			command: "node apps/api-tests/scripts/eims-mock-api-server.mjs",
			cwd: workspaceRoot,
			env: { MOCK_API_PORT: "3180" },
			url: `${mockApiUrl}/health`,
			reuseExistingServer: false,
			timeout: 180_000,
		},
		{
			command:
				"node apps/web/node_modules/vite/bin/vite.js apps/web --host 127.0.0.1 --port 5179 --strictPort --config apps/web/vite.config.ts",
			cwd: workspaceRoot,
			env: { VITE_API_PROXY_TARGET: mockApiUrl },
			url: eimsBaseUrl,
			reuseExistingServer: false,
			timeout: 180_000,
		},
	],
});

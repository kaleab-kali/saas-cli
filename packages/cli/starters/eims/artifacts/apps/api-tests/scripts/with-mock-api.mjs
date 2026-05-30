import { spawn } from "node:child_process";
import { createEimsMockApiServer } from "./eims-mock-api-server.mjs";

const mode = process.argv[2] ?? "http";
const requestedPort = Number(process.env.API_TEST_MOCK_PORT ?? 0);

const run = (command, args, baseUrl) =>
	new Promise((resolve) => {
		const child = spawn(command, args, {
			stdio: "inherit",
			shell: process.platform === "win32",
			env: {
				...process.env,
				API_BASE_URL: baseUrl,
				API_TEST_USES_MOCK_SERVER: "1",
				BRUNO_BASE_URL: baseUrl,
				OPENAPI_SPEC: "openapi/openapi-smoke.yaml",
			},
		});
		child.on("exit", (code) => resolve(code ?? 1));
		child.on("error", () => resolve(1));
	});

const server = createEimsMockApiServer();

server.listen(requestedPort, "127.0.0.1", async () => {
	const address = server.address();
	const port = typeof address === "object" && address ? address.port : requestedPort;
	const baseUrl = `http://127.0.0.1:${port}`;
	const code =
		mode === "bruno"
			? await run("node", ["scripts/run-bruno.mjs"], baseUrl)
			: mode === "eims-http"
				? await run(
						"playwright",
						["test", "-c", "playwright.config.ts", "tests/eims-v3-mock.spec.ts", "tests/eims-acceptance.spec.ts"],
						baseUrl,
					)
				: await run("playwright", ["test", "-c", "playwright.config.ts"], baseUrl);
	server.close(() => process.exit(code));
});

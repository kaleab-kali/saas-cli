import { spawn } from "node:child_process";

const run = (command, args, options = {}) =>
	new Promise((resolve) => {
		const child = spawn(command, args, {
			stdio: "inherit",
			cwd: process.cwd(),
			shell: options.shell ?? process.platform === "win32",
		});
		child.on("exit", (code) => resolve(code ?? 1));
		child.on("error", (error) => {
			console.error(error);
			resolve(1);
		});
	});

if (!process.env.API_BASE_URL) {
	console.log("API_BASE_URL is not set. Running HTTP API tests against local deterministic mock API.");
}

const code = process.env.API_BASE_URL
	? await run("playwright", ["test", "-c", "playwright.config.ts"])
	: await run(process.execPath, ["scripts/with-mock-api.mjs", "http"], { shell: false });

process.exit(code);

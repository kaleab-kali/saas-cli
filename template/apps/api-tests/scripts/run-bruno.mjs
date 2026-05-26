import { spawn } from "node:child_process";
import { accessSync } from "node:fs";
import path from "node:path";

const baseUrl = process.env.BRUNO_BASE_URL ?? process.env.API_BASE_URL;
if (!baseUrl) {
	console.log("BRUNO_BASE_URL/API_BASE_URL is not set. Skipping Bruno API collection.");
	process.exit(0);
}

const localBru = path.join(process.cwd(), "node_modules", ".bin", process.platform === "win32" ? "bru.cmd" : "bru");
try {
	accessSync(localBru);
} catch {
	console.error("Bruno CLI is not installed. Run pnpm install first.");
	process.exit(1);
}

const brunoRoot = path.join(process.cwd(), "bruno");

const runCollection = (collectionPath) =>
	new Promise((resolve) => {
		const child = spawn(localBru, ["run", collectionPath, "--env-var", `baseUrl=${baseUrl}`], {
			stdio: "inherit",
			shell: process.platform === "win32",
			cwd: brunoRoot,
		});
		child.on("exit", (code) => resolve(code ?? 1));
		child.on("error", (error) => {
			console.error(error);
			resolve(1);
		});
	});

const rootCode = await runCollection(".");
if (rootCode !== 0) process.exit(rootCode);

const eimsCode = await runCollection("EIMS-Phase0");
process.exit(eimsCode);

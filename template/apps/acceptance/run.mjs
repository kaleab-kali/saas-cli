import { spawnSync } from "node:child_process";
import path from "node:path";

if (!process.env.ACCEPTANCE_BASE_URL) {
	console.log("Skipping acceptance tests: set ACCEPTANCE_BASE_URL to run them.");
	process.exit(0);
}

const cucumber = path.join(
	process.cwd(),
	"node_modules",
	".bin",
	process.platform === "win32" ? "cucumber-js.cmd" : "cucumber-js",
);
const result = spawnSync(cucumber, ["features", "--import", "steps/*.mjs"], {
	stdio: "inherit",
	shell: process.platform === "win32",
});

process.exit(result.status ?? 1);

import { cpSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(scriptDir, "..");
const repoRoot = path.resolve(packageRoot, "../..");
const source = path.join(repoRoot, "template");
const target = path.join(packageRoot, "template");

const ignored = new Set([
	"node_modules",
	".git",
	".turbo",
	"dist",
	"build",
	"coverage",
	"logs",
	"uploads",
	"playwright-report",
	"test-results",
]);

const sleep = (ms) => {
	Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
};

for (let attempt = 1; attempt <= 10; attempt += 1) {
	try {
		rmSync(target, { recursive: true, force: true });
		break;
	} catch (error) {
		if (attempt === 10 || !["EBUSY", "EPERM"].includes(error.code)) throw error;
		sleep(250);
	}
}

cpSync(source, target, {
	recursive: true,
	filter: (sourcePath) => !ignored.has(path.basename(sourcePath)),
});

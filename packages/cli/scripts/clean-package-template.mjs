import { rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(scriptDir, "..");
const target = path.join(packageRoot, "template");

const sleep = (ms) => {
	Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
};

for (let attempt = 1; attempt <= 10; attempt += 1) {
	try {
		rmSync(target, { recursive: true, force: true });
		process.exit(0);
	} catch (error) {
		if (attempt === 10 || !["EBUSY", "EPERM"].includes(error.code)) {
			process.exit(0);
		}
		sleep(250);
	}
}

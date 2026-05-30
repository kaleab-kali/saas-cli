import path from "node:path";
import { fileURLToPath } from "node:url";
import { runOptional } from "./lib.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));

const target = process.env.NUCLEI_TARGET ?? process.env.SECURITY_HTTP_TARGET;
if (!target) {
	console.log("NUCLEI_TARGET/SECURITY_HTTP_TARGET is not set. Skipping nuclei HTTP scan.");
	process.exit(0);
}

const code = await runOptional({
	command: "nuclei",
	args: [
		"-u",
		target,
		"-t",
		path.resolve(here, "../nuclei"),
		"-severity",
		"low,medium,high,critical",
		"-timeout",
		"5",
		"-retries",
		"0",
		"-silent",
		"-no-color",
	],
	install: "Install nuclei from https://docs.projectdiscovery.io/tools/nuclei/install",
});
process.exit(code);

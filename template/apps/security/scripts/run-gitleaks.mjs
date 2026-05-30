import { repoRoot, runOptional } from "./lib.mjs";

const code = await runOptional({
	command: "gitleaks",
	args: ["detect", "--no-git", "--source", repoRoot, "--redact", "--exit-code", "1"],
	install: "Install gitleaks from https://github.com/gitleaks/gitleaks",
});
process.exit(code);

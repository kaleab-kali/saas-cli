import { repoRoot, runOptional } from "./lib.mjs";

const code = await runOptional({
	command: "semgrep",
	args: ["scan", "--config", "apps/security/semgrep/rules.yml", "apps/api/src", "apps/web/src"],
	cwd: repoRoot,
	install: "Install semgrep with pipx install semgrep or from https://semgrep.dev/docs/getting-started/",
});
process.exit(code);

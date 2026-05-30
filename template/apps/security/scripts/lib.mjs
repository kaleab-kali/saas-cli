import { spawn, spawnSync } from "node:child_process";
import path from "node:path";

export const repoRoot = path.resolve(process.cwd(), "../..");

export const hasCommand = (command) =>
	spawnSync(process.platform === "win32" ? "where" : "which", [command], {
		stdio: "ignore",
		shell: process.platform === "win32",
	}).status === 0;

export const run = (command, args, options = {}) =>
	new Promise((resolve) => {
		const child = spawn(command, args, {
			stdio: "inherit",
			shell: process.platform === "win32",
			cwd: options.cwd ?? process.cwd(),
			env: { ...process.env, ...(options.env ?? {}) },
		});
		child.on("exit", (code) => resolve(code ?? 1));
		child.on("error", () => resolve(1));
	});

export const runOptional = async ({
	command,
	args,
	install,
	strictEnv = "SECURITY_STRICT_TOOLS",
	cwd = process.cwd(),
}) => {
	if (!hasCommand(command)) {
		console.log(`${command} is not installed. Skipping.`);
		console.log(install);
		return process.env[strictEnv] === "1" ? 1 : 0;
	}
	return run(command, args, { cwd });
};

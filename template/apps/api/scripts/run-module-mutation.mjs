import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const apiRoot = path.resolve(__dirname, "..");
const args = process.argv.slice(2).filter((arg) => arg !== "--");
const dryRun = args.includes("--dry-run");
const fullModule = args.includes("--all");
const moduleName = process.env.MODULE ?? args.find((arg) => !arg.startsWith("-")) ?? "billing";

function fail(message) {
	console.error(message);
	process.exit(1);
}

if (!/^[a-z0-9][a-z0-9-]*$/.test(moduleName)) {
	fail(`Invalid MODULE value "${moduleName}". Use a folder name under src/modules.`);
}

const moduleDir = path.join(apiRoot, "src", "modules", moduleName);
if (!existsSync(moduleDir) || !statSync(moduleDir).isDirectory()) {
	fail(`Module "${moduleName}" was not found at ${path.relative(apiRoot, moduleDir)}`);
}

const toPosix = (value) => value.split(path.sep).join("/");

function walkFiles(dir, out = []) {
	for (const entry of readdirSync(dir)) {
		const fullPath = path.join(dir, entry);
		const stat = statSync(fullPath);
		if (stat.isDirectory()) {
			if (["dist", "generated", "node_modules"].includes(entry)) continue;
			walkFiles(fullPath, out);
			continue;
		}
		out.push(fullPath);
	}
	return out;
}

const testFiles = walkFiles(moduleDir)
	.filter((file) => /\.(spec|test)\.ts$/.test(file))
	.map((file) => toPosix(path.relative(apiRoot, file)))
	.sort();

if (testFiles.length === 0) {
	fail(`Module "${moduleName}" has no .spec.ts or .test.ts files for Stryker to run.`);
}

const directSourceForTest = (testFile) => {
	for (const pattern of [
		[/\.property\.spec\.ts$/, ".ts"],
		[/\.property\.test\.ts$/, ".ts"],
		[/\.spec\.ts$/, ".ts"],
		[/\.test\.ts$/, ".ts"],
	]) {
		if (!pattern[0].test(testFile)) continue;
		const candidate = testFile.replace(pattern[0], pattern[1]);
		if (existsSync(path.join(apiRoot, candidate))) return candidate;
	}
	return null;
};

const testedSources = [...new Set(testFiles.map(directSourceForTest).filter(Boolean))].sort();
if (!fullModule && testedSources.length === 0) {
	fail(`Module "${moduleName}" has no directly matched source files. Re-run with --all to mutate the whole module.`);
}

const fullModuleMutate = [
	`src/modules/${moduleName}/**/*.ts`,
	`!src/modules/${moduleName}/**/*.spec.ts`,
	`!src/modules/${moduleName}/**/*.test.ts`,
	`!src/modules/${moduleName}/**/*.dto.ts`,
	`!src/modules/${moduleName}/**/*.entity.ts`,
	`!src/modules/${moduleName}/**/*.events.ts`,
	`!src/modules/${moduleName}/**/*.module.ts`,
	`!src/modules/${moduleName}/**/index.ts`,
	`!src/modules/${moduleName}/presentation/**`,
	`!src/modules/${moduleName}/infrastructure/mappers/**`,
];
const mutate = fullModule ? fullModuleMutate : testedSources;

const formatArray = (values) => `[\n${values.map((value) => `\t\t${JSON.stringify(value)},`).join("\n")}\n\t]`;

const configDir = path.join(apiRoot, ".stryker-module");
mkdirSync(configDir, { recursive: true });
const configPath = path.join(configDir, `${moduleName}.conf.mjs`);
const configText = `import baseConfig from "../stryker.conf.mjs";

export default {
\t...baseConfig,
\ttempDirName: ${JSON.stringify(`stryker-tmp/${moduleName}`)},
\tmutate: ${formatArray(mutate)},
\ttestFiles: ${formatArray(testFiles)},
\tthresholds: {
\t\t...baseConfig.thresholds,
\t\tbreak: Number(process.env.STRYKER_MODULE_BREAK ?? 50),
\t},
};
`;

writeFileSync(configPath, configText);

const relativeConfigPath = toPosix(path.relative(apiRoot, configPath));
if (dryRun) {
	const configPreview = readFileSync(configPath, "utf8");
	console.log(`Prepared module mutation config: ${relativeConfigPath}`);
	console.log(`Module: ${moduleName}`);
	console.log(`Mode: ${fullModule ? "full module" : "tested source files"}`);
	console.log(`Test files: ${testFiles.length}`);
	console.log(`Mutated files: ${mutate.length}`);
	console.log(configPreview);
	process.exit(0);
}

const result = spawnSync("pnpm", ["exec", "stryker", "run", relativeConfigPath], {
	cwd: apiRoot,
	shell: process.platform === "win32",
	stdio: "inherit",
});

process.exit(result.status ?? 1);

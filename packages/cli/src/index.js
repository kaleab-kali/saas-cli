import { existsSync } from "node:fs";
import path from "node:path";
import pc from "picocolors";
import { parseArgs } from "./args.js";
import { runDoctor } from "./doctor.js";
import {
	addModule,
	addStarterPack,
	getStarterPackDetail,
	listStarterPackDetails,
	listStarterPacks,
	uninstallStarterPack,
	validateStarterPackNames,
} from "./module-generator.js";
import { runPrompts } from "./prompts.js";
import { scaffold } from "./scaffold.js";
import { resolveTemplateDir } from "./template-path.js";
import { printNextSteps, printWelcome } from "./ui.js";

const TEMPLATE_DIR = resolveTemplateDir(import.meta.url);

const projectArgMeta = (projectName) => {
	if (!projectName) return { promptName: null, explicitTargetDir: null };

	const trimmed = projectName.trim();
	const containsPathSeparator = /[\\/]/.test(trimmed);
	const explicitTargetDir =
		containsPathSeparator || path.isAbsolute(trimmed)
			? path.resolve(process.cwd(), trimmed)
			: null;
	const basenameInput = trimmed.replace(/[\\/]+$/, "").replace(/\\/g, path.sep);
	const promptName = path.basename(basenameInput) || trimmed;
	return { promptName, explicitTargetDir };
};

export const run = async (argv) => {
	const args = parseArgs(argv);
	const { projectName, yes, help } = args;

	if (help) {
		printHelp();
		return;
	}

	if (args.command === "doctor") {
		await runDoctor(process.cwd(), { production: args.production });
		return;
	}

	if (args.command === "add-module") {
		await addModule({ cwd: process.cwd(), moduleName: args.moduleName });
		return;
	}

	if (args.command === "add-starter") {
		await addStarterPack({
			cwd: process.cwd(),
			starterName: args.starterName,
			refresh: args.refresh,
			eimsSdkPackage: args.eimsSdkPackage,
		});
		return;
	}

	if (args.command === "remove-starter") {
		await uninstallStarterPack({
			cwd: process.cwd(),
			starterName: args.starterName,
		});
		return;
	}

	if (args.command === "list-starters") {
		printStarterPacks();
		return;
	}

	let requestedStarters = [];
	try {
		requestedStarters = validateStarterPackNames(args.starters);
	} catch (error) {
		console.error(pc.red(error instanceof Error ? error.message : String(error)));
		process.exit(1);
	}

	printWelcome();
	printSelectedStarterPacks(requestedStarters);

	if (!existsSync(TEMPLATE_DIR)) {
		console.error(pc.red(`Template directory not found: ${TEMPLATE_DIR}`));
		process.exit(1);
	}

	const { promptName, explicitTargetDir } = projectArgMeta(projectName);
	const answers = await runPrompts({ projectName: promptName, yes });

	const targetDir =
		explicitTargetDir ?? path.resolve(process.cwd(), answers.projectSlug);
	if (existsSync(targetDir)) {
		console.error(pc.red(`Target directory already exists: ${targetDir}`));
		process.exit(1);
	}

	await scaffold({
		templateDir: TEMPLATE_DIR,
		targetDir,
		tokens: answers,
		actions: {
			install: args.install,
			dbPush: args.dbPush,
			seed: args.seed,
			afterTemplate: async (createdDir) => {
				for (const starterName of requestedStarters) {
					await addStarterPack({ cwd: createdDir, starterName, eimsSdkPackage: args.eimsSdkPackage });
				}
			},
		},
	});

	printNextSteps({ targetDir, ...answers });
};

const printHelp = () => {
	console.log(`
${pc.bold("create-vyllion-saas")} - scaffold a production-ready multi-tenant SaaS

${pc.bold("Usage:")}
  create-vyllion-saas [project-name] [options]
  create-vyllion-saas doctor
  create-vyllion-saas add module <name>
  create-vyllion-saas add starter <pack>
  create-vyllion-saas remove starter <pack>
  create-vyllion-saas list starters

${pc.bold("Options:")}
  --yes, -y        Accept all defaults (non-interactive)
  --starter <pack> Add starter packs during project creation (repeatable or comma-separated)
  --refresh       Reapply an already-installed custom starter's owned UI/routes/tests
  --install        Run pnpm install after scaffold
  --db-push        Run pnpm db:push after scaffold
  --seed           Run pnpm db:seed after scaffold
  --bootstrap      Run install + db:push + seed
  --eims-sdk-package <name>
                  Use this package when installing the EIMS starter SDK adapter
  --production     Run stricter production-readiness checks with doctor
  --help, -h       Show this help

${pc.bold("Examples:")}
  create-vyllion-saas my-app
  create-vyllion-saas my-app --yes
  create-vyllion-saas my-app --starter eims
  create-vyllion-saas my-app --starter eims,crm
  create-vyllion-saas my-app --yes --bootstrap
  create-vyllion-saas doctor
  create-vyllion-saas add module projects
  create-vyllion-saas add starter crm
  create-vyllion-saas add starter eims --refresh
  create-vyllion-saas remove starter eims
  create-vyllion-saas list starters
  create-vyllion-saas  (prompts for name)

${pc.bold("Starter packs:")}
  ${listStarterPacks().join(", ")}
`);
};

const printStarterPacks = () => {
	console.log(pc.bold("Available starter packs"));
	for (const pack of listStarterPackDetails()) {
		const printLimitedList = (label, values, limit = 6) => {
			if (!values?.length) return;
			const preview = values.slice(0, limit).join(", ");
			console.log(pc.dim(`  ${label}: ${preview}${values.length > limit ? ", ..." : ""}`));
		};
		console.log(`\n${pc.cyan(pack.name)} ${pc.dim(`(${pack.label})`)}`);
		console.log(pc.dim(`  ${pack.description}`));
		if (pack.modules?.length) {
			console.log(pc.dim(`  Modules: ${pack.modules.join(", ")}`));
		}
		if (pack.manifest) {
			console.log(pc.dim(`  Manifest: ${pack.manifest}`));
		}
		if (pack.envVars?.length) {
			console.log(pc.dim(`  Env vars: ${pack.envVars.join(", ")}`));
		}
		printLimitedList("Routes", pack.routes);
		printLimitedList("Models", pack.models);
		printLimitedList("Permissions", pack.permissions);
		printLimitedList("Seed data", pack.seedData);
		printLimitedList("Queues", pack.queues);
		printLimitedList("Crons", pack.crons);
		printLimitedList("Dependencies", Object.keys(pack.dependencies ?? {}));
		printLimitedList("Dev dependencies", Object.keys(pack.devDependencies ?? {}));
	}
};

const printSelectedStarterPacks = (starterNames) => {
	if (!starterNames.length) return;
	console.log(pc.bold("Starter packs selected"));
	for (const starterName of starterNames) {
		const pack = getStarterPackDetail(starterName);
		console.log(`  ${pc.cyan(pack.name)} ${pc.dim(`- ${pack.description}`)}`);
		if (pack.envVars?.length) {
			console.log(pc.dim(`    Env vars added: ${pack.envVars.join(", ")}`));
		}
	}
	console.log("");
};

import path from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import pc from "picocolors";
import { parseArgs } from "./args.js";
import { runPrompts } from "./prompts.js";
import { scaffold } from "./scaffold.js";
import { printNextSteps, printWelcome } from "./ui.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE_DIR = path.resolve(__dirname, "../../../template");

export const run = async (argv) => {
	const { projectName, yes, help } = parseArgs(argv);

	if (help) {
		printHelp();
		return;
	}

	printWelcome();

	if (!existsSync(TEMPLATE_DIR)) {
		console.error(pc.red(`Template directory not found: ${TEMPLATE_DIR}`));
		process.exit(1);
	}

	const answers = await runPrompts({ projectName, yes });

	const targetDir = path.resolve(process.cwd(), answers.projectSlug);
	if (existsSync(targetDir)) {
		console.error(pc.red(`Target directory already exists: ${targetDir}`));
		process.exit(1);
	}

	await scaffold({
		templateDir: TEMPLATE_DIR,
		targetDir,
		tokens: answers,
	});

	printNextSteps({ targetDir, ...answers });
};

const printHelp = () => {
	console.log(`
${pc.bold("create-vyllion-saas")} — scaffold a production-ready multi-tenant SaaS

${pc.bold("Usage:")}
  create-vyllion-saas [project-name] [options]

${pc.bold("Options:")}
  --yes, -y        Accept all defaults (non-interactive)
  --help, -h       Show this help

${pc.bold("Examples:")}
  create-vyllion-saas my-app
  create-vyllion-saas my-app --yes
  create-vyllion-saas  (prompts for name)
`);
};

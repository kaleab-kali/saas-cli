#!/usr/bin/env node
import * as p from "@clack/prompts";
import pc from "picocolors";
import { createProject } from "./create-project.js";
import { getProjectConfig } from "./prompts.js";

const main = async () => {
	console.clear();

	p.intro(pc.bgCyan(pc.black(" create-novek-saas ")));
	p.log.info(pc.dim("Scaffold a full-stack SaaS project"));
	p.log.info(pc.dim("NestJS + React + Prisma + Better Auth + Pino + shadcn/ui\n"));

	const projectName = process.argv[2];

	const config = await getProjectConfig(projectName);

	if (p.isCancel(config)) {
		p.cancel("Operation cancelled.");
		process.exit(0);
	}

	const spinner = p.spinner();
	spinner.start("Creating project...");

	try {
		await createProject(config);
		spinner.stop("Project created!");

		p.note(
			[
				`${pc.cyan("cd")} ${config.name}`,
				`${pc.cyan("pnpm install")}`,
				"",
				pc.dim("# Set up your database credentials:"),
				`${pc.cyan("cp")} apps/api/.env.example apps/api/.env`,
				`${pc.cyan("cp")} apps/web/.env.example apps/web/.env`,
				"",
				pc.dim("# Push schema to database:"),
				`${pc.cyan("pnpm db:generate")}`,
				`${pc.cyan("pnpm db:push")}`,
				"",
				pc.dim("# Start development:"),
				`${pc.cyan("pnpm dev")}`,
			].join("\n"),
			"Next steps",
		);

		p.outro(pc.green("Happy building!"));
	} catch (error) {
		spinner.stop("Failed to create project");
		p.log.error(error instanceof Error ? error.message : String(error));
		process.exit(1);
	}
};

main();

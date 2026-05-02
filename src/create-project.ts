import * as path from "node:path";
import * as fs from "fs-extra";
import type { ProjectConfig } from "./prompts.js";

const TEMPLATE_DIR = path.resolve(import.meta.dirname, "..", "template");

const TEMPLATE_VARS = {
	PROJECT_NAME: "{{PROJECT_NAME}}",
	DB_HOST: "{{DB_HOST}}",
	DB_PORT: "{{DB_PORT}}",
	DB_USER: "{{DB_USER}}",
	DB_PASSWORD: "{{DB_PASSWORD}}",
	DB_NAME: "{{DB_NAME}}",
	API_PORT: "{{API_PORT}}",
	WEB_PORT: "{{WEB_PORT}}",
	DATABASE_URL: "{{DATABASE_URL}}",
} as const;

const SKIP_PATTERNS = ["node_modules", "dist", ".turbo", ".git", "*.log", "coverage", "generated"];

const shouldSkip = (filePath: string): boolean =>
	SKIP_PATTERNS.some((pattern) => {
		if (pattern.startsWith("*")) return filePath.endsWith(pattern.slice(1));
		return filePath.includes(pattern);
	});

const replaceTemplateVars = (content: string, config: ProjectConfig): string => {
	const databaseUrl = `postgresql://${config.dbUser}:${config.dbPassword}@${config.dbHost}:${config.dbPort}/${config.dbName}`;

	return content
		.replaceAll(TEMPLATE_VARS.PROJECT_NAME, config.name)
		.replaceAll(TEMPLATE_VARS.DB_HOST, config.dbHost)
		.replaceAll(TEMPLATE_VARS.DB_PORT, config.dbPort)
		.replaceAll(TEMPLATE_VARS.DB_USER, config.dbUser)
		.replaceAll(TEMPLATE_VARS.DB_PASSWORD, config.dbPassword)
		.replaceAll(TEMPLATE_VARS.DB_NAME, config.dbName)
		.replaceAll(TEMPLATE_VARS.API_PORT, config.apiPort)
		.replaceAll(TEMPLATE_VARS.WEB_PORT, config.webPort)
		.replaceAll(TEMPLATE_VARS.DATABASE_URL, databaseUrl);
};

const TEXT_EXTENSIONS = new Set([
	".ts",
	".tsx",
	".js",
	".jsx",
	".json",
	".md",
	".yaml",
	".yml",
	".env",
	".example",
	".prisma",
	".css",
	".html",
	".cjs",
	".mjs",
	".toml",
	".gitignore",
	".gitkeep",
	"",
]);

const isTextFile = (filePath: string): boolean => {
	const ext = path.extname(filePath).toLowerCase();
	const basename = path.basename(filePath);
	return TEXT_EXTENSIONS.has(ext) || basename.startsWith(".");
};

const copyTemplate = async (srcDir: string, destDir: string, config: ProjectConfig): Promise<void> => {
	const entries = await fs.readdir(srcDir, { withFileTypes: true });

	for (const entry of entries) {
		const srcPath = path.join(srcDir, entry.name);
		const destPath = path.join(destDir, entry.name);

		if (shouldSkip(srcPath)) continue;

		if (entry.isDirectory()) {
			await fs.ensureDir(destPath);
			await copyTemplate(srcPath, destPath, config);
		} else if (isTextFile(srcPath)) {
			const content = await fs.readFile(srcPath, "utf-8");
			const replaced = replaceTemplateVars(content, config);
			await fs.writeFile(destPath, replaced);
		} else {
			await fs.copy(srcPath, destPath);
		}
	}
};

export const createProject = async (config: ProjectConfig): Promise<void> => {
	const targetDir = path.resolve(process.cwd(), config.name);

	if (await fs.pathExists(targetDir)) {
		const files = await fs.readdir(targetDir);
		if (files.length > 0) {
			throw new Error(`Directory "${config.name}" already exists and is not empty`);
		}
	}

	await fs.ensureDir(targetDir);
	await copyTemplate(TEMPLATE_DIR, targetDir, config);
};

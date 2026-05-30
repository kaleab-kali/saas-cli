import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const resolveTemplateDir = (metaUrl) => {
	const sourceDir = path.dirname(fileURLToPath(metaUrl));
	const packagedTemplate = path.resolve(sourceDir, "../template");
	if (existsSync(packagedTemplate)) return packagedTemplate;
	return path.resolve(sourceDir, "../../../template");
};

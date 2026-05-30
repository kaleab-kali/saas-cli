import { existsSync } from "node:fs";
import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const candidates = [process.argv[2], "src/generated/prisma", "apps/api/src/generated/prisma"].filter(Boolean);
const generatedDir = candidates.map((candidate) => path.resolve(process.cwd(), candidate)).find((candidate) => existsSync(candidate));

if (!generatedDir) {
	console.error("Could not find generated Prisma directory.");
	process.exit(1);
}

const trimFile = async (filePath) => {
	const text = await readFile(filePath, "utf8");
	const next = text.replace(/[ \t]+(?=\r?\n)/g, "");
	if (next !== text) await writeFile(filePath, next, "utf8");
};

const walk = async (dir) => {
	for (const entry of await readdir(dir)) {
		const fullPath = path.join(dir, entry);
		const info = await stat(fullPath);
		if (info.isDirectory()) await walk(fullPath);
		else if (info.isFile()) await trimFile(fullPath);
	}
};

await walk(generatedDir);

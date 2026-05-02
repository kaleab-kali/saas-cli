export const parseArgs = (argv) => {
	const out = { projectName: null, yes: false, help: false };
	for (const a of argv) {
		if (a === "--yes" || a === "-y") out.yes = true;
		else if (a === "--help" || a === "-h") out.help = true;
		else if (!a.startsWith("-") && !out.projectName) out.projectName = a;
	}
	return out;
};

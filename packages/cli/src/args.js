export const parseArgs = (argv) => {
	const out = {
		command: "create",
		projectName: null,
		moduleName: null,
		starterName: null,
		yes: false,
		help: false,
		install: false,
		dbPush: false,
		seed: false,
		starters: [],
	};

	const positional = [];
	for (let i = 0; i < argv.length; i += 1) {
		const a = argv[i];
		if (a === "--yes" || a === "-y") out.yes = true;
		else if (a === "--help" || a === "-h") out.help = true;
		else if (a === "--install") out.install = true;
		else if (a === "--db-push") out.dbPush = true;
		else if (a === "--seed") out.seed = true;
		else if (a === "--starter") {
			const starter = argv[i + 1];
			if (starter && !starter.startsWith("-")) {
				out.starters.push(starter);
				i += 1;
			}
		} else if (a === "--bootstrap") {
			out.install = true;
			out.dbPush = true;
			out.seed = true;
		} else if (!a.startsWith("-")) {
			positional.push(a);
		}
	}

	if (positional[0] === "doctor") {
		out.command = "doctor";
	} else if (positional[0] === "add" && positional[1] === "module") {
		out.command = "add-module";
		out.moduleName = positional[2] ?? null;
	} else if (positional[0] === "add" && positional[1] === "starter") {
		out.command = "add-starter";
		out.starterName = positional[2] ?? null;
	} else if (positional[0] === "module") {
		out.command = "add-module";
		out.moduleName = positional[1] ?? null;
	} else if (positional[0] === "starter") {
		out.command = "add-starter";
		out.starterName = positional[1] ?? null;
	} else {
		out.projectName = positional[0] ?? null;
	}

	return out;
};

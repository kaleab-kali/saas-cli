import { fileURLToPath } from "node:url";

const jestRunnerPlugin = fileURLToPath(
	new URL("./node_modules/@stryker-mutator/jest-runner/dist/src/index.js", import.meta.url),
);

export default {
	packageManager: "pnpm",
	plugins: [jestRunnerPlugin],
	testRunner: "jest",
	tempDirName: "stryker-tmp",
	inPlace: true,
	concurrency: 1,
	coverageAnalysis: "perTest",
	mutate: ["src/modules/billing/application/services/policy.service.ts"],
	testFiles: ["src/modules/billing/application/services/policy.service.property.spec.ts"],
	jest: {
		projectType: "custom",
		configFile: "jest.stryker.cjs",
	},
	reporters: ["clear-text", "progress", "html"],
	thresholds: {
		high: 80,
		low: 60,
		break: 80,
	},
};

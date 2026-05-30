import { readFileSync } from "node:fs";

const endpoint = process.env.AI_TEST_ENDPOINT;
const cases = JSON.parse(readFileSync(new URL("./cases.json", import.meta.url), "utf8"));

if (!endpoint) {
	console.log("AI_TEST_ENDPOINT is not set. Skipping AI evals.");
	process.exit(0);
}

let failures = 0;
for (const testCase of cases) {
	const res = await fetch(endpoint, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({ input: testCase.input }),
	});
	const body = await res.text();
	const missing = testCase.expectedKeywords.filter((word) => !body.toLowerCase().includes(word.toLowerCase()));
	if (!res.ok || missing.length > 0) {
		failures += 1;
		console.error(`[FAIL] ${testCase.id}: missing ${missing.join(", ") || "valid response"}`);
	} else {
		console.log(`[PASS] ${testCase.id}`);
	}
}

if (failures > 0) process.exit(1);

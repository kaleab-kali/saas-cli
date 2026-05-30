import { check, sleep } from "k6";
import http from "k6/http";

const p95 = Number(__ENV.K6_P95_MS ?? 750);
const maxErrorRate = Number(__ENV.K6_MAX_ERROR_RATE ?? 0.01);

export const options = {
	scenarios: {
		health: {
			executor: "constant-vus",
			vus: Number(__ENV.K6_VUS ?? 10),
			duration: __ENV.K6_DURATION ?? "30s",
		},
	},
	thresholds: {
		http_req_failed: [`rate<${maxErrorRate}`],
		http_req_duration: [`p(95)<${p95}`],
	},
};

export default function () {
	const target = __ENV.K6_TARGET ?? "http://localhost:3000/health";
	const response = http.get(target);
	check(response, {
		"status is 200": (res) => res.status === 200,
		"body has ok status": (res) => String(res.body).includes('"ok"'),
	});
	sleep(1);
}

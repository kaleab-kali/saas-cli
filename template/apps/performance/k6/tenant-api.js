import { check, sleep } from "k6";
import http from "k6/http";

const protectedEndpointStatuses = http.expectedStatuses({ min: 200, max: 399 }, 401, 403);

export const options = {
	scenarios: {
		tenantApi: {
			executor: "ramping-vus",
			stages: [
				{ duration: __ENV.K6_RAMP_UP ?? "5s", target: Number(__ENV.K6_VUS ?? 1) },
				{ duration: __ENV.K6_STEADY ?? "15s", target: Number(__ENV.K6_VUS ?? 1) },
				{ duration: __ENV.K6_RAMP_DOWN ?? "5s", target: 0 },
			],
		},
	},
	thresholds: {
		http_req_failed: [`rate<${Number(__ENV.K6_MAX_ERROR_RATE ?? 0.01)}`],
		http_req_duration: [`p(95)<${Number(__ENV.K6_P95_MS ?? 750)}`],
	},
};

export default function () {
	const baseUrl = __ENV.K6_API_BASE_URL ?? "http://127.0.0.1:3000";
	const headers = __ENV.K6_SESSION_COOKIE ? { cookie: __ENV.K6_SESSION_COOKIE } : {};

	const health = http.get(`${baseUrl}/health`);
	check(health, { "health is ok": (res) => res.status === 200 });

	const capabilities = http.get(`${baseUrl}/api/v1/billing/capabilities`, {
		headers,
		responseCallback: protectedEndpointStatuses,
	});
	check(capabilities, {
		"capabilities is protected or authenticated": (res) => [200, 401, 403].includes(res.status),
	});

	sleep(1);
}

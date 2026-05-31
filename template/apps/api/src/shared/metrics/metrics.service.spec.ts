import { MetricsService } from "./metrics.service";

describe("MetricsService", () => {
	it("exports standard SaaS metrics for HTTP, tenants, DB, queues, auth, and business events", async () => {
		const service = new MetricsService();

		service.beginRequest();
		service.endRequest("GET", "/api/v1/reports", 200, 125);
		service.recordTenantRequest("org_1");
		service.observeDbQuery("report.findMany", 18);
		service.observeQueueJob("email", "send-digest", 250, "success");
		service.recordAuthLoginAttempt("success");
		service.incrementBusinessMetric("invoice.accepted");

		const metrics = await service.metrics();

		expect(metrics).toContain("http_request_duration_seconds_bucket");
		expect(metrics).toContain('tenant_request_count{organizationId="org_1"} 1');
		expect(metrics).toContain("db_query_duration_seconds_bucket");
		expect(metrics).toContain('queue_jobs_total{queue="email",job="send-digest",result="success"} 1');
		expect(metrics).toContain('auth_login_attempts_total{result="success"} 1');
		expect(metrics).toContain('business_metric_events_total{metric="invoice.accepted"} 1');
	});

	it("bounds tenant metric cardinality after the first 100 organization labels", async () => {
		const service = new MetricsService();

		for (let index = 0; index < 101; index += 1) {
			service.recordTenantRequest(`org_${index}`);
		}

		const metrics = await service.metrics();

		expect(metrics).toContain('tenant_request_count{organizationId="org_0"} 1');
		expect(metrics).toContain('tenant_request_count{organizationId="__other__"} 1');
		expect(metrics).not.toContain('tenant_request_count{organizationId="org_100"}');
	});
});

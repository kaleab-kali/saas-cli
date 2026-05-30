import { Injectable } from "@nestjs/common";
import { Counter, collectDefaultMetrics, Gauge, Histogram, Registry } from "prom-client";

export interface HttpMetricSnapshot {
	uptimeSeconds: number;
	totalRequests: number;
	totalErrors: number;
	requestsPerSecond1m: number;
	errorRate1m: number;
	p50LatencyMs: number;
	p95LatencyMs: number;
	activeRequests: number;
}

interface RequestSample {
	at: number;
	durationMs: number;
	statusCode: number;
}

@Injectable()
export class MetricsService {
	private readonly registry = new Registry();
	private readonly httpRequestsTotal: Counter<string>;
	private readonly httpRequestDuration: Histogram<string>;
	private readonly activeRequestsGauge: Gauge<string>;
	private readonly startedAt = Date.now();
	private readonly samples: RequestSample[] = [];
	private totalRequests = 0;
	private totalErrors = 0;
	private activeRequests = 0;

	constructor() {
		collectDefaultMetrics({ register: this.registry });
		this.httpRequestsTotal = new Counter({
			name: "http_requests_total",
			help: "Total HTTP requests",
			labelNames: ["method", "route", "status_code"],
			registers: [this.registry],
		});
		this.httpRequestDuration = new Histogram({
			name: "http_request_duration_seconds",
			help: "HTTP request duration in seconds",
			labelNames: ["method", "route", "status_code"],
			buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
			registers: [this.registry],
		});
		this.activeRequestsGauge = new Gauge({
			name: "http_active_requests",
			help: "Currently active HTTP requests",
			registers: [this.registry],
		});
	}

	beginRequest() {
		this.activeRequests += 1;
		this.activeRequestsGauge.set(this.activeRequests);
	}

	endRequest(method: string, route: string, statusCode: number, durationMs: number) {
		this.activeRequests = Math.max(0, this.activeRequests - 1);
		this.activeRequestsGauge.set(this.activeRequests);
		this.totalRequests += 1;
		if (statusCode >= 500) this.totalErrors += 1;

		const labels = { method, route, status_code: String(statusCode) };
		this.httpRequestsTotal.inc(labels);
		this.httpRequestDuration.observe(labels, durationMs / 1000);
		this.samples.push({ at: Date.now(), durationMs, statusCode });
		this.trimSamples();
	}

	async metrics() {
		return this.registry.metrics();
	}

	contentType() {
		return this.registry.contentType;
	}

	snapshot(): HttpMetricSnapshot {
		this.trimSamples();
		const oneMinute = this.samples.filter((sample) => Date.now() - sample.at <= 60_000);
		const durations = oneMinute.map((sample) => sample.durationMs).sort((a, b) => a - b);
		const errors = oneMinute.filter((sample) => sample.statusCode >= 500).length;
		return {
			uptimeSeconds: Math.round((Date.now() - this.startedAt) / 1000),
			totalRequests: this.totalRequests,
			totalErrors: this.totalErrors,
			requestsPerSecond1m: Math.round((oneMinute.length / 60) * 100) / 100,
			errorRate1m: oneMinute.length ? Math.round((errors / oneMinute.length) * 10000) / 100 : 0,
			p50LatencyMs: this.percentile(durations, 0.5),
			p95LatencyMs: this.percentile(durations, 0.95),
			activeRequests: this.activeRequests,
		};
	}

	private trimSamples() {
		const cutoff = Date.now() - 5 * 60_000;
		while (this.samples.length > 0 && this.samples[0].at < cutoff) {
			this.samples.shift();
		}
	}

	private percentile(sorted: number[], p: number) {
		if (sorted.length === 0) return 0;
		const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * p) - 1));
		return Math.round(sorted[index]);
	}
}

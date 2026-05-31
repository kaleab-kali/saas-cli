import { createHmac, randomBytes, randomUUID } from "node:crypto";
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { CipherService } from "#shared/crypto/cipher.service";
import { PrismaService } from "#shared/database/prisma.service";
import type { Prisma, WebhookDelivery, WebhookEndpoint } from "../../../generated/prisma/client";
import type { CreateWebhookEndpointDto, UpdateWebhookEndpointDto } from "./webhook.dto";

const SIGNATURE_VERSION = "v1";
const DEFAULT_TIMEOUT_MS = 5_000;
const MAX_RESPONSE_BODY_BYTES = 2_000;

export interface WebhookEvent {
	type: string;
	data: Record<string, unknown>;
	id?: string;
	occurredAt?: string;
}

export interface WebhookEndpointView {
	id: string;
	name: string;
	url: string;
	events: string[];
	active: boolean;
	createdAt: Date;
	updatedAt: Date;
}

export function signWebhookBody(secret: string, timestamp: string, body: string) {
	const digest = createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
	return `${SIGNATURE_VERSION}=${digest}`;
}

@Injectable()
export class WebhookService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly cipher: CipherService,
	) {}

	async listEndpoints(organizationId: string): Promise<WebhookEndpointView[]> {
		const endpoints = await this.prisma.webhookEndpoint.findMany({
			where: { organizationId },
			orderBy: [{ active: "desc" }, { createdAt: "desc" }],
		});
		return endpoints.map(toEndpointView);
	}

	async createEndpoint(organizationId: string, dto: CreateWebhookEndpointDto, createdByUserId?: string | null) {
		const secret = dto.secret?.trim() || randomBytes(32).toString("hex");
		const endpoint = await this.prisma.webhookEndpoint.create({
			data: {
				organizationId,
				name: dto.name.trim(),
				url: normalizeWebhookUrl(dto.url),
				events: normalizeEvents(dto.events) as unknown as Prisma.InputJsonValue,
				secretEncrypted: this.cipher.encrypt(secret),
				createdByUserId,
			},
		});
		return { endpoint: toEndpointView(endpoint), signingSecret: secret };
	}

	async updateEndpoint(organizationId: string, endpointId: string, dto: UpdateWebhookEndpointDto) {
		const existing = await this.findEndpoint(organizationId, endpointId);
		const data: Prisma.WebhookEndpointUpdateInput = {};
		if (dto.name !== undefined) data.name = dto.name.trim();
		if (dto.url !== undefined) data.url = normalizeWebhookUrl(dto.url);
		if (dto.events !== undefined) data.events = normalizeEvents(dto.events) as unknown as Prisma.InputJsonValue;
		if (dto.active !== undefined) data.active = dto.active;
		if (dto.secret !== undefined) data.secretEncrypted = this.cipher.encrypt(dto.secret.trim());
		const endpoint = await this.prisma.webhookEndpoint.update({ where: { id: existing.id }, data });
		return toEndpointView(endpoint);
	}

	async deleteEndpoint(organizationId: string, endpointId: string) {
		const existing = await this.findEndpoint(organizationId, endpointId);
		await this.prisma.webhookEndpoint.delete({ where: { id: existing.id } });
		return { deleted: true };
	}

	async sendTestEvent(organizationId: string, endpointId: string) {
		const endpoint = await this.findEndpoint(organizationId, endpointId);
		return this.deliverToEndpoint(endpoint, {
			id: randomUUID(),
			type: "webhook.test",
			occurredAt: new Date().toISOString(),
			data: { ok: true },
		});
	}

	async publish(organizationId: string, event: WebhookEvent) {
		const endpoints = await this.prisma.webhookEndpoint.findMany({
			where: { organizationId, active: true },
		});
		const matching = endpoints.filter((endpoint) => subscribesTo(endpoint, event.type));
		return Promise.all(matching.map((endpoint) => this.deliverToEndpoint(endpoint, event)));
	}

	async deliverToEndpoint(endpoint: WebhookEndpoint, event: WebhookEvent): Promise<WebhookDelivery> {
		const body = JSON.stringify({
			id: event.id ?? randomUUID(),
			type: event.type,
			occurredAt: event.occurredAt ?? new Date().toISOString(),
			data: event.data,
		});
		const timestamp = Math.floor(Date.now() / 1000).toString();
		const signature = signWebhookBody(this.cipher.decrypt(endpoint.secretEncrypted), timestamp, body);
		const delivery = await this.prisma.webhookDelivery.create({
			data: {
				organizationId: endpoint.organizationId,
				endpointId: endpoint.id,
				eventType: event.type,
				payload: JSON.parse(body) as Prisma.InputJsonValue,
				attempts: 1,
			},
		});

		try {
			const response = await fetchWithTimeout(endpoint.url, {
				method: "POST",
				headers: {
					"content-type": "application/json",
					"user-agent": "vyllion-webhooks/1.0",
					"x-webhook-id": delivery.id,
					"x-webhook-timestamp": timestamp,
					"x-webhook-signature": signature,
				},
				body,
			});
			const responseBody = await readBoundedResponse(response);
			return this.prisma.webhookDelivery.update({
				where: { id: delivery.id },
				data: {
					status: response.ok ? "DELIVERED" : "FAILED",
					responseStatus: response.status,
					responseBody,
					deliveredAt: response.ok ? new Date() : null,
					errorMessage: response.ok ? null : `HTTP ${response.status}`,
				},
			});
		} catch (error) {
			return this.prisma.webhookDelivery.update({
				where: { id: delivery.id },
				data: {
					status: "FAILED",
					errorMessage: error instanceof Error ? error.message : String(error),
				},
			});
		}
	}

	private async findEndpoint(organizationId: string, endpointId: string) {
		const endpoint = await this.prisma.webhookEndpoint.findFirst({ where: { id: endpointId, organizationId } });
		if (!endpoint) throw new NotFoundException("Webhook endpoint not found");
		return endpoint;
	}
}

function normalizeWebhookUrl(value: string) {
	const url = new URL(value);
	if (url.protocol !== "https:") {
		throw new BadRequestException("Webhook URL must use HTTPS");
	}
	if (url.username || url.password) {
		throw new BadRequestException("Webhook URL must not include credentials");
	}
	return url.toString();
}

function normalizeEvents(events: readonly string[]) {
	const normalized = [...new Set(events.map((event) => event.trim()).filter(Boolean))].sort();
	if (normalized.length === 0) throw new BadRequestException("At least one webhook event is required");
	for (const event of normalized) {
		if (event !== "*" && !/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/i.test(event)) {
			throw new BadRequestException(`Invalid webhook event "${event}"`);
		}
	}
	return normalized;
}

function endpointEvents(endpoint: WebhookEndpoint) {
	return Array.isArray(endpoint.events)
		? endpoint.events.filter((event): event is string => typeof event === "string")
		: [];
}

function subscribesTo(endpoint: WebhookEndpoint, eventType: string) {
	const events = endpointEvents(endpoint);
	return events.includes("*") || events.includes(eventType);
}

function toEndpointView(endpoint: WebhookEndpoint): WebhookEndpointView {
	return {
		id: endpoint.id,
		name: endpoint.name,
		url: endpoint.url,
		events: endpointEvents(endpoint),
		active: endpoint.active,
		createdAt: endpoint.createdAt,
		updatedAt: endpoint.updatedAt,
	};
}

async function fetchWithTimeout(url: string, init: RequestInit) {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
	try {
		return await fetch(url, { ...init, signal: controller.signal });
	} finally {
		clearTimeout(timeout);
	}
}

async function readBoundedResponse(response: Response) {
	const text = await response.text();
	return text.length > MAX_RESPONSE_BODY_BYTES ? text.slice(0, MAX_RESPONSE_BODY_BYTES) : text;
}

import { BadRequestException } from "@nestjs/common";
import { signWebhookBody, WebhookService } from "./webhook.service";

const now = new Date("2026-05-31T09:00:00.000Z");

const makeService = () => {
	const prisma = {
		webhookEndpoint: {
			create: jest.fn(async ({ data }) => ({
				id: "wh_1",
				active: true,
				createdAt: now,
				updatedAt: now,
				...data,
			})),
			findMany: jest.fn(),
			findFirst: jest.fn(),
			update: jest.fn(),
			delete: jest.fn(),
		},
		webhookDelivery: {
			create: jest.fn(async ({ data }) => ({
				id: "del_1",
				status: "PENDING",
				responseStatus: null,
				responseBody: null,
				errorMessage: null,
				nextAttemptAt: null,
				deliveredAt: null,
				createdAt: now,
				updatedAt: now,
				...data,
			})),
			update: jest.fn(async ({ data }) => ({
				id: "del_1",
				createdAt: now,
				updatedAt: now,
				...data,
			})),
		},
	};
	const cipher = {
		encrypt: jest.fn((value: string) => `enc:${value}`),
		decrypt: jest.fn((value: string) => value.replace(/^enc:/, "")),
	};
	const service = new WebhookService(prisma as never, cipher as never);
	return { service, prisma, cipher };
};

describe("WebhookService", () => {
	const originalFetch = globalThis.fetch;

	afterEach(() => {
		globalThis.fetch = originalFetch;
		jest.restoreAllMocks();
	});

	it("signs payloads with timestamp-bound HMAC headers", () => {
		const signature = signWebhookBody("secret", "1780000000", '{"ok":true}');

		expect(signature).toMatch(/^v1=[a-f0-9]{64}$/);
		expect(signature).toBe(signWebhookBody("secret", "1780000000", '{"ok":true}'));
		expect(signature).not.toBe(signWebhookBody("secret", "1780000001", '{"ok":true}'));
	});

	it("creates HTTPS endpoints with encrypted one-time signing secrets", async () => {
		const { service, prisma, cipher } = makeService();

		const result = await service.createEndpoint("org_1", {
			name: "  ERP bridge  ",
			url: "https://integrator.example.test/hooks",
			events: ["invoice.created", "invoice.created", "webhook.test"],
		});

		expect(result.endpoint).toMatchObject({
			id: "wh_1",
			name: "ERP bridge",
			url: "https://integrator.example.test/hooks",
			events: ["invoice.created", "webhook.test"],
			active: true,
		});
		expect(result.signingSecret).toHaveLength(64);
		expect(cipher.encrypt).toHaveBeenCalledWith(result.signingSecret);
		expect(prisma.webhookEndpoint.create).toHaveBeenCalledWith({
			data: expect.objectContaining({
				organizationId: "org_1",
				secretEncrypted: `enc:${result.signingSecret}`,
			}),
		});
	});

	it("rejects non-HTTPS endpoint URLs", async () => {
		const { service } = makeService();

		await expect(
			service.createEndpoint("org_1", {
				name: "Unsafe",
				url: "http://example.test/hook",
				events: ["invoice.created"],
			}),
		).rejects.toBeInstanceOf(BadRequestException);
	});

	it("records signed delivery results without exposing the secret", async () => {
		const { service, prisma } = makeService();
		const fetchMock = jest.fn(async (_url: string, _init: RequestInit) => new Response("accepted", { status: 202 }));
		globalThis.fetch = fetchMock as typeof fetch;

		await service.deliverToEndpoint(
			{
				id: "wh_1",
				organizationId: "org_1",
				name: "ERP bridge",
				url: "https://integrator.example.test/hooks",
				events: ["invoice.created"],
				secretEncrypted: "enc:delivery-secret",
				active: true,
				createdByUserId: null,
				createdAt: now,
				updatedAt: now,
			} as never,
			{ id: "evt_1", type: "invoice.created", occurredAt: now.toISOString(), data: { invoiceId: "inv_1" } },
		);

		expect(fetchMock).toHaveBeenCalledWith(
			"https://integrator.example.test/hooks",
			expect.objectContaining({
				method: "POST",
				headers: expect.objectContaining({
					"x-webhook-id": "del_1",
					"x-webhook-signature": expect.stringMatching(/^v1=/),
				}),
			}),
		);
		expect(prisma.webhookDelivery.create).toHaveBeenCalledWith({
			data: expect.objectContaining({
				organizationId: "org_1",
				endpointId: "wh_1",
				eventType: "invoice.created",
				attempts: 1,
			}),
		});
		expect(prisma.webhookDelivery.update).toHaveBeenCalledWith({
			where: { id: "del_1" },
			data: expect.objectContaining({
				status: "DELIVERED",
				responseStatus: 202,
				responseBody: "accepted",
			}),
		});
	});
});

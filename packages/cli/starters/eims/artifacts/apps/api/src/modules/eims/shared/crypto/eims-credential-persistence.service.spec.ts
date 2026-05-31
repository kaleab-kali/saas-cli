import { EimsCredentialPersistenceService } from "./eims-credential-persistence.service";

const baseDate = new Date("2026-05-26T10:30:00.000Z");

function credentialRow(overrides: Record<string, unknown> = {}) {
	return {
		id: "cred_1",
		organizationId: "org_1",
		sourceSystemId: "src_front",
		environment: "production",
		clientId: "client-front-pos",
		username: "TIN0074136947",
		apiKeyEncrypted: Buffer.from("old-api-key"),
		apiKeyKeyVersion: "cipher:v1",
		passwordEncrypted: null,
		passwordKeyVersion: null,
		clientSecretEncrypted: null,
		clientSecretKeyVersion: null,
		refreshTokenEncrypted: null,
		refreshTokenKeyVersion: null,
		tokenExpiresAt: null,
		lastTestedAt: null,
		lastTestStatus: null,
		lastRotatedAt: null,
		rotationRevision: 0,
		rotationEvidenceSha256: null,
		status: "configured",
		createdAt: baseDate,
		updatedAt: baseDate,
		...overrides,
	};
}

function prismaMock() {
	return {
		eimsCredential: {
			findMany: jest.fn(),
			findFirst: jest.fn(),
			create: jest.fn(),
			update: jest.fn(),
		},
	};
}

describe("EimsCredentialPersistenceService", () => {
	it("stores encrypted credential columns durably and returns only redacted metadata", async () => {
		const prisma = prismaMock();
		prisma.eimsCredential.findFirst.mockResolvedValue(null);
		prisma.eimsCredential.create.mockImplementation((args: { data: Record<string, unknown> }) =>
			Promise.resolve(credentialRow(args.data)),
		);
		const service = new EimsCredentialPersistenceService(prisma as never);

		const response = await service.saveCredential("org_1", {
			sourceSystemId: "src_front",
			environment: "production",
			clientId: "client-front-pos",
			username: "TIN0074136947",
			encryptedSecrets: {
				apiKey: "cipher-api-key",
				clientSecret: "cipher-client-secret",
			},
			status: "configured",
		});

		expect(prisma.eimsCredential.create).toHaveBeenCalledWith({
			data: expect.objectContaining({
				organizationId: "org_1",
				sourceSystemId: "src_front",
				environment: "production",
				apiKeyEncrypted: Buffer.from("cipher-api-key"),
				apiKeyKeyVersion: "cipher:v1",
				clientSecretEncrypted: Buffer.from("cipher-client-secret"),
				clientSecretKeyVersion: "cipher:v1",
			}),
		});
		expect(response.data).toMatchObject({
			message: "Connection details saved",
			sourceSystemId: "src_front",
			apiKeyConfigured: true,
			clientSecretConfigured: true,
			secretStorage: "prisma-encrypted",
			secretsReturned: false,
			handledBy: "prisma-credential-store",
		});
		expect(response.data).not.toHaveProperty("encryptedSecrets");
		expect(JSON.stringify(response.data)).not.toContain("cipher-api-key");
	});

	it("updates only supplied encrypted secrets during rotation and preserves existing configured flags", async () => {
		const prisma = prismaMock();
		const existing = credentialRow({ clientSecretEncrypted: null });
		prisma.eimsCredential.findFirst.mockResolvedValue(existing);
		prisma.eimsCredential.update.mockImplementation((args: { data: Record<string, unknown> }) =>
			Promise.resolve(credentialRow({ ...existing, ...args.data })),
		);
		const service = new EimsCredentialPersistenceService(prisma as never);

		const response = await service.saveCredential("org_1", {
			sourceSystemId: "src_front",
			environment: "production",
			encryptedSecrets: {
				clientSecret: "cipher-rotated-secret",
			},
			status: "rotation_pending_test",
			lastRotatedAt: "2026-05-26T11:00:00.000Z",
			rotationRevision: 2,
			rotationEvidenceSha256: "a".repeat(64),
		});

		const updateData = prisma.eimsCredential.update.mock.calls[0][0].data;
		expect(updateData).not.toHaveProperty("apiKeyEncrypted");
		expect(updateData).toMatchObject({
			clientSecretEncrypted: Buffer.from("cipher-rotated-secret"),
			status: "rotation_pending_test",
			rotationRevision: 2,
			rotationEvidenceSha256: "a".repeat(64),
		});
		expect(response.data).toMatchObject({
			message: "Credential rotation stored for testing",
			apiKeyConfigured: true,
			clientSecretConfigured: true,
			rotationRevision: 2,
			rotationEvidenceSha256: "a".repeat(64),
			secretsReturned: false,
		});
	});

	it("records credential test proof on the durable row", async () => {
		const prisma = prismaMock();
		const existing = credentialRow();
		prisma.eimsCredential.findFirst.mockResolvedValue(existing);
		prisma.eimsCredential.update.mockImplementation((args: { data: Record<string, unknown> }) =>
			Promise.resolve(credentialRow({ ...existing, ...args.data })),
		);
		const service = new EimsCredentialPersistenceService(prisma as never);

		const response = await service.testCredential("org_1", "src_front");

		expect(prisma.eimsCredential.update).toHaveBeenCalledWith({
			where: { id: "cred_1" },
			data: {
				lastTestedAt: expect.any(Date),
				lastTestStatus: "success",
				status: "tested",
			},
		});
		expect(response.data).toMatchObject({
			message: "Connection test succeeded",
			status: "tested",
			lastTestStatus: "success",
			lifecycle: "active",
			secretsReturned: false,
		});
	});

	it("rejects credential persistence without a source system id", async () => {
		const service = new EimsCredentialPersistenceService(prismaMock() as never);

		await expect(service.saveCredential("org_1", { encryptedSecrets: { apiKey: "cipher" } })).rejects.toThrow(
			"sourceSystemId is required",
		);
	});
});

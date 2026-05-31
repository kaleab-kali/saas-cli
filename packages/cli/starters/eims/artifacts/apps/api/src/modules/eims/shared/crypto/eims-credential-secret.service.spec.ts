import type { CipherService } from "#shared/crypto/cipher.service";
import { EimsCredentialSecretService } from "./eims-credential-secret.service";

describe("EimsCredentialSecretService", () => {
	it("encrypts MoR credential secrets and removes raw values from the persistable payload", () => {
		const cipher = { encrypt: jest.fn((value: string) => `encrypted:${value}`) } as unknown as CipherService;
		const service = new EimsCredentialSecretService(cipher);

		const sealed = service.sealPayload({
			sourceSystemId: "src_front",
			username: "TIN0074136947",
			apiKey: "raw-api-key",
			password: "raw-password",
			clientSecret: "raw-client-secret",
			refreshToken: "",
		});

		expect(sealed.persistablePayload).toMatchObject({
			sourceSystemId: "src_front",
			username: "TIN0074136947",
			encryptedSecrets: {
				apiKey: "encrypted:raw-api-key",
				password: "encrypted:raw-password",
				clientSecret: "encrypted:raw-client-secret",
			},
			apiKeyConfigured: true,
			passwordConfigured: true,
			clientSecretConfigured: true,
			refreshTokenConfigured: false,
			secretsReturned: false,
		});
		expect(sealed.secretFieldsStored).toEqual(["apiKey", "password", "clientSecret"]);
		expect(sealed.persistablePayload).not.toHaveProperty("apiKey");
		expect(sealed.persistablePayload).not.toHaveProperty("password");
		expect(sealed.persistablePayload).not.toHaveProperty("clientSecret");
		expect(sealed.persistablePayload).not.toHaveProperty("refreshToken");
		expect(cipher.encrypt).toHaveBeenCalledTimes(3);
	});

	it("adds response metadata without exposing ciphertext or raw secret values", () => {
		const cipher = { encrypt: jest.fn((value: string) => `encrypted:${value}`) } as unknown as CipherService;
		const service = new EimsCredentialSecretService(cipher);
		const sealed = service.sealPayload({ apiKey: "raw-api-key" });

		const response = service.withRedactionMetadata(
			{
				data: {
					status: "tested",
					sourceSystemId: "src_front",
				},
			},
			sealed,
		);

		expect(response).toEqual({
			data: {
				status: "tested",
				sourceSystemId: "src_front",
				secretFieldsStored: ["apiKey"],
				secretStorage: "encrypted",
				secretsReturned: false,
			},
		});
		expect(JSON.stringify(response)).not.toContain("raw-api-key");
		expect(JSON.stringify(response)).not.toContain("encrypted:raw-api-key");
	});

	it("seals credential rotations with revision and tamper-evident metadata", () => {
		const cipher = {
			encrypt: jest.fn((value: string) => `encrypted:${Buffer.from(value).toString("base64url")}`),
		} as unknown as CipherService;
		const service = new EimsCredentialSecretService(cipher);

		const rotated = service.sealRotationPayload(
			{
				sourceSystemId: "src_front",
				environment: "production",
				rotationRevision: 2,
				rotationReason: "scheduled_key_rotation",
				apiKey: "new-api-key",
				clientSecret: "new-client-secret",
			},
			new Date("2026-05-26T10:30:00.000Z"),
		);

		expect(rotated.persistablePayload).toMatchObject({
			sourceSystemId: "src_front",
			environment: "production",
			status: "rotation_pending_test",
			lastRotatedAt: "2026-05-26T10:30:00.000Z",
			rotationRevision: 3,
			encryptedSecrets: {
				apiKey: "encrypted:bmV3LWFwaS1rZXk",
				clientSecret: "encrypted:bmV3LWNsaWVudC1zZWNyZXQ",
			},
			apiKeyConfigured: true,
			clientSecretConfigured: true,
			secretsReturned: false,
		});
		expect(rotated.rotationEvidenceSha256).toMatch(/^[a-f0-9]{64}$/);
		expect(rotated.persistablePayload).not.toHaveProperty("apiKey");
		expect(rotated.persistablePayload).not.toHaveProperty("clientSecret");
		expect(JSON.stringify(rotated.persistablePayload)).not.toContain("new-api-key");
	});

	it("rejects credential rotation requests without new secret material", () => {
		const cipher = { encrypt: jest.fn((value: string) => `encrypted:${value}`) } as unknown as CipherService;
		const service = new EimsCredentialSecretService(cipher);

		expect(() =>
			service.sealRotationPayload({
				sourceSystemId: "src_front",
				rotationReason: "empty_rotation",
			}),
		).toThrow("At least one EIMS credential secret is required for rotation");
	});
});

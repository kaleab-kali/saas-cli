import { createHash } from "node:crypto";
import { BadRequestException, Injectable } from "@nestjs/common";
import { CipherService } from "#shared/crypto/cipher.service";

export const EIMS_CREDENTIAL_SECRET_FIELDS = ["apiKey", "password", "clientSecret", "refreshToken"] as const;

type EimsCredentialSecretField = (typeof EIMS_CREDENTIAL_SECRET_FIELDS)[number];

export interface SealedEimsCredentialPayload {
	persistablePayload: Record<string, unknown>;
	secretFieldsStored: EimsCredentialSecretField[];
	secretsReturned: false;
	rotationEvidenceSha256?: string;
	rotationRevision?: number;
}

@Injectable()
export class EimsCredentialSecretService {
	constructor(private readonly cipher: CipherService) {}

	sealPayload(input: Record<string, unknown>): SealedEimsCredentialPayload {
		const persistablePayload = { ...input };
		const encryptedSecrets: Partial<Record<EimsCredentialSecretField, string>> = {};
		const secretFieldsStored: EimsCredentialSecretField[] = [];

		for (const field of EIMS_CREDENTIAL_SECRET_FIELDS) {
			const value = input[field];
			delete persistablePayload[field];
			if (typeof value !== "string" || value.length === 0) continue;
			encryptedSecrets[field] = this.cipher.encrypt(value);
			secretFieldsStored.push(field);
		}

		return {
			persistablePayload: {
				...persistablePayload,
				encryptedSecrets,
				apiKeyConfigured: secretFieldsStored.includes("apiKey"),
				passwordConfigured: secretFieldsStored.includes("password"),
				clientSecretConfigured: secretFieldsStored.includes("clientSecret"),
				refreshTokenConfigured: secretFieldsStored.includes("refreshToken"),
				secretsReturned: false,
			},
			secretFieldsStored,
			secretsReturned: false,
		};
	}

	sealRotationPayload(input: Record<string, unknown>, now = new Date()): SealedEimsCredentialPayload {
		const sealed = this.sealPayload(input);
		if (sealed.secretFieldsStored.length === 0) {
			throw new BadRequestException("At least one EIMS credential secret is required for rotation");
		}

		const rotatedAt = now.toISOString();
		const rotationRevision = this.nextRotationRevision(input.rotationRevision);
		const rotationEvidenceSha256 = this.rotationEvidenceHash({
			sourceSystemId: input.sourceSystemId,
			environment: input.environment,
			secretFieldsStored: sealed.secretFieldsStored,
			rotationReason: input.rotationReason,
			rotatedAt,
			rotationRevision,
		});

		return {
			...sealed,
			persistablePayload: {
				...sealed.persistablePayload,
				status: "rotation_pending_test",
				lastRotatedAt: rotatedAt,
				rotationRevision,
				rotationEvidenceSha256,
				secretsReturned: false,
			},
			rotationEvidenceSha256,
			rotationRevision,
		};
	}

	withRedactionMetadata<T extends { data: Record<string, unknown>; meta?: Record<string, unknown> }>(
		response: T,
		sealed: SealedEimsCredentialPayload,
	): T {
		return {
			...response,
			data: {
				...response.data,
				secretFieldsStored: sealed.secretFieldsStored,
				secretStorage: sealed.secretFieldsStored.length > 0 ? "encrypted" : "unchanged",
				...(sealed.rotationEvidenceSha256 ? { rotationEvidenceSha256: sealed.rotationEvidenceSha256 } : {}),
				...(sealed.rotationRevision ? { rotationRevision: sealed.rotationRevision } : {}),
				secretsReturned: false,
			},
		};
	}

	private nextRotationRevision(value: unknown) {
		const parsed = typeof value === "number" ? value : typeof value === "string" ? Number.parseInt(value, 10) : 0;
		return Number.isFinite(parsed) && parsed > 0 ? parsed + 1 : 1;
	}

	private rotationEvidenceHash(input: Record<string, unknown>) {
		return createHash("sha256").update(JSON.stringify(input)).digest("hex");
	}
}

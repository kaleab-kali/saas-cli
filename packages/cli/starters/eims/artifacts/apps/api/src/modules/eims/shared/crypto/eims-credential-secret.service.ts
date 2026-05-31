import { Injectable } from "@nestjs/common";
import { CipherService } from "#shared/crypto/cipher.service";

export const EIMS_CREDENTIAL_SECRET_FIELDS = ["apiKey", "password", "clientSecret", "refreshToken"] as const;

type EimsCredentialSecretField = (typeof EIMS_CREDENTIAL_SECRET_FIELDS)[number];

export interface SealedEimsCredentialPayload {
	persistablePayload: Record<string, unknown>;
	secretFieldsStored: EimsCredentialSecretField[];
	secretsReturned: false;
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
				secretsReturned: false,
			},
		};
	}
}

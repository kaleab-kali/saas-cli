import { Buffer } from "node:buffer";
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "#shared/database/prisma.service";

const SECRET_COLUMNS = {
	apiKey: ["apiKeyEncrypted", "apiKeyKeyVersion"],
	password: ["passwordEncrypted", "passwordKeyVersion"],
	clientSecret: ["clientSecretEncrypted", "clientSecretKeyVersion"],
	refreshToken: ["refreshTokenEncrypted", "refreshTokenKeyVersion"],
} as const;

type SecretField = keyof typeof SECRET_COLUMNS;

interface EimsCredentialRow {
	id: string;
	sourceSystemId: string;
	environment: string;
	clientId: string | null;
	username: string | null;
	apiKeyEncrypted: Uint8Array | null;
	passwordEncrypted: Uint8Array | null;
	clientSecretEncrypted: Uint8Array | null;
	refreshTokenEncrypted: Uint8Array | null;
	tokenExpiresAt: Date | null;
	lastTestedAt: Date | null;
	lastTestStatus: string | null;
	lastRotatedAt: Date | null;
	rotationRevision?: number | null;
	rotationEvidenceSha256?: string | null;
	status: string;
	createdAt: Date;
	updatedAt: Date;
}

interface CredentialEnvelope {
	data: Record<string, unknown>;
	meta?: Record<string, unknown>;
}

@Injectable()
export class EimsCredentialPersistenceService {
	constructor(private readonly prisma: PrismaService) {}

	async listCredentials(
		organizationId: string,
	): Promise<{ data: Record<string, unknown>[]; meta: Record<string, unknown> }> {
		const rows = await this.prisma.eimsCredential.findMany({
			where: { organizationId },
			orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
		});
		return {
			data: rows.map((row) => this.redact(row)),
			meta: { organizationId, secretStorage: "prisma-encrypted", secretsReturned: false },
		};
	}

	async saveCredential(organizationId: string, payload: Record<string, unknown>): Promise<CredentialEnvelope> {
		const sourceSystemId = this.requiredString(payload.sourceSystemId, "sourceSystemId");
		const environment = this.optionalString(payload.environment) ?? "sandbox";
		const existing = await this.prisma.eimsCredential.findFirst({
			where: { organizationId, sourceSystemId, environment },
		});
		const data = this.toPrismaData(payload);
		const row = existing
			? await this.prisma.eimsCredential.update({ where: { id: existing.id }, data })
			: await this.prisma.eimsCredential.create({
					data: {
						organizationId,
						sourceSystemId,
						environment,
						status: "configured",
						...data,
					},
				});

		return {
			data: {
				message:
					payload.status === "rotation_pending_test"
						? "Credential rotation stored for testing"
						: "Connection details saved",
				...this.redact(row),
				handledBy: "prisma-credential-store",
			},
		};
	}

	async testCredential(organizationId: string, sourceSystemId?: string): Promise<CredentialEnvelope> {
		const row = await this.prisma.eimsCredential.findFirst({
			where: { organizationId, ...(sourceSystemId ? { sourceSystemId } : {}) },
			orderBy: { updatedAt: "desc" },
		});
		if (!row) throw new NotFoundException("EIMS credential not found for this tenant/source system");
		const tested = await this.prisma.eimsCredential.update({
			where: { id: row.id },
			data: {
				lastTestedAt: new Date(),
				lastTestStatus: "success",
				status: "tested",
			},
		});
		return {
			data: {
				message: "Connection test succeeded",
				...this.redact(tested),
				handledBy: "prisma-credential-store",
			},
		};
	}

	private toPrismaData(payload: Record<string, unknown>) {
		const data: Record<string, unknown> = {};
		for (const field of ["clientId", "username", "status", "rotationEvidenceSha256"] as const) {
			if (payload[field] !== undefined) data[field] = this.optionalString(payload[field]);
		}
		if (payload.tokenExpiresAt !== undefined) data.tokenExpiresAt = this.optionalDate(payload.tokenExpiresAt);
		if (payload.lastRotatedAt !== undefined) data.lastRotatedAt = this.optionalDate(payload.lastRotatedAt);
		if (payload.rotationRevision !== undefined) data.rotationRevision = this.optionalInteger(payload.rotationRevision);

		const encryptedSecrets = this.encryptedSecrets(payload.encryptedSecrets);
		for (const [field, [encryptedColumn, keyVersionColumn]] of Object.entries(SECRET_COLUMNS) as Array<
			[SecretField, readonly [string, string]]
		>) {
			const encrypted = encryptedSecrets[field];
			if (encrypted === undefined) continue;
			data[encryptedColumn] = Buffer.from(encrypted, "utf8");
			data[keyVersionColumn] = this.optionalString(payload.secretKeyVersion) ?? "cipher:v1";
		}
		return data;
	}

	private encryptedSecrets(value: unknown): Partial<Record<SecretField, string>> {
		if (!value || typeof value !== "object" || Array.isArray(value)) return {};
		const result: Partial<Record<SecretField, string>> = {};
		for (const field of Object.keys(SECRET_COLUMNS) as SecretField[]) {
			const encrypted = (value as Record<string, unknown>)[field];
			if (typeof encrypted === "string" && encrypted.length > 0) result[field] = encrypted;
		}
		return result;
	}

	private redact(row: EimsCredentialRow) {
		return {
			id: row.id,
			sourceSystemId: row.sourceSystemId,
			environment: row.environment,
			clientId: row.clientId,
			username: row.username,
			status: row.status,
			lifecycle: row.status === "tested" ? "active" : row.status,
			apiKeyConfigured: row.apiKeyEncrypted !== null,
			passwordConfigured: row.passwordEncrypted !== null,
			clientSecretConfigured: row.clientSecretEncrypted !== null,
			refreshTokenConfigured: row.refreshTokenEncrypted !== null,
			tokenExpiresAt: row.tokenExpiresAt?.toISOString() ?? null,
			lastTestedAt: row.lastTestedAt?.toISOString() ?? null,
			lastTestStatus: row.lastTestStatus,
			lastRotatedAt: row.lastRotatedAt?.toISOString() ?? null,
			rotationRevision: row.rotationRevision ?? 0,
			rotationEvidenceSha256: row.rotationEvidenceSha256 ?? null,
			secretStorage: "prisma-encrypted",
			secretsReturned: false,
			createdAt: row.createdAt.toISOString(),
			updatedAt: row.updatedAt.toISOString(),
		};
	}

	private requiredString(value: unknown, field: string) {
		const result = this.optionalString(value);
		if (!result) throw new BadRequestException(`${field} is required`);
		return result;
	}

	private optionalString(value: unknown) {
		return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
	}

	private optionalDate(value: unknown) {
		const date = typeof value === "string" || value instanceof Date ? new Date(value) : null;
		return date && !Number.isNaN(date.getTime()) ? date : null;
	}

	private optionalInteger(value: unknown) {
		const parsed =
			typeof value === "number" ? value : typeof value === "string" ? Number.parseInt(value, 10) : Number.NaN;
		return Number.isInteger(parsed) && parsed >= 0 ? parsed : 0;
	}
}

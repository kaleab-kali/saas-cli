import { Inject, Injectable } from "@nestjs/common";
import {
	EIMS_EXTERNAL_CLIENT,
	type EimsExternalClient,
	type EimsExternalResponse,
} from "../client/eims-external-client";
import { EimsCredentialPersistenceService } from "./eims-credential-persistence.service";

@Injectable()
export class EimsCredentialValidationService {
	constructor(
		private readonly credentials: EimsCredentialPersistenceService,
		@Inject(EIMS_EXTERNAL_CLIENT) private readonly client: EimsExternalClient,
	) {}

	async testCredential(organizationId: string, sourceSystemId?: string) {
		const credential = await this.credentials.credentialForValidation(organizationId, sourceSystemId);
		try {
			const response = await this.client.validateCredential({
				organizationId,
				sourceSystemId: credential.sourceSystemId,
				environment: credential.environment,
				clientId: credential.clientId,
				username: credential.username,
				credentials: credential.credentials,
			});
			return this.credentials.recordValidationResult(organizationId, credential.id, {
				lastTestStatus: this.isValid(response) ? "success" : "failed",
				sdkValidation: this.validationSummary(response),
			});
		} catch (error) {
			await this.credentials.recordValidationResult(organizationId, credential.id, {
				lastTestStatus: "failed",
				sdkValidation: { status: "error", errorType: this.errorType(error) },
			});
			throw error;
		}
	}

	private isValid(response: EimsExternalResponse) {
		const data = this.objectValue(response.data);
		if (data.valid === false || data.validated === false) return false;
		if (data.valid === true || data.validated === true) return true;
		const status = typeof data.status === "string" ? data.status.toLowerCase() : "";
		return ["accepted", "ok", "success", "valid"].includes(status);
	}

	private validationSummary(response: EimsExternalResponse) {
		const data = this.objectValue(response.data);
		return {
			status: typeof data.status === "string" ? data.status : "unknown",
			valid: this.validFlag(data, response),
			code: typeof data.code === "string" ? data.code : typeof data.errorCode === "string" ? data.errorCode : null,
		};
	}

	private validFlag(data: Record<string, unknown>, response: EimsExternalResponse) {
		if (typeof data.valid === "boolean") return data.valid;
		if (typeof data.validated === "boolean") return data.validated;
		return this.isValid(response);
	}

	private errorType(error: unknown) {
		return error instanceof Error ? error.constructor.name : "UnknownError";
	}

	private objectValue(value: unknown): Record<string, unknown> {
		return typeof value === "object" && value !== null && !Array.isArray(value)
			? (value as Record<string, unknown>)
			: {};
	}
}

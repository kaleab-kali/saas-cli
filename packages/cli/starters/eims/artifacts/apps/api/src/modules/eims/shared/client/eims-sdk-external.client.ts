import { Inject, Injectable, Optional, ServiceUnavailableException } from "@nestjs/common";
import {
	type CancelInvoiceInput,
	EIMS_SDK_CLIENT,
	type EimsExternalResponse,
	type EimsSdkClient,
	type PollBulkStatusInput,
	type RegisterInvoiceInput,
	type RegisterReceiptInput,
	type ValidateCredentialInput,
} from "./eims-external-client";

@Injectable()
export class EimsSdkExternalClient {
	constructor(@Optional() @Inject(EIMS_SDK_CLIENT) private readonly sdk?: EimsSdkClient) {}

	async registerInvoice(input: RegisterInvoiceInput): Promise<EimsExternalResponse> {
		const sdk = this.requireSdk();
		const response = await sdk.registerInvoice(input.payload ?? {}, this.tenantConfig(input));
		return this.envelope(response);
	}

	async registerReceipt(input: RegisterReceiptInput): Promise<EimsExternalResponse> {
		const sdk = this.requireSdk();
		if (!sdk.registerReceipt) throw new ServiceUnavailableException("EIMS SDK registerReceipt is not configured");
		const response = await sdk.registerReceipt(input.payload ?? {}, this.tenantConfig(input));
		return this.envelope(response);
	}

	async verifyIrn(input: { organizationId: string; irn: string }): Promise<EimsExternalResponse> {
		const sdk = this.requireSdk();
		if (!sdk.verifyIrn) throw new ServiceUnavailableException("EIMS SDK verifyIrn is not configured");
		const response = await sdk.verifyIrn({
			irn: input.irn,
			tenantConfig: this.tenantConfig(input),
		});
		return this.envelope(response);
	}

	async pollBulkStatus(input: PollBulkStatusInput): Promise<EimsExternalResponse> {
		const sdk = this.requireSdk();
		const pollBulkStatus =
			sdk.pollBulkStatus ?? sdk.pollBulkConversation ?? sdk.getBulkStatus ?? sdk.getBulkConversationStatus;
		if (!pollBulkStatus) throw new ServiceUnavailableException("EIMS SDK bulk status polling is not configured");
		const response = await pollBulkStatus.call(sdk, {
			conversationId: input.conversationId,
			tenantConfig: this.tenantConfig(input),
		});
		return this.envelope(response);
	}

	async cancelInvoice(input: CancelInvoiceInput): Promise<EimsExternalResponse> {
		const sdk = this.requireSdk();
		const cancelInvoice = sdk.cancelInvoice ?? sdk.cancelDocument ?? sdk.cancelTaxInvoice ?? sdk.submitCancellation;
		if (!cancelInvoice) throw new ServiceUnavailableException("EIMS SDK invoice cancellation is not configured");
		const response = await cancelInvoice.call(sdk, {
			irn: input.invoiceIrn,
			reasonCode: input.reasonCode,
			remark: input.remark,
			payload: input.payload ?? {},
			tenantConfig: this.tenantConfig(input),
		});
		return this.envelope(response);
	}

	async validateCredential(input: ValidateCredentialInput): Promise<EimsExternalResponse> {
		const sdk = this.requireSdk();
		const validateCredential = sdk.validateCredential ?? sdk.validateCredentials;
		if (!validateCredential) throw new ServiceUnavailableException("EIMS SDK credential validation is not configured");
		const response = await validateCredential.call(sdk, {
			credentials: input.credentials,
			tenantConfig: this.tenantConfig(input),
			environment: input.environment,
			clientId: input.clientId,
			username: input.username,
		});
		return this.envelope(response);
	}

	private requireSdk() {
		if (!this.sdk) {
			throw new ServiceUnavailableException("EIMS SDK client provider is not configured");
		}
		return this.sdk;
	}

	private tenantConfig(input: {
		organizationId: string;
		sourceSystemId?: string;
		counter?: number;
		previousIrn?: string | null;
	}) {
		return {
			organizationId: input.organizationId,
			sourceSystemId: input.sourceSystemId,
			counter: input.counter,
			previousIrn: input.previousIrn ?? null,
		};
	}

	private envelope(response: unknown): EimsExternalResponse {
		if (response && typeof response === "object" && "data" in response) return response as EimsExternalResponse;
		return { data: { sdkResponse: response } };
	}
}

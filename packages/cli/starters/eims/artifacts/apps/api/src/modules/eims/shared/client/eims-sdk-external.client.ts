import { Inject, Injectable, Optional, ServiceUnavailableException } from "@nestjs/common";
import {
	EIMS_SDK_CLIENT,
	type EimsExternalResponse,
	type EimsSdkClient,
	type RegisterInvoiceInput,
	type RegisterReceiptInput,
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

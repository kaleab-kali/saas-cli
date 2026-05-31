import { Body, Controller, Headers, HttpCode, Inject, Post } from "@nestjs/common";
import { EIMS_BACKEND_REPOSITORY, type EimsBackendRepository } from "../mock/eims-backend.repository";
import { type EimsBulkCallbackPayload, EimsBulkCallbackService } from "./eims-bulk-callback.service";
import { EimsBulkCallbackPersistenceService } from "./eims-bulk-callback-persistence.service";

@Controller("eims/callbacks")
export class EimsBulkCallbackController {
	constructor(
		private readonly callbacks: EimsBulkCallbackService,
		private readonly callbackReceipts: EimsBulkCallbackPersistenceService,
		@Inject(EIMS_BACKEND_REPOSITORY) private readonly repository: EimsBackendRepository,
	) {}

	@Post("bulk")
	@HttpCode(202)
	async receiveBulkCallback(
		@Body() body: EimsBulkCallbackPayload,
		@Headers("x-eims-signature") signature = "",
		@Headers("x-eims-timestamp") timestamp = "",
		@Headers("idempotency-key") idempotencyKey?: string,
	) {
		const knownConversationIds = this.repository
			.bulkBatches(body.organizationId)
			.data.map((row) => String((row as { conversationId?: unknown }).conversationId ?? ""))
			.filter(Boolean);

		const summary = this.callbacks.verify({
			payload: body,
			timestamp,
			signature,
			idempotencyKey,
			knownConversationIds,
		});

		return {
			data: await this.callbackReceipts.storeVerifiedCallback({
				payload: body,
				signature,
				summary,
			}),
		};
	}
}

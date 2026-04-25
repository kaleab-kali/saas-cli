import { Body, Controller, Post, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { ChapaWebhookService } from "../../application/services/chapa-webhook.service";

// Chapa posts here after payment. Public endpoint (not auth-guarded) — verification via signature/verify call.
@ApiTags("Billing - Chapa Webhook")
@Controller("billing/chapa")
export class ChapaWebhookController {
	constructor(private readonly webhook: ChapaWebhookService) {}

	@Post("webhook")
	async handle(@Query("tx_ref") txRefQuery: string | undefined, @Body() body: { tx_ref?: string }) {
		const txRef = txRefQuery ?? body?.tx_ref;
		if (!txRef) return { ok: false, error: "missing tx_ref" };
		const result = await this.webhook.handle(txRef);
		return { ok: true, ...result };
	}
}

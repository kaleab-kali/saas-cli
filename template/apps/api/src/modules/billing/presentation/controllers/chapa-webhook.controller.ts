import { createHmac, timingSafeEqual } from "node:crypto";
import { Body, Controller, Headers, HttpCode, Logger, Post, Query, Req } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import type { Request } from "express";
import { ChapaWebhookService } from "../../application/services/chapa-webhook.service";

// Public endpoint (not auth-guarded). Per Chapa docs:
//  - chapa-signature: HMAC-SHA256 of secret using secret as key
//  - x-chapa-signature: HMAC-SHA256 of raw body using secret as key
// Verify either header matches before processing. Re-verify via /v1/transaction/verify regardless.
// https://developer.chapa.co/integrations/webhooks
@ApiTags("Billing - Chapa Webhook")
@Controller("billing/chapa")
export class ChapaWebhookController {
	private readonly logger = new Logger(ChapaWebhookController.name);

	constructor(private readonly webhook: ChapaWebhookService) {}

	private verifySignature(rawBody: string, headerSignature: string | undefined): boolean {
		if (!headerSignature) return false;
		const secret = process.env.CHAPA_WEBHOOK_SECRET ?? process.env.CHAPA_SECRET_KEY ?? "";
		if (!secret) {
			this.logger.warn("CHAPA_WEBHOOK_SECRET not set — accepting webhook unverified");
			return true;
		}
		const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
		try {
			const a = Buffer.from(expected, "hex");
			const b = Buffer.from(headerSignature, "hex");
			if (a.length !== b.length) return false;
			return timingSafeEqual(a, b);
		} catch {
			return false;
		}
	}

	@Post("webhook")
	@HttpCode(200)
	async handle(
		@Req() req: Request,
		@Headers("chapa-signature") chapaSig: string | undefined,
		@Headers("x-chapa-signature") xChapaSig: string | undefined,
		@Query("tx_ref") txRefQuery: string | undefined,
		@Body() body: { tx_ref?: string; event?: string },
	) {
		// Use raw body if available (configured by main.ts bodyParser raw for /chapa/webhook).
		// Fallback: stringified JSON.
		// biome-ignore lint/suspicious/noExplicitAny: express adds rawBody dynamically
		const rawBody: string = (req as any).rawBody?.toString("utf8") ?? JSON.stringify(body);
		const verified = this.verifySignature(rawBody, xChapaSig) || this.verifySignature(rawBody, chapaSig);
		if (!verified) {
			this.logger.warn("Chapa signature verification failed");
			return { ok: false, error: "invalid signature" };
		}

		const txRef = txRefQuery ?? body?.tx_ref;
		if (!txRef) return { ok: false, error: "missing tx_ref" };
		const result = await this.webhook.handle(txRef);
		// Always 200 OK to prevent retry storm; idempotency handled by webhook service.
		return { ok: true, ...result };
	}
}

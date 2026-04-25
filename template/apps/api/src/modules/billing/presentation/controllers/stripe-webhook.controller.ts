import { BadRequestException, Controller, Headers, HttpCode, Logger, Post, Req } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import type { Request } from "express";
import { StripeWebhookService } from "../../application/services/stripe-webhook.service";
import { StripeClient } from "../../infrastructure/stripe/stripe.client";

@ApiTags("Billing - Stripe Webhook")
@Controller("billing/stripe")
export class StripeWebhookController {
	private readonly logger = new Logger(StripeWebhookController.name);

	constructor(
		private readonly stripe: StripeClient,
		private readonly webhook: StripeWebhookService,
	) {}

	@Post("webhook")
	@HttpCode(200)
	async handle(@Req() req: Request, @Headers("stripe-signature") signature: string | undefined) {
		if (!signature) throw new BadRequestException("missing Stripe-Signature header");
		// Raw body required — main.ts must register raw body parser for this route.
		// biome-ignore lint/suspicious/noExplicitAny: express adds rawBody dynamically
		const rawBody: Buffer | string = (req as any).rawBody ?? "";
		if (!rawBody || (Buffer.isBuffer(rawBody) && rawBody.length === 0)) {
			throw new BadRequestException("raw body missing — configure raw body parser for /billing/stripe/webhook");
		}
		try {
			const event = this.stripe.constructEvent(rawBody, signature);
			const result = await this.webhook.handle(event);
			return { ok: true, ...result };
		} catch (e) {
			this.logger.warn(`stripe webhook rejected: ${(e as Error).message}`);
			throw new BadRequestException("invalid signature");
		}
	}
}

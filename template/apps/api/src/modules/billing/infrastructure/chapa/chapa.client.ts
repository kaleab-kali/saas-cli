import { Injectable, Logger } from "@nestjs/common";

// Chapa REST API client — minimal subset needed for initialize + verify.
// Docs: https://developer.chapa.co/docs
interface ChapaInitializeInput {
	amount: number;
	currency: string;
	email: string;
	firstName: string;
	lastName: string;
	txRef: string;
	callbackUrl: string;
	returnUrl: string;
	customization?: { title?: string; description?: string };
}

interface ChapaInitializeResponse {
	status: string;
	message: string;
	data?: { checkout_url: string };
}

interface ChapaVerifyResponse {
	status: string;
	message: string;
	data?: {
		status: string; // "success" | "pending" | "failed"
		amount: number | string;
		currency: string;
		tx_ref: string;
		reference: string;
		email?: string;
	};
}

@Injectable()
export class ChapaClient {
	private readonly logger = new Logger(ChapaClient.name);
	private readonly baseUrl: string;
	private readonly secret: string;

	constructor() {
		this.baseUrl = process.env.CHAPA_BASE_URL ?? "https://api.chapa.co/v1";
		this.secret = process.env.CHAPA_SECRET_KEY ?? "";
		if (!this.secret) this.logger.warn("CHAPA_SECRET_KEY not set — online payments will fail");
	}

	async initialize(input: ChapaInitializeInput): Promise<{ checkoutUrl: string }> {
		const res = await fetch(`${this.baseUrl}/transaction/initialize`, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${this.secret}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				amount: input.amount.toString(),
				currency: input.currency,
				email: input.email,
				first_name: input.firstName,
				last_name: input.lastName,
				tx_ref: input.txRef,
				callback_url: input.callbackUrl,
				return_url: input.returnUrl,
				customization: input.customization,
			}),
		});
		const body = (await res.json()) as ChapaInitializeResponse;
		if (!res.ok || body.status !== "success" || !body.data?.checkout_url) {
			throw new Error(`Chapa initialize failed: ${body.message ?? res.status}`);
		}
		return { checkoutUrl: body.data.checkout_url };
	}

	async verify(txRef: string): Promise<{ status: string; amount: number; currency: string; reference: string }> {
		const res = await fetch(`${this.baseUrl}/transaction/verify/${encodeURIComponent(txRef)}`, {
			headers: { Authorization: `Bearer ${this.secret}` },
		});
		const body = (await res.json()) as ChapaVerifyResponse;
		if (!res.ok || body.status !== "success" || !body.data) {
			throw new Error(`Chapa verify failed: ${body.message ?? res.status}`);
		}
		return {
			status: body.data.status,
			amount: typeof body.data.amount === "string" ? Number.parseFloat(body.data.amount) : body.data.amount,
			currency: body.data.currency,
			reference: body.data.reference,
		};
	}
}

import { BadRequestException } from "@nestjs/common";
import { isPaymentMethod, type PaymentMethod } from "../value-objects/feature-keys.vo";

export interface SubscriptionPaymentProps {
	id: string;
	invoiceId: string;
	organizationId: string;
	amount: number;
	currency: string;
	method: PaymentMethod;
	chapaReference: string | null;
	bankReference: string | null;
	receiptNumber: string | null;
	paidAt: Date;
	recordedByUserId: string | null;
	verified: boolean;
	verifiedByUserId: string | null;
	verifiedAt: Date | null;
	note: string | null;
	createdAt: Date;
	updatedAt: Date;
}

export class SubscriptionPayment {
	private constructor(private props: SubscriptionPaymentProps) {}

	static create(props: SubscriptionPaymentProps) {
		if (props.amount <= 0) throw new BadRequestException("amount must be > 0");
		if (!isPaymentMethod(props.method)) throw new BadRequestException(`invalid method: ${props.method}`);
		// Manual methods require either receiptNumber or bankReference
		const isManual = props.method.startsWith("manual_");
		if (isManual && !props.receiptNumber && !props.bankReference) {
			throw new BadRequestException("manual payment requires receiptNumber or bankReference");
		}
		if (props.method === "chapa_online" && !props.chapaReference) {
			throw new BadRequestException("chapa_online requires chapaReference");
		}
		return new SubscriptionPayment(props);
	}

	static rehydrate(props: SubscriptionPaymentProps) {
		return new SubscriptionPayment(props);
	}

	get id() {
		return this.props.id;
	}
	get amount() {
		return this.props.amount;
	}
	get invoiceId() {
		return this.props.invoiceId;
	}
	get requiresVerification() {
		return this.props.method.startsWith("manual_") && !this.props.verified;
	}

	verify(userId: string) {
		if (this.props.verified) throw new BadRequestException("already verified");
		this.props.verified = true;
		this.props.verifiedByUserId = userId;
		this.props.verifiedAt = new Date();
		this.props.updatedAt = new Date();
	}

	toPrimitives() {
		return { ...this.props };
	}
}

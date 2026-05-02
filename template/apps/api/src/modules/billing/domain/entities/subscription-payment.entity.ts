import { BadRequestException } from "@nestjs/common";
import { isPaymentMethod, type PaymentMethod } from "../value-objects/feature-keys.vo";

export interface SubscriptionPaymentProps {
	id: string;
	invoiceId: string;
	organizationId: string;
	amountMinor: number;
	currency: string;
	method: PaymentMethod;
	stripePaymentIntentId: string | null;
	stripeChargeId: string | null;
	chapaTxRef: string | null;
	chapaRefId: string | null;
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
		if (props.amountMinor <= 0) throw new BadRequestException("amountMinor must be > 0");
		if (!isPaymentMethod(props.method)) throw new BadRequestException(`invalid method: ${props.method}`);
		const isManual = props.method.startsWith("manual_");
		if (isManual && !props.receiptNumber && !props.bankReference) {
			throw new BadRequestException("manual payment requires receiptNumber or bankReference");
		}
		if (props.method.startsWith("chapa_") && !props.chapaTxRef && !props.chapaRefId) {
			throw new BadRequestException("chapa payment requires chapaTxRef or chapaRefId");
		}
		if (props.method.startsWith("stripe_") && !props.stripePaymentIntentId) {
			throw new BadRequestException("stripe payment requires stripePaymentIntentId");
		}
		return new SubscriptionPayment(props);
	}

	static rehydrate(props: SubscriptionPaymentProps) {
		return new SubscriptionPayment(props);
	}

	get id() {
		return this.props.id;
	}
	get amountMinor() {
		return this.props.amountMinor;
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

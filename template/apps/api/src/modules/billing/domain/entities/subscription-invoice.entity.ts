import { BadRequestException } from "@nestjs/common";
import type { InvoiceStatus } from "../value-objects/feature-keys.vo";

export interface SubscriptionInvoiceProps {
	id: string;
	subscriptionId: string;
	organizationId: string;
	number: string;
	status: InvoiceStatus;
	issueDate: Date;
	dueDate: Date;
	periodStart: Date;
	periodEnd: Date;
	currency: string;
	subtotalMinor: number;
	taxMinor: number;
	totalMinor: number;
	amountPaidMinor: number;
	lineType: string;
	description: string | null;
	stripeInvoiceId: string | null;
	chapaTxRef: string | null;
	checkoutUrl: string | null;
	pdfUrl: string | null;
	sentAt: Date | null;
	paidAt: Date | null;
	createdAt: Date;
	updatedAt: Date;
}

export class SubscriptionInvoice {
	private constructor(private props: SubscriptionInvoiceProps) {}

	static create(
		props: Omit<SubscriptionInvoiceProps, "taxMinor" | "totalMinor"> & {
			subtotalMinor: number;
			taxRatePct: number;
		},
	) {
		if (props.subtotalMinor <= 0) throw new BadRequestException("subtotalMinor must be > 0");
		if (props.dueDate < props.issueDate) throw new BadRequestException("dueDate before issueDate");
		const taxMinor = Math.round(props.subtotalMinor * (props.taxRatePct / 100));
		const totalMinor = props.subtotalMinor + taxMinor;
		const { taxRatePct: _ignore, ...rest } = props;
		return new SubscriptionInvoice({ ...rest, taxMinor, totalMinor });
	}

	static rehydrate(props: SubscriptionInvoiceProps) {
		return new SubscriptionInvoice(props);
	}

	get id() {
		return this.props.id;
	}
	get status() {
		return this.props.status;
	}
	get outstandingMinor() {
		return this.props.totalMinor - this.props.amountPaidMinor;
	}
	get isOverdue() {
		return (
			(this.props.status === "sent" || this.props.status === "overdue") &&
			this.props.dueDate < new Date() &&
			this.outstandingMinor > 0
		);
	}

	markSent(pdfUrl: string | null) {
		if (this.props.status !== "draft") return;
		this.props.status = "sent";
		this.props.sentAt = new Date();
		if (pdfUrl) this.props.pdfUrl = pdfUrl;
		this.props.updatedAt = new Date();
	}

	applyPayment(amountMinor: number) {
		if (amountMinor <= 0) throw new BadRequestException("payment amount must be > 0");
		const newPaid = this.props.amountPaidMinor + amountMinor;
		if (newPaid > this.props.totalMinor) throw new BadRequestException("payment exceeds invoice total");
		this.props.amountPaidMinor = newPaid;
		if (newPaid >= this.props.totalMinor) {
			this.props.status = "paid";
			this.props.paidAt = new Date();
		}
		this.props.updatedAt = new Date();
	}

	markOverdue() {
		if (this.props.status === "sent" && this.isOverdue) {
			this.props.status = "overdue";
			this.props.updatedAt = new Date();
		}
	}

	void() {
		if (this.props.status === "paid") throw new BadRequestException("cannot void paid invoice");
		this.props.status = "void";
		this.props.updatedAt = new Date();
	}

	toPrimitives() {
		return { ...this.props };
	}
}

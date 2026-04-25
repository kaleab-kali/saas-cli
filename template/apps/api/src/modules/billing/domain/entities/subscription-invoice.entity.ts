import { BadRequestException } from "@nestjs/common";
import { type InvoiceStatus, VAT_RATE } from "../value-objects/feature-keys.vo";

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
	subtotal: number;
	vatAmount: number;
	total: number;
	amountPaid: number;
	lineType: string;
	description: string | null;
	pdfUrl: string | null;
	sentAt: Date | null;
	paidAt: Date | null;
	createdAt: Date;
	updatedAt: Date;
}

export class SubscriptionInvoice {
	private constructor(private props: SubscriptionInvoiceProps) {}

	static create(props: Omit<SubscriptionInvoiceProps, "vatAmount" | "total"> & { subtotal: number }) {
		if (props.subtotal <= 0) throw new BadRequestException("subtotal must be > 0");
		if (props.dueDate < props.issueDate) throw new BadRequestException("dueDate before issueDate");
		const vatAmount = Math.round(props.subtotal * VAT_RATE * 100) / 100;
		const total = Math.round((props.subtotal + vatAmount) * 100) / 100;
		return new SubscriptionInvoice({ ...props, vatAmount, total });
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
	get outstanding() {
		return Math.round((this.props.total - this.props.amountPaid) * 100) / 100;
	}
	get isOverdue() {
		return (
			(this.props.status === "sent" || this.props.status === "overdue") &&
			this.props.dueDate < new Date() &&
			this.outstanding > 0
		);
	}

	markSent(pdfUrl: string | null) {
		if (this.props.status !== "draft") return;
		this.props.status = "sent";
		this.props.sentAt = new Date();
		if (pdfUrl) this.props.pdfUrl = pdfUrl;
		this.props.updatedAt = new Date();
	}

	applyPayment(amount: number) {
		if (amount <= 0) throw new BadRequestException("payment amount must be > 0");
		const newPaid = Math.round((this.props.amountPaid + amount) * 100) / 100;
		if (newPaid > this.props.total + 0.01) throw new BadRequestException("payment exceeds invoice total");
		this.props.amountPaid = newPaid;
		if (newPaid >= this.props.total - 0.01) {
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

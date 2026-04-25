import { BadRequestException } from "@nestjs/common";
import { type AudienceType, type BulkStatus, canBulkTransition } from "../value-objects/notification.vo";

export interface BulkCommProps {
	id: string;
	organizationId: string;
	name: string;
	subject: string;
	bodyHtml: string;
	status: BulkStatus;
	audienceType: AudienceType;
	audienceRef: string | null;
	recipientCount: number;
	scheduledAt: Date | null;
	sentAt: Date | null;
	createdBy: string | null;
	stats: unknown | null;
	createdAt: Date;
	updatedAt: Date;
}

export class BulkCommunication {
	private constructor(private props: BulkCommProps) {}

	static create(props: BulkCommProps): BulkCommunication {
		if (!props.name?.trim()) throw new BadRequestException("name required");
		if (!props.subject?.trim()) throw new BadRequestException("subject required");
		if (!props.bodyHtml?.trim()) throw new BadRequestException("bodyHtml required");
		return new BulkCommunication(props);
	}

	static rehydrate(props: BulkCommProps): BulkCommunication {
		return new BulkCommunication(props);
	}

	get id() {
		return this.props.id;
	}
	get status() {
		return this.props.status;
	}

	schedule(at: Date) {
		if (!canBulkTransition(this.props.status, "scheduled")) {
			throw new BadRequestException(`cannot schedule from ${this.props.status}`);
		}
		if (at.getTime() < Date.now()) throw new BadRequestException("scheduled time must be future");
		this.props.scheduledAt = at;
		this.props.status = "scheduled";
		this.props.updatedAt = new Date();
	}

	startSending(recipientCount: number) {
		if (!canBulkTransition(this.props.status, "sending")) {
			throw new BadRequestException(`cannot start sending from ${this.props.status}`);
		}
		this.props.recipientCount = recipientCount;
		this.props.status = "sending";
		this.props.updatedAt = new Date();
	}

	markSent(stats: { delivered: number; failed: number }) {
		if (!canBulkTransition(this.props.status, "sent")) {
			throw new BadRequestException(`cannot mark sent from ${this.props.status}`);
		}
		this.props.status = "sent";
		this.props.sentAt = new Date();
		this.props.stats = stats;
		this.props.updatedAt = new Date();
	}

	markFailed(reason: string) {
		if (!canBulkTransition(this.props.status, "failed")) {
			throw new BadRequestException(`cannot mark failed from ${this.props.status}`);
		}
		this.props.status = "failed";
		this.props.stats = { error: reason };
		this.props.updatedAt = new Date();
	}

	updateDraft(input: { name?: string; subject?: string; bodyHtml?: string }) {
		if (this.props.status !== "draft") throw new BadRequestException("can only edit draft");
		if (input.name !== undefined) this.props.name = input.name;
		if (input.subject !== undefined) this.props.subject = input.subject;
		if (input.bodyHtml !== undefined) this.props.bodyHtml = input.bodyHtml;
		this.props.updatedAt = new Date();
	}

	toPrimitives() {
		return { ...this.props };
	}
}

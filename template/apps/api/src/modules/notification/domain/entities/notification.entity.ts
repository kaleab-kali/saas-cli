import { BadRequestException } from "@nestjs/common";
import {
	isCategory,
	isSeverity,
	type NotificationCategory,
	type NotificationSeverity,
} from "../value-objects/notification.vo";

export interface NotificationProps {
	id: string;
	organizationId: string;
	userId: string;
	category: NotificationCategory;
	severity: NotificationSeverity;
	title: string;
	body: string | null;
	linkUrl: string | null;
	sourceEvent: string | null;
	sourceRef: string | null;
	read: boolean;
	readAt: Date | null;
	archivedAt: Date | null;
	createdAt: Date;
	updatedAt: Date;
}

export class Notification {
	private constructor(private props: NotificationProps) {}

	static create(props: NotificationProps): Notification {
		if (!props.title?.trim()) throw new BadRequestException("title required");
		if (!isCategory(props.category)) throw new BadRequestException(`invalid category: ${props.category}`);
		if (!isSeverity(props.severity)) throw new BadRequestException(`invalid severity: ${props.severity}`);
		return new Notification(props);
	}

	static rehydrate(props: NotificationProps): Notification {
		return new Notification(props);
	}

	get id() {
		return this.props.id;
	}
	get userId() {
		return this.props.userId;
	}
	get read() {
		return this.props.read;
	}

	markRead() {
		if (this.props.read) return;
		this.props.read = true;
		this.props.readAt = new Date();
		this.props.updatedAt = new Date();
	}

	archive() {
		this.props.archivedAt = new Date();
		this.props.updatedAt = new Date();
	}

	toPrimitives() {
		return { ...this.props };
	}
}

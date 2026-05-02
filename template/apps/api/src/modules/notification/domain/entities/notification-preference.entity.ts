import { BadRequestException } from "@nestjs/common";
import { type EmailFrequency, isFrequency } from "../value-objects/notification.vo";

export interface PreferenceProps {
	id: string;
	organizationId: string;
	userId: string;
	eventKey: string;
	inApp: boolean;
	email: EmailFrequency;
	sms: boolean;
	createdAt: Date;
	updatedAt: Date;
}

export class NotificationPreference {
	private constructor(private props: PreferenceProps) {}

	static create(props: PreferenceProps): NotificationPreference {
		if (!props.eventKey?.trim()) throw new BadRequestException("eventKey required");
		if (!isFrequency(props.email)) throw new BadRequestException(`invalid email frequency: ${props.email}`);
		return new NotificationPreference(props);
	}

	static rehydrate(props: PreferenceProps): NotificationPreference {
		return new NotificationPreference(props);
	}

	get id() {
		return this.props.id;
	}

	setChannels(input: { inApp?: boolean; email?: EmailFrequency; sms?: boolean }) {
		if (input.inApp !== undefined) this.props.inApp = input.inApp;
		if (input.email !== undefined) {
			if (!isFrequency(input.email)) throw new BadRequestException(`invalid email frequency: ${input.email}`);
			this.props.email = input.email;
		}
		if (input.sms !== undefined) this.props.sms = input.sms;
		this.props.updatedAt = new Date();
	}

	toPrimitives() {
		return { ...this.props };
	}
}

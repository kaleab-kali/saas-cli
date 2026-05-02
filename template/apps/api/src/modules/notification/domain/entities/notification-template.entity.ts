import { BadRequestException } from "@nestjs/common";

export interface TemplateProps {
	id: string;
	organizationId: string;
	eventKey: string;
	subject: string;
	bodyHtml: string;
	bodyText: string | null;
	active: boolean;
	createdAt: Date;
	updatedAt: Date;
}

export class NotificationTemplate {
	private constructor(private props: TemplateProps) {}

	static create(props: TemplateProps): NotificationTemplate {
		if (!props.eventKey?.trim()) throw new BadRequestException("eventKey required");
		if (!props.subject?.trim()) throw new BadRequestException("subject required");
		if (!props.bodyHtml?.trim()) throw new BadRequestException("bodyHtml required");
		return new NotificationTemplate(props);
	}

	static rehydrate(props: TemplateProps): NotificationTemplate {
		return new NotificationTemplate(props);
	}

	get id() {
		return this.props.id;
	}

	update(input: { subject?: string; bodyHtml?: string; bodyText?: string | null; active?: boolean }) {
		if (input.subject !== undefined) {
			if (!input.subject.trim()) throw new BadRequestException("subject cannot be empty");
			this.props.subject = input.subject;
		}
		if (input.bodyHtml !== undefined) {
			if (!input.bodyHtml.trim()) throw new BadRequestException("bodyHtml cannot be empty");
			this.props.bodyHtml = input.bodyHtml;
		}
		if (input.bodyText !== undefined) this.props.bodyText = input.bodyText;
		if (input.active !== undefined) this.props.active = input.active;
		this.props.updatedAt = new Date();
	}

	render(variables: Record<string, string | number>): { subject: string; html: string; text: string | null } {
		const render = (tpl: string) => tpl.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => String(variables[k] ?? ""));
		return {
			subject: render(this.props.subject),
			html: render(this.props.bodyHtml),
			text: this.props.bodyText ? render(this.props.bodyText) : null,
		};
	}

	toPrimitives() {
		return { ...this.props };
	}
}

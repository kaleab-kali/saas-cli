import { Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";

export interface DomainEvent {
	eventName: string;
	organizationId: string;
	occurredAt: Date;
	payload: Record<string, unknown>;
}

@Injectable()
export class DomainEventBus {
	constructor(private readonly eventEmitter: EventEmitter2) {}

	emit(event: DomainEvent): void {
		this.eventEmitter.emit(event.eventName, event);
	}
}

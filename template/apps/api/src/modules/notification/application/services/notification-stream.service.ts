import { Injectable, type MessageEvent } from "@nestjs/common";
import { Observable, Subject } from "rxjs";

type StreamEventType = "notification" | "badge" | "ping";

interface StreamPayload {
	readonly [key: string]: unknown;
}

@Injectable()
export class NotificationStreamService {
	private readonly clients = new Map<string, Set<Subject<MessageEvent>>>();

	streamForUser(userId: string): Observable<MessageEvent> {
		return new Observable<MessageEvent>((subscriber) => {
			const subject = new Subject<MessageEvent>();
			const subscription = subject.subscribe(subscriber);
			const clients = this.clients.get(userId) ?? new Set<Subject<MessageEvent>>();

			clients.add(subject);
			this.clients.set(userId, clients);
			subject.next({
				type: "ping",
				data: { connected: true, ts: new Date().toISOString() },
			});

			return () => {
				subscription.unsubscribe();
				subject.complete();
				clients.delete(subject);
				if (clients.size === 0) this.clients.delete(userId);
			};
		});
	}

	emitToUser(userId: string, payload: StreamPayload) {
		this.emit(userId, "notification", payload);
	}

	emitBadgeCount(userId: string, unread: number) {
		this.emit(userId, "badge", { unread });
	}

	clientCount(userId: string) {
		return this.clients.get(userId)?.size ?? 0;
	}

	private emit(userId: string, type: StreamEventType, data: StreamPayload) {
		const clients = this.clients.get(userId);
		if (!clients) return;

		for (const subject of clients) {
			subject.next({ type, data });
		}
	}
}

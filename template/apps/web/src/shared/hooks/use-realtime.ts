import React from "react";

export interface RealtimeNotificationPayload {
	readonly severity?: string;
	readonly title?: string;
	readonly body?: string | null;
	readonly linkUrl?: string | null;
}

export interface RealtimeBadgePayload {
	readonly unread?: number;
}

interface UseRealtimeOptions {
	readonly enabled?: boolean;
	readonly path?: string;
	readonly onNotification?: (payload: RealtimeNotificationPayload) => void;
	readonly onBadge?: (payload: RealtimeBadgePayload) => void;
	readonly onError?: (event: Event) => void;
}

const parseEvent = <T>(event: MessageEvent<string>): T | null => {
	try {
		return JSON.parse(event.data) as T;
	} catch {
		return null;
	}
};

export function useRealtime({
	enabled = true,
	path = "/api/v1/notifications/stream",
	onNotification,
	onBadge,
	onError,
}: UseRealtimeOptions) {
	React.useEffect(() => {
		if (!enabled || typeof EventSource === "undefined") return undefined;

		const source = new EventSource(path, { withCredentials: true });
		const handleNotification = (event: MessageEvent<string>) => {
			const payload = parseEvent<RealtimeNotificationPayload>(event);
			if (payload) onNotification?.(payload);
		};
		const handleBadge = (event: MessageEvent<string>) => {
			const payload = parseEvent<RealtimeBadgePayload>(event);
			if (payload) onBadge?.(payload);
		};
		const handleError = (event: Event) => onError?.(event);

		source.addEventListener("notification", handleNotification);
		source.addEventListener("badge", handleBadge);
		source.addEventListener("error", handleError);

		return () => {
			source.removeEventListener("notification", handleNotification);
			source.removeEventListener("badge", handleBadge);
			source.removeEventListener("error", handleError);
			source.close();
		};
	}, [enabled, path, onNotification, onBadge, onError]);
}

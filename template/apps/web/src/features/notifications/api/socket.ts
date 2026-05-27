import { io, type Socket } from "socket.io-client";

let socket: Socket | null = null;

export const connectNotificationSocket = (userId: string): Socket | null => {
	if (import.meta.env.VITE_NOTIFICATIONS_SOCKET_ENABLED !== "true") return null;
	if (socket?.connected) return socket;
	socket = io("/notifications", {
		path: "/socket.io",
		transports: ["websocket", "polling"],
		auth: { userId },
		withCredentials: true,
	});
	return socket;
};

export const getNotificationSocket = () => socket;

export const disconnectNotificationSocket = () => {
	socket?.disconnect();
	socket = null;
};

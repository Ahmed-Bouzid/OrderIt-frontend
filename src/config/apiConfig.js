import Constants from "expo-constants";

export const API_CONFIG = {
	baseURL:
		Constants.expoConfig?.extra?.apiUrl ||
		"https://orderit-backend-6y1m.onrender.com",
	socketURL:
		Constants.expoConfig?.extra?.socketUrl ||
		"https://orderit-backend-6y1m.onrender.com",
	RESTAURANT_ID: "686af511bb4cba684ff3b72e",
	timeout: 10000,
};

export const SOCKET_CONFIG = {
	socketURL: (
		Constants.expoConfig?.extra?.socketUrl ||
		"https://orderit-backend-6y1m.onrender.com"
	).replace(/^https?/, "wss"),
	options: {
		transports: ["polling", "websocket"], // polling en premier pour Render
		path: "/socket.io/",
		reconnectionAttempts: 10,
		timeout: 45000,
		forceNew: true,
		query: {
			restaurantId: "686af511bb4cba684ff3b72e",
			client: "mobile-app",
		},
	},
};

console.log("API Config loaded:", API_CONFIG);

import Constants from "expo-constants";
import { Resto_id_key } from "./restaurantConfig.js";

export const API_CONFIG = {
	baseURL:
		Constants.expoConfig?.extra?.apiUrl ||
		"https://orderit-backend-6y1m.onrender.com",
	socketURL:
		Constants.expoConfig?.extra?.socketUrl ||
		"https://orderit-backend-6y1m.onrender.com",
	// 🖨️ URL locale (Mac avec l'imprimante) — utilisée uniquement pour /print/ticket
	localPrintURL:
		Constants.expoConfig?.extra?.localPrintUrl ||
		"http://192.168.1.162:3000",
	RESTAURANT_ID: Resto_id_key,
	DEFAULT_TABLE_ID: "6960d0037aca682cfc81925a", // Table T1 par défaut
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
			restaurantId: Resto_id_key,
			client: "mobile-app",
		},
	},
};

//tableid: 6960d0037aca682cfc81925a grillz
//
//
//
//

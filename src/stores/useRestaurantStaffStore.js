import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getItem as getSecureItem } from "../../utils/secureStorage";

let socketListenerAttached = false; // ⭐ Flag pour éviter les doublons

export const useServerStore = create((set, get) => ({
	servers: [],
	activeServer: null,

	// ⭐ Fonction pour attacher les listeners WebSocket
	attachSocketListener: (socket) => {
		if (!socket || socketListenerAttached) {
			return;
		}

		socketListenerAttached = true;

		socket.on("server", (event) => {
			const { type, data } = event;

			const state = get();

			switch (type) {
				case "created": {
					const exists = state.servers.some((s) => s._id === data._id);
					if (!exists) {
						set({
							servers: [...state.servers, data],
						});
					}
					break;
				}

				case "updated": {
					const updated = state.servers.map((s) =>
						s._id === data._id ? data : s,
					);
					set({ servers: updated });
					break;
				}

				case "deleted": {
					const filtered = state.servers.filter((s) => s._id !== data._id);
					set({ servers: filtered });
					break;
				}

				default:
					console.warn(`Unknown server event type: ${type}`);
			}
		});

		// ⭐ Écouter les mises à jour de statut en ligne des serveurs
		socket.on("staff-online-update", (data) => {
			const { onlineUserIds } = data;
			if (!Array.isArray(onlineUserIds)) return;
			const state = get();
			const updated = state.servers.map((s) => ({
				...s,
				isOnline: onlineUserIds.includes(s._id),
			}));
			set({ servers: updated });
		});

		return () => {
			if (socket) {
				socket.off("server");
				socket.off("staff-online-update");
				socketListenerAttached = false;
			}
		};
	},

	// �️ setters
	setServers: (servers) => set({ servers }),
	setActiveServer: (server) => set({ activeServer: server }),

	// �️ fetchServers : retourne un objet avec status, pas de redirection UI
	fetchServers: async (restaurantId) => {
		const state = get();

		// ⭐ Si les serveurs existent déjà en cache, ne pas refetch
		if (state.servers.length > 0) {
			return { success: true, data: state.servers };
		}

		try {
			if (!restaurantId) {
				console.error("❌ fetchServers : restaurantId manquant");
				return { success: false, error: "NO_RESTAURANT_ID" };
			}

			const token = await getSecureItem("@access_token");
			if (!token) {
				return { success: false, error: "NO_TOKEN" };
			}

			const { baseURL } = require("../config/apiConfig");
			const response = await fetch(`${baseURL}/servers/${restaurantId}`, {
				method: "GET",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
			});

			// Token invalide - throw error
			if (response.status === 401 || response.status === 403) {
				throw new Error("Session expirée");
			}

			if (!response.ok) {
				const text = await response.text();
				console.error("❌ Erreur fetch servers :", response.status, text);
				return {
					success: false,
					error: "SERVER_ERROR",
					status: response.status,
				};
			}

			const data = await response.json();
			// ⭐ Sauvegarder l'objet complet (id + name) au lieu de juste le nom
			set({ servers: data });

			return { success: true, data };
		} catch (err) {
			console.error("🚨 Erreur récupération serveurs :", err);
			return { success: false, error: "NETWORK_ERROR" };
		}
	},
}));

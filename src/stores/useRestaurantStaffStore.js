import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

let socketListenerAttached = false; // ⭐ Flag pour éviter les doublons

export const useServerStore = create((set, get) => ({
	servers: [],
	activeServer: null,

	// ⭐ Fonction pour attacher les listeners WebSocket
	attachSocketListener: (socket) => {
		if (!socket || socketListenerAttached) {
			return;
		}

		console.log("🔌 Attachement des listeners WebSocket pour serveurs");
		socketListenerAttached = true;

		socket.on("server", (event) => {
			const { type, data } = event;
			console.log(`📡 Événement serveur reçu: ${type}`, data);

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
						s._id === data._id ? data : s
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

		return () => {
			if (socket) {
				socket.off("server");
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
			console.log("📦 Serveurs déjà en cache, pas de fetch");
			return { success: true, data: state.servers };
		}

		try {
			if (!restaurantId) {
				console.error("❌ fetchServers : restaurantId manquant");
				return { success: false, error: "NO_RESTAURANT_ID" };
			}

			const token = await AsyncStorage.getItem("token");
			if (!token) {
				console.log("⚠️ Aucun token trouvé");
				return { success: false, error: "NO_TOKEN" };
			}

			const response = await fetch(
				`http://192.168.1.185:3000/servers/${restaurantId}`,
				{
					method: "GET",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${token}`,
					},
				}
			);

			// Token invalide - juste retourner une erreur
			if (response.status === 401 || response.status === 403) {
				console.log("🔒 Token expiré ou invalide");
				await AsyncStorage.removeItem("token"); // Nettoyer le token
				return {
					success: false,
					error: "INVALID_TOKEN",
					message: "Session expirée",
				};
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
			console.log("✅ Serveurs chargés :", data.length);

			return { success: true, data };
		} catch (err) {
			console.error("🚨 Erreur récupération serveurs :", err);
			return { success: false, error: "NETWORK_ERROR" };
		}
	},
}));

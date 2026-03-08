import { create } from "zustand";
import { API_CONFIG } from "../config/apiConfig";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getItem as getSecureItem } from "../../utils/secureStorage";

let fetchPromise = null; // ✅ Stockage de la promise pour éviter les appels parallèles

const useExpressOrdersStore = create((set, get) => ({
	expressOrders: [],
	isLoading: false,

	// ⭐ Fonction pour attacher les listeners WebSocket
	attachSocketListener: (socket) => {
		if (!socket) {
			return;
		}

		// Écouter les événements de commande
		socket.on("order", (event) => {
			const { type, data } = event;
			const state = get();

			switch (type) {
				case "created": {
					// ⭐ Ajouter SEULEMENT les commandes d'origine "client" (CLIENT-end)
					if (data.origin === "client") {
						const exists = state.expressOrders.some((o) => o._id === data._id);
						if (!exists) {
							set({
								expressOrders: [...state.expressOrders, data],
							});
						}
					}
					break;
				}

				case "statusUpdated":
				case "updated": {
					// Mettre à jour la commande existante
					const updated = state.expressOrders.map((o) =>
						o._id === data._id ? data : o,
					);
					set({ expressOrders: updated });
					break;
				}

				case "dismissed": {
					// Supprimer la commande de l'affichage (mais pas de la DB)
					const filtered = state.expressOrders.filter(
						(o) => o._id !== data._id,
					);
					set({ expressOrders: filtered });
					break;
				}

				case "deleted": {
					// Supprimer la commande complètement
					const filtered = state.expressOrders.filter(
						(o) => o._id !== data._id,
					);
					set({ expressOrders: filtered });
					break;
				}

				default:
					console.warn(`Unknown order event type: ${type}`);
			}
		});

		// 💳 Écouter les paiements complétés pour mettre à jour les commandes
		socket.on("payment-completed", ({ data }) => {
			if (data && data.orderId) {
				const state = get();
				const updated = state.expressOrders.map((order) => {
					if (order._id === data.orderId) {
						return {
							...order,
							paid: true,
							paymentStatus: "paid",
							paidAmount: data.amount || order.totalAmount,
						};
					}
					return order;
				});
				set({ expressOrders: updated });
			}
		});

		// Détachement des listeners au cleanup
		return () => {
			if (socket) {
				socket.off("order");
				socket.off("payment-completed");
				socket.off("disconnect");
			}
		};
	},

	// ⭐ Récupérer les commandes express initiales depuis l'API
	fetchExpressOrders: async (force = false) => {
		const state = get();

		// Si déjà en chargement, retourner la promise existante
		if (fetchPromise && !force) {
			return fetchPromise;
		}

		// Si pas de force et qu'on a déjà des données
		if (!force && state.expressOrders.length > 0) {
			return { success: true, data: state.expressOrders };
		}

		// Démarrer un nouveau fetch
		fetchPromise = (async () => {
			try {
				set({ isLoading: true });

				const token = await getSecureItem("access_token");
				let restaurantId = await AsyncStorage.getItem("restaurantId");

				// ⭐ Fallback vers l'ID par défaut si aucun restaurant sélectionné
				if (!restaurantId) {
					restaurantId = API_CONFIG.RESTAURANT_ID;
				}

				if (!token || !restaurantId) {
					return {
						success: false,
						error: "NO_TOKEN_OR_RESTAURANT",
						message: "Données manquantes",
					};
				}

				// ⭐ Récupérer SEULEMENT les commandes d'origine "client"
				const url = `${API_CONFIG.baseURL}/orders?restaurantId=${restaurantId}&origin=client`;
				const response = await fetch(url, {
					headers: { Authorization: `Bearer ${token}` },
				});

				// 🔹 si le token est invalide ou expiré
				if (response.status === 401 || response.status === 403) {
					throw new Error("Session expirée");
				}

				if (!response.ok) {
					const text = await response.text();
					console.error(
						"❌ Erreur fetch commandes express :",
						response.status,
						text,
					);
					return {
						success: false,
						error: "SERVER_ERROR",
						message: `Erreur serveur: ${response.status}`,
					};
				}

				const data = await response.json();
				const fetchedOrders = data.orders || data;

				// ⭐ IMPORTANT: Fusionner au lieu d'écraser pour garder les commandes WebSocket
				const currentOrders = get().expressOrders;

				const fetchedIds = new Set(fetchedOrders.map((o) => o._id));

				// Garder les commandes actuelles qui ne sont pas dans la réponse
				// (probablement des nouvelles ajoutées via WebSocket)
				const newWebSocketOrders = currentOrders.filter(
					(o) =>
						!fetchedIds.has(o._id) &&
						// Ne garder que les commandes récentes (créées dans les dernières 4h)
						new Date(o.createdAt) > new Date(Date.now() - 4 * 60 * 60 * 1000),
				);

				const allOrders = [...fetchedOrders, ...newWebSocketOrders];

				// 🔹 Trier par date de création (plus récent en premier)
				const sortedOrders = allOrders.sort(
					(a, b) => new Date(b.createdAt) - new Date(a.createdAt),
				);

				set({
					expressOrders: sortedOrders,
					isLoading: false,
				});

				return {
					success: true,
					data: sortedOrders,
				};
			} catch (error) {
				console.error("❌ [EXPRESS ORDERS STORE] Erreur fetch:", error);
				set({ isLoading: false });
				return {
					success: false,
					error: error.message,
					message: "Erreur de connexion",
				};
			} finally {
				fetchPromise = null; // Réinitialiser pour permettre de nouveaux appels
			}
		})();

		return fetchPromise;
	},

	// ⭐ Marquer une commande comme "urgente" ou "normale"
	toggleOrderUrgency: async (orderId) => {
		try {
			const token = await getSecureItem("access_token");
			if (!token) {
				throw new Error("Token manquant");
			}

			const state = get();
			const order = state.expressOrders.find((o) => o._id === orderId);
			if (!order) {
				throw new Error("Commande introuvable");
			}

			// Toggle l'urgence (on assume qu'il y a un champ 'isUrgent' ou 'priority')
			const newUrgencyState = !order.isUrgent;

			const response = await fetch(
				`${API_CONFIG.baseURL}/orders/${orderId}/urgency`,
				{
					method: "PATCH",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${token}`,
					},
					body: JSON.stringify({ isUrgent: newUrgencyState }),
				},
			);

			if (!response.ok) {
				throw new Error("Erreur lors de la mise à jour");
			}

			// Mise à jour locale immédiate (WebSocket mettra à jour aussi)
			const updated = state.expressOrders.map((o) =>
				o._id === orderId ? { ...o, isUrgent: newUrgencyState } : o,
			);
			set({ expressOrders: updated });

			return { success: true };
		} catch (error) {
			console.error("❌ [EXPRESS ORDERS STORE] Erreur toggle urgency:", error);
			return { success: false, error: error.message };
		}
	},

	// ⭐ Masquer une commande (la retire de l'affichage mais ne la supprime pas)
	dismissOrder: async (orderId) => {
		try {
			const token = await getSecureItem("access_token");
			if (!token) {
				throw new Error("Token manquant");
			}

			const response = await fetch(
				`${API_CONFIG.baseURL}/orders/${orderId}/dismiss`,
				{
					method: "PATCH",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${token}`,
					},
				},
			);

			if (!response.ok) {
				throw new Error("Erreur lors du masquage");
			}

			// Suppression locale immédiate
			const state = get();
			const filtered = state.expressOrders.filter((o) => o._id !== orderId);
			set({ expressOrders: filtered });

			return { success: true };
		} catch (error) {
			console.error("❌ [EXPRESS ORDERS STORE] Erreur dismiss:", error);
			return { success: false, error: error.message };
		}
	},

	// ⭐⭐ Marquer une commande comme préparée (foodtrucks)
	markOrderMade: async (orderId) => {
		try {
			const token = await getSecureItem("access_token");
			if (!token) {
				throw new Error("Token manquant");
			}

			const response = await fetch(
				`${API_CONFIG.baseURL}/orders/${orderId}/mark-made`,
				{
					method: "PATCH",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${token}`,
					},
					body: JSON.stringify({ isMade: true }),
				},
			);

			if (!response.ok) {
				throw new Error("Erreur lors du marquage");
			}

			// Suppression locale immédiate (la commande disparaît)
			const state = get();
			const filtered = state.expressOrders.filter((o) => o._id !== orderId);
			set({ expressOrders: filtered });

			return { success: true };
		} catch (error) {
			console.error("❌ [EXPRESS ORDERS STORE] Erreur mark made:", error);
			return { success: false, error: error.message };
		}
	},

	// ⭐⭐ Marquer plusieurs commandes comme préparées (foodtrucks)
	markMultipleOrdersMade: async (orderIds) => {
		try {
			const token = await getSecureItem("access_token");
			if (!token) {
				throw new Error("Token manquant");
			}

			if (!Array.isArray(orderIds) || orderIds.length === 0) {
				throw new Error("orderIds doit être un tableau non vide");
			}

			const response = await fetch(
				`${API_CONFIG.baseURL}/orders/bulk-mark-made`,
				{
					method: "PATCH",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${token}`,
					},
					body: JSON.stringify({ orderIds, isMade: true }),
				},
			);

			if (!response.ok) {
				throw new Error("Erreur lors du marquage multiple");
			}

			// Suppression locale immédiate (toutes les commandes disparaissent)
			const state = get();
			const orderIdsSet = new Set(orderIds);
			const filtered = state.expressOrders.filter(
				(o) => !orderIdsSet.has(o._id),
			);
			set({ expressOrders: filtered });

			return { success: true, count: orderIds.length };
		} catch (error) {
			console.error(
				"❌ [EXPRESS ORDERS STORE] Erreur mark multiple made:",
				error,
			);
			return { success: false, error: error.message };
		}
	},

	// ⭐ Reinitialiser le store
	clearExpressOrders: () => {
		set({ expressOrders: [], isLoading: false });
		fetchPromise = null;
	},
}));

export default useExpressOrdersStore;

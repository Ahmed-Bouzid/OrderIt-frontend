import { create } from "zustand";
import { API_CONFIG } from "../config/apiConfig";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getItem as getSecureItem } from "../../utils/secureStorage";

const getRestaurantId = async () => {
	const useUserStore = require("./useUserStore").default;
	const fromStore = useUserStore.getState().restaurantId;
	if (fromStore) return fromStore;
	const fromStorage = await AsyncStorage.getItem("restaurantId");
	if (fromStorage) return fromStorage;

	const selectedRestaurantRaw = await AsyncStorage.getItem("selectedRestaurant");
	if (!selectedRestaurantRaw) return null;

	try {
		const selectedRestaurant = JSON.parse(selectedRestaurantRaw);
		return selectedRestaurant?._id || null;
	} catch {
		return null;
	}
};

let fetchPromise = null;

const useKitchenOrdersStore = create((set, get) => ({
	ordersMap: {}, // { [reservationId]: Order[] }
	isLoading: false,

	// ⭐ Fonction pour attacher les listeners WebSocket
	attachSocketListener: (socket) => {
		if (!socket) {
			return;
		}

		// Écouter les événements de commande
		socket.on("order", (event) => {
			const { type, data } = event;

			// Refetcher les orders quand une commande est créée/modifiée
			if (
				type === "created" ||
				type === "updated" ||
				type === "statusUpdated"
			) {
				// Refetcher au prochain tick pour éviter les race conditions
				get().fetchOrdersForKitchen(true);
			}
		});

		// Détachement des listeners au cleanup
		return () => {
			if (socket) {
				socket.off("order");
			}
		};
	},

	// ⭐ Récupérer les commandes du restaurant pour la cuisine
	fetchOrdersForKitchen: async (force = false) => {
		const state = get();

		// ✅ Si fetch déjà en cours, attendre la promise existante
		if (fetchPromise && !force) {
			return fetchPromise;
		}

		// Si pas de force et qu'on a déjà des données
		if (!force && Object.keys(state.ordersMap).length > 0) {
			return { success: true, data: state.ordersMap };
		}

		fetchPromise = (async () => {
			try {
				set({ isLoading: true });

				const token = await getSecureItem("@access_token");
				let restaurantId = await getRestaurantId();

				if (!token || !restaurantId) {
					return {
						success: false,
						error: "NO_TOKEN_OR_RESTAURANT",
						message: "Données manquantes",
					};
				}

				// ⭐ Récupérer les commandes du restaurant
				const url = `${API_CONFIG.baseURL}/orders?restaurantId=${restaurantId}`;
				const response = await fetch(url, {
					headers: { Authorization: `Bearer ${token}` },
				});

				if (!response.ok) {
					return {
						success: false,
						error: "SERVER_ERROR",
						message: `Erreur serveur: ${response.status}`,
					};
				}

				const data = await response.json();
				const orders = Array.isArray(data) ? data : data.orders || [];

				// Construire le map { reservationId: [orders] }
				const map = {};
				orders.forEach((order) => {
					const resaId =
						order.reservationId?._id?.toString() ||
						order.reservationId?.toString();
					if (resaId) {
						if (!map[resaId]) map[resaId] = [];
						map[resaId].push(order);
					}
				});

				set({
					ordersMap: map,
					isLoading: false,
				});

				return {
					success: true,
					data: map,
				};
			} catch (error) {
				console.error("❌ [KITCHEN ORDERS STORE] Erreur fetch:", error);
				set({ isLoading: false });
				return {
					success: false,
					error: error.message,
					message: "Erreur de connexion",
				};
			} finally {
				fetchPromise = null;
			}
		})();

		return fetchPromise;
	},

	// ⭐ Réinitialiser le store
	clearKitchenOrders: () => {
		set({ ordersMap: {}, isLoading: false });
		fetchPromise = null;
	},
}));

export default useKitchenOrdersStore;

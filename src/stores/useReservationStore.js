import { create } from "zustand";

import { API_CONFIG } from "../config/apiConfig";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { fetchWithAuth } from "../../utils/tokenManager";

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

let fetchPromise = null; // ✅ Stockage de la promise pour éviter les appels parallèles

const useReservationStore = create((set, get) => ({
	reservations: [],
	isLoading: false,

	// ⭐ Fonction pour attacher les listeners WebSocket
	attachSocketListener: (socket) => {
		if (!socket) {
			return;
		}

		// Écouter les événements de réservation
		socket.on("reservation", (event) => {
			const { type, data } = event;
			const state = get();

			switch (type) {
				case "created": {
					// Ajouter la nouvelle réservation si elle n'existe pas
					const exists = state.reservations.some((r) => r._id === data._id);
					if (!exists) {
						set({
							reservations: [...state.reservations, data],
						});
					}
					break;
				}

				case "statusUpdated":
				case "presentToggled":
				case "tableAssigned":
				case "updated": {
					// Mettre à jour la réservation existante
					const updated = state.reservations.map((r) =>
						r._id === data._id ? data : r,
					);
					set({ reservations: updated });
					break;
				}

				case "deleted": {
					// Supprimer la réservation
					const filtered = state.reservations.filter((r) => r._id !== data._id);
					set({ reservations: filtered });
					break;
				}

				default:
					console.warn(`Unknown reservation event type: ${type}`);
			}
		});

		// Détachement des listeners au cleanup
		return () => {
			if (socket) {
				socket.off("reservation");
				socket.off("disconnect");
			}
		};
	},

	fetchReservations: async (force = false) => {
		const state = get();

		// ⭐ Si pas de force et cache existe, retourner le cache
		if (!force && state.reservations.length > 0) {
			return { success: true, data: state.reservations };
		}

		// ✅ Si fetch déjà en cours, attendre la promise existante
		if (fetchPromise) {
			return fetchPromise;
		}

		fetchPromise = (async () => {
			try {
				const restaurantId = await getRestaurantId();
				if (!restaurantId) {
					return {
						success: false,
						error: "NO_TOKEN_OR_RESTAURANT",
						message: "Données manquantes",
					};
				}

				const url = `${API_CONFIG.baseURL}/reservations/restaurant/${restaurantId}`;
				const response = await fetchWithAuth(url, { method: "GET" });

				if (!response.ok) {
					const text = await response.text();
					console.error(
						"❌ Erreur fetch réservations :",
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
				const fetchedReservations = data.reservations || data;

				// ⭐ IMPORTANT: Fusionner au lieu d'écraser pour garder les réservations WebSocket
				// Les réservations ajoutées via WebSocket qui ne sont pas dans la réponse API
				// (à cause de la limite de 20) doivent être conservées
				const currentReservations = get().reservations;
				const fetchedIds = new Set(fetchedReservations.map((r) => r._id));

				// Garder les réservations actuelles qui ne sont pas dans la réponse
				// (probablement des nouvelles ajoutées via WebSocket)
				const newWebSocketReservations = currentReservations.filter(
					(r) =>
						!fetchedIds.has(r._id) &&
						// Ne garder que les réservations récentes (créées dans les dernières 24h)
						new Date(r.createdAt) > new Date(Date.now() - 24 * 60 * 60 * 1000),
				);

				// Fusionner : réservations API + nouvelles WebSocket
				const mergedReservations = [
					...fetchedReservations,
					...newWebSocketReservations,
				];

				// Forcer un nouveau tableau d'objets (deep copy) pour garantir le re-render
				const refreshedReservations = mergedReservations.map((r) => ({ ...r }));
				set({ reservations: refreshedReservations });
				return { success: true, data: refreshedReservations };
			} catch (err) {
				const isSessionError =
					err?.message?.includes("Session expirée") ||
					err?.message?.includes("reconnecter");
				if (isSessionError) {
					console.warn("⚠️ Réservations: session expirée, refresh/login requis");
					return {
						success: false,
						error: "SESSION_EXPIRED",
						message: "Session expirée",
					};
				}

				console.error("🚨 Erreur récupération réservations :", err);
				return {
					success: false,
					error: "NETWORK_ERROR",
					message: "Erreur de connexion",
				};
			} finally {
				fetchPromise = null; // ✅ Libérer la promise après succès/erreur
			}
		})();

		return fetchPromise;
	},

	// facultatif : pour reset ou ajouter une nouvelle réservation
	addReservation: (newResa) =>
		set((state) => ({ reservations: [...state.reservations, newResa] })),

	// ⭐ Mettre à jour une réservation existante (pour WebSocket)
	updateReservation: (updatedResa) =>
		set((state) => ({
			reservations: state.reservations.map((r) =>
				r._id === updatedResa._id ? updatedResa : r,
			),
		})),

	resetReservations: () => set({ reservations: [] }),
}));

export default useReservationStore;

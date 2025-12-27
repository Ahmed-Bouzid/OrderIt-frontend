import { create } from "zustand";

import { API_CONFIG } from "../config/apiConfig";
import AsyncStorage from "@react-native-async-storage/async-storage";

let fetchPromise = null; // ⭐ Stockage de la promise pour éviter les appels parallèles
let isFetching = false; // ⭐ Flag global pour bloquer complètement les appels parallèles

const useReservationStore = create((set, get) => ({
	reservations: [],
	isLoading: false,

	// ⭐ Fonction pour attacher les listeners WebSocket
	attachSocketListener: (socket) => {
		if (!socket) {
			return;
		}

		console.log("🔌 Attachement des listeners WebSocket pour réservations");

		// Écouter les événements de réservation
		socket.on("reservation", (event) => {
			const { type, data } = event;
			console.log(`📡 Événement réservation reçu: ${type}`, data);

			const state = get();

			switch (type) {
				case "created": {
					// Ajouter la nouvelle réservation si elle n'existe pas
					const exists = state.reservations.some((r) => r._id === data._id);
					if (!exists) {
						set({
							reservations: [...state.reservations, data],
						});
						console.log("✅ Nouvelle réservation ajoutée au store");
					}
					break;
				}

				case "statusUpdated":
				case "presentToggled":
				case "tableAssigned": {
					// Mettre à jour la réservation existante
					const updated = state.reservations.map((r) =>
						r._id === data._id ? data : r
					);
					set({ reservations: updated });
					console.log(`✅ Réservation ${type} mise à jour au store`);
					break;
				}

				case "deleted": {
					// Supprimer la réservation
					const filtered = state.reservations.filter((r) => r._id !== data._id);
					set({ reservations: filtered });
					console.log("✅ Réservation supprimée du store");
					break;
				}

				default:
					console.warn(`Unknown reservation event type: ${type}`);
			}
		});

		// Listener pour la déconnexion - réinitialiser le flag
		socket.on("disconnect", () => {
			console.log("🔌 Socket déconnecté");
		});

		// Détachement des listeners au cleanup
		return () => {
			if (socket) {
				socket.off("reservation");
				socket.off("disconnect");
				console.log("🔌 Listeners WebSocket détachés");
			}
		};
	},

	fetchReservations: async (force = false) => {
		const state = get();

		// ⭐ Si pas de force et cache existe, retourner le cache
		if (!force && state.reservations.length > 0) {
			console.log("📦 Réservations déjà en cache, pas de fetch");
			return { success: true, data: state.reservations };
		}

		// ⭐ BLOQUER COMPLÈTEMENT les appels parallèles
		if (isFetching || fetchPromise) {
			console.log("⏳ Requête réservations déjà en cours, attente...");
			if (fetchPromise) return fetchPromise;
			// Attendre que isFetching passe à false
			while (isFetching) {
				await new Promise((resolve) => setTimeout(resolve, 50));
			}
			// Réessayer une fois le flag déverrouillé
			return useReservationStore.getState().fetchReservations();
		}

		fetchPromise = (async () => {
			isFetching = true; // ⭐ Marquer comme en cours
			try {
				const token = await AsyncStorage.getItem("@access_token");
				const restaurantId = await AsyncStorage.getItem("restaurantId");
				console.log("🔍 [ReservationStore] fetchReservations appelé");
				console.log("🔍 Token:", token ? "présent" : "absent");
				console.log("🔍 RestaurantId:", restaurantId);
				if (!token || !restaurantId) {
					console.log("⚠️ Token ou restaurantId manquant");
					return {
						success: false,
						error: "NO_TOKEN_OR_RESTAURANT",
						message: "Données manquantes",
					};
				}

				const url = `${API_CONFIG.baseURL}/reservations/restaurant/${restaurantId}`;
				console.log("🔍 URL CORRIGÉE:", url);
				const response = await fetch(url, {
					headers: { Authorization: `Bearer ${token}` },
				});
				console.log("🔍 Status réponse:", response.status);

				// 🔹 si le token est invalide ou expiré
				if (response.status === 401 || response.status === 403) {
					console.log("🔒 Token expiré ou invalide");
					await AsyncStorage.removeItem("token");
					return {
						success: false,
						error: "INVALID_TOKEN",
						message: "Session expirée",
					};
				}

				if (!response.ok) {
					const text = await response.text();
					console.error(
						"❌ Erreur fetch réservations :",
						response.status,
						text
					);
					return {
						success: false,
						error: "SERVER_ERROR",
						message: `Erreur serveur: ${response.status}`,
					};
				}

				const data = await response.json();
				set({ reservations: data.reservations || data });
				return { success: true, data: data.reservations || data };
			} catch (err) {
				console.error("🚨 Erreur récupération réservations :", err);
				return {
					success: false,
					error: "NETWORK_ERROR",
					message: "Erreur de connexion",
				};
			} finally {
				isFetching = false; // ⭐ Déverrouiller le flag
				fetchPromise = null; // ⭐ Réinitialiser la promise après succès/erreur
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
				r._id === updatedResa._id ? updatedResa : r
			),
		})),

	resetReservations: () => set({ reservations: [] }),
}));

export default useReservationStore;

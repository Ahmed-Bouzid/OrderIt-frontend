import { create } from "zustand";

import { API_CONFIG } from "../config/apiConfig";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getItem as getSecureItem } from "../../utils/secureStorage";

let fetchPromise = null; // ✅ Stockage de la promise pour éviter les appels parallèles

const useReservationStore = create((set, get) => ({
	reservations: [],
	isLoading: false,

	// ⭐ Fonction pour attacher les listeners WebSocket
	attachSocketListener: (socket) => {
		if (!socket) {
			console.log(
				"❌ [RESA STORE] Socket null, impossible d'attacher listener",
			);
			return;
		}

		console.log("✅ [RESA STORE] Attachement listener WebSocket reservation");

		// Écouter les événements de réservation
		socket.on("reservation", (event) => {
			console.log("📡 [RESA STORE] WebSocket event reçu:", event);
			const { type, data } = event;
			const state = get();

			switch (type) {
				case "created": {
					console.log("➕ [RESA STORE] Nouvelle réservation:", data._id);
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
				case "tableAssigned": {
					console.log(
						"🔄 [RESA STORE] Mise à jour réservation:",
						data._id,
						"- status:",
						data.status,
					);
					// Mettre à jour la réservation existante
					const updated = state.reservations.map((r) =>
						r._id === data._id ? data : r,
					);
					set({ reservations: updated });
					break;
				}

				case "deleted": {
					console.log("🗑️ [RESA STORE] Suppression réservation:", data._id);
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
			console.log("📦 Réservations déjà en cache, pas de fetch");
			return { success: true, data: state.reservations };
		}

		// ✅ Si fetch déjà en cours, attendre la promise existante
		if (fetchPromise) {
			console.log("⏳ Requête réservations déjà en cours, attente...");
			return fetchPromise;
		}

		fetchPromise = (async () => {
			try {
				const token = await getSecureItem("@access_token");
				const restaurantId = await AsyncStorage.getItem("restaurantId");
				if (!token || !restaurantId) {
					return {
						success: false,
						error: "NO_TOKEN_OR_RESTAURANT",
						message: "Données manquantes",
					};
				}

				const url = `${API_CONFIG.baseURL}/reservations/restaurant/${restaurantId}`;
				const response = await fetch(url, {
					headers: { Authorization: `Bearer ${token}` },
				});

				// 🔹 si le token est invalide ou expiré
				if (response.status === 401 || response.status === 403) {
					console.log("🔒 Token expiré ou invalide");
					throw new Error("Session expirée");
				}

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

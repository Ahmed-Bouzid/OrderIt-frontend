import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

const useReservationStore = create((set, get) => ({
	reservations: [],

	fetchReservations: async () => {
		try {
			const token = await AsyncStorage.getItem("token");
			if (!token) {
				console.log("⚠️ Aucun token trouvé");
				return { success: false, error: "NO_TOKEN", message: "Token manquant" };
			}

			const response = await fetch(`http://192.168.1.185:3000/reservations`, {
				headers: { Authorization: `Bearer ${token}` },
			});

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
				console.error("❌ Erreur fetch réservations :", response.status, text);
				return {
					success: false,
					error: "SERVER_ERROR",
					message: `Erreur serveur: ${response.status}`,
				};
			}

			const data = await response.json();
			set({ reservations: data });
			return { success: true, data };
		} catch (err) {
			console.error("🚨 Erreur récupération réservations :", err);
			return {
				success: false,
				error: "NETWORK_ERROR",
				message: "Erreur de connexion",
			};
		}
	},

	// facultatif : pour reset ou ajouter une nouvelle réservation
	addReservation: (newResa) =>
		set((state) => ({ reservations: [...state.reservations, newResa] })),

	resetReservations: () => set({ reservations: [] }),
}));

export default useReservationStore;

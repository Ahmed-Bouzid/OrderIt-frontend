import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as RootNavigation from "../../utils/RootNavigation"; // 🔹 si tu veux rediriger même depuis un store

const useReservationStore = create((set, get) => ({
	reservations: [],

	fetchReservations: async () => {
		try {
			const token = await AsyncStorage.getItem("token");
			if (!token) {
				console.log("⚠️ Aucun token trouvé — redirection vers Login");
				RootNavigation.navigate("Login"); // 🔹 redirige vers la page Login
				return;
			}

			const response = await fetch(`http://192.168.1.185:3000/reservations`, {
				headers: { Authorization: `Bearer ${token}` },
			});

			// 🔹 si le token est invalide ou expiré
			if (response.status === 401 || response.status === 403) {
				console.log("🔒 Token expiré ou invalide — redirection vers Login");
				await AsyncStorage.removeItem("token");
				RootNavigation.navigate("Login");
				return;
			}

			if (!response.ok) {
				console.error("❌ Erreur fetch réservations :", response.status);
				return;
			}

			const data = await response.json();
			set({ reservations: data });
		} catch (err) {
			console.error("🚨 Erreur récupération réservations :", err);
		}
	},

	// facultatif : pour reset ou ajouter une nouvelle réservation
	addReservation: (newResa) =>
		set((state) => ({ reservations: [...state.reservations, newResa] })),

	resetReservations: () => set({ reservations: [] }),
}));

export default useReservationStore;

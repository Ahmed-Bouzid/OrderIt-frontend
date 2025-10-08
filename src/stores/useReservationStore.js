import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

const useReservationStore = create((set, get) => ({
	reservations: [],

	fetchReservations: async () => {
		try {
			const token = await AsyncStorage.getItem("token");
			if (!token) return console.log("⚠️ Pas de token");

			const response = await fetch(`http://192.168.1.165:3000/reservations`, {
				headers: { Authorization: `Bearer ${token}` },
			});

			if (!response.ok) {
				console.error("Erreur fetch réservations :", response.status);
				return;
			}

			const data = await response.json();
			set({ reservations: data });
		} catch (err) {
			console.error("Erreur récupération réservations :", err);
		}
	},

	// facultatif : pour reset ou ajouter une nouvelle réservation
	addReservation: (newResa) =>
		set((state) => ({ reservations: [...state.reservations, newResa] })),

	resetReservations: () => set({ reservations: [] }),
}));

export default useReservationStore;

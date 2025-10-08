import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

const useTableStore = create((set, get) => ({
	tables: [],

	fetchTables: async (restaurantId) => {
		try {
			const token = await AsyncStorage.getItem("token");
			if (!token) return console.log("⚠️ Pas de token");

			const response = await fetch(
				`http://192.168.1.165:3000/tables/restaurant/${restaurantId}`,
				{ headers: { Authorization: `Bearer ${token}` } }
			);

			if (!response.ok) {
				console.error("Erreur fetch tables :", response.status);
				return;
			}

			const data = await response.json();
			set({ tables: data });
		} catch (err) {
			console.error("Erreur récupération tables :", err);
		}
	},

	addTable: (newTable) =>
		set((state) => ({ tables: [...state.tables, newTable] })),

	resetTables: () => set({ tables: [] }),
}));

export default useTableStore;

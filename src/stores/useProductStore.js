import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const useProductStore = create((set) => ({
	products: [],
	setProducts: (products) => set({ products }),
	fetchProducts: async (restaurantId) => {
		try {
			const token = await AsyncStorage.getItem("clientToken");
			if (!token) {
				console.error("❌ Aucun token client disponible !");
				return;
			}

			const res = await fetch(
				`http://192.168.1.185:3000/products/restaurant/${restaurantId}`,
				{ headers: { Authorization: `Bearer ${token}` } }
			);

			if (!res.ok) {
				const text = await res.text();
				console.error("❌ Erreur fetch produits :", res.status, text);
				return;
			}

			const data = await res.json();
			set({ products: data });
		} catch (err) {
			console.error("❌ Exception fetch produits :", err);
		}
	},
}));

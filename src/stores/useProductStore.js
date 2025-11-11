import { create } from "zustand";
import { productService } from "../../../shared-api/services/productService.js";

const useProductStore = create((set, get) => ({
	products: [],

	fetchProducts: async () => {
		try {
			const token = await AsyncStorage.getItem("token");
			const products = await productService.fetchProducts(token);
			set({ products: Array.isArray(products) ? products : [] });
		} catch (err) {
			console.error("❌ Error fetching products:", err);
		}
	},

	setProducts: (products) => set({ products }),
}));

export default useProductStore;

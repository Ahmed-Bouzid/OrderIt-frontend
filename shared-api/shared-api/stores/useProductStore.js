// shared-api/stores/useProductStore.js
import { create } from "zustand";
import { productService } from "../services/productService.js";

const useProductStore = create((set, get) => ({
	products: [],

	fetchProducts: async (token) => {
		// ✅ Accepte token en paramètre
		try {
			const products = await productService.fetchProducts(token);
			set({ products });
			return products;
		} catch (err) {
			console.error("❌ Error fetching products:", err);
			throw err;
		}
	},

	setProducts: (products) => set({ products }),
}));

export default useProductStore;

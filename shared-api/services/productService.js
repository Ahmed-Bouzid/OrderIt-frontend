import { API_CONFIG } from "../config/apiConfig.js";

export const productService = {
	async fetchProducts(token = null) {
		const headers = {};
		if (token) {
			headers.Authorization = `Bearer ${token}`;
		}

		// ✅ UTILISE LA MÊME URL QUE DANS L'ANCIEN CODE :
		const response = await fetch(
			`${API_CONFIG.BASE_URL}/products/restaurant/${API_CONFIG.RESTAURANT_ID}`,
			{ headers }
		);

		if (!response.ok) throw new Error("Failed to fetch products");
		return response.json();
	},
};

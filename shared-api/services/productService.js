import { API_CONFIG } from "../../src/config/apiConfig.js";

export const productService = {
	async fetchProducts(token = null) {
		const headers = {};
		if (token) {
			headers.Authorization = `Bearer ${token}`;
		}

		const response = await fetch(
			`${API_CONFIG.baseURL}/products/restaurant/${API_CONFIG.RESTAURANT_ID}`,
			{ headers }
		);

		if (!response.ok) throw new Error("Failed to fetch products");
		return response.json();
	},
};

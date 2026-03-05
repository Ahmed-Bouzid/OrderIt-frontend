import { API_CONFIG } from "../config/apiConfig.js";

export const productService = {
	async fetchProducts(token = null) {
		const headers = {
			"Content-Type": "application/json",
		};

		if (token) {
			headers.Authorization = `Bearer ${token}`;
		}

		const url = `${API_CONFIG.baseURL}/products/restaurant/${API_CONFIG.RESTAURANT_ID}`;
		try {
			const response = await fetch(url, { headers });

			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(
					`Failed to fetch products: ${response.status} - ${errorText}`
				);
			}

			const data = await response.json();
			// console.log("✅ Produits récupérés:", data.length, "produits");
			return data;
		} catch (error) {
			console.error("💥 Erreur complète dans fetchProducts:", error.message);
			throw error;
		}
	},
};

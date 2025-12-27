import { API_CONFIG } from "../../src/config/apiConfig.js";

export const reservationService = {
	async fetchReservations(token) {
		if (!token) throw new Error("Token required");

		const response = await fetch(`${API_CONFIG.baseURL}/reservations`, {
			headers: { Authorization: `Bearer ${token}` },
		});

		if (!response.ok) throw new Error("Failed to fetch reservations");
		return response.json();
	},

	async fetchTableReservation(tableId) {
		const response = await fetch(
			`${API_CONFIG.baseURL}/reservations/table/${tableId}/active`
		);
		return response.json();
	},
};

import { API_CONFIG } from "../config/apiConfig.js";

export const reservationService = {
	async fetchReservations(token) {
		if (!token) throw new Error("Token required");

		const response = await fetch(`${API_CONFIG.BASE_URL}/reservations`, {
			headers: { Authorization: `Bearer ${token}` },
		});

		if (!response.ok) throw new Error("Failed to fetch reservations");
		return response.json();
	},

	async fetchTableReservation(tableId) {
		const response = await fetch(
			`${API_CONFIG.BASE_URL}/reservations/table/${tableId}/active`
		);
		return response.json();
	},
};

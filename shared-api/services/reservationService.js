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

	/**
	 * Ferme une réservation (passe status à "terminée")
	 * @param {string} reservationId - ID de la réservation
	 * @returns {Promise<Object>} Réservation mise à jour
	 */
	async closeReservation(reservationId) {
		if (!reservationId) throw new Error("reservationId required");

		const response = await fetch(
			`${API_CONFIG.baseURL}/reservations/client/${reservationId}/close`,
			{
				method: "PUT",
				headers: { "Content-Type": "application/json" },
			}
		);

		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.message || "Failed to close reservation");
		}

		return response.json();
	},
};

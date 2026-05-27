/**
 * 🏪 counterService.js — API calls pour le mode Comptoir
 *
 * Wraps les endpoints /counter/* avec gestion auth et errors
 */

import { API_CONFIG } from "../src/config/apiConfig";
import { fetchWithAuth } from "../utils/tokenManager";

const counterService = {
	/**
	 * Ouvrir une session table (ou récupérer l'existante)
	 */
	async openSession(restaurantId, tableId, waiterName = null, waiterId = null) {
		try {
			const response = await fetchWithAuth(
				`${API_CONFIG.baseURL}/counter/sessions`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						restaurantId,
						tableId,
						...(waiterName && { waiterName }),
						...(waiterId && { waiterId }),
					}),
				},
			);

			if (!response.ok) {
				throw new Error(`HTTP ${response.status}`);
			}

			return await response.json();
		} catch (err) {
			console.error("[Counter] Erreur ouverture session:", err);
			throw err;
		}
	},

	/**
	 * Récupérer la session active d'une table
	 */
	async getActiveSession(tableId) {
		try {
			const response = await fetchWithAuth(
				`${API_CONFIG.baseURL}/counter/sessions/${tableId}/active`,
				{ method: "GET" },
			);

			if (response.status === 404) {
				return null; // Pas de session active
			}

			if (!response.ok) {
				throw new Error(`HTTP ${response.status}`);
			}

			return await response.json();
		} catch (err) {
			console.error("[Counter] Erreur récupération session:", err);
			throw err;
		}
	},

	/**
	 * Demander l'addition (passer la table en jaune)
	 */
	async requestBill(sessionId) {
		try {
			const response = await fetchWithAuth(
				`${API_CONFIG.baseURL}/counter/sessions/${sessionId}/bill`,
				{
					method: "PATCH",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({}),
				},
			);

			if (!response.ok) {
				throw new Error(`HTTP ${response.status}`);
			}

			return await response.json();
		} catch (err) {
			console.error("[Counter] Erreur demande addition:", err);
			throw err;
		}
	},

	/**
	 * Encaisser et libérer la table
	 */
	async closeSession(sessionId, paymentMethod) {
		try {
			const response = await fetchWithAuth(
				`${API_CONFIG.baseURL}/counter/sessions/${sessionId}/close`,
				{
					method: "PATCH",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ paymentMethod }),
				},
			);

			if (!response.ok) {
				throw new Error(`HTTP ${response.status}`);
			}

			return await response.json();
		} catch (err) {
			console.error("[Counter] Erreur fermeture session:", err);
			throw err;
		}
	},

	/**
	 * Envoyer items en cuisine (flush panier)
	 * Réutilise POST /orders avec source: "counter"
	 */
	async sendToCook(tableSessionId, items, total, restaurantId, tableId) {
		try {
			const response = await fetchWithAuth(
				`${API_CONFIG.baseURL}/orders`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						items,
						total,
						restaurantId,
						tableId,
						tableSessionId,
						source: "counter",
						status: "confirmed",
					}),
				},
			);

			if (!response.ok) {
				throw new Error(`HTTP ${response.status}`);
			}

			return await response.json();
		} catch (err) {
			console.error("[Counter] Erreur envoi cuisine:", err);
			throw err;
		}
	},

	/**
	 * Récupérer l'état de toutes les tables du restaurant
	 */
	async getTablesState(restaurantId, roomNumber) {
		try {
			const query = roomNumber ? `?roomNumber=${roomNumber}` : "";
			const response = await fetchWithAuth(
				`${API_CONFIG.baseURL}/counter/tables/${restaurantId}${query}`,
				{ method: "GET" },
			);

			if (!response.ok) {
				throw new Error(`HTTP ${response.status}`);
			}

			const data = await response.json();
			// Backend retourne { tables: [...], activeSessions: N }
			return Array.isArray(data) ? data : (data.tables ?? []);
		} catch (err) {
			console.error("[Counter] Erreur état tables:", err);
			throw err;
		}
	},
};

export default counterService;

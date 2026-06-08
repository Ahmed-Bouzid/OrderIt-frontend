/**
 * cashShiftService.js — Service API pour la gestion des shifts de caisse
 * 
 * Endpoints :
 * - POST /cash-shifts/open — Ouvrir un shift
 * - POST /cash-shifts/:id/close — Fermer un shift + générer Z
 * - GET /cash-shifts/active — Récupérer le shift actif
 * - GET /cash-shifts — Liste paginée des shifts
 * - GET /cash-shifts/:id — Détail d'un shift
 */

import { API_CONFIG } from "../src/config/apiConfig";
import { fetchWithAuth } from "../utils/tokenManager";

const cashShiftService = {
	/**
	 * Ouvrir un nouveau shift de caisse
	 * @param {Object} params
	 * @param {number} params.openingFloatCents - Fond de caisse en centimes (ex: 10000 = 100€)
	 * @param {string} [params.deviceId] - Identifiant de la caisse (optionnel)
	 * @param {string} [params.notes] - Notes d'ouverture (optionnel)
	 * @returns {Promise<{success: boolean, shift: Object}>}
	 */
	async openShift({ openingFloatCents, deviceId = null, notes = "" }) {
		const response = await fetchWithAuth(`${API_CONFIG.baseURL}/cash-shifts/open`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				openingFloatCents,
				deviceId,
				notes,
			}),
		});

		if (!response.ok) {
			const error = await response.json().catch(() => ({}));
			throw new Error(error.message || `Erreur ${response.status}`);
		}

		return response.json();
	},

	/**
	 * Fermer un shift et générer le Z de caisse
	 * @param {string} shiftId - ID du shift à fermer
	 * @param {Object} params
	 * @param {number} params.closingCountCents - Compte caisse en centimes
	 * @param {string} [params.notes] - Notes de fermeture (optionnel)
	 * @returns {Promise<{success: boolean, shift: Object, zReport: Object}>}
	 */
	async closeShift(shiftId, { closingCountCents, notes = "" }) {
		const response = await fetchWithAuth(
			`${API_CONFIG.baseURL}/cash-shifts/${shiftId}/close`,
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					closingCountCents,
					notes,
				}),
			},
		);

		if (!response.ok) {
			const error = await response.json().catch(() => ({}));
			throw new Error(error.message || `Erreur ${response.status}`);
		}

		return response.json();
	},

	/**
	 * Récupérer le shift actif (status = "open")
	 * @returns {Promise<{success: boolean, shift: Object|null}>}
	 */
	async getActiveShift() {
		const response = await fetchWithAuth(`${API_CONFIG.baseURL}/cash-shifts/active`, {
			method: "GET",
		});

		if (!response.ok) {
			const error = await response.json().catch(() => ({}));
			throw new Error(error.message || `Erreur ${response.status}`);
		}

		return response.json();
	},

	/**
	 * Liste des shifts (pagination)
	 * @param {Object} params
	 * @param {number} [params.page=1] - Numéro de page
	 * @param {number} [params.limit=20] - Nombre de résultats par page
	 * @returns {Promise<{success: boolean, data: Array, meta: Object}>}
	 */
	async listShifts({ page = 1, limit = 20 } = {}) {
		const params = new URLSearchParams({ page, limit });
		const response = await fetchWithAuth(
			`${API_CONFIG.baseURL}/cash-shifts?${params}`,
			{ method: "GET" },
		);

		if (!response.ok) {
			const error = await response.json().catch(() => ({}));
			throw new Error(error.message || `Erreur ${response.status}`);
		}

		return response.json();
	},

	/**
	 * Détail d'un shift (avec events)
	 * @param {string} shiftId - ID du shift
	 * @returns {Promise<{success: boolean, shift: Object, eventsCount: number, events: Array}>}
	 */
	async getShiftDetail(shiftId) {
		const response = await fetchWithAuth(
			`${API_CONFIG.baseURL}/cash-shifts/${shiftId}`,
			{ method: "GET" },
		);

		if (!response.ok) {
			const error = await response.json().catch(() => ({}));
			throw new Error(error.message || `Erreur ${response.status}`);
		}

		return response.json();
	},
};

export default cashShiftService;

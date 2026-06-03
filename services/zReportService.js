/**
 * zReportService.js (frontend)
 * Wraps les endpoints /z-reports/* avec gestion auth et erreurs
 * Même pattern que counterService.js
 */

import { API_CONFIG } from "../src/config/apiConfig";
import { fetchWithAuth } from "../utils/tokenManager";

const zReportService = {
	/**
	 * Prévisualise les chiffres du Z sans sauvegarder.
	 * @param {string} restaurantId
	 * @param {Date}   from
	 * @param {Date}   to
	 * @returns {Object} données calculées
	 */
	async preview(restaurantId, from, to) {
		const params = new URLSearchParams({
			restaurantId,
			from: from instanceof Date ? from.toISOString() : from,
			to:   to   instanceof Date ? to.toISOString()   : to,
		});

		const response = await fetchWithAuth(
			`${API_CONFIG.baseURL}/z-reports/preview?${params}`,
			{ method: "GET" },
		);

		if (!response.ok) {
			const err = await response.json().catch(() => ({}));
			throw new Error(err.message || `HTTP ${response.status}`);
		}

		const json = await response.json();
		return json.data;
	},

	/**
	 * Génère et scelle le Z de caisse (irréversible).
	 * @param {Object} params
	 * @returns {ZReport}
	 */
	async generate({ restaurantId, periodStart, periodEnd, openingFloatCents, closingCountCents, notes }) {
		const response = await fetchWithAuth(
			`${API_CONFIG.baseURL}/z-reports/generate`,
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					restaurantId,
					periodStart: periodStart instanceof Date ? periodStart.toISOString() : periodStart,
					periodEnd:   periodEnd   instanceof Date ? periodEnd.toISOString()   : periodEnd,
					openingFloatCents,
					closingCountCents,
					notes: notes || "",
				}),
			},
		);

		if (!response.ok) {
			const err = await response.json().catch(() => ({}));
			throw new Error(err.message || `HTTP ${response.status}`);
		}

		const json = await response.json();
		return json.data;
	},

	/**
	 * Récupère la liste des Z d'un restaurant (du plus récent au plus ancien).
	 * @param {string} restaurantId
	 * @param {number} page
	 * @param {number} limit
	 * @returns {{ data: ZReport[], meta: Object }}
	 */
	async list(restaurantId, page = 1, limit = 20) {
		const params = new URLSearchParams({
			restaurantId,
			page:  String(page),
			limit: String(limit),
		});

		const response = await fetchWithAuth(
			`${API_CONFIG.baseURL}/z-reports?${params}`,
			{ method: "GET" },
		);

		if (!response.ok) {
			const err = await response.json().catch(() => ({}));
			throw new Error(err.message || `HTTP ${response.status}`);
		}

		const json = await response.json();
		return { data: json.data, meta: json.meta };
	},

	/**
	 * Récupère le détail complet d'un Z.
	 * @param {string} id        — _id du ZReport
	 * @param {string} restaurantId
	 * @returns {ZReport}
	 */
	async getById(id, restaurantId) {
		const params = new URLSearchParams({ restaurantId });
		const response = await fetchWithAuth(
			`${API_CONFIG.baseURL}/z-reports/${id}?${params}`,
			{ method: "GET" },
		);

		if (!response.ok) {
			const err = await response.json().catch(() => ({}));
			throw new Error(err.message || `HTTP ${response.status}`);
		}

		const json = await response.json();
		return json.data;
	},

	// ── Helpers de formatage ──────────────────────────────────────────────

	/** Convertit des centimes en euros formatés (ex: 372400 → "3 724,00 €") */
	formatCents(cents) {
		return new Intl.NumberFormat("fr-FR", {
			style: "currency",
			currency: "EUR",
		}).format((cents || 0) / 100);
	},

	/** Formate l'écart caisse avec signe (ex: -200 → "-2,00 €") */
	formatVariance(varianceCents) {
		const euros = (varianceCents || 0) / 100;
		const sign  = euros >= 0 ? "+" : "";
		return `${sign}${euros.toFixed(2).replace(".", ",")} €`;
	},

	/** Retourne la période d'aujourd'hui (00:00 → maintenant) */
	getTodayPeriod() {
		const now   = new Date();
		const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
		return { start, end: now };
	},

	/**
	 * Récupère toutes les sessions fermées détaillées (avec leurs orders/items)
	 * pour une période donnée. Utilisé pour l'export Z détaillé.
	 */
	async getDetailedSessions(restaurantId, from, to) {
		const params = new URLSearchParams({
			restaurantId,
			from: from instanceof Date ? from.toISOString() : from,
			to:   to   instanceof Date ? to.toISOString()   : to,
		});

		const response = await fetchWithAuth(
			`${API_CONFIG.baseURL}/z-reports/sessions?${params}`,
			{ method: "GET" },
		);

		if (!response.ok) {
			const err = await response.json().catch(() => ({}));
			throw new Error(err.message || `HTTP ${response.status}`);
		}

		const json = await response.json();
		return json.data;
	},
};

export default zReportService;

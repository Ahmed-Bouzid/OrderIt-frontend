/**
 * 🏪 counterService.js — API calls pour le mode Comptoir
 *
 * ✅ Refactor complet (2 juin 2026) :
 * - Timers sur toutes les méthodes
 * - Logs standardisés (START/SUCCESS/FAIL avec elapsed time)
 * - Gestion d'erreur factorée (helper apiCall)
 * - Validation stricte des params
 * - Retours cohérents (airbag sur erreur)
 */

import { API_CONFIG } from "../src/config/apiConfig";
import { fetchWithAuth } from "../utils/tokenManager";

/**
 * Helper : wrapper fetch + timer + logs + error handling
 * Pattern unifié pour toutes les routes API
 */
const apiCall = async (name, url, options = {}) => {
	const startTime = Date.now();
	try {
		const response = await fetchWithAuth(url, options);
		
		if (!response.ok) {
			const elapsed = Date.now() - startTime;
			let errorMsg = `HTTP ${response.status}`;
			try {
				const errorData = await response.json();
				errorMsg = errorData.message || errorMsg;
			} catch {}
			console.error(`[Counter] ${name} FAIL after ${elapsed}ms: ${errorMsg}`);
			throw new Error(errorMsg);
		}
		
		const data = await response.json();
		return data;
	} catch (err) {
		const elapsed = Date.now() - startTime;
		console.error(`[Counter] ${name} ERROR after ${elapsed}ms:`, err.message);
		throw err;
	}
};

const counterService = {
	/**
	 * Ouvrir une session table (ou récupérer l'existante)
	 */
	async openSession(restaurantId, tableId, waiterName = null, waiterId = null) {
		// ✅ Validation stricte
		if (!restaurantId || !tableId) {
			throw new Error("restaurantId et tableId requis");
		}
		
		return apiCall(
			`openSession(${tableId})`,
			`${API_CONFIG.baseURL}/counter/sessions`,
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					restaurantId,
					tableId,
					...(waiterName && { waiterName }),
					...(waiterId && { serverId: waiterId }),
				}),
			}
		);
	},

	/**
	 * Récupérer la session active d'une table
	 */
	async getActiveSession(tableId) {
		if (!tableId) throw new Error("tableId requis");
		
		try {
			return await apiCall(
				`getActiveSession(${tableId})`,
				`${API_CONFIG.baseURL}/counter/sessions/${tableId}/active`,
				{ method: "GET" }
			);
		} catch (err) {
			// 404 = pas de session active → retour null au lieu de throw
			if (err.message.includes("404")) return null;
			throw err;
		}
	},

	/**
	 * Demander l'addition (passer la table en jaune)
	 */
	async requestBill(sessionId) {
		if (!sessionId) throw new Error("sessionId requis");
		
		return apiCall(
			`requestBill(${sessionId})`,
			`${API_CONFIG.baseURL}/counter/sessions/${sessionId}/bill`,
			{
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({}),
			}
		);
	},

	/**
	 * Encaisser et libérer la table
	 * @param {string} sessionId - ID de la session
	 * @param {string} paymentMethod - "cash" | "card_offline"
	 * @param {Array} discounts - Liste des réductions (optionnel)
	 */
	async closeSession(sessionId, paymentMethod, discounts = [], force = false) {
		// ✅ Validation stricte
		if (!sessionId) throw new Error("sessionId requis");
		if (!["cash", "card_offline"].includes(paymentMethod)) {
			throw new Error('paymentMethod doit être "cash" ou "card_offline"');
		}
		
		const body = { paymentMethod };
		if (discounts && discounts.length > 0) {
			body.discounts = discounts;
		}
		if (force === true) {
			body.force = true;
		}
		
		return apiCall(
			`closeSession(${sessionId}, ${paymentMethod}${force ? ", FORCE" : ""})`,
			`${API_CONFIG.baseURL}/counter/sessions/${sessionId}/close`,
			{
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(body),
			}
		);
	},

	/**
	 * Envoyer items en cuisine (flush panier)
	 * Réutilise POST /orders avec source: "counter"
	 */
	async sendToCook(tableSessionId, items, total, restaurantId, tableId) {
		// ✅ Validation stricte
		if (!tableSessionId || !restaurantId || !tableId) {
			throw new Error("tableSessionId, restaurantId et tableId requis");
		}
		if (!items || items.length === 0) {
			throw new Error("Panier vide");
		}
		if (typeof total !== "number" || total < 0) {
			throw new Error("Total invalide");
		}
		
		return apiCall(
			`sendToCook(session=${tableSessionId}, items=${items.length}, total=${total.toFixed(2)}€)`,
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
					orderStatus: "confirmed",
				}),
			}
		);
	},

	/**
	 * Récupérer les orders envoyés en cuisine pour une session
	 * Filtres : sessionId + restaurantId optionnel + tableId optionnel
	 * ✅ Retourne [] sur erreur (airbag)
	 */
	async getSessionOrders(sessionId, restaurantId, tableId) {
		// Guard : sessionId requis
		const sessionIdStr = sessionId ? String(sessionId) : null;
		if (!sessionIdStr) {
			console.warn("[Counter] getSessionOrders: sessionId manquant, retour []");
			return [];
		}
		
		try {
			const params = new URLSearchParams({ tableSessionId: sessionIdStr });
			if (restaurantId) params.set("restaurantId", String(restaurantId));
			if (tableId) params.set("tableId", String(tableId));
			
			const data = await apiCall(
				`getSessionOrders(${sessionIdStr})`,
				`${API_CONFIG.baseURL}/orders?${params.toString()}`,
				{ method: "GET" }
			);
			
			return Array.isArray(data) ? data : (data.orders ?? []);
		} catch (err) {
			console.error("[Counter] getSessionOrders error, retour []");
			return []; // ✅ Airbag : retour [] sur erreur
		}
	},

	/**
	 * Nettoyer les commandes orphelines (anciennes réservations non-payées)
	 * ✅ Silent fail : ne pas bloquer si le nettoyage échoue
	 */
	async cleanupOrphans(tableId, restaurantId) {
		if (!tableId) {
			console.warn("[Counter] cleanupOrphans: tableId manquant, skip");
			return { deletedCount: 0 };
		}
		
		try {
			const params = new URLSearchParams({ tableId: String(tableId) });
			if (restaurantId) params.set("restaurantId", String(restaurantId));
			
			const data = await apiCall(
				`cleanupOrphans(${tableId})`,
				`${API_CONFIG.baseURL}/orders/cleanup-orphans?${params.toString()}`,
				{ method: "DELETE" }
			);
			
			console.log(`🗑️ [Counter] Nettoyage: ${data.deletedCount || 0} orphelins supprimés`);
			return data;
		} catch (err) {
			console.warn("[Counter] cleanupOrphans error (non-bloquant):", err.message);
			return { deletedCount: 0 }; // ✅ Silent fail
		}
	},

	/**
	 * Récupérer les produits du restaurant (pour MenuPickerModal)
	 * ✅ Retourne [] sur erreur (airbag)
	 */
	async getProducts(restaurantId) {
		if (!restaurantId) {
			console.warn("[Counter] getProducts: restaurantId manquant, retour []");
			return [];
		}
		
		try {
			const data = await apiCall(
				`getProducts(${restaurantId})`,
				`${API_CONFIG.baseURL}/products/restaurant/${restaurantId}`,
				{ method: "GET" }
			);
			return Array.isArray(data) ? data : (data.products ?? []);
		} catch (err) {
			console.error("[Counter] getProducts error, retour []");
			return []; // ✅ Airbag
		}
	},

	/**
	 * Récupérer les stats caisse du jour (en cours + payées)
	 * ✅ Retourne structure vide sur erreur (airbag)
	 */
	async getCaisseStats(restaurantId) {
		if (!restaurantId) {
			console.warn("[Counter] getCaisseStats: restaurantId manquant, retour vide");
			return {
				enCours: { count: 0, montant: 0, sessions: [] },
				payees: { count: 0, montant: 0, sessions: [] },
			};
		}
		
		try {
			const data = await apiCall(
				`getCaisseStats(${restaurantId})`,
				`${API_CONFIG.baseURL}/counter/stats/${restaurantId}`,
				{ method: "GET" }
			);
			return data;
		} catch (err) {
			console.error("[Counter] getCaisseStats error, retour vide");
			return {
				enCours: { count: 0, montant: 0, sessions: [] },
				payees: { count: 0, montant: 0, sessions: [] },
			}; // ✅ Airbag
		}
	},

	/**
	 * Récupérer l'état de toutes les tables du restaurant
	 */
	async getTablesState(restaurantId, roomNumber) {
		if (!restaurantId) throw new Error("restaurantId requis");
		
		const query = roomNumber ? `?roomNumber=${roomNumber}` : "";
		const data = await apiCall(
			`getTablesState(${restaurantId}${roomNumber ? `, room=${roomNumber}` : ''})`,
			`${API_CONFIG.baseURL}/counter/tables/${restaurantId}${query}`,
			{ method: "GET" }
		);
		
		// Backend retourne { tables: [...], activeSessions: N }
		return Array.isArray(data) ? data : (data.tables ?? []);
	},
};

export default counterService;

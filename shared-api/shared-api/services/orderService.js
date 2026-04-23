/**
 * Service de gestion des commandes pour CLIENT-end
 * CRUD commandes, synchronisation avec le backend
 */

import { API_CONFIG } from "../config/apiConfig.js";
import { errorHandler } from "../utils/errorHandler.js";

/**
 * Crée une nouvelle commande
 *
 * @param {Object} orderData
 * @param {string} orderData.tableId - ID de la table
 * @param {string} orderData.restaurantId - ID du restaurant
 * @param {string} orderData.reservationId - ID de la réservation
 * @param {string} orderData.clientId - ID du client
 * @param {string} orderData.clientName - Nom du client
 * @param {Array} orderData.items - Articles commandés
 * @returns {Promise<Object>} Commande créée
 */
async function createOrder(orderData) {
	try {
		console.log("📦 [orderService] Création commande:", orderData);

		const response = await fetch(`${API_CONFIG.BASE_URL}/orders`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(orderData),
		});

		const data = await response.json();

		if (!response.ok) {
			throw new Error(data.message || data.error || "Erreur création commande");
		}

		console.log("✅ [orderService] Commande créée:", data.order?._id);

		return data;
	} catch (error) {
		console.error("❌ [orderService] Erreur création commande:", error);
		throw errorHandler(error);
	}
}

/**
 * Récupère la commande active du client
 *
 * @returns {Promise<Object|null>} Commande active ou null
 */
async function getActiveOrder() {
	try {
		const response = await fetch(`${API_CONFIG.BASE_URL}/orders/active`, {
			method: "GET",
			headers: {
				"Content-Type": "application/json",
			},
		});

		const data = await response.json();

		if (!response.ok) {
			throw new Error(
				data.message || data.error || "Erreur récupération commande",
			);
		}

		return data.order || null;
	} catch (error) {
		console.error(
			"❌ [orderService] Erreur récupération commande active:",
			error,
		);
		throw errorHandler(error);
	}
}

/**
 * Récupère toutes les commandes d'une réservation
 *
 * @param {string} reservationId - ID de la réservation
 * @returns {Promise<Array>} Liste des commandes
 */
async function getOrdersByReservation(reservationId) {
	try {
		console.log(
			"📋 [orderService] Récupération commandes réservation:",
			reservationId,
		);

		const response = await fetch(
			`${API_CONFIG.BASE_URL}/orders/reservation/${reservationId}`,
			{
				method: "GET",
				headers: {
					"Content-Type": "application/json",
				},
			},
		);

		const data = await response.json();

		if (!response.ok) {
			throw new Error(
				data.message || data.error || "Erreur récupération commandes",
			);
		}

		console.log(
			`✅ [orderService] ${data.orders?.length || 0} commandes récupérées`,
		);

		return data;
	} catch (error) {
		console.error("❌ [orderService] Erreur récupération commandes:", error);
		throw errorHandler(error);
	}
}

/**
 * Marque une commande comme payée
 *
 * @param {string} orderId - ID de la commande
 * @returns {Promise<Object>} Commande mise à jour
 */
async function markAsPaid(orderId) {
	try {
		console.log("💰 [orderService] Marquer comme payée:", orderId);

		const response = await fetch(
			`${API_CONFIG.BASE_URL}/orders/${orderId}/paid`,
			{
				method: "PATCH",
				headers: {
					"Content-Type": "application/json",
				},
			},
		);

		const data = await response.json();

		if (!response.ok) {
			throw new Error(
				data.message || data.error || "Erreur mise à jour paiement",
			);
		}

		console.log("✅ [orderService] Commande marquée payée");

		return data;
	} catch (error) {
		console.error("❌ [orderService] Erreur mise à jour paiement:", error);
		throw errorHandler(error);
	}
}

/**
 * Met à jour le statut d'une commande
 *
 * @param {string} orderId - ID de la commande
 * @param {string} status - Nouveau statut (pending, confirmed, preparing, ready, delivered, cancelled)
 * @returns {Promise<Object>} Commande mise à jour
 */
async function updateStatus(orderId, status) {
	try {
		console.log(`🔄 [orderService] Mise à jour statut: ${orderId} → ${status}`);

		const response = await fetch(
			`${API_CONFIG.BASE_URL}/orders/${orderId}/status`,
			{
				method: "PATCH",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ status }),
			},
		);

		const data = await response.json();

		if (!response.ok) {
			throw new Error(
				data.message || data.error || "Erreur mise à jour statut",
			);
		}

		console.log("✅ [orderService] Statut mis à jour");

		return data;
	} catch (error) {
		console.error("❌ [orderService] Erreur mise à jour statut:", error);
		throw errorHandler(error);
	}
}

export const orderService = {
	createOrder,
	getActiveOrder,
	getOrdersByReservation,
	markAsPaid,
	updateStatus,
};

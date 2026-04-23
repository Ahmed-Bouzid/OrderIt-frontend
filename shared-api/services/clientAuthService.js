/**
 * Service d'authentification client
 * Génère des tokens JWT simples pour les clients publics (non-authentifiés)
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Génère un token client simple (pseudo + tableId + restaurantId)
 * Ce token est utilisé pour identifier les commandes clients sans authentification lourde
 *
 * @param {string} clientName - Nom/pseudo du client
 * @param {string} tableId - ID de la table
 * @param {string} restaurantId - ID du restaurant
 * @returns {Promise<string>} Token simple base64
 */
async function getClientToken(clientName, tableId, restaurantId) {
	try {
		// Générer un token simple base64 (pas de JWT backend pour les clients publics)
		const payload = {
			clientName: clientName.trim(),
			tableId,
			restaurantId,
			timestamp: Date.now(),
			type: "client_public",
		};

		// Encoder en base64
		const token = btoa(JSON.stringify(payload));

		// Stocker localement pour réutilisation
		await AsyncStorage.setItem("clientToken", token);

		return token;
	} catch (error) {
		console.error("[clientAuthService] Erreur génération token:", error);
		throw new Error("Impossible de générer le token client");
	}
}

/**
 * Récupère le token client stocké
 * @returns {Promise<string|null>}
 */
async function getStoredToken() {
	try {
		return await AsyncStorage.getItem("clientToken");
	} catch (error) {
		console.error("[clientAuthService] Erreur récupération token:", error);
		return null;
	}
}

/**
 * Supprime le token client (déconnexion)
 * @returns {Promise<void>}
 */
async function clearToken() {
	try {
		await AsyncStorage.removeItem("clientToken");
	} catch (error) {
		console.error("[clientAuthService] Erreur suppression token:", error);
	}
}

/**
 * Vérifie si un token client existe et est valide
 * @returns {Promise<boolean>}
 */
async function hasValidToken() {
	try {
		const token = await getStoredToken();
		if (!token) return false;

		// Décoder et vérifier l'expiration (optionnel)
		const payload = JSON.parse(atob(token));

		// Token valide 24h
		const isExpired = Date.now() - payload.timestamp > 24 * 60 * 60 * 1000;

		return !isExpired;
	} catch (error) {
		console.error("[clientAuthService] Erreur validation token:", error);
		return false;
	}
}

export const clientAuthService = {
	getClientToken,
	getStoredToken,
	clearToken,
	hasValidToken,
};

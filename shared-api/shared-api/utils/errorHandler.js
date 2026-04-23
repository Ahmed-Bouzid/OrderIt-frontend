/**
 * Utilitaire de gestion d'erreurs centralisée pour CLIENT-end
 * Compatible React Native (Toast + console)
 */

import Toast from "react-native-toast-message";

export const errorHandler = {
	/**
	 * Gère une erreur de manière centralisée
	 * @param {Error|string} error - L'erreur à gérer
	 * @param {string} context - Contexte de l'erreur (optionnel)
	 */
	handleError: (error, context = "") => {
		const prefix = context ? `[${context}]` : "";
		const message = error?.message || error?.toString() || "Erreur inconnue";

		// Log console pour debug
		console.error(`❌ ${prefix} ${message}`, error);

		// Toast pour l'utilisateur
		Toast.show({
			type: "error",
			text1: "Erreur",
			text2: message,
			position: "bottom",
			visibilityTime: 3000,
		});
	},

	/**
	 * Gère une erreur API (avec code HTTP)
	 * @param {Error} error - L'erreur API
	 * @param {string} context - Contexte de l'erreur
	 */
	handleApiError: (error, context = "API") => {
		const status = error?.response?.status;
		const message =
			error?.response?.data?.message || error?.message || "Erreur serveur";

		console.error(`❌ [${context}] Status ${status}:`, message);

		// Messages personnalisés selon le code HTTP
		let userMessage = message;
		if (status === 401) {
			userMessage = "Session expirée. Veuillez vous reconnecter.";
		} else if (status === 403) {
			userMessage = "Accès refusé.";
		} else if (status === 404) {
			userMessage = "Ressource introuvable.";
		} else if (status >= 500) {
			userMessage = "Erreur serveur. Veuillez réessayer.";
		}

		Toast.show({
			type: "error",
			text1: "Erreur",
			text2: userMessage,
			position: "bottom",
			visibilityTime: 4000,
		});
	},

	/**
	 * Affiche un message de succès
	 * @param {string} message - Message de succès
	 */
	success: (message) => {
		Toast.show({
			type: "success",
			text1: "Succès",
			text2: message,
			position: "bottom",
			visibilityTime: 2000,
		});
	},

	/**
	 * Affiche un avertissement
	 * @param {string} message - Message d'avertissement
	 */
	warning: (message) => {
		Toast.show({
			type: "info",
			text1: "Attention",
			text2: message,
			position: "bottom",
			visibilityTime: 3000,
		});
	},
};

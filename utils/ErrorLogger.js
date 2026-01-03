import AsyncStorage from "@react-native-async-storage/async-storage";

const ERROR_STORAGE_KEY = "@orderit_error_logs";
const MAX_ERRORS_STORED = 10;
const ERROR_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Gestionnaire d'erreurs centralisé pour OrderIt
 * Capture et stocke les erreurs avec contexte technique
 */
class ErrorLogger {
	/**
	 * Enregistre une erreur dans AsyncStorage
	 * @param {Error} error - L'erreur capturée
	 * @param {Object} context - Contexte additionnel (screen, action, etc.)
	 */
	static async logError(error, context = {}) {
		try {
			const errorLog = {
				timestamp: new Date().toISOString(),
				message: error.message || "Erreur inconnue",
				stack: error.stack || null,
				type: error.name || "Error",
				screen: context.screen || "Unknown",
				action: context.action || null,
				userId: context.userId || null,
				restaurantId: context.restaurantId || null,
				appVersion: context.appVersion || "1.0.0",
				platform: context.platform || "unknown",
			};

			// Récupérer les erreurs existantes
			const existingLogs = await this.getErrorLogs();

			// Ajouter la nouvelle erreur au début
			const updatedLogs = [errorLog, ...existingLogs].slice(
				0,
				MAX_ERRORS_STORED
			);

			// Sauvegarder
			await AsyncStorage.setItem(
				ERROR_STORAGE_KEY,
				JSON.stringify(updatedLogs)
			);

			console.error("[ErrorLogger] Erreur enregistrée:", {
				timestamp: errorLog.timestamp,
				screen: errorLog.screen,
				message: errorLog.message,
			});

			return errorLog;
		} catch (storageError) {
			console.error(
				"[ErrorLogger] Impossible de sauvegarder l'erreur:",
				storageError
			);
		}
	}

	/**
	 * Récupère toutes les erreurs stockées
	 * @returns {Array} Liste des erreurs
	 */
	static async getErrorLogs() {
		try {
			const logsJson = await AsyncStorage.getItem(ERROR_STORAGE_KEY);
			if (!logsJson) return [];

			const logs = JSON.parse(logsJson);

			// Filtrer les erreurs expirées (plus de 5 minutes)
			const now = Date.now();
			const validLogs = logs.filter((log) => {
				const logTime = new Date(log.timestamp).getTime();
				return now - logTime < ERROR_EXPIRY_MS;
			});

			// Si on a filtré des erreurs, mettre à jour le storage
			if (validLogs.length !== logs.length) {
				await AsyncStorage.setItem(
					ERROR_STORAGE_KEY,
					JSON.stringify(validLogs)
				);
			}

			return validLogs;
		} catch (error) {
			console.error(
				"[ErrorLogger] Erreur lors de la récupération des logs:",
				error
			);
			return [];
		}
	}

	/**
	 * Récupère la dernière erreur récente (moins de 5 min)
	 * @returns {Object|null} La dernière erreur ou null
	 */
	static async getRecentError() {
		const logs = await this.getErrorLogs();
		return logs.length > 0 ? logs[0] : null;
	}

	/**
	 * Vérifie s'il y a une erreur récente
	 * @returns {Boolean}
	 */
	static async hasRecentError() {
		const recentError = await this.getRecentError();
		return recentError !== null;
	}

	/**
	 * Efface toutes les erreurs stockées
	 */
	static async clearErrorLogs() {
		try {
			await AsyncStorage.removeItem(ERROR_STORAGE_KEY);
			console.log("[ErrorLogger] Logs d'erreurs effacés");
		} catch (error) {
			console.error(
				"[ErrorLogger] Erreur lors de l'effacement des logs:",
				error
			);
		}
	}

	/**
	 * Efface une erreur spécifique par timestamp
	 * @param {String} timestamp - Le timestamp de l'erreur à supprimer
	 */
	static async clearErrorByTimestamp(timestamp) {
		try {
			const logs = await this.getErrorLogs();
			const updatedLogs = logs.filter((log) => log.timestamp !== timestamp);
			await AsyncStorage.setItem(
				ERROR_STORAGE_KEY,
				JSON.stringify(updatedLogs)
			);
		} catch (error) {
			console.error(
				"[ErrorLogger] Erreur lors de la suppression d'un log:",
				error
			);
		}
	}

	/**
	 * Nettoie automatiquement les vieux logs (appelé au démarrage de l'app)
	 */
	static async cleanupOldLogs() {
		try {
			await this.getErrorLogs(); // Cette fonction nettoie automatiquement les vieux logs
			console.log(
				"[ErrorLogger] Nettoyage automatique des vieux logs effectué"
			);
		} catch (error) {
			console.error("[ErrorLogger] Erreur lors du nettoyage:", error);
		}
	}
}

export default ErrorLogger;

import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "../src/config/apiConfig";
import { Platform } from "react-native";
import { getItem as getSecureItem } from "../utils/secureStorage";

/**
 * Service Feedback - Gestion des feedbacks utilisateurs
 *
 * Fonctionnalités:
 * - Envoi de feedback avec ou sans logs
 * - Récupération de l'historique (admins/managers)
 * - Mise à jour du statut (admins)
 */
class FeedbackService {
	constructor() {
		this.baseURL = `${API_URL}/feedback`;
	}

	/**
	 * Récupère le token d'authentification
	 */
	async getAuthHeaders() {
		const token = await getSecureItem("@access_token");
		if (!token) {
			throw new Error("Non authentifié");
		}
		return {
			Authorization: `Bearer ${token}`,
			"Content-Type": "application/json",
		};
	}

	/**
	 * Enrichit les logs avec des informations système
	 */
	async enrichLogsWithContext(logs) {
		try {
			const userId = await AsyncStorage.getItem("userId");
			const restaurantId = await AsyncStorage.getItem("restaurantId");

			return {
				...logs,
				userId: userId || logs.userId,
				restaurantId: restaurantId || logs.restaurantId,
				platform: Platform.OS,
				platformVersion: Platform.Version,
			};
		} catch (error) {
			console.error("[FeedbackService] Erreur enrichissement logs:", error);
			return logs;
		}
	}

	/**
	 * Envoie un feedback
	 * @param {Object} feedbackData - Les données du feedback
	 * @param {String} feedbackData.category - Catégorie du feedback
	 * @param {String} feedbackData.message - Message de l'utilisateur
	 * @param {Boolean} feedbackData.includeLogs - Inclure les logs techniques
	 * @param {Object} feedbackData.logs - Logs techniques (optionnel)
	 * @returns {Promise<Object>} Réponse du serveur
	 */
	async sendFeedback(feedbackData) {
		try {
			const headers = await this.getAuthHeaders();

			// Enrichir les logs si présents
			let enrichedLogs = null;
			if (feedbackData.includeLogs && feedbackData.logs) {
				enrichedLogs = await this.enrichLogsWithContext(feedbackData.logs);
			}

			const payload = {
				category: feedbackData.category,
				message: feedbackData.message,
				includeLogs: feedbackData.includeLogs || false,
				logs: enrichedLogs,
			};

			console.log("[FeedbackService] Envoi feedback:", {
				category: payload.category,
				includeLogs: payload.includeLogs,
			});

			const response = await fetch(this.baseURL, {
				method: "POST",
				headers,
				body: JSON.stringify(payload),
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.message || "Erreur lors de l'envoi du feedback");
			}

			console.log(
				"[FeedbackService] Feedback envoyé avec succès:",
				data.feedbackId,
			);
			return data;
		} catch (error) {
			console.error("[FeedbackService] Erreur sendFeedback:", error);
			throw error;
		}
	}

	/**
	 * Récupère la liste des feedbacks (admins/managers uniquement)
	 * @param {Object} filters - Filtres optionnels
	 * @returns {Promise<Object>} Liste des feedbacks avec pagination
	 */
	async getFeedbacks(filters = {}) {
		try {
			const headers = await this.getAuthHeaders();

			// Construire les query params
			const params = new URLSearchParams();
			if (filters.status) params.append("status", filters.status);
			if (filters.category) params.append("category", filters.category);
			if (filters.userId) params.append("userId", filters.userId);
			if (filters.startDate) params.append("startDate", filters.startDate);
			if (filters.endDate) params.append("endDate", filters.endDate);
			if (filters.limit) params.append("limit", filters.limit);
			if (filters.page) params.append("page", filters.page);

			const url = `${this.baseURL}?${params.toString()}`;

			const response = await fetch(url, {
				method: "GET",
				headers,
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(
					data.message || "Erreur lors de la récupération des feedbacks",
				);
			}

			return data;
		} catch (error) {
			console.error("[FeedbackService] Erreur getFeedbacks:", error);
			throw error;
		}
	}

	/**
	 * Met à jour le statut d'un feedback (admins uniquement)
	 * @param {String} feedbackId - ID du feedback
	 * @param {Object} updates - Mises à jour
	 * @returns {Promise<Object>} Feedback mis à jour
	 */
	async updateFeedback(feedbackId, updates) {
		try {
			const headers = await this.getAuthHeaders();

			const response = await fetch(`${this.baseURL}/${feedbackId}`, {
				method: "PATCH",
				headers,
				body: JSON.stringify(updates),
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(
					data.message || "Erreur lors de la mise à jour du feedback",
				);
			}

			console.log("[FeedbackService] Feedback mis à jour:", feedbackId);
			return data;
		} catch (error) {
			console.error("[FeedbackService] Erreur updateFeedback:", error);
			throw error;
		}
	}

	/**
	 * Supprime un feedback (admins uniquement)
	 * @param {String} feedbackId - ID du feedback
	 * @returns {Promise<Object>} Confirmation
	 */
	async deleteFeedback(feedbackId) {
		try {
			const headers = await this.getAuthHeaders();

			const response = await fetch(`${this.baseURL}/${feedbackId}`, {
				method: "DELETE",
				headers,
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(
					data.message || "Erreur lors de la suppression du feedback",
				);
			}

			console.log("[FeedbackService] Feedback supprimé:", feedbackId);
			return data;
		} catch (error) {
			console.error("[FeedbackService] Erreur deleteFeedback:", error);
			throw error;
		}
	}
}

// Export de l'instance
const feedbackService = new FeedbackService();
export default feedbackService;

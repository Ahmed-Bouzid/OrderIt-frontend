import { getValidToken } from "../utils/tokenManager";
import { API_URL } from "../src/config/apiConfig";

/**
 * Service Stripe Frontend - Gestion des appels API paiement
 *
 * Fonctionnalités:
 * - Création de PaymentIntent
 * - Récupération des paiements
 * - Paiements fake (dev)
 */
class StripeService {
	constructor() {
		this.baseURL = `${API_URL}/payments`;
	}

	/**
	 * Récupère le token d'authentification
	 */
	async getAuthHeaders() {
		const token = await getValidToken();
		if (!token) {
			throw new Error("Non authentifié");
		}
		return {
			Authorization: `Bearer ${token}`,
			"Content-Type": "application/json",
		};
	}

	/**
	 * Helper pour effectuer les requêtes fetch
	 */
	async fetchWithAuth(url, options = {}) {
		const headers = await this.getAuthHeaders();
		const response = await fetch(url, {
			...options,
			headers: {
				...headers,
				...options.headers,
			},
		});

		const data = await response.json();

		if (!response.ok) {
			throw new Error(data.message || data.error || "Erreur réseau");
		}

		return data;
	}

	/**
	 * Crée un PaymentIntent
	 *
	 * @param {Object} params - Paramètres du paiement
	 * @param {string} params.orderId - ID de la commande
	 * @param {number} params.amount - Montant en centimes
	 * @param {string} params.currency - Devise (défaut: "eur")
	 * @param {Array<string>} params.paymentMethodTypes - ["card", "apple_pay"]
	 * @param {number} params.tipAmount - Pourboire en centimes
	 * @param {string} params.paymentMode - "client" ou "terminal"
	 * @returns {Promise<Object>} { clientSecret, paymentIntentId, paymentId, amount, currency }
	 */
	async createPaymentIntent({
		orderId,
		amount,
		currency = "eur",
		paymentMethodTypes = ["card"],
		tipAmount = 0,
		paymentMode = "client",
	}) {
		try {

			const data = await this.fetchWithAuth(`${this.baseURL}/create-intent`, {
				method: "POST",
				body: JSON.stringify({
					orderId,
					amount,
					currency,
					paymentMethodTypes,
					tipAmount,
					paymentMode,
				}),
			});


			return data;
		} catch (error) {
			console.error("❌ Erreur création PaymentIntent:", error);
			throw new Error(
				error.message || "Erreur lors de la création du paiement"
			);
		}
	}

	/**
	 * Annule un PaymentIntent
	 *
	 * @param {string} paymentIntentId - ID du PaymentIntent
	 * @returns {Promise<Object>} Résultat
	 */
	async cancelPaymentIntent(paymentIntentId) {
		try {
			const data = await this.fetchWithAuth(`${this.baseURL}/cancel`, {
				method: "POST",
				body: JSON.stringify({ paymentIntentId }),
			});

			return data;
		} catch (error) {
			console.error("❌ Erreur annulation PaymentIntent:", error);
			throw error;
		}
	}

	/**
	 * Récupère les détails d'un paiement
	 *
	 * @param {string} paymentId - ID du paiement (MongoDB)
	 * @returns {Promise<Object>} Paiement
	 */
	async getPayment(paymentId) {
		try {
			const data = await this.fetchWithAuth(
				`${this.baseURL}/payments/${paymentId}`,
				{
					method: "GET",
				}
			);

			return data;
		} catch (error) {
			console.error("❌ Erreur récupération paiement:", error);
			throw error;
		}
	}

	/**
	 * Récupère tous les paiements d'une commande
	 *
	 * @param {string} orderId - ID de la commande
	 * @returns {Promise<Array>} Liste des paiements
	 */
	async getOrderPayments(orderId) {
		try {
			const data = await this.fetchWithAuth(
				`${this.baseURL}/order/${orderId}`,
				{
					method: "GET",
				}
			);

			return data;
		} catch (error) {
			console.error("❌ Erreur récupération paiements commande:", error);
			throw error;
		}
	}

	/**
	 * Crée un paiement FAKE (dev only)
	 *
	 * @param {string} orderId - ID de la commande
	 * @param {number} amount - Montant en centimes
	 * @param {number} tipAmount - Pourboire en centimes
	 * @returns {Promise<Object>} Résultat
	 */
	async createFakePayment(orderId, amount, tipAmount = 0) {
		try {

			const data = await this.fetchWithAuth(`${this.baseURL}/fake`, {
				method: "POST",
				body: JSON.stringify({
					orderId,
					amount,
					tipAmount,
				}),
			});


			return data;
		} catch (error) {
			console.error("❌ Erreur création paiement fake:", error);
			throw new Error(error.message || "Erreur paiement fake");
		}
	}

	/**
	 * Calcule le montant total (commande + pourboire)
	 *
	 * @param {number} orderAmount - Montant de la commande en euros
	 * @param {number} tipPercentage - Pourcentage de pourboire (ex: 10)
	 * @returns {Object} { totalCents, tipCents, orderCents }
	 */
	calculateTotal(orderAmount, tipPercentage = 0) {
		const orderCents = Math.round(orderAmount * 100);
		const tipCents = Math.round(((orderAmount * tipPercentage) / 100) * 100);
		const totalCents = orderCents + tipCents;

		return {
			totalCents,
			tipCents,
			orderCents,
		};
	}

	/**
	 * Formate un montant en centimes en string avec devise
	 *
	 * @param {number} cents - Montant en centimes
	 * @param {string} currency - Devise
	 * @returns {string} Montant formaté (ex: "25,50 €")
	 */
	formatAmount(cents, currency = "eur") {
		const amount = cents / 100;

		if (currency === "eur") {
			return new Intl.NumberFormat("fr-FR", {
				style: "currency",
				currency: "EUR",
			}).format(amount);
		}

		return new Intl.NumberFormat("en-US", {
			style: "currency",
			currency: currency.toUpperCase(),
		}).format(amount);
	}
}

export default new StripeService();

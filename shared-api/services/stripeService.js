/**
 * Service Stripe pour CLIENT-end
 * Gestion des paiements clients (PaymentIntent, Apple Pay, etc.)
 */

import { API_CONFIG } from "../config/apiConfig.js";

class StripeService {
	constructor() {
		this.baseURL = `${API_CONFIG.BASE_URL}/payments`;
	}

	/**
	 * Crée un PaymentIntent pour une commande client
	 *
	 * @param {Object} params
	 * @param {string} params.orderId - ID de la commande
	 * @param {number} params.amount - Montant en centimes
	 * @param {string} params.currency - Devise (défaut: "eur")
	 * @param {Array<string>} params.paymentMethodTypes - ["card", "apple_pay"]
	 * @param {number} params.tipAmount - Pourboire en centimes
	 * @param {string} params.paymentMode - "client" ou "terminal"
	 * @returns {Promise<Object>} { clientSecret, paymentIntentId, paymentId }
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
			console.log(
				`💳 [StripeService] Création PaymentIntent - Order: ${orderId}, Amount: ${amount / 100}€`,
			);

			const response = await fetch(`${this.baseURL}/create-intent`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					orderId,
					amount,
					currency,
					paymentMethodTypes,
					tipAmount,
					paymentMode,
				}),
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(
					data.message || data.error || "Erreur création PaymentIntent",
				);
			}

			console.log(
				"✅ [StripeService] PaymentIntent créé:",
				data.paymentIntentId,
			);

			return data;
		} catch (error) {
			console.error("❌ [StripeService] Erreur création PaymentIntent:", error);
			throw new Error(
				error.message || "Erreur lors de la création du paiement",
			);
		}
	}

	/**
	 * Confirme un paiement fake (dev uniquement)
	 *
	 * @param {string} orderId - ID de la commande
	 * @returns {Promise<Object>}
	 */
	async confirmFakePayment(orderId) {
		try {
			console.log(`💰 [StripeService] Paiement fake - Order: ${orderId}`);

			const response = await fetch(`${this.baseURL}/fake-payment`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ orderId }),
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.message || data.error || "Erreur paiement fake");
			}

			console.log("✅ [StripeService] Paiement fake confirmé");

			return data;
		} catch (error) {
			console.error("❌ [StripeService] Erreur paiement fake:", error);
			throw new Error(error.message || "Erreur lors du paiement fake");
		}
	}

	/**
	 * Récupère les informations d'un paiement
	 *
	 * @param {string} paymentIntentId - ID du PaymentIntent Stripe
	 * @returns {Promise<Object>}
	 */
	async getPaymentStatus(paymentIntentId) {
		try {
			const response = await fetch(
				`${this.baseURL}/status/${paymentIntentId}`,
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
					data.message || data.error || "Erreur récupération statut",
				);
			}

			return data;
		} catch (error) {
			console.error("❌ [StripeService] Erreur statut paiement:", error);
			throw new Error(
				error.message || "Erreur lors de la récupération du statut",
			);
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
			console.log(
				`🎭 [StripeService] Création paiement FAKE - Order: ${orderId}`,
			);

			const response = await fetch(`${this.baseURL}/fake`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					orderId,
					amount,
					tipAmount,
				}),
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.message || data.error || "Erreur paiement fake");
			}

			console.log("✅ [StripeService] Paiement fake créé");

			return data;
		} catch (error) {
			console.error("❌ [StripeService] Erreur création paiement fake:", error);
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

// Export singleton
export default new StripeService();

// components/activity/modals/PaymentModal.jsx
import React from "react";
import { PremiumTPEModal } from "./PremiumTPEModal";

/**
 * ✅ VERSION PREMIUM TPE - Terminal de paiement stylisé
 *
 * Modale de paiement ultra-premium style terminal bancaire :
 * - Slide-up animation depuis le bas
 * - Effets NFC pulsants concentriques
 * - Loader puff + quantum pulse (4 secondes)
 * - Check de validation avec son
 * - Design style carte bancaire / TPE
 *
 * Intégration Stripe API test (PaymentIntent + pm_card_visa)
 */

export const PaymentModal = ({
	visible,
	onClose,
	activeReservation,
	orders,
	onSuccess,
	theme,
}) => {
	const safeOrders = Array.isArray(orders) ? orders : [];

	// 🔧 Calculer le total et récupérer lastOrderId
	let totalAmount = 0;
	let lastOrderId = null;

	safeOrders.forEach((order) => {
		if (Array.isArray(order?.items)) {
			order.items.forEach((item) => {
				totalAmount += (item.price || 0) * (item.quantity || 0);
			});
		}
		lastOrderId = order._id;
	});

	// Ne pas rendre si pas visible
	if (!visible) return null;

	return (
		<PremiumTPEModal
			visible={visible}
			amount={totalAmount}
			orderId={lastOrderId}
			onSuccess={onSuccess}
			onCancel={onClose}
		/>
	);
};

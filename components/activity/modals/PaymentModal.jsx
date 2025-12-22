// components/activity/modals/PaymentModal.jsx
import React from "react";
import { Modal } from "react-native";
import Payment from "../../modals/Payment";

export const PaymentModal = ({
	visible,
	onClose,
	activeReservation,
	orders,
	onSuccess,
	theme,
}) => {
	// ⭐ Guard clause
	if (!visible) return null;

	const safeTheme = theme || { textColor: "#000", backgroundColor: "#fff" };
	const safeOnClose = onClose || (() => {});
	const safeOnSuccess = onSuccess || (() => {});
	const safeOrders = Array.isArray(orders) ? orders : [];

	return (
		<Modal visible={visible} animationType="slide" onRequestClose={safeOnClose}>
			<Payment
				reservation={activeReservation}
				orders={safeOrders}
				onSuccess={safeOnSuccess}
				onBack={safeOnClose}
				theme={safeTheme}
			/>
		</Modal>
	);
};

import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

export default function Payment({ orders, onSuccess, onBack }) {
	const total = orders.reduce(
		(sum, item) => sum + item.price * item.quantity,
		0
	);

	const handlePay = () => {
		console.log("Paiement effectué");
		if (onSuccess) onSuccess(); // Appelle le callback parent
	};

	return (
		<View style={styles.container}>
			<Text style={styles.title}>Paiement</Text>
			<Text style={styles.total}>Total: {total}€</Text>
			<TouchableOpacity style={styles.payButton} onPress={handlePay}>
				<Text style={styles.buttonText}>Payer {total}€</Text>
			</TouchableOpacity>
			<TouchableOpacity style={styles.backButton} onPress={onBack}>
				<Text style={styles.buttonText}>Retour</Text>
			</TouchableOpacity>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		padding: 20,
	},
	title: {
		fontSize: 24,
		fontWeight: "bold",
		marginBottom: 20,
	},
	total: {
		fontSize: 20,
		fontWeight: "600",
		marginBottom: 20,
	},
	orderDetails: {
		width: "100%",
		marginBottom: 30,
		padding: 15,
		backgroundColor: "#f5f5f5",
		borderRadius: 8,
	},
	detailTitle: {
		fontSize: 18,
		fontWeight: "bold",
		marginBottom: 10,
	},
	orderItem: {
		flexDirection: "row",
		justifyContent: "space-between",
		paddingVertical: 5,
	},
	buttonsContainer: {
		width: "100%",
		gap: 10,
	},
	payButton: {
		backgroundColor: "#4CAF50",
		paddingVertical: 15,
		borderRadius: 8,
		alignItems: "center",
	},
	backButton: {
		backgroundColor: "#757575",
		paddingVertical: 15,
		borderRadius: 8,
		alignItems: "center",
	},
	buttonText: {
		color: "#fff",
		fontWeight: "bold",
		fontSize: 16,
	},
});

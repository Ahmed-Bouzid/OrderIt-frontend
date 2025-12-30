// components/receipt/ReceiptTicket.jsx
import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated, Dimensions } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

const { width } = Dimensions.get("window");

export const ReceiptTicket = React.forwardRef(
	(
		{
			ticketId,
			amount,
			date,
			items = [],
			restaurantName = "OrderIt Restaurant",
			tableNumber,
			paymentMethod = "Card",
			last4Digits,
			theme,
		},
		ref
	) => {
		const scaleAnim = useRef(new Animated.Value(0)).current;
		const fadeAnim = useRef(new Animated.Value(0)).current;

		useEffect(() => {
			Animated.parallel([
				Animated.spring(scaleAnim, {
					toValue: 1,
					tension: 50,
					friction: 7,
					useNativeDriver: true,
				}),
				Animated.timing(fadeAnim, {
					toValue: 1,
					duration: 400,
					useNativeDriver: true,
				}),
			]).start();
		}, [scaleAnim, fadeAnim]);

		// Safe theme with defaults
		const safeTheme = {
			accentColor: theme?.accentColor || "#4CAF50",
			textColor: theme?.textColor || "#333333",
			cardColor: theme?.cardColor || "#ffffff",
			backgroundColor: theme?.backgroundColor || "#f5f5f5",
		};

		const formattedAmount = `${amount.toFixed(2)}€`;
		const formattedDate = new Date(date).toLocaleDateString("fr-FR", {
			day: "numeric",
			month: "long",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});

		return (
			<Animated.View
				ref={ref}
				style={[
					styles.container,
					{
						transform: [{ scale: scaleAnim }],
						opacity: fadeAnim,
					},
				]}
			>
				{/* Ticket cut-out circles */}
				<View style={[styles.cutout, styles.cutoutLeft]} />
				<View style={[styles.cutout, styles.cutoutRight]} />

				{/* Header with success icon */}
				<LinearGradient
					colors={[safeTheme.accentColor, "#45a049"]}
					style={styles.header}
				>
					<View style={styles.iconContainer}>
						<MaterialIcons name="check-circle" size={60} color="#ffffff" />
					</View>
					<Text style={styles.headerTitle}>Merci !</Text>
					<Text style={styles.headerSubtitle}>
						Votre paiement a été effectué avec succès
					</Text>
				</LinearGradient>

				{/* Ticket body */}
				<View style={[styles.body, { backgroundColor: safeTheme.cardColor }]}>
					{/* Dashed line */}
					<View style={styles.dashedLine} />

					{/* Restaurant info */}
					<View style={styles.section}>
						<Text
							style={[styles.restaurantName, { color: safeTheme.textColor }]}
						>
							{restaurantName}
						</Text>
						{tableNumber && (
							<Text style={[styles.tableInfo, { color: "#999" }]}>
								Table {tableNumber}
							</Text>
						)}
					</View>

					{/* Ticket ID and Amount */}
					<View style={styles.row}>
						<View style={styles.column}>
							<Text style={[styles.label, { color: "#999" }]}>N° TICKET</Text>
							<Text style={[styles.value, { color: safeTheme.textColor }]}>
								{ticketId}
							</Text>
						</View>
						<View style={[styles.column, styles.columnRight]}>
							<Text style={[styles.label, { color: "#999" }]}>MONTANT</Text>
							<Text style={[styles.amount, { color: safeTheme.accentColor }]}>
								{formattedAmount}
							</Text>
						</View>
					</View>

					{/* Date */}
					<View style={styles.section}>
						<Text style={[styles.label, { color: "#999" }]}>DATE & HEURE</Text>
						<Text style={[styles.value, { color: safeTheme.textColor }]}>
							{formattedDate}
						</Text>
					</View>

					{/* Items list */}
					{items.length > 0 && (
						<View style={styles.section}>
							<Text
								style={[styles.sectionTitle, { color: safeTheme.textColor }]}
							>
								Articles
							</Text>
							<View style={styles.itemsList}>
								{items.map((item, index) => (
									<View key={index} style={styles.itemRow}>
										<View style={styles.itemInfo}>
											<Text
												style={[
													styles.itemName,
													{ color: safeTheme.textColor },
												]}
												numberOfLines={1}
											>
												{item.name || "Article"}
											</Text>
											<Text style={[styles.itemQuantity, { color: "#999" }]}>
												x{item.quantity || 1}
											</Text>
										</View>
										<Text
											style={[styles.itemPrice, { color: safeTheme.textColor }]}
										>
											{(item.price * (item.quantity || 1)).toFixed(2)}€
										</Text>
									</View>
								))}
							</View>
						</View>
					)}

					{/* Payment method */}
					<View
						style={[
							styles.paymentSection,
							{ backgroundColor: safeTheme.backgroundColor },
						]}
					>
						<View style={styles.paymentIcon}>
							<MaterialIcons name="credit-card" size={24} color="#ffffff" />
						</View>
						<View style={styles.paymentInfo}>
							<Text
								style={[styles.paymentMethod, { color: safeTheme.textColor }]}
							>
								{paymentMethod}
							</Text>
							{last4Digits && (
								<Text style={[styles.cardNumber, { color: "#999" }]}>
									•••• {last4Digits}
								</Text>
							)}
						</View>
					</View>

					{/* Dashed line */}
					<View style={styles.dashedLine} />

					{/* Barcode simulation */}
					<View style={styles.barcodeContainer}>
						<View style={styles.barcode}>
							{Array.from({ length: 40 }).map((_, i) => (
								<View
									key={i}
									style={[
										styles.bar,
										{
											width: Math.random() > 0.5 ? 2 : 3,
											backgroundColor: safeTheme.textColor,
										},
									]}
								/>
							))}
						</View>
						<Text style={[styles.barcodeText, { color: "#999" }]}>
							{ticketId}
						</Text>
					</View>

					{/* Footer */}
					<View style={styles.footer}>
						<Text style={[styles.footerText, { color: "#999" }]}>
							Merci de votre visite !
						</Text>
						<Text style={[styles.footerText, { color: "#999" }]}>
							www.orderit.fr
						</Text>
					</View>
				</View>
			</Animated.View>
		);
	}
);

const styles = StyleSheet.create({
	container: {
		width: width - 60,
		maxWidth: 400,
		backgroundColor: "#2a2a2a",
		borderRadius: 20,
		overflow: "hidden",
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 10 },
		shadowOpacity: 0.3,
		shadowRadius: 20,
		elevation: 10,
	},
	cutout: {
		position: "absolute",
		width: 30,
		height: 30,
		borderRadius: 15,
		backgroundColor: "#f9f9f9",
		top: "35%",
		zIndex: 10,
	},
	cutoutLeft: {
		left: -15,
	},
	cutoutRight: {
		right: -15,
	},
	header: {
		paddingVertical: 40,
		paddingHorizontal: 30,
		alignItems: "center",
	},
	iconContainer: {
		marginBottom: 15,
	},
	headerTitle: {
		fontSize: 32,
		fontWeight: "700",
		color: "#ffffff",
		marginBottom: 8,
	},
	headerSubtitle: {
		fontSize: 16,
		color: "#ffffff",
		opacity: 0.9,
		textAlign: "center",
	},
	body: {
		paddingHorizontal: 30,
		paddingVertical: 25,
	},
	dashedLine: {
		height: 1,
		borderStyle: "dashed",
		borderWidth: 1,
		borderColor: "#444",
		marginVertical: 20,
	},
	section: {
		marginBottom: 20,
	},
	restaurantName: {
		fontSize: 20,
		fontWeight: "600",
		textAlign: "center",
		marginBottom: 5,
	},
	tableInfo: {
		fontSize: 14,
		textAlign: "center",
	},
	row: {
		flexDirection: "row",
		justifyContent: "space-between",
		marginBottom: 20,
	},
	column: {
		flex: 1,
	},
	columnRight: {
		alignItems: "flex-end",
	},
	label: {
		fontSize: 10,
		fontWeight: "600",
		letterSpacing: 1,
		marginBottom: 5,
	},
	value: {
		fontSize: 16,
		fontWeight: "500",
	},
	amount: {
		fontSize: 22,
		fontWeight: "700",
	},
	sectionTitle: {
		fontSize: 14,
		fontWeight: "600",
		marginBottom: 12,
	},
	itemsList: {
		gap: 10,
	},
	itemRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
	},
	itemInfo: {
		flex: 1,
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
	},
	itemName: {
		fontSize: 14,
		flex: 1,
	},
	itemQuantity: {
		fontSize: 12,
	},
	itemPrice: {
		fontSize: 14,
		fontWeight: "600",
	},
	paymentSection: {
		flexDirection: "row",
		alignItems: "center",
		padding: 15,
		borderRadius: 12,
		marginVertical: 15,
		gap: 15,
	},
	paymentIcon: {
		width: 50,
		height: 50,
		borderRadius: 25,
		backgroundColor: "#4CAF50",
		justifyContent: "center",
		alignItems: "center",
	},
	paymentInfo: {
		flex: 1,
	},
	paymentMethod: {
		fontSize: 16,
		fontWeight: "600",
		marginBottom: 3,
	},
	cardNumber: {
		fontSize: 13,
		letterSpacing: 2,
	},
	barcodeContainer: {
		alignItems: "center",
		marginVertical: 20,
	},
	barcode: {
		flexDirection: "row",
		height: 60,
		alignItems: "flex-end",
		gap: 2,
		marginBottom: 10,
	},
	bar: {
		height: "100%",
	},
	barcodeText: {
		fontSize: 12,
		letterSpacing: 3,
		fontFamily: "monospace",
	},
	footer: {
		alignItems: "center",
		marginTop: 10,
		gap: 5,
	},
	footerText: {
		fontSize: 12,
	},
});

ReceiptTicket.displayName = "ReceiptTicket";

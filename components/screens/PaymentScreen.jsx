import React, { useState, useEffect } from "react";
import {
	View,
	Text,
	StyleSheet,
	ScrollView,
	TouchableOpacity,
	ActivityIndicator,
	Alert,
	Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { StripeProvider, useStripe } from "@stripe/stripe-react-native";
import stripeService from "../../services/stripeService";

/**
 * PaymentScreen - Écran de paiement client
 *
 * Fonctionnalités:
 * - Paiement par carte (Stripe Payment Sheet)
 * - Apple Pay (si disponible)
 * - Ajout de pourboire
 * - Mode fake (dev)
 *
 * Props:
 * - route.params.order: Objet commande à payer
 * - route.params.onPaymentSuccess: Callback après paiement réussi
 * - navigation: Navigation prop
 */
const PaymentScreen = ({ route, navigation }) => {
	const { order, onPaymentSuccess } = route.params;

	const [loading, setLoading] = useState(false);
	const [tipPercentage, setTipPercentage] = useState(0);
	const [paymentMethod, setPaymentMethod] = useState(null); // "apple_pay" | "card" | "fake"
	const [clientSecret, setClientSecret] = useState(null);
	const [paymentIntentId, setPaymentIntentId] = useState(null);
	const [applePayAvailable, setApplePayAvailable] = useState(false);

	const { initPaymentSheet, presentPaymentSheet, isApplePaySupported } =
		useStripe();

	// Vérifier si Apple Pay est disponible
	useEffect(() => {
		checkApplePayAvailability();
	}, []);

	const checkApplePayAvailability = async () => {
		if (Platform.OS === "ios") {
			try {
				const isSupported = await isApplePaySupported();
				setApplePayAvailable(isSupported);
				console.log("📱 Apple Pay disponible:", isSupported);
			} catch (error) {
				console.error("Erreur vérification Apple Pay:", error);
			}
		}
	};

	// Calculer les montants
	const orderAmount = order?.totalAmount || 0;
	const { totalCents, tipCents, orderCents } = stripeService.calculateTotal(
		orderAmount,
		tipPercentage
	);

	/**
	 * Crée un PaymentIntent et initialise Stripe Payment Sheet
	 */
	const initializePayment = async (method = "card") => {
		try {
			setLoading(true);
			setPaymentMethod(method);

			console.log(`💳 Initialisation paiement: ${method}`);

			// Créer le PaymentIntent
			const paymentMethodTypes =
				method === "apple_pay" ? ["card", "apple_pay"] : ["card"];

			const result = await stripeService.createPaymentIntent({
				orderId: order._id,
				amount: orderCents,
				currency: "eur",
				paymentMethodTypes,
				tipAmount: tipCents,
				paymentMode: "client",
			});

			setClientSecret(result.clientSecret);
			setPaymentIntentId(result.paymentIntentId);

			// Initialiser Payment Sheet
			const { error } = await initPaymentSheet({
				paymentIntentClientSecret: result.clientSecret,
				merchantDisplayName: order.restaurantId?.name || "Restaurant",
				applePay: applePayAvailable
					? {
							merchantCountryCode: "FR",
							cartItems: [
								{
									label: "Commande",
									amount: (orderCents / 100).toFixed(2),
								},
								...(tipCents > 0
									? [
											{
												label: "Pourboire",
												amount: (tipCents / 100).toFixed(2),
											},
										]
									: []),
							],
						}
					: undefined,
				returnURL: "orderit://payment", // Deep link pour revenir à l'app
			});

			if (error) {
				console.error("❌ Erreur init Payment Sheet:", error);
				Alert.alert("Erreur", error.message);
				return false;
			}

			console.log("✅ Payment Sheet initialisé");
			return true;
		} catch (error) {
			console.error("❌ Erreur initialisation paiement:", error);
			Alert.alert(
				"Erreur",
				error.message || "Impossible d'initialiser le paiement"
			);
			return false;
		} finally {
			setLoading(false);
		}
	};

	/**
	 * Affiche le Payment Sheet Stripe
	 */
	const handlePayWithCard = async () => {
		const initialized = await initializePayment("card");
		if (!initialized) return;

		try {
			setLoading(true);

			const { error } = await presentPaymentSheet();

			if (error) {
				// L'utilisateur a annulé
				if (error.code === "Canceled") {
					console.log("Paiement annulé par l'utilisateur");
					return;
				}

				console.error("❌ Erreur Payment Sheet:", error);
				Alert.alert("Échec du paiement", error.message);
				return;
			}

			// Paiement réussi !
			console.log("✅ Paiement réussi");
			handlePaymentSuccess();
		} catch (error) {
			console.error("❌ Erreur présentation Payment Sheet:", error);
			Alert.alert("Erreur", error.message);
		} finally {
			setLoading(false);
		}
	};

	/**
	 * Paiement avec Apple Pay
	 */
	const handlePayWithApplePay = async () => {
		const initialized = await initializePayment("apple_pay");
		if (!initialized) return;

		// Le Payment Sheet affichera automatiquement Apple Pay si disponible
		await handlePayWithCard();
	};

	/**
	 * Paiement fake (dev only)
	 */
	const handleFakePayment = async () => {
		Alert.alert(
			"Paiement Fake",
			"Simuler un paiement réussi sans passer par Stripe ?",
			[
				{ text: "Annuler", style: "cancel" },
				{
					text: "Confirmer",
					onPress: async () => {
						try {
							setLoading(true);

							const result = await stripeService.createFakePayment(
								order._id,
								orderCents,
								tipCents
							);

							console.log("✅ Paiement fake réussi:", result);
							handlePaymentSuccess();
						} catch (error) {
							console.error("❌ Erreur paiement fake:", error);
							Alert.alert("Erreur", error.message);
						} finally {
							setLoading(false);
						}
					},
				},
			]
		);
	};

	/**
	 * Gère le succès du paiement
	 */
	const handlePaymentSuccess = () => {
		Alert.alert(
			"Paiement réussi ! 🎉",
			"Votre commande a été payée avec succès.",
			[
				{
					text: "OK",
					onPress: () => {
						if (onPaymentSuccess) {
							onPaymentSuccess(order);
						}
						navigation.goBack();
					},
				},
			]
		);
	};

	return (
		<SafeAreaView style={styles.container} edges={["top"]}>
			<View style={styles.header}>
				<TouchableOpacity onPress={() => navigation.goBack()}>
					<Ionicons name="close" size={28} color="#333" />
				</TouchableOpacity>
				<Text style={styles.headerTitle}>Paiement</Text>
				<View style={{ width: 28 }} />
			</View>

			<ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
				{/* Résumé de la commande */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Résumé</Text>
					<View style={styles.summaryRow}>
						<Text style={styles.summaryLabel}>Commande</Text>
						<Text style={styles.summaryValue}>
							{stripeService.formatAmount(orderCents)}
						</Text>
					</View>

					{/* Sélection du pourboire */}
					<View style={styles.tipSection}>
						<Text style={styles.tipLabel}>Pourboire</Text>
						<View style={styles.tipButtons}>
							{[0, 5, 10, 15, 20].map((percent) => (
								<TouchableOpacity
									key={percent}
									style={[
										styles.tipButton,
										tipPercentage === percent && styles.tipButtonActive,
									]}
									onPress={() => setTipPercentage(percent)}
								>
									<Text
										style={[
											styles.tipButtonText,
											tipPercentage === percent && styles.tipButtonTextActive,
										]}
									>
										{percent === 0 ? "Aucun" : `${percent}%`}
									</Text>
								</TouchableOpacity>
							))}
						</View>
						{tipPercentage > 0 && (
							<Text style={styles.tipAmount}>
								+ {stripeService.formatAmount(tipCents)}
							</Text>
						)}
					</View>

					{/* Total */}
					<View style={[styles.summaryRow, styles.totalRow]}>
						<Text style={styles.totalLabel}>Total</Text>
						<Text style={styles.totalValue}>
							{stripeService.formatAmount(totalCents)}
						</Text>
					</View>
				</View>

				{/* Méthodes de paiement */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Méthode de paiement</Text>

					{/* Apple Pay (prioritaire si disponible) */}
					{applePayAvailable && (
						<TouchableOpacity
							style={styles.paymentButton}
							onPress={handlePayWithApplePay}
							disabled={loading}
						>
							<View style={styles.paymentButtonContent}>
								<Ionicons name="logo-apple" size={24} color="#000" />
								<Text style={styles.paymentButtonText}>Apple Pay</Text>
							</View>
							<Ionicons name="chevron-forward" size={20} color="#999" />
						</TouchableOpacity>
					)}

					{/* Carte bancaire */}
					<TouchableOpacity
						style={styles.paymentButton}
						onPress={handlePayWithCard}
						disabled={loading}
					>
						<View style={styles.paymentButtonContent}>
							<Ionicons name="card" size={24} color="#4A90E2" />
							<Text style={styles.paymentButtonText}>Carte bancaire</Text>
						</View>
						<Ionicons name="chevron-forward" size={20} color="#999" />
					</TouchableOpacity>

					{/* Mode fake (dev only) */}
					{__DEV__ && (
						<TouchableOpacity
							style={[styles.paymentButton, styles.fakeButton]}
							onPress={handleFakePayment}
							disabled={loading}
						>
							<View style={styles.paymentButtonContent}>
								<Ionicons name="bug" size={24} color="#FF6B6B" />
								<Text style={styles.paymentButtonText}>
									Paiement Fake (Dev)
								</Text>
							</View>
							<Ionicons name="chevron-forward" size={20} color="#999" />
						</TouchableOpacity>
					)}
				</View>

				{/* Infos de sécurité */}
				<View style={styles.securityInfo}>
					<Ionicons name="lock-closed" size={16} color="#999" />
					<Text style={styles.securityText}>Paiement sécurisé par Stripe</Text>
				</View>
			</ScrollView>

			{/* Loader */}
			{loading && (
				<View style={styles.loadingOverlay}>
					<ActivityIndicator size="large" color="#4A90E2" />
					<Text style={styles.loadingText}>Traitement en cours...</Text>
				</View>
			)}
		</SafeAreaView>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#F8F9FA",
	},
	header: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: 20,
		paddingVertical: 15,
		backgroundColor: "#FFF",
		borderBottomWidth: 1,
		borderBottomColor: "#E5E5E5",
	},
	headerTitle: {
		fontSize: 18,
		fontWeight: "600",
		color: "#333",
	},
	content: {
		flex: 1,
		padding: 20,
	},
	section: {
		backgroundColor: "#FFF",
		borderRadius: 12,
		padding: 20,
		marginBottom: 20,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.05,
		shadowRadius: 4,
		elevation: 2,
	},
	sectionTitle: {
		fontSize: 16,
		fontWeight: "600",
		color: "#333",
		marginBottom: 15,
	},
	summaryRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		paddingVertical: 12,
		borderBottomWidth: 1,
		borderBottomColor: "#F0F0F0",
	},
	summaryLabel: {
		fontSize: 15,
		color: "#666",
	},
	summaryValue: {
		fontSize: 15,
		fontWeight: "500",
		color: "#333",
	},
	tipSection: {
		paddingVertical: 15,
		borderBottomWidth: 1,
		borderBottomColor: "#F0F0F0",
	},
	tipLabel: {
		fontSize: 15,
		color: "#666",
		marginBottom: 12,
	},
	tipButtons: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: 10,
	},
	tipButton: {
		paddingHorizontal: 16,
		paddingVertical: 10,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: "#E5E5E5",
		backgroundColor: "#FFF",
	},
	tipButtonActive: {
		backgroundColor: "#4A90E2",
		borderColor: "#4A90E2",
	},
	tipButtonText: {
		fontSize: 14,
		fontWeight: "500",
		color: "#666",
	},
	tipButtonTextActive: {
		color: "#FFF",
	},
	tipAmount: {
		fontSize: 14,
		color: "#4A90E2",
		fontWeight: "500",
		marginTop: 8,
		textAlign: "right",
	},
	totalRow: {
		borderBottomWidth: 0,
		paddingTop: 15,
	},
	totalLabel: {
		fontSize: 17,
		fontWeight: "600",
		color: "#333",
	},
	totalValue: {
		fontSize: 20,
		fontWeight: "700",
		color: "#4A90E2",
	},
	paymentButton: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		padding: 16,
		backgroundColor: "#FFF",
		borderRadius: 12,
		borderWidth: 1,
		borderColor: "#E5E5E5",
		marginBottom: 12,
	},
	paymentButtonContent: {
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
	},
	paymentButtonText: {
		fontSize: 16,
		fontWeight: "500",
		color: "#333",
	},
	fakeButton: {
		borderColor: "#FF6B6B",
		borderStyle: "dashed",
	},
	securityInfo: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 8,
		marginTop: 20,
		marginBottom: 40,
	},
	securityText: {
		fontSize: 13,
		color: "#999",
	},
	loadingOverlay: {
		position: "absolute",
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		backgroundColor: "rgba(0,0,0,0.7)",
		justifyContent: "center",
		alignItems: "center",
	},
	loadingText: {
		marginTop: 15,
		fontSize: 16,
		color: "#FFF",
		fontWeight: "500",
	},
});

/**
 * Wrapper avec StripeProvider
 * Important: STRIPE_PUBLISHABLE_KEY doit être défini dans .env
 */
const PaymentScreenWithStripe = (props) => {
	// Clé publique Stripe (mode test par défaut)
	const STRIPE_PUBLISHABLE_KEY =
		process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || "pk_test_VOTRE_CLE_TEST"; // Remplacer par votre clé

	return (
		<StripeProvider publishableKey={STRIPE_PUBLISHABLE_KEY}>
			<PaymentScreen {...props} />
		</StripeProvider>
	);
};

export default PaymentScreenWithStripe;

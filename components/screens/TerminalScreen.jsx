import React, { useState, useEffect, useCallback } from "react";
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	ActivityIndicator,
	Alert,
	Platform,
	NativeModules,
	NativeEventEmitter,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import stripeService from "../../services/stripeService";

// Import du module natif Tap-to-Pay (si disponible)
const { TapToPayModule } = NativeModules;

/**
 * TerminalScreen - Terminal de paiement pour iPad restaurateur
 *
 * Fonctionnalités:
 * - Tap-to-Pay on iPhone/iPad (via module natif iOS)
 * - Fallback Apple Pay / Payment Sheet
 * - Saisie montant + pourboire
 * - Affichage status en temps réel
 *
 * Props:
 * - route.params.order: Commande à encaisser
 * - route.params.onPaymentSuccess: Callback succès
 * - navigation: Navigation prop
 */
const TerminalScreen = ({ route, navigation }) => {
	const { order, onPaymentSuccess } = route.params;

	const [loading, setLoading] = useState(false);
	const [tapToPayAvailable, setTapToPayAvailable] = useState(false);
	const [tapToPayStatus, setTapToPayStatus] = useState("idle"); // idle | waiting | processing | success | error
	const [tipPercentage, setTipPercentage] = useState(0);
	const [paymentIntentId, setPaymentIntentId] = useState(null);

	// Vérifier si Tap-to-Pay est disponible
	useEffect(() => {
		checkTapToPayAvailability();

		// Écouter les événements du module natif
		if (TapToPayModule) {
			const eventEmitter = new NativeEventEmitter(TapToPayModule);

			const subscription = eventEmitter.addListener(
				"TapToPayStatusChanged",
				(event) => {
					console.log("📡 Tap-to-Pay status:", event.status);
					setTapToPayStatus(event.status);

					if (event.status === "success") {
						handlePaymentSuccess(event.paymentData);
					} else if (event.status === "error") {
						handlePaymentError(event.error);
					}
				}
			);

			return () => subscription.remove();
		}
	}, [handlePaymentError, handlePaymentSuccess]);

	/**
	 * Vérifie si Tap-to-Pay est disponible sur cet appareil
	 */
	const checkTapToPayAvailability = async () => {
		if (Platform.OS !== "ios" || !TapToPayModule) {
			console.log("❌ Tap-to-Pay non disponible (pas iOS ou module absent)");
			return;
		}

		try {
			const isAvailable = await TapToPayModule.isTapToPayAvailable();
			setTapToPayAvailable(isAvailable);
			console.log("📱 Tap-to-Pay disponible:", isAvailable);

			if (!isAvailable) {
				Alert.alert(
					"Tap-to-Pay non disponible",
					"Cet appareil ne supporte pas Tap-to-Pay. Utilisez Apple Pay ou une carte."
				);
			}
		} catch (error) {
			console.error("Erreur vérification Tap-to-Pay:", error);
		}
	};

	// Calculer les montants
	const orderAmount = order?.totalAmount || 0;
	const { totalCents, tipCents, orderCents } = stripeService.calculateTotal(
		orderAmount,
		tipPercentage
	);

	/**
	 * Démarre une session Tap-to-Pay
	 */
	const handleStartTapToPay = async () => {
		if (!tapToPayAvailable || !TapToPayModule) {
			Alert.alert(
				"Non disponible",
				"Tap-to-Pay n'est pas disponible. Utilisez une autre méthode."
			);
			return;
		}

		try {
			setLoading(true);
			setTapToPayStatus("waiting");

			console.log("🚀 Démarrage Tap-to-Pay...");

			// 1. Créer le PaymentIntent côté serveur
			const result = await stripeService.createPaymentIntent({
				orderId: order._id,
				amount: orderCents,
				currency: "eur",
				paymentMethodTypes: ["card"], // Tap-to-Pay supporte les cartes
				tipAmount: tipCents,
				paymentMode: "terminal",
			});

			setPaymentIntentId(result.paymentIntentId);

			console.log("✅ PaymentIntent créé:", result.paymentIntentId);

			// 2. Démarrer la session Tap-to-Pay native
			await TapToPayModule.startTapToPaySession({
				paymentIntentId: result.paymentIntentId,
				clientSecret: result.clientSecret,
				amount: totalCents,
				currency: "eur",
				restaurantName: order.restaurantId?.name || "Restaurant",
			});

			console.log("⏳ En attente de la carte/device du client...");
		} catch (error) {
			console.error("❌ Erreur démarrage Tap-to-Pay:", error);
			Alert.alert(
				"Erreur",
				error.message || "Impossible de démarrer le Tap-to-Pay"
			);
			setTapToPayStatus("error");
		} finally {
			setLoading(false);
		}
	};

	/**
	 * Annule la session Tap-to-Pay en cours
	 */
	const handleCancelTapToPay = async () => {
		if (!TapToPayModule) return;

		try {
			await TapToPayModule.cancelTapToPaySession();
			setTapToPayStatus("idle");
			console.log("🚫 Session Tap-to-Pay annulée");

			// Annuler le PaymentIntent côté serveur si créé
			if (paymentIntentId) {
				await stripeService.cancelPaymentIntent(paymentIntentId);
			}
		} catch (error) {
			console.error("Erreur annulation Tap-to-Pay:", error);
		}
	};

	/**
	 * Fallback: paiement via Payment Sheet standard
	 */
	const handlePayWithCard = async () => {
		Alert.alert(
			"Paiement par carte",
			"Cette fonctionnalité nécessite l'intégration du Payment Sheet Stripe. Utilisez Tap-to-Pay ou le mode fake pour tester."
		);
		// TODO: Intégrer StripeProvider + Payment Sheet ici si besoin
	};

	/**
	 * Mode fake (dev)
	 */
	const handleFakePayment = async () => {
		Alert.alert("Paiement Fake", "Simuler un paiement réussi ?", [
			{ text: "Annuler", style: "cancel" },
			{
				text: "Confirmer",
				onPress: async () => {
					try {
						setLoading(true);

						await stripeService.createFakePayment(
							order._id,
							orderCents,
							tipCents
						);

						console.log("✅ Paiement fake réussi");
						handlePaymentSuccess({ fake: true });
					} catch (error) {
						console.error("❌ Erreur paiement fake:", error);
						Alert.alert("Erreur", error.message);
					} finally {
						setLoading(false);
					}
				},
			},
		]);
	};

	/**
	 * Gère le succès du paiement
	 */
	const handlePaymentSuccess = useCallback(
		(paymentData = {}) => {
			console.log("✅ Paiement réussi:", paymentData);

			Alert.alert(
				"Paiement réussi ! 🎉",
				`Montant encaissé: ${stripeService.formatAmount(totalCents)}`,
				[
					{
						text: "OK",
						onPress: () => {
							if (onPaymentSuccess) {
								onPaymentSuccess(order, paymentData);
							}
							navigation.goBack();
						},
					},
				]
			);
		},
		[totalCents, onPaymentSuccess, order, navigation]
	);

	/**
	 * Gère les erreurs de paiement
	 */
	const handlePaymentError = useCallback(
		(error) => {
			console.error("❌ Erreur paiement:", error);

			Alert.alert(
				"Échec du paiement",
				error?.message || "Le paiement a échoué. Veuillez réessayer.",
				[
					{
						text: "Réessayer",
						onPress: () => setTapToPayStatus("idle"),
					},
					{
						text: "Annuler",
						style: "cancel",
						onPress: () => navigation.goBack(),
					},
				]
			);
		},
		[navigation]
	);

	/**
	 * Rendu du status Tap-to-Pay
	 */
	const renderTapToPayStatus = () => {
		switch (tapToPayStatus) {
			case "waiting":
				return (
					<View style={styles.statusContainer}>
						<ActivityIndicator size="large" color="#4A90E2" />
						<Text style={styles.statusTitle}>En attente...</Text>
						<Text style={styles.statusDescription}>
							Demandez au client d&apos;approcher son iPhone ou sa carte
							bancaire sans contact
						</Text>
						<TouchableOpacity
							style={styles.cancelButton}
							onPress={handleCancelTapToPay}
						>
							<Text style={styles.cancelButtonText}>Annuler</Text>
						</TouchableOpacity>
					</View>
				);

			case "processing":
				return (
					<View style={styles.statusContainer}>
						<ActivityIndicator size="large" color="#4A90E2" />
						<Text style={styles.statusTitle}>Traitement...</Text>
						<Text style={styles.statusDescription}>
							Veuillez patienter pendant la confirmation du paiement
						</Text>
					</View>
				);

			case "success":
				return (
					<View style={styles.statusContainer}>
						<Ionicons name="checkmark-circle" size={80} color="#4CAF50" />
						<Text style={styles.statusTitle}>Paiement réussi !</Text>
					</View>
				);

			case "error":
				return (
					<View style={styles.statusContainer}>
						<Ionicons name="close-circle" size={80} color="#FF6B6B" />
						<Text style={styles.statusTitle}>Échec du paiement</Text>
						<TouchableOpacity
							style={styles.retryButton}
							onPress={() => setTapToPayStatus("idle")}
						>
							<Text style={styles.retryButtonText}>Réessayer</Text>
						</TouchableOpacity>
					</View>
				);

			default:
				return null;
		}
	};

	return (
		<SafeAreaView style={styles.container} edges={["top"]}>
			<View style={styles.header}>
				<TouchableOpacity onPress={() => navigation.goBack()}>
					<Ionicons name="close" size={28} color="#333" />
				</TouchableOpacity>
				<Text style={styles.headerTitle}>Terminal de Paiement</Text>
				<View style={{ width: 28 }} />
			</View>

			<View style={styles.content}>
				{/* Affichage du status si Tap-to-Pay actif */}
				{tapToPayStatus !== "idle" ? (
					renderTapToPayStatus()
				) : (
					<>
						{/* Résumé */}
						<View style={styles.summaryCard}>
							<Text style={styles.summaryLabel}>Montant</Text>
							<Text style={styles.summaryAmount}>
								{stripeService.formatAmount(orderCents)}
							</Text>

							{/* Pourboire */}
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
													tipPercentage === percent &&
														styles.tipButtonTextActive,
												]}
											>
												{percent === 0 ? "0%" : `${percent}%`}
											</Text>
										</TouchableOpacity>
									))}
								</View>
							</View>

							{/* Total */}
							<View style={styles.totalRow}>
								<Text style={styles.totalLabel}>Total</Text>
								<Text style={styles.totalValue}>
									{stripeService.formatAmount(totalCents)}
								</Text>
							</View>
						</View>

						{/* Méthodes de paiement */}
						<View style={styles.paymentMethods}>
							{/* Tap-to-Pay (prioritaire) */}
							{tapToPayAvailable && (
								<TouchableOpacity
									style={[styles.paymentMethodButton, styles.primaryButton]}
									onPress={handleStartTapToPay}
									disabled={loading}
								>
									<Ionicons name="phone-portrait" size={32} color="#FFF" />
									<Text style={styles.primaryButtonText}>
										Démarrer Tap-to-Pay
									</Text>
									<Text style={styles.primaryButtonSubtext}>
										iPhone ou carte sans contact
									</Text>
								</TouchableOpacity>
							)}

							{/* Carte (fallback) */}
							<TouchableOpacity
								style={styles.paymentMethodButton}
								onPress={handlePayWithCard}
								disabled={loading}
							>
								<Ionicons name="card" size={28} color="#4A90E2" />
								<Text style={styles.paymentMethodText}>Paiement par carte</Text>
							</TouchableOpacity>

							{/* Fake (dev) */}
							{__DEV__ && (
								<TouchableOpacity
									style={[styles.paymentMethodButton, styles.fakeButton]}
									onPress={handleFakePayment}
									disabled={loading}
								>
									<Ionicons name="bug" size={28} color="#FF6B6B" />
									<Text style={styles.paymentMethodText}>
										Paiement Fake (Dev)
									</Text>
								</TouchableOpacity>
							)}
						</View>
					</>
				)}
			</View>

			{/* Loader global */}
			{loading && tapToPayStatus === "idle" && (
				<View style={styles.loadingOverlay}>
					<ActivityIndicator size="large" color="#4A90E2" />
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
		justifyContent: "center",
	},
	summaryCard: {
		backgroundColor: "#FFF",
		borderRadius: 16,
		padding: 30,
		marginBottom: 30,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.1,
		shadowRadius: 8,
		elevation: 4,
	},
	summaryLabel: {
		fontSize: 16,
		color: "#999",
		marginBottom: 10,
	},
	summaryAmount: {
		fontSize: 48,
		fontWeight: "700",
		color: "#333",
		marginBottom: 30,
	},
	tipSection: {
		marginBottom: 30,
	},
	tipLabel: {
		fontSize: 15,
		color: "#666",
		marginBottom: 12,
	},
	tipButtons: {
		flexDirection: "row",
		gap: 10,
	},
	tipButton: {
		flex: 1,
		paddingVertical: 12,
		borderRadius: 8,
		borderWidth: 2,
		borderColor: "#E5E5E5",
		backgroundColor: "#FFF",
		alignItems: "center",
	},
	tipButtonActive: {
		backgroundColor: "#4A90E2",
		borderColor: "#4A90E2",
	},
	tipButtonText: {
		fontSize: 15,
		fontWeight: "600",
		color: "#666",
	},
	tipButtonTextActive: {
		color: "#FFF",
	},
	totalRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		paddingTop: 20,
		borderTopWidth: 2,
		borderTopColor: "#E5E5E5",
	},
	totalLabel: {
		fontSize: 20,
		fontWeight: "600",
		color: "#333",
	},
	totalValue: {
		fontSize: 32,
		fontWeight: "700",
		color: "#4A90E2",
	},
	paymentMethods: {
		gap: 15,
	},
	paymentMethodButton: {
		flexDirection: "row",
		alignItems: "center",
		padding: 20,
		backgroundColor: "#FFF",
		borderRadius: 12,
		borderWidth: 1,
		borderColor: "#E5E5E5",
		gap: 15,
	},
	paymentMethodText: {
		fontSize: 17,
		fontWeight: "500",
		color: "#333",
	},
	primaryButton: {
		backgroundColor: "#4A90E2",
		borderColor: "#4A90E2",
		flexDirection: "column",
		alignItems: "center",
		padding: 30,
	},
	primaryButtonText: {
		fontSize: 20,
		fontWeight: "700",
		color: "#FFF",
		marginTop: 15,
	},
	primaryButtonSubtext: {
		fontSize: 14,
		color: "rgba(255,255,255,0.8)",
		marginTop: 5,
	},
	fakeButton: {
		borderColor: "#FF6B6B",
		borderStyle: "dashed",
	},
	statusContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		padding: 40,
	},
	statusTitle: {
		fontSize: 24,
		fontWeight: "700",
		color: "#333",
		marginTop: 20,
		textAlign: "center",
	},
	statusDescription: {
		fontSize: 16,
		color: "#666",
		marginTop: 15,
		textAlign: "center",
		lineHeight: 24,
	},
	cancelButton: {
		marginTop: 30,
		paddingHorizontal: 30,
		paddingVertical: 15,
		backgroundColor: "#FF6B6B",
		borderRadius: 12,
	},
	cancelButtonText: {
		fontSize: 16,
		fontWeight: "600",
		color: "#FFF",
	},
	retryButton: {
		marginTop: 30,
		paddingHorizontal: 40,
		paddingVertical: 15,
		backgroundColor: "#4A90E2",
		borderRadius: 12,
	},
	retryButtonText: {
		fontSize: 16,
		fontWeight: "600",
		color: "#FFF",
	},
	loadingOverlay: {
		position: "absolute",
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		backgroundColor: "rgba(0,0,0,0.3)",
		justifyContent: "center",
		alignItems: "center",
	},
});

export default TerminalScreen;

import React, { useState, useEffect, useRef } from "react";
import {
	View,
	Text,
	TouchableOpacity,
	StyleSheet,
	Animated,
	ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getItem as getSecureItem } from "../../../utils/secureStorage";

/**
 * Composant Payment avec simulateur "Tap to Pay"
 * - Intégration Stripe mode test
 * - Animation visuelle du tap
 * - Bip sonore à la réussite
 * - Affichage du reçu
 */
export default function Payment({ orders, onSuccess, onBack, orderId }) {
	const [paymentState, setPaymentState] = useState("idle"); // idle | scanning | processing | success | error
	const [receiptData, setReceiptData] = useState(null);
	const [errorMessage, setErrorMessage] = useState("");

	// Animations
	const pulseAnim = useRef(new Animated.Value(1)).current;
	const waveAnim = useRef(new Animated.Value(0)).current;

	// ⭐ Reset le state quand orderId change (nouvelle commande)
	useEffect(() => {
		setPaymentState("idle");
		setReceiptData(null);
		setErrorMessage("");
	}, [orderId]);

	const total = orders.reduce(
		(sum, item) => sum + (item.price || 0) * (item.quantity || 0),
		0
	);

	// Debug pour comprendre pourquoi NaN
	useEffect(() => {
		console.log(
			"💰 Payment - Total calculé:",
			total,
			"€ | Orders:",
			orders.length,
			"produits"
		);
		if (isNaN(total)) {
			console.error(
				"❌ Total = NaN! Orders structure:",
				JSON.stringify(orders.slice(0, 2))
			);
		}
	}, []); // ⭐ VIDE = exécuté 1 seule fois au mount

	// Animation des vagues "Tap to Pay"
	useEffect(() => {
		if (paymentState === "scanning") {
			// Animation de pulsation
			Animated.loop(
				Animated.sequence([
					Animated.timing(pulseAnim, {
						toValue: 1.1,
						duration: 800,
						useNativeDriver: true,
					}),
					Animated.timing(pulseAnim, {
						toValue: 1,
						duration: 800,
						useNativeDriver: true,
					}),
				])
			).start();

			// Animation des vagues concentriques
			Animated.loop(
				Animated.timing(waveAnim, {
					toValue: 1,
					duration: 2000,
					useNativeDriver: true,
				})
			).start();
		} else {
			pulseAnim.setValue(1);
			waveAnim.setValue(0);
		}
	}, [paymentState]);

	/**
	 * Simule le "tap" et déclenche le paiement Stripe test
	 */
	const handlePay = async () => {
		// ⭐ Protection contre double soumission
		if (paymentState !== "idle") {
			console.log("⚠️ Paiement déjà en cours ou terminé, ignoré");
			return;
		}

		try {
			setPaymentState("scanning");
			setErrorMessage("");

			// Simuler le délai du tap NFC (0.8s)
			await new Promise((resolve) => setTimeout(resolve, 800));

			setPaymentState("processing");

			// 1. Créer PaymentIntent via backend
			const token = await getSecureItem("@access_token");
			const baseUrl =
				process.env.EXPO_PUBLIC_API_URL ||
				"https://orderit-backend-6y1m.onrender.com";

			console.log("💳 Création PaymentIntent...");

			const createResponse = await fetch(`${baseUrl}/payments/create-intent`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({
					orderId: orderId,
					amount: Math.round(total * 100), // Convertir en centimes
					currency: "eur",
					paymentMethodTypes: ["card"],
					paymentMode: "client",
				}),
			});

			if (!createResponse.ok) {
				const errorData = await createResponse.json();
				console.error("❌ Backend error:", createResponse.status, errorData);
				throw new Error(
					errorData.message ||
						errorData.error ||
						"Erreur création PaymentIntent"
				);
			}

			const { clientSecret, paymentIntentId, paymentId } =
				await createResponse.json();

			console.log("✅ PaymentIntent créé:", paymentIntentId);

			// 2. Confirmer le paiement avec la carte test Stripe 4242 4242 4242 4242
			console.log("🧪 Confirmation avec carte test 4242...");

			const confirmResponse = await fetch(`${baseUrl}/payments/confirm-test`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({
					paymentIntentId: paymentIntentId,
				}),
			});

			if (!confirmResponse.ok) {
				const errorData = await confirmResponse.json();
				throw new Error(
					errorData.message || "Erreur confirmation paiement test"
				);
			}

			const confirmData = await confirmResponse.json();
			console.log("✅ Paiement confirmé avec Stripe:", confirmData.status);

			// 3. Vérifier le statut via backend (doit être "succeeded" maintenant)
			const checkResponse = await fetch(
				`${baseUrl}/payments/${paymentId}/status`,
				{
					headers: {
						Authorization: `Bearer ${token}`,
					},
				}
			);

			const paymentStatus = await checkResponse.json();

			// Bip sonore simulé (console log en test)
			console.log("🔔 BIP ! Paiement accepté");

			// 4. Préparer le reçu
			const receipt = {
				amount: total,
				currency: "EUR",
				date: new Date().toLocaleDateString("fr-FR", {
					day: "2-digit",
					month: "2-digit",
					year: "numeric",
					hour: "2-digit",
					minute: "2-digit",
				}),
				paymentIntentId: paymentIntentId.substring(0, 20) + "...",
				paymentId: paymentId,
				status: "succeeded",
				testMode: true,
			};

			setReceiptData(receipt);
			setPaymentState("success");

			// ⭐ Fermer la modale immédiatement après 2s (temps d'afficher le reçu)
			setTimeout(() => {
				if (onSuccess) {
					onSuccess(receipt); // ⭐ Passer les données du reçu
				}
			}, 2000);
		} catch (error) {
			console.error("❌ Erreur paiement:", error);
			setErrorMessage(error.message || "Erreur de paiement");
			setPaymentState("error");

			// Retour à idle après 3s
			setTimeout(() => {
				setPaymentState("idle");
			}, 3000);
		}
	};

	// Affichage selon l'état
	if (paymentState === "success" && receiptData) {
		return (
			<View style={styles.container}>
				<Text style={styles.successIcon}>✅</Text>
				<Text style={styles.successTitle}>Paiement accepté</Text>
				<Text style={styles.successSubtitle}>Merci !</Text>

				<View style={styles.receipt}>
					<Text style={styles.receiptTitle}>Reçu de paiement</Text>
					<View style={styles.receiptLine}>
						<Text style={styles.receiptLabel}>Montant:</Text>
						<Text style={styles.receiptValue}>
							{receiptData.amount.toFixed(2)} {receiptData.currency}
						</Text>
					</View>
					<View style={styles.receiptLine}>
						<Text style={styles.receiptLabel}>Date:</Text>
						<Text style={styles.receiptValue}>{receiptData.date}</Text>
					</View>
					<View style={styles.receiptLine}>
						<Text style={styles.receiptLabel}>ID Transaction:</Text>
						<Text style={styles.receiptValue}>
							{receiptData.paymentIntentId}
						</Text>
					</View>
					{receiptData.testMode && (
						<Text style={styles.testBadge}>🧪 MODE TEST</Text>
					)}
				</View>
			</View>
		);
	}

	if (paymentState === "error") {
		return (
			<View style={styles.container}>
				<Text style={styles.errorIcon}>❌</Text>
				<Text style={styles.errorTitle}>Paiement échoué</Text>
				<Text style={styles.errorMessage}>{errorMessage}</Text>
				<TouchableOpacity style={styles.retryButton} onPress={handlePay}>
					<Text style={styles.buttonText}>Réessayer</Text>
				</TouchableOpacity>
				<TouchableOpacity style={styles.backButton} onPress={onBack}>
					<Text style={styles.buttonText}>Retour</Text>
				</TouchableOpacity>
			</View>
		);
	}

	return (
		<View style={styles.container}>
			<Text style={styles.title}>Paiement</Text>
			<Text style={styles.total}>Total: {total.toFixed(2)}€</Text>

			{paymentState === "idle" && (
				<>
					<TouchableOpacity
						style={styles.payButton}
						onPress={handlePay}
						activeOpacity={0.8}
					>
						<Text style={styles.buttonText}>💳 Payer {total.toFixed(2)}€</Text>
						<Text style={styles.tapHint}>Taper pour payer</Text>
					</TouchableOpacity>
					<TouchableOpacity style={styles.backButton} onPress={onBack}>
						<Text style={styles.buttonText}>Retour</Text>
					</TouchableOpacity>
				</>
			)}

			{(paymentState === "scanning" || paymentState === "processing") && (
				<View style={styles.scanningContainer}>
					<Animated.View
						style={[
							styles.tapCircle,
							{
								transform: [{ scale: pulseAnim }],
							},
						]}
					>
						<Text style={styles.tapIcon}>📱</Text>
					</Animated.View>

					{/* Vagues concentriques */}
					<Animated.View
						style={[
							styles.wave,
							{
								opacity: waveAnim.interpolate({
									inputRange: [0, 1],
									outputRange: [0.6, 0],
								}),
								transform: [
									{
										scale: waveAnim.interpolate({
											inputRange: [0, 1],
											outputRange: [1, 2.5],
										}),
									},
								],
							},
						]}
					/>

					<ActivityIndicator
						size="large"
						color="#4CAF50"
						style={{ marginTop: 30 }}
					/>
					<Text style={styles.scanningText}>
						{paymentState === "scanning"
							? "Approchez votre appareil..."
							: "Paiement en cours..."}
					</Text>
				</View>
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		padding: 20,
		backgroundColor: "#fff",
	},
	title: {
		fontSize: 24,
		fontWeight: "bold",
		marginBottom: 10,
		color: "#333",
	},
	total: {
		fontSize: 28,
		fontWeight: "700",
		marginBottom: 40,
		color: "#4CAF50",
	},
	payButton: {
		backgroundColor: "#4CAF50",
		paddingVertical: 20,
		paddingHorizontal: 40,
		borderRadius: 12,
		alignItems: "center",
		marginBottom: 15,
		minWidth: 250,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.2,
		shadowRadius: 6,
		elevation: 5,
	},
	backButton: {
		backgroundColor: "#757575",
		paddingVertical: 15,
		paddingHorizontal: 40,
		borderRadius: 8,
		alignItems: "center",
		minWidth: 250,
	},
	retryButton: {
		backgroundColor: "#FF9800",
		paddingVertical: 15,
		paddingHorizontal: 40,
		borderRadius: 8,
		alignItems: "center",
		minWidth: 250,
		marginBottom: 15,
	},
	buttonText: {
		color: "#fff",
		fontWeight: "bold",
		fontSize: 16,
	},
	tapHint: {
		color: "#fff",
		fontSize: 12,
		marginTop: 5,
		opacity: 0.9,
	},
	// États de scan/traitement
	scanningContainer: {
		alignItems: "center",
		justifyContent: "center",
		marginTop: 20,
	},
	tapCircle: {
		width: 120,
		height: 120,
		borderRadius: 60,
		backgroundColor: "#E8F5E9",
		alignItems: "center",
		justifyContent: "center",
		borderWidth: 3,
		borderColor: "#4CAF50",
	},
	tapIcon: {
		fontSize: 50,
	},
	wave: {
		position: "absolute",
		width: 120,
		height: 120,
		borderRadius: 60,
		borderWidth: 2,
		borderColor: "#4CAF50",
		backgroundColor: "transparent",
	},
	scanningText: {
		fontSize: 16,
		color: "#666",
		marginTop: 15,
		fontWeight: "500",
	},
	// État succès
	successIcon: {
		fontSize: 80,
		marginBottom: 20,
	},
	successTitle: {
		fontSize: 28,
		fontWeight: "bold",
		color: "#4CAF50",
		marginBottom: 10,
	},
	successSubtitle: {
		fontSize: 18,
		color: "#666",
		marginBottom: 30,
	},
	receipt: {
		backgroundColor: "#F5F5F5",
		padding: 20,
		borderRadius: 12,
		width: "90%",
		maxWidth: 350,
		borderWidth: 1,
		borderColor: "#E0E0E0",
	},
	receiptTitle: {
		fontSize: 18,
		fontWeight: "bold",
		marginBottom: 15,
		textAlign: "center",
		color: "#333",
		borderBottomWidth: 1,
		borderBottomColor: "#CCC",
		paddingBottom: 10,
	},
	receiptLine: {
		flexDirection: "row",
		justifyContent: "space-between",
		paddingVertical: 8,
	},
	receiptLabel: {
		fontSize: 14,
		color: "#666",
	},
	receiptValue: {
		fontSize: 14,
		fontWeight: "600",
		color: "#333",
	},
	testBadge: {
		marginTop: 15,
		textAlign: "center",
		fontSize: 12,
		color: "#FF9800",
		fontWeight: "bold",
	},
	// État erreur
	errorIcon: {
		fontSize: 80,
		marginBottom: 20,
	},
	errorTitle: {
		fontSize: 24,
		fontWeight: "bold",
		color: "#F44336",
		marginBottom: 10,
	},
	errorMessage: {
		fontSize: 14,
		color: "#666",
		marginBottom: 30,
		textAlign: "center",
		paddingHorizontal: 20,
	},
});

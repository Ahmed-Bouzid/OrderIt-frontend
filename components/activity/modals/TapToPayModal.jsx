// components/activity/modals/TapToPayModal.jsx
/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useRef } from "react";
import {
	View,
	Text,
	StyleSheet,
	Modal,
	Animated,
	Dimensions,
	TouchableWithoutFeedback,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

// Audio conditionnel - expo-av peut ne pas être installé
let Audio = null;
try {
	Audio = require("expo-av").Audio;
} catch (_e) {
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const CARD_WIDTH = Math.min(SCREEN_WIDTH * 0.85, 380);
const CARD_HEIGHT = CARD_WIDTH * 0.65; // Ratio carte bancaire

/**
 * 🎨 Composant Premium Tap-to-Pay Modal
 *
 * Animation ultra-réaliste façon terminal TPE moderne
 *
 * Props:
 * - visible: boolean - Affiche/masque la modale
 * - state: "idle" | "scanning" | "processing" | "success" | "error"
 * - amount: number - Montant à afficher
 * - onClose: () => void - Callback fermeture
 * - testMode: boolean - Affiche badge mode test
 */
export const TapToPayModal = ({
	visible,
	state = "idle",
	amount = 0,
	onClose,
	testMode = true,
	receiptData = null,
}) => {
	// ═══════════════════════════════════════════════════════════════════════
	// 🎬 ANIMATIONS
	// ═══════════════════════════════════════════════════════════════════════
	const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
	const scaleAnim = useRef(new Animated.Value(0.8)).current;
	const opacityAnim = useRef(new Animated.Value(0)).current;

	// Vagues NFC concentriques (3 vagues)
	const wave1 = useRef(new Animated.Value(0)).current;
	const wave2 = useRef(new Animated.Value(0)).current;
	const wave3 = useRef(new Animated.Value(0)).current;

	// Pulsation centrale
	const pulseAnim = useRef(new Animated.Value(1)).current;

	// Rotation loader
	const rotateAnim = useRef(new Animated.Value(0)).current;

	// Check scale
	const checkScale = useRef(new Animated.Value(0)).current;
	const checkOpacity = useRef(new Animated.Value(0)).current;

	// Son
	const soundRef = useRef(null);

	// ═══════════════════════════════════════════════════════════════════════
	// 🔊 SON DE VALIDATION
	// ═══════════════════════════════════════════════════════════════════════
	const playSuccessSound = async () => {
		if (!Audio) {
			return;
		}
		try {
			const { sound } = await Audio.Sound.createAsync(
				require("../../../assets/sounds/success-chime.mp3"),
				{ shouldPlay: true, volume: 0.7 }
			);
			soundRef.current = sound;
			await sound.playAsync();
		} catch (error) {
			// Fallback: pas de son si fichier absent
		}
	};

	useEffect(() => {
		return () => {
			if (soundRef.current) {
				soundRef.current.unloadAsync();
			}
		};
	}, []);

	// ═══════════════════════════════════════════════════════════════════════
	// 🎬 ANIMATION D'ENTRÉE/SORTIE
	// ═══════════════════════════════════════════════════════════════════════
	useEffect(() => {
		if (visible) {
			// Entrée: slide-up + scale + fade
			Animated.parallel([
				Animated.spring(slideAnim, {
					toValue: 0,
					damping: 20,
					stiffness: 150,
					useNativeDriver: true,
				}),
				Animated.spring(scaleAnim, {
					toValue: 1,
					damping: 15,
					stiffness: 200,
					useNativeDriver: true,
				}),
				Animated.timing(opacityAnim, {
					toValue: 1,
					duration: 300,
					useNativeDriver: true,
				}),
			]).start();
		} else {
			// Sortie
			Animated.parallel([
				Animated.timing(slideAnim, {
					toValue: SCREEN_HEIGHT,
					duration: 250,
					useNativeDriver: true,
				}),
				Animated.timing(opacityAnim, {
					toValue: 0,
					duration: 200,
					useNativeDriver: true,
				}),
			]).start();
		}
	}, [visible]);

	// ═══════════════════════════════════════════════════════════════════════
	// 🌊 ANIMATION DES VAGUES NFC
	// ═══════════════════════════════════════════════════════════════════════
	useEffect(() => {
		if (state === "scanning" || state === "processing") {
			// Vagues concentriques avec délai
			const createWaveAnimation = (anim, delay) => {
				return Animated.loop(
					Animated.sequence([
						Animated.delay(delay),
						Animated.timing(anim, {
							toValue: 1,
							duration: 1500,
							useNativeDriver: true,
						}),
						Animated.timing(anim, {
							toValue: 0,
							duration: 0,
							useNativeDriver: true,
						}),
					])
				);
			};

			const waveAnimations = Animated.parallel([
				createWaveAnimation(wave1, 0),
				createWaveAnimation(wave2, 500),
				createWaveAnimation(wave3, 1000),
			]);

			waveAnimations.start();

			// Pulsation
			Animated.loop(
				Animated.sequence([
					Animated.timing(pulseAnim, {
						toValue: 1.15,
						duration: 600,
						useNativeDriver: true,
					}),
					Animated.timing(pulseAnim, {
						toValue: 1,
						duration: 600,
						useNativeDriver: true,
					}),
				])
			).start();

			return () => {
				wave1.setValue(0);
				wave2.setValue(0);
				wave3.setValue(0);
				pulseAnim.setValue(1);
			};
		}
	}, [state]);

	// ═══════════════════════════════════════════════════════════════════════
	// ⏳ ANIMATION DU LOADER
	// ═══════════════════════════════════════════════════════════════════════
	useEffect(() => {
		if (state === "processing") {
			Animated.loop(
				Animated.timing(rotateAnim, {
					toValue: 1,
					duration: 1000,
					useNativeDriver: true,
				})
			).start();

			return () => {
				rotateAnim.setValue(0);
			};
		}
	}, [state]);

	// ═══════════════════════════════════════════════════════════════════════
	// ✅ ANIMATION DU CHECK
	// ═══════════════════════════════════════════════════════════════════════
	useEffect(() => {
		if (state === "success") {
			// Jouer le son
			playSuccessSound();

			// Animation du check
			Animated.parallel([
				Animated.spring(checkScale, {
					toValue: 1,
					damping: 10,
					stiffness: 200,
					useNativeDriver: true,
				}),
				Animated.timing(checkOpacity, {
					toValue: 1,
					duration: 300,
					useNativeDriver: true,
				}),
			]).start();

			return () => {
				checkScale.setValue(0);
				checkOpacity.setValue(0);
			};
		}
	}, [state]);

	// ═══════════════════════════════════════════════════════════════════════
	// 🎨 INTERPOLATIONS
	// ═══════════════════════════════════════════════════════════════════════
	const rotation = rotateAnim.interpolate({
		inputRange: [0, 1],
		outputRange: ["0deg", "360deg"],
	});

	const waveScale1 = wave1.interpolate({
		inputRange: [0, 1],
		outputRange: [0.3, 2.5],
	});
	const waveOpacity1 = wave1.interpolate({
		inputRange: [0, 0.3, 1],
		outputRange: [0.8, 0.5, 0],
	});

	const waveScale2 = wave2.interpolate({
		inputRange: [0, 1],
		outputRange: [0.3, 2.5],
	});
	const waveOpacity2 = wave2.interpolate({
		inputRange: [0, 0.3, 1],
		outputRange: [0.6, 0.4, 0],
	});

	const waveScale3 = wave3.interpolate({
		inputRange: [0, 1],
		outputRange: [0.3, 2.5],
	});
	const waveOpacity3 = wave3.interpolate({
		inputRange: [0, 0.3, 1],
		outputRange: [0.4, 0.3, 0],
	});

	// ═══════════════════════════════════════════════════════════════════════
	// 🖼️ RENDER
	// ═══════════════════════════════════════════════════════════════════════
	const renderContent = () => {
		switch (state) {
			case "scanning":
				return (
					<View style={styles.centerContent}>
						<Text style={styles.instructionText}>Approchez votre carte...</Text>
						<Animated.View
							style={[styles.nfcIcon, { transform: [{ scale: pulseAnim }] }]}
						>
							<Ionicons name="wifi" size={60} color="#00D4FF" />
						</Animated.View>
					</View>
				);

			case "processing":
				return (
					<View style={styles.centerContent}>
						<Text style={styles.instructionText}>Traitement en cours...</Text>
						<Animated.View
							style={[styles.loader, { transform: [{ rotate: rotation }] }]}
						>
							<LinearGradient
								colors={["#00D4FF", "#7B2CBF", "#00D4FF"]}
								start={{ x: 0, y: 0 }}
								end={{ x: 1, y: 1 }}
								style={styles.loaderGradient}
							/>
						</Animated.View>
					</View>
				);

			case "success":
				return (
					<View style={styles.centerContent}>
						<Animated.View
							style={[
								styles.checkContainer,
								{
									transform: [{ scale: checkScale }],
									opacity: checkOpacity,
								},
							]}
						>
							<LinearGradient
								colors={["#00C853", "#00E676"]}
								style={styles.checkGradient}
							>
								<Ionicons name="checkmark" size={50} color="#FFF" />
							</LinearGradient>
						</Animated.View>
						<Text style={styles.successText}>Paiement accepté</Text>
						{receiptData && (
							<View style={styles.receiptMini}>
								<Text style={styles.receiptAmount}>
									{receiptData.amount?.toFixed(2)} €
								</Text>
								<Text style={styles.receiptId}>
									{receiptData.paymentIntentId}
								</Text>
							</View>
						)}
					</View>
				);

			case "error":
				return (
					<View style={styles.centerContent}>
						<View style={styles.errorContainer}>
							<Ionicons name="close-circle" size={60} color="#FF5252" />
						</View>
						<Text style={styles.errorText}>Paiement refusé</Text>
						<Text style={styles.errorSubtext}>Veuillez réessayer</Text>
					</View>
				);

			default: // idle
				return (
					<View style={styles.centerContent}>
						<Text style={styles.amountText}>{amount.toFixed(2)} €</Text>
						<Text style={styles.instructionText}>Appuyez pour payer</Text>
					</View>
				);
		}
	};

	if (!visible) return null;

	return (
		<Modal
			visible={visible}
			transparent
			animationType="none"
			statusBarTranslucent
		>
			<TouchableWithoutFeedback
				onPress={state === "success" ? onClose : undefined}
			>
				<Animated.View style={[styles.overlay, { opacity: opacityAnim }]}>
					<Animated.View
						style={[
							styles.cardContainer,
							{
								transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
							},
						]}
					>
						<LinearGradient
							colors={["#1A1A2E", "#16213E", "#0F3460"]}
							start={{ x: 0, y: 0 }}
							end={{ x: 1, y: 1 }}
							style={styles.card}
						>
							{/* Badge Test Mode */}
							{testMode && (
								<View style={styles.testBadge}>
									<Text style={styles.testBadgeText}>🧪 MODE TEST</Text>
								</View>
							)}

							{/* Header */}
							<View style={styles.header}>
								<View style={styles.headerLeft}>
									<Ionicons name="card" size={24} color="#00D4FF" />
									<Text style={styles.headerTitle}>Tap to Pay</Text>
								</View>
								<View style={styles.nfcBadge}>
									<Ionicons name="wifi" size={16} color="#00D4FF" />
								</View>
							</View>

							{/* Vagues NFC */}
							{(state === "scanning" || state === "processing") && (
								<View style={styles.wavesContainer}>
									<Animated.View
										style={[
											styles.wave,
											{
												transform: [{ scale: waveScale1 }],
												opacity: waveOpacity1,
												borderColor: "#00D4FF",
											},
										]}
									/>
									<Animated.View
										style={[
											styles.wave,
											{
												transform: [{ scale: waveScale2 }],
												opacity: waveOpacity2,
												borderColor: "#7B2CBF",
											},
										]}
									/>
									<Animated.View
										style={[
											styles.wave,
											{
												transform: [{ scale: waveScale3 }],
												opacity: waveOpacity3,
												borderColor: "#00D4FF",
											},
										]}
									/>
								</View>
							)}

							{/* Contenu central */}
							{renderContent()}

							{/* Footer */}
							<View style={styles.footer}>
								<Text style={styles.footerText}>
									Paiement sécurisé par Stripe
								</Text>
								<View style={styles.stripeLogos}>
									<Text style={styles.logoText}>💳</Text>
									<Text style={styles.logoText}>🔒</Text>
								</View>
							</View>
						</LinearGradient>
					</Animated.View>
				</Animated.View>
			</TouchableWithoutFeedback>
		</Modal>
	);
};

// ═══════════════════════════════════════════════════════════════════════
// 🎨 STYLES
// ═══════════════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
	overlay: {
		flex: 1,
		backgroundColor: "rgba(0, 0, 0, 0.85)",
		justifyContent: "center",
		alignItems: "center",
	},
	cardContainer: {
		width: CARD_WIDTH,
		height: CARD_HEIGHT + 100,
		borderRadius: 24,
		overflow: "hidden",
		shadowColor: "#00D4FF",
		shadowOffset: { width: 0, height: 10 },
		shadowOpacity: 0.5,
		shadowRadius: 30,
		elevation: 20,
	},
	card: {
		flex: 1,
		padding: 20,
		justifyContent: "space-between",
	},
	testBadge: {
		position: "absolute",
		top: 10,
		right: 10,
		backgroundColor: "rgba(245, 158, 11, 0.2)",
		paddingHorizontal: 10,
		paddingVertical: 4,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: "rgba(245, 158, 11, 0.5)",
	},
	testBadgeText: {
		color: "#F59E0B",
		fontSize: 10,
		fontWeight: "700",
	},
	header: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
	},
	headerLeft: {
		flexDirection: "row",
		alignItems: "center",
		gap: 10,
	},
	headerTitle: {
		color: "#FFF",
		fontSize: 18,
		fontWeight: "700",
		letterSpacing: 0.5,
	},
	nfcBadge: {
		width: 36,
		height: 36,
		borderRadius: 18,
		backgroundColor: "rgba(0, 212, 255, 0.15)",
		justifyContent: "center",
		alignItems: "center",
		borderWidth: 1,
		borderColor: "rgba(0, 212, 255, 0.3)",
	},
	wavesContainer: {
		position: "absolute",
		top: "50%",
		left: "50%",
		marginTop: -60,
		marginLeft: -60,
		width: 120,
		height: 120,
		justifyContent: "center",
		alignItems: "center",
	},
	wave: {
		position: "absolute",
		width: 120,
		height: 120,
		borderRadius: 60,
		borderWidth: 3,
	},
	centerContent: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
	},
	amountText: {
		color: "#FFF",
		fontSize: 42,
		fontWeight: "800",
		letterSpacing: 1,
		marginBottom: 10,
	},
	instructionText: {
		color: "rgba(255, 255, 255, 0.7)",
		fontSize: 16,
		fontWeight: "500",
		marginBottom: 20,
	},
	nfcIcon: {
		width: 100,
		height: 100,
		borderRadius: 50,
		backgroundColor: "rgba(0, 212, 255, 0.1)",
		justifyContent: "center",
		alignItems: "center",
		borderWidth: 2,
		borderColor: "rgba(0, 212, 255, 0.3)",
	},
	loader: {
		width: 60,
		height: 60,
		borderRadius: 30,
		overflow: "hidden",
	},
	loaderGradient: {
		flex: 1,
		borderRadius: 30,
		borderWidth: 4,
		borderColor: "transparent",
		borderTopColor: "#00D4FF",
		borderRightColor: "#7B2CBF",
	},
	checkContainer: {
		marginBottom: 15,
	},
	checkGradient: {
		width: 80,
		height: 80,
		borderRadius: 40,
		justifyContent: "center",
		alignItems: "center",
		shadowColor: "#00C853",
		shadowOffset: { width: 0, height: 5 },
		shadowOpacity: 0.5,
		shadowRadius: 15,
	},
	successText: {
		color: "#00E676",
		fontSize: 22,
		fontWeight: "700",
		letterSpacing: 0.5,
	},
	receiptMini: {
		marginTop: 15,
		alignItems: "center",
	},
	receiptAmount: {
		color: "#FFF",
		fontSize: 28,
		fontWeight: "800",
	},
	receiptId: {
		color: "rgba(255, 255, 255, 0.5)",
		fontSize: 11,
		marginTop: 5,
		fontFamily: "monospace",
	},
	errorContainer: {
		marginBottom: 15,
	},
	errorText: {
		color: "#FF5252",
		fontSize: 22,
		fontWeight: "700",
	},
	errorSubtext: {
		color: "rgba(255, 255, 255, 0.5)",
		fontSize: 14,
		marginTop: 5,
	},
	footer: {
		alignItems: "center",
	},
	footerText: {
		color: "rgba(255, 255, 255, 0.4)",
		fontSize: 11,
		marginBottom: 5,
	},
	stripeLogos: {
		flexDirection: "row",
		gap: 10,
	},
	logoText: {
		fontSize: 16,
	},
});

export default TapToPayModal;

// components/activity/modals/PremiumTPEModal.jsx
/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useRef, useState } from "react";
import {
	View,
	Text,
	StyleSheet,
	Modal,
	Animated,
	Dimensions,
	TouchableOpacity,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getItem as getSecureItem } from "../../../utils/secureStorage";
import { API_CONFIG } from "../../../src/config/apiConfig";

// Audio conditionnel (import statique)
let Audio = null;
try {
	// expo-av doit être installé pour le son
	const ExpoAV = require("expo-av");
	Audio = ExpoAV.Audio;
} catch (_e) {
	console.log("📢 expo-av non installé - son désactivé");
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// Dimensions TPE (ratio carte bancaire ~1.586)
const TPE_WIDTH = Math.min(SCREEN_WIDTH * 0.75, 320);
const TPE_HEIGHT = TPE_WIDTH * 1.7;

/**
 * 🎨 Premium TPE Payment Modal
 *
 * Modale de paiement ultra-premium style terminal bancaire
 * - Slide-up animation
 * - Effets NFC pulsants
 * - Loader premium 4s + quantum pulse
 * - Check de validation avec son
 */
export const PremiumTPEModal = ({
	visible,
	amount = 0,
	onSuccess,
	onCancel,
	orderId,
}) => {
	// ═══════════════════════════════════════════════════════════════════════
	// 📊 STATE
	// ═══════════════════════════════════════════════════════════════════════
	const [phase, setPhase] = useState("tip-selection"); // tip-selection | idle | processing | success | error
	const [statusText, setStatusText] = useState("");
	const [selectedTip, setSelectedTip] = useState(0); // Pourcentage du pourboire (0, 5, 10, 15) ou "custom"
	const [baseAmount] = useState(amount); // Montant de base sans pourboire
	const [finalAmount, setFinalAmount] = useState(amount); // Montant final avec pourboire
	const [isCustomInput, setIsCustomInput] = useState(false); // Mode input montant custom
	const [customAmount, setCustomAmount] = useState(""); // Montant custom en cours de saisie

	// ⭐ Ref pour garantir qu'on appelle toujours la bonne version des callbacks
	const onSuccessRef = useRef(onSuccess);
	const onCancelRef = useRef(onCancel);

	// Mettre à jour les refs à chaque render
	useEffect(() => {
		onSuccessRef.current = onSuccess;
		onCancelRef.current = onCancel;
	}, [onSuccess, onCancel]);

	// Reset quand visible ou orderId change
	useEffect(() => {
		if (visible) {
			setPhase("tip-selection");
			setStatusText("");
			setSelectedTip(0);
			setFinalAmount(amount);
		}
	}, [visible, orderId, amount]);

	// ═══════════════════════════════════════════════════════════════════════
	// 🎬 ANIMATIONS
	// ═══════════════════════════════════════════════════════════════════════
	const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
	const backdropOpacity = useRef(new Animated.Value(0)).current;
	const scaleAnim = useRef(new Animated.Value(0.9)).current;

	// NFC Waves
	const wave1 = useRef(new Animated.Value(0)).current;
	const wave2 = useRef(new Animated.Value(0)).current;
	const wave3 = useRef(new Animated.Value(0)).current;
	const wave4 = useRef(new Animated.Value(0)).current;

	// Pulse central
	const nfcPulse = useRef(new Animated.Value(1)).current;

	// Loader rotation
	const loaderRotate = useRef(new Animated.Value(0)).current;
	const loaderScale = useRef(new Animated.Value(0)).current;

	// Puff loader dots
	const puff1 = useRef(new Animated.Value(0)).current;
	const puff2 = useRef(new Animated.Value(0)).current;
	const puff3 = useRef(new Animated.Value(0)).current;

	// Check animation
	const checkScale = useRef(new Animated.Value(0)).current;
	const checkGlow = useRef(new Animated.Value(0)).current;

	// Son
	const soundRef = useRef(null);

	// ═══════════════════════════════════════════════════════════════════════
	// 🔊 SON DE VALIDATION
	// ═══════════════════════════════════════════════════════════════════════
	const playSuccessSound = async () => {
		if (!Audio) return;
		try {
			const { sound } = await Audio.Sound.createAsync(
				require("../../../assets/sounds/success-chime.mp3"),
				{ shouldPlay: true, volume: 0.8 }
			);
			soundRef.current = sound;
		} catch (_e) {
			console.log("🔇 Son non disponible");
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
	// 🎬 MODAL ENTRY/EXIT
	// ═══════════════════════════════════════════════════════════════════════
	useEffect(() => {
		if (visible) {
			// Reset phase et montants
			setPhase("tip-selection");
			setSelectedTip(0);
			setFinalAmount(baseAmount);

			// Reset animations
			slideAnim.setValue(SCREEN_HEIGHT);
			backdropOpacity.setValue(0);
			scaleAnim.setValue(0.9);

			// Slide up + fade in
			Animated.parallel([
				Animated.spring(slideAnim, {
					toValue: SCREEN_HEIGHT * 0.15,
					damping: 20,
					stiffness: 150,
					useNativeDriver: true,
				}),
				Animated.timing(backdropOpacity, {
					toValue: 1,
					duration: 300,
					useNativeDriver: true,
				}),
				Animated.spring(scaleAnim, {
					toValue: 1,
					damping: 15,
					stiffness: 200,
					useNativeDriver: true,
				}),
			]).start();

			// Start NFC waves
			startNFCAnimation();
		}
	}, [visible]);

	// ═══════════════════════════════════════════════════════════════════════
	// 🌊 NFC WAVE ANIMATION
	// ═══════════════════════════════════════════════════════════════════════
	const startNFCAnimation = () => {
		const createWave = (anim, delay) => {
			return Animated.loop(
				Animated.sequence([
					Animated.delay(delay),
					Animated.timing(anim, {
						toValue: 1,
						duration: 2000,
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

		Animated.parallel([
			createWave(wave1, 0),
			createWave(wave2, 500),
			createWave(wave3, 1000),
			createWave(wave4, 1500),
		]).start();

		// NFC icon pulse
		Animated.loop(
			Animated.sequence([
				Animated.timing(nfcPulse, {
					toValue: 1.15,
					duration: 800,
					useNativeDriver: true,
				}),
				Animated.timing(nfcPulse, {
					toValue: 1,
					duration: 800,
					useNativeDriver: true,
				}),
			])
		).start();
	};

	// ═══════════════════════════════════════════════════════════════════════
	// ⏳ PUFF LOADER ANIMATION
	// ═══════════════════════════════════════════════════════════════════════
	const startPuffLoader = () => {
		const puffAnimation = (anim, delay) => {
			return Animated.loop(
				Animated.sequence([
					Animated.delay(delay),
					Animated.timing(anim, {
						toValue: 1,
						duration: 600,
						useNativeDriver: true,
					}),
					Animated.timing(anim, {
						toValue: 0,
						duration: 600,
						useNativeDriver: true,
					}),
				])
			);
		};

		Animated.parallel([
			puffAnimation(puff1, 0),
			puffAnimation(puff2, 200),
			puffAnimation(puff3, 400),
		]).start();
	};

	// ═══════════════════════════════════════════════════════════════════════
	// 🔄 QUANTUM PULSE LOADER
	// ═══════════════════════════════════════════════════════════════════════
	const startQuantumLoader = () => {
		// Scale in
		Animated.spring(loaderScale, {
			toValue: 1,
			damping: 10,
			stiffness: 200,
			useNativeDriver: true,
		}).start();

		// Continuous rotation
		Animated.loop(
			Animated.timing(loaderRotate, {
				toValue: 1,
				duration: 1500,
				useNativeDriver: true,
			})
		).start();
	};

	// ═══════════════════════════════════════════════════════════════════════
	// ✅ SUCCESS ANIMATION
	// ═══════════════════════════════════════════════════════════════════════
	const playSuccessAnimation = () => {
		playSuccessSound();

		// Check scale with bounce
		Animated.spring(checkScale, {
			toValue: 1,
			damping: 8,
			stiffness: 200,
			useNativeDriver: true,
		}).start();

		// Glow pulse
		Animated.loop(
			Animated.sequence([
				Animated.timing(checkGlow, {
					toValue: 1,
					duration: 1000,
					useNativeDriver: true,
				}),
				Animated.timing(checkGlow, {
					toValue: 0.5,
					duration: 1000,
					useNativeDriver: true,
				}),
			])
		).start();
	};

	// ═══════════════════════════════════════════════════════════════════════
	// � HANDLE TIP SELECTION
	// ═══════════════════════════════════════════════════════════════════════
	const handleTipSelection = (percentage) => {
		console.log("💰 Pourboire sélectionné:", percentage + "%");
		setIsCustomInput(false);
		setCustomAmount("");
		setSelectedTip(percentage);
		const tipAmount = baseAmount * (percentage / 100);
		setFinalAmount(baseAmount + tipAmount);
	};

	const handleCustomTip = () => {
		console.log("💶 Mode montant custom activé");
		setIsCustomInput(true);
		setSelectedTip("custom");
		setCustomAmount("");
		setFinalAmount(baseAmount);
	};

	const handlePadPress = (value) => {
		if (!isCustomInput) return;

		if (value === "C") {
			// Remet le pourboire custom à 0
			console.log(
				"🔄 C pressé - baseAmount:",
				baseAmount,
				"finalAmount avant:",
				finalAmount
			);
			setCustomAmount("");
			setFinalAmount(baseAmount);
			console.log("🔄 Après reset - finalAmount devrait être:", baseAmount);
		} else if (value === "X") {
			// Retour au mode pourcentage
			setIsCustomInput(false);
			setCustomAmount("");
			setSelectedTip(0);
			setFinalAmount(baseAmount);
		} else if (value >= "0" && value <= "9") {
			const newAmount = customAmount + value;
			setCustomAmount(newAmount);
			const tipValue = parseFloat(newAmount) || 0;
			setFinalAmount(baseAmount + tipValue);
		}
	};

	const handleConfirmTip = () => {
		console.log("✅ Confirmation pourboire - Passage en phase idle");
		setPhase("idle");
	};

	// ═══════════════════════════════════════════════════════════════════════
	// 💳 HANDLE PAYMENT
	// ═══════════════════════════════════════════════════════════════════════
	const handlePay = async () => {
		// Si en phase tip-selection, passer en idle pour montrer l'écran de confirmation
		if (phase === "tip-selection") {
			console.log("✅ Confirmation pourboire - Passage en phase idle");
			setPhase("idle");
			return;
		}

		// Si en phase idle, lancer le paiement
		if (phase !== "idle") return;

		setPhase("processing");
		setStatusText("Connexion...");

		// Phase 1: Puff loader (4 secondes simulées)
		startPuffLoader();

		setTimeout(() => {
			setStatusText("Paiement en cours...");
			// Phase 2: Quantum loader
			puff1.setValue(0);
			puff2.setValue(0);
			puff3.setValue(0);
			startQuantumLoader();
		}, 2000);

		// Simuler appel API Stripe
		try {
			const token = await getToken();
			const API_BASE = getApiUrl();

			console.log("🔑 Token:", token ? "OK" : "MISSING");
			console.log("🌐 API_BASE:", API_BASE);
			console.log("💰 Amount (cents):", Math.round(amount * 100));
			console.log("📋 OrderId:", orderId);

			// Créer PaymentIntent (utiliser finalAmount avec pourboire)
			const createResponse = await fetch(`${API_BASE}/payments/create-intent`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({
					amount: Math.round(finalAmount * 100),
					currency: "eur",
					orderId: orderId,
				}),
			});

			console.log("📬 Response status:", createResponse.status);

			if (!createResponse.ok) {
				const errorData = await createResponse.json().catch(() => ({}));
				console.error(
					"❌ Erreur API create-intent:",
					createResponse.status,
					errorData
				);
				throw new Error(
					errorData.message ||
						errorData.error ||
						`Erreur ${createResponse.status}`
				);
			}

			const { paymentIntentId, paymentId } = await createResponse.json();

			// Confirmer avec carte test
			const confirmResponse = await fetch(`${API_BASE}/payments/confirm-test`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({
					paymentIntentId,
				}),
			});

			if (!confirmResponse.ok) {
				const errData = await confirmResponse.json().catch(() => ({}));
				console.error("❌ Confirm error:", errData);
				throw new Error(errData.message || "Paiement refusé");
			}

			await confirmResponse.json();

			// Attendre minimum 2s pour l'animation de succès
			await new Promise((r) => setTimeout(r, 2000));

			// Success !
			setPhase("success");
			setStatusText("Paiement accepté !");
			loaderRotate.setValue(0);
			loaderScale.setValue(0);
			playSuccessAnimation();

			// Auto-close après 2s d'animation succès
			setTimeout(() => {
				setPhase("idle");
				setStatusText("");

				if (onSuccessRef.current) {
					onSuccessRef.current({
						amount,
						paymentIntentId,
						paymentId,
						status: "succeeded",
					});
				}
			}, 2000);
		} catch (error) {
			console.error("❌ Erreur paiement:", error);
			setPhase("error");
			setStatusText(error.message || "Paiement échoué");

			setTimeout(() => {
				setPhase("idle");
				setStatusText("");
			}, 3000);
		}
	};

	// ═══════════════════════════════════════════════════════════════════════
	// 🔧 HELPERS
	// ═══════════════════════════════════════════════════════════════════════
	const getToken = async () => {
		try {
			return await getSecureItem("@access_token");
		} catch {
			return null;
		}
	};

	const getApiUrl = () => {
		return API_CONFIG?.baseURL || "https://orderit-backend-6y1m.onrender.com";
	};

	// ═══════════════════════════════════════════════════════════════════════
	// 🎨 INTERPOLATIONS
	// ═══════════════════════════════════════════════════════════════════════
	const rotation = loaderRotate.interpolate({
		inputRange: [0, 1],
		outputRange: ["0deg", "360deg"],
	});

	const waveInterpolate = (anim) => ({
		scale: anim.interpolate({
			inputRange: [0, 1],
			outputRange: [0.5, 2.5],
		}),
		opacity: anim.interpolate({
			inputRange: [0, 0.3, 1],
			outputRange: [0.8, 0.4, 0],
		}),
	});

	// ═══════════════════════════════════════════════════════════════════════
	// 🖼️ RENDER
	// ═══════════════════════════════════════════════════════════════════════
	// Ne pas rendre si pas visible (unmount complet)
	if (!visible) return null;

	return (
		<Modal
			visible={true}
			transparent
			animationType="fade"
			statusBarTranslucent
			onRequestClose={() => onCancelRef.current?.()}
		>
			{/* Backdrop */}
			<Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
				<BlurView intensity={30} style={StyleSheet.absoluteFill} tint="dark" />
			</Animated.View>

			{/* TPE Container */}
			<Animated.View
				style={[
					styles.tpeContainer,
					{
						transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
					},
				]}
			>
				{/* TPE Body */}
				<LinearGradient
					colors={["#2D2D3A", "#1A1A24", "#0D0D12"]}
					start={{ x: 0, y: 0 }}
					end={{ x: 0, y: 1 }}
					style={styles.tpeBody}
				>
					{/* Écran TPE */}
					<View style={styles.screen}>
						<LinearGradient
							colors={["#0a1628", "#0d1f3c", "#0a1628"]}
							style={styles.screenGradient}
						>
							{/* Header */}
							<View style={styles.screenHeader}>
								<Text style={styles.brandText}>OrderIt Pay</Text>
								<View style={styles.testBadge}>
									<Text style={styles.testBadgeText}>TEST</Text>
								</View>
							</View>

							{/* Content based on phase */}
							{phase === "tip-selection" && (
								<View style={styles.tipSelectionContent}>
									<Text style={styles.tipTitle}>
										Voulez-vous ajouter un pourboire ?
									</Text>

									<View style={styles.tipButtonsContainer}>
										{[0, 5, 10, 15].map((percentage) => (
											<TouchableOpacity
												key={percentage}
												style={[
													styles.tipButton,
													selectedTip === percentage &&
														styles.tipButtonSelected,
												]}
												onPress={() => handleTipSelection(percentage)}
												activeOpacity={0.7}
											>
												<Text
													style={[
														styles.tipButtonText,
														selectedTip === percentage &&
															styles.tipButtonTextSelected,
													]}
												>
													{`${percentage}%`}
												</Text>
											</TouchableOpacity>
										))}
										{/* Bouton € pour montant custom */}
										<TouchableOpacity
											style={[
												styles.tipButton,
												selectedTip === "custom" && styles.tipButtonSelected,
											]}
											onPress={handleCustomTip}
											activeOpacity={0.7}
										>
											<Text
												style={[
													styles.tipButtonText,
													{ fontSize: 20 },
													selectedTip === "custom" &&
														styles.tipButtonTextSelected,
												]}
											>
												€
											</Text>
										</TouchableOpacity>
									</View>

									<Text style={styles.tipTotalLine}>
										Total : {finalAmount.toFixed(2)} €
									</Text>
								</View>
							)}

							{phase === "idle" && (
								<View style={styles.idleContent}>
									<View style={styles.nfcContainer}>
										{[wave1, wave2, wave3, wave4].map((wave, i) => {
											const interp = waveInterpolate(wave);
											return (
												<Animated.View
													key={i}
													style={[
														styles.nfcWave,
														{
															borderColor: i % 2 === 0 ? "#00D4FF" : "#7B2CBF",
															transform: [{ scale: interp.scale }],
															opacity: interp.opacity,
														},
													]}
												/>
											);
										})}
										<Animated.View
											style={[
												styles.nfcIcon,
												{ transform: [{ scale: nfcPulse }] },
											]}
										>
											<Ionicons name="wifi" size={32} color="#00D4FF" />
										</Animated.View>
									</View>
									<Text style={styles.amountText}>
										{finalAmount.toFixed(2)} €
									</Text>
									<Text style={styles.hintText}>Appuyez sur OK pour payer</Text>
								</View>
							)}

							{phase === "processing" && (
								<View style={styles.processingContent}>
									{/* Puff Loader */}
									<View style={styles.puffContainer}>
										{[puff1, puff2, puff3].map((puff, i) => (
											<Animated.View
												key={i}
												style={[
													styles.puffDot,
													{
														backgroundColor: ["#00D4FF", "#7B2CBF", "#00E676"][
															i
														],
														transform: [
															{
																scale: puff.interpolate({
																	inputRange: [0, 1],
																	outputRange: [0.5, 1.2],
																}),
															},
														],
														opacity: puff.interpolate({
															inputRange: [0, 0.5, 1],
															outputRange: [0.3, 1, 0.3],
														}),
													},
												]}
											/>
										))}
									</View>

									{/* Quantum Loader */}
									<Animated.View
										style={[
											styles.quantumLoader,
											{
												transform: [
													{ rotate: rotation },
													{ scale: loaderScale },
												],
											},
										]}
									>
										<LinearGradient
											colors={["#00D4FF", "#7B2CBF", "#00D4FF"]}
											start={{ x: 0, y: 0 }}
											end={{ x: 1, y: 1 }}
											style={styles.quantumGradient}
										/>
									</Animated.View>

									<Text style={styles.statusText}>{statusText}</Text>
									<Text style={styles.amountSmall}>
										{finalAmount.toFixed(2)} €
									</Text>
								</View>
							)}

							{phase === "success" && (
								<View style={styles.successContent}>
									{/* Check with glow */}
									<Animated.View
										style={[
											styles.checkGlow,
											{
												opacity: checkGlow,
												transform: [{ scale: checkScale }],
											},
										]}
									/>
									<Animated.View
										style={[
											styles.checkContainer,
											{ transform: [{ scale: checkScale }] },
										]}
									>
										<LinearGradient
											colors={["#00C853", "#00E676"]}
											style={styles.checkGradient}
										>
											<Ionicons name="checkmark" size={48} color="#FFF" />
										</LinearGradient>
									</Animated.View>

									<Text style={styles.successText}>{statusText}</Text>
									<Text style={styles.amountSuccess}>
										{finalAmount.toFixed(2)} €
									</Text>
								</View>
							)}

							{phase === "error" && (
								<View style={styles.errorContent}>
									<View style={styles.errorIcon}>
										<Ionicons name="close-circle" size={56} color="#FF5252" />
									</View>
									<Text style={styles.errorText}>{statusText}</Text>
								</View>
							)}
						</LinearGradient>
					</View>

					{/* Boutons TPE */}
					<View style={styles.buttonsContainer}>
						{/* Rangée navigation */}
						<View style={styles.navRow}>
							<View style={styles.navButton}>
								<Ionicons name="chevron-down" size={16} color="#666" />
							</View>
							<View style={styles.navButton}>
								<Ionicons name="chevron-up" size={16} color="#666" />
							</View>
						</View>

						{/* Grille numérique (fonctionnel en mode custom) */}
						<View style={styles.numpadGrid}>
							{[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
								<TouchableOpacity
									key={num}
									style={[
										styles.numpadKey,
										isCustomInput && styles.numpadKeyActive,
									]}
									onPress={() => handlePadPress(String(num))}
									disabled={!isCustomInput}
									activeOpacity={0.6}
								>
									<Text
										style={[
											styles.numpadText,
											isCustomInput && styles.numpadTextActive,
										]}
									>
										{num}
									</Text>
								</TouchableOpacity>
							))}
							{/* C jaune */}
							<TouchableOpacity
								style={[
									styles.numpadKey,
									isCustomInput && styles.numpadKeyClear,
								]}
								onPress={() => handlePadPress("C")}
								disabled={!isCustomInput}
								activeOpacity={0.6}
							>
								<Text
									style={[
										styles.numpadText,
										isCustomInput && { color: "#333", fontWeight: "700" },
									]}
								>
									C
								</Text>
							</TouchableOpacity>
							{/* 0 */}
							<TouchableOpacity
								style={[
									styles.numpadKey,
									isCustomInput && styles.numpadKeyActive,
								]}
								onPress={() => handlePadPress("0")}
								disabled={!isCustomInput}
								activeOpacity={0.6}
							>
								<Text
									style={[
										styles.numpadText,
										isCustomInput && styles.numpadTextActive,
									]}
								>
									0
								</Text>
							</TouchableOpacity>
							{/* X rouge */}
							<TouchableOpacity
								style={[
									styles.numpadKey,
									isCustomInput && styles.numpadKeyCancel,
								]}
								onPress={() => handlePadPress("X")}
								disabled={!isCustomInput}
								activeOpacity={0.6}
							>
								<Text
									style={[
										styles.numpadText,
										isCustomInput && { color: "#FFF", fontWeight: "700" },
									]}
								>
									✕
								</Text>
							</TouchableOpacity>
						</View>

						{/* Boutons Annuler et OK */}
						<View style={styles.actionRow}>
							<TouchableOpacity
								style={styles.cancelButton}
								onPress={() => {
									if (onCancelRef.current) {
										onCancelRef.current();
									}
								}}
								activeOpacity={0.7}
							>
								<Text style={styles.cancelButtonText}>Annuler</Text>
							</TouchableOpacity>
							<TouchableOpacity
								style={[
									styles.payButton,
									phase !== "idle" &&
										phase !== "tip-selection" &&
										styles.payButtonDisabled,
								]}
								onPress={handlePay}
								disabled={phase !== "idle" && phase !== "tip-selection"}
								activeOpacity={0.7}
							>
								<Text style={styles.payButtonText}>OK</Text>
							</TouchableOpacity>
						</View>
					</View>

					{/* LED indicateur */}
					<View style={styles.ledContainer}>
						<View
							style={[
								styles.led,
								phase === "processing" && styles.ledProcessing,
								phase === "success" && styles.ledSuccess,
								phase === "error" && styles.ledError,
							]}
						/>
					</View>
				</LinearGradient>
			</Animated.View>
		</Modal>
	);
};

// ═══════════════════════════════════════════════════════════════════════
// 🎨 STYLES
// ═══════════════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
	backdrop: {
		...StyleSheet.absoluteFillObject,
		backgroundColor: "rgba(0, 0, 0, 0.7)",
	},
	tpeContainer: {
		position: "absolute",
		left: (SCREEN_WIDTH - TPE_WIDTH) / 2,
		width: TPE_WIDTH,
		height: TPE_HEIGHT,
	},
	tpeBody: {
		flex: 1,
		borderRadius: 24,
		padding: 12,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 20 },
		shadowOpacity: 0.5,
		shadowRadius: 40,
		elevation: 25,
		borderWidth: 1,
		borderColor: "rgba(255,255,255,0.1)",
	},
	// Screen
	screen: {
		flex: 1,
		maxHeight: TPE_HEIGHT * 0.45,
		borderRadius: 12,
		overflow: "hidden",
		borderWidth: 2,
		borderColor: "#1a1a24",
	},
	screenGradient: {
		flex: 1,
		padding: 16,
	},
	screenHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 8,
	},
	brandText: {
		fontSize: 14,
		fontWeight: "700",
		color: "#00D4FF",
		letterSpacing: 1,
	},
	testBadge: {
		backgroundColor: "rgba(245, 158, 11, 0.2)",
		paddingHorizontal: 8,
		paddingVertical: 2,
		borderRadius: 4,
		borderWidth: 1,
		borderColor: "rgba(245, 158, 11, 0.5)",
	},
	testBadgeText: {
		fontSize: 9,
		fontWeight: "700",
		color: "#F59E0B",
	},
	// Idle
	idleContent: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
	},
	nfcContainer: {
		width: 100,
		height: 100,
		justifyContent: "center",
		alignItems: "center",
		marginBottom: 16,
	},
	nfcWave: {
		position: "absolute",
		width: 80,
		height: 80,
		borderRadius: 40,
		borderWidth: 2,
	},
	nfcIcon: {
		width: 60,
		height: 60,
		borderRadius: 30,
		backgroundColor: "rgba(0, 212, 255, 0.1)",
		justifyContent: "center",
		alignItems: "center",
		borderWidth: 2,
		borderColor: "rgba(0, 212, 255, 0.3)",
	},
	amountText: {
		fontSize: 32,
		fontWeight: "800",
		color: "#FFF",
		letterSpacing: 1,
	},
	hintText: {
		fontSize: 12,
		color: "rgba(255,255,255,0.5)",
		marginTop: 8,
	},
	// Processing
	processingContent: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
	},
	puffContainer: {
		flexDirection: "row",
		gap: 12,
		marginBottom: 20,
	},
	puffDot: {
		width: 16,
		height: 16,
		borderRadius: 8,
	},
	quantumLoader: {
		width: 50,
		height: 50,
		borderRadius: 25,
		overflow: "hidden",
		marginBottom: 16,
	},
	quantumGradient: {
		flex: 1,
		borderRadius: 25,
		borderWidth: 4,
		borderColor: "transparent",
		borderTopColor: "#00D4FF",
		borderRightColor: "#7B2CBF",
	},
	statusText: {
		fontSize: 14,
		fontWeight: "600",
		color: "#FFF",
		marginBottom: 4,
	},
	amountSmall: {
		fontSize: 18,
		fontWeight: "700",
		color: "rgba(255,255,255,0.6)",
	},
	// Success
	successContent: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
	},
	checkGlow: {
		position: "absolute",
		width: 120,
		height: 120,
		borderRadius: 60,
		backgroundColor: "rgba(0, 200, 83, 0.3)",
	},
	checkContainer: {
		marginBottom: 16,
	},
	checkGradient: {
		width: 72,
		height: 72,
		borderRadius: 36,
		justifyContent: "center",
		alignItems: "center",
		shadowColor: "#00C853",
		shadowOffset: { width: 0, height: 8 },
		shadowOpacity: 0.5,
		shadowRadius: 16,
	},
	successText: {
		fontSize: 18,
		fontWeight: "700",
		color: "#00E676",
		marginBottom: 4,
	},
	amountSuccess: {
		fontSize: 24,
		fontWeight: "800",
		color: "#FFF",
	},
	// Error
	errorContent: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
	},
	errorIcon: {
		marginBottom: 12,
	},
	errorText: {
		fontSize: 14,
		fontWeight: "600",
		color: "#FF5252",
		textAlign: "center",
	},
	// Buttons
	buttonsContainer: {
		marginTop: 12,
	},
	navRow: {
		flexDirection: "row",
		justifyContent: "center",
		gap: 20,
		marginBottom: 8,
	},
	navButton: {
		width: 44,
		height: 28,
		backgroundColor: "#3D3D4A",
		borderRadius: 4,
		justifyContent: "center",
		alignItems: "center",
	},
	numpadGrid: {
		flexDirection: "row",
		flexWrap: "wrap",
		justifyContent: "center",
		gap: 6,
		marginBottom: 10,
	},
	numpadKey: {
		width: (TPE_WIDTH - 60) / 3 - 6,
		height: 32,
		backgroundColor: "#4A4A5A",
		borderRadius: 4,
		justifyContent: "center",
		alignItems: "center",
	},
	numpadText: {
		fontSize: 14,
		fontWeight: "600",
		color: "#666",
	},
	numpadKeyActive: {
		backgroundColor: "#5A5A6A",
		borderWidth: 1,
		borderColor: "rgba(0, 212, 255, 0.3)",
	},
	numpadKeyClear: {
		backgroundColor: "#FFC107",
	},
	numpadKeyCancel: {
		backgroundColor: "#E53935",
	},
	numpadTextActive: {
		color: "#FFF",
	},
	actionRow: {
		flexDirection: "row",
		justifyContent: "center",
		gap: 12,
	},
	payButtonFull: {
		flex: 1,
		height: 44,
		backgroundColor: "#4CAF50",
		borderRadius: 6,
		justifyContent: "center",
		alignItems: "center",
	},
	cancelButton: {
		flex: 1,
		height: 44,
		backgroundColor: "#E53935",
		borderRadius: 6,
		justifyContent: "center",
		alignItems: "center",
	},
	cancelButtonText: {
		fontSize: 20,
		fontWeight: "700",
		color: "#FFF",
	},
	clearButton: {
		flex: 1,
		height: 44,
		backgroundColor: "#FFC107",
		borderRadius: 6,
		justifyContent: "center",
		alignItems: "center",
	},
	clearButtonText: {
		fontSize: 18,
		fontWeight: "700",
		color: "#333",
	},
	payButton: {
		flex: 1,
		height: 44,
		backgroundColor: "#4CAF50",
		borderRadius: 6,
		justifyContent: "center",
		alignItems: "center",
	},
	payButtonDisabled: {
		backgroundColor: "#2E7D32",
		opacity: 0.6,
	},
	payButtonText: {
		fontSize: 18,
		fontWeight: "700",
		color: "#FFF",
	},
	// LED
	ledContainer: {
		position: "absolute",
		top: 20,
		right: 20,
	},
	led: {
		width: 8,
		height: 8,
		borderRadius: 4,
		backgroundColor: "#333",
	},
	ledProcessing: {
		backgroundColor: "#FFC107",
		shadowColor: "#FFC107",
		shadowOffset: { width: 0, height: 0 },
		shadowOpacity: 1,
		shadowRadius: 6,
	},
	ledSuccess: {
		backgroundColor: "#4CAF50",
		shadowColor: "#4CAF50",
		shadowOffset: { width: 0, height: 0 },
		shadowOpacity: 1,
		shadowRadius: 6,
	},
	ledError: {
		backgroundColor: "#F44336",
		shadowColor: "#F44336",
		shadowOffset: { width: 0, height: 0 },
		shadowOpacity: 1,
		shadowRadius: 6,
	},

	// ═══════════════════════════════════════════════════════════════════════
	// 💰 TIP SELECTION STYLES
	// ═══════════════════════════════════════════════════════════════════════
	tipSelectionContent: {
		flex: 1,
		paddingVertical: 20,
		paddingHorizontal: 16,
		justifyContent: "space-between",
	},
	tipTitle: {
		fontSize: 18,
		fontWeight: "600",
		color: "#E0E6ED",
		textAlign: "center",
		marginBottom: 20,
	},
	tipButtonsContainer: {
		flexDirection: "row",
		justifyContent: "center",
		marginBottom: 24,
		gap: 6,
	},
	tipButton: {
		width: 48,
		height: 48,
		backgroundColor: "rgba(255, 255, 255, 0.08)",
		borderRadius: 8,
		borderWidth: 2,
		borderColor: "rgba(255, 255, 255, 0.15)",
		justifyContent: "center",
		alignItems: "center",
	},
	tipButtonSelected: {
		backgroundColor: "rgba(0, 212, 255, 0.25)",
		borderColor: "#00D4FF",
		borderWidth: 3,
		shadowColor: "#00D4FF",
		shadowOffset: { width: 0, height: 0 },
		shadowOpacity: 0.5,
		shadowRadius: 8,
	},
	tipButtonText: {
		fontSize: 16,
		fontWeight: "600",
		color: "#E0E6ED",
		textAlign: "center",
	},
	tipButtonTextSelected: {
		color: "#00D4FF",
	},
	tipRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		paddingVertical: 8,
	},
	tipRowTotal: {
		borderTopWidth: 1,
		borderTopColor: "rgba(255, 255, 255, 0.1)",
		marginTop: 8,
		paddingTop: 12,
	},
	tipLabel: {
		fontSize: 14,
		color: "#9CA3AF",
	},
	tipValue: {
		fontSize: 14,
		color: "#E0E6ED",
		fontWeight: "500",
	},
	tipLabelTotal: {
		fontSize: 16,
		color: "#E0E6ED",
		fontWeight: "700",
	},
	tipValueTotal: {
		fontSize: 18,
		color: "#00D4FF",
		fontWeight: "700",
	},
	tipTotalLine: {
		fontSize: 14,
		color: "#9CA3AF",
		textAlign: "center",
		fontStyle: "italic",
		fontWeight: "800",
	},
	tipHint: {
		fontSize: 14,
		color: "#9CA3AF",
		textAlign: "center",
		marginTop: 12,
		fontStyle: "italic",
	},
	confirmTipButton: {
		flexDirection: "row",
		backgroundColor: "#00D4FF",
		height: 52,
		borderRadius: 12,
		justifyContent: "center",
		alignItems: "center",
		gap: 8,
		shadowColor: "#00D4FF",
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.4,
		shadowRadius: 10,
		elevation: 8,
	},
	confirmTipButtonText: {
		fontSize: 17,
		fontWeight: "700",
		color: "#FFF",
		letterSpacing: 0.5,
	},
});

export default PremiumTPEModal;

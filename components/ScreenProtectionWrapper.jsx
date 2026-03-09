/**
 * 🔒 ScreenProtectionWrapper
 *
 * Composant wrapper qui :
 * 1. Active FLAG_SECURE sur Android (bloque screenshot, recording, aperçu multitâche)
 * 2. Affiche un overlay flou sur iOS quand un screenshot est détecté
 * 3. Affiche un écran de remplacement lors de l'aperçu multitâche iOS (appState = inactive)
 *
 * Usage :
 *   <ScreenProtectionWrapper>
 *     <MonEcranSensible />
 *   </ScreenProtectionWrapper>
 *
 * Props :
 *   enabled        {boolean}  – Active la protection (défaut: true)
 *   blurOnCapture  {boolean}  – Floute sur screenshot iOS (défaut: true)
 *   blurDuration   {number}   – Durée du blur en ms (défaut: 2000)
 *   protectionKey  {string}   – Clé unique par écran
 *   children       {ReactNode}
 */

import React, { useEffect, useRef, useState } from "react";
import {
	View,
	StyleSheet,
	Text,
	AppState,
	Platform,
	Animated,
	TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useScreenProtection } from "../hooks/useScreenProtection";

const ScreenProtectionWrapper = ({
	enabled = true,
	blurOnCapture = true,
	blurDuration = 2000,
	protectionKey = "screen",
	children,
}) => {
	// ─── Protection hook ─────────────────────────────────────────────────────
	const { isBlurred, clearBlur } = useScreenProtection({
		enabled,
		blurOnCapture,
		blurDuration,
		protectionKey,
	});

	// ─── Masquage multitâche iOS (appState = inactive) ───────────────────────
	const [isHidden, setIsHidden] = useState(false);
	const appStateRef = useRef(AppState.currentState);
	const overlayOpacity = useRef(new Animated.Value(0)).current;

	useEffect(() => {
		if (!enabled || Platform.OS !== "ios") return;

		const subscription = AppState.addEventListener("change", (nextState) => {
			const wasActive = appStateRef.current === "active";
			const goingInactive = nextState === "inactive";
			const comingBack = nextState === "active";

			if (wasActive && goingInactive) {
				// L'app va en arrière-plan → masquer immédiatement
				setIsHidden(true);
				Animated.timing(overlayOpacity, {
					toValue: 1,
					duration: 80,
					useNativeDriver: true,
				}).start();
			} else if (comingBack) {
				Animated.timing(overlayOpacity, {
					toValue: 0,
					duration: 300,
					useNativeDriver: true,
				}).start(() => setIsHidden(false));
			}
			appStateRef.current = nextState;
		});

		return () => subscription?.remove();
	}, [enabled, overlayOpacity]);

	// ─── Overlay screenshot iOS ───────────────────────────────────────────────
	const blurOpacity = useRef(new Animated.Value(0)).current;
	useEffect(() => {
		if (Platform.OS !== "ios") return;
		Animated.timing(blurOpacity, {
			toValue: isBlurred ? 1 : 0,
			duration: isBlurred ? 120 : 400,
			useNativeDriver: true,
		}).start();
	}, [isBlurred, blurOpacity]);

	return (
		<View style={styles.container}>
			{children}

			{/* Overlay blur iOS — screenshot détecté */}
			{Platform.OS === "ios" && (
				<Animated.View
					style={[styles.blurOverlay, { opacity: blurOpacity }]}
					pointerEvents={isBlurred ? "auto" : "none"}
				>
					<BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill}>
						<View style={styles.blurContent}>
							<View style={styles.blurIconWrapper}>
								<Ionicons name="shield-checkmark" size={48} color="white" />
							</View>
							<Text style={styles.blurTitle}>Contenu protégé</Text>
							<Text style={styles.blurSubtitle}>
								{"Capture d'écran détectée.\nCe contenu est confidentiel."}
							</Text>
							<TouchableOpacity onPress={clearBlur} style={styles.blurButton}>
								<Text style={styles.blurButtonText}>Fermer</Text>
							</TouchableOpacity>
						</View>
					</BlurView>
				</Animated.View>
			)}

			{/* Overlay multitâche iOS */}
			{Platform.OS === "ios" && isHidden && (
				<Animated.View
					style={[styles.multitaskOverlay, { opacity: overlayOpacity }]}
					pointerEvents="none"
				>
					<Ionicons
						name="lock-closed"
						size={40}
						color="rgba(255,255,255,0.7)"
					/>
					<Text style={styles.multitaskText}>Contenu masqué</Text>
				</Animated.View>
			)}
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},

	// Overlay screenshot iOS
	blurOverlay: {
		...StyleSheet.absoluteFillObject,
		zIndex: 9999,
	},
	blurContent: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		padding: 32,
	},
	blurIconWrapper: {
		width: 88,
		height: 88,
		borderRadius: 44,
		backgroundColor: "rgba(239, 68, 68, 0.25)",
		borderWidth: 2,
		borderColor: "rgba(239, 68, 68, 0.5)",
		justifyContent: "center",
		alignItems: "center",
		marginBottom: 20,
	},
	blurTitle: {
		fontSize: 22,
		fontWeight: "700",
		color: "white",
		marginBottom: 10,
		textAlign: "center",
	},
	blurSubtitle: {
		fontSize: 15,
		color: "rgba(255,255,255,0.75)",
		textAlign: "center",
		lineHeight: 22,
		marginBottom: 28,
	},
	blurButton: {
		backgroundColor: "rgba(255,255,255,0.18)",
		borderWidth: 1,
		borderColor: "rgba(255,255,255,0.3)",
		paddingHorizontal: 28,
		paddingVertical: 12,
		borderRadius: 24,
	},
	blurButtonText: {
		color: "white",
		fontSize: 15,
		fontWeight: "600",
	},

	// Overlay multitâche iOS
	multitaskOverlay: {
		...StyleSheet.absoluteFillObject,
		backgroundColor: "#0F172A",
		zIndex: 9998,
		justifyContent: "center",
		alignItems: "center",
		gap: 12,
	},
	multitaskText: {
		fontSize: 16,
		color: "rgba(255,255,255,0.6)",
		fontWeight: "500",
	},
});

export default ScreenProtectionWrapper;

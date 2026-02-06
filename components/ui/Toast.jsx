/**
 * 🍞 Toast - Composant de notification instantanée
 *
 * Variantes :
 * - default : Message standard (indigo)
 * - success : Paiement/confirmation (vert)
 * - warning : Attention (orange)
 * - error : Erreur (rouge)
 *
 * Design cohérent avec le thème SunnyGo
 */

import React, { useEffect, useRef, useCallback } from "react";
import {
	View,
	Text,
	TouchableOpacity,
	StyleSheet,
	Animated,
	Platform,
	Vibration,
} from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import useNotificationStore, {
	TOAST_VARIANTS,
} from "../../src/stores/useNotificationStore";

// 🎨 Configuration des variantes
const VARIANT_CONFIG = {
	[TOAST_VARIANTS.DEFAULT]: {
		gradient: ["#667eea", "#764ba2"],
		icon: "chatbubble-ellipses",
		iconColor: "#fff",
	},
	[TOAST_VARIANTS.SUCCESS]: {
		gradient: ["#22c55e", "#16a34a"],
		icon: "checkmark-circle",
		iconColor: "#fff",
	},
	[TOAST_VARIANTS.WARNING]: {
		gradient: ["#f59e0b", "#d97706"],
		icon: "warning",
		iconColor: "#fff",
	},
	[TOAST_VARIANTS.ERROR]: {
		gradient: ["#ef4444", "#dc2626"],
		icon: "close-circle",
		iconColor: "#fff",
	},
};

const Toast = () => {
	const { currentToast, hideToast, openInbox } = useNotificationStore();

	// Animations
	const translateY = useRef(new Animated.Value(-150)).current;
	const opacity = useRef(new Animated.Value(0)).current;
	const scale = useRef(new Animated.Value(0.9)).current;
	const timeoutRef = useRef(null);

	// Animation d'entrée
	const showAnimation = useCallback(() => {
		// Vibration
		if (Platform.OS !== "web") {
			Vibration.vibrate([0, 80, 40, 80]);
		}

		Animated.parallel([
			Animated.spring(translateY, {
				toValue: 0,
				friction: 8,
				tension: 65,
				useNativeDriver: true,
			}),
			Animated.timing(opacity, {
				toValue: 1,
				duration: 250,
				useNativeDriver: true,
			}),
			Animated.spring(scale, {
				toValue: 1,
				friction: 6,
				useNativeDriver: true,
			}),
		]).start();
	}, [translateY, opacity, scale]);

	// Animation de sortie
	const hideAnimation = useCallback(() => {
		Animated.parallel([
			Animated.timing(translateY, {
				toValue: -150,
				duration: 250,
				useNativeDriver: true,
			}),
			Animated.timing(opacity, {
				toValue: 0,
				duration: 200,
				useNativeDriver: true,
			}),
			Animated.timing(scale, {
				toValue: 0.9,
				duration: 200,
				useNativeDriver: true,
			}),
		]).start(() => {
			hideToast();
		});
	}, [translateY, opacity, scale, hideToast]);

	// Gestion du cycle de vie du toast
	useEffect(() => {
		if (currentToast) {
			// Reset position
			translateY.setValue(-150);
			opacity.setValue(0);
			scale.setValue(0.9);

			// Afficher
			showAnimation();

			// Auto-hide
			timeoutRef.current = setTimeout(() => {
				hideAnimation();
			}, currentToast.duration || 5000);
		}

		return () => {
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
			}
		};
	}, [currentToast, showAnimation, hideAnimation]);

	// Clic sur le bouton d'action
	const handleAction = useCallback(() => {
		if (currentToast?.action?.type === "open-inbox") {
			openInbox();
		}
		hideAnimation();
	}, [currentToast, openInbox, hideAnimation]);

	// Fermer le toast
	const handleDismiss = useCallback(() => {
		if (timeoutRef.current) {
			clearTimeout(timeoutRef.current);
		}
		hideAnimation();
	}, [hideAnimation]);

	if (!currentToast) return null;

	const variantConfig =
		VARIANT_CONFIG[currentToast.variant] || VARIANT_CONFIG.default;

	return (
		<Animated.View
			style={[
				styles.container,
				{
					transform: [{ translateY }, { scale }],
					opacity,
				},
			]}
		>
			<BlurView intensity={80} tint="dark" style={styles.blurContainer}>
				<LinearGradient
					colors={variantConfig.gradient}
					start={{ x: 0, y: 0 }}
					end={{ x: 1, y: 1 }}
					style={styles.gradientBorder}
				>
					<View style={styles.content}>
						{/* Icône */}
						<View style={styles.iconContainer}>
							<LinearGradient
								colors={variantConfig.gradient}
								style={styles.iconGradient}
							>
								<Ionicons
									name={variantConfig.icon}
									size={22}
									color={variantConfig.iconColor}
								/>
							</LinearGradient>
						</View>

						{/* Texte */}
						<View style={styles.textContainer}>
							<Text style={styles.title} numberOfLines={1}>
								{currentToast.title}
							</Text>
							<Text style={styles.message} numberOfLines={2}>
								{currentToast.message}
							</Text>
						</View>

						{/* Actions */}
						<View style={styles.actions}>
							{currentToast.action && (
								<TouchableOpacity
									style={styles.actionButton}
									onPress={handleAction}
									activeOpacity={0.7}
								>
									<Text style={styles.actionText}>
										{currentToast.action.label || "Voir"}
									</Text>
								</TouchableOpacity>
							)}
							<TouchableOpacity
								style={styles.closeButton}
								onPress={handleDismiss}
								activeOpacity={0.7}
							>
								<Ionicons
									name="close"
									size={20}
									color="rgba(255,255,255,0.6)"
								/>
							</TouchableOpacity>
						</View>
					</View>
				</LinearGradient>
			</BlurView>
		</Animated.View>
	);
};

const styles = StyleSheet.create({
	container: {
		position: "absolute",
		top: Platform.OS === "ios" ? 50 : 30,
		left: 16,
		right: 16,
		zIndex: 9999,
		elevation: 100,
	},
	blurContainer: {
		borderRadius: 16,
		overflow: "hidden",
	},
	gradientBorder: {
		padding: 1.5,
		borderRadius: 16,
	},
	content: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "rgba(30, 30, 50, 0.95)",
		borderRadius: 15,
		paddingVertical: 14,
		paddingHorizontal: 16,
		gap: 12,
	},
	iconContainer: {
		flexShrink: 0,
	},
	iconGradient: {
		width: 42,
		height: 42,
		borderRadius: 12,
		justifyContent: "center",
		alignItems: "center",
	},
	textContainer: {
		flex: 1,
		marginRight: 8,
	},
	title: {
		fontSize: 15,
		fontWeight: "700",
		color: "#ffffff",
		marginBottom: 2,
	},
	message: {
		fontSize: 13,
		color: "rgba(255, 255, 255, 0.75)",
		lineHeight: 18,
	},
	actions: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
	},
	actionButton: {
		backgroundColor: "rgba(102, 126, 234, 0.25)",
		paddingVertical: 8,
		paddingHorizontal: 14,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: "rgba(102, 126, 234, 0.4)",
	},
	actionText: {
		fontSize: 13,
		fontWeight: "600",
		color: "#667eea",
	},
	closeButton: {
		padding: 6,
	},
});

export default Toast;

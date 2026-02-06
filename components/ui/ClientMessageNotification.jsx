/**
 * 🔔 ClientMessageNotification - Alert moderne pour messages clients
 *
 * Style inspiration : 21st.dev notification-alert-dialog
 * Affiche une alerte élégante avec actions rapides
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
	View,
	Text,
	TouchableOpacity,
	StyleSheet,
	Animated,
	Vibration,
	Platform,
	Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import useSocket from "../../hooks/useSocket";
import ServerResponseModal from "../modals/ServerResponseModal";
import useUserStore from "../../src/stores/useUserStore";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// 🎨 Design cohérent avec l'app
const COLORS = {
	primary: "#667eea",
	accent: "#F59E0B",
	success: "#22c55e",
	glass: "rgba(30, 30, 50, 0.95)",
	text: "#ffffff",
	textMuted: "rgba(255, 255, 255, 0.7)",
};

// Icônes par catégorie
const CATEGORY_CONFIG = {
	service: { color: "#667eea", icon: "restaurant-outline" },
	commande: { color: "#f59e0b", icon: "receipt-outline" },
	paiement: { color: "#22c55e", icon: "card-outline" },
	autre: { color: "#8b5cf6", icon: "ellipsis-horizontal-outline" },
};

const ClientMessageNotification = ({ onMessagePress }) => {
	const [notifications, setNotifications] = useState([]);
	const [currentNotification, setCurrentNotification] = useState(null);
	const [showResponseModal, setShowResponseModal] = useState(false);
	const [selectedMessage, setSelectedMessage] = useState(null);
	const { socket, isConnected } = useSocket();
	const { restaurantId } = useUserStore();

	// Animations
	const translateY = useRef(new Animated.Value(-150)).current;
	const opacity = useRef(new Animated.Value(0)).current;

	// Animations scale + opacity pour effet modern
	const scale = useRef(new Animated.Value(0.8)).current;

	// Animation de masquage
	const hideNotification = useCallback(() => {
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
				toValue: 0.8,
				duration: 200,
				useNativeDriver: true,
			}),
		]).start(() => {
			setCurrentNotification(null);
		});
	}, [translateY, opacity, scale]);

	// Animation d'affichage
	const showNotification = useCallback(() => {
		Animated.parallel([
			Animated.spring(translateY, {
				toValue: 0,
				friction: 9,
				tension: 100,
				useNativeDriver: true,
			}),
			Animated.spring(scale, {
				toValue: 1,
				friction: 8,
				tension: 80,
				useNativeDriver: true,
			}),
			Animated.timing(opacity, {
				toValue: 1,
				duration: 300,
				useNativeDriver: true,
			}),
		]).start();

		// Auto-hide après 7 secondes (plus de temps pour lire)
		setTimeout(() => {
			hideNotification();
		}, 7000);
	}, [translateY, opacity, scale, hideNotification]);

	// Écouter les messages WebSocket
	useEffect(() => {
		console.log("🔌 ClientMessageNotification - Socket connecté:", isConnected);

		if (!socket || !isConnected) return;

		const handleClientMessage = (event) => {
			console.log("📨 [ClientMessageNotification] Message client reçu:", event);

			if (event.type === "new-message") {
				const notification = {
					id: event.data.messageId,
					text: event.data.messageText,
					tableNumber: event.data.tableNumber,
					tableId: event.data.tableId,
					clientName: event.data.clientName,
					category: event.data.category || "service",
					icon: event.data.icon || "chatbubble-outline",
					timestamp: new Date(event.timestamp),
					reservationId: event.data.reservationId,
				};

				// Ajouter à la file d'attente
				setNotifications((prev) => [...prev, notification]);

				// Vibration
				if (Platform.OS !== "web") {
					Vibration.vibrate([0, 100, 50, 100]);
				}
			}
		};

		const handleServerResponse = (event) => {
			console.log("📨 Réponse serveur reçue:", event);
			// Retirer la notification correspondante
			if (event.data?.clientMessageId) {
				setNotifications((prev) =>
					prev.filter((n) => n.id !== event.data.clientMessageId),
				);
				// Si c'est la notification actuelle, la masquer
				if (currentNotification?.id === event.data.clientMessageId) {
					hideNotification();
				}
			}
		};

		socket.on("client-message", handleClientMessage);
		socket.on("server-response", handleServerResponse);

		return () => {
			socket.off("client-message", handleClientMessage);
			socket.off("server-response", handleServerResponse);
		};
	}, [socket, isConnected, currentNotification, hideNotification]);

	// Afficher les notifications une par une
	useEffect(() => {
		if (notifications.length > 0 && !currentNotification) {
			const next = notifications[0];
			setCurrentNotification(next);
			setNotifications((prev) => prev.slice(1));
			showNotification();
		}
	}, [notifications, currentNotification, showNotification]);

	// Clic sur la notification → Ouvrir modal réponse
	const handlePress = useCallback(() => {
		if (currentNotification) {
			setSelectedMessage(currentNotification);
			setShowResponseModal(true);
			hideNotification();
		}
	}, [currentNotification, hideNotification]);

	// Callback après envoi réponse
	const handleResponseSent = useCallback((message) => {
		console.log("✅ Réponse envoyée pour message:", message.id);
		// Retirer de la file d'attente
		setNotifications((prev) => prev.filter((n) => n.id !== message.id));
		setShowResponseModal(false);
		setSelectedMessage(null);
	}, []);

	// Fermer modal
	const handleCloseModal = useCallback(() => {
		setShowResponseModal(false);
		setSelectedMessage(null);
	}, []);

	// Fermer la notification
	const handleDismiss = useCallback(() => {
		hideNotification();
	}, [hideNotification]);

	if (!currentNotification) return null;

	const categoryConfig =
		CATEGORY_CONFIG[currentNotification.category] || CATEGORY_CONFIG.autre;

	return (
		<>
			<Animated.View
				style={[
					styles.container,
					{
						transform: [{ translateY }, { scale }],
						opacity,
					},
				]}
			>
				{/* Glow effect */}
				<View style={styles.glowContainer}>
					<LinearGradient
						colors={[
							`${categoryConfig.color}40`,
							`${categoryConfig.color}10`,
							"transparent",
						]}
						style={styles.glow}
					/>
				</View>

				<TouchableOpacity
					activeOpacity={0.92}
					onPress={handlePress}
					style={styles.touchable}
				>
					<BlurView intensity={95} tint="dark" style={styles.blur}>
						<LinearGradient
							colors={["rgba(15, 23, 42, 0.95)", "rgba(30, 41, 59, 0.92)"]}
							style={styles.gradientOverlay}
						>
							<View style={styles.content}>
								{/* Header avec icône pulsante */}
								<View style={styles.header}>
									<View style={styles.headerLeft}>
										<View
											style={[
												styles.iconContainer,
												{ backgroundColor: `${categoryConfig.color}25` },
											]}
										>
											<Ionicons
												name={currentNotification.icon || categoryConfig.icon}
												size={22}
												color={categoryConfig.color}
											/>
										</View>
										<View>
											<Text style={styles.title}>Nouveau message</Text>
											<View style={styles.subtitleRow}>
												<Text style={styles.tableText}>
													Table {currentNotification.tableNumber}
												</Text>
												<Text style={styles.separator}>•</Text>
												<Text style={styles.clientName}>
													{currentNotification.clientName}
												</Text>
											</View>
										</View>
									</View>
									<TouchableOpacity
										onPress={handleDismiss}
										style={styles.closeButton}
										hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
									>
										<Ionicons name="close" size={18} color={COLORS.textMuted} />
									</TouchableOpacity>
								</View>

								{/* Message */}
								<Text style={styles.messageText} numberOfLines={2}>
									{currentNotification.text}
								</Text>

								{/* Actions rapides */}
								<View style={styles.actions}>
									<TouchableOpacity
										style={[styles.actionButton, styles.actionSecondary]}
										onPress={handleDismiss}
									>
										<Text style={styles.actionTextSecondary}>Plus tard</Text>
									</TouchableOpacity>
									<TouchableOpacity
										style={[
											styles.actionButton,
											styles.actionPrimary,
											{ backgroundColor: categoryConfig.color },
										]}
										onPress={handlePress}
									>
										<Ionicons
											name="chatbubble-outline"
											size={14}
											color="#fff"
										/>
										<Text style={styles.actionTextPrimary}>Répondre</Text>
									</TouchableOpacity>
								</View>

								{/* Badge compteur */}
								{notifications.length > 0 && (
									<View
										style={[
											styles.badge,
											{ backgroundColor: categoryConfig.color },
										]}
									>
										<Text style={styles.badgeText}>
											+{notifications.length}
										</Text>
									</View>
								)}
							</View>
						</LinearGradient>
					</BlurView>
				</TouchableOpacity>
			</Animated.View>

			{/* 💬 Modal réponse serveur */}
			<ServerResponseModal
				visible={showResponseModal}
				clientMessage={selectedMessage}
				onClose={handleCloseModal}
				onResponseSent={handleResponseSent}
				restaurantId={restaurantId}
			/>
		</>
	);
};

const styles = StyleSheet.create({
	container: {
		position: "absolute",
		top: 60,
		left: 16,
		right: 16,
		zIndex: 9999,
	},
	glowContainer: {
		position: "absolute",
		top: -20,
		left: -20,
		right: -20,
		bottom: -20,
		borderRadius: 24,
		overflow: "hidden",
	},
	glow: {
		flex: 1,
		opacity: 0.3,
	},
	touchable: {
		borderRadius: 18,
		overflow: "hidden",
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 12 },
		shadowOpacity: 0.4,
		shadowRadius: 24,
		elevation: 16,
	},
	blur: {
		borderRadius: 18,
		overflow: "hidden",
		borderWidth: 1,
		borderColor: "rgba(255,255,255,0.1)",
	},
	gradientOverlay: {
		borderRadius: 18,
	},
	content: {
		padding: 18,
		gap: 14,
	},
	header: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
	},
	headerLeft: {
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
		flex: 1,
	},
	iconContainer: {
		width: 44,
		height: 44,
		borderRadius: 14,
		justifyContent: "center",
		alignItems: "center",
		borderWidth: 2,
		borderColor: "rgba(255,255,255,0.1)",
	},
	title: {
		fontSize: 15,
		fontWeight: "700",
		color: COLORS.text,
		marginBottom: 3,
		letterSpacing: 0.3,
	},
	subtitleRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
	},
	tableText: {
		fontSize: 12,
		fontWeight: "600",
		color: COLORS.accent,
	},
	separator: {
		fontSize: 10,
		color: COLORS.textMuted,
	},
	clientName: {
		fontSize: 12,
		color: COLORS.textMuted,
	},
	messageText: {
		fontSize: 14,
		color: COLORS.text,
		lineHeight: 20,
		opacity: 0.95,
	},
	closeButton: {
		padding: 6,
		borderRadius: 8,
		backgroundColor: "rgba(255,255,255,0.05)",
	},
	actions: {
		flexDirection: "row",
		gap: 10,
		marginTop: 4,
	},
	actionButton: {
		flex: 1,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 6,
		paddingVertical: 10,
		borderRadius: 10,
	},
	actionSecondary: {
		backgroundColor: "rgba(148, 163, 184, 0.15)",
		borderWidth: 1,
		borderColor: "rgba(148, 163, 184, 0.2)",
	},
	actionPrimary: {
		backgroundColor: COLORS.accent,
		shadowColor: "#667eea",
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.3,
		shadowRadius: 8,
		elevation: 4,
	},
	actionTextSecondary: {
		fontSize: 13,
		fontWeight: "600",
		color: COLORS.textMuted,
	},
	actionTextPrimary: {
		fontSize: 13,
		fontWeight: "700",
		color: "#fff",
		letterSpacing: 0.3,
	},
	badge: {
		position: "absolute",
		top: 14,
		right: 14,
		backgroundColor: "#ef4444",
		paddingHorizontal: 8,
		paddingVertical: 3,
		borderRadius: 12,
		borderWidth: 2,
		borderColor: "rgba(15, 23, 42, 0.95)",
	},
	badgeText: {
		fontSize: 11,
		fontWeight: "700",
		color: "#fff",
	},
});

export default ClientMessageNotification;

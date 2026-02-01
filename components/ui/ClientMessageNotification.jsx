/**
 * 🔔 ClientMessageNotification - Notification des messages clients pour les serveurs
 *
 * Affiche une notification en haut de l'écran quand un client envoie un message
 * Intégré via WebSocket pour des mises à jour en temps réel
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
} from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import useSocket from "../../hooks/useSocket";
import ServerResponseModal from "../modals/ServerResponseModal";
import useUserStore from "../../src/stores/useUserStore";

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

	// Animation de masquage
	const hideNotification = useCallback(() => {
		Animated.parallel([
			Animated.timing(translateY, {
				toValue: -150,
				duration: 300,
				useNativeDriver: true,
			}),
			Animated.timing(opacity, {
				toValue: 0,
				duration: 200,
				useNativeDriver: true,
			}),
		]).start(() => {
			setCurrentNotification(null);
		});
	}, [translateY, opacity]);

	// Animation d'affichage
	const showNotification = useCallback(() => {
		Animated.parallel([
			Animated.spring(translateY, {
				toValue: 0,
				friction: 8,
				tension: 80,
				useNativeDriver: true,
			}),
			Animated.timing(opacity, {
				toValue: 1,
				duration: 200,
				useNativeDriver: true,
			}),
		]).start();

		// Auto-hide après 5 secondes
		setTimeout(() => {
			hideNotification();
		}, 5000);
	}, [translateY, opacity, hideNotification]);

	// Écouter les messages WebSocket
	useEffect(() => {
		if (!socket || !isConnected) return;

		const handleClientMessage = (event) => {
			console.log("📨 Message client reçu:", event);

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
						transform: [{ translateY }],
						opacity,
					},
				]}
			>
				<TouchableOpacity
					activeOpacity={0.95}
					onPress={handlePress}
					style={styles.touchable}
				>
					<BlurView intensity={90} tint="dark" style={styles.blur}>
						<View style={styles.content}>
							{/* Icône catégorie */}
							<View
								style={[
									styles.iconContainer,
									{ backgroundColor: `${categoryConfig.color}20` },
								]}
							>
								<Ionicons
									name={currentNotification.icon || categoryConfig.icon}
									size={24}
									color={categoryConfig.color}
								/>
							</View>

							{/* Contenu */}
							<View style={styles.textContainer}>
								<View style={styles.headerRow}>
									<Text style={styles.tableText}>
										Table {currentNotification.tableNumber}
									</Text>
									<Text style={styles.clientName}>
										{currentNotification.clientName}
									</Text>
								</View>
								<Text style={styles.messageText} numberOfLines={2}>
									{currentNotification.text}
								</Text>
							</View>

							{/* Bouton fermer */}
							<TouchableOpacity
								onPress={handleDismiss}
								style={styles.closeButton}
								hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
							>
								<Ionicons name="close" size={20} color={COLORS.textMuted} />
							</TouchableOpacity>
						</View>

						{/* Badge de catégorie */}
						<View
							style={[
								styles.categoryBadge,
								{ backgroundColor: categoryConfig.color },
							]}
						>
							<Text style={styles.categoryText}>
								{currentNotification.category.toUpperCase()}
							</Text>
						</View>
					</BlurView>
				</TouchableOpacity>

				{/* Indicateur de notifications en attente */}
				{notifications.length > 0 && (
					<View style={styles.queueBadge}>
						<Text style={styles.queueText}>+{notifications.length}</Text>
					</View>
				)}
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
		top: 50,
		left: 16,
		right: 16,
		zIndex: 9999,
	},
	touchable: {
		borderRadius: 16,
		overflow: "hidden",
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.3,
		shadowRadius: 12,
		elevation: 8,
	},
	blur: {
		backgroundColor: COLORS.glass,
		borderRadius: 16,
		overflow: "hidden",
	},
	content: {
		flexDirection: "row",
		alignItems: "center",
		padding: 16,
		gap: 14,
	},
	iconContainer: {
		width: 48,
		height: 48,
		borderRadius: 12,
		justifyContent: "center",
		alignItems: "center",
	},
	textContainer: {
		flex: 1,
	},
	headerRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
		marginBottom: 4,
	},
	tableText: {
		fontSize: 14,
		fontWeight: "700",
		color: COLORS.accent,
	},
	clientName: {
		fontSize: 12,
		color: COLORS.textMuted,
	},
	messageText: {
		fontSize: 15,
		color: COLORS.text,
		lineHeight: 20,
	},
	closeButton: {
		padding: 4,
	},
	categoryBadge: {
		position: "absolute",
		top: 0,
		right: 16,
		paddingHorizontal: 10,
		paddingVertical: 4,
		borderBottomLeftRadius: 8,
		borderBottomRightRadius: 8,
	},
	categoryText: {
		fontSize: 9,
		fontWeight: "700",
		color: "#fff",
		letterSpacing: 0.5,
	},
	queueBadge: {
		position: "absolute",
		bottom: -8,
		right: 16,
		backgroundColor: "#ef4444",
		paddingHorizontal: 8,
		paddingVertical: 2,
		borderRadius: 10,
	},
	queueText: {
		fontSize: 11,
		fontWeight: "700",
		color: "#fff",
	},
});

export default ClientMessageNotification;

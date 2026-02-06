/**
 * 📨 ClientMessagesPanel - Chat compact pour messages clients
 *
 * Design inspiration : https://21st.dev/b3/ai-chat/default
 * Petit chat en bas à droite, style moderne et clair
 */

import React, { useState, useEffect } from "react";
import {
	View,
	Text,
	TouchableOpacity,
	FlatList,
	StyleSheet,
	Modal,
	ActivityIndicator,
	Vibration,
	Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import useSocket from "../../hooks/useSocket";
import useUserStore from "../../src/stores/useUserStore";

const COLORS = {
	primary: "#6366f1",
	accent: "#f59e0b",
	success: "#10b981",
	background: "#ffffff",
	surface: "#f9fafb",
	card: "#ffffff",
	text: "#111827",
	textMuted: "#6b7280",
	border: "#e5e7eb",
	shadow: "rgba(0, 0, 0, 0.1)",
};

const CATEGORY_CONFIG = {
	service: { color: "#667eea", icon: "restaurant-outline", label: "Service" },
	commande: { color: "#f59e0b", icon: "receipt-outline", label: "Commande" },
	paiement: { color: "#22c55e", icon: "card-outline", label: "Paiement" },
	autre: {
		color: "#8b5cf6",
		icon: "ellipsis-horizontal-outline",
		label: "Autre",
	},
};

export default function ClientMessagesPanel({ visible, onClose, onOpen }) {
	const [messages, setMessages] = useState([]);
	const [loading, setLoading] = useState(false);
	const { socket, isConnected } = useSocket();
	const { restaurantId, token } = useUserStore();

	// Charger les messages au montage et quand le panel s'ouvre
	const loadMessages = async () => {
		setLoading(true);
		try {
			const url = `${process.env.EXPO_PUBLIC_API_URL}/client-messages/restaurant/${restaurantId}?status=sent`;

			const response = await fetch(url, {
				headers: {
					Authorization: `Bearer ${token}`,
					"Content-Type": "application/json",
				},
			});

			if (response.ok) {
				const data = await response.json();
				setMessages(data.messages || []);
			} else {
				console.error("❌ Erreur chargement messages:", response.status);
			}
		} catch (error) {
			console.error("❌ Erreur chargement messages:", error);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		if (visible && restaurantId) {
			loadMessages();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [visible, restaurantId]);

	// Écouter les nouveaux messages WebSocket
	useEffect(() => {
		if (!socket || !isConnected) return;

		const handleNewMessage = (event) => {
			console.log("🔔 [FRONTEND DEBUG] Événement client-message reçu:", event);
			if (event.type === "new-message") {
				console.log("📨 [Panel] Nouveau message reçu:", event.data);

				const newMessage = {
					_id: event.data.messageId,
					messageText: event.data.messageText,
					category: event.data.category || "service",
					icon: event.data.icon,
					tableId: { number: event.data.tableNumber },
					clientName: event.data.clientName,
					reservationId: event.data.reservationId,
					status: "sent",
					createdAt: event.timestamp,
				};

				setMessages((prev) => [newMessage, ...prev]);

				// Vibration uniquement
				if (Platform.OS !== "web") {
					Vibration.vibrate([0, 100, 50, 100]);
				}
			}
		};

		socket.on("client-message", handleNewMessage);
		return () => socket.off("client-message", handleNewMessage);
	}, [socket, isConnected, visible, onOpen]);

	// Marquer un message comme validé (lu)
	const validateMessage = async (messageId) => {
		try {
			const url = `${process.env.EXPO_PUBLIC_API_URL}/client-messages/${messageId}/read`;

			const response = await fetch(url, {
				method: "PUT",
				headers: {
					Authorization: `Bearer ${token}`,
					"Content-Type": "application/json",
				},
			});

			if (response.ok) {
				// Retirer le message de la liste
				setMessages((prev) => prev.filter((m) => m._id !== messageId));

				// Feedback visuel
				if (Platform.OS !== "web") {
					Vibration.vibrate(50);
				}
			} else {
				console.error("❌ Impossible de valider le message");
			}
		} catch (error) {
			console.error("❌ Erreur validation message:", error);
		}
	};

	// Render d'un message
	const renderMessage = ({ item }) => {
		const categoryConfig =
			CATEGORY_CONFIG[item.category] || CATEGORY_CONFIG.autre;
		const elapsedTime = getElapsedTime(item.createdAt);

		return (
			<View style={styles.messageCard}>
				{/* En-tête compact */}
				<View style={styles.messageHeader}>
					<Ionicons
						name={categoryConfig.icon}
						size={16}
						color={categoryConfig.color}
						style={styles.messageIcon}
					/>
					<View style={styles.messageInfo}>
						<Text style={styles.tableText}>
							Table {item.tableId?.number || "?"} • {item.clientName}
						</Text>
						<Text style={styles.timeText}>{elapsedTime}</Text>
					</View>
				</View>

				{/* Message */}
				<Text style={styles.messageText}>{item.messageText}</Text>

				{/* Bouton valider compact */}
				<TouchableOpacity
					style={styles.validateButton}
					onPress={() => validateMessage(item._id)}
				>
					<Ionicons name="checkmark" size={14} color={COLORS.success} />
					<Text style={styles.validateText}>Valider</Text>
				</TouchableOpacity>
			</View>
		);
	};

	// Calculer le temps écoulé
	const getElapsedTime = (timestamp) => {
		const now = new Date();
		const created = new Date(timestamp);
		const diffMs = now - created;
		const diffMins = Math.floor(diffMs / 60000);

		if (diffMins < 1) return "À l'instant";
		if (diffMins < 60) return `Il y a ${diffMins} min`;
		const diffHours = Math.floor(diffMins / 60);
		if (diffHours < 24) return `Il y a ${diffHours}h`;
		return `Il y a ${Math.floor(diffHours / 24)}j`;
	};

	return (
		<Modal
			visible={visible}
			animationType="fade"
			transparent={true}
			onRequestClose={onClose}
		>
			<TouchableOpacity
				style={styles.overlay}
				activeOpacity={1}
				onPress={onClose}
			>
				<TouchableOpacity
					activeOpacity={1}
					style={styles.chatContainer}
					onPress={(e) => e.stopPropagation()}
				>
					{/* Header compact */}
					<View style={styles.header}>
						<View style={styles.headerLeft}>
							<Ionicons name="chatbubbles" size={20} color={COLORS.primary} />
							<Text style={styles.headerTitle}>
								Messages ({messages.length})
							</Text>
						</View>
						<TouchableOpacity onPress={onClose} style={styles.closeButton}>
							<Ionicons name="close" size={20} color={COLORS.textMuted} />
						</TouchableOpacity>
					</View>

					{/* Liste des messages */}
					{loading ? (
						<View style={styles.loadingContainer}>
							<ActivityIndicator size="small" color={COLORS.primary} />
						</View>
					) : messages.length === 0 ? (
						<View style={styles.emptyContainer}>
							<Ionicons
								name="checkmark-done-circle"
								size={32}
								color={COLORS.textMuted}
							/>
							<Text style={styles.emptyText}>Aucun message</Text>
						</View>
					) : (
						<FlatList
							data={messages}
							renderItem={renderMessage}
							keyExtractor={(item) => item._id}
							contentContainerStyle={styles.listContent}
							showsVerticalScrollIndicator={false}
						/>
					)}
				</TouchableOpacity>
			</TouchableOpacity>
		</Modal>
	);
}

const styles = StyleSheet.create({
	overlay: {
		flex: 1,
		backgroundColor: "rgba(0, 0, 0, 0.3)",
		justifyContent: "flex-end",
		alignItems: "flex-end",
		padding: 20,
	},
	chatContainer: {
		width: 380,
		maxHeight: 500,
		backgroundColor: COLORS.background,
		borderRadius: 16,
		shadowColor: COLORS.shadow,
		shadowOffset: { width: 0, height: 8 },
		shadowOpacity: 0.25,
		shadowRadius: 24,
		elevation: 20,
		overflow: "hidden",
	},
	header: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		padding: 16,
		borderBottomWidth: 1,
		borderBottomColor: COLORS.border,
		backgroundColor: COLORS.surface,
	},
	headerLeft: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
	},
	headerTitle: {
		fontSize: 15,
		fontWeight: "600",
		color: COLORS.text,
	},
	closeButton: {
		padding: 4,
	},
	loadingContainer: {
		padding: 40,
		alignItems: "center",
	},
	emptyContainer: {
		padding: 40,
		alignItems: "center",
		gap: 8,
	},
	emptyText: {
		fontSize: 13,
		color: COLORS.textMuted,
	},
	listContent: {
		padding: 12,
		gap: 8,
	},
	messageCard: {
		backgroundColor: COLORS.card,
		borderRadius: 12,
		padding: 12,
		borderWidth: 1,
		borderColor: COLORS.border,
		gap: 8,
	},
	messageHeader: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
	},
	messageIcon: {
		marginTop: 2,
	},
	messageInfo: {
		flex: 1,
	},
	tableText: {
		fontSize: 13,
		fontWeight: "600",
		color: COLORS.text,
		marginBottom: 2,
	},
	timeText: {
		fontSize: 11,
		color: COLORS.textMuted,
	},
	messageText: {
		fontSize: 14,
		color: COLORS.text,
		lineHeight: 20,
	},
	validateButton: {
		flexDirection: "row",
		alignItems: "center",
		alignSelf: "flex-start",
		gap: 4,
		paddingVertical: 6,
		paddingHorizontal: 12,
		backgroundColor: `${COLORS.success}15`,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: `${COLORS.success}30`,
	},
	validateText: {
		fontSize: 12,
		fontWeight: "600",
		color: COLORS.success,
	},
});

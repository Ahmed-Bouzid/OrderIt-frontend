/**
 * 📨 MessageCard - Card pour afficher un message interne
 */
import React, { useMemo, useState } from "react";
import { View, Text, TouchableOpacity, Alert, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
	useSharedValue,
	useAnimatedStyle,
	withSpring,
	withTiming,
} from "react-native-reanimated";
import { useTheme } from "../../hooks/useTheme";

const MessageCard = ({
	message,
	onAccept,
	onReject,
	onDelete,
	onMarkRead,
	compact = false,
	animationDelay = 0,
}) => {
	const THEME = useTheme();
	const [isExpanded, setIsExpanded] = useState(false);

	// Animations
	const scale = useSharedValue(0.9);
	const opacity = useSharedValue(0);

	const animatedStyle = useAnimatedStyle(() => ({
		transform: [{ scale: scale.value }],
		opacity: opacity.value,
	}));

	React.useEffect(() => {
		scale.value = withSpring(1, {
			damping: 15,
			stiffness: 100,
			delay: animationDelay,
		});
		opacity.value = withTiming(1, {
			duration: 500,
			delay: animationDelay,
		});
	}, [animationDelay, scale, opacity]);

	// Données calculées
	const typeConfig = useMemo(() => {
		const config = {
			meeting: {
				icon: "calendar-outline",
				color: "#3B82F6",
				bgColor: "#EFF6FF",
				label: "Réunion",
			},
			planning: {
				icon: "time-outline",
				color: "#8B5CF6",
				bgColor: "#F5F3FF",
				label: "Planning",
			},
			zonning: {
				icon: "location-outline",
				color: "#EC4899",
				bgColor: "#FDF2F8",
				label: "Zonning",
			},
			coaching: {
				icon: "school-outline",
				color: "#F59E0B",
				bgColor: "#FFFBEB",
				label: "Coaching",
			},
		};

		return config[message.type] || config.coaching;
	}, [message.type]);

	const priorityConfig = useMemo(() => {
		return message.priority === "urgent"
			? { color: "#EF4444", label: "Urgent", icon: "alert-circle" }
			: { color: "#6B7280", label: "Normal", icon: "info-circle" };
	}, [message.priority]);

	const statusConfig = useMemo(() => {
		if (message.status === "pending") {
			return { icon: "time", color: "#F59E0B", label: "En attente" };
		} else if (message.status === "accepted") {
			return { icon: "checkmark-circle", color: "#10B981", label: "Accepté" };
		} else if (message.status === "rejected") {
			return { icon: "close-circle", color: "#EF4444", label: "Refusé" };
		}
		return { icon: "trash", color: "#6B7280", label: "Supprimé" };
	}, [message.status]);

	const handleAccept = () => {
		Alert.alert("Accepter", `Acceptez-vous: "${message.title}" ?`, [
			{ text: "Annuler", style: "cancel" },
			{
				text: "Accepter",
				onPress: () => onAccept?.(message._id),
			},
		]);
	};

	const handleReject = () => {
		Alert.alert("Refuser", `Refusez-vous: "${message.title}" ?`, [
			{ text: "Annuler", style: "cancel" },
			{
				text: "Refuser",
				onPress: () => onReject?.(message._id),
			},
		]);
	};

	const handleDelete = () => {
		Alert.alert("Supprimer", `Supprimer: "${message.title}" ?`, [
			{ text: "Annuler", style: "cancel" },
			{
				text: "Supprimer",
				onPress: () => onDelete?.(message._id),
				style: "destructive",
			},
		]);
	};

	// Marquer comme lu si non lu
	React.useEffect(() => {
		if (!message.isRead && onMarkRead) {
			onMarkRead(message._id);
		}
	}, [message._id, message.isRead, onMarkRead]);

	// Rendu compact (liste)
	if (compact) {
		return (
			<Animated.View style={[animatedStyle]}>
				<TouchableOpacity
					activeOpacity={0.7}
					onPress={() => setIsExpanded(!isExpanded)}
					style={[
						styles.compactContainer,
						{
							backgroundColor: typeConfig.bgColor,
							borderLeftColor: typeConfig.color,
						},
					]}
				>
					<View style={styles.compactContent}>
						<View
							style={[styles.typeIcon, { backgroundColor: typeConfig.color }]}
						>
							<Ionicons name={typeConfig.icon} size={16} color="#FFFFFF" />
						</View>
						<View style={styles.compactInfo}>
							<Text style={styles.compactTitle}>{message.title}</Text>
							<Text style={styles.compactType}>
								{typeConfig.label}
								{message.priority === "urgent" && " • 🔴 URGENT"}
							</Text>
						</View>
						<View
							style={[
								styles.statusBadge,
								{ backgroundColor: statusConfig.color },
							]}
						>
							<Ionicons name={statusConfig.icon} size={12} color="#FFFFFF" />
						</View>
					</View>
				</TouchableOpacity>

				{isExpanded && (
					<View
						style={[
							styles.expandedContent,
							{
								backgroundColor: THEME.colors.background.elevated,
								borderTopColor: typeConfig.color,
							},
						]}
					>
						<Text
							style={[styles.description, { color: THEME.colors.text.primary }]}
						>
							{message.description}
						</Text>

						{message.status === "pending" && (
							<View style={styles.actionButtons}>
								<TouchableOpacity
									style={[
										styles.button,
										styles.acceptButton,
										{ backgroundColor: "#10B981" },
									]}
									onPress={handleAccept}
								>
									<Ionicons name="checkmark" size={18} color="#FFFFFF" />
									<Text style={styles.buttonText}>Accepter</Text>
								</TouchableOpacity>

								<TouchableOpacity
									style={[
										styles.button,
										styles.rejectButton,
										{ backgroundColor: "#EF4444" },
									]}
									onPress={handleReject}
								>
									<Ionicons name="close" size={18} color="#FFFFFF" />
									<Text style={styles.buttonText}>Refuser</Text>
								</TouchableOpacity>
							</View>
						)}

						{message.response && (
							<View style={styles.responseInfo}>
								<Text style={styles.responseLabel}>Votre réponse:</Text>
								<Text
									style={[
										styles.responseStatus,
										{
											color:
												message.response.status === "accepted"
													? "#10B981"
													: "#EF4444",
										},
									]}
								>
									{message.response.status === "accepted"
										? "✅ Accepté"
										: "❌ Refusé"}
								</Text>
								{message.response.notes && (
									<Text style={styles.responseNotes}>
										Notes: {message.response.notes}
									</Text>
								)}
							</View>
						)}

						<TouchableOpacity
							onPress={handleDelete}
							style={styles.deleteButton}
						>
							<Ionicons name="trash-outline" size={16} color="#EF4444" />
							<Text style={styles.deleteText}>Supprimer</Text>
						</TouchableOpacity>
					</View>
				)}
			</Animated.View>
		);
	}

	// Rendu full (detail)
	return (
		<Animated.View style={[styles.fullContainer, animatedStyle]}>
			<LinearGradient
				colors={[typeConfig.bgColor, "#FFFFFF"]}
				style={styles.gradient}
			>
				{/* Header */}
				<View style={styles.header}>
					<View style={styles.typeSection}>
						<View
							style={[
								styles.typeIconLarge,
								{ backgroundColor: typeConfig.color },
							]}
						>
							<Ionicons name={typeConfig.icon} size={24} color="#FFFFFF" />
						</View>
						<View style={{ flex: 1 }}>
							<Text style={styles.title}>{message.title}</Text>
							<Text style={styles.type}>{typeConfig.label}</Text>
						</View>
						<View
							style={[
								styles.priorityBadge,
								{ backgroundColor: priorityConfig.color },
							]}
						>
							<Ionicons name={priorityConfig.icon} size={14} color="#FFFFFF" />
							<Text style={styles.priorityText}>{priorityConfig.label}</Text>
						</View>
					</View>

					{/* Status */}
					<View
						style={[styles.statusBar, { backgroundColor: statusConfig.color }]}
					>
						<Ionicons name={statusConfig.icon} size={16} color="#FFFFFF" />
						<Text style={styles.statusText}>{statusConfig.label}</Text>
					</View>
				</View>

				{/* Content */}
				<View style={styles.content}>
					<Text
						style={[styles.description, { color: THEME.colors.text.primary }]}
					>
						{message.description}
					</Text>

					{message.coachingItem && message.coachingItem !== "general" && (
						<View style={styles.infoRow}>
							<Ionicons
								name="bulb-outline"
								size={16}
								color={typeConfig.color}
							/>
							<Text style={styles.infoText}>
								Item: {message.coachingItem.replace(/_/g, " ").toUpperCase()}
							</Text>
						</View>
					)}

					{message.createdAt && (
						<View style={styles.infoRow}>
							<Ionicons name="time-outline" size={16} color="#6B7280" />
							<Text style={styles.infoText}>
								{new Date(message.createdAt).toLocaleDateString("fr-FR", {
									day: "2-digit",
									month: "2-digit",
									year: "2-digit",
									hour: "2-digit",
									minute: "2-digit",
								})}
							</Text>
						</View>
					)}
				</View>

				{/* Actions */}
				{message.status === "pending" && (
					<View style={styles.actions}>
						<TouchableOpacity
							style={[styles.actionButton, styles.acceptButtonFull]}
							onPress={handleAccept}
						>
							<Ionicons name="checkmark-circle" size={20} color="#10B981" />
							<Text style={styles.acceptButtonText}>Accepter</Text>
						</TouchableOpacity>

						<TouchableOpacity
							style={[styles.actionButton, styles.rejectButtonFull]}
							onPress={handleReject}
						>
							<Ionicons name="close-circle" size={20} color="#EF4444" />
							<Text style={styles.rejectButtonText}>Refuser</Text>
						</TouchableOpacity>
					</View>
				)}

				{message.response && (
					<View style={styles.responseContainer}>
						<Text style={styles.responseLabel}>Votre réponse:</Text>
						<Text
							style={[
								styles.responseStatusFull,
								{
									color:
										message.response.status === "accepted"
											? "#10B981"
											: "#EF4444",
								},
							]}
						>
							{message.response.status === "accepted"
								? "✅ Accepté le"
								: "❌ Refusé le"}{" "}
							{new Date(message.response.respondedAt).toLocaleDateString(
								"fr-FR",
							)}
						</Text>
						{message.response.notes && (
							<Text style={styles.responseNotesFull}>
								&quot;{message.response.notes}&quot;
							</Text>
						)}
					</View>
				)}

				{/* Delete button */}
				<TouchableOpacity
					onPress={handleDelete}
					style={styles.deleteButtonFull}
				>
					<Ionicons name="trash-outline" size={18} color="#EF4444" />
					<Text style={styles.deleteTextFull}>Supprimer</Text>
				</TouchableOpacity>
			</LinearGradient>
		</Animated.View>
	);
};

const styles = StyleSheet.create({
	// Compact
	compactContainer: {
		marginHorizontal: 16,
		marginVertical: 8,
		borderRadius: 12,
		borderLeftWidth: 4,
		overflow: "hidden",
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.08,
		shadowRadius: 4,
		elevation: 2,
	},
	compactContent: {
		flexDirection: "row",
		alignItems: "center",
		padding: 12,
	},
	typeIcon: {
		width: 32,
		height: 32,
		borderRadius: 8,
		alignItems: "center",
		justifyContent: "center",
		marginRight: 12,
	},
	compactInfo: {
		flex: 1,
	},
	compactTitle: {
		fontSize: 14,
		fontWeight: "600",
		color: "#1F2937",
		marginBottom: 2,
	},
	compactType: {
		fontSize: 12,
		color: "#6B7280",
	},
	statusBadge: {
		width: 24,
		height: 24,
		borderRadius: 12,
		alignItems: "center",
		justifyContent: "center",
	},
	expandedContent: {
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderTopWidth: 1,
		borderTopColor: "rgba(0,0,0,0.1)",
	},
	actionButtons: {
		flexDirection: "row",
		marginVertical: 12,
		gap: 8,
	},
	button: {
		flex: 1,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: 10,
		borderRadius: 8,
		gap: 6,
	},
	acceptButton: {
		backgroundColor: "#10B981",
	},
	rejectButton: {
		backgroundColor: "#EF4444",
	},
	buttonText: {
		color: "#FFFFFF",
		fontSize: 12,
		fontWeight: "600",
	},
	responseInfo: {
		marginVertical: 12,
		paddingHorizontal: 12,
		paddingVertical: 8,
		backgroundColor: "rgba(0,0,0,0.05)",
		borderRadius: 8,
	},
	responseLabel: {
		fontSize: 12,
		fontWeight: "600",
		color: "#6B7280",
		marginBottom: 4,
	},
	responseStatus: {
		fontSize: 13,
		fontWeight: "600",
		marginBottom: 4,
	},
	responseNotes: {
		fontSize: 12,
		color: "#6B7280",
		fontStyle: "italic",
	},
	deleteButton: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: 10,
		gap: 6,
		marginTop: 8,
	},
	deleteText: {
		color: "#EF4444",
		fontSize: 12,
		fontWeight: "600",
	},

	// Full
	fullContainer: {
		marginHorizontal: 16,
		marginVertical: 12,
		borderRadius: 16,
		overflow: "hidden",
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.15,
		shadowRadius: 12,
		elevation: 4,
	},
	gradient: {
		padding: 16,
	},
	header: {
		marginBottom: 16,
	},
	typeSection: {
		flexDirection: "row",
		alignItems: "center",
		marginBottom: 12,
	},
	typeIconLarge: {
		width: 44,
		height: 44,
		borderRadius: 12,
		alignItems: "center",
		justifyContent: "center",
		marginRight: 12,
	},
	title: {
		fontSize: 18,
		fontWeight: "bold",
		color: "#1F2937",
		marginBottom: 2,
	},
	type: {
		fontSize: 12,
		color: "#6B7280",
		fontWeight: "500",
	},
	priorityBadge: {
		flexDirection: "row",
		alignItems: "center",
		paddingVertical: 6,
		paddingHorizontal: 10,
		borderRadius: 8,
		gap: 4,
	},
	priorityText: {
		fontSize: 11,
		fontWeight: "600",
		color: "#FFFFFF",
	},
	statusBar: {
		flexDirection: "row",
		alignItems: "center",
		paddingVertical: 8,
		paddingHorizontal: 12,
		borderRadius: 8,
		gap: 6,
	},
	statusText: {
		fontSize: 13,
		fontWeight: "600",
		color: "#FFFFFF",
	},
	content: {
		marginBottom: 16,
	},
	description: {
		fontSize: 14,
		lineHeight: 21,
		marginBottom: 12,
	},
	infoRow: {
		flexDirection: "row",
		alignItems: "center",
		marginBottom: 8,
		gap: 8,
	},
	infoText: {
		fontSize: 12,
		color: "#6B7280",
	},
	actions: {
		flexDirection: "row",
		gap: 12,
		marginBottom: 16,
	},
	actionButton: {
		flex: 1,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: 12,
		borderRadius: 12,
		gap: 8,
	},
	acceptButtonFull: {
		backgroundColor: "rgba(16, 185, 129, 0.1)",
	},
	acceptButtonText: {
		color: "#10B981",
		fontSize: 13,
		fontWeight: "600",
	},
	rejectButtonFull: {
		backgroundColor: "rgba(239, 68, 68, 0.1)",
	},
	rejectButtonText: {
		color: "#EF4444",
		fontSize: 13,
		fontWeight: "600",
	},
	responseContainer: {
		paddingVertical: 12,
		paddingHorizontal: 12,
		backgroundColor: "rgba(0,0,0,0.05)",
		borderRadius: 12,
		marginBottom: 16,
	},
	responseStatusFull: {
		fontSize: 13,
		fontWeight: "600",
		marginBottom: 4,
	},
	responseNotesFull: {
		fontSize: 12,
		color: "#6B7280",
		fontStyle: "italic",
		marginTop: 4,
	},
	deleteButtonFull: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: 12,
		gap: 8,
		borderTopWidth: 1,
		borderTopColor: "rgba(0,0,0,0.1)",
	},
	deleteTextFull: {
		color: "#EF4444",
		fontSize: 13,
		fontWeight: "600",
	},
});

export default MessageCard;

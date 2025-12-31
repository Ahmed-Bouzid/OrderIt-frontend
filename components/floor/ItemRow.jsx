/**
 * ItemRow.jsx - Ligne d'item avec timer, statut et actions
 */
import React, { useState, useEffect, useMemo, useRef } from "react";
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import TimerComponent from "./TimerComponent";

const STATUS_CONFIG = {
	confirmed: {
		label: "À préparer",
		color: "#FBBF24",
		bgColor: "rgba(251, 191, 36, 0.15)",
		icon: "time-outline",
		nextStatus: "preparing",
		nextLabel: "Démarrer",
	},
	preparing: {
		label: "En préparation",
		color: "#0EA5E9",
		bgColor: "rgba(14, 165, 233, 0.15)",
		icon: "flame-outline",
		nextStatus: "served",
		nextLabel: "Servir",
	},
	ready: {
		label: "Prêt",
		color: "#10B981",
		bgColor: "rgba(16, 185, 129, 0.15)",
		icon: "checkmark-circle-outline",
		nextStatus: "served",
		nextLabel: "Servir",
	},
	served: {
		label: "Paré",
		color: "#64748B",
		bgColor: "rgba(100, 116, 139, 0.15)",
		icon: "checkmark-done-outline",
		nextStatus: null,
		nextLabel: null,
	},
	cancelled: {
		label: "Annulé",
		color: "#EF4444",
		bgColor: "rgba(239, 68, 68, 0.15)",
		icon: "close-circle-outline",
		nextStatus: null,
		nextLabel: null,
	},
};

const ItemRow = React.memo(({ item, onUpdateStatus, THEME }) => {
	const [isUpdating, setIsUpdating] = useState(false);
	const scaleAnim = useRef(new Animated.Value(1)).current;
	const fadeAnim = useRef(new Animated.Value(1)).current;

	const statusConfig =
		STATUS_CONFIG[item.itemStatus] || STATUS_CONFIG.confirmed;
	const isCompleted =
		item.itemStatus === "served" || item.itemStatus === "cancelled";

	// Animation au changement de statut
	useEffect(() => {
		Animated.sequence([
			Animated.parallel([
				Animated.timing(scaleAnim, {
					toValue: 1.02,
					duration: 150,
					useNativeDriver: true,
				}),
				Animated.timing(fadeAnim, {
					toValue: 0.8,
					duration: 150,
					useNativeDriver: true,
				}),
			]),
			Animated.parallel([
				Animated.spring(scaleAnim, {
					toValue: 1,
					friction: 5,
					useNativeDriver: true,
				}),
				Animated.timing(fadeAnim, {
					toValue: 1,
					duration: 150,
					useNativeDriver: true,
				}),
			]),
		]).start();
	}, [item.itemStatus]);

	const handleStatusChange = async () => {
		if (!statusConfig.nextStatus || isUpdating) return;

		setIsUpdating(true);
		try {
			await onUpdateStatus(item.orderId, item._id, statusConfig.nextStatus);
		} finally {
			setIsUpdating(false);
		}
	};

	const styles = useMemo(
		() => createStyles(THEME, statusConfig, isCompleted),
		[THEME, statusConfig, isCompleted]
	);

	return (
		<Animated.View
			style={[
				styles.container,
				{
					transform: [{ scale: scaleAnim }],
					opacity: fadeAnim,
				},
			]}
		>
			{/* Left: Info */}
			<View style={styles.leftSection}>
				{/* Status Badge */}
				<View style={styles.statusBadge}>
					<Ionicons
						name={statusConfig.icon}
						size={16}
						color={statusConfig.color}
					/>
					<Text style={styles.statusText}>{statusConfig.label}</Text>
				</View>

				{/* Item Name */}
				<Text
					style={[styles.itemName, isCompleted && styles.itemNameCompleted]}
					numberOfLines={2}
				>
					{item.name}
				</Text>

				{/* Metadata */}
				<View style={styles.metadata}>
					<View style={styles.metaItem}>
						<Ionicons
							name="grid-outline"
							size={12}
							color={THEME.colors.text.muted}
						/>
						<Text style={styles.metaText}>Table {item.tableNumber}</Text>
					</View>
					<View style={styles.metaItem}>
						<Ionicons
							name="person-outline"
							size={12}
							color={THEME.colors.text.muted}
						/>
						<Text style={styles.metaText}>{item.serverName}</Text>
					</View>
					<View style={styles.metaItem}>
						<Ionicons
							name="copy-outline"
							size={12}
							color={THEME.colors.text.muted}
						/>
						<Text style={styles.metaText}>×{item.quantity}</Text>
					</View>
				</View>
			</View>

			{/* Right: Timer & Action */}
			<View style={styles.rightSection}>
				{/* Timer - Affiche temps depuis lancement de la commande */}
				{(item.itemStatus === "confirmed" ||
					item.itemStatus === "preparing") && (
					<TimerComponent
						startTime={item.itemStartTime}
						endTime={null}
						THEME={THEME}
					/>
				)}
				{item.itemStatus === "served" && item.endTime && (
					<TimerComponent
						startTime={item.itemStartTime}
						endTime={item.endTime}
						isCompleted
						THEME={THEME}
					/>
				)}

				{/* Action Button */}
				{statusConfig.nextStatus && !isCompleted && (
					<TouchableOpacity
						style={styles.actionButton}
						onPress={handleStatusChange}
						disabled={isUpdating}
					>
						<Ionicons
							name={isUpdating ? "hourglass-outline" : "arrow-forward"}
							size={18}
							color="#FFF"
						/>
						<Text style={styles.actionButtonText}>
							{statusConfig.nextLabel}
						</Text>
					</TouchableOpacity>
				)}

				{isCompleted && (
					<View style={styles.completedBadge}>
						<Ionicons
							name={item.itemStatus === "served" ? "checkmark" : "close"}
							size={20}
							color={statusConfig.color}
						/>
					</View>
				)}
			</View>
		</Animated.View>
	);
});

ItemRow.displayName = "ItemRow";

const createStyles = (THEME, statusConfig, isCompleted) =>
	StyleSheet.create({
		container: {
			flexDirection: "row",
			backgroundColor: THEME.colors.background.card,
			borderRadius: THEME.radius.lg,
			padding: THEME.spacing.lg,
			borderWidth: 1,
			borderColor: THEME.colors.border.default,
			borderLeftWidth: 4,
			borderLeftColor: statusConfig.color,
			gap: THEME.spacing.md,
			opacity: isCompleted ? 0.7 : 1,
		},
		leftSection: {
			flex: 1,
			gap: THEME.spacing.sm,
		},
		statusBadge: {
			flexDirection: "row",
			alignItems: "center",
			gap: THEME.spacing.xs,
			backgroundColor: statusConfig.bgColor,
			paddingHorizontal: THEME.spacing.sm,
			paddingVertical: THEME.spacing.xs,
			borderRadius: THEME.radius.md,
			alignSelf: "flex-start",
		},
		statusText: {
			fontSize: 12,
			fontWeight: "600",
			color: statusConfig.color,
		},
		itemName: {
			fontSize: 16,
			fontWeight: "600",
			color: THEME.colors.text.primary,
		},
		itemNameCompleted: {
			textDecorationLine: "line-through",
			color: THEME.colors.text.muted,
		},
		metadata: {
			flexDirection: "row",
			gap: THEME.spacing.md,
		},
		metaItem: {
			flexDirection: "row",
			alignItems: "center",
			gap: THEME.spacing.xs,
		},
		metaText: {
			fontSize: 12,
			color: THEME.colors.text.muted,
		},
		rightSection: {
			alignItems: "flex-end",
			justifyContent: "space-between",
			gap: THEME.spacing.md,
		},
		actionButton: {
			flexDirection: "row",
			alignItems: "center",
			gap: THEME.spacing.xs,
			backgroundColor: THEME.colors.primary.amber,
			paddingHorizontal: THEME.spacing.md,
			paddingVertical: THEME.spacing.sm,
			borderRadius: THEME.radius.md,
		},
		actionButtonText: {
			fontSize: 13,
			fontWeight: "600",
			color: "#FFF",
		},
		completedBadge: {
			width: 40,
			height: 40,
			borderRadius: 20,
			backgroundColor: statusConfig.bgColor,
			alignItems: "center",
			justifyContent: "center",
		},
	});

export default ItemRow;

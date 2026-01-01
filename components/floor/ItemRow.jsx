/**
 * ItemRow.jsx - Ligne d'item simplifiée avec long press
 */
import React, { useState, useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import TimerComponent from "./TimerComponent";

// Status simplifiés : envoyé → servi → annulé
const STATUS_CONFIG = {
	confirmed: {
		label: "Envoyé",
		color: "#FBBF24",
		bgColor: "rgba(251, 191, 36, 0.15)",
		icon: "time-outline",
	},
	preparing: {
		label: "Envoyé",
		color: "#0EA5E9",
		bgColor: "rgba(14, 165, 233, 0.15)",
		icon: "flame-outline",
	},
	ready: {
		label: "Prêt",
		color: "#10B981",
		bgColor: "rgba(16, 185, 129, 0.15)",
		icon: "checkmark-circle-outline",
	},
	served: {
		label: "Servi",
		color: "#64748B",
		bgColor: "rgba(100, 116, 139, 0.15)",
		icon: "checkmark-done-outline",
	},
	cancelled: {
		label: "Annulé",
		color: "#EF4444",
		bgColor: "rgba(239, 68, 68, 0.15)",
		icon: "close-circle-outline",
	},
};

const ItemRow = React.memo(({ item, onUpdateStatus, THEME }) => {
	const [isUpdating, setIsUpdating] = useState(false);

	const statusConfig =
		STATUS_CONFIG[item.itemStatus] || STATUS_CONFIG.confirmed;
	const isCompleted =
		item.itemStatus === "served" || item.itemStatus === "cancelled";

	// Menu long press
	const handleLongPress = () => {
		if (isCompleted) return;

		const actions = [
			{
				text: "Marquer comme Servi",
				onPress: () => handleStatusChange("served"),
			},
			{
				text: "Annuler",
				onPress: () => handleStatusChange("cancelled"),
				style: "destructive",
			},
			{ text: "Fermer", style: "cancel" },
		];

		Alert.alert("Actions", `${item.name} - Table ${item.tableNumber}`, actions);
	};

	const handleStatusChange = async (newStatus) => {
		if (isUpdating) return;

		setIsUpdating(true);
		try {
			await onUpdateStatus(item.orderId, item._id, newStatus);
		} finally {
			setIsUpdating(false);
		}
	};

	const styles = useMemo(
		() => createStyles(THEME, statusConfig, isCompleted),
		[THEME, statusConfig, isCompleted]
	);

	return (
		<TouchableOpacity
			style={styles.container}
			onLongPress={handleLongPress}
			disabled={isCompleted}
			activeOpacity={0.7}
		>
			{/* Ligne 1: Plat + Status */}
			<View style={styles.row}>
				<Text
					style={[styles.itemName, isCompleted && styles.itemNameCompleted]}
					numberOfLines={1}
				>
					{item.name}
					{item.quantity > 1 && (
						<Text style={styles.quantity}> x{item.quantity}</Text>
					)}
				</Text>
				<View style={styles.statusBadge}>
					<Ionicons
						name={statusConfig.icon}
						size={14}
						color={statusConfig.color}
					/>
					<Text style={styles.statusText}>{statusConfig.label}</Text>
				</View>
			</View>

			{/* Ligne 2: Table + Serveur + Timer */}
			<View style={styles.row}>
				<View style={styles.metaRow}>
					{/* Table */}
					<View style={styles.metaItem}>
						<Ionicons
							name="grid-outline"
							size={12}
							color={THEME.colors.text.muted}
						/>
						<Text style={styles.metaText}>T{item.tableNumber}</Text>
					</View>

					{/* Serveur */}
					<View style={styles.metaItem}>
						<Ionicons
							name="person-outline"
							size={12}
							color={THEME.colors.text.muted}
						/>
						<Text style={styles.metaText} numberOfLines={1}>
							{item.serverName}
						</Text>
					</View>
				</View>

				{/* Timer */}
				{item.startTime && !isCompleted && (
					<TimerComponent startTime={item.startTime} isCompact THEME={THEME} />
				)}

				{/* Validé */}
				{isCompleted && (
					<View style={styles.completedBadge}>
						<Ionicons name="checkmark" size={14} color={statusConfig.color} />
					</View>
				)}
			</View>
		</TouchableOpacity>
	);
});

ItemRow.displayName = "ItemRow";

const createStyles = (THEME, statusConfig, isCompleted) =>
	StyleSheet.create({
		container: {
			backgroundColor: THEME.colors.background.card,
			borderRadius: THEME.radius.md,
			padding: THEME.spacing.md,
			borderLeftWidth: 3,
			borderLeftColor: statusConfig.color,
			opacity: isCompleted ? 0.6 : 1,
			gap: THEME.spacing.xs,
		},
		row: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "space-between",
			gap: THEME.spacing.sm,
		},
		itemName: {
			flex: 1,
			fontSize: 15,
			fontWeight: "600",
			color: THEME.colors.text.primary,
		},
		itemNameCompleted: {
			textDecorationLine: "line-through",
			color: THEME.colors.text.muted,
		},
		quantity: {
			fontSize: 13,
			fontWeight: "400",
			color: THEME.colors.text.muted,
		},
		statusBadge: {
			flexDirection: "row",
			alignItems: "center",
			gap: 4,
			backgroundColor: statusConfig.bgColor,
			paddingHorizontal: 8,
			paddingVertical: 3,
			borderRadius: THEME.radius.sm,
		},
		statusText: {
			fontSize: 11,
			fontWeight: "600",
			color: statusConfig.color,
		},
		metaRow: {
			flexDirection: "row",
			alignItems: "center",
			gap: THEME.spacing.md,
			flex: 1,
		},
		metaItem: {
			flexDirection: "row",
			alignItems: "center",
			gap: 4,
		},
		metaText: {
			fontSize: 12,
			color: THEME.colors.text.muted,
			maxWidth: 80,
		},
		completedBadge: {
			width: 24,
			height: 24,
			borderRadius: 12,
			backgroundColor: statusConfig.bgColor,
			alignItems: "center",
			justifyContent: "center",
		},
	});

export default ItemRow;

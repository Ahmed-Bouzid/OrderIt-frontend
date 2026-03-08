/**
 * 📋 AuditLogModal - Popup audit compact (miroir horizontal de ClientMessagesPanel)
 * Descend depuis le haut à droite (près de la molette settings)
 */
import React, { useMemo } from "react";
import {
	View,
	Text,
	Modal,
	TouchableOpacity,
	FlatList,
	StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const ACTION_CONFIG = {
	created: { icon: "add-circle-outline", color: "#10B981", label: "Création" },
	created_client: {
		icon: "person-add-outline",
		color: "#10B981",
		label: "Client",
	},
	joined: { icon: "people-outline", color: "#06B6D4", label: "Rejoint" },
	table_assigned: { icon: "grid-outline", color: "#3B82F6", label: "Table" },
	table_changed: {
		icon: "swap-horizontal-outline",
		color: "#8B5CF6",
		label: "Table",
	},
	table_released: { icon: "log-out-outline", color: "#6B7280", label: "Table" },
	status_changed: { icon: "sync-outline", color: "#F59E0B", label: "Statut" },
	payment: { icon: "card-outline", color: "#10B981", label: "Paiement" },
	order_sent: {
		icon: "restaurant-outline",
		color: "#F97316",
		label: "Commande",
	},
	present_changed: { icon: "eye-outline", color: "#06B6D4", label: "Présence" },
	cancelled: {
		icon: "close-circle-outline",
		color: "#EF4444",
		label: "Annulation",
	},
	closed_client: {
		icon: "checkmark-done-outline",
		color: "#6B7280",
		label: "Fermeture",
	},
	deleted: { icon: "trash-outline", color: "#EF4444", label: "Suppression" },
	dish_status_changed: {
		icon: "flame-outline",
		color: "#F97316",
		label: "Plat",
	},
	field_updated: { icon: "create-outline", color: "#8B5CF6", label: "Modif" },
};

const formatTimestamp = (timestamp) => {
	if (!timestamp) return "";
	const d = new Date(timestamp);
	const day = String(d.getDate()).padStart(2, "0");
	const month = String(d.getMonth() + 1).padStart(2, "0");
	const hours = String(d.getHours()).padStart(2, "0");
	const mins = String(d.getMinutes()).padStart(2, "0");
	return `${day}/${month} à ${hours}:${mins}`;
};

const AuditLogModal = ({ visible, onClose, reservation, theme }) => {
	const sortedLog = useMemo(() => {
		if (!reservation?.auditLog) return [];
		return [...reservation.auditLog].sort(
			(a, b) => new Date(b.timestamp) - new Date(a.timestamp),
		);
	}, [reservation?.auditLog]);

	const renderAuditItem = ({ item }) => {
		const config = ACTION_CONFIG[item.action] || {
			icon: "ellipsis-horizontal-outline",
			color: "#6B7280",
			label: "Action",
		};

		return (
			<View style={[styles.auditCard, { borderColor: `${config.color}30` }]}>
				<View style={styles.auditHeader}>
					<Ionicons name={config.icon} size={16} color={config.color} />
					<View style={styles.auditInfo}>
						<Text style={styles.auditWho}>{item.userName || "Système"}</Text>
						<Text style={styles.auditTime}>
							{formatTimestamp(item.timestamp)}
						</Text>
					</View>
				</View>
				<Text style={styles.auditMessage}>{item.message || item.action}</Text>
			</View>
		);
	};

	return (
		<Modal
			visible={visible}
			animationType="fade"
			transparent
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
							<Ionicons name="time-outline" size={20} color="#F59E0B" />
							<Text style={styles.headerTitle}>Audit ({sortedLog.length})</Text>
						</View>
						<TouchableOpacity onPress={onClose} style={styles.closeButton}>
							<Ionicons name="close" size={20} color="#64748B" />
						</TouchableOpacity>
					</View>

					{/* Liste */}
					{sortedLog.length === 0 ? (
						<View style={styles.emptyContainer}>
							<Ionicons
								name="document-text-outline"
								size={32}
								color="#475569"
							/>
							<Text style={styles.emptyText}>Aucun historique</Text>
						</View>
					) : (
						<FlatList
							data={sortedLog}
							renderItem={renderAuditItem}
							keyExtractor={(item, i) => item._id?.toString() || `audit-${i}`}
							contentContainerStyle={styles.listContent}
							showsVerticalScrollIndicator={false}
						/>
					)}
				</TouchableOpacity>
			</TouchableOpacity>
		</Modal>
	);
};

const styles = StyleSheet.create({
	// Overlay : miroir de ClientMessagesPanel (flex-start au lieu de flex-end)
	overlay: {
		flex: 1,
		backgroundColor: "rgba(0, 0, 0, 0.3)",
		justifyContent: "flex-start",
		alignItems: "flex-end",
		padding: 20,
		paddingTop: 120,
	},
	// Même dimensions que chatContainer de ClientMessagesPanel
	chatContainer: {
		width: 380,
		maxHeight: 500,
		backgroundColor: "#151923",
		borderRadius: 16,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 8 },
		shadowOpacity: 0.35,
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
		borderBottomColor: "rgba(148, 163, 184, 0.12)",
		backgroundColor: "#1E2433",
	},
	headerLeft: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
	},
	headerTitle: {
		fontSize: 15,
		fontWeight: "600",
		color: "#F8FAFC",
	},
	closeButton: {
		padding: 4,
	},
	emptyContainer: {
		padding: 40,
		alignItems: "center",
		gap: 8,
	},
	emptyText: {
		fontSize: 13,
		color: "#475569",
	},
	listContent: {
		padding: 12,
		gap: 8,
	},
	// Cartes identiques au style messageCard de ClientMessagesPanel
	auditCard: {
		backgroundColor: "#1E2433",
		borderRadius: 12,
		padding: 12,
		borderWidth: 1,
		gap: 6,
	},
	auditHeader: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
	},
	auditInfo: {
		flex: 1,
	},
	auditWho: {
		fontSize: 13,
		fontWeight: "700",
		color: "#F59E0B",
		marginBottom: 1,
	},
	auditTime: {
		fontSize: 11,
		color: "#64748B",
	},
	auditMessage: {
		fontSize: 13,
		color: "#94A3B8",
		lineHeight: 18,
	},
});

export default AuditLogModal;

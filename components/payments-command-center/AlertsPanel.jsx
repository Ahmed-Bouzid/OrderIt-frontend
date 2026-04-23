// components/payments-command-center/AlertsPanel.jsx
import React, { memo } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import T from "./theme";

const ALERT_CONFIG = {
	failed: { icon: "close-circle", color: T.accent.red, bg: T.accent.redDim },
	no_payment: { icon: "alert-circle", color: T.accent.amber, bg: T.accent.amberDim },
	duplicate: { icon: "copy", color: T.accent.purple, bg: T.accent.purpleDim },
	sync_error: { icon: "cloud-offline", color: T.accent.red, bg: T.accent.redDim },
};

const AlertRow = memo(({ alert, onDismiss, onMarkRead }) => {
	const config = ALERT_CONFIG[alert.type] || ALERT_CONFIG.failed;
	const time = new Date(alert.timestamp).toLocaleTimeString("fr-FR", {
		hour: "2-digit",
		minute: "2-digit",
	});

	return (
		<View style={[s.alertRow, alert.read && s.alertRead]}>
			<View style={[s.alertIcon, { backgroundColor: config.bg }]}>
				<Ionicons name={config.icon} size={14} color={config.color} />
			</View>
			<View style={s.alertContent}>
				<Text style={[s.alertMessage, alert.read && s.alertMessageRead]} numberOfLines={2}>
					{alert.message}
				</Text>
				<Text style={s.alertTime}>{time}</Text>
			</View>
			<View style={s.alertActions}>
				{!alert.read && (
					<TouchableOpacity onPress={() => onMarkRead(alert.id)} hitSlop={8}>
						<Ionicons name="checkmark" size={16} color={T.text.muted} />
					</TouchableOpacity>
				)}
				<TouchableOpacity onPress={() => onDismiss(alert.id)} hitSlop={8}>
					<Ionicons name="close" size={16} color={T.text.muted} />
				</TouchableOpacity>
			</View>
		</View>
	);
});

AlertRow.displayName = "AlertRow";

const AlertsPanel = memo(({ alerts, onDismiss, onMarkRead, isCompact }) => {
	const unreadCount = alerts.filter((a) => !a.read).length;
	const displayAlerts = isCompact ? alerts.slice(0, 3) : alerts;

	if (alerts.length === 0) {
		return (
			<View style={s.emptyContainer}>
				<Ionicons name="shield-checkmark" size={20} color={T.accent.green} />
				<Text style={s.emptyText}>Aucune alerte</Text>
			</View>
		);
	}

	return (
		<View style={s.container}>
			<View style={s.headerRow}>
				<Ionicons name="notifications" size={14} color={T.accent.amber} />
				<Text style={s.headerTitle}>Alertes</Text>
				{unreadCount > 0 && (
					<View style={s.unreadBadge}>
						<Text style={s.unreadCount}>{unreadCount}</Text>
					</View>
				)}
			</View>
			{displayAlerts.map((alert) => (
				<AlertRow
					key={alert.id}
					alert={alert}
					onDismiss={onDismiss}
					onMarkRead={onMarkRead}
				/>
			))}
		</View>
	);
});

AlertsPanel.displayName = "AlertsPanel";

const s = StyleSheet.create({
	container: {
		paddingHorizontal: T.spacing.lg,
		paddingVertical: T.spacing.sm,
	},
	headerRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
		marginBottom: T.spacing.sm,
	},
	headerTitle: {
		fontSize: 13,
		fontWeight: "700",
		color: T.text.primary,
		flex: 1,
	},
	unreadBadge: {
		backgroundColor: T.accent.red,
		borderRadius: T.radius.pill,
		minWidth: 18,
		height: 18,
		alignItems: "center",
		justifyContent: "center",
		paddingHorizontal: 5,
	},
	unreadCount: {
		fontSize: 10,
		fontWeight: "800",
		color: "#fff",
	},
	alertRow: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: T.bg.tertiary,
		borderRadius: T.radius.md,
		padding: T.spacing.sm,
		marginBottom: T.spacing.xs,
		gap: 8,
	},
	alertRead: {
		opacity: 0.5,
	},
	alertIcon: {
		width: 28,
		height: 28,
		borderRadius: T.radius.sm,
		alignItems: "center",
		justifyContent: "center",
	},
	alertContent: {
		flex: 1,
	},
	alertMessage: {
		fontSize: 12,
		fontWeight: "500",
		color: T.text.primary,
		lineHeight: 16,
	},
	alertMessageRead: {
		color: T.text.muted,
	},
	alertTime: {
		fontSize: 10,
		color: T.text.muted,
		marginTop: 1,
	},
	alertActions: {
		flexDirection: "row",
		gap: 10,
	},
	// Empty
	emptyContainer: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: T.spacing.lg,
		gap: 6,
	},
	emptyText: {
		fontSize: 12,
		color: T.text.muted,
	},
});

export default AlertsPanel;

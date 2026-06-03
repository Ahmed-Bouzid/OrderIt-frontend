/**
 * AuditModal.jsx - Modal d'historique des modifications
 * Affiche l'audit trail d'une réservation avec icônes et timestamps
 */
import React, { useMemo } from "react";
import {
	Modal,
	View,
	Text,
	TouchableOpacity,
	TouchableWithoutFeedback,
	StyleSheet,
	ScrollView,
	Animated,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../hooks/useTheme";
// Icônes et couleurs par type d'action
const ACTION_CONFIG = {
	created: { icon: "add-circle", color: "#10b981", label: "Création" },
	table_assigned: { icon: "grid", color: "#3b82f6", label: "Table assignée" },
	table_changed: {
		icon: "swap-horizontal",
		color: "#f59e0b",
		label: "Table modifiée",
	},
	status_changed: {
		icon: "sync",
		color: "#8b5cf6",
		label: "Statut modifié",
	},
	payment: { icon: "card", color: "#10b981", label: "Paiement" },
	order_sent: {
		icon: "restaurant",
		color: "#ef4444",
		label: "Commande envoyée",
	},
	present_changed: {
		icon: "person",
		color: "#06b6d4",
		label: "Présence",
	},
	cancelled: { icon: "close-circle", color: "#ef4444", label: "Annulation" },
	field_updated: { icon: "pencil", color: "#64748b", label: "Modification" },
};

const AuditModal = ({ visible, onClose, reservation }) => {
	const THEME = useTheme();
	const auditLog = useMemo(() => {
		if (!reservation?.auditLog) return [];
		// Tri décroissant (plus récent en premier)
		return [...reservation.auditLog].sort(
			(a, b) => new Date(b.timestamp) - new Date(a.timestamp)
		);
	}, [reservation]);

	const formatDate = (timestamp) => {
		const date = new Date(timestamp);
		const now = new Date();
		const diff = now - date;
		const hours = Math.floor(diff / (1000 * 60 * 60));
		const days = Math.floor(hours / 24);

		if (hours < 1) return "À l'instant";
		if (hours < 24) return `Il y a ${hours} heure${hours > 1 ? "s" : ""}`;
		if (days < 7) return `Il y a ${days} jour${days > 1 ? "s" : ""}`;

		return date.toLocaleDateString("fr-FR", {
			day: "numeric",
			month: "short",
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	if (!visible || !reservation) return null;

	return (
		<Modal
			visible={visible}
			transparent
			animationType="fade"
			onRequestClose={onClose}
		>
			<TouchableWithoutFeedback onPress={onClose}>
				<View style={styles(THEME).overlay}>
					<TouchableWithoutFeedback>
						<Animated.View style={styles(THEME).modalContainer}>
							{/* Header */}
							<LinearGradient
								colors={[
									"#1E293B",
									"#243447",
								]}
								style={styles(THEME).header}
							>
								<View style={styles(THEME).headerLeft}>
									<LinearGradient
										colors={[
											"rgba(99, 102, 241, 0.2)",
											"rgba(99, 102, 241, 0.05)",
										]}
										style={styles(THEME).headerIconBg}
									>
										<Ionicons
											name="time-outline"
											size={20}
											color={"#6366F1"}
										/>
									</LinearGradient>
									<View>
										<Text style={styles(THEME).modalTitle}>Historique</Text>
										<Text style={styles(THEME).modalSubtitle}>
											{reservation.clientName || "Client"}
										</Text>
									</View>
								</View>
								<TouchableOpacity
									style={styles(THEME).closeButton}
									onPress={onClose}
								>
									<Ionicons
										name="close"
										size={22}
										color={"#94A3B8"}
									/>
								</TouchableOpacity>
							</LinearGradient>

							{/* Timeline */}
							<ScrollView
								style={styles(THEME).scrollView}
								contentContainerStyle={styles(THEME).scrollContent}
								showsVerticalScrollIndicator={false}
							>
								{auditLog.length === 0 ? (
									<View style={styles(THEME).emptyState}>
										<Ionicons
											name="albums-outline"
											size={48}
											color={THEME.colors.text.tertiary}
										/>
										<Text style={styles(THEME).emptyText}>
											Aucun historique disponible
										</Text>
									</View>
								) : (
									auditLog.map((entry, index) => {
										const config =
											ACTION_CONFIG[entry.action] ||
											ACTION_CONFIG.field_updated;
										const isLast = index === auditLog.length - 1;

										return (
											<View key={entry._id || index}>
												<View style={styles(THEME).timelineItem}>
													{/* Icon */}
													<View style={styles(THEME).iconContainer}>
														<View
															style={[
																styles(THEME).iconCircle,
																{ backgroundColor: config.color },
															]}
														>
															<Ionicons
																name={config.icon}
																size={16}
																color="#FFFFFF"
															/>
														</View>
														{!isLast && (
															<View
																style={[
																	styles(THEME).timeline,
																	{
																		backgroundColor: THEME.colors.border.subtle,
																	},
																]}
															/>
														)}
													</View>

													{/* Content */}
													<View style={styles(THEME).contentContainer}>
														<View style={styles(THEME).contentHeader}>
															<Text style={styles(THEME).actionLabel}>
																{config.label}
															</Text>
															<Text style={styles(THEME).timestamp}>
																{formatDate(entry.timestamp)}
															</Text>
														</View>
														<Text style={styles(THEME).message}>
															{entry.message}
														</Text>
														<Text style={styles(THEME).userName}>
															par {entry.userName || "Système"}
														</Text>
													</View>
												</View>
											</View>
										);
									})
								)}
							</ScrollView>

							{/* Footer */}
							<View style={styles(THEME).footer}>
								<TouchableOpacity
									style={styles(THEME).footerButton}
									onPress={onClose}
								>
									<Ionicons
										name="checkmark"
										size={18}
										color={"#94A3B8"}
									/>
									<Text style={styles(THEME).footerButtonText}>Fermer</Text>
								</TouchableOpacity>
							</View>
						</Animated.View>
					</TouchableWithoutFeedback>
				</View>
			</TouchableWithoutFeedback>
		</Modal>
	);
};

const styles = (THEME) =>
	StyleSheet.create({
		overlay: {
			flex: 1,
			backgroundColor: "rgba(0,0,0,0.70)",
			justifyContent: "flex-end",
		},
		modalContainer: {
			backgroundColor: "#0F172A",
			borderTopLeftRadius: 24,
			borderTopRightRadius: 24,
			maxHeight: "85%",
			shadowColor: "#000",
			shadowOffset: { width: 0, height: -4 },
			shadowOpacity: 0.15,
			shadowRadius: 12,
			elevation: 10,
		},
		header: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "space-between",
			padding: 16,
			borderTopLeftRadius: 24,
			borderTopRightRadius: 24,
			borderBottomWidth: 1,
			borderBottomColor: THEME.colors.border.subtle,
		},
		headerLeft: {
			flexDirection: "row",
			alignItems: "center",
			gap: 12,
		},
		headerIconBg: {
			width: 42,
			height: 42,
			borderRadius: 12,
			alignItems: "center",
			justifyContent: "center",
		},
		modalTitle: {
			fontSize: THEME.typography.sizes.lg,
			fontWeight: "700",
			color: "#F1F5F9",
		},
		modalSubtitle: {
			fontSize: THEME.typography.sizes.sm,
			color: "#94A3B8",
			marginTop: 2,
		},
		closeButton: {
			width: 36,
			height: 36,
			borderRadius: 18,
			backgroundColor: "#243447",
			alignItems: "center",
			justifyContent: "center",
		},
		scrollView: {
			flex: 1,
		},
		scrollContent: {
			padding: 16,
			paddingBottom: 20,
		},
		emptyState: {
			alignItems: "center",
			justifyContent: "center",
			paddingVertical: 20 * 2,
		},
		emptyText: {
			fontSize: THEME.typography.sizes.md,
			color: THEME.colors.text.tertiary,
			marginTop: 12,
		},
		timelineItem: {
			flexDirection: "row",
			marginBottom: 12,
		},
		iconContainer: {
			alignItems: "center",
			marginRight: 12,
		},
		iconCircle: {
			width: 32,
			height: 32,
			borderRadius: 16,
			alignItems: "center",
			justifyContent: "center",
		},
		timeline: {
			width: 2,
			flex: 1,
			marginTop: 4,
		},
		contentContainer: {
			flex: 1,
			backgroundColor: "#1E293B",
			borderRadius: 12,
			padding: 12,
			borderWidth: 1,
			borderColor: THEME.colors.border.subtle,
		},
		contentHeader: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
			marginBottom: 4,
		},
		actionLabel: {
			fontSize: THEME.typography.sizes.xs,
			fontWeight: "600",
			color: "#94A3B8",
			textTransform: "uppercase",
			letterSpacing: 0.5,
		},
		timestamp: {
			fontSize: THEME.typography.sizes.xs,
			color: THEME.colors.text.tertiary,
		},
		message: {
			fontSize: THEME.typography.sizes.md,
			fontWeight: "500",
			color: "#F1F5F9",
			marginBottom: 4,
		},
		userName: {
			fontSize: THEME.typography.sizes.xs,
			color: THEME.colors.text.tertiary,
			fontStyle: "italic",
		},
		footer: {
			padding: 12,
			borderTopWidth: 1,
			borderTopColor: THEME.colors.border.subtle,
		},
		footerButton: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "center",
			gap: 8,
			paddingVertical: 12,
			borderRadius: 12,
			backgroundColor: "#243447",
		},
		footerButtonText: {
			fontSize: THEME.typography.sizes.md,
			fontWeight: "600",
			color: "#94A3B8",
		},
	});

export default AuditModal;

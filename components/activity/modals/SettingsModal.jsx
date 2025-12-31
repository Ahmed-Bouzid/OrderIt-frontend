// components/elements/ActivityModals/SettingsModal.jsx
import React from "react";
import {
	View,
	Text,
	TouchableOpacity,
	Modal,
	Alert,
	TouchableWithoutFeedback,
	StyleSheet,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

// Design tokens harmonisés avec le thème principal ambre
const MODAL_THEME = {
	colors: {
		background: "#0C0F17",
		card: "#151923",
		elevated: "#1E2433",
		primary: "#F59E0B",
		primaryDark: "#D97706",
		text: { primary: "#F8FAFC", secondary: "#94A3B8", muted: "#64748B" },
		border: "rgba(148, 163, 184, 0.12)",
		borderLight: "rgba(148, 163, 184, 0.08)",
		success: "#10B981",
		successDark: "#059669",
		warning: "#F59E0B",
		warningDark: "#D97706",
		danger: "#EF4444",
		dangerDark: "#DC2626",
		info: "#3B82F6",
		infoDark: "#2563EB",
		overlay: "rgba(12, 15, 23, 0.9)",
	},
	radius: { md: 12, lg: 16, xl: 22 },
	spacing: { sm: 8, md: 12, lg: 16, xl: 24 },
};

export const SettingsModal = ({
	visible,
	onClose,
	activeReservation,
	onFinishReservation,
	onTogglePresent,
	onUpdateStatus,
	onCancel,
	theme,
}) => {
	// ⭐ Guard clause
	if (!visible) return null;

	const safeOnClose = onClose || (() => {});

	const handleUpdateStatus = async (reservationId, newStatus) => {
		if (!reservationId || !onUpdateStatus) return;
		await onUpdateStatus(reservationId, newStatus);
		safeOnClose();
	};

	const handleTogglePresence = async () => {
		if (!activeReservation?._id || !onTogglePresent) return;
		await onTogglePresent(activeReservation._id);
		safeOnClose();
	};

	const handleFinish = () => {
		console.log("🔘 [SettingsModal] handleFinish appelé");
		console.log(
			"🔘 [SettingsModal] activeReservation:",
			activeReservation?._id?.slice(-6),
			"status:",
			activeReservation?.status
		);

		if (!activeReservation?._id || !onFinishReservation) {
			console.error(
				"❌ [SettingsModal] Pas de reservationId ou onFinishReservation"
			);
			return;
		}
		Alert.alert(
			"Confirmation",
			"Êtes-vous sûr de vouloir terminer cette réservation ?",
			[
				{ text: "Non", style: "cancel" },
				{
					text: "Oui",
					onPress: async () => {
						console.log(
							"🔘 [SettingsModal] Confirmation OK, appel onFinishReservation..."
						);
						safeOnClose();
						await onFinishReservation(activeReservation._id);
						console.log("🔘 [SettingsModal] onFinishReservation terminé");
					},
				},
			]
		);
	};

	const handleCancelReservation = async () => {
		if (!activeReservation?._id || !onCancel) return;
		Alert.alert(
			"Confirmation",
			"Êtes-vous sûr de vouloir annuler cette réservation ?",
			[
				{ text: "Non", style: "cancel" },
				{
					text: "Oui",
					onPress: async () => {
						await onCancel(activeReservation._id);
						safeOnClose();
					},
				},
			]
		);
	};

	const status = activeReservation?.status || "";

	// Composant de bouton avec gradient harmonisé
	const ActionButton = ({ onPress, colors, icon, label }) => (
		<TouchableOpacity
			onPress={onPress}
			style={modalStyles.actionButton}
			activeOpacity={0.85}
		>
			<LinearGradient
				colors={colors}
				start={{ x: 0, y: 0 }}
				end={{ x: 1, y: 0 }}
				style={modalStyles.actionButtonGradient}
			>
				<Ionicons
					name={icon}
					size={18}
					color="#FFFFFF"
					style={{ marginRight: 8 }}
				/>
				<Text style={modalStyles.actionButtonText}>{label}</Text>
			</LinearGradient>
		</TouchableOpacity>
	);

	return (
		<Modal
			visible={visible}
			transparent
			animationType="fade"
			onRequestClose={safeOnClose}
		>
			<TouchableWithoutFeedback onPress={safeOnClose}>
				<View style={modalStyles.overlay}>
					<TouchableWithoutFeedback onPress={() => {}}>
						<View style={modalStyles.container}>
							{/* Header avec icône */}
							<View style={modalStyles.header}>
								<View style={modalStyles.headerIcon}>
									<Ionicons
										name="settings-outline"
										size={24}
										color={MODAL_THEME.colors.primary}
									/>
								</View>
								<Text style={modalStyles.title}>Options de réservation</Text>
								<TouchableOpacity
									onPress={safeOnClose}
									style={modalStyles.closeButton}
								>
									<Ionicons
										name="close"
										size={20}
										color={MODAL_THEME.colors.text.secondary}
									/>
								</TouchableOpacity>
							</View>

							{/* Divider */}
							<View style={modalStyles.divider} />

							{/* Actions */}
							<View style={modalStyles.actionsContainer}>
								{/* Si réservation en attente */}
								{status === "en attente" && (
									<>
										{/* Présent / Absent toggle */}
										{!activeReservation?.isPresent ? (
											<ActionButton
												onPress={handleTogglePresence}
												colors={[
													MODAL_THEME.colors.success,
													MODAL_THEME.colors.successDark,
												]}
												icon="checkmark-circle"
												label="Mettre présent"
											/>
										) : (
											<ActionButton
												onPress={handleTogglePresence}
												colors={[
													MODAL_THEME.colors.warning,
													MODAL_THEME.colors.warningDark,
												]}
												icon="alert-circle"
												label="Mettre absent"
											/>
										)}
										{/* Ouvrir la réservation si présent */}
										{activeReservation?.isPresent && (
											<ActionButton
												onPress={() =>
													handleUpdateStatus(activeReservation?._id, "ouverte")
												}
												colors={[
													MODAL_THEME.colors.info,
													MODAL_THEME.colors.infoDark,
												]}
												icon="restaurant"
												label="Ouvrir la réservation"
											/>
										)}
										{/* Terminer si présent */}
										{activeReservation?.isPresent && (
											<ActionButton
												onPress={handleFinish}
												colors={[
													MODAL_THEME.colors.success,
													MODAL_THEME.colors.successDark,
												]}
												icon="checkmark-done"
												label="Terminer la réservation"
											/>
										)}
									</>
								)}

								{/* Si réservation ouverte */}
								{status === "ouverte" && (
									<>
										{/* Remettre en attente */}
										<ActionButton
											onPress={() =>
												handleUpdateStatus(activeReservation?._id, "en attente")
											}
											colors={[
												MODAL_THEME.colors.warning,
												MODAL_THEME.colors.warningDark,
											]}
											icon="pause-circle"
											label="Mettre en attente"
										/>
										{/* Terminer */}
										<ActionButton
											onPress={handleFinish}
											colors={[
												MODAL_THEME.colors.success,
												MODAL_THEME.colors.successDark,
											]}
											icon="checkmark-done"
											label="Terminer la réservation"
										/>
									</>
								)}

								{/* Si réservation annulée */}
								{status === "annulée" && (
									<ActionButton
										onPress={() =>
											handleUpdateStatus(activeReservation?._id, "en attente")
										}
										colors={[
											MODAL_THEME.colors.success,
											MODAL_THEME.colors.successDark,
										]}
										icon="refresh"
										label="Rétablir la réservation"
									/>
								)}

								{/* Si réservation terminée */}
								{status === "terminée" && (
									<View style={modalStyles.infoBox}>
										<Ionicons
											name="information-circle"
											size={20}
											color={MODAL_THEME.colors.text.muted}
										/>
										<Text style={modalStyles.infoText}>
											Cette réservation est terminée.
										</Text>
									</View>
								)}

								{/* Annuler (sauf si terminée ou annulée) */}
								{status !== "terminée" && status !== "annulée" && (
									<ActionButton
										onPress={handleCancelReservation}
										colors={[
											MODAL_THEME.colors.danger,
											MODAL_THEME.colors.dangerDark,
										]}
										icon="close-circle"
										label="Annuler la réservation"
									/>
								)}
							</View>

							{/* Bouton Fermer */}
							<TouchableOpacity
								style={modalStyles.closeButtonBottom}
								onPress={safeOnClose}
							>
								<Text style={modalStyles.closeButtonText}>Fermer</Text>
							</TouchableOpacity>
						</View>
					</TouchableWithoutFeedback>
				</View>
			</TouchableWithoutFeedback>
		</Modal>
	);
};

const modalStyles = StyleSheet.create({
	overlay: {
		flex: 1,
		backgroundColor: MODAL_THEME.colors.overlay,
		justifyContent: "center",
		alignItems: "center",
	},
	container: {
		width: 360,
		backgroundColor: MODAL_THEME.colors.card,
		borderRadius: MODAL_THEME.radius.xl,
		padding: MODAL_THEME.spacing.xl,
		borderWidth: 1,
		borderColor: MODAL_THEME.colors.border,
	},
	header: {
		flexDirection: "row",
		alignItems: "center",
		marginBottom: MODAL_THEME.spacing.lg,
	},
	headerIcon: {
		width: 44,
		height: 44,
		borderRadius: MODAL_THEME.radius.md,
		backgroundColor: "rgba(245, 158, 11, 0.15)",
		justifyContent: "center",
		alignItems: "center",
		marginRight: MODAL_THEME.spacing.md,
	},
	title: {
		flex: 1,
		fontSize: 18,
		fontWeight: "700",
		color: MODAL_THEME.colors.text.primary,
	},
	closeButton: {
		width: 32,
		height: 32,
		borderRadius: 16,
		backgroundColor: MODAL_THEME.colors.elevated,
		justifyContent: "center",
		alignItems: "center",
	},
	divider: {
		height: 1,
		backgroundColor: MODAL_THEME.colors.border,
		marginBottom: MODAL_THEME.spacing.lg,
	},
	actionsContainer: {
		gap: MODAL_THEME.spacing.md,
	},
	actionButton: {
		borderRadius: MODAL_THEME.radius.lg,
		overflow: "hidden",
	},
	actionButtonGradient: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: 14,
		paddingHorizontal: 20,
	},
	actionButtonText: {
		fontSize: 15,
		fontWeight: "600",
		color: "#FFFFFF",
	},
	infoBox: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: MODAL_THEME.colors.elevated,
		borderRadius: MODAL_THEME.radius.md,
		padding: MODAL_THEME.spacing.lg,
		gap: MODAL_THEME.spacing.sm,
	},
	infoText: {
		fontSize: 14,
		color: MODAL_THEME.colors.text.secondary,
	},
	closeButtonBottom: {
		marginTop: MODAL_THEME.spacing.xl,
		paddingVertical: 12,
		alignItems: "center",
		backgroundColor: MODAL_THEME.colors.elevated,
		borderRadius: MODAL_THEME.radius.md,
		borderWidth: 1,
		borderColor: MODAL_THEME.colors.border,
	},
	closeButtonText: {
		fontSize: 15,
		fontWeight: "600",
		color: MODAL_THEME.colors.text.secondary,
	},
});

SettingsModal.displayName = "SettingsModal";

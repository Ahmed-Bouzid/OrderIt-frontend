/**
 * SettingsModal.jsx - Modal de paramètres Premium
 * Interface de gestion des réservations avec design spatial
 * Support Mode Clair/Sombre
 */
import React, { useEffect, useRef, useMemo } from "react";
import {
	Modal,
	View,
	Text,
	TouchableOpacity,
	TouchableWithoutFeedback,
	StyleSheet,
	Animated,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import useThemeStore from "../../src/stores/useThemeStore";
import { getTheme } from "../../utils/themeUtils";

// ─────────────── Action Button Component ───────────────
const ActionButton = React.memo(({ icon, label, colors, onPress, styles }) => (
	<TouchableOpacity onPress={onPress} activeOpacity={0.85}>
		<LinearGradient
			colors={colors}
			start={{ x: 0, y: 0 }}
			end={{ x: 1, y: 0 }}
			style={styles.actionButton}
		>
			<Ionicons
				name={icon}
				size={20}
				color="#FFFFFF"
				style={{ marginRight: 10 }}
			/>
			<Text style={styles.actionButtonText}>{label}</Text>
		</LinearGradient>
	</TouchableOpacity>
));

const SettingsModal = React.memo(
	({
		visible,
		onClose,
		reservation,
		onTogglePresent,
		onUpdateStatus,
		onCancel,
	}) => {
		// Thème dynamique
		const { themeMode } = useThemeStore();
		const THEME = useMemo(() => getTheme(themeMode), [themeMode]);
		const modalStyles = useMemo(() => createModalStyles(THEME), [THEME]);

		// Animation refs
		const scaleAnim = useRef(new Animated.Value(0.9)).current;
		const opacityAnim = useRef(new Animated.Value(0)).current;

		useEffect(() => {
			if (visible) {
				Animated.parallel([
					Animated.spring(scaleAnim, {
						toValue: 1,
						useNativeDriver: true,
						tension: 65,
						friction: 8,
					}),
					Animated.timing(opacityAnim, {
						toValue: 1,
						duration: 200,
						useNativeDriver: true,
					}),
				]).start();
			} else {
				scaleAnim.setValue(0.9);
				opacityAnim.setValue(0);
			}
		}, [visible]);

		if (!reservation || !visible) return null;

		let effectiveStatus = reservation.status || "en attente";
		if (reservation.isPresent && reservation.status === "en attente") {
			effectiveStatus = "present";
		}

		const getStatusInfo = () => {
			switch (effectiveStatus) {
				case "en attente":
					return {
						icon: "time-outline",
						color: THEME.colors.status.warning,
						label: "En attente",
					};
				case "present":
					return {
						icon: "checkmark-circle-outline",
						color: THEME.colors.status.success,
						label: "Présent",
					};
				case "ouverte":
					return {
						icon: "restaurant-outline",
						color: THEME.colors.primary.sky,
						label: "Ouverte",
					};
				case "terminée":
					return {
						icon: "checkmark-done-outline",
						color: THEME.colors.text.muted,
						label: "Terminée",
					};
				case "annulée":
					return {
						icon: "close-circle-outline",
						color: THEME.colors.status.error,
						label: "Annulée",
					};
				default:
					return {
						icon: "help-circle-outline",
						color: THEME.colors.text.muted,
						label: effectiveStatus,
					};
			}
		};

		const statusInfo = getStatusInfo();

		return (
			<Modal
				visible={visible}
				transparent
				animationType="none"
				onRequestClose={onClose}
			>
				<TouchableWithoutFeedback onPress={() => onClose?.()}>
					<Animated.View
						style={[modalStyles.overlay, { opacity: opacityAnim }]}
					>
						<TouchableWithoutFeedback onPress={() => {}}>
							<Animated.View
								style={[
									modalStyles.modalContainer,
									{
										transform: [{ scale: scaleAnim }],
										opacity: opacityAnim,
									},
								]}
							>
								{/* Header */}
								<View style={modalStyles.header}>
									<View style={modalStyles.headerLeft}>
										<Text style={modalStyles.modalTitle}>
											{String(reservation?.clientName || "Client")}
										</Text>
										<View style={modalStyles.statusRow}>
											<Ionicons
												name={statusInfo.icon}
												size={16}
												color={statusInfo.color}
											/>
											<Text
												style={[
													modalStyles.statusText,
													{ color: statusInfo.color },
												]}
											>
												{statusInfo.label}
											</Text>
										</View>
									</View>
									<TouchableOpacity
										style={modalStyles.closeButton}
										onPress={onClose}
									>
										<Ionicons
											name="close"
											size={22}
											color={THEME.colors.text.secondary}
										/>
									</TouchableOpacity>
								</View>

								{/* Divider */}
								<LinearGradient
									colors={[
										"transparent",
										THEME.colors.border.subtle,
										"transparent",
									]}
									start={{ x: 0, y: 0 }}
									end={{ x: 1, y: 0 }}
									style={modalStyles.divider}
								/>

								{/* Actions */}
								<View style={modalStyles.actionsContainer}>
									{effectiveStatus === "en attente" && (
										<>
											<ActionButton
												icon="checkmark-circle"
												label="Marquer présent"
												colors={["#10B981", "#059669"]}
												onPress={() => onTogglePresent?.(reservation._id)}
												styles={modalStyles}
											/>
											<ActionButton
												icon="restaurant"
												label="Ouvrir la réservation"
												colors={["#0EA5E9", "#0284C7"]}
												onPress={() =>
													onUpdateStatus?.(
														reservation._id,
														"ouverte",
														reservation
													)
												}
												styles={modalStyles}
											/>
											<ActionButton
												icon="checkmark-done"
												label="Terminer la réservation"
												colors={["#10B981", "#059669"]}
												onPress={() =>
													onUpdateStatus?.(
														reservation._id,
														"terminée",
														reservation
													)
												}
												styles={modalStyles}
											/>
										</>
									)}

									{effectiveStatus === "ouverte" && (
										<>
											<ActionButton
												icon="pause-circle"
												label="Remettre en présent"
												colors={["#F59E0B", "#D97706"]}
												onPress={() =>
													onUpdateStatus?.(
														reservation._id,
														"present",
														reservation
													)
												}
												styles={modalStyles}
											/>
											<ActionButton
												icon="checkmark-done"
												label="Terminer la réservation"
												colors={["#10B981", "#059669"]}
												onPress={() =>
													onUpdateStatus?.(
														reservation._id,
														"terminée",
														reservation
													)
												}
												styles={modalStyles}
											/>
										</>
									)}

									{effectiveStatus === "annulée" && (
										<ActionButton
											icon="refresh"
											label="Rétablir la réservation"
											colors={["#10B981", "#059669"]}
											onPress={() =>
												onUpdateStatus?.(
													reservation._id,
													"en attente",
													reservation
												)
											}
											styles={modalStyles}
										/>
									)}

									{effectiveStatus !== "terminée" &&
										effectiveStatus !== "annulée" && (
											<ActionButton
												icon="close-circle"
												label="Annuler la réservation"
												colors={["#EF4444", "#DC2626"]}
												onPress={() => onCancel(reservation._id)}
												styles={modalStyles}
											/>
										)}
								</View>

								{/* Footer */}
								<TouchableOpacity
									style={modalStyles.footerButton}
									onPress={onClose}
								>
									<Ionicons
										name="chevron-back"
										size={18}
										color={THEME.colors.text.secondary}
									/>
									<Text style={modalStyles.footerButtonText}>Fermer</Text>
								</TouchableOpacity>
							</Animated.View>
						</TouchableWithoutFeedback>
					</Animated.View>
				</TouchableWithoutFeedback>
			</Modal>
		);
	}
);

// ─────────────── Styles Premium ───────────────
const createModalStyles = (THEME) =>
	StyleSheet.create({
		overlay: {
			flex: 1,
			backgroundColor: "rgba(0, 0, 0, 0.7)",
			justifyContent: "center",
			alignItems: "center",
			padding: THEME.spacing.lg,
		},
		modalContainer: {
			width: "100%",
			maxWidth: 400,
			backgroundColor: THEME.colors.background.card,
			borderRadius: THEME.radius.xl,
			borderWidth: 1,
			borderColor: THEME.colors.border.subtle,
			overflow: "hidden",
		},
		header: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "flex-start",
			padding: THEME.spacing.lg,
		},
		headerLeft: {
			flex: 1,
		},
		modalTitle: {
			fontSize: THEME.typography.sizes.xl,
			fontWeight: THEME.typography.weights.bold,
			color: THEME.colors.text.primary,
			marginBottom: THEME.spacing.xs,
		},
		statusRow: {
			flexDirection: "row",
			alignItems: "center",
			gap: THEME.spacing.xs,
		},
		statusText: {
			fontSize: THEME.typography.sizes.sm,
			fontWeight: THEME.typography.weights.medium,
		},
		closeButton: {
			width: 36,
			height: 36,
			borderRadius: THEME.radius.md,
			backgroundColor: THEME.colors.background.elevated,
			alignItems: "center",
			justifyContent: "center",
		},
		divider: {
			height: 1,
			marginHorizontal: THEME.spacing.lg,
		},
		actionsContainer: {
			padding: THEME.spacing.lg,
			gap: THEME.spacing.sm,
		},
		actionButton: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "center",
			paddingVertical: THEME.spacing.md,
			paddingHorizontal: THEME.spacing.lg,
			borderRadius: THEME.radius.lg,
		},
		actionButtonText: {
			fontSize: THEME.typography.sizes.md,
			fontWeight: THEME.typography.weights.semibold,
			color: "#FFFFFF",
		},
		infoBox: {
			flexDirection: "row",
			alignItems: "center",
			backgroundColor: THEME.colors.background.elevated,
			padding: THEME.spacing.md,
			borderRadius: THEME.radius.md,
			gap: THEME.spacing.sm,
			marginBottom: THEME.spacing.sm,
		},
		infoText: {
			fontSize: THEME.typography.sizes.sm,
			color: THEME.colors.text.muted,
			flex: 1,
		},
		footerButton: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "center",
			paddingVertical: THEME.spacing.md,
			borderTopWidth: 1,
			borderTopColor: THEME.colors.border.subtle,
			gap: THEME.spacing.xs,
		},
		footerButtonText: {
			fontSize: THEME.typography.sizes.md,
			fontWeight: THEME.typography.weights.medium,
			color: THEME.colors.text.secondary,
		},
	});

SettingsModal.displayName = "SettingsModal";

export default SettingsModal;

/**
 * SettingsModal.jsx - Modal de paramètres Premium
 * Interface de gestion des réservations avec design spatial
 * Support Mode Clair/Sombre
 */
import React, { useEffect, useRef, useMemo, useState } from "react";
import {
	Modal,
	View,
	Text,
	TouchableOpacity,
	TouchableWithoutFeedback,
	StyleSheet,
	Animated,
	ActivityIndicator,
	ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import useThemeStore from "../../src/stores/useThemeStore";
import { getTheme } from "../../utils/themeUtils";
import { useAuthFetch } from "../../hooks/useAuthFetch";
import { API_CONFIG } from "../../src/config/apiConfig";

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

ActionButton.displayName = "ActionButton";

const SettingsModal = React.memo(
	({
		visible,
		onClose,
		reservation,
		onTogglePresent,
		onUpdateStatus,
		onCancel,
		onRecreate,
		onPayReservation,
	}) => {
		// Thème dynamique
		const { themeMode } = useThemeStore();
		const THEME = useMemo(() => getTheme(themeMode), [themeMode]);

		const modalStyles = useMemo(() => createModalStyles(THEME), [THEME]);
		const authFetch = useAuthFetch();

		// Étape : "actions" | "payment"
		const [step, setStep] = useState("actions");
		const [isPaymentLoading, setIsPaymentLoading] = useState(false);
		const [receiptItems, setReceiptItems] = useState([]);
		const [isLoadingReceipt, setIsLoadingReceipt] = useState(false);

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
				setStep("actions");
				setIsPaymentLoading(false);
				setReceiptItems([]);
				setIsLoadingReceipt(false);
			}
		}, [visible, scaleAnim, opacityAnim]);

		if (!reservation || !visible) return null;

		const effectiveStatus = reservation.status || "en attente";

		const getStatusInfo = () => {
			// Affiche "Présent" si isPresent=true ET status="en attente"
			if (reservation.isPresent && effectiveStatus === "en attente") {
				return {
					icon: "checkmark-circle-outline",
					color: THEME.colors.status.success,
					label: "Présent",
				};
			}

			switch (effectiveStatus) {
				case "en attente":
					return {
						icon: "time-outline",
						color: THEME.colors.status.warning,
						label: "En attente",
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

								{/* Actions / Paiement */}
								<View style={modalStyles.actionsContainer}>
									{step === "payment" ? (
										<>
											<Text style={modalStyles.paymentAmount}>
												{reservation?.totalAmount > 0
													? `${reservation.totalAmount.toFixed(2)} €`
													: "Montant à confirmer"}
											</Text>

											{/* ─── Reçu ─── */}
											{isLoadingReceipt ? (
												<ActivityIndicator
													size="small"
													color="#10B981"
													style={{ marginBottom: 12 }}
												/>
											) : receiptItems.length > 0 ? (
												<View style={modalStyles.receiptContainer}>
													<Text style={modalStyles.receiptTitle}>
														Détail de la commande
													</Text>
													<ScrollView
														nestedScrollEnabled
														style={modalStyles.receiptScroll}
														showsVerticalScrollIndicator={false}
													>
														{receiptItems.map((item, i) => (
															<View key={i} style={modalStyles.receiptItem}>
																<View style={modalStyles.receiptItemLeft}>
																	<Text style={modalStyles.receiptItemQty}>
																		{item.quantity}×
																	</Text>
																	<Text
																		style={modalStyles.receiptItemName}
																		numberOfLines={1}
																	>
																		{item.name}
																	</Text>
																</View>
																<Text style={modalStyles.receiptItemPrice}>
																	{(item.price * item.quantity).toFixed(2)} €
																</Text>
															</View>
														))}
													</ScrollView>
												</View>
											) : null}

											<Text style={modalStyles.paymentMethodLabel}>
												Mode de paiement
											</Text>
											<View style={modalStyles.paymentBtns}>
												<TouchableOpacity
													style={modalStyles.paymentBtn}
													onPress={async () => {
														setIsPaymentLoading(true);
														await onPayReservation?.(
															reservation._id,
															reservation?.totalAmount || 0,
															"Espèces",
														);
														setIsPaymentLoading(false);
													}}
													disabled={isPaymentLoading}
													activeOpacity={0.85}
												>
													<LinearGradient
														colors={["#F59E0B", "#D97706"]}
														style={modalStyles.paymentBtnGradient}
														start={{ x: 0, y: 0 }}
														end={{ x: 1, y: 1 }}
													>
														{isPaymentLoading ? (
															<ActivityIndicator size="small" color="#FFFFFF" />
														) : (
															<>
																<Ionicons
																	name="cash-outline"
																	size={22}
																	color="#FFFFFF"
																	style={{ marginBottom: 3 }}
																/>
																<Text style={modalStyles.paymentBtnText}>
																	Espèces
																</Text>
															</>
														)}
													</LinearGradient>
												</TouchableOpacity>
												<TouchableOpacity
													style={modalStyles.paymentBtn}
													onPress={async () => {
														setIsPaymentLoading(true);
														await onPayReservation?.(
															reservation._id,
															reservation?.totalAmount || 0,
															"Carte",
														);
														setIsPaymentLoading(false);
													}}
													disabled={isPaymentLoading}
													activeOpacity={0.85}
												>
													<LinearGradient
														colors={["#6366F1", "#4F46E5"]}
														style={modalStyles.paymentBtnGradient}
														start={{ x: 0, y: 0 }}
														end={{ x: 1, y: 1 }}
													>
														{isPaymentLoading ? (
															<ActivityIndicator size="small" color="#FFFFFF" />
														) : (
															<>
																<Ionicons
																	name="card-outline"
																	size={22}
																	color="#FFFFFF"
																	style={{ marginBottom: 3 }}
																/>
																<Text style={modalStyles.paymentBtnText}>
																	Carte
																</Text>
															</>
														)}
													</LinearGradient>
												</TouchableOpacity>
											</View>
										</>
									) : (
										<>
											{/* En attente, pas présent */}
											{effectiveStatus === "en attente" &&
												!reservation.isPresent && (
													<>
														<ActionButton
															icon="checkmark-circle"
															label="Marquer présent"
															colors={["#10B981", "#059669"]}
															onPress={() => onTogglePresent?.(reservation._id)}
															styles={modalStyles}
														/>
														<ActionButton
															icon="close-circle"
															label="Annuler la réservation"
															colors={["#EF4444", "#DC2626"]}
															onPress={() => onCancel(reservation._id)}
															styles={modalStyles}
														/>
													</>
												)}

											{/* En attente + présent */}
											{effectiveStatus === "en attente" &&
												reservation.isPresent && (
													<>
														<ActionButton
															icon="remove-circle"
															label="Marquer absent"
															colors={["#F59E0B", "#D97706"]}
															onPress={() => onTogglePresent?.(reservation._id)}
															styles={modalStyles}
														/>
														<ActionButton
															icon="close-circle"
															label="Annuler la réservation"
															colors={["#EF4444", "#DC2626"]}
															onPress={() => onCancel(reservation._id)}
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
																	reservation,
																)
															}
															styles={modalStyles}
														/>
													</>
												)}

											{/* Ouverte */}
											{effectiveStatus === "ouverte" && (
												<>
													<ActionButton
														icon="card-outline"
														label="Payer la commande"
														colors={["#10B981", "#059669"]}
														onPress={async () => {
															setIsLoadingReceipt(true);
															try {
																const orders = await authFetch(
																	`${API_CONFIG.baseURL}/orders/reservation/${reservation._id}`,
																);
																if (Array.isArray(orders)) {
																	setReceiptItems(
																		orders.flatMap((o) => o.items || []),
																	);
																}
															} catch (_) {
																setReceiptItems([]);
															} finally {
																setIsLoadingReceipt(false);
															}
															setStep("payment");
														}}
														styles={modalStyles}
													/>
													<ActionButton
														icon="close-circle"
														label="Annuler la réservation"
														colors={["#EF4444", "#DC2626"]}
														onPress={() => onCancel(reservation._id)}
														styles={modalStyles}
													/>
													<ActionButton
														icon="checkmark-done"
														label="Terminer (0 €)"
														colors={["#6B7280", "#4B5563"]}
														onPress={() => {
															if (
																typeof reservation.totalAmount === "number" &&
																reservation.totalAmount > 0
															) {
																alert(
																	"Fermeture impossible : le montant de la réservation n'est pas à zéro.",
																);
																return;
															}
															onUpdateStatus?.(
																reservation._id,
																"terminée",
																reservation,
															);
														}}
														styles={modalStyles}
													/>
												</>
											)}

											{/* Terminée */}
											{effectiveStatus === "terminée" && (
												<ActionButton
													icon="add-circle"
													label="Recréer la réservation"
													colors={["#F59E0B", "#D97706"]}
													onPress={() => {
														onClose?.();
														onRecreate?.(reservation);
													}}
													styles={modalStyles}
												/>
											)}

											{/* Annulée */}
											{effectiveStatus === "annulée" && (
												<>
													<ActionButton
														icon="add-circle"
														label="Recréer la réservation"
														colors={["#F59E0B", "#D97706"]}
														onPress={() => {
															onClose?.();
															onRecreate?.(reservation);
														}}
														styles={modalStyles}
													/>
													{onDelete && (
														<ActionButton
															icon="trash"
															label="Supprimer définitivement"
															colors={["#7F1D1D", "#450A0A"]}
															onPress={() => onDelete(reservation._id)}
															styles={modalStyles}
														/>
													)}
												</>
											)}
										</>
									)}
								</View>

								{/* Footer */}
								<TouchableOpacity
									style={modalStyles.footerButton}
									onPress={() => {
										if (step === "payment") {
											setStep("actions");
										} else {
											onClose?.();
										}
									}}
								>
									<Ionicons
										name="chevron-back"
										size={18}
										color={THEME.colors.text.secondary}
									/>
									<Text style={modalStyles.footerButtonText}>
										{step === "payment" ? "Retour" : "Fermer"}
									</Text>
								</TouchableOpacity>
							</Animated.View>
						</TouchableWithoutFeedback>
					</Animated.View>
				</TouchableWithoutFeedback>
			</Modal>
		);
	},
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
		// ─── Paiement ────────────────────────────
		paymentAmount: {
			fontSize: 36,
			fontWeight: "900",
			color: "#10B981",
			textAlign: "center",
			marginBottom: 4,
		},
		paymentMethodLabel: {
			fontSize: 11,
			fontWeight: "700",
			color: THEME.colors.text.muted,
			textTransform: "uppercase",
			letterSpacing: 0.8,
			textAlign: "center",
			marginBottom: THEME.spacing.md,
		},
		paymentBtns: {
			flexDirection: "row",
			gap: 12,
			width: "100%",
		},
		paymentBtn: {
			flex: 1,
			borderRadius: THEME.radius.lg,
			overflow: "hidden",
		},
		paymentBtnGradient: {
			alignItems: "center",
			justifyContent: "center",
			paddingVertical: 18,
		},
		paymentBtnText: {
			fontSize: 14,
			fontWeight: "700",
			color: "#FFFFFF",
		},
		// ─── Reçu ────────────────────────────────
		receiptContainer: {
			width: "100%",
			backgroundColor: THEME.colors.background.elevated,
			borderRadius: THEME.radius.md,
			paddingHorizontal: 12,
			paddingVertical: 8,
			marginBottom: THEME.spacing.md,
		},
		receiptTitle: {
			fontSize: 10,
			fontWeight: "700",
			color: THEME.colors.text.muted,
			textTransform: "uppercase",
			letterSpacing: 0.8,
			marginBottom: 6,
		},
		receiptScroll: {
			maxHeight: 120,
		},
		receiptItem: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "space-between",
			paddingVertical: 3,
		},
		receiptItemLeft: {
			flexDirection: "row",
			alignItems: "center",
			flex: 1,
			marginRight: 8,
		},
		receiptItemQty: {
			fontSize: 12,
			fontWeight: "700",
			color: "#10B981",
			minWidth: 22,
		},
		receiptItemName: {
			fontSize: 12,
			color: THEME.colors.text.primary,
			flex: 1,
		},
		receiptItemPrice: {
			fontSize: 12,
			fontWeight: "600",
			color: THEME.colors.text.secondary,
		},
	});

SettingsModal.displayName = "SettingsModal";

export default SettingsModal;

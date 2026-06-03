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
import { useAuthFetch } from "../../hooks/useAuthFetch";
import { API_CONFIG } from "../../src/config/apiConfig";
import { useTheme } from "../../hooks/useTheme";

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
		const THEME = useTheme();
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

		const effectiveStatus = reservation.status || "pending";

		const getStatusInfo = () => {
			// Affiche "Présent" si isPresent=true ET status="pending"
			if (reservation.isPresent && effectiveStatus === "pending") {
				return {
					icon: "checkmark-circle-outline",
					color: "#22C55E",
					label: "Présent",
				};
			}

			switch (effectiveStatus) {
				case "pending":
					return {
						icon: "time-outline",
						color: "#F59E0B",
						label: "En attente",
					};
				case "confirmed":
					return {
						icon: "restaurant-outline",
						color: "#38BDF8",
						label: "Ouverte",
					};
				case "completed":
					return {
						icon: "checkmark-done-outline",
						color: "#64748B",
						label: "Terminée",
					};
				case "cancelled":
					return {
						icon: "close-circle-outline",
						color: "#EF4444",
						label: "Annulée",
					};
				default:
					return {
						icon: "help-circle-outline",
						color: "#64748B",
						label: effectiveStatus,
					};
			}
		};

		const statusInfo = getStatusInfo();

		return (
			<Modal
				visible={visible}
				transparent
				animationType="fade"
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
											color={"#94A3B8"}
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
											{effectiveStatus === "pending" &&
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
											{effectiveStatus === "pending" &&
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
																	"confirmed",
																	reservation,
																)
															}
															styles={modalStyles}
														/>
													</>
												)}

											{/* Ouverte */}
											{effectiveStatus === "confirmed" && (
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
																"completed",
																reservation,
															);
														}}
														styles={modalStyles}
													/>
												</>
											)}

											{/* Terminée */}
											{effectiveStatus === "completed" && (
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
											{effectiveStatus === "cancelled" && (
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
										color={"#94A3B8"}
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
			backgroundColor: "rgba(0,0,0,0.70)",
			justifyContent: "center",
			alignItems: "center",
			padding: 16,
		},
		modalContainer: {
			width: "100%",
			maxWidth: 400,
			backgroundColor: "#1E293B",
			borderRadius: THEME.radius.xl,
			borderWidth: 1,
			borderColor: THEME.colors.border.subtle,
			overflow: "hidden",
		},
		header: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "flex-start",
			padding: 16,
		},
		headerLeft: {
			flex: 1,
		},
		modalTitle: {
			fontSize: THEME.typography.sizes.xl,
			fontWeight: THEME.typography.weights.bold,
			color: "#F1F5F9",
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
			backgroundColor: "#243447",
			alignItems: "center",
			justifyContent: "center",
		},
		divider: {
			height: 1,
			marginHorizontal: 16,
		},
		actionsContainer: {
			padding: 16,
			gap: 8,
		},
		actionButton: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "center",
			paddingVertical: 12,
			paddingHorizontal: 16,
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
			backgroundColor: "#243447",
			padding: 12,
			borderRadius: THEME.radius.md,
			gap: 8,
			marginBottom: 8,
		},
		infoText: {
			fontSize: THEME.typography.sizes.sm,
			color: "#64748B",
			flex: 1,
		},
		footerButton: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "center",
			paddingVertical: 12,
			borderTopWidth: 1,
			borderTopColor: THEME.colors.border.subtle,
			gap: THEME.spacing.xs,
		},
		footerButtonText: {
			fontSize: THEME.typography.sizes.md,
			fontWeight: THEME.typography.weights.medium,
			color: "#94A3B8",
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
			color: "#64748B",
			textTransform: "uppercase",
			letterSpacing: 0.8,
			textAlign: "center",
			marginBottom: 12,
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
			backgroundColor: "#243447",
			borderRadius: THEME.radius.md,
			paddingHorizontal: 12,
			paddingVertical: 8,
			marginBottom: 12,
		},
		receiptTitle: {
			fontSize: 10,
			fontWeight: "700",
			color: "#64748B",
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
			color: "#F1F5F9",
			flex: 1,
		},
		receiptItemPrice: {
			fontSize: 12,
			fontWeight: "600",
			color: "#94A3B8",
		},
	});

SettingsModal.displayName = "SettingsModal";

export default SettingsModal;

// components/payments-command-center/RefundModal.jsx
// Modale de remboursement Stripe — total ou partiel
// Utilisée depuis le PaymentsCommandCenter (LiveFeed)

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
	Modal,
	View,
	Text,
	TextInput,
	TouchableOpacity,
	StyleSheet,
	ActivityIndicator,
	Animated,
	Platform,
	KeyboardAvoidingView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import T from "./theme";

const REASONS = [
	{ key: "requested_by_customer", label: "Demande client" },
	{ key: "duplicate", label: "Doublon" },
	{ key: "fraudulent", label: "Fraude" },
];

/**
 * @param {object}   payment       — objet paiement du store (id, amount, client, orderId, ...)
 * @param {boolean}  visible
 * @param {function} onClose
 * @param {function} onConfirm     — async ({ paymentId, amountCents, reason }) → void
 */
const RefundModal = ({ payment, visible, onClose, onConfirm }) => {
	const slideAnim = useRef(new Animated.Value(80)).current;
	const fadeAnim = useRef(new Animated.Value(0)).current;

	const [mode, setMode] = useState("full"); // "full" | "partial"
	const [partialInput, setPartialInput] = useState("");
	const [reason, setReason] = useState("requested_by_customer");
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState(null);

	// Reset à l'ouverture
	useEffect(() => {
		if (visible) {
			setMode("full");
			setPartialInput("");
			setReason("requested_by_customer");
			setError(null);
			setIsLoading(false);

			Animated.parallel([
				Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
				Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, speed: 18, bounciness: 4 }),
			]).start();
		} else {
			Animated.parallel([
				Animated.timing(fadeAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
				Animated.timing(slideAnim, { toValue: 80, duration: 180, useNativeDriver: true }),
			]).start();
		}
	}, [visible, fadeAnim, slideAnim]);

	const totalEur = payment?.amount ?? 0;

	const partialAmountEur = parseFloat(partialInput.replace(",", ".")) || 0;
	const partialValid =
		mode === "partial" &&
		partialAmountEur > 0 &&
		partialAmountEur <= totalEur;

	const canSubmit =
		!isLoading &&
		(mode === "full" || partialValid);

	const refundAmountEur = mode === "full" ? totalEur : partialAmountEur;
	const refundAmountCents = Math.round(refundAmountEur * 100);

	const handleConfirm = useCallback(async () => {
		if (!canSubmit) return;
		setError(null);
		setIsLoading(true);
		try {
			await onConfirm({
				paymentId: payment.id,
				amountCents: mode === "full" ? null : refundAmountCents,
				reason,
			});
			onClose();
		} catch (err) {
			setError(err?.message || "Erreur lors du remboursement");
		} finally {
			setIsLoading(false);
		}
	}, [canSubmit, onConfirm, payment, mode, refundAmountCents, reason, onClose]);

	if (!payment) return null;

	return (
		<Modal
			visible={visible}
			transparent
			animationType="none"
			onRequestClose={onClose}
		>
			<Animated.View style={[s.overlay, { opacity: fadeAnim }]}>
				<TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />

				<KeyboardAvoidingView
					behavior={Platform.OS === "ios" ? "padding" : undefined}
					style={s.kvWrapper}
				>
					<Animated.View style={[s.sheet, { transform: [{ translateY: slideAnim }] }]}>
						{/* Header */}
						<View style={s.header}>
							<View style={s.headerLeft}>
								<View style={s.iconWrap}>
									<Ionicons name="return-up-back" size={18} color={T.accent.amber} />
								</View>
								<View>
									<Text style={s.title}>Remboursement</Text>
									<Text style={s.subtitle}>
										{payment.client} · {payment.orderId}
									</Text>
								</View>
							</View>
							<TouchableOpacity onPress={onClose} hitSlop={10} style={s.closeBtn}>
								<Ionicons name="close" size={20} color={T.text.secondary} />
							</TouchableOpacity>
						</View>

						{/* Montant original */}
						<View style={s.originalAmount}>
							<Text style={s.originalLabel}>Montant payé</Text>
							<Text style={s.originalValue}>
								{totalEur.toLocaleString("fr-FR", { minimumFractionDigits: 2 })}€
							</Text>
						</View>

						{/* Sélection mode */}
						<View style={s.modeRow}>
							<TouchableOpacity
								style={[s.modeBtn, mode === "full" && s.modeBtnActive]}
								onPress={() => setMode("full")}
							>
								<Text style={[s.modeBtnText, mode === "full" && s.modeBtnTextActive]}>
									Total
								</Text>
							</TouchableOpacity>
							<TouchableOpacity
								style={[s.modeBtn, mode === "partial" && s.modeBtnActive]}
								onPress={() => setMode("partial")}
							>
								<Text style={[s.modeBtnText, mode === "partial" && s.modeBtnTextActive]}>
									Partiel
								</Text>
							</TouchableOpacity>
						</View>

						{/* Montant partiel */}
						{mode === "partial" && (
							<View style={s.inputRow}>
								<Text style={s.inputLabel}>Montant à rembourser (€)</Text>
								<View style={s.inputWrap}>
									<TextInput
										style={[
											s.input,
											partialInput.length > 0 && !partialValid && s.inputError,
										]}
										value={partialInput}
										onChangeText={setPartialInput}
										placeholder={`max ${totalEur.toFixed(2)}`}
										placeholderTextColor={T.text.muted}
										keyboardType="decimal-pad"
										selectionColor={T.accent.amber}
										autoFocus
									/>
									<Text style={s.inputUnit}>€</Text>
								</View>
								{partialInput.length > 0 && !partialValid && (
									<Text style={s.inputErrorText}>
										Montant invalide (max {totalEur.toFixed(2)}€)
									</Text>
								)}
							</View>
						)}

						{/* Motif */}
						<View style={s.reasonSection}>
							<Text style={s.reasonLabel}>Motif</Text>
							<View style={s.reasonRow}>
								{REASONS.map((r) => (
									<TouchableOpacity
										key={r.key}
										style={[s.reasonBtn, reason === r.key && s.reasonBtnActive]}
										onPress={() => setReason(r.key)}
									>
										<Text style={[s.reasonBtnText, reason === r.key && s.reasonBtnTextActive]}>
											{r.label}
										</Text>
									</TouchableOpacity>
								))}
							</View>
						</View>

						{/* Récap */}
						<View style={s.recap}>
							<Text style={s.recapLabel}>À rembourser</Text>
							<Text style={[s.recapAmount, !canSubmit && { color: T.text.muted }]}>
								{canSubmit
									? `${refundAmountEur.toLocaleString("fr-FR", { minimumFractionDigits: 2 })}€`
									: "—"}
							</Text>
						</View>

						{/* Erreur */}
						{error && (
							<View style={s.errorBox}>
								<Ionicons name="alert-circle" size={14} color={T.accent.red} />
								<Text style={s.errorText}>{error}</Text>
							</View>
						)}

						{/* Boutons action */}
						<View style={s.actions}>
							<TouchableOpacity style={s.cancelBtn} onPress={onClose} disabled={isLoading}>
								<Text style={s.cancelBtnText}>Annuler</Text>
							</TouchableOpacity>

							<TouchableOpacity
								style={[s.confirmBtn, !canSubmit && s.confirmBtnDisabled]}
								onPress={handleConfirm}
								disabled={!canSubmit}
							>
								{isLoading ? (
									<ActivityIndicator color="#000" size="small" />
								) : (
									<>
										<Ionicons name="return-up-back" size={16} color="#000" />
										<Text style={s.confirmBtnText}>Rembourser</Text>
									</>
								)}
							</TouchableOpacity>
						</View>
					</Animated.View>
				</KeyboardAvoidingView>
			</Animated.View>
		</Modal>
	);
};

const s = StyleSheet.create({
	overlay: {
		flex: 1,
		backgroundColor: T.bg.overlay,
		justifyContent: "flex-end",
	},
	kvWrapper: {
		width: "100%",
	},
	sheet: {
		backgroundColor: T.bg.secondary,
		borderTopLeftRadius: 20,
		borderTopRightRadius: 20,
		paddingBottom: Platform.OS === "ios" ? 34 : 20,
		borderWidth: 1,
		borderColor: T.border.card,
		...T.shadow.window,
	},
	header: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		padding: 20,
		borderBottomWidth: 1,
		borderBottomColor: T.border.subtle,
	},
	headerLeft: {
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
	},
	iconWrap: {
		width: 36,
		height: 36,
		borderRadius: 10,
		backgroundColor: T.accent.amberDim,
		justifyContent: "center",
		alignItems: "center",
	},
	title: {
		fontSize: 16,
		fontWeight: "700",
		color: T.text.primary,
	},
	subtitle: {
		fontSize: 12,
		color: T.text.secondary,
		marginTop: 2,
	},
	closeBtn: {
		padding: 4,
	},
	originalAmount: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		marginHorizontal: 20,
		marginTop: 16,
		backgroundColor: T.bg.tertiary,
		borderRadius: 10,
		paddingHorizontal: 16,
		paddingVertical: 12,
	},
	originalLabel: {
		fontSize: 13,
		color: T.text.secondary,
	},
	originalValue: {
		fontSize: 18,
		fontWeight: "800",
		color: T.text.primary,
	},
	modeRow: {
		flexDirection: "row",
		marginHorizontal: 20,
		marginTop: 16,
		gap: 8,
	},
	modeBtn: {
		flex: 1,
		paddingVertical: 10,
		borderRadius: 8,
		backgroundColor: T.bg.tertiary,
		alignItems: "center",
		borderWidth: 1,
		borderColor: T.border.subtle,
	},
	modeBtnActive: {
		backgroundColor: T.accent.amberDim,
		borderColor: T.accent.amber,
	},
	modeBtnText: {
		fontSize: 13,
		fontWeight: "600",
		color: T.text.secondary,
	},
	modeBtnTextActive: {
		color: T.accent.amber,
	},
	inputRow: {
		marginHorizontal: 20,
		marginTop: 14,
	},
	inputLabel: {
		fontSize: 12,
		color: T.text.secondary,
		marginBottom: 6,
	},
	inputWrap: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: T.bg.tertiary,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: T.border.card,
		paddingRight: 14,
	},
	input: {
		flex: 1,
		color: T.text.primary,
		fontSize: 16,
		fontWeight: "600",
		paddingHorizontal: 14,
		paddingVertical: 10,
	},
	inputError: {
		borderColor: T.accent.red,
	},
	inputUnit: {
		fontSize: 14,
		color: T.text.secondary,
	},
	inputErrorText: {
		fontSize: 11,
		color: T.accent.red,
		marginTop: 4,
	},
	reasonSection: {
		marginHorizontal: 20,
		marginTop: 16,
	},
	reasonLabel: {
		fontSize: 12,
		color: T.text.secondary,
		marginBottom: 8,
	},
	reasonRow: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: 6,
	},
	reasonBtn: {
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 20,
		backgroundColor: T.bg.tertiary,
		borderWidth: 1,
		borderColor: T.border.subtle,
	},
	reasonBtnActive: {
		backgroundColor: T.accent.purpleDim,
		borderColor: T.accent.purple,
	},
	reasonBtnText: {
		fontSize: 12,
		color: T.text.secondary,
	},
	reasonBtnTextActive: {
		color: T.accent.purple,
		fontWeight: "600",
	},
	recap: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		marginHorizontal: 20,
		marginTop: 16,
		paddingTop: 16,
		borderTopWidth: 1,
		borderTopColor: T.border.subtle,
	},
	recapLabel: {
		fontSize: 14,
		color: T.text.secondary,
	},
	recapAmount: {
		fontSize: 22,
		fontWeight: "800",
		color: T.accent.amber,
	},
	errorBox: {
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
		marginHorizontal: 20,
		marginTop: 10,
		backgroundColor: T.accent.redDim,
		borderRadius: 8,
		paddingHorizontal: 12,
		paddingVertical: 8,
	},
	errorText: {
		fontSize: 12,
		color: T.accent.red,
		flex: 1,
	},
	actions: {
		flexDirection: "row",
		gap: 10,
		marginHorizontal: 20,
		marginTop: 20,
	},
	cancelBtn: {
		flex: 1,
		paddingVertical: 14,
		borderRadius: 10,
		backgroundColor: T.bg.tertiary,
		alignItems: "center",
		borderWidth: 1,
		borderColor: T.border.subtle,
	},
	cancelBtnText: {
		fontSize: 14,
		fontWeight: "600",
		color: T.text.secondary,
	},
	confirmBtn: {
		flex: 2,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 8,
		paddingVertical: 14,
		borderRadius: 10,
		backgroundColor: T.accent.amber,
	},
	confirmBtnDisabled: {
		backgroundColor: T.accent.amberDim,
	},
	confirmBtnText: {
		fontSize: 14,
		fontWeight: "700",
		color: "#000",
	},
});

export default RefundModal;

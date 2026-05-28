/**
 * 🏪 EncaisserModal.jsx — Modal d'encaissement
 *
 * Permet de sélectionner le mode de paiement (Espèces / CB)
 * et encaisser la table
 */

import React, { useState, useMemo } from "react";
import {
	Modal,
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	ActivityIndicator,
} from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../../hooks/useTheme";

const ZERO_REASONS = [
	{ id: "offert", label: "Offert par la maison", emoji: "🎁" },
	{ id: "geste", label: "Geste commercial", emoji: "🤝" },
	{ id: "erreur", label: "Erreur de commande", emoji: "🔄" },
	{ id: "test", label: "Test / Formation interne", emoji: "🧪" },
];

const EncaisserModal = ({
	visible,
	onClose,
	total,
	onEncaisser,
}) => {
	const THEME = useTheme();
	const isZero = total === 0;

	const [step, setStep] = useState("payment"); // "payment" | "reason"
	const [selectedMethod, setSelectedMethod] = useState(null);
	const [selectedReason, setSelectedReason] = useState(null);
	const [isProcessing, setIsProcessing] = useState(false);

	const dynamicStyles = useMemo(
		() => createStyles(THEME),
		[THEME],
	);

	const handleReset = () => {
		setStep("payment");
		setSelectedMethod(null);
		setSelectedReason(null);
		setIsProcessing(false);
	};

	const handleClose = () => {
		handleReset();
		onClose();
	};

	const handleConfirm = async () => {
		if (!isZero && !selectedMethod) return;

		// Pour 0€ → passer au step raison avant de confirmer
		if (isZero && step === "payment") {
			setStep("reason");
			return;
		}

		setIsProcessing(true);
		try {
			const method = isZero ? "cash" : selectedMethod;
			await onEncaisser(method, selectedReason);
			handleReset();
			onClose();
		} catch (err) {
			console.error("[EncaisserModal] Erreur:", err);
		} finally {
			setIsProcessing(false);
		}
	};

	if (!visible) return null;

	// ─── Step 2 : Raison 0€ ───────────────────────────────────────────────
	const renderReasonStep = () => (
		<View style={dynamicStyles.card}>
			{/* Header */}
			<Text style={dynamicStyles.title}>⚠️ Total à 0,00 €</Text>
			<Text style={dynamicStyles.reasonSubtitle}>
				Pourquoi ? (optionnel)
			</Text>

			{/* Reason choices */}
			{ZERO_REASONS.map((r) => (
				<TouchableOpacity
					key={r.id}
					onPress={() =>
						setSelectedReason(
							selectedReason === r.id ? null : r.id,
						)
					}
					style={[
						dynamicStyles.reasonButton,
						selectedReason === r.id &&
							dynamicStyles.reasonButtonActive,
					]}
				>
					<Text style={dynamicStyles.reasonEmoji}>{r.emoji}</Text>
					<Text
						style={[
							dynamicStyles.reasonLabel,
							selectedReason === r.id &&
								dynamicStyles.reasonLabelActive,
						]}
					>
						{r.label}
					</Text>
					{selectedReason === r.id && (
						<Ionicons
							name="checkmark-circle"
							size={18}
							color={THEME.colors.background.dark}
							style={dynamicStyles.reasonCheck}
						/>
					)}
				</TouchableOpacity>
			))}

			{/* Buttons */}
			<View style={dynamicStyles.buttonsRow}>
				<TouchableOpacity
					onPress={() => setStep("payment")}
					disabled={isProcessing}
					style={dynamicStyles.cancelButton}
				>
					<Text style={dynamicStyles.cancelButtonText}>Retour</Text>
				</TouchableOpacity>

				<TouchableOpacity
					onPress={handleConfirm}
					disabled={isProcessing}
					style={dynamicStyles.confirmButton}
				>
					{isProcessing ? (
						<ActivityIndicator
							color={THEME.colors.background.dark}
							size="small"
						/>
					) : (
						<Text style={dynamicStyles.confirmButtonText}>
							Confirmer & Libérer
						</Text>
					)}
				</TouchableOpacity>
			</View>
		</View>
	);

	// ─── Step 1 : Paiement ────────────────────────────────────────────────
	const renderPaymentStep = () => (
		<View style={dynamicStyles.card}>
			{/* Header */}
			<Text style={dynamicStyles.title}>💳 Encaissement</Text>

			{/* Total */}
			<View style={[dynamicStyles.totalBox, isZero && dynamicStyles.totalBoxZero]}>
				<Text style={dynamicStyles.totalLabel}>
					Montant à encaisser :
				</Text>
				<Text style={[dynamicStyles.totalAmount, isZero && dynamicStyles.totalAmountZero]}>
					{total.toFixed(2)}€
				</Text>
			</View>

			{/* Mode selection — masqué si 0€ */}
			{!isZero && (
				<>
					<Text style={dynamicStyles.modeLabel}>
						Mode de paiement :
					</Text>

					<TouchableOpacity
						onPress={() => setSelectedMethod("cash")}
						style={[
							dynamicStyles.methodButton,
							selectedMethod === "cash" &&
								dynamicStyles.methodButtonActive,
						]}
					>
						<Ionicons
							name="cash-outline"
							size={24}
							color={
								selectedMethod === "cash"
									? THEME.colors.background.dark
									: THEME.colors.primary.amber
							}
						/>
						<Text
							style={[
								dynamicStyles.methodButtonText,
								selectedMethod === "cash" &&
									dynamicStyles.methodButtonTextActive,
							]}
						>
							Espèces
						</Text>
					</TouchableOpacity>

					<TouchableOpacity
						onPress={() => setSelectedMethod("card_offline")}
						style={[
							dynamicStyles.methodButton,
							selectedMethod === "card_offline" &&
								dynamicStyles.methodButtonActive,
						]}
					>
						<Ionicons
							name="card-outline"
							size={24}
							color={
								selectedMethod === "card_offline"
									? THEME.colors.background.dark
									: THEME.colors.primary.amber
							}
						/>
						<Text
							style={[
								dynamicStyles.methodButtonText,
								selectedMethod === "card_offline" &&
									dynamicStyles.methodButtonTextActive,
							]}
						>
							Carte (physique)
						</Text>
					</TouchableOpacity>
				</>
			)}

			{/* Buttons */}
			<View style={dynamicStyles.buttonsRow}>
				<TouchableOpacity
					onPress={handleClose}
					disabled={isProcessing}
					style={dynamicStyles.cancelButton}
				>
					<Text style={dynamicStyles.cancelButtonText}>Annuler</Text>
				</TouchableOpacity>

				<TouchableOpacity
					onPress={handleConfirm}
					disabled={(!isZero && !selectedMethod) || isProcessing}
					style={[
						dynamicStyles.confirmButton,
						((!isZero && !selectedMethod) || isProcessing) &&
							dynamicStyles.confirmButtonDisabled,
					]}
				>
					{isProcessing ? (
						<ActivityIndicator
							color={THEME.colors.background.dark}
							size="small"
						/>
					) : (
						<Text style={dynamicStyles.confirmButtonText}>
							Confirmer & Libérer
						</Text>
					)}
				</TouchableOpacity>
			</View>
		</View>
	);

	return (
		<Modal
			visible={visible}
			transparent
			animationType="fade"
			onRequestClose={handleClose}
		>
			<BlurView intensity={95} style={dynamicStyles.blur}>
				<View style={dynamicStyles.container}>
					{step === "reason"
						? renderReasonStep()
						: renderPaymentStep()}
				</View>
			</BlurView>
		</Modal>
	);
};

const createStyles = (THEME) =>
	StyleSheet.create({
		blur: {
			flex: 1,
			justifyContent: "center",
			alignItems: "center",
		},

		container: {
			width: "90%",
			maxWidth: 340,
		},

		card: {
			backgroundColor: THEME.colors.background.dark,
			borderRadius: 16,
			padding: 20,
			borderWidth: 1,
			borderColor: THEME.colors.border.subtle,
		},

		title: {
			fontSize: 18,
			fontWeight: "700",
			color: THEME.colors.text.primary,
			marginBottom: 16,
			textAlign: "center",
		},

		totalBox: {
			backgroundColor: THEME.colors.background.card,
			borderRadius: 12,
			padding: 16,
			marginBottom: 20,
			borderWidth: 2,
			borderColor: THEME.colors.primary.amber,
		},

		totalBoxZero: {
			borderColor: "#64748B",
		},

		totalLabel: {
			fontSize: 12,
			color: THEME.colors.text.muted,
			marginBottom: 4,
		},

		totalAmount: {
			fontSize: 28,
			fontWeight: "700",
			color: THEME.colors.primary.amber,
		},

		totalAmountZero: {
			color: "#94A3B8",
		},

		modeLabel: {
			fontSize: 13,
			fontWeight: "600",
			color: THEME.colors.text.secondary,
			marginBottom: 12,
		},

		methodButton: {
			flexDirection: "row",
			alignItems: "center",
			paddingVertical: 12,
			paddingHorizontal: 16,
			backgroundColor: THEME.colors.background.card,
			borderRadius: 8,
			borderWidth: 2,
			borderColor: THEME.colors.border.subtle,
			marginBottom: 10,
			gap: 12,
		},

		methodButtonActive: {
			backgroundColor: THEME.colors.primary.amber,
			borderColor: THEME.colors.primary.amber,
		},

		methodButtonText: {
			fontSize: 14,
			fontWeight: "600",
			color: THEME.colors.text.primary,
		},

		methodButtonTextActive: {
			color: THEME.colors.background.dark,
		},

		buttonsRow: {
			flexDirection: "row",
			gap: 10,
			marginTop: 20,
		},

		cancelButton: {
			flex: 1,
			paddingVertical: 12,
			paddingHorizontal: 16,
			borderRadius: 8,
			borderWidth: 1,
			borderColor: THEME.colors.border.subtle,
		},

		cancelButtonText: {
			fontSize: 13,
			fontWeight: "700",
			color: THEME.colors.text.secondary,
			textAlign: "center",
		},

		confirmButton: {
			flex: 1,
			paddingVertical: 12,
			paddingHorizontal: 16,
			borderRadius: 8,
			backgroundColor: THEME.colors.primary.amber,
		},

		confirmButtonDisabled: {
			opacity: 0.5,
		},

		confirmButtonText: {
			fontSize: 13,
			fontWeight: "700",
			color: THEME.colors.background.dark,
			textAlign: "center",
		},

		// ── Reason step ───────────────────────────────────────────
		reasonSubtitle: {
			fontSize: 13,
			color: THEME.colors.text.muted,
			marginBottom: 16,
			textAlign: "center",
		},

		reasonButton: {
			flexDirection: "row",
			alignItems: "center",
			paddingVertical: 13,
			paddingHorizontal: 16,
			backgroundColor: THEME.colors.background.card,
			borderRadius: 10,
			borderWidth: 2,
			borderColor: THEME.colors.border.subtle,
			marginBottom: 8,
		},

		reasonButtonActive: {
			backgroundColor: THEME.colors.primary.amber,
			borderColor: THEME.colors.primary.amber,
		},

		reasonEmoji: {
			fontSize: 18,
			marginRight: 12,
		},

		reasonLabel: {
			fontSize: 14,
			fontWeight: "600",
			color: THEME.colors.text.primary,
			flex: 1,
		},

		reasonLabelActive: {
			color: THEME.colors.background.dark,
		},

		reasonCheck: {
			marginLeft: 8,
		},
	});

export default EncaisserModal;

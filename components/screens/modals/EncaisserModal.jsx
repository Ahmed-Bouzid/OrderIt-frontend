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

const EncaisserModal = ({
	visible,
	onClose,
	total,
	onEncaisser,
}) => {
	const THEME = useTheme();
	const [selectedMethod, setSelectedMethod] = useState(null);
	const [isProcessing, setIsProcessing] = useState(false);

	const dynamicStyles = useMemo(
		() => createStyles(THEME),
		[THEME],
	);

	const handleConfirm = async () => {
		if (!selectedMethod) return;

		setIsProcessing(true);
		try {
			await onEncaisser(selectedMethod);
			onClose();
		} catch (err) {
			console.error("[EncaisserModal] Erreur:", err);
		} finally {
			setIsProcessing(false);
		}
	};

	if (!visible) return null;

	return (
		<Modal
			visible={visible}
			transparent
			animationType="fade"
			onRequestClose={onClose}
		>
			<BlurView intensity={95} style={dynamicStyles.blur}>
				<View style={dynamicStyles.container}>
					<View style={dynamicStyles.card}>
						{/* Header */}
						<Text style={dynamicStyles.title}>💳 Encaissement</Text>

						{/* Total */}
						<View style={dynamicStyles.totalBox}>
							<Text style={dynamicStyles.totalLabel}>
								Montant à encaisser:
							</Text>
							<Text style={dynamicStyles.totalAmount}>
								{total.toFixed(2)}€
							</Text>
						</View>

						{/* Mode selection */}
						<Text style={dynamicStyles.modeLabel}>
							Mode de paiement:
						</Text>

						<TouchableOpacity
							onPress={() =>
								setSelectedMethod("cash")
							}
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
							onPress={() =>
								setSelectedMethod("card_offline")
							}
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

						{/* Buttons */}
						<View style={dynamicStyles.buttonsRow}>
							<TouchableOpacity
								onPress={onClose}
								disabled={isProcessing}
								style={dynamicStyles.cancelButton}
							>
								<Text
									style={dynamicStyles.cancelButtonText}
								>
									Annuler
								</Text>
							</TouchableOpacity>

							<TouchableOpacity
								onPress={handleConfirm}
								disabled={!selectedMethod || isProcessing}
								style={[
									dynamicStyles.confirmButton,
									(!selectedMethod || isProcessing) &&
										dynamicStyles.confirmButtonDisabled,
								]}
							>
								{isProcessing ? (
									<ActivityIndicator
										color={THEME.colors.background.dark}
										size="small"
									/>
								) : (
									<Text
										style={dynamicStyles.confirmButtonText}
									>
										Confirmer & Libérer
									</Text>
								)}
							</TouchableOpacity>
						</View>
					</View>
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
	});

export default EncaisserModal;

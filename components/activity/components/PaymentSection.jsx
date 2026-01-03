// components/elements/ActivityComponents/PaymentSection.jsx
import React, { useMemo, useState } from "react";
import {
	View,
	Text,
	TextInput,
	TouchableOpacity,
	StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import useThemeStore from "../../../src/stores/useThemeStore";
import { useTheme } from "../../../hooks/useTheme";

export const PaymentSection = React.memo(
	({
		activeReservation,
		theme,
		editingStaffNotes,
		setEditingStaffNotes,
		staffNotesValue,
		setStaffNotesValue,
		editField,
		orders, // ✅ Nouveau prop pour calculer le total
		onPayClick, // ✅ Prop pour ouvrir la modale de paiement
	}) => {
		const { themeMode } = useThemeStore();
		const THEME = useTheme(); // Utilise le hook avec multiplicateur de police
		const localStyles = useMemo(() => createStyles(THEME), [THEME]);

		// ✅ State pour choisir CB ou Espèce
		const [paymentMethod, setPaymentMethod] = useState("Carte");

		// ✅ Calculer le total depuis les orders (plus fiable)
		const totalAmount = useMemo(() => {
			// D'abord essayer avec orders
			if (Array.isArray(orders) && orders.length > 0) {
				const ordersTotal = orders.reduce((sum, order) => {
					if (Array.isArray(order?.items)) {
						return (
							sum +
							order.items.reduce((itemSum, item) => {
								return itemSum + (item.price || 0) * (item.quantity || 0);
							}, 0)
						);
					}
					return sum;
				}, 0);
				if (ordersTotal > 0) {
					return ordersTotal.toFixed(2);
				}
			}
			// Fallback sur activeReservation.totalAmount
			if (typeof activeReservation?.totalAmount === "number") {
				return Number(activeReservation.totalAmount).toFixed(2);
			}
			return "0.00";
		}, [orders, activeReservation?.totalAmount]);

		const totalAmountNum = useMemo(
			() => parseFloat(totalAmount),
			[totalAmount]
		);

		const formattedStaffNotesTime = useMemo(() => {
			if (!activeReservation?.staffNotesUpdatedAt) return null;
			try {
				return new Date(
					activeReservation.staffNotesUpdatedAt
				).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
			} catch {
				return null;
			}
		}, [activeReservation?.staffNotesUpdatedAt]);

		if (!activeReservation) {
			return null;
		}

		return (
			<View style={localStyles.block}>
				{/* Header Section */}
				<View style={localStyles.sectionHeader}>
					<Ionicons name="card" size={18} color={THEME.colors.primary.amber} />
					<Text style={localStyles.sectionTitle}>Paiement & Notes</Text>
				</View>

				{/* Sous-total */}
				<View style={localStyles.row}>
					<Text style={localStyles.label}>Sous-total</Text>
					<View style={localStyles.totalBadge}>
						<Text style={localStyles.totalAmount}>{totalAmount}€</Text>
					</View>
				</View>

				{/* Méthode de paiement */}
				<View style={localStyles.row}>
					<Text style={localStyles.label}>Moyen de paiement</Text>
					<TouchableOpacity
						style={localStyles.paymentSelector}
						onPress={() =>
							setPaymentMethod((prev) =>
								prev === "Carte" ? "Espèce" : "Carte"
							)
						}
					>
						<Ionicons
							name={paymentMethod === "Carte" ? "card" : "cash"}
							size={16}
							color={THEME.colors.text.primary}
						/>
						<Text style={localStyles.paymentMethodText}>{paymentMethod}</Text>
						<Ionicons
							name="swap-horizontal"
							size={14}
							color={THEME.colors.text.muted}
						/>
					</TouchableOpacity>
				</View>

				{/* Bouton Payer - Toujours visible */}
				<TouchableOpacity
					style={[
						localStyles.payButton,
						totalAmountNum === 0 && localStyles.payButtonDisabled,
					]}
					onPress={() => onPayClick(totalAmountNum)}
					activeOpacity={0.8}
					disabled={totalAmountNum === 0}
				>
					<Ionicons
						name={paymentMethod === "Carte" ? "card" : "cash"}
						size={24}
						color="#FFF"
					/>
					<Text style={localStyles.payButtonText}>
						{totalAmountNum > 0 ? `Payer ${totalAmount}€` : "Aucune commande"}
					</Text>
				</TouchableOpacity>

				{/* Notes staff */}
				<View style={localStyles.notesRow}>
					<View style={localStyles.notesHeader}>
						<Ionicons
							name="chatbubble-ellipses"
							size={14}
							color={THEME.colors.text.secondary}
						/>
						<Text style={localStyles.label}>Notes staff</Text>
						{formattedStaffNotesTime && (
							<Text style={localStyles.notesTime}>
								{formattedStaffNotesTime}
							</Text>
						)}
					</View>
					{editingStaffNotes ? (
						<TextInput
							style={localStyles.notesInput}
							value={staffNotesValue || ""}
							onChangeText={(text) => {
								setStaffNotesValue?.(text);
								editField?.("staffNotes", text, false);
							}}
							onBlur={() => {
								editField?.("staffNotes", staffNotesValue, true);
								setEditingStaffNotes?.(false);
							}}
							autoFocus
							multiline
							placeholderTextColor={THEME.colors.text.muted}
							placeholder="Ajouter une note pour le staff..."
						/>
					) : (
						<TouchableOpacity
							style={localStyles.notesDisplay}
							onPress={() => {
								setStaffNotesValue?.(activeReservation?.staffNotes || "");
								setEditingStaffNotes?.(true);
							}}
						>
							<Text
								style={[
									localStyles.notesText,
									!activeReservation?.staffNotes && localStyles.placeholder,
								]}
							>
								{activeReservation?.staffNotes || "Ajouter une note..."}
							</Text>
							<Ionicons
								name="pencil"
								size={14}
								color={THEME.colors.text.muted}
							/>
						</TouchableOpacity>
					)}
				</View>
			</View>
		);
	}
);

PaymentSection.displayName = "PaymentSection";

// ═══════════════════════════════════════════════════════════════════════
// 🎨 Premium Dark Styles
// ═══════════════════════════════════════════════════════════════════════
const createStyles = (THEME) =>
	StyleSheet.create({
		block: {
			backgroundColor: THEME.colors.background.card,
			borderRadius: THEME.radius.lg,
			padding: THEME.spacing.lg,
			borderWidth: 1,
			borderColor: THEME.colors.border.default,
			marginTop: THEME.spacing.md,
		},
		sectionHeader: {
			flexDirection: "row",
			alignItems: "center",
			marginBottom: THEME.spacing.md,
			gap: THEME.spacing.sm,
		},
		sectionTitle: {
			fontSize: THEME.typography.sizes.sm,
			fontWeight: "700",
			color: THEME.colors.text.primary,
			textTransform: "uppercase",
			letterSpacing: 0.5,
		},
		row: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
			paddingVertical: THEME.spacing.sm,
			borderBottomWidth: 1,
			borderBottomColor: THEME.colors.border.subtle,
		},
		label: {
			fontSize: THEME.typography.sizes.sm,
			fontWeight: "500",
			color: THEME.colors.text.secondary,
		},
		value: {
			fontSize: THEME.typography.sizes.sm,
			fontWeight: "600",
			color: THEME.colors.text.primary,
		},
		placeholder: {
			color: THEME.colors.text.muted,
			fontStyle: "italic",
		},
		totalBadge: {
			backgroundColor: "rgba(245, 158, 11, 0.15)",
			paddingHorizontal: THEME.spacing.md,
			paddingVertical: THEME.spacing.xs,
			borderRadius: THEME.radius.sm,
			borderWidth: 1,
			borderColor: "rgba(245, 158, 11, 0.3)",
		},
		totalAmount: {
			fontSize: THEME.typography.sizes.lg,
			fontWeight: "700",
			color: THEME.colors.primary.amber,
		},
		paymentBadge: {
			flexDirection: "row",
			alignItems: "center",
			gap: THEME.spacing.xs,
			backgroundColor: THEME.colors.background.elevated,
			paddingHorizontal: THEME.spacing.md,
			paddingVertical: THEME.spacing.xs,
			borderRadius: THEME.radius.sm,
		},
		// ✅ Nouveau style pour sélecteur paiement
		paymentSelector: {
			flexDirection: "row",
			alignItems: "center",
			gap: THEME.spacing.sm,
			backgroundColor: THEME.colors.background.elevated,
			paddingHorizontal: THEME.spacing.lg,
			paddingVertical: THEME.spacing.sm,
			borderRadius: THEME.radius.md,
			borderWidth: 1,
			borderColor: THEME.colors.border.default,
		},
		paymentMethodText: {
			fontSize: THEME.typography.sizes.base,
			fontWeight: "600",
			color: THEME.colors.text.primary,
		},
		// ✅ Nouveau style pour bouton Payer
		payButton: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "center",
			gap: THEME.spacing.md,
			backgroundColor: THEME.colors.primary.amber,
			paddingVertical: THEME.spacing.lg,
			borderRadius: THEME.radius.lg,
			marginTop: THEME.spacing.lg,
			shadowColor: THEME.colors.primary.amber,
			shadowOffset: { width: 0, height: 4 },
			shadowOpacity: 0.3,
			shadowRadius: 8,
			elevation: 6,
		},
		payButtonDisabled: {
			backgroundColor: "rgba(100, 100, 100, 0.5)",
			shadowOpacity: 0,
		},
		payButtonText: {
			fontSize: THEME.typography.sizes.lg,
			fontWeight: "700",
			color: "#FFF",
			letterSpacing: 0.5,
		},
		notesRow: {
			marginTop: THEME.spacing.md,
		},
		notesHeader: {
			flexDirection: "row",
			alignItems: "center",
			gap: THEME.spacing.xs,
			marginBottom: THEME.spacing.sm,
		},
		notesTime: {
			fontSize: THEME.typography.sizes.xs,
			color: THEME.colors.text.muted,
			fontStyle: "italic",
			marginLeft: "auto",
		},
		notesDisplay: {
			flexDirection: "row",
			alignItems: "flex-start",
			justifyContent: "space-between",
			backgroundColor: THEME.colors.background.elevated,
			padding: THEME.spacing.md,
			borderRadius: THEME.radius.md,
			minHeight: 60,
		},
		notesText: {
			flex: 1,
			fontSize: THEME.typography.sizes.sm,
			color: THEME.colors.text.primary,
			lineHeight: 20,
		},
		notesInput: {
			backgroundColor: THEME.colors.background.input,
			borderRadius: THEME.radius.md,
			padding: THEME.spacing.md,
			color: THEME.colors.text.primary,
			fontSize: THEME.typography.sizes.sm,
			borderWidth: 1,
			borderColor: THEME.colors.border.focus,
			minHeight: 80,
			textAlignVertical: "top",
		},
	});

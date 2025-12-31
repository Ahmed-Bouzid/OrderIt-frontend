// components/elements/ActivityComponents/PaymentSection.jsx
import React, { useMemo } from "react";
import {
	View,
	Text,
	TextInput,
	TouchableOpacity,
	StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import useThemeStore from "../../../src/stores/useThemeStore";
import { getTheme } from "../../../utils/themeUtils";

export const PaymentSection = React.memo(
	({
		activeReservation,
		theme,
		editingStaffNotes,
		setEditingStaffNotes,
		staffNotesValue,
		setStaffNotesValue,
		editField,
	}) => {
		const { themeMode } = useThemeStore();
		const THEME = useMemo(() => getTheme(themeMode), [themeMode]);
		const localStyles = useMemo(() => createStyles(THEME), [THEME]);

		const totalAmount = useMemo(() => {
			if (typeof activeReservation?.totalAmount === "number") {
				return Number(activeReservation.totalAmount).toFixed(2);
			}
			return "0.00";
		}, [activeReservation?.totalAmount]);

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

				{/* Total */}
				<View style={localStyles.row}>
					<Text style={localStyles.label}>Total</Text>
					<View style={localStyles.totalBadge}>
						<Text style={localStyles.totalAmount}>{totalAmount}€</Text>
					</View>
				</View>

				{/* Méthode de paiement */}
				<View style={localStyles.row}>
					<Text style={localStyles.label}>Paiement</Text>
					<View style={localStyles.paymentBadge}>
						<Ionicons
							name={activeReservation?.paymentMethod === "CB" ? "card" : "cash"}
							size={14}
							color={THEME.colors.text.secondary}
						/>
						<Text style={localStyles.value}>
							{activeReservation?.paymentMethod || "Non défini"}
						</Text>
					</View>
				</View>

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
			fontSize: 14,
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
			fontSize: 13,
			fontWeight: "500",
			color: THEME.colors.text.secondary,
		},
		value: {
			fontSize: 14,
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
			fontSize: 18,
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
			fontSize: 11,
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
			fontSize: 14,
			color: THEME.colors.text.primary,
			lineHeight: 20,
		},
		notesInput: {
			backgroundColor: THEME.colors.background.input,
			borderRadius: THEME.radius.md,
			padding: THEME.spacing.md,
			color: THEME.colors.text.primary,
			fontSize: 14,
			borderWidth: 1,
			borderColor: THEME.colors.border.focus,
			minHeight: 80,
			textAlignVertical: "top",
		},
	});

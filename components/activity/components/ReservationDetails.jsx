// components/elements/ActivityComponents/ReservationDetails.jsx
import React, { useMemo, useState, useCallback } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../../hooks/useTheme";
import { ClientAllergenModal } from "../modals/ClientAllergenModal";

const restrictionsOptions = [
	{ label: "Aucune", value: "Aucune", icon: "checkmark-circle" },
	{ label: "Vegan", value: "Vegan", icon: "leaf" },
	{ label: "Sans gluten", value: "Sans gluten", icon: "nutrition" },
	{ label: "Halal", value: "Halal", icon: "restaurant" },
];

export const ReservationDetails = React.memo(
	({
		activeReservation,
		theme,
		editingAllergies,
		setEditingAllergies,
		allergiesValue,
		setAllergiesValue,
		editingNotes,
		setEditingNotes,
		notesValue,
		setNotesValue,
		showRestrictionsOptions,
		setShowRestrictionsOptions,
		editField,
		getElapsed,
		// ⭐ Nouveau: pour les allergènes structurés
		clientAllergens = [],
		setClientAllergens,
	}) => {
		const THEME = useTheme(); // Utilise le hook avec multiplicateur de police
		const localStyles = useMemo(() => createStyles(THEME), [THEME]);

		// ⭐ État pour la modale d'allergènes
		const [showAllergenModal, setShowAllergenModal] = useState(false);

		// Handler pour valider les allergènes sélectionnés
		const handleAllergensValidate = useCallback(
			(selectedAllergens) => {
				setClientAllergens?.(selectedAllergens);
				// Mettre à jour aussi le champ texte pour la persistance
				const allergenNames = selectedAllergens.map((a) => a.name).join(", ");
				editField?.("allergies", allergenNames, true);
				setAllergiesValue?.(allergenNames);
			},
			[setClientAllergens, editField, setAllergiesValue]
		);

		const formattedArrivalTime = useMemo(() => {
			if (!activeReservation?.arrivalTime) return "-";
			try {
				const date = new Date(activeReservation.arrivalTime);
				if (isNaN(date.getTime())) return "-";
				const hours = String(date.getHours()).padStart(2, "0");
				const mins = String(date.getMinutes()).padStart(2, "0");
				return `${hours}:${mins}`;
			} catch {
				return "-";
			}
		}, [activeReservation?.arrivalTime]);

		const formattedReservationDate = useMemo(() => {
			try {
				const date = activeReservation?.reservationDate
					? new Date(activeReservation.reservationDate)
					: null;
				if (!date || isNaN(date.getTime())) return "-";
				return `${date.toLocaleDateString("fr-FR")} à ${
					activeReservation?.reservationTime || "-"
				}`;
			} catch {
				return "-";
			}
		}, [
			activeReservation?.reservationDate,
			activeReservation?.reservationTime,
		]);

		const formattedClientName = useMemo(() => {
			const name = activeReservation?.clientName || "";
			if (!name) return "Non défini";
			return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
		}, [activeReservation?.clientName]);

		if (!activeReservation) {
			return null;
		}

		return (
			<View style={localStyles.block}>
				{/* Header Section */}
				<View style={localStyles.sectionHeader}>
					<Ionicons
						name="document-text"
						size={18}
						color={THEME.colors.primary.amber}
					/>
					<Text style={localStyles.sectionTitle}>Détails réservation</Text>
				</View>

				{/* Info Rows */}
				<View style={localStyles.row}>
					<Text style={localStyles.label}>Nom</Text>
					<Text style={localStyles.value}>{formattedClientName}</Text>
				</View>

				<View style={localStyles.row}>
					<Text style={localStyles.label}>Heure d&apos;arrivée</Text>
					<View style={localStyles.rowRight}>
						<Text style={localStyles.value}>{formattedArrivalTime}</Text>
						<Text style={localStyles.hint}>
							({getElapsed?.(activeReservation?.arrivalTime) || "-"})
						</Text>
					</View>
				</View>

				<View style={localStyles.row}>
					<Text style={localStyles.label}>Date de réservation</Text>
					<Text style={localStyles.value}>{formattedReservationDate}</Text>
				</View>

				{/* Spécificités Section */}
				<View
					style={[localStyles.sectionHeader, { marginTop: THEME.spacing.lg }]}
				>
					<Ionicons
						name="warning"
						size={18}
						color={THEME.colors.primary.amber}
					/>
					<Text style={localStyles.sectionTitle}>Spécificités</Text>
				</View>

				{/* Allergies */}
				<View style={localStyles.row}>
					<Text style={localStyles.label}>Allergies</Text>
					<TouchableOpacity
						style={[
							localStyles.editableField,
							clientAllergens.length > 0 && localStyles.allergenFieldActive,
						]}
						onPress={() => setShowAllergenModal(true)}
					>
						{clientAllergens.length > 0 ? (
							<View style={localStyles.allergenBadges}>
								{clientAllergens.slice(0, 3).map((a) => (
									<View key={a._id} style={localStyles.allergenBadge}>
										<Text style={localStyles.allergenIcon}>{a.icon}</Text>
									</View>
								))}
								{clientAllergens.length > 3 && (
									<Text style={localStyles.allergenMore}>
										+{clientAllergens.length - 3}
									</Text>
								)}
							</View>
						) : (
							<Text style={[localStyles.value, localStyles.placeholder]}>
								Sélectionner...
							</Text>
						)}
						<Ionicons
							name="chevron-forward"
							size={16}
							color={
								clientAllergens.length > 0
									? THEME.colors.status.error
									: THEME.colors.text.muted
							}
						/>
					</TouchableOpacity>
				</View>

				{/* Modale de sélection d'allergènes */}
				<ClientAllergenModal
					visible={showAllergenModal}
					onClose={() => setShowAllergenModal(false)}
					onValidate={handleAllergensValidate}
					selectedAllergenIds={clientAllergens.map((a) => a._id)}
				/>

				{/* Restrictions */}
				<View style={localStyles.row}>
					<Text style={localStyles.label}>Régime</Text>
					{showRestrictionsOptions ? (
						<View style={localStyles.dropdown}>
							{restrictionsOptions.map((opt) => (
								<TouchableOpacity
									key={opt.value}
									style={localStyles.dropdownItem}
									onPress={() => {
										editField?.("restrictions", opt.value, true);
										setShowRestrictionsOptions?.(false);
									}}
								>
									<Ionicons
										name={opt.icon}
										size={16}
										color={THEME.colors.text.secondary}
									/>
									<Text style={localStyles.dropdownText}>{opt.label}</Text>
								</TouchableOpacity>
							))}
						</View>
					) : (
						<TouchableOpacity
							style={localStyles.editableField}
							onPress={() => setShowRestrictionsOptions?.(true)}
						>
							<Text style={localStyles.value}>
								{activeReservation?.restrictions || "Aucune"}
							</Text>
							<Ionicons
								name="chevron-down"
								size={16}
								color={THEME.colors.text.muted}
							/>
						</TouchableOpacity>
					)}
				</View>
			</View>
		);
	}
);

ReservationDetails.displayName = "ReservationDetails";

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
		rowRight: {
			flexDirection: "row",
			alignItems: "center",
			gap: THEME.spacing.sm,
		},
		label: {
			fontSize: THEME.typography.sizes.sm,
			fontWeight: "500",
			color: THEME.colors.text.secondary,
			flex: 1,
		},
		value: {
			fontSize: THEME.typography.sizes.sm,
			fontWeight: "600",
			color: THEME.colors.text.primary,
			textAlign: "right",
		},
		hint: {
			fontSize: THEME.typography.sizes.xs,
			color: THEME.colors.primary.amber,
			fontWeight: "500",
		},
		placeholder: {
			color: THEME.colors.text.muted,
			fontStyle: "italic",
		},
		editableField: {
			flexDirection: "row",
			alignItems: "center",
			gap: THEME.spacing.sm,
			backgroundColor: THEME.colors.background.elevated,
			paddingHorizontal: THEME.spacing.md,
			paddingVertical: THEME.spacing.sm,
			borderRadius: THEME.radius.sm,
			flex: 1,
			marginLeft: THEME.spacing.md,
			justifyContent: "space-between",
		},
		input: {
			flex: 1,
			marginLeft: THEME.spacing.md,
			backgroundColor: THEME.colors.background.input,
			borderRadius: THEME.radius.sm,
			paddingHorizontal: THEME.spacing.md,
			paddingVertical: THEME.spacing.sm,
			color: THEME.colors.text.primary,
			fontSize: THEME.typography.sizes.sm,
			borderWidth: 1,
			borderColor: THEME.colors.border.focus,
			minHeight: 40,
		},
		dropdown: {
			flex: 1,
			marginLeft: THEME.spacing.md,
			backgroundColor: THEME.colors.background.elevated,
			borderRadius: THEME.radius.md,
			borderWidth: 1,
			borderColor: THEME.colors.border.default,
			overflow: "hidden",
		},
		dropdownItem: {
			flexDirection: "row",
			alignItems: "center",
			gap: THEME.spacing.sm,
			paddingHorizontal: THEME.spacing.md,
			paddingVertical: THEME.spacing.sm,
			borderBottomWidth: 1,
			borderBottomColor: THEME.colors.border.subtle,
		},
		dropdownText: {
			fontSize: THEME.typography.sizes.sm,
			color: THEME.colors.text.primary,
			fontWeight: "500",
		},
		// ⭐ Styles pour les allergènes
		allergenFieldActive: {
			backgroundColor: `${THEME.colors.status.error}15`,
			borderWidth: 1,
			borderColor: THEME.colors.status.error,
		},
		allergenBadges: {
			flexDirection: "row",
			alignItems: "center",
			gap: THEME.spacing.xs,
			flex: 1,
		},
		allergenBadge: {
			backgroundColor: `${THEME.colors.status.error}25`,
			paddingHorizontal: THEME.spacing.sm,
			paddingVertical: THEME.spacing.xs,
			borderRadius: THEME.radius.sm,
		},
		allergenIcon: {
			fontSize: THEME.typography.sizes.base,
		},
		allergenMore: {
			fontSize: THEME.typography.sizes.xs,
			fontWeight: "600",
			color: THEME.colors.status.error,
			marginLeft: THEME.spacing.xs,
		},
	});

// components/elements/ActivityComponents/ReservationDetails.jsx
import React, { useMemo } from "react";
import { View, Text, TextInput, TouchableOpacity } from "react-native";
import styles from "../../styles";

const restrictionsOptions = [
	{ label: "Aucune", value: "Aucune" },
	{ label: "Vegan", value: "Vegan" },
	{ label: "Sans gluten", value: "Sans gluten" },
	{ label: "Halal", value: "Halal" },
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
	}) => {
		// ⭐ Valeurs sécurisées avec useMemo - TOUJOURS avant le guard clause
		const safeTheme = useMemo(
			() =>
				theme || { cardColor: "#fff", textColor: "#000", borderColor: "#ddd" },
			[theme]
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

		// ⭐ Guard clause APRÈS tous les hooks
		if (!activeReservation) {
			return null;
		}

		return (
			<View style={[styles.block, { backgroundColor: safeTheme.cardColor }]}>
				<Text style={[styles.blockTitle, { color: safeTheme.textColor }]}>
					Détails réservation
				</Text>

				<View style={[styles.row, { backgroundColor: safeTheme.cardColor }]}>
					<Text style={[styles.label, { color: safeTheme.textColor }]}>
						Nom :
					</Text>
					<Text style={[styles.value, { color: safeTheme.textColor }]}>
						{formattedClientName}
					</Text>
				</View>

				<View style={[styles.row, { backgroundColor: safeTheme.cardColor }]}>
					<Text style={[styles.label, { color: safeTheme.textColor }]}>
						Arrivée :
					</Text>
					<Text style={[styles.value, { color: safeTheme.textColor }]}>
						{formattedArrivalTime}
					</Text>
					<Text
						style={[styles.hint, { color: safeTheme.textColor, opacity: 0.7 }]}
					>
						({getElapsed?.(activeReservation?.arrivalTime) || "-"})
					</Text>
				</View>

				<View style={[styles.row, { backgroundColor: safeTheme.cardColor }]}>
					<Text style={[styles.label, { color: safeTheme.textColor }]}>
						Date réservation :
					</Text>
					<Text style={[styles.value, { color: safeTheme.textColor }]}>
						{formattedReservationDate}
					</Text>
				</View>

				<Text style={[styles.blockTitle, { color: safeTheme.textColor }]}>
					Spécificités
				</Text>

				{/* Allergies */}
				<View style={[styles.row, { marginBottom: 4 }]}>
					<Text style={[styles.label, { color: safeTheme.textColor }]}>
						Allergies :
					</Text>
					{editingAllergies ? (
						<TextInput
							style={[
								styles.value,
								{
									borderBottomWidth: 1,
									borderColor: safeTheme.borderColor,
									minHeight: 40,
									color: safeTheme.textColor,
								},
							]}
							value={allergiesValue || ""}
							onChangeText={(text) => {
								setAllergiesValue?.(text);
								editField?.("allergies", text, false);
							}}
							onBlur={() => {
								editField?.("allergies", allergiesValue, true);
								setEditingAllergies?.(false);
							}}
							autoFocus
							multiline
							placeholderTextColor={safeTheme.textColor}
						/>
					) : (
						<TouchableOpacity
							onPress={() => {
								setAllergiesValue?.(activeReservation?.allergies || "");
								setEditingAllergies?.(true);
							}}
						>
							<Text style={[styles.value, { color: safeTheme.textColor }]}>
								{activeReservation?.allergies || "Aucune"}
								{!activeReservation?.allergies
									? " (toucher pour modifier)"
									: ""}
							</Text>
						</TouchableOpacity>
					)}
				</View>

				{/* Restrictions */}
				<View style={[styles.row, { marginBottom: 4 }]}>
					<Text style={[styles.label, { color: safeTheme.textColor }]}>
						Restrictions :
					</Text>
					<View style={{ flex: 1 }}>
						{showRestrictionsOptions ? (
							<View
								style={[
									styles.simpleDropdown,
									{
										backgroundColor: safeTheme.cardColor,
										borderColor: safeTheme.borderColor,
									},
								]}
							>
								{restrictionsOptions.map((opt) => (
									<TouchableOpacity
										key={opt.value}
										style={[
											styles.simpleDropdownItem,
											{ backgroundColor: safeTheme.cardColor },
										]}
										onPress={() => {
											editField?.("restrictions", opt.value, true);
											setShowRestrictionsOptions?.(false);
										}}
									>
										<Text
											style={[
												styles.dropdownOptionText,
												{ color: safeTheme.textColor },
											]}
										>
											{opt.label}
										</Text>
									</TouchableOpacity>
								))}
							</View>
						) : (
							<TouchableOpacity
								style={[
									styles.valueButton,
									{
										backgroundColor: safeTheme.cardColor,
										borderColor: safeTheme.borderColor,
									},
								]}
								onPress={() => setShowRestrictionsOptions?.(true)}
							>
								<Text style={[styles.value, { color: safeTheme.textColor }]}>
									{activeReservation?.restrictions || "Aucune"}
								</Text>
							</TouchableOpacity>
						)}
					</View>
				</View>

				{/* Observations */}
				<View style={[styles.row, { marginBottom: 0 }]}>
					<Text style={[styles.label, { color: safeTheme.textColor }]}>
						Observations :
					</Text>
					{editingNotes ? (
						<TextInput
							style={[
								styles.value,
								{
									borderBottomWidth: 1,
									borderColor: safeTheme.borderColor,
									minHeight: 40,
									color: safeTheme.textColor,
								},
							]}
							value={notesValue || ""}
							onChangeText={(text) => {
								setNotesValue?.(text);
								editField?.("notes", text, false);
							}}
							onBlur={() => {
								editField?.("notes", notesValue, true);
								setEditingNotes?.(false);
							}}
							autoFocus
							multiline
							placeholderTextColor={safeTheme.textColor}
						/>
					) : (
						<TouchableOpacity
							onPress={() => {
								setNotesValue?.(activeReservation?.notes || "");
								setEditingNotes?.(true);
							}}
						>
							<Text style={[styles.value, { color: safeTheme.textColor }]}>
								{activeReservation?.notes || "Ajouter une observation..."}
							</Text>
						</TouchableOpacity>
					)}
				</View>
			</View>
		);
	}
);

ReservationDetails.displayName = "ReservationDetails";

// components/elements/ActivityComponents/PaymentSection.jsx
import React, { useMemo } from "react";
import { View, Text, TextInput, TouchableOpacity } from "react-native";
import styles from "../../styles";

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
		// ⭐ Valeurs sécurisées avec useMemo - TOUJOURS avant le guard clause
		const safeTheme = useMemo(
			() =>
				theme || { cardColor: "#fff", textColor: "#000", borderColor: "#ddd" },
			[theme]
		);

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

		// ⭐ Guard clause APRÈS tous les hooks
		if (!activeReservation) {
			return null;
		}

		return (
			<View style={[styles.block, { backgroundColor: safeTheme.cardColor }]}>
				<Text style={[styles.blockTitle, { color: safeTheme.textColor }]}>
					Paiement & notes
				</Text>
				<View style={[styles.row, { backgroundColor: safeTheme.cardColor }]}>
					<Text style={[styles.label, { color: safeTheme.textColor }]}>
						Total :
					</Text>
					<Text style={[styles.value, { color: safeTheme.textColor }]}>
						{`${totalAmount}€`}
					</Text>
				</View>
				<View style={[styles.row, { backgroundColor: safeTheme.cardColor }]}>
					<Text style={[styles.label, { color: safeTheme.textColor }]}>
						Paiement :
					</Text>
					<Text style={[styles.value, { color: safeTheme.textColor }]}>
						{activeReservation?.paymentMethod || "Non défini"}
					</Text>
				</View>
				<View style={[styles.row, { backgroundColor: safeTheme.cardColor }]}>
					<Text style={[styles.label, { color: safeTheme.textColor }]}>
						Notes staff :
					</Text>
					{editingStaffNotes ? (
						<TextInput
							style={[
								styles.value,
								{
									flex: 1,
									borderBottomWidth: 1,
									borderColor: safeTheme.borderColor,
									minHeight: 40,
									color: safeTheme.textColor,
								},
							]}
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
							placeholderTextColor={safeTheme.textColor}
						/>
					) : (
						<TouchableOpacity
							onPress={() => {
								setStaffNotesValue?.(activeReservation?.staffNotes || "");
								setEditingStaffNotes?.(true);
							}}
							style={{ flex: 1 }}
						>
							<Text style={[styles.value, { color: safeTheme.textColor }]}>
								{activeReservation?.staffNotes || "Ajouter une note..."}
							</Text>
							{formattedStaffNotesTime && (
								<Text
									style={{
										fontSize: 10,
										color: safeTheme.textColor,
										opacity: 0.6,
										fontStyle: "italic",
										marginTop: 4,
									}}
								>
									{formattedStaffNotesTime}
								</Text>
							)}
						</TouchableOpacity>
					)}
				</View>
			</View>
		);
	}
);

PaymentSection.displayName = "PaymentSection";

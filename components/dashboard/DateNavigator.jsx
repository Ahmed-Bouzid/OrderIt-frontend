/**
 * 📅 DateNavigator - Composant de navigation par date
 * Affiche la date sélectionnée avec navigation jour par jour
 */
import React, { useState } from "react";
import {
	View,
	Text,
	TouchableOpacity,
	StyleSheet,
	Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../hooks/useTheme";
import DatePickerModal from "./DatePickerModal";

export default function DateNavigator({ selectedDate, onDateChange }) {
	const THEME = useTheme();
	const [showDatePicker, setShowDatePicker] = useState(false);

	// Formater la date en français : "Lundi 5 janvier"
	const formatDate = (date) => {
		const days = [
			"Dimanche",
			"Lundi",
			"Mardi",
			"Mercredi",
			"Jeudi",
			"Vendredi",
			"Samedi",
		];
		const months = [
			"janvier",
			"février",
			"mars",
			"avril",
			"mai",
			"juin",
			"juillet",
			"août",
			"septembre",
			"octobre",
			"novembre",
			"décembre",
		];

		const dayName = days[date.getDay()];
		const day = date.getDate();
		const monthName = months[date.getMonth()];

		return `${dayName} ${day} ${monthName}`;
	};

	// Navigation jour précédent
	const handlePreviousDay = () => {
		const newDate = new Date(selectedDate);
		newDate.setDate(newDate.getDate() - 1);
		onDateChange(newDate);
	};

	// Navigation jour suivant
	const handleNextDay = () => {
		const newDate = new Date(selectedDate);
		newDate.setDate(newDate.getDate() + 1);
		onDateChange(newDate);
	};

	const styles = createStyles(THEME);

	return (
		<View style={styles.container}>
			<TouchableOpacity
				style={styles.arrowButton}
				onPress={handlePreviousDay}
				activeOpacity={0.7}
			>
				<Ionicons
					name="chevron-back"
					size={22}
					color={THEME.colors.primary.amber}
				/>
			</TouchableOpacity>

			<TouchableOpacity
				style={styles.dateButton}
				onPress={() => setShowDatePicker(true)}
				activeOpacity={0.7}
			>
				<Ionicons
					name="calendar-outline"
					size={18}
					color={THEME.colors.primary.amber}
					style={styles.calendarIcon}
				/>
				<Text style={styles.dateText}>{formatDate(selectedDate)}</Text>
			</TouchableOpacity>

			<TouchableOpacity
				style={styles.arrowButton}
				onPress={handleNextDay}
				activeOpacity={0.7}
			>
				<Ionicons
					name="chevron-forward"
					size={22}
					color={THEME.colors.primary.amber}
				/>
			</TouchableOpacity>

			<DatePickerModal
				visible={showDatePicker}
				selectedDate={selectedDate}
				onDateChange={onDateChange}
				onClose={() => setShowDatePicker(false)}
			/>
		</View>
	);
}

const createStyles = (THEME) =>
	StyleSheet.create({
		container: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "center",
			paddingVertical: 12,
			paddingHorizontal: 16,
			marginBottom: 8,
		},
		arrowButton: {
			width: 40,
			height: 40,
			borderRadius: 20,
			backgroundColor: THEME.colors.background.card + "40",
			alignItems: "center",
			justifyContent: "center",
			...Platform.select({
				ios: {
					shadowColor: THEME.colors.primary.amber,
					shadowOffset: { width: 0, height: 2 },
					shadowOpacity: 0.15,
					shadowRadius: 4,
				},
				android: {
					elevation: 3,
				},
			}),
		},
		dateButton: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "center",
			paddingHorizontal: 16,
			paddingVertical: 10,
			marginHorizontal: 8,
			borderRadius: 12,
			backgroundColor: THEME.colors.background.card,
			width: 250,
			...Platform.select({
				ios: {
					shadowColor: THEME.colors.primary.amber,
					shadowOffset: { width: 0, height: 2 },
					shadowOpacity: 0.2,
					shadowRadius: 6,
				},
				android: {
					elevation: 4,
				},
			}),
		},
		calendarIcon: {
			marginRight: 8,
		},
		dateText: {
			fontSize: THEME.typography.sizes.md,
			fontWeight: "600",
			color: THEME.colors.text.primary,
			letterSpacing: 0.3,
		},
	});

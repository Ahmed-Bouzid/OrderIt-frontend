/**
 * 📆 DatePickerModal - Modal de sélection de date
 * Interface simple et intuitive avec calendrier
 */
import React, { useState, useMemo, useCallback } from "react";
import {
	View,
	Text,
	TouchableOpacity,
	Modal,
	StyleSheet,
	Platform,
	ScrollView,
} from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../hooks/useTheme";

export default function DatePickerModal({
	visible,
	selectedDate,
	onDateChange,
	onClose,
}) {
	const THEME = useTheme();
	const [viewDate, setViewDate] = useState(selectedDate);

	const monthNames = [
		"Janvier",
		"Février",
		"Mars",
		"Avril",
		"Mai",
		"Juin",
		"Juillet",
		"Août",
		"Septembre",
		"Octobre",
		"Novembre",
		"Décembre",
	];

	const dayNames = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

	// Générer les jours du mois
	const generateCalendar = useCallback(() => {
		const year = viewDate.getFullYear();
		const month = viewDate.getMonth();

		const firstDay = new Date(year, month, 1);
		const lastDay = new Date(year, month + 1, 0);

		const startOffset = firstDay.getDay();
		const daysInMonth = lastDay.getDate();

		const days = [];

		// Jours vides avant le premier jour
		for (let i = 0; i < startOffset; i++) {
			days.push({ date: null, isEmpty: true });
		}

		// Jours du mois
		for (let i = 1; i <= daysInMonth; i++) {
			days.push({
				date: new Date(year, month, i),
				isEmpty: false,
			});
		}

		return days;
	}, [viewDate]);

	const calendar = useMemo(() => generateCalendar(), [generateCalendar]);

	const handlePreviousMonth = () => {
		const newDate = new Date(viewDate);
		newDate.setMonth(newDate.getMonth() - 1);
		setViewDate(newDate);
	};

	const handleNextMonth = () => {
		const newDate = new Date(viewDate);
		newDate.setMonth(newDate.getMonth() + 1);
		setViewDate(newDate);
	};

	const handleSelectDate = (date) => {
		if (date) {
			onDateChange(date);
			onClose();
		}
	};

	const isToday = (date) => {
		if (!date) return false;
		const today = new Date();
		return (
			date.getDate() === today.getDate() &&
			date.getMonth() === today.getMonth() &&
			date.getFullYear() === today.getFullYear()
		);
	};

	const isSelected = (date) => {
		if (!date || !selectedDate) return false;
		return (
			date.getDate() === selectedDate.getDate() &&
			date.getMonth() === selectedDate.getMonth() &&
			date.getFullYear() === selectedDate.getFullYear()
		);
	};

	const styles = createStyles(THEME);

	return (
		<Modal
			visible={visible}
			transparent
			animationType="fade"
			onRequestClose={onClose}
		>
			<TouchableOpacity
				style={styles.backdrop}
				activeOpacity={1}
				onPress={onClose}
			>
				<BlurView intensity={60} style={StyleSheet.absoluteFill}>
					<View style={styles.darkOverlay} />
				</BlurView>

				<TouchableOpacity
					activeOpacity={1}
					onPress={(e) => e.stopPropagation()}
					style={styles.modalContainer}
				>
					<View style={styles.modalContent}>
						{/* Header avec mois/année */}
						<View style={styles.header}>
							<TouchableOpacity
								onPress={handlePreviousMonth}
								style={styles.headerButton}
							>
								<Ionicons
									name="chevron-back"
									size={24}
									color={THEME.colors.primary.amber}
								/>
							</TouchableOpacity>

							<Text style={styles.headerTitle}>
								{monthNames[viewDate.getMonth()]} {viewDate.getFullYear()}
							</Text>

							<TouchableOpacity
								onPress={handleNextMonth}
								style={styles.headerButton}
							>
								<Ionicons
									name="chevron-forward"
									size={24}
									color={THEME.colors.primary.amber}
								/>
							</TouchableOpacity>
						</View>

						{/* Jours de la semaine */}
						<View style={styles.weekDays}>
							{dayNames.map((day, index) => (
								<View key={index} style={styles.weekDayCell}>
									<Text style={styles.weekDayText}>{day}</Text>
								</View>
							))}
						</View>

						{/* Calendrier */}
						<ScrollView
							style={styles.calendarScroll}
							contentContainerStyle={styles.calendar}
						>
							{calendar.map((item, index) => {
								if (item.isEmpty) {
									return <View key={`empty-${index}`} style={styles.dayCell} />;
								}

								const today = isToday(item.date);
								const selected = isSelected(item.date);

								return (
									<TouchableOpacity
										key={index}
										style={[
											styles.dayCell,
											today && styles.todayCell,
											selected && styles.selectedCell,
										]}
										onPress={() => handleSelectDate(item.date)}
									>
										<Text
											style={[
												styles.dayText,
												today && styles.todayText,
												selected && styles.selectedText,
											]}
										>
											{item.date.getDate()}
										</Text>
									</TouchableOpacity>
								);
							})}
						</ScrollView>

						{/* Bouton fermer */}
						<TouchableOpacity style={styles.closeButton} onPress={onClose}>
							<Text style={styles.closeButtonText}>Fermer</Text>
						</TouchableOpacity>
					</View>
				</TouchableOpacity>
			</TouchableOpacity>
		</Modal>
	);
}

const createStyles = (THEME) =>
	StyleSheet.create({
		backdrop: {
			flex: 1,
			justifyContent: "center",
			alignItems: "center",
		},
		darkOverlay: {
			...StyleSheet.absoluteFillObject,
			backgroundColor: "rgba(0, 0, 0, 0.75)",
		},
		modalContainer: {
			width: "90%",
			maxWidth: 400,
		},
		modalContent: {
			backgroundColor: THEME.colors.background.primary + "F8",
			borderRadius: 20,
			padding: 20,
			...Platform.select({
				ios: {
					shadowColor: "#000",
					shadowOffset: { width: 0, height: 4 },
					shadowOpacity: 0.3,
					shadowRadius: 10,
				},
				android: {
					elevation: 8,
				},
			}),
		},
		header: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "space-between",
			marginBottom: 20,
		},
		headerButton: {
			padding: 8,
		},
		headerTitle: {
			fontSize: THEME.typography.sizes.lg,
			fontWeight: "700",
			color: THEME.colors.text.primary,
		},
		weekDays: {
			flexDirection: "row",
			marginBottom: 10,
		},
		weekDayCell: {
			flex: 1,
			alignItems: "center",
			paddingVertical: 8,
		},
		weekDayText: {
			fontSize: THEME.typography.sizes.xs,
			fontWeight: "600",
			color: THEME.colors.text.muted,
		},
		calendarScroll: {
			maxHeight: 320,
		},
		calendar: {
			flexDirection: "row",
			flexWrap: "wrap",
		},
		dayCell: {
			width: "14.28%",
			aspectRatio: 1,
			alignItems: "center",
			justifyContent: "center",
			marginBottom: 8,
		},
		todayCell: {
			backgroundColor: "#FFFFFF",
			borderRadius: 8,
			borderWidth: 2,
			borderColor: "#FFFFFF",
		},
		selectedCell: {
			backgroundColor: THEME.colors.primary.amber,
			borderRadius: 8,
		},
		dayText: {
			fontSize: THEME.typography.sizes.sm,
			color: THEME.colors.text.primary,
			fontWeight: "500",
		},
		todayText: {
			fontWeight: "700",
			color: THEME.colors.primary.sky,
		},
		selectedText: {
			fontWeight: "700",
			color: "#000",
		},
		closeButton: {
			marginTop: 16,
			paddingVertical: 12,
			borderRadius: 12,
			backgroundColor: THEME.colors.background.card + "80",
			alignItems: "center",
		},
		closeButtonText: {
			fontSize: THEME.typography.sizes.md,
			fontWeight: "600",
			color: THEME.colors.text.primary,
		},
	});

/**
 * WeekView.jsx — Vue semaine avec taux de remplissage par jour
 * Réutilise monthlyCounts déjà fetché par DateNavigator — 0 appel API
 */
import React, { useMemo, useCallback } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../hooks/useTheme";

const DAY_NAMES = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

/**
 * Retourne les 7 jours de la semaine contenant `date` (lundi → dimanche)
 */
const getWeekDays = (date) => {
	const d = new Date(date);
	const day = d.getDay(); // 0=dim, 1=lun...
	const diff = day === 0 ? -6 : 1 - day; // recaler au lundi
	const monday = new Date(d);
	monday.setDate(d.getDate() + diff);
	monday.setHours(0, 0, 0, 0);

	return Array.from({ length: 7 }, (_, i) => {
		const dd = new Date(monday);
		dd.setDate(monday.getDate() + i);
		return dd;
	});
};

const toKey = (d) => {
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, "0");
	const dd = String(d.getDate()).padStart(2, "0");
	return `${y}-${m}-${dd}`;
};

const isToday = (d) => {
	const now = new Date();
	return (
		d.getDate() === now.getDate() &&
		d.getMonth() === now.getMonth() &&
		d.getFullYear() === now.getFullYear()
	);
};

const isSameDay = (a, b) =>
	a.getDate() === b.getDate() &&
	a.getMonth() === b.getMonth() &&
	a.getFullYear() === b.getFullYear();

const WeekView = React.memo(
	({ selectedDate, onDayPress, monthlyCounts = {}, tablesCount = 0 }) => {
		const THEME = useTheme();
		const styles = useMemo(() => createStyles(THEME), [THEME]);

		const weekDays = useMemo(() => getWeekDays(selectedDate), [selectedDate]);

		const handlePrevWeek = useCallback(() => {
			const newDate = new Date(selectedDate);
			newDate.setDate(newDate.getDate() - 7);
			onDayPress?.(newDate);
		}, [selectedDate, onDayPress]);

		const handleNextWeek = useCallback(() => {
			const newDate = new Date(selectedDate);
			newDate.setDate(newDate.getDate() + 7);
			onDayPress?.(newDate);
		}, [selectedDate, onDayPress]);

		const weekLabel = useMemo(() => {
			const first = weekDays[0];
			const last = weekDays[6];
			const months = [
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
			if (first.getMonth() === last.getMonth()) {
				return `${months[first.getMonth()]} ${first.getFullYear()}`;
			}
			if (first.getFullYear() === last.getFullYear()) {
				return `${months[first.getMonth()]} – ${months[last.getMonth()]} ${last.getFullYear()}`;
			}
			return `${months[first.getMonth()]} ${first.getFullYear()} – ${months[last.getMonth()]} ${last.getFullYear()}`;
		}, [weekDays]);

		return (
			<View style={styles.wrapper}>
				<Text style={styles.weekLabel}>{weekLabel}</Text>

				{/* Flèche gauche + Jours + Flèche droite */}
				<View style={styles.daysRow}>
					<TouchableOpacity
						style={styles.arrowButton}
						onPress={handlePrevWeek}
						activeOpacity={0.7}
					>
						<Ionicons
							name="chevron-back"
							size={16}
							color={THEME.colors.primary.amber}
						/>
					</TouchableOpacity>

					{weekDays.map((day, index) => {
						const key = toKey(day);
						const count = monthlyCounts[key] || 0;
						const selected = isSameDay(day, selectedDate);
						const today = isToday(day);
						const total = tablesCount || 1;
						const ratio = Math.min(count / total, 1);

						let dotColor = THEME.colors.text.muted;
						if (count > 0) {
							if (ratio >= 0.9) dotColor = "#EF4444";
							else if (ratio >= 0.7) dotColor = "#F59E0B";
							else dotColor = "#10B981";
						}

						return (
							<TouchableOpacity
								key={key}
								style={[
									styles.dayCell,
									selected && styles.dayCellSelected,
									today && !selected && styles.dayCellToday,
								]}
								onPress={() => onDayPress?.(day)}
								activeOpacity={0.7}
							>
								<Text
									style={[styles.dayName, selected && styles.dayNameSelected]}
								>
									{DAY_NAMES[index]}
								</Text>
								<Text
									style={[
										styles.dayNumber,
										selected && styles.dayNumberSelected,
										today && !selected && styles.dayNumberToday,
									]}
								>
									{day.getDate()}
								</Text>
								{count > 0 ? (
									<View style={styles.countRow}>
										<View
											style={[styles.countDot, { backgroundColor: dotColor }]}
										/>
										<Text style={[styles.countText, { color: dotColor }]}>
											{count}
										</Text>
									</View>
								) : (
									<Text style={styles.countEmpty}>—</Text>
								)}
							</TouchableOpacity>
						);
					})}

					<TouchableOpacity
						style={styles.arrowButton}
						onPress={handleNextWeek}
						activeOpacity={0.7}
					>
						<Ionicons
							name="chevron-forward"
							size={16}
							color={THEME.colors.primary.amber}
						/>
					</TouchableOpacity>
				</View>
			</View>
		);
	},
);

const createStyles = (THEME) =>
	StyleSheet.create({
		wrapper: {
			marginHorizontal: 12,
			marginTop: 6,
			marginBottom: 4,
		},
		weekLabel: {
			fontSize: 14,
			fontWeight: "600",
			color: THEME.colors.text.secondary,
			textAlign: "center",
			marginBottom: 6,
			letterSpacing: 0.3,
		},
		arrowButton: {
			width: 26,
			alignItems: "center",
			justifyContent: "center",
			opacity: 0.8,
		},
		daysRow: {
			alignItems: "center",
			flexDirection: "row",
			backgroundColor: THEME.colors.background.card,
			borderRadius: 14,
			borderWidth: 1,
			borderColor: THEME.colors.border.subtle,
			padding: 4,
			gap: 2,
		},
		dayCell: {
			flex: 1,
			alignItems: "center",
			paddingVertical: 8,
			borderRadius: 10,
		},
		dayCellSelected: {
			backgroundColor: `${THEME.colors.primary.amber}20`,
			borderWidth: 1,
			borderColor: `${THEME.colors.primary.amber}60`,
		},
		dayCellToday: {
			backgroundColor: `${THEME.colors.text.muted}10`,
		},
		dayName: {
			fontSize: 10,
			fontWeight: "600",
			color: THEME.colors.text.muted,
			textTransform: "uppercase",
			letterSpacing: 0.5,
			marginBottom: 2,
		},
		dayNameSelected: {
			color: THEME.colors.primary.amber,
		},
		dayNumber: {
			fontSize: 16,
			fontWeight: "700",
			color: THEME.colors.text.primary,
			marginBottom: 4,
		},
		dayNumberSelected: {
			color: THEME.colors.primary.amber,
		},
		dayNumberToday: {
			color: THEME.colors.primary.sky,
		},
		countRow: {
			flexDirection: "row",
			alignItems: "center",
			gap: 2,
		},
		countDot: {
			width: 5,
			height: 5,
			borderRadius: 2.5,
		},
		countText: {
			fontSize: 10,
			fontWeight: "700",
		},
		countEmpty: {
			fontSize: 10,
			color: THEME.colors.text.muted,
		},
	});

WeekView.displayName = "WeekView";

export default WeekView;

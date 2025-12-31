/**
 * TimerComponent.jsx - Timer MM:SS pour items en préparation
 */
import React, { useState, useEffect, useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

/**
 * Formate une durée en millisecondes en MM:SS
 */
const formatTime = (ms) => {
	const totalSeconds = Math.floor(ms / 1000);
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};

/**
 * Obtient la couleur du timer en fonction de la durée
 */
const getTimerColor = (minutes) => {
	if (minutes < 5) return "#10B981"; // Green
	if (minutes < 10) return "#FBBF24"; // Amber
	if (minutes < 15) return "#F97316"; // Orange
	return "#EF4444"; // Red
};

const TimerComponent = React.memo(
	({ startTime, endTime, isCompleted = false, THEME }) => {
		const [elapsed, setElapsed] = useState(0);

		// Calcul de la durée écoulée
		useEffect(() => {
			if (isCompleted) {
				// Afficher le temps final
				if (startTime && endTime) {
					const duration =
						new Date(endTime).getTime() - new Date(startTime).getTime();
					setElapsed(duration);
				}
				return;
			}

			if (!startTime) return;

			// Timer en cours
			const updateTimer = () => {
				const now = Date.now();
				const start = new Date(startTime).getTime();
				setElapsed(now - start);
			};

			updateTimer();
			const interval = setInterval(updateTimer, 1000);

			return () => clearInterval(interval);
		}, [startTime, endTime, isCompleted]);

		const formattedTime = useMemo(() => formatTime(elapsed), [elapsed]);
		const minutes = Math.floor(elapsed / 60000);
		const timerColor = useMemo(
			() => (isCompleted ? THEME.colors.text.muted : getTimerColor(minutes)),
			[minutes, isCompleted, THEME]
		);

		const styles = useMemo(
			() => createStyles(THEME, timerColor, isCompleted),
			[THEME, timerColor, isCompleted]
		);

		return (
			<View style={styles.container}>
				<Ionicons
					name={isCompleted ? "checkmark-circle" : "time"}
					size={16}
					color={timerColor}
				/>
				<Text style={styles.timeText}>{formattedTime}</Text>
			</View>
		);
	}
);

TimerComponent.displayName = "TimerComponent";

const createStyles = (THEME, timerColor, isCompleted) =>
	StyleSheet.create({
		container: {
			flexDirection: "row",
			alignItems: "center",
			gap: THEME.spacing.xs,
			backgroundColor: isCompleted
				? "rgba(100, 116, 139, 0.1)"
				: `${timerColor}15`,
			paddingHorizontal: THEME.spacing.sm,
			paddingVertical: THEME.spacing.xs,
			borderRadius: THEME.radius.md,
			borderWidth: 1,
			borderColor: isCompleted ? THEME.colors.border.default : timerColor,
		},
		timeText: {
			fontSize: 14,
			fontWeight: "700",
			color: timerColor,
			fontVariant: ["tabular-nums"],
		},
	});

export default TimerComponent;

/**
 * ServiceCapacityBanner.jsx — Indicateur de charge midi/soir
 * Calcul 100% frontend depuis les réservations déjà disponibles
 */
import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../hooks/useTheme";

const SERVICE_RANGES = [
	{ key: "lunch", label: "Midi", icon: "sunny-outline", start: 11, end: 15 },
	{ key: "dinner", label: "Soir", icon: "moon-outline", start: 18, end: 23 },
];

const ServiceCapacityBanner = React.memo(
	({ reservations = [], tablesCount = 0 }) => {
		const THEME = useTheme();

		const serviceData = useMemo(() => {
			return SERVICE_RANGES.map((service) => {
				const count = reservations.filter((r) => {
					if (
						!r?.reservationTime ||
						r.status === "annulée" ||
						r.status === "terminée"
					)
						return false;
					const hour = parseInt(r.reservationTime.split(":")[0], 10);
					return hour >= service.start && hour < service.end;
				}).length;

				const total = tablesCount || 1;
				const ratio = Math.min(count / total, 1);
				const percent = Math.round(ratio * 100);

				let color = "#10B981"; // vert
				if (ratio >= 0.9)
					color = "#EF4444"; // rouge
				else if (ratio >= 0.7) color = "#F59E0B"; // ambre

				return { ...service, count, total, ratio, percent, color };
			});
		}, [reservations, tablesCount]);

		const styles = useMemo(() => createStyles(THEME), [THEME]);

		if (tablesCount === 0) return null;

		return (
			<View style={styles.container}>
				{serviceData.map((s) => (
					<View key={s.key} style={styles.serviceRow}>
						<View style={styles.labelRow}>
							<Ionicons
								name={s.icon}
								size={14}
								color={s.color}
								style={{ marginRight: 6 }}
							/>
							<Text style={styles.label}>
								{s.label} {s.start}h-{s.end}h
							</Text>
						</View>
						<View style={styles.barContainer}>
							<View
								style={[
									styles.barFill,
									{
										width: `${Math.max(s.percent, 2)}%`,
										backgroundColor: s.color,
									},
								]}
							/>
						</View>
						<Text style={[styles.countText, { color: s.color }]}>
							{s.count}/{s.total}
							{s.percent >= 100 ? "  COMPLET" : ""}
						</Text>
					</View>
				))}
			</View>
		);
	},
);

const createStyles = (THEME) =>
	StyleSheet.create({
		container: {
			marginHorizontal: 16,
			marginTop: 8,
			marginBottom: 4,
			padding: 12,
			backgroundColor: THEME.colors.background.card,
			borderRadius: 14,
			borderWidth: 1,
			borderColor: THEME.colors.border.subtle,
			gap: 8,
		},
		serviceRow: {
			flexDirection: "row",
			alignItems: "center",
			gap: 8,
		},
		labelRow: {
			flexDirection: "row",
			alignItems: "center",
			width: 100,
		},
		label: {
			fontSize: 12,
			fontWeight: "600",
			color: THEME.colors.text.secondary,
		},
		barContainer: {
			flex: 1,
			height: 6,
			borderRadius: 3,
			backgroundColor: `${THEME.colors.text.muted}20`,
			overflow: "hidden",
		},
		barFill: {
			height: "100%",
			borderRadius: 3,
		},
		countText: {
			fontSize: 11,
			fontWeight: "700",
			width: 70,
			textAlign: "right",
		},
	});

ServiceCapacityBanner.displayName = "ServiceCapacityBanner";

export default ServiceCapacityBanner;

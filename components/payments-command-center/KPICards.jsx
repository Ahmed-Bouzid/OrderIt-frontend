// components/payments-command-center/KPICards.jsx
import React, { memo, useEffect, useRef } from "react";
import { View, Text, StyleSheet, Platform, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import T from "./theme";

/**
 * Carte KPI individuelle — gros chiffres, accent couleur, icône
 */
const KPICard = memo(({ label, value, icon, color, colorDim, suffix = "€", count }) => {
	const scaleAnim = useRef(new Animated.Value(1)).current;
	const prevValue = useRef(value);

	useEffect(() => {
		if (prevValue.current !== value) {
			prevValue.current = value;
			Animated.sequence([
				Animated.timing(scaleAnim, {
					toValue: 1.04,
					duration: 150,
					useNativeDriver: true,
				}),
				Animated.timing(scaleAnim, {
					toValue: 1,
					duration: 150,
					useNativeDriver: true,
				}),
			]).start();
		}
	}, [value, scaleAnim]);

	return (
		<Animated.View
			style={[
				s.card,
				{ borderLeftColor: color, transform: [{ scale: scaleAnim }] },
			]}
		>
			<View style={[s.iconWrap, { backgroundColor: colorDim }]}>
				<Ionicons name={icon} size={18} color={color} />
			</View>
			<Text style={s.label}>{label}</Text>
			<Text style={[s.bigNumber, { color }]}>
				{typeof value === "number" ? value.toLocaleString("fr-FR", { minimumFractionDigits: 2 }) : value}
				<Text style={s.suffix}>{suffix}</Text>
			</Text>
			{count !== undefined && (
				<Text style={s.count}>{count} opération{count > 1 ? "s" : ""}</Text>
			)}
		</Animated.View>
	);
});

KPICard.displayName = "KPICard";

/**
 * Grille de KPI — vue instantanée
 */
const KPICards = memo(({ kpis, isCompact }) => {
	if (!kpis) return null;

	const cards = [
		{
			key: "total",
			label: "Total encaissé",
			value: kpis.totalToday,
			icon: "wallet-outline",
			color: T.accent.green,
			colorDim: T.accent.greenDim,
		},
		{
			key: "online",
			label: "En ligne",
			value: kpis.online.total,
			icon: "card-outline",
			color: T.accent.blue,
			colorDim: T.accent.blueDim,
			count: kpis.online.count,
		},
		{
			key: "counter",
			label: "Comptoir",
			value: kpis.counter.total,
			icon: "cash-outline",
			color: T.accent.purple,
			colorDim: T.accent.purpleDim,
			count: kpis.counter.count,
		},
		{
			key: "pending",
			label: "En attente",
			value: kpis.pending.total,
			icon: "time-outline",
			color: T.accent.amber,
			colorDim: T.accent.amberDim,
			count: kpis.pending.count,
		},
		{
			key: "failed",
			label: "Refusés",
			value: kpis.failed.total,
			icon: "close-circle-outline",
			color: T.accent.red,
			colorDim: T.accent.redDim,
			count: kpis.failed.count,
		},
	];

	if (isCompact) {
		return (
			<View style={s.compactRow}>
				{cards.slice(0, 3).map((c) => (
					<View key={c.key} style={s.compactCard}>
						<Ionicons name={c.icon} size={14} color={c.color} />
						<Text style={[s.compactValue, { color: c.color }]}>
							{c.value.toLocaleString("fr-FR", { minimumFractionDigits: 2 })}€
						</Text>
					</View>
				))}
			</View>
		);
	}

	return (
		<View style={s.grid}>
			{cards.map(({ key, ...cardProps }) => (
				<KPICard key={key} {...cardProps} />
			))}
		</View>
	);
});

KPICards.displayName = "KPICards";

const s = StyleSheet.create({
	grid: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: 10,
		paddingHorizontal: T.spacing.lg,
		paddingVertical: T.spacing.md,
	},
	card: {
		flex: 1,
		minWidth: 140,
		backgroundColor: T.bg.secondary,
		borderRadius: T.radius.lg,
		borderLeftWidth: 3,
		padding: T.spacing.md,
		...T.shadow.card,
	},
	iconWrap: {
		width: 32,
		height: 32,
		borderRadius: T.radius.md,
		alignItems: "center",
		justifyContent: "center",
		marginBottom: T.spacing.sm,
	},
	label: {
		fontSize: 11,
		fontWeight: "500",
		color: T.text.secondary,
		textTransform: "uppercase",
		letterSpacing: 0.5,
		marginBottom: 2,
	},
	bigNumber: {
		fontSize: 26,
		fontWeight: "800",
		fontFamily: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" }),
		letterSpacing: -0.5,
	},
	suffix: {
		fontSize: 14,
		fontWeight: "600",
	},
	count: {
		fontSize: 11,
		color: T.text.muted,
		marginTop: 2,
	},
	// Compact
	compactRow: {
		flexDirection: "row",
		paddingHorizontal: T.spacing.lg,
		paddingVertical: T.spacing.sm,
		gap: 12,
	},
	compactCard: {
		flexDirection: "row",
		alignItems: "center",
		gap: 4,
	},
	compactValue: {
		fontSize: 14,
		fontWeight: "700",
		fontFamily: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" }),
	},
});

export default KPICards;

/**
 * AnalyticsScreen.jsx — Écran Analytics IA
 * Fonctionnalités :
 *   - Heatmap d'occupation (grille jours × créneaux)
 *   - Créneaux stratégiques (sous-exploités + recommandations)
 */
import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
	View,
	Text,
	ScrollView,
	TouchableOpacity,
	ActivityIndicator,
	StyleSheet,
	Dimensions,
	Modal,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../hooks/useTheme";
import { useFeatureLevel } from "../../src/stores/useFeatureLevelStore";
import { useReservationAI } from "../../hooks/useReservationAI";

// ─── Constantes ───────────────────────────────────────────────────────────────
const WEEK_DAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
// Mapping WEEK_DAYS index → getDay() key (backend matrix keys)
// getDay(): 0=Dimanche, 1=Lundi, 2=Mardi, ..., 6=Samedi
const DAY_KEY_MAP = ["1", "2", "3", "4", "5", "6", "0"];
const FULL_TO_SHORT = {
	Dimanche: "Dim",
	Lundi: "Lun",
	Mardi: "Mar",
	Mercredi: "Mer",
	Jeudi: "Jeu",
	Vendredi: "Ven",
	Samedi: "Sam",
};

const URGENCY_COLOR = {
	high: "#EF4444",
	medium: "#F59E0B",
	low: "#10B981",
};

/** Retourne une couleur hex basée sur l'occupation 0→1 */
function heatColor(rate) {
	if (rate === 0 || rate === undefined) return "rgba(148,163,184,0.08)";
	if (rate < 0.3) return "rgba(16,185,129,0.25)";
	if (rate < 0.6) return "rgba(245,158,11,0.35)";
	if (rate < 0.85) return "rgba(239,68,68,0.40)";
	return "rgba(239,68,68,0.75)";
}

// ─── Dimensions dynamiques ────────────────────────────────────────────────────
const TIME_LABEL_W = 50;
const GRID_H_PAD = 32; // padding horizontal interne de la section
const getCellWidth = (containerWidth) => {
	const available = containerWidth || Dimensions.get("window").width;
	return Math.floor((available - GRID_H_PAD - TIME_LABEL_W) / 7) - 4; // 4 = margin
};

// ─── Composant HeatCell ───────────────────────────────────────────────────────
const HeatCell = React.memo(({ rate, count, cellW }) => (
	<View
		style={[
			heatStyles.cell,
			{
				backgroundColor: heatColor(rate),
				width: cellW,
				height: Math.max(cellW * 0.45, 22),
			},
		]}
	>
		{count > 0 && <Text style={heatStyles.cellText}>{count}</Text>}
	</View>
));
HeatCell.displayName = "HeatCell";

const heatStyles = StyleSheet.create({
	cell: {
		borderRadius: 6,
		margin: 2,
		alignItems: "center",
		justifyContent: "center",
	},
	cellText: {
		fontSize: 11,
		color: "rgba(255,255,255,0.9)",
		fontWeight: "700",
	},
});

// ─── Composant StrategicCard ──────────────────────────────────────────────────
const StrategicCard = React.memo(({ item, THEME, styles }) => {
	const urgency = item.urgency || "low";
	const color = URGENCY_COLOR[urgency] || "#10B981";
	return (
		<View style={[styles.stratCard, { borderLeftColor: color }]}>
			<View style={styles.stratHeader}>
				<Text style={styles.stratDayTime}>
					{item.dayName} · {item.time}
				</Text>
				<View style={[styles.urgencyBadge, { backgroundColor: color + "28" }]}>
					<Text style={[styles.urgencyText, { color }]}>
						{urgency === "high"
							? "Urgent"
							: urgency === "medium"
								? "Moyen"
								: "OK"}
					</Text>
				</View>
			</View>
			<View style={styles.stratRow}>
				<Ionicons
					name="analytics-outline"
					size={13}
					color={THEME.colors.text.muted}
				/>
				<Text style={styles.stratOccupancy}>
					Occupation moy. : {item.avgOccupancy || 0}%
				</Text>
			</View>
			{item.recommendation ? (
				<Text style={styles.stratReco} numberOfLines={2}>
					{item.recommendation}
				</Text>
			) : null}
		</View>
	);
});
StrategicCard.displayName = "StrategicCard";

// ─── AnalyticsScreen ─────────────────────────────────────────────────────────
export default function AnalyticsScreen({ onClose }) {
	const THEME = useTheme();
	const styles = useMemo(() => createStyles(THEME), [THEME]);

	const { hasAiHeatmap, hasAiStrategicSlots } = useFeatureLevel();
	const { getHeatmap, getStrategicSlots, loading } = useReservationAI();

	const [heatmap, setHeatmap] = useState(null);
	const [strategic, setStrategic] = useState(null);
	const [section, setSection] = useState("heatmap"); // "heatmap" | "strategic"
	const [containerW, setContainerW] = useState(0);
	const cellW = useMemo(() => getCellWidth(containerW), [containerW]);

	const onContainerLayout = useCallback((e) => {
		setContainerW(e.nativeEvent.layout.width);
	}, []);

	// ── Chargement des données ────────────────────────────────────────────
	const loadHeatmap = useCallback(() => {
		if (!hasAiHeatmap) return;
		getHeatmap(8).then((r) => setHeatmap(r));
	}, [hasAiHeatmap, getHeatmap]);

	const loadStrategic = useCallback(() => {
		if (!hasAiStrategicSlots) return;
		getStrategicSlots().then((r) => setStrategic(Array.isArray(r) ? r : []));
	}, [hasAiStrategicSlots, getStrategicSlots]);

	useEffect(() => {
		loadHeatmap();
	}, [loadHeatmap]);
	useEffect(() => {
		loadStrategic();
	}, [loadStrategic]);

	// ── Sélection section initiale ────────────────────────────────────────
	useEffect(() => {
		if (!hasAiHeatmap && hasAiStrategicSlots) setSection("strategic");
	}, [hasAiHeatmap, hasAiStrategicSlots]);

	// ── Traitement de la matrice heatmap ─────────────────────────────────
	const { timeSlots, maxCount } = useMemo(() => {
		if (!heatmap?.matrix) return { timeSlots: [], maxCount: 1 };
		// Collecter tous les créneaux uniques et trier
		const timesSet = new Set();
		Object.values(heatmap.matrix).forEach((dayData) => {
			if (dayData && typeof dayData === "object") {
				Object.keys(dayData).forEach((t) => timesSet.add(t));
			}
		});
		const sorted = [...timesSet].sort();
		let max = 1;
		sorted.forEach((t) => {
			DAY_KEY_MAP.forEach((key) => {
				const cell = heatmap.matrix[key]?.[t];
				const v = typeof cell === "object" ? cell?.count || 0 : cell || 0;
				if (v > max) max = v;
			});
		});
		return { timeSlots: sorted, maxCount: max };
	}, [heatmap]);

	// ── Rendu ─────────────────────────────────────────────────────────────
	const noFeature = !hasAiHeatmap && !hasAiStrategicSlots;

	if (noFeature) {
		return (
			<Modal visible={true} animationType="slide" presentationStyle="pageSheet">
				<View style={styles.container}>
					<View style={styles.emptyContainer}>
						<Ionicons
							name="lock-closed-outline"
							size={48}
							color={THEME.colors.text.muted}
						/>
						<Text style={styles.emptyTitle}>Analytics IA désactivé</Text>
						<Text style={styles.emptySubtitle}>
							Activez les fonctionnalités IA dans le mode développeur.
						</Text>
					</View>
					{onClose && (
						<TouchableOpacity onPress={onClose} style={styles.closeButton}>
							<Ionicons
								name="close"
								size={24}
								color={THEME.colors.text.primary}
							/>
						</TouchableOpacity>
					)}
				</View>
			</Modal>
		);
	}

	return (
		<Modal visible={true} animationType="slide" presentationStyle="pageSheet">
			<View style={styles.container} onLayout={onContainerLayout}>
				{/* Bouton fermer */}
				{onClose && (
					<TouchableOpacity onPress={onClose} style={styles.closeButton}>
						<Ionicons
							name="close"
							size={24}
							color={THEME.colors.text.primary}
						/>
					</TouchableOpacity>
				)}
				{/* ── Header ── */}
				<View style={styles.header}>
					<LinearGradient
						colors={["rgba(245,158,11,0.15)", "transparent"]}
						style={styles.headerGlow}
					/>
					<View style={styles.headerContent}>
						<Ionicons name="sparkles" size={20} color="#F59E0B" />
						<Text style={styles.headerTitle}>Analytics IA</Text>
					</View>

					{/* ── Sélecteur de section ── */}
					<View style={styles.sectionTabs}>
						{hasAiHeatmap && (
							<TouchableOpacity
								style={[
									styles.sectionTab,
									section === "heatmap" && styles.sectionTabActive,
								]}
								onPress={() => setSection("heatmap")}
							>
								<Ionicons
									name="grid-outline"
									size={14}
									color={
										section === "heatmap" ? "#F59E0B" : THEME.colors.text.muted
									}
								/>
								<Text
									style={[
										styles.sectionTabText,
										section === "heatmap" && styles.sectionTabTextActive,
									]}
								>
									Heatmap
								</Text>
							</TouchableOpacity>
						)}
						{hasAiStrategicSlots && (
							<TouchableOpacity
								style={[
									styles.sectionTab,
									section === "strategic" && styles.sectionTabActive,
								]}
								onPress={() => setSection("strategic")}
							>
								<Ionicons
									name="bulb-outline"
									size={14}
									color={
										section === "strategic"
											? "#F59E0B"
											: THEME.colors.text.muted
									}
								/>
								<Text
									style={[
										styles.sectionTabText,
										section === "strategic" && styles.sectionTabTextActive,
									]}
								>
									Stratégie
								</Text>
							</TouchableOpacity>
						)}
					</View>
				</View>

				<ScrollView
					style={styles.scroll}
					contentContainerStyle={styles.scrollContent}
					showsVerticalScrollIndicator={false}
				>
					{/* ═══════════════ HEATMAP ═══════════════ */}
					{section === "heatmap" && hasAiHeatmap && (
						<View style={styles.section}>
							{loading.heatmap ? (
								<ActivityIndicator color="#F59E0B" style={{ marginTop: 40 }} />
							) : heatmap ? (
								<>
									{/* ── Résumé picto ── */}
									<View style={styles.heatSummary}>
										<View style={styles.heatStat}>
											<Text style={styles.heatStatValue}>
												{heatmap.peakDayName || "—"}
											</Text>
											<Text style={styles.heatStatLabel}>Jour de pointe</Text>
										</View>
										<View style={styles.heatStatDivider} />
										<View style={styles.heatStat}>
											<Text style={styles.heatStatValue}>
												{heatmap.peakTime || "—"}
											</Text>
											<Text style={styles.heatStatLabel}>Heure de pointe</Text>
										</View>
										<View style={styles.heatStatDivider} />
										<View style={styles.heatStat}>
											<Text style={styles.heatStatValue}>
												{heatmap.totalResas || 0}
											</Text>
											<Text style={styles.heatStatLabel}>Résas analysées</Text>
										</View>
									</View>

									{/* ── Légende couleurs ── */}
									<View style={styles.heatLegend}>
										<Text style={styles.heatLegendLabel}>Vide</Text>
										{[0, 0.3, 0.6, 0.85, 1].map((r) => (
											<View
												key={r}
												style={[
													styles.heatLegendCell,
													{ backgroundColor: heatColor(r) },
												]}
											/>
										))}
										<Text style={styles.heatLegendLabel}>Saturé</Text>
									</View>

									{/* ── Grille ── */}
									<View>
										{/* En-têtes jours */}
										<View style={styles.heatRow}>
											<View style={styles.heatTimeLabel} />
											{WEEK_DAYS.map((d) => {
												const peakShort = FULL_TO_SHORT[heatmap.peakDayName];
												return (
													<View
														key={d}
														style={[styles.heatDayHeader, { width: cellW + 4 }]}
													>
														<Text
															style={[
																styles.heatDayText,
																d === peakShort && {
																	color: "#F59E0B",
																	fontWeight: "800",
																},
															]}
														>
															{d}
														</Text>
													</View>
												);
											})}
										</View>
										{/* Lignes créneaux */}
										{timeSlots.map((time) => (
											<View key={time} style={styles.heatRow}>
												<View style={styles.heatTimeLabel}>
													<Text style={styles.heatTimeText}>{time}</Text>
												</View>
												{WEEK_DAYS.map((d, idx) => {
													const key = DAY_KEY_MAP[idx];
													const cell = heatmap.matrix[key]?.[time];
													const count =
														typeof cell === "object"
															? cell?.count || 0
															: cell || 0;
													const rate = maxCount > 0 ? count / maxCount : 0;
													return (
														<HeatCell
															key={d}
															rate={rate}
															count={count}
															cellW={cellW}
														/>
													);
												})}
											</View>
										))}
									</View>
								</>
							) : (
								<Text style={styles.emptyData}>
									Aucune donnée historique disponible.
								</Text>
							)}
						</View>
					)}

					{/* ═══════════════ CRÉNEAUX STRATÉGIQUES ═══════════════ */}
					{section === "strategic" && hasAiStrategicSlots && (
						<View style={styles.section}>
							{loading.strategicSlots ? (
								<ActivityIndicator color="#F59E0B" style={{ marginTop: 40 }} />
							) : strategic && strategic.length > 0 ? (
								<>
									<Text style={styles.stratIntro}>
										Créneaux sous-exploités à valoriser — triés par priorité.
									</Text>
									{strategic.map((item, idx) => (
										<StrategicCard
											key={idx}
											item={item}
											THEME={THEME}
											styles={styles}
										/>
									))}
								</>
							) : (
								<View style={styles.emptyContainer}>
									<Ionicons
										name="checkmark-circle-outline"
										size={40}
										color="#10B981"
									/>
									<Text style={styles.emptyTitle}>Aucun créneau critique</Text>
									<Text style={styles.emptySubtitle}>
										Votre planning est bien optimisé !
									</Text>
								</View>
							)}
						</View>
					)}
				</ScrollView>
			</View>
		</Modal>
	);
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const createStyles = (THEME) =>
	StyleSheet.create({
		container: {
			flex: 1,
			backgroundColor: THEME.colors.background.dark,
		},
		// ── Header ──
		header: {
			paddingBottom: THEME.spacing.sm,
			borderBottomWidth: 1,
			borderBottomColor: THEME.colors.border.subtle,
		},
		headerGlow: {
			position: "absolute",
			top: 0,
			left: 0,
			right: 0,
			height: 80,
		},
		headerContent: {
			flexDirection: "row",
			alignItems: "center",
			gap: 8,
			paddingHorizontal: THEME.spacing.lg,
			paddingTop: THEME.spacing.md,
			paddingBottom: THEME.spacing.sm,
		},
		headerTitle: {
			fontSize: THEME.typography.sizes.lg,
			fontWeight: THEME.typography.weights.bold,
			color: THEME.colors.text.primary,
		},
		// ── Section tabs ──
		sectionTabs: {
			flexDirection: "row",
			paddingHorizontal: THEME.spacing.lg,
			gap: THEME.spacing.sm,
		},
		sectionTab: {
			flexDirection: "row",
			alignItems: "center",
			gap: 5,
			paddingVertical: 6,
			paddingHorizontal: 12,
			borderRadius: THEME.radius.md,
			borderWidth: 1,
			borderColor: THEME.colors.border.subtle,
			backgroundColor: "transparent",
		},
		sectionTabActive: {
			borderColor: "rgba(245,158,11,0.4)",
			backgroundColor: "rgba(245,158,11,0.10)",
		},
		sectionTabText: {
			fontSize: 13,
			fontWeight: "600",
			color: THEME.colors.text.muted,
		},
		sectionTabTextActive: {
			color: "#F59E0B",
		},
		// ── Scroll ──
		scroll: {
			flex: 1,
		},
		scrollContent: {
			paddingBottom: 12,
		},
		section: {
			paddingHorizontal: THEME.spacing.lg,
			paddingTop: THEME.spacing.sm,
		},
		// ── Heatmap ──
		heatSummary: {
			flexDirection: "row",
			justifyContent: "space-around",
			backgroundColor: THEME.colors.background.card,
			borderRadius: THEME.radius.lg,
			paddingVertical: 8,
			paddingHorizontal: THEME.spacing.md,
			marginBottom: 8,
			borderWidth: 1,
			borderColor: THEME.colors.border.subtle,
		},
		heatStat: {
			alignItems: "center",
			gap: 4,
		},
		heatStatValue: {
			fontSize: 16,
			fontWeight: "700",
			color: "#F59E0B",
		},
		heatStatLabel: {
			fontSize: 11,
			color: THEME.colors.text.muted,
		},
		heatStatDivider: {
			width: 1,
			backgroundColor: THEME.colors.border.subtle,
		},
		heatLegend: {
			flexDirection: "row",
			alignItems: "center",
			gap: 4,
			marginBottom: 4,
		},
		heatLegendCell: {
			width: 18,
			height: 14,
			borderRadius: 3,
		},
		heatLegendLabel: {
			fontSize: 10,
			color: THEME.colors.text.muted,
			marginHorizontal: 4,
		},
		heatRow: {
			flexDirection: "row",
			alignItems: "center",
		},
		heatTimeLabel: {
			width: TIME_LABEL_W,
			alignItems: "flex-end",
			paddingRight: 8,
		},
		heatTimeText: {
			fontSize: 11,
			color: THEME.colors.text.muted,
		},
		heatDayHeader: {
			alignItems: "center",
			paddingBottom: 3,
		},
		heatDayText: {
			fontSize: 13,
			fontWeight: "600",
			color: THEME.colors.text.secondary,
		},
		// ── Strategic ──
		stratIntro: {
			fontSize: 12,
			color: THEME.colors.text.muted,
			marginBottom: THEME.spacing.md,
			fontStyle: "italic",
		},
		stratCard: {
			backgroundColor: THEME.colors.background.card,
			borderRadius: THEME.radius.md,
			padding: THEME.spacing.md,
			marginBottom: THEME.spacing.sm,
			borderLeftWidth: 3,
			borderWidth: 1,
			borderColor: THEME.colors.border.subtle,
		},
		stratHeader: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
			marginBottom: 6,
		},
		stratDayTime: {
			fontSize: 14,
			fontWeight: "700",
			color: THEME.colors.text.primary,
		},
		urgencyBadge: {
			paddingHorizontal: 8,
			paddingVertical: 2,
			borderRadius: 10,
		},
		urgencyText: {
			fontSize: 11,
			fontWeight: "700",
		},
		stratRow: {
			flexDirection: "row",
			alignItems: "center",
			gap: 5,
			marginBottom: 4,
		},
		stratOccupancy: {
			fontSize: 12,
			color: THEME.colors.text.secondary,
		},
		stratReco: {
			fontSize: 12,
			color: THEME.colors.text.muted,
			fontStyle: "italic",
			lineHeight: 17,
		},
		// ── Empty state ──
		emptyContainer: {
			flex: 1,
			alignItems: "center",
			justifyContent: "center",
			paddingTop: 80,
			gap: 12,
		},
		emptyTitle: {
			fontSize: 16,
			fontWeight: "700",
			color: THEME.colors.text.primary,
		},
		emptySubtitle: {
			fontSize: 13,
			color: THEME.colors.text.muted,
			textAlign: "center",
			paddingHorizontal: 40,
		},
		emptyData: {
			fontSize: 13,
			color: THEME.colors.text.muted,
			textAlign: "center",
			marginTop: 40,
		},
		closeButton: {
			position: "absolute",
			top: 16,
			right: 16,
			width: 36,
			height: 36,
			borderRadius: 18,
			backgroundColor: THEME.colors.background.card,
			alignItems: "center",
			justifyContent: "center",
			zIndex: 10,
		},
	});

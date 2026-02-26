/**
 * 🧑‍💼 ServerPerformanceDetail
 * Profil complet d'un employé : ventes, temps de service, add-ons,
 * comparaison équipe, objectifs personnalisés et coaching.
 *
 * Accessible uniquement aux admins et managers (géré par le parent)
 */
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
	View,
	Text,
	StyleSheet,
	ScrollView,
	TouchableOpacity,
	Modal,
	TextInput,
	ActivityIndicator,
	Alert,
	Dimensions,
	Animated,
	Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { BarChart } from "react-native-chart-kit";
// eslint-disable-next-line import/no-named-as-default
import useServerDetail from "../../../hooks/useServerDetail";
import { useTheme } from "../../../hooks/useTheme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const PERIODS = [
	{ key: "today", label: "Auj." },
	{ key: "week", label: "7j" },
	{ key: "month", label: "30j" },
	{ key: "quarter", label: "Trim." },
];

const PAYMENT_COLORS = {
	Carte: "#3b82f6",
	Espèces: "#10b981",
	Autre: "#8b5cf6",
	card: "#3b82f6",
	cash: "#10b981",
};

// ─── Composant indicateur de score ───────────────────────────────────────────
function ScoreBadge({ score, size = "md" }) {
	const color = score >= 70 ? "#10b981" : score >= 40 ? "#f59e0b" : "#ef4444";
	const label =
		score >= 70
			? "Top performer"
			: score >= 40
				? "Dans la moyenne"
				: "À accompagner";
	const isLarge = size === "lg";
	return (
		<View
			style={[
				scoreBadgeStyles.container,
				{ backgroundColor: color + "22", borderColor: color + "66" },
				isLarge && { paddingHorizontal: 14, paddingVertical: 8 },
			]}
		>
			<Text
				style={[scoreBadgeStyles.score, { color }, isLarge && { fontSize: 22 }]}
			>
				{score}
			</Text>
			<Text
				style={[scoreBadgeStyles.label, { color }, isLarge && { fontSize: 11 }]}
			>
				{label}
			</Text>
		</View>
	);
}
const scoreBadgeStyles = StyleSheet.create({
	container: {
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
		paddingHorizontal: 10,
		paddingVertical: 5,
		borderRadius: 20,
		borderWidth: 1,
	},
	score: { fontSize: 18, fontWeight: "800" },
	label: {
		fontSize: 9,
		fontWeight: "600",
		textTransform: "uppercase",
		letterSpacing: 0.5,
	},
});

// ─── Barre de progression ─────────────────────────────────────────────────────
function ProgressBar({ value, target, color = "#3b82f6", label, unit = "" }) {
	const pct = target > 0 ? Math.min((value / target) * 100, 100) : 0;
	const barColor = pct >= 100 ? "#10b981" : pct >= 50 ? "#f59e0b" : "#ef4444";
	return (
		<View style={pbStyles.wrapper}>
			<View style={pbStyles.header}>
				<Text style={pbStyles.label}>{label}</Text>
				<Text style={pbStyles.values}>
					{unit === "€"
						? `${value.toFixed(0)}€ / ${target}€`
						: unit === "%"
							? `${value}% / ${target}%`
							: `${value} / ${target}`}
				</Text>
			</View>
			<View style={pbStyles.track}>
				<Animated.View
					style={[
						pbStyles.fill,
						{ width: `${pct}%`, backgroundColor: barColor },
					]}
				/>
			</View>
			<Text style={[pbStyles.pct, { color: barColor }]}>
				{Math.round(pct)}%
			</Text>
		</View>
	);
}
const pbStyles = StyleSheet.create({
	wrapper: { marginBottom: 14 },
	header: {
		flexDirection: "row",
		justifyContent: "space-between",
		marginBottom: 4,
	},
	label: { fontSize: 13, fontWeight: "600", color: "#64748b" },
	values: { fontSize: 12, color: "#94a3b8" },
	track: {
		height: 8,
		backgroundColor: "rgba(100,116,139,0.15)",
		borderRadius: 4,
		overflow: "hidden",
	},
	fill: { height: "100%", borderRadius: 4 },
	pct: { fontSize: 11, fontWeight: "700", marginTop: 2, textAlign: "right" },
});

// ─── Comparaison bar ──────────────────────────────────────────────────────────
function CompareBar({ label, myValue, teamValue, unit = "" }) {
	const max = Math.max(myValue, teamValue, 1);
	const myPct = (myValue / max) * 100;
	const teamPct = (teamValue / max) * 100;
	const isGood = myValue >= teamValue;
	return (
		<View style={cmpStyles.row}>
			<Text style={cmpStyles.label}>{label}</Text>
			<View style={cmpStyles.bars}>
				{/* Moi */}
				<View style={cmpStyles.barRow}>
					<Text
						style={[
							cmpStyles.barLabel,
							{ color: isGood ? "#10b981" : "#ef4444" },
						]}
					>
						{unit === "€"
							? `${myValue.toFixed(0)}€`
							: unit === "min"
								? `${myValue}min`
								: `${myValue}${unit}`}
					</Text>
					<View style={cmpStyles.track}>
						<View
							style={[
								cmpStyles.fill,
								{
									width: `${myPct}%`,
									backgroundColor: isGood ? "#10b981" : "#ef4444",
								},
							]}
						/>
					</View>
				</View>
				{/* Équipe */}
				<View style={cmpStyles.barRow}>
					<Text style={cmpStyles.teamLabel}>
						{unit === "€"
							? `${teamValue.toFixed(0)}€`
							: unit === "min"
								? `${teamValue}min`
								: `${teamValue}${unit}`}
					</Text>
					<View style={cmpStyles.track}>
						<View
							style={[
								cmpStyles.fill,
								{ width: `${teamPct}%`, backgroundColor: "#94a3b8" },
							]}
						/>
					</View>
				</View>
			</View>
		</View>
	);
}
const cmpStyles = StyleSheet.create({
	row: { marginBottom: 16 },
	label: { fontSize: 12, fontWeight: "600", color: "#64748b", marginBottom: 4 },
	bars: { gap: 4 },
	barRow: { flexDirection: "row", alignItems: "center", gap: 8 },
	barLabel: { width: 55, fontSize: 11, fontWeight: "700", textAlign: "right" },
	teamLabel: { width: 55, fontSize: 11, color: "#94a3b8", textAlign: "right" },
	track: {
		flex: 1,
		height: 7,
		backgroundColor: "rgba(100,116,139,0.12)",
		borderRadius: 4,
		overflow: "hidden",
	},
	fill: { height: "100%", borderRadius: 4 },
});

// ─── Composant principal ──────────────────────────────────────────────────────
export default function ServerPerformanceDetail({ server, onClose }) {
	const [period, setPeriod] = useState("week");
	const [showObjectivesModal, setShowObjectivesModal] = useState(false);
	const [objectives, setObjectives] = useState({
		revenueTarget: "",
		ordersTarget: "",
		addOnRateTarget: "",
		notes: "",
	});

	const THEME = useTheme();
	const isDark = THEME.colors.background === "#0f172a" || THEME.dark;

	const {
		data,
		isLoading,
		error,
		isSavingObjectives,
		fetchDetail,
		saveObjectives,
	} = useServerDetail(server?._id);

	// Charger les données à l'ouverture et quand la période change
	useEffect(() => {
		if (server?._id) {
			fetchDetail(period);
		}
	}, [server?._id, period, fetchDetail]);

	// Pré-remplir les objectifs depuis les données chargées
	useEffect(() => {
		if (data?.objectives) {
			setObjectives({
				revenueTarget: data.objectives.revenueTarget?.toString() ?? "",
				ordersTarget: data.objectives.ordersTarget?.toString() ?? "",
				addOnRateTarget: data.objectives.addOnRateTarget?.toString() ?? "",
				notes: data.objectives.notes ?? "",
			});
		}
	}, [data?.objectives]);

	const handleSaveObjectives = useCallback(async () => {
		const payload = {
			revenueTarget: objectives.revenueTarget
				? parseFloat(objectives.revenueTarget)
				: null,
			ordersTarget: objectives.ordersTarget
				? parseInt(objectives.ordersTarget)
				: null,
			addOnRateTarget: objectives.addOnRateTarget
				? parseFloat(objectives.addOnRateTarget)
				: null,
			notes: objectives.notes,
		};
		const ok = await saveObjectives(payload);
		if (ok) {
			setShowObjectivesModal(false);
			Alert.alert(
				"✅ Objectifs sauvegardés",
				"Les objectifs ont été mis à jour.",
			);
		} else {
			Alert.alert("Erreur", "Impossible de sauvegarder les objectifs.");
		}
	}, [objectives, saveObjectives]);

	// ── Données graphique barres quotidiennes ──
	const dailyChartData = useMemo(() => {
		if (!data?.dailySales?.length) return null;
		// Prendre les 7 derniers jours max
		const recent = data.dailySales.slice(-7);
		return {
			labels: recent.map((d) => d.label),
			datasets: [{ data: recent.map((d) => d.revenue || 0) }],
		};
	}, [data?.dailySales]);

	// ── Top catégories ──
	const topCategories = useMemo(() => {
		if (!data?.categoryBreakdown) return [];
		return Object.entries(data.categoryBreakdown)
			.map(([cat, stats]) => ({ cat, ...stats }))
			.sort((a, b) => b.revenue - a.revenue)
			.slice(0, 6);
	}, [data?.categoryBreakdown]);

	const maxCatRevenue = topCategories[0]?.revenue || 1;

	// ── Paiements ──
	const paymentData = useMemo(() => {
		if (!data?.paymentBreakdown) return [];
		const total = Object.values(data.paymentBreakdown).reduce(
			(s, v) => s + v,
			0,
		);
		if (total === 0) return [];
		return Object.entries(data.paymentBreakdown).map(([method, amount]) => ({
			method,
			amount,
			pct: Math.round((amount / total) * 100),
			color: PAYMENT_COLORS[method] || "#94a3b8",
		}));
	}, [data?.paymentBreakdown]);

	// Initiales du nom
	const initials = useMemo(() => {
		if (!server?.name) return "?";
		return server.name
			.split(" ")
			.map((w) => w[0])
			.join("")
			.toUpperCase()
			.slice(0, 2);
	}, [server?.name]);

	const cardBg = isDark ? "rgba(30,41,59,0.95)" : "#ffffff";
	const textPrimary = isDark ? "#f1f5f9" : "#1e293b";
	const textSecondary = isDark ? "#94a3b8" : "#64748b";
	const borderColor = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)";
	const sectionBg = isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)";

	const chartConfig = {
		backgroundColor: "transparent",
		backgroundGradientFrom: isDark ? "#1e293b" : "#ffffff",
		backgroundGradientTo: isDark ? "#1e293b" : "#ffffff",
		decimalPlaces: 0,
		color: (opacity = 1) => `rgba(59,130,246,${opacity})`,
		labelColor: () => textSecondary,
		style: { borderRadius: 12 },
		propsForBackgroundLines: {
			strokeDasharray: "",
			stroke: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
		},
		barPercentage: 0.6,
	};

	if (!server) return null;

	return (
		<Modal
			visible
			animationType="slide"
			transparent={false}
			onRequestClose={onClose}
		>
			<LinearGradient
				colors={isDark ? ["#0f172a", "#1e293b"] : ["#f0f9ff", "#e0f2fe"]}
				style={styles.container}
			>
				{/* ── Header ── */}
				<View
					style={[
						styles.header,
						{
							backgroundColor: isDark ? "rgba(15,23,42,0.98)" : "#fff",
							borderBottomColor: borderColor,
						},
					]}
				>
					<TouchableOpacity onPress={onClose} style={styles.backBtn}>
						<Ionicons name="arrow-back" size={22} color={textPrimary} />
					</TouchableOpacity>

					{/* Avatar */}
					<View
						style={[
							styles.avatar,
							{ backgroundColor: THEME.colors.primary + "33" },
						]}
					>
						<Text style={[styles.avatarText, { color: THEME.colors.primary }]}>
							{initials}
						</Text>
					</View>

					<View style={styles.headerInfo}>
						<Text style={[styles.serverName, { color: textPrimary }]}>
							{server.name}
						</Text>
						<Text style={[styles.serverRole, { color: textSecondary }]}>
							{server.role || "Serveur"} ·{" "}
							{period === "today"
								? "Aujourd'hui"
								: period === "week"
									? "7 derniers jours"
									: period === "month"
										? "30 derniers jours"
										: "Trimestre"}
						</Text>
					</View>

					{data && <ScoreBadge score={data.efficiency} size="md" />}
				</View>

				{/* ── Sélecteur de période ── */}
				<View
					style={[
						styles.periodRow,
						{ backgroundColor: isDark ? "rgba(15,23,42,0.8)" : "#fff" },
					]}
				>
					{PERIODS.map((p) => (
						<TouchableOpacity
							key={p.key}
							style={[
								styles.periodBtn,
								{
									backgroundColor:
										period === p.key
											? THEME.colors.primary
											: isDark
												? "rgba(255,255,255,0.06)"
												: "rgba(0,0,0,0.05)",
								},
							]}
							onPress={() => setPeriod(p.key)}
						>
							<Text
								style={[
									styles.periodLabel,
									{ color: period === p.key ? "#fff" : textSecondary },
								]}
							>
								{p.label}
							</Text>
						</TouchableOpacity>
					))}
				</View>

				{/* ── Contenu ── */}
				{isLoading ? (
					<View style={styles.loading}>
						<ActivityIndicator size="large" color={THEME.colors.primary} />
						<Text style={[styles.loadingText, { color: textSecondary }]}>
							Chargement du profil…
						</Text>
					</View>
				) : error ? (
					<View style={styles.loading}>
						<Ionicons name="warning-outline" size={40} color="#ef4444" />
						<Text style={{ color: "#ef4444", marginTop: 8 }}>{error}</Text>
					</View>
				) : data ? (
					<ScrollView
						style={styles.scroll}
						showsVerticalScrollIndicator={false}
					>
						{/* ── KPI Cards ── */}
						<View style={styles.kpiRow}>
							{[
								{
									icon: "cash-outline",
									label: "CA",
									value: `${data.totalRevenue.toFixed(0)}€`,
									color: "#10b981",
								},
								{
									icon: "receipt-outline",
									label: "Commandes",
									value: data.totalOrders,
									color: "#3b82f6",
								},
								{
									icon: "pricetag-outline",
									label: "Panier moy.",
									value: `${data.avgOrderValue.toFixed(0)}€`,
									color: "#8b5cf6",
								},
								{
									icon: "timer-outline",
									label: "Tps service",
									value: `${data.avgServiceTime}min`,
									color: "#f59e0b",
								},
							].map((kpi) => (
								<View
									key={kpi.label}
									style={[
										styles.kpiCard,
										{ backgroundColor: cardBg, borderColor },
									]}
								>
									<Ionicons name={kpi.icon} size={18} color={kpi.color} />
									<Text style={[styles.kpiValue, { color: textPrimary }]}>
										{kpi.value}
									</Text>
									<Text style={[styles.kpiLabel, { color: textSecondary }]}>
										{kpi.label}
									</Text>
								</View>
							))}
						</View>

						{/* ── Sessions ── */}
						<View
							style={[styles.card, { backgroundColor: cardBg, borderColor }]}
						>
							<Text style={[styles.cardTitle, { color: textPrimary }]}>
								<Ionicons name="people-outline" size={15} /> Sessions clients
							</Text>
							<View style={styles.sessionRow}>
								<View
									style={[styles.sessionStat, { backgroundColor: sectionBg }]}
								>
									<Text style={[styles.sessionStatVal, { color: textPrimary }]}>
										{data.totalSessions}
									</Text>
									<Text
										style={[styles.sessionStatLbl, { color: textSecondary }]}
									>
										Sessions ouvertes
									</Text>
								</View>
								<View
									style={[styles.sessionStat, { backgroundColor: sectionBg }]}
								>
									<Text style={[styles.sessionStatVal, { color: textPrimary }]}>
										{data.avgSessionDuration}min
									</Text>
									<Text
										style={[styles.sessionStatLbl, { color: textSecondary }]}
									>
										Durée moyenne
									</Text>
								</View>
							</View>
						</View>

						{/* ── Graphique ventes quotidiennes ── */}
						{dailyChartData &&
							dailyChartData.datasets[0].data.some((v) => v > 0) && (
								<View
									style={[
										styles.card,
										{ backgroundColor: cardBg, borderColor },
									]}
								>
									<Text style={[styles.cardTitle, { color: textPrimary }]}>
										<Ionicons name="bar-chart-outline" size={15} /> Ventes par
										jour
									</Text>
									<BarChart
										data={dailyChartData}
										width={SCREEN_WIDTH - 56}
										height={180}
										chartConfig={chartConfig}
										style={{ borderRadius: 10, marginTop: 8 }}
										withInnerLines
										showValuesOnTopOfBars
										fromZero
									/>
								</View>
							)}

						{/* ── Add-ons ── */}
						<View
							style={[styles.card, { backgroundColor: cardBg, borderColor }]}
						>
							<Text style={[styles.cardTitle, { color: textPrimary }]}>
								<Ionicons name="star-outline" size={15} /> Add-ons & upsells
							</Text>
							<View style={styles.addOnRow}>
								<View
									style={[styles.addOnStat, { backgroundColor: "#10b98122" }]}
								>
									<Text style={[styles.addOnVal, { color: "#10b981" }]}>
										{data.addOnRate}%
									</Text>
									<Text style={[styles.addOnLbl, { color: textSecondary }]}>
										Taux d&apos;add-on
									</Text>
								</View>
								<View
									style={[styles.addOnStat, { backgroundColor: "#8b5cf622" }]}
								>
									<Text style={[styles.addOnVal, { color: "#8b5cf6" }]}>
										{data.totalAddOns}
									</Text>
									<Text style={[styles.addOnLbl, { color: textSecondary }]}>
										Add-ons vendus
									</Text>
								</View>
								<View
									style={[styles.addOnStat, { backgroundColor: "#f59e0b22" }]}
								>
									<Text style={[styles.addOnVal, { color: "#f59e0b" }]}>
										{data.addOnRevenue.toFixed(0)}€
									</Text>
									<Text style={[styles.addOnLbl, { color: textSecondary }]}>
										CA add-ons
									</Text>
								</View>
							</View>
						</View>

						{/* ── Modes de paiement ── */}
						{paymentData.length > 0 && (
							<View
								style={[styles.card, { backgroundColor: cardBg, borderColor }]}
							>
								<Text style={[styles.cardTitle, { color: textPrimary }]}>
									<Ionicons name="card-outline" size={15} /> Modes de paiement
								</Text>
								{paymentData.map((p) => (
									<View key={p.method} style={styles.payRow}>
										<View
											style={[styles.payDot, { backgroundColor: p.color }]}
										/>
										<Text style={[styles.payMethod, { color: textPrimary }]}>
											{p.method}
										</Text>
										<View style={styles.payTrack}>
											<View
												style={[
													styles.payFill,
													{ width: `${p.pct}%`, backgroundColor: p.color },
												]}
											/>
										</View>
										<Text style={[styles.payPct, { color: textSecondary }]}>
											{p.pct}%
										</Text>
									</View>
								))}
							</View>
						)}

						{/* ── Catégories vendues ── */}
						{topCategories.length > 0 && (
							<View
								style={[styles.card, { backgroundColor: cardBg, borderColor }]}
							>
								<Text style={[styles.cardTitle, { color: textPrimary }]}>
									<Ionicons name="restaurant-outline" size={15} /> Catégories
									vendues
								</Text>
								{topCategories.map((c, i) => (
									<View key={c.cat} style={styles.catRow}>
										<Text style={[styles.catName, { color: textPrimary }]}>
											{c.cat.charAt(0).toUpperCase() + c.cat.slice(1)}
										</Text>
										<View style={styles.catTrack}>
											<View
												style={[
													styles.catFill,
													{
														width: `${(c.revenue / maxCatRevenue) * 100}%`,
														backgroundColor: [
															"#3b82f6",
															"#10b981",
															"#f59e0b",
															"#8b5cf6",
															"#ef4444",
															"#06b6d4",
														][i % 6],
													},
												]}
											/>
										</View>
										<Text style={[styles.catRevenue, { color: textSecondary }]}>
											{c.revenue.toFixed(0)}€
										</Text>
									</View>
								))}
							</View>
						)}

						{/* ── Comparaison équipe ── */}
						<View
							style={[styles.card, { backgroundColor: cardBg, borderColor }]}
						>
							<Text style={[styles.cardTitle, { color: textPrimary }]}>
								<Ionicons name="people-circle-outline" size={15} /> vs. Moyenne
								équipe
							</Text>
							<Text style={[styles.legendRow, { color: textSecondary }]}>
								<View
									style={[styles.legendDot, { backgroundColor: "#10b981" }]}
								/>{" "}
								Cet employé{"   "}
								<View
									style={[styles.legendDot, { backgroundColor: "#94a3b8" }]}
								/>{" "}
								Moyenne équipe
							</Text>
							<CompareBar
								label="CA"
								myValue={data.totalRevenue}
								teamValue={data.teamAvg.revenue}
								unit="€"
							/>
							<CompareBar
								label="Commandes"
								myValue={data.totalOrders}
								teamValue={data.teamAvg.orders}
							/>
							<CompareBar
								label="Tps service"
								myValue={data.avgServiceTime}
								teamValue={data.teamAvg.avgServiceTime}
								unit="min"
							/>
						</View>

						{/* ── Objectifs ── */}
						<View
							style={[styles.card, { backgroundColor: cardBg, borderColor }]}
						>
							<View style={styles.cardTitleRow}>
								<Text style={[styles.cardTitle, { color: textPrimary }]}>
									<Ionicons name="trophy-outline" size={15} /> Objectifs
								</Text>
								<TouchableOpacity
									style={[
										styles.editBtn,
										{ backgroundColor: THEME.colors.primary + "22" },
									]}
									onPress={() => setShowObjectivesModal(true)}
								>
									<Ionicons
										name="create-outline"
										size={14}
										color={THEME.colors.primary}
									/>
									<Text
										style={[
											styles.editBtnText,
											{ color: THEME.colors.primary },
										]}
									>
										Modifier
									</Text>
								</TouchableOpacity>
							</View>

							{data.objectives?.revenueTarget ? (
								<>
									{data.objectives.revenueTarget && (
										<ProgressBar
											label="CA mensuel"
											value={data.totalRevenue}
											target={data.objectives.revenueTarget}
											unit="€"
										/>
									)}
									{data.objectives.ordersTarget && (
										<ProgressBar
											label="Commandes"
											value={data.totalOrders}
											target={data.objectives.ordersTarget}
										/>
									)}
									{data.objectives.addOnRateTarget && (
										<ProgressBar
											label="Taux d'add-on"
											value={data.addOnRate}
											target={data.objectives.addOnRateTarget}
											unit="%"
										/>
									)}
									{data.objectives.notes ? (
										<Text
											style={[styles.objectiveNotes, { color: textSecondary }]}
										>
											💬 {data.objectives.notes}
										</Text>
									) : null}
								</>
							) : (
								<TouchableOpacity
									style={[
										styles.emptyObjectives,
										{ borderColor: THEME.colors.primary + "44" },
									]}
									onPress={() => setShowObjectivesModal(true)}
								>
									<Ionicons
										name="add-circle-outline"
										size={28}
										color={THEME.colors.primary}
									/>
									<Text
										style={[
											styles.emptyObjectivesText,
											{ color: textSecondary },
										]}
									>
										Définir des objectifs pour cet employé
									</Text>
								</TouchableOpacity>
							)}
						</View>

						{/* ── Recommandations coaching ── */}
						{data.avgServiceTime > 30 ||
						data.totalOrders < 10 ||
						data.addOnRate < 20 ? (
							<View
								style={[styles.card, { backgroundColor: cardBg, borderColor }]}
							>
								<Text style={[styles.cardTitle, { color: textPrimary }]}>
									<Ionicons name="bulb-outline" size={15} /> Coaching &
									recommandations
								</Text>
								{data.avgServiceTime > 30 && (
									<CoachingItem
										icon="timer-outline"
										color="#ef4444"
										text={`Temps de service élevé (${data.avgServiceTime}min). Identifier les étapes qui ralentissent le service.`}
									/>
								)}
								{data.totalOrders < 10 && (
									<CoachingItem
										icon="trending-up-outline"
										color="#f59e0b"
										text={`Volume de commandes faible (${data.totalOrders}). Encourager la prise en charge proactive des clients.`}
									/>
								)}
								{data.addOnRate < 20 && (
									<CoachingItem
										icon="star-outline"
										color="#8b5cf6"
										text={`Taux d'add-on bas (${data.addOnRate}%). Initier aux suggestions d'accompagnement (desserts, boissons…).`}
									/>
								)}
							</View>
						) : (
							<View
								style={[
									styles.card,
									{ backgroundColor: "#10b98111", borderColor: "#10b98133" },
								]}
							>
								<Ionicons
									name="checkmark-circle-outline"
									size={20}
									color="#10b981"
									style={{ marginBottom: 6 }}
								/>
								<Text
									style={{ color: "#10b981", fontWeight: "600", fontSize: 13 }}
								>
									Excellent profil — Aucune alerte de coaching détectée.
								</Text>
							</View>
						)}

						<View style={{ height: 40 }} />
					</ScrollView>
				) : null}

				{/* ── Modal objectifs ── */}
				<Modal
					visible={showObjectivesModal}
					transparent
					animationType="slide"
					onRequestClose={() => setShowObjectivesModal(false)}
				>
					<View style={styles.modalOverlay}>
						<View
							style={[
								styles.modalContent,
								{ backgroundColor: isDark ? "#1e293b" : "#f1f5f9" },
							]}
						>
							<View style={styles.modalHeaderRow}>
								<Text style={[styles.modalTitle, { color: textPrimary }]}>
									🎯 Objectifs — {server.name}
								</Text>
								<TouchableOpacity onPress={() => setShowObjectivesModal(false)}>
									<Ionicons name="close" size={24} color={textSecondary} />
								</TouchableOpacity>
							</View>

							<ScrollView
								showsVerticalScrollIndicator={false}
								keyboardShouldPersistTaps="handled"
							>
								<Text style={[styles.modalSubtitle, { color: textSecondary }]}>
									Ces objectifs sont visibles uniquement par les managers et
									admins.
								</Text>

								{[
									{
										key: "revenueTarget",
										label: "CA cible (€)",
										placeholder: "ex : 3000",
										keyboard: "decimal-pad",
									},
									{
										key: "ordersTarget",
										label: "Commandes cibles",
										placeholder: "ex : 150",
										keyboard: "numeric",
									},
									{
										key: "addOnRateTarget",
										label: "Taux d'add-on cible (%)",
										placeholder: "ex : 30",
										keyboard: "decimal-pad",
									},
								].map((field) => (
									<View key={field.key} style={styles.formGroup}>
										<Text style={[styles.formLabel, { color: textPrimary }]}>
											{field.label}
										</Text>
										<TextInput
											style={[
												styles.formInput,
												{
													backgroundColor: isDark
														? "rgba(255,255,255,0.1)"
														: "#ffffff",
													color: textPrimary,
													borderColor: isDark
														? "rgba(148,163,184,0.5)"
														: "#94a3b8",
												},
											]}
											placeholder={field.placeholder}
											placeholderTextColor={isDark ? "#64748b" : "#64748b"}
											keyboardType={field.keyboard}
											value={objectives[field.key]}
											onChangeText={(t) =>
												setObjectives((prev) => ({ ...prev, [field.key]: t }))
											}
										/>
									</View>
								))}

								<View style={styles.formGroup}>
									<Text style={[styles.formLabel, { color: textPrimary }]}>
										Note (facultatif)
									</Text>
									<TextInput
										style={[
											styles.formInput,
											{
												backgroundColor: isDark
													? "rgba(255,255,255,0.1)"
													: "#ffffff",
												color: textPrimary,
												borderColor: isDark
													? "rgba(148,163,184,0.5)"
													: "#94a3b8",
												height: 70,
												textAlignVertical: "top",
											},
										]}
										placeholder="Ex : objectif fixé en réunion du 01/02"
										placeholderTextColor={isDark ? "#64748b" : "#64748b"}
										multiline
										value={objectives.notes}
										onChangeText={(t) =>
											setObjectives((prev) => ({ ...prev, notes: t }))
										}
									/>
								</View>

								<TouchableOpacity
									style={[
										styles.saveBtn,
										{
											backgroundColor: THEME.colors.primary,
											opacity: isSavingObjectives ? 0.6 : 1,
										},
									]}
									onPress={handleSaveObjectives}
									disabled={isSavingObjectives}
								>
									{isSavingObjectives ? (
										<ActivityIndicator color="#fff" />
									) : (
										<>
											<Ionicons
												name="checkmark-circle"
												size={20}
												color="#fff"
											/>
											<Text style={styles.saveBtnText}>
												Enregistrer les objectifs
											</Text>
										</>
									)}
								</TouchableOpacity>
							</ScrollView>
						</View>
					</View>
				</Modal>
			</LinearGradient>
		</Modal>
	);
}

// ─── Mini-composant coaching ──────────────────────────────────────────────────
function CoachingItem({ icon, color, text }) {
	return (
		<View
			style={[
				coachStyles.item,
				{ backgroundColor: color + "11", borderLeftColor: color },
			]}
		>
			<Ionicons name={icon} size={16} color={color} style={{ marginTop: 1 }} />
			<Text style={[coachStyles.text, { color }]}>{text}</Text>
		</View>
	);
}
const coachStyles = StyleSheet.create({
	item: {
		flexDirection: "row",
		gap: 10,
		padding: 10,
		borderRadius: 8,
		borderLeftWidth: 3,
		marginBottom: 8,
		alignItems: "flex-start",
	},
	text: { flex: 1, fontSize: 12, lineHeight: 18, fontWeight: "500" },
});

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
	container: { flex: 1 },
	header: {
		flexDirection: "row",
		alignItems: "center",
		paddingTop: Platform.OS === "ios" ? 54 : 32,
		paddingHorizontal: 16,
		paddingBottom: 14,
		borderBottomWidth: 1,
		gap: 12,
	},
	backBtn: { padding: 4 },
	avatar: {
		width: 42,
		height: 42,
		borderRadius: 21,
		alignItems: "center",
		justifyContent: "center",
	},
	avatarText: { fontSize: 16, fontWeight: "800" },
	headerInfo: { flex: 1 },
	serverName: { fontSize: 17, fontWeight: "700" },
	serverRole: { fontSize: 12, marginTop: 1 },
	periodRow: {
		flexDirection: "row",
		paddingHorizontal: 16,
		paddingVertical: 10,
		gap: 8,
	},
	periodBtn: {
		flex: 1,
		paddingVertical: 7,
		borderRadius: 10,
		alignItems: "center",
	},
	periodLabel: { fontSize: 12, fontWeight: "600" },
	scroll: { flex: 1, paddingHorizontal: 16 },
	loading: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
	loadingText: { fontSize: 14 },
	kpiRow: {
		flexDirection: "row",
		gap: 10,
		marginTop: 14,
		marginBottom: 4,
		flexWrap: "wrap",
	},
	kpiCard: {
		flex: 1,
		minWidth: "22%",
		borderRadius: 12,
		padding: 10,
		alignItems: "center",
		borderWidth: 1,
		gap: 3,
	},
	kpiValue: { fontSize: 16, fontWeight: "800" },
	kpiLabel: { fontSize: 9, fontWeight: "600", textAlign: "center" },
	card: {
		borderRadius: 14,
		padding: 14,
		marginTop: 12,
		borderWidth: 1,
	},
	cardTitle: { fontSize: 13, fontWeight: "700", marginBottom: 12, gap: 6 },
	cardTitleRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 12,
	},
	editBtn: {
		flexDirection: "row",
		alignItems: "center",
		gap: 4,
		paddingHorizontal: 10,
		paddingVertical: 5,
		borderRadius: 8,
	},
	editBtnText: { fontSize: 11, fontWeight: "600" },
	sessionRow: { flexDirection: "row", gap: 10 },
	sessionStat: { flex: 1, borderRadius: 10, padding: 10, alignItems: "center" },
	sessionStatVal: { fontSize: 20, fontWeight: "800" },
	sessionStatLbl: { fontSize: 10, marginTop: 2, textAlign: "center" },
	addOnRow: { flexDirection: "row", gap: 10 },
	addOnStat: { flex: 1, borderRadius: 10, padding: 10, alignItems: "center" },
	addOnVal: { fontSize: 18, fontWeight: "800" },
	addOnLbl: { fontSize: 9, marginTop: 2, textAlign: "center" },
	payRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
		marginBottom: 10,
	},
	payDot: { width: 10, height: 10, borderRadius: 5 },
	payMethod: { width: 65, fontSize: 12, fontWeight: "500" },
	payTrack: {
		flex: 1,
		height: 8,
		backgroundColor: "rgba(100,116,139,0.12)",
		borderRadius: 4,
		overflow: "hidden",
	},
	payFill: { height: "100%", borderRadius: 4 },
	payPct: { width: 32, fontSize: 11, textAlign: "right" },
	catRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
		marginBottom: 8,
	},
	catName: { width: 80, fontSize: 12, fontWeight: "500" },
	catTrack: {
		flex: 1,
		height: 8,
		backgroundColor: "rgba(100,116,139,0.12)",
		borderRadius: 4,
		overflow: "hidden",
	},
	catFill: { height: "100%", borderRadius: 4 },
	catRevenue: { width: 42, fontSize: 11, textAlign: "right" },
	legendRow: {
		fontSize: 11,
		marginBottom: 10,
		flexDirection: "row",
		alignItems: "center",
		gap: 4,
	},
	legendDot: { width: 8, height: 8, borderRadius: 4 },
	objectiveNotes: { fontSize: 12, fontStyle: "italic", marginTop: 4 },
	emptyObjectives: {
		borderWidth: 1.5,
		borderStyle: "dashed",
		borderRadius: 10,
		padding: 16,
		alignItems: "center",
		gap: 8,
	},
	emptyObjectivesText: { fontSize: 13, textAlign: "center" },
	// Modal
	modalOverlay: {
		flex: 1,
		backgroundColor: "rgba(0,0,0,0.7)",
		justifyContent: "flex-end",
	},
	modalContent: {
		borderTopLeftRadius: 24,
		borderTopRightRadius: 24,
		padding: 24,
		paddingBottom: 36,
		maxHeight: "90%",
		shadowColor: "#000",
		shadowOffset: { width: 0, height: -4 },
		shadowOpacity: 0.15,
		shadowRadius: 12,
		elevation: 16,
	},
	modalHeaderRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 6,
		paddingBottom: 14,
		borderBottomWidth: 1,
		borderBottomColor: "rgba(148,163,184,0.2)",
	},
	modalTitle: { fontSize: 18, fontWeight: "700" },
	modalSubtitle: {
		fontSize: 12,
		marginTop: 14,
		marginBottom: 20,
		lineHeight: 17,
	},
	formGroup: { marginBottom: 14 },
	formLabel: { fontSize: 13, fontWeight: "700", marginBottom: 8 },
	formInput: {
		borderWidth: 1.5,
		borderRadius: 10,
		paddingHorizontal: 14,
		paddingVertical: 13,
		fontSize: 15,
	},
	saveBtn: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 8,
		paddingVertical: 14,
		borderRadius: 12,
		marginTop: 6,
	},
	saveBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});

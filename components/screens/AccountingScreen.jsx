/**
 * AccountingScreen.jsx - Module Comptabilité Avancé
 * Interface de gestion financière complète avec graphiques et analyses
 */
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
	View,
	Text,
	TouchableOpacity,
	ScrollView,
	ActivityIndicator,
	Modal,
	Dimensions,
	Alert,
	StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../hooks/useTheme";
import useUserStore from "../../src/stores/useUserStore";
import * as SecureStore from "expo-secure-store";
import { API_CONFIG } from "../../src/config/apiConfig";

import Svg, {
	Path,
	Defs,
	LinearGradient as SvgLinearGradient,
	Stop,
	G,
	Text as SvgText,
	Line as SvgLine,
	Circle,
} from "react-native-svg";

const { width: screenWidth } = Dimensions.get("window");

// ════════════════════════════════════════════════════
// 🔧 CONSTANTES (hors composant — jamais recréées)
// ════════════════════════════════════════════════════
const PERIODS = [
	{ key: "today", label: "Aujourd'hui", icon: "today" },
	{ key: "week", label: "Cette semaine", icon: "calendar" },
	{ key: "month", label: "Ce mois", icon: "calendar-outline" },
	{ key: "quarter", label: "Ce trimestre", icon: "calendar-number-outline" },
	{ key: "year", label: "Cette année", icon: "calendar-sharp" },
];

const TABS = [
	{ key: "overview", label: "Vue d'ensemble", icon: "analytics" },
	{ key: "charts", label: "Graphiques", icon: "bar-chart" },
	{ key: "details", label: "Détails", icon: "list" },
];

const MOIS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"];
const BAR_COLORS = ["#F59E0B", "#3B82F6", "#A855F7", "#22C55E", "#EF4444"];

const EMPTY_DATA = {
	totalRevenue: 0,
	totalOrders: 0,
	averageOrderValue: 0,
	revenueHT: 0,
	revenueTTC: 0,
	tvaCollected: 0,
	previousPeriodRevenue: 0,
	growthRate: 0,
	topProduct: "N/A",
	topProducts: [],
	dailyRevenues: [],
	serviceBreakdown: { midi: { revenue: 0, orders: 0 }, soir: { revenue: 0, orders: 0 } },
	hourlyDistribution: [],
	avgPerDay: 0,
	projectedRevenue: null,
	bestPeriod: { label: "—", revenue: 0 },
	period: "today",
	startDate: "",
	endDate: "",
};

// ════════════════════════════════════════════════════
// 📊 COMPOSANTS SVG — Line Chart
// ════════════════════════════════════════════════════
const SvgLineChart = ({
	data,
	labels,
	color,
	width,
	height,
	valueFormatter,
}) => {
	const PAD = { left: 44, right: 12, top: 16, bottom: 30 };
	const cw = width - PAD.left - PAD.right;
	const ch = height - PAD.top - PAD.bottom;

	if (!data || data.length < 2) {
		return (
			<View
				style={{
					width,
					height,
					alignItems: "center",
					justifyContent: "center",
				}}
			>
				<Text style={{ color: "#666", fontSize: 12 }}>
					Données insuffisantes
				</Text>
			</View>
		);
	}

	const maxVal = Math.max(...data, 1);
	const magnitude = Math.pow(10, Math.floor(Math.log10(maxVal)));
	const niceMax = Math.ceil(maxVal / magnitude) * magnitude;

	const xStep = data.length > 1 ? cw / (data.length - 1) : cw;
	const pts = data.map((v, i) => ({
		x: PAD.left + i * xStep,
		y: PAD.top + ch - (v / niceMax) * ch,
	}));

	const linePath = pts
		.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
		.join(" ");
	const areaPath = `${linePath} L ${pts[pts.length - 1].x.toFixed(1)} ${(PAD.top + ch).toFixed(1)} L ${PAD.left.toFixed(1)} ${(PAD.top + ch).toFixed(1)} Z`;

	const gradId = `lg_${color.replace("#", "").substring(0, 6)}`;
	const gridRatios = [0, 0.25, 0.5, 0.75, 1];

	return (
		<Svg width={width} height={height}>
			<Defs>
				<SvgLinearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
					<Stop offset="0" stopColor={color} stopOpacity="0.3" />
					<Stop offset="1" stopColor={color} stopOpacity="0.02" />
				</SvgLinearGradient>
			</Defs>

			{/* Grid lines */}
			{gridRatios.map((ratio, i) => {
				const gy = PAD.top + ch * (1 - ratio);
				const labelVal = niceMax * ratio;
				const labelStr = valueFormatter
					? valueFormatter(labelVal)
					: Math.round(labelVal).toString();
				return (
					<G key={i}>
						<SvgLine
							x1={PAD.left}
							y1={gy}
							x2={PAD.left + cw}
							y2={gy}
							stroke="#ffffff"
							strokeOpacity={i === 0 ? 0.12 : 0.05}
							strokeWidth="1"
							strokeDasharray={i > 0 ? "4 8" : "0"}
						/>
						<SvgText
							x={PAD.left - 5}
							y={gy + 4}
							fontSize="8"
							fill="#888888"
							textAnchor="end"
						>
							{labelStr}
						</SvgText>
					</G>
				);
			})}

			{/* Area gradient fill */}
			<Path d={areaPath} fill={`url(#${gradId})`} />

			{/* Main line */}
			<Path
				d={linePath}
				stroke={color}
				strokeWidth="2.5"
				fill="none"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>

			{/* Dots */}
			{pts.map((p, i) => (
				<G key={i}>
					<Circle cx={p.x} cy={p.y} r="6" fill={color} opacity="0.15" />
					<Circle
						cx={p.x}
						cy={p.y}
						r="3.5"
						fill={color}
						stroke="white"
						strokeWidth="1.5"
					/>
				</G>
			))}

			{/* X labels */}
			{labels.map((label, i) => {
				const show = data.length <= 8 || i % 2 === 0;
				if (!show) return null;
				return (
					<SvgText
						key={i}
						x={(PAD.left + i * xStep).toFixed(1)}
						y={height - 4}
						fontSize="9"
						fill="#888888"
						textAnchor="middle"
					>
						{label}
					</SvgText>
				);
			})}
		</Svg>
	);
};

// ════════════════════════════════════════════════════
// 🍩 COMPOSANTS SVG — Donut Chart
// ════════════════════════════════════════════════════
const SvgDonut = ({ segments, size, thickness, centerLabel, centerValue }) => {
	const cx = size / 2;
	const cy = size / 2;
	const r = size / 2 - thickness / 2 - 4;
	const total = segments.reduce((s, seg) => s + seg.value, 0);
	const GAP = 4;
	let currentAngle = -90;

	const toRad = (deg) => (deg * Math.PI) / 180;

	const arcs = segments.map((seg, i) => {
		const sweepAngle = (seg.value / total) * 360 - GAP;
		const startA = currentAngle + GAP / 2;
		const endA = startA + sweepAngle;
		currentAngle += (seg.value / total) * 360;

		const x1 = cx + r * Math.cos(toRad(startA));
		const y1 = cy + r * Math.sin(toRad(startA));
		const x2 = cx + r * Math.cos(toRad(endA));
		const y2 = cy + r * Math.sin(toRad(endA));
		const largeArc = sweepAngle > 180 ? 1 : 0;

		return (
			<Path
				key={i}
				d={`M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r.toFixed(2)} ${r.toFixed(2)} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`}
				stroke={seg.color}
				strokeWidth={thickness}
				fill="none"
				strokeLinecap="round"
			/>
		);
	});

	return (
		<Svg width={size} height={size}>
			{/* Background track */}
			<Circle
				cx={cx}
				cy={cy}
				r={r}
				stroke="#ffffff"
				strokeOpacity="0.07"
				strokeWidth={thickness}
				fill="none"
			/>
			{arcs}
			{/* Center labels */}
			<SvgText
				x={cx}
				y={cy - 8}
				fontSize="10"
				fill="#888888"
				textAnchor="middle"
				fontWeight="400"
			>
				{centerLabel}
			</SvgText>
			<SvgText
				x={cx}
				y={cy + 12}
				fontSize="15"
				fill="white"
				textAnchor="middle"
				fontWeight="700"
			>
				{centerValue}
			</SvgText>
		</Svg>
	);
};

export default function AccountingScreen({ onClose }) {
	const THEME = useTheme();
	const { role } = useUserStore();

	// ═══════════════════════════════════════════════════════════════════════
	// 🔧 ÉTATS
	// ═══════════════════════════════════════════════════════════════════════
	const [token, setToken] = useState(null);
	const [isLoading, setIsLoading] = useState(false);
	const [selectedPeriod, setSelectedPeriod] = useState("today");
	const [selectedTab, setSelectedTab] = useState("overview");
	const [selectedMetric, setSelectedMetric] = useState("revenue");
	const [data, setData] = useState(EMPTY_DATA);

	// ═══════════════════════════════════════════════════════════════════════
	// 🔧 CONFIGURATION
	// ═══════════════════════════════════════════════════════════════════════
	// PERIODS, TABS définis en dehors du composant (voir constantes globales)

	// ═══════════════════════════════════════════════════════════════════════
	// 🔧 HOOKS
	// ═══════════════════════════════════════════════════════════════════════
	useEffect(() => {
		SecureStore.getItemAsync("access_token")
			.then((t) => setToken(t))
			.catch((e) => console.error("❌ [AccountingScreen] Token:", e));
	}, []);

	// Reload quand token prêt ou période change
	useEffect(() => {
		if (token) loadData();
	}, [token, selectedPeriod]); // eslint-disable-line

	// ═══════════════════════════════════════════════════════════════════════
	// 📡 API CALLS
	// ═══════════════════════════════════════════════════════════════════════
	const loadData = useCallback(async () => {
		if (!token) return;
		setIsLoading(true);
		try {
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), 10000);

			const response = await fetch(
				`${API_CONFIG.baseURL}/accounting/summary?period=${selectedPeriod}`,
				{
					method: "GET",
					headers: {
						Authorization: `Bearer ${token}`,
						"Content-Type": "application/json",
					},
					signal: controller.signal,
				},
			);

			clearTimeout(timeoutId);

			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(`Erreur API: ${response.status} - ${errorText}`);
			}

			const apiData = await response.json();
			if (apiData.success && apiData.data) {
				setData(apiData.data);
				const d = apiData.data;
				const periodLabel = PERIODS.find((p) => p.key === selectedPeriod)?.label ?? selectedPeriod;
				console.log(
					`\n💰 [COMPTA] ── ${periodLabel} ──────────────────────────────`,
					`\n📅  Période     : ${d.startDate} → ${d.endDate}`,
					`\n💵  CA TTC      : €${d.totalRevenue?.toFixed(2)}`,
					`\n📊  CA HT       : €${d.revenueHT?.toFixed(2)}`,
					`\n🧾  TVA         : €${d.tvaCollected?.toFixed(2)}`,
					`\n📦  Commandes   : ${d.totalOrders}`,
					`\n🛒  Panier moy. : €${d.averageOrderValue?.toFixed(2)}`,
					`\n📈  Croissance  : ${d.growthRate > 0 ? "+" : ""}${d.growthRate?.toFixed(1)}% vs période préc.`,
					`\n🌞  Midi        : €${d.serviceBreakdown?.midi?.revenue?.toFixed(0)} (${d.serviceBreakdown?.midi?.orders} cmd)`,
					`\n🌙  Soir        : €${d.serviceBreakdown?.soir?.revenue?.toFixed(0)} (${d.serviceBreakdown?.soir?.orders} cmd)`,
					`\n📅  CA/jour     : €${d.avgPerDay?.toFixed(0)}`,
					d.projectedRevenue ? `\n🔮  Projection  : €${d.projectedRevenue?.toFixed(0)}` : "",
					d.bestPeriod?.revenue > 0 ? `\n🏆  Meilleur    : ${d.bestPeriod.label} (€${d.bestPeriod.revenue?.toFixed(0)})` : "",
					`\n─────────────────────────────────────────────────────────────\n`,
				);
			}
		} catch (error) {
			console.error("❌ [AccountingScreen] Erreur:", error.message);
			Alert.alert("Erreur", "Impossible de charger les données comptables");
		} finally {
			setIsLoading(false);
		}
	}, [token, selectedPeriod]);

	// ═══════════════════════════════════════════════════════════════════════
	// 🎨 STYLES (dépendent du thème)
	// ═══════════════════════════════════════════════════════════════════════
	const styles = useMemo(() => buildStyles(THEME), [THEME]);

	// ═══════════════════════════════════════════════════════════════════════
	// 🔐 VÉRIFICATIONS ACCÈS
	// ═══════════════════════════════════════════════════════════════════════
	const hasAccess = token && ["admin", "developer", "manager"].includes(role);

	if (!hasAccess) {
		return (
			<Modal visible={true} animationType="slide" presentationStyle="pageSheet">
				<View style={styles.modalContainer}>
					<View style={styles.header}>
						<Text style={styles.title}>💰 Comptabilité</Text>
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
					<View style={styles.loadingContainer}>
						<Ionicons
							name="lock-closed"
							size={48}
							color={THEME.colors.text.secondary}
						/>
						<Text style={styles.loadingText}>
							Accès restreint aux administrateurs
						</Text>
					</View>
				</View>
			</Modal>
		);
	}

	// ═══════════════════════════════════════════════════════════════════════
	// 🎨 RENDU CONTENU
	// ═══════════════════════════════════════════════════════════════════════

	const renderOverviewTab = () => {
		const midi = data.serviceBreakdown?.midi || { revenue: 0, orders: 0 };
		const soir = data.serviceBreakdown?.soir || { revenue: 0, orders: 0 };
		const totalService = midi.revenue + soir.revenue;
		const midiPct = totalService > 0 ? midi.revenue / totalService : 0.5;

		return (
			<ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
				<View style={styles.scrollContent}>

					{/* ── HERO ── */}
					<View style={styles.heroCard}>
						<Text style={styles.heroLabel}>Chiffre d'Affaires</Text>
						<Text style={styles.heroValue}>€{data.totalRevenue?.toFixed(2) || "0.00"}</Text>
						{data.growthRate !== undefined && (
							<View style={[styles.growthBadge, {
								backgroundColor: data.growthRate >= 0 ? "#22C55E18" : "#EF444418",
							}]}>
								<Ionicons
									name={data.growthRate >= 0 ? "trending-up" : "trending-down"}
									size={13}
									color={data.growthRate >= 0 ? "#22C55E" : "#EF4444"}
								/>
								<Text style={[styles.growthText, { color: data.growthRate >= 0 ? "#22C55E" : "#EF4444" }]}>
									{data.growthRate > 0 ? "+" : ""}{data.growthRate?.toFixed(1)}% vs période préc.
								</Text>
							</View>
						)}
					</View>

					{/* ── 3 PILLS ── */}
					<View style={styles.pillsRow}>
						<View style={styles.pill}>
							<Text style={styles.pillValue}>{data.totalOrders || 0}</Text>
							<Text style={styles.pillLabel}>Commandes</Text>
						</View>
						<View style={styles.pillDivider} />
						<View style={styles.pill}>
							<Text style={styles.pillValue}>€{data.averageOrderValue?.toFixed(0) || "0"}</Text>
							<Text style={styles.pillLabel}>Panier Moyen</Text>
						</View>
						<View style={styles.pillDivider} />
						<View style={styles.pill}>
							<Text style={styles.pillValue}>€{data.avgPerDay?.toFixed(0) || "0"}</Text>
							<Text style={styles.pillLabel}>CA / Jour</Text>
						</View>
					</View>

					{/* ── SERVICES MIDI / SOIR ── */}
					<View style={styles.section}>
						<Text style={styles.sectionTitle}>⏰ Services</Text>
						<View style={styles.servicesCard}>
							<View style={styles.splitBarContainer}>
								<View style={[styles.splitBarMidi, { flex: midiPct }]} />
								<View style={[styles.splitBarSoir, { flex: 1 - midiPct }]} />
							</View>
							<View style={styles.servicesRow}>
								<View style={styles.serviceItem}>
									<View style={[styles.serviceDot, { backgroundColor: "#F59E0B" }]} />
									<Text style={styles.serviceLabel}>Midi</Text>
									<Text style={styles.serviceValue}>€{midi.revenue.toFixed(0)}</Text>
									<Text style={styles.serviceOrders}>{midi.orders} cmd</Text>
								</View>
								<View style={styles.servicesDivider} />
								<View style={styles.serviceItem}>
									<View style={[styles.serviceDot, { backgroundColor: "#6366F1" }]} />
									<Text style={styles.serviceLabel}>Soir</Text>
									<Text style={styles.serviceValue}>€{soir.revenue.toFixed(0)}</Text>
									<Text style={styles.serviceOrders}>{soir.orders} cmd</Text>
								</View>
							</View>
						</View>
					</View>

					{/* ── CARTE CONTEXTUELLE ── */}
					{selectedPeriod === "month" && (data.projectedRevenue || 0) > 0 && (
						<View style={styles.contextCard}>
							<View style={styles.contextCardLeft}>
								<View style={styles.contextCardIcon}>
									<Ionicons name="trending-up-outline" size={18} color="#F59E0B" />
								</View>
								<View>
									<Text style={styles.contextCardLabel}>Projection fin de mois</Text>
									<Text style={styles.contextCardSub}>À ce rythme</Text>
								</View>
							</View>
							<Text style={styles.contextCardValue}>€{data.projectedRevenue?.toFixed(0)}</Text>
						</View>
					)}
					{(selectedPeriod === "week" || selectedPeriod === "quarter" || selectedPeriod === "year") && (data.bestPeriod?.revenue || 0) > 0 && (
						<View style={styles.contextCard}>
							<View style={styles.contextCardLeft}>
								<View style={styles.contextCardIcon}>
									<Ionicons name="trophy-outline" size={18} color="#F59E0B" />
								</View>
								<View>
									<Text style={styles.contextCardLabel}>
										{selectedPeriod === "week" ? "Meilleur jour" : "Meilleur mois"}
									</Text>
									<Text style={styles.contextCardSub}>{data.bestPeriod?.label}</Text>
								</View>
							</View>
							<Text style={styles.contextCardValue}>€{data.bestPeriod?.revenue?.toFixed(0)}</Text>
						</View>
					)}

					{/* ── FISCAL ── */}
					<View style={styles.section}>
						<Text style={styles.sectionTitle}>🧾 Fiscal</Text>
						<View style={styles.fiscalCard}>
							<View style={styles.fiscalRow}>
								<Text style={styles.fiscalLabel}>CA Hors Taxes</Text>
								<Text style={styles.fiscalAmount}>€{data.revenueHT?.toFixed(2) || "0.00"}</Text>
							</View>
							<View style={styles.fiscalRowDivider} />
							<View style={styles.fiscalRow}>
								<Text style={styles.fiscalLabel}>TVA Collectée (20%)</Text>
								<Text style={styles.fiscalAmount}>€{data.tvaCollected?.toFixed(2) || "0.00"}</Text>
							</View>
							<View style={styles.fiscalRowDivider} />
							<View style={styles.fiscalRow}>
								<Text style={[styles.fiscalLabel, { fontWeight: "600", color: THEME.colors.text.primary }]}>CA Toutes Taxes</Text>
								<Text style={[styles.fiscalAmount, { color: THEME.colors.primary.amber, fontWeight: "700" }]}>€{data.totalRevenue?.toFixed(2) || "0.00"}</Text>
							</View>
						</View>
					</View>

					{/* ── TOP PRODUITS ── */}
					<View style={styles.section}>
						<Text style={styles.sectionTitle}>🏆 Top Produits</Text>
						<View style={styles.productsList}>
							{data.topProducts?.length > 0 ? (
								data.topProducts.map((product, index) => (
									<View key={index} style={styles.productItem}>
										<View style={styles.productRank}>
											<Text style={styles.productRankText}>{index + 1}</Text>
										</View>
										<Text style={styles.productName} numberOfLines={1}>{product.name}</Text>
										<View style={styles.productStats}>
											<Text style={styles.productQuantity}>{product.quantity}x</Text>
											<Text style={styles.productRevenue}>€{product.revenue?.toFixed(0)}</Text>
										</View>
									</View>
								))
							) : (
								<View style={styles.productItem}>
									<Text style={styles.productName}>Aucun produit vendu</Text>
								</View>
							)}
						</View>
					</View>

				</View>
			</ScrollView>
		);
	};

	const renderChartsTab = () => {
		// ── Configuration métriques ──
		const METRICS = [
			{
				key: "revenue",
				label: "CA HT",
				icon: "cash-outline",
				color: "#F59E0B",
				value: data.revenueHT,
				format: (v) =>
					v >= 1000 ? `€${(v / 1000).toFixed(1)}k` : `€${(v || 0).toFixed(0)}`,
			},
			{
				key: "orders",
				label: "Commandes",
				icon: "receipt-outline",
				color: "#3B82F6",
				value: data.totalOrders,
				format: (v) => `${v || 0}`,
			},
			{
				key: "avg",
				label: "Panier Moyen",
				icon: "cart-outline",
				color: "#A855F7",
				value: data.averageOrderValue,
				format: (v) => `€${(v || 0).toFixed(0)}`,
			},
		];

		const activeMetric = METRICS.find((m) => m.key === selectedMetric);

		// ── Préparer données graphique ──
		const isLongPeriod =
			selectedPeriod === "year" || selectedPeriod === "quarter";

		let chartPoints = [];
		if (isLongPeriod && data.dailyRevenues?.length > 0) {
			const byMonth = {};
			data.dailyRevenues.forEach((d) => {
				const dt = new Date(d.date);
				const key = `${dt.getFullYear()}-${dt.getMonth()}`;
				if (!byMonth[key])
					byMonth[key] = { label: MOIS[dt.getMonth()], revenue: 0, orders: 0 };
				byMonth[key].revenue += d.revenue;
				byMonth[key].orders += d.orders;
			});
			chartPoints = Object.values(byMonth);
		} else if (data.dailyRevenues?.length > 0) {
			chartPoints = data.dailyRevenues.slice(-7).map((d) => {
				const dt = new Date(d.date);
				return {
					label: `${dt.getDate()}/${dt.getMonth() + 1}`,
					revenue: d.revenue,
					orders: d.orders,
				};
			});
		}

		const getChartValues = () => {
			switch (selectedMetric) {
				case "revenue":
					return chartPoints.map((p) => p.revenue || 0);
				case "orders":
					return chartPoints.map((p) => p.orders || 0);
				case "avg":
					return chartPoints.map((p) =>
						p.orders > 0 ? p.revenue / p.orders : 0,
					);
				default:
					return chartPoints.map((p) => p.revenue || 0);
			}
		};

		const chartValues = getChartValues();
		const chartLabels = chartPoints.map((p) => p.label);
		const hasData = chartPoints.length >= 2;
		const chartWidth = screenWidth - 72;

		const valueFormatter = (v) => {
			if (selectedMetric === "orders") return Math.round(v).toString();
			if (v >= 1000) return `€${(v / 1000).toFixed(1)}k`;
			return `€${v.toFixed(0)}`;
		};

		// ── Tendance ──
		const computeTrend = (vals) => {
			if (vals.length < 2) return 0;
			const h = Math.floor(vals.length / 2);
			const s1 = vals.slice(0, h).reduce((a, v) => a + v, 0) / h;
			const s2 = vals.slice(h).reduce((a, v) => a + v, 0) / (vals.length - h);
			return s1 > 0 ? ((s2 - s1) / s1) * 100 : 0;
		};

		const trend =
			selectedMetric === "revenue" && data.growthRate !== undefined
				? data.growthRate
				: computeTrend(chartValues);
		const trendPositive = trend >= 0;

		return (
			<ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
				<View style={styles.scrollContent}>
					{/* ── METRIC SELECTOR CARDS ── */}
					<View
						style={{
							flexDirection: "row",
							flexWrap: "wrap",
							justifyContent: "space-between",
							marginBottom: 12,
						}}
					>
						{METRICS.map((m) => {
							const isActive = selectedMetric === m.key;
							return (
								<TouchableOpacity
									key={m.key}
									onPress={() => setSelectedMetric(m.key)}
									activeOpacity={0.75}
									style={{
										width: "48%",
										backgroundColor: isActive
											? m.color + "18"
											: THEME.colors.background.card,
										borderRadius: 12,
										padding: 12,
										marginBottom: 8,
										borderWidth: 1.5,
										borderColor: isActive
											? m.color
											: THEME.colors.border.subtle,
									}}
								>
									<View
										style={{
											flexDirection: "row",
											alignItems: "center",
											justifyContent: "space-between",
											marginBottom: 6,
										}}
									>
										<View
											style={{ flexDirection: "row", alignItems: "center" }}
										>
											<View
												style={{
													width: 6,
													height: 6,
													borderRadius: 3,
													backgroundColor: m.color,
													marginRight: 6,
												}}
											/>
											<Text
												style={{
													fontSize: 11,
													color: THEME.colors.text.secondary,
												}}
											>
												{m.label}
											</Text>
										</View>
										{isActive && (
											<Ionicons
												name="radio-button-on"
												size={12}
												color={m.color}
											/>
										)}
									</View>
									<Text
										style={{
											fontSize: 22,
											fontWeight: "700",
											color: isActive ? m.color : THEME.colors.text.primary,
											marginBottom: 2,
										}}
									>
										{m.format(m.value || 0)}
									</Text>
									{m.key === "revenue" && data.growthRate !== undefined && (
										<View
											style={{
												flexDirection: "row",
												alignItems: "center",
											}}
										>
											<Ionicons
												name={data.growthRate >= 0 ? "arrow-up" : "arrow-down"}
												size={10}
												color={data.growthRate >= 0 ? "#22C55E" : "#EF4444"}
											/>
											<Text
												style={{
													fontSize: 10,
													color: data.growthRate >= 0 ? "#22C55E" : "#EF4444",
													marginLeft: 2,
													fontWeight: "600",
												}}
											>
												{Math.abs(data.growthRate).toFixed(1)}%
											</Text>
										</View>
									)}
								</TouchableOpacity>
							);
						})}
					</View>

					{/* ── SVG LINE CHART ── */}
					{hasData ? (
						<View style={[styles.chartContainer, { paddingHorizontal: 4 }]}>
							<View
								style={{
									flexDirection: "row",
									justifyContent: "space-between",
									alignItems: "center",
									marginBottom: 16,
									paddingHorizontal: 8,
								}}
							>
								<View>
									<Text
										style={{
											fontSize: 14,
											fontWeight: "700",
											color: THEME.colors.text.primary,
										}}
									>
										{activeMetric.label}
									</Text>
									<Text
										style={{
											fontSize: 10,
											color: THEME.colors.text.secondary,
											marginTop: 2,
										}}
									>
										{isLongPeriod ? "Évolution par mois" : "7 derniers jours"}
									</Text>
								</View>
								<View
									style={{
										flexDirection: "row",
										alignItems: "center",
										backgroundColor: trendPositive ? "#22C55E18" : "#EF444418",
										borderRadius: 8,
										paddingHorizontal: 8,
										paddingVertical: 4,
									}}
								>
									<Ionicons
										name={trendPositive ? "trending-up" : "trending-down"}
										size={12}
										color={trendPositive ? "#22C55E" : "#EF4444"}
									/>
									<Text
										style={{
											fontSize: 11,
											fontWeight: "700",
											color: trendPositive ? "#22C55E" : "#EF4444",
											marginLeft: 3,
										}}
									>
										{trend > 0 ? "+" : ""}
										{trend.toFixed(1)}%
									</Text>
								</View>
							</View>
							<SvgLineChart
								data={chartValues}
								labels={chartLabels}
								color={activeMetric.color}
								width={chartWidth}
								height={200}
								valueFormatter={valueFormatter}
							/>
						</View>
					) : (
						<View
							style={[
								styles.chartContainer,
								{
									height: 100,
									justifyContent: "center",
									alignItems: "center",
								},
							]}
						>
							<Text
								style={{
									color: THEME.colors.text.secondary,
									fontSize: 13,
								}}
							>
								Aucune donnée pour cette période
							</Text>
						</View>
					)}

					{/* ── SVG DONUT CHART ── */}


					{/* ── TOP PRODUITS BARRES HORIZONTALES ── */}
					{data.topProducts?.length > 0 && (
						<View style={styles.chartContainer}>
							<Text
								style={{
									fontSize: 14,
									fontWeight: "700",
									color: THEME.colors.text.primary,
									marginBottom: 4,
								}}
							>
								🏆 Top Produits
							</Text>
							<Text
								style={{
									fontSize: 11,
									color: THEME.colors.text.secondary,
									marginBottom: 16,
								}}
							>
								Classement par chiffre d&apos;affaires
							</Text>
							{(() => {
								const maxRev = Math.max(
									...data.topProducts.map((p) => p.revenue || 0),
									1,
								);
								return data.topProducts.slice(0, 5).map((product, idx) => {
									const pct = (product.revenue || 0) / maxRev;
									const col = BAR_COLORS[idx % BAR_COLORS.length];
									const barMaxWidth = screenWidth - 160;
									return (
										<View key={idx} style={{ marginBottom: 14 }}>
											<View
												style={{
													flexDirection: "row",
													justifyContent: "space-between",
													alignItems: "center",
													marginBottom: 5,
												}}
											>
												<View
													style={{
														flexDirection: "row",
														alignItems: "center",
														flex: 1,
													}}
												>
													<View
														style={{
															width: 20,
															height: 20,
															borderRadius: 10,
															backgroundColor: col + "25",
															justifyContent: "center",
															alignItems: "center",
															marginRight: 8,
														}}
													>
														<Text
															style={{
																fontSize: 9,
																fontWeight: "700",
																color: col,
															}}
														>
															{idx + 1}
														</Text>
													</View>
													<Text
														style={{
															fontSize: 12,
															color: THEME.colors.text.primary,
															flex: 1,
														}}
														numberOfLines={1}
													>
														{product.name}
													</Text>
												</View>
												<View style={{ alignItems: "flex-end" }}>
													<Text
														style={{
															fontSize: 13,
															fontWeight: "700",
															color: col,
														}}
													>
														€{(product.revenue || 0).toFixed(2)}
													</Text>
													<Text
														style={{
															fontSize: 10,
															color: THEME.colors.text.secondary,
														}}
													>
														{product.quantity}x vendu
													</Text>
												</View>
											</View>
											<View
												style={{
													height: 6,
													backgroundColor: THEME.colors.background.subtle,
													borderRadius: 3,
													overflow: "hidden",
													marginLeft: 28,
												}}
											>
												<View
													style={{
														height: 6,
														width: barMaxWidth * pct,
														backgroundColor: col,
														borderRadius: 3,
													}}
												/>
											</View>
										</View>
									);
								});
							})()}
						</View>
					)}

				{/* ── HEATMAP HORAIRE ── */}
				{data.hourlyDistribution?.length > 0 && (
					<View style={styles.chartContainer}>
						<Text style={{ fontSize: 14, fontWeight: "700", color: THEME.colors.text.primary, marginBottom: 4 }}>
							⏰ Répartition horaire
						</Text>
						<Text style={{ fontSize: 11, color: THEME.colors.text.secondary, marginBottom: 16 }}>
							CA par heure (UTC+2)
						</Text>
						{(() => {
							const maxRev = Math.max(...data.hourlyDistribution.map((h) => h.revenue), 1);
							const barMaxW = screenWidth - 148;
							const MIDI_H = [11, 12, 13, 14, 15];
							const SOIR_H = [18, 19, 20, 21, 22, 23];
							return data.hourlyDistribution
								.filter((h) => h.orders > 0)
								.map((h, idx) => {
									const color = MIDI_H.includes(h.hour) ? "#F59E0B" : SOIR_H.includes(h.hour) ? "#6366F1" : "#64748B";
									const pct = h.revenue / maxRev;
									return (
										<View key={idx} style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
											<Text style={{ width: 28, fontSize: 11, color: THEME.colors.text.secondary, textAlign: "right" }}>
												{h.hour}h
											</Text>
											<View style={{ height: 16, width: Math.max(barMaxW * pct, 4), backgroundColor: color, borderRadius: 3, marginHorizontal: 8, opacity: 0.85 }} />
											<Text style={{ fontSize: 11, color: THEME.colors.text.secondary }}>
												€{h.revenue.toFixed(0)}
											</Text>
										</View>
									);
								});
						})()}
						<View style={{ flexDirection: "row", marginTop: 12, gap: 16 }}>
							{[{ color: "#F59E0B", label: "Midi" }, { color: "#6366F1", label: "Soir" }, { color: "#64748B", label: "Autre" }].map((l) => (
								<View key={l.label} style={{ flexDirection: "row", alignItems: "center" }}>
									<View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: l.color, marginRight: 5 }} />
									<Text style={{ fontSize: 10, color: THEME.colors.text.secondary }}>{l.label}</Text>
								</View>
							))}
						</View>
					</View>
				)}

				</View>
			</ScrollView>
		);
	};

	const renderDetailsTab = () => (
		<ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
			<View style={styles.scrollContent}>

				{/* ── RÉSUMÉ PÉRIODE ── */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>📋 Résumé de la période</Text>
					<View style={styles.fiscalCard}>
						<View style={styles.fiscalRow}>
							<Text style={styles.fiscalLabel}>Période</Text>
							<Text style={styles.fiscalAmount}>{PERIODS.find((p) => p.key === selectedPeriod)?.label}</Text>
						</View>
						<View style={styles.fiscalRowDivider} />
						<View style={styles.fiscalRow}>
							<Text style={styles.fiscalLabel}>Du</Text>
							<Text style={styles.fiscalAmount}>{data.startDate}</Text>
						</View>
						<View style={styles.fiscalRowDivider} />
						<View style={styles.fiscalRow}>
							<Text style={styles.fiscalLabel}>Au</Text>
							<Text style={styles.fiscalAmount}>{data.endDate}</Text>
						</View>
					</View>
				</View>

				{/* ── CHIFFRE D'AFFAIRES ── */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>💶 Chiffre d'affaires</Text>
					<View style={styles.fiscalCard}>
						<View style={styles.fiscalRow}>
							<Text style={[styles.fiscalLabel, { fontWeight: "600", color: THEME.colors.text.primary }]}>CA TTC</Text>
							<Text style={[styles.fiscalAmount, { color: THEME.colors.primary.amber, fontWeight: "700" }]}>€{data.totalRevenue?.toFixed(2) || "0.00"}</Text>
						</View>
						<View style={styles.fiscalRowDivider} />
						<View style={styles.fiscalRow}>
							<Text style={styles.fiscalLabel}>CA HT</Text>
							<Text style={styles.fiscalAmount}>€{data.revenueHT?.toFixed(2) || "0.00"}</Text>
						</View>
						<View style={styles.fiscalRowDivider} />
						<View style={styles.fiscalRow}>
							<Text style={styles.fiscalLabel}>TVA Collectée</Text>
							<Text style={styles.fiscalAmount}>€{data.tvaCollected?.toFixed(2) || "0.00"}</Text>
						</View>
						<View style={styles.fiscalRowDivider} />
						<View style={styles.fiscalRow}>
							<Text style={styles.fiscalLabel}>Commandes</Text>
							<Text style={styles.fiscalAmount}>{data.totalOrders || 0}</Text>
						</View>
						<View style={styles.fiscalRowDivider} />
						<View style={styles.fiscalRow}>
							<Text style={styles.fiscalLabel}>Panier Moyen</Text>
							<Text style={styles.fiscalAmount}>€{data.averageOrderValue?.toFixed(2) || "0.00"}</Text>
						</View>
						<View style={styles.fiscalRowDivider} />
						<View style={styles.fiscalRow}>
							<Text style={styles.fiscalLabel}>CA Moyen / Jour</Text>
							<Text style={styles.fiscalAmount}>€{data.avgPerDay?.toFixed(2) || "0.00"}</Text>
						</View>
					</View>
				</View>

				{/* ── COMPARAISON ── */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>📈 Comparaison</Text>
					<View style={styles.fiscalCard}>
						<View style={styles.fiscalRow}>
							<Text style={styles.fiscalLabel}>Période précédente</Text>
							<Text style={styles.fiscalAmount}>€{data.previousPeriodRevenue?.toFixed(2) || "0.00"}</Text>
						</View>
						<View style={styles.fiscalRowDivider} />
						<View style={styles.fiscalRow}>
							<Text style={styles.fiscalLabel}>Évolution</Text>
							<Text style={[styles.fiscalAmount, { color: (data.growthRate || 0) >= 0 ? "#22C55E" : "#EF4444", fontWeight: "600" }]}>
								{(data.growthRate || 0) > 0 ? "+" : ""}{data.growthRate?.toFixed(1) || "0.0"}%
							</Text>
						</View>
						{selectedPeriod === "month" && (data.projectedRevenue || 0) > 0 && (
							<>
								<View style={styles.fiscalRowDivider} />
								<View style={styles.fiscalRow}>
									<Text style={styles.fiscalLabel}>Projection fin de mois</Text>
									<Text style={[styles.fiscalAmount, { color: "#3B82F6", fontWeight: "600" }]}>€{data.projectedRevenue?.toFixed(0)}</Text>
								</View>
							</>
						)}
					</View>
				</View>

				{/* ── SERVICES ── */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>⏰ Détail services</Text>
					<View style={styles.fiscalCard}>
						{[
							{ label: "Midi (11h–16h)", ...(data.serviceBreakdown?.midi || { revenue: 0, orders: 0 }) },
							{ label: "Soir (18h–00h)", ...(data.serviceBreakdown?.soir || { revenue: 0, orders: 0 }) },
						].map((s, i) => (
							<React.Fragment key={i}>
								{i > 0 && <View style={styles.fiscalRowDivider} />}
								<View style={styles.fiscalRow}>
									<Text style={styles.fiscalLabel}>{s.label}</Text>
									<View style={{ alignItems: "flex-end" }}>
										<Text style={styles.fiscalAmount}>€{(s.revenue || 0).toFixed(2)}</Text>
										<Text style={{ fontSize: 11, color: THEME.colors.text.secondary }}>{s.orders || 0} cmd</Text>
									</View>
								</View>
							</React.Fragment>
						))}
					</View>
				</View>

				<TouchableOpacity style={styles.refreshButton} onPress={loadData}>
					<Text style={styles.refreshButtonText}>🔄 Actualiser les données</Text>
				</TouchableOpacity>

			</View>
		</ScrollView>
	);

	if (isLoading && !data.totalRevenue) {
		return (
			<Modal visible={true} animationType="slide" presentationStyle="pageSheet">
				<View style={styles.modalContainer}>
					<View style={styles.header}>
						<Text style={styles.title}>💰 Comptabilité</Text>
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
					<View style={styles.loadingContainer}>
						<ActivityIndicator
							size="large"
							color={THEME.colors.primary.amber}
						/>
						<Text style={styles.loadingText}>
							Chargement des données comptables...
						</Text>
					</View>
				</View>
			</Modal>
		);
	}

	// ═══════════════════════════════════════════════════════════════════════
	// 🎨 RENDU PRINCIPAL
	// ═══════════════════════════════════════════════════════════════════════
	return (
		<Modal visible={true} animationType="slide" presentationStyle="pageSheet">
			<View style={styles.modalContainer}>
				{/* Header */}
				<View style={styles.header}>
					<Text style={styles.title}>💰 Comptabilité</Text>
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

				{/* Sélecteur de période */}
				<View style={styles.periodSelector}>
					{PERIODS.map((period) => (
						<TouchableOpacity
							key={period.key}
							style={[
								styles.periodButton,
								selectedPeriod === period.key && styles.periodButtonActive,
							]}
							onPress={() => {
								setSelectedPeriod(period.key);
							}}
						>
							<Ionicons
								name={period.icon}
								size={16}
								color={
									selectedPeriod === period.key
										? "#fff"
										: THEME.colors.text.secondary
								}
							/>
							<Text
								style={[
									styles.periodButtonText,
									selectedPeriod === period.key &&
										styles.periodButtonTextActive,
								]}
							>
								{period.label}
							</Text>
						</TouchableOpacity>
					))}
				</View>

				{/* Sélecteur d'onglets */}
				<View style={styles.tabSelector}>
					{TABS.map((tab) => (
						<TouchableOpacity
							key={tab.key}
							style={[
								styles.tabButton,
								selectedTab === tab.key && styles.tabButtonActive,
							]}
							onPress={() => setSelectedTab(tab.key)}
						>
							<Ionicons
								name={tab.icon}
								size={18}
								color={
									selectedTab === tab.key
										? THEME.colors.primary.amber
										: THEME.colors.text.secondary
								}
							/>
							<Text
								style={[
									styles.tabButtonText,
									selectedTab === tab.key && styles.tabButtonTextActive,
								]}
							>
								{tab.label}
							</Text>
						</TouchableOpacity>
					))}
				</View>

				{/* Contenu des onglets */}
				{selectedTab === "overview" && renderOverviewTab()}
				{selectedTab === "charts" && renderChartsTab()}
				{selectedTab === "details" && renderDetailsTab()}
			</View>
		</Modal>
	);
}

// ════════════════════════════════════════════════════
// 🎨 STYLES — buildStyles (THEME-dependent, memoized)
// ════════════════════════════════════════════════════
function buildStyles(THEME) {
	return StyleSheet.create({
		modalContainer: {
			flex: 1,
			backgroundColor: THEME.colors.background.dark,
		},
		header: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
			padding: 16,
			backgroundColor: THEME.colors.background.card,
			borderBottomWidth: 1,
			borderBottomColor: THEME.colors.border.subtle,
		},
		title: {
			fontSize: 22,
			fontWeight: "700",
			color: THEME.colors.text.primary,
		},
		closeButton: {
			padding: 8,
		},
		content: {
			flex: 1,
		},
		periodSelector: {
			flexDirection: "row",
			backgroundColor: THEME.colors.background.card,
			padding: 12,
			justifyContent: "space-around",
			borderBottomWidth: 1,
			borderBottomColor: THEME.colors.border.subtle,
		},
		periodButton: {
			paddingVertical: 8,
			paddingHorizontal: 12,
			borderRadius: 8,
			backgroundColor: THEME.colors.background.subtle,
		},
		periodButtonActive: {
			backgroundColor: THEME.colors.primary.amber,
		},
		periodButtonText: {
			fontSize: 12,
			color: THEME.colors.text.secondary,
			textAlign: "center",
			fontWeight: "600",
		},
		periodButtonTextActive: {
			color: "#fff",
			fontWeight: "600",
		},
		tabSelector: {
			flexDirection: "row",
			backgroundColor: THEME.colors.background.card,
			paddingHorizontal: 12,
			paddingVertical: 12,
			borderBottomWidth: 1,
			borderBottomColor: THEME.colors.border.subtle,
		},
		tabButton: {
			flex: 1,
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "center",
			paddingVertical: 8,
			paddingHorizontal: 12,
			borderRadius: 8,
			marginHorizontal: 4,
		},
		tabButtonActive: {
			backgroundColor: THEME.colors.primary.amber + "20",
		},
		tabButtonText: {
			fontSize: 12,
			color: THEME.colors.text.secondary,
			marginLeft: 4,
		},
		tabButtonTextActive: {
			color: THEME.colors.primary.amber,
			fontWeight: "600",
		},
		scrollContent: {
			padding: 12,
		},
		metricsGrid: {
			flexDirection: "row",
			flexWrap: "wrap",
			justifyContent: "space-between",
			marginBottom: 12,
		},
		metricCard: {
			width: "48%",
			backgroundColor: THEME.colors.background.card,
			padding: 12,
			borderRadius: 12,
			marginBottom: 12,
		},
		metricCardLarge: {
			width: "100%",
		},
		metricValue: {
			fontSize: 18,
			fontWeight: "700",
			color: THEME.colors.text.primary,
			marginBottom: 4,
		},
		metricLabel: {
			fontSize: 12,
			color: THEME.colors.text.secondary,
		},
		metricChange: {
			flexDirection: "row",
			alignItems: "center",
			marginTop: 4,
		},
		metricChangeText: {
			fontSize: 11,
			marginLeft: 4,
		},
		metricChangePositive: {
			color: "#22C55E",
		},
		metricChangeNegative: {
			color: "#EF4444",
		},
		section: {
			marginBottom: 12,
		},
		sectionTitle: {
			fontSize: 16,
			fontWeight: "600",
			color: THEME.colors.text.primary,
			marginBottom: 12,
		},
		chartContainer: {
			backgroundColor: THEME.colors.background.card,
			borderRadius: 12,
			padding: 12,
			marginBottom: 12,
			overflow: "hidden",
		},
		chartTitle: {
			fontSize: 14,
			fontWeight: "600",
			color: THEME.colors.text.primary,
			marginBottom: 12,
			textAlign: "center",
		},
		productsList: {
			backgroundColor: THEME.colors.background.card,
			borderRadius: 12,
			overflow: "hidden",
		},
		productItem: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
			padding: 12,
			borderBottomWidth: 1,
			borderBottomColor: THEME.colors.border.subtle,
		},
		productName: {
			fontSize: 13,
			color: THEME.colors.text.primary,
			flex: 1,
		},
		productStats: {
			flexDirection: "row",
			alignItems: "center",
		},
		productQuantity: {
			fontSize: 12,
			color: THEME.colors.text.secondary,
			marginRight: THEME.spacing.sm,
		},
		productRevenue: {
			fontSize: 14,
			fontWeight: "600",
			color: THEME.colors.primary.amber,
		},
		loadingContainer: {
			flex: 1,
			justifyContent: "center",
			alignItems: "center",
			padding: THEME.spacing.xl,
		},
		loadingText: {
			fontSize: 16,
			color: THEME.colors.text.secondary,
			marginTop: THEME.spacing.md,
		},

		// ── HERO ──
		heroCard: {
			backgroundColor: THEME.colors.background.card,
			borderRadius: 16,
			padding: 24,
			marginBottom: 12,
			alignItems: "center",
			shadowColor: "#000",
			shadowOffset: { width: 0, height: 2 },
			shadowOpacity: 0.08,
			shadowRadius: 8,
			elevation: 3,
		},
		heroLabel: {
			fontSize: 12,
			color: THEME.colors.text.secondary,
			textTransform: "uppercase",
			letterSpacing: 1,
			marginBottom: 8,
		},
		heroValue: {
			fontSize: 36,
			fontWeight: "800",
			color: THEME.colors.text.primary,
			marginBottom: 12,
		},
		growthBadge: {
			flexDirection: "row",
			alignItems: "center",
			paddingHorizontal: 10,
			paddingVertical: 5,
			borderRadius: 20,
			gap: 4,
		},
		growthText: {
			fontSize: 12,
			fontWeight: "600",
		},

		// ── PILLS ──
		pillsRow: {
			flexDirection: "row",
			backgroundColor: THEME.colors.background.card,
			borderRadius: 12,
			marginBottom: 12,
			overflow: "hidden",
		},
		pill: {
			flex: 1,
			alignItems: "center",
			paddingVertical: 14,
		},
		pillValue: {
			fontSize: 16,
			fontWeight: "700",
			color: THEME.colors.text.primary,
			marginBottom: 2,
		},
		pillLabel: {
			fontSize: 10,
			color: THEME.colors.text.secondary,
			textTransform: "uppercase",
			letterSpacing: 0.5,
		},
		pillDivider: {
			width: 1,
			backgroundColor: THEME.colors.border.subtle,
			marginVertical: 10,
		},

		// ── SERVICES ──
		servicesCard: {
			backgroundColor: THEME.colors.background.card,
			borderRadius: 12,
			padding: 16,
			overflow: "hidden",
		},
		splitBarContainer: {
			flexDirection: "row",
			height: 6,
			borderRadius: 3,
			overflow: "hidden",
			marginBottom: 16,
		},
		splitBarMidi: {
			backgroundColor: "#F59E0B",
		},
		splitBarSoir: {
			backgroundColor: "#6366F1",
		},
		servicesRow: {
			flexDirection: "row",
			alignItems: "center",
		},
		serviceItem: {
			flex: 1,
			alignItems: "center",
		},
		serviceDot: {
			width: 8,
			height: 8,
			borderRadius: 4,
			marginBottom: 4,
		},
		serviceLabel: {
			fontSize: 11,
			color: THEME.colors.text.secondary,
			textTransform: "uppercase",
			letterSpacing: 0.5,
			marginBottom: 2,
		},
		serviceValue: {
			fontSize: 16,
			fontWeight: "700",
			color: THEME.colors.text.primary,
		},
		serviceOrders: {
			fontSize: 11,
			color: THEME.colors.text.secondary,
			marginTop: 2,
		},
		servicesDivider: {
			width: 1,
			height: 48,
			backgroundColor: THEME.colors.border.subtle,
		},

		// ── CONTEXT CARD ──
		contextCard: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
			backgroundColor: THEME.colors.background.card,
			borderRadius: 12,
			padding: 16,
			marginBottom: 12,
		},
		contextCardLeft: {
			flexDirection: "row",
			alignItems: "center",
			gap: 12,
		},
		contextCardIcon: {
			width: 36,
			height: 36,
			borderRadius: 10,
			backgroundColor: "#F59E0B18",
			alignItems: "center",
			justifyContent: "center",
		},
		contextCardLabel: {
			fontSize: 13,
			fontWeight: "600",
			color: THEME.colors.text.primary,
		},
		contextCardSub: {
			fontSize: 11,
			color: THEME.colors.text.secondary,
			marginTop: 1,
		},
		contextCardValue: {
			fontSize: 18,
			fontWeight: "700",
			color: THEME.colors.primary.amber,
		},

		// ── FISCAL ──
		fiscalCard: {
			backgroundColor: THEME.colors.background.card,
			borderRadius: 12,
			overflow: "hidden",
		},
		fiscalRow: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
			paddingHorizontal: 16,
			paddingVertical: 14,
		},
		fiscalRowDivider: {
			height: 1,
			backgroundColor: THEME.colors.border.subtle,
			marginHorizontal: 16,
		},
		fiscalLabel: {
			fontSize: 13,
			color: THEME.colors.text.secondary,
		},
		fiscalAmount: {
			fontSize: 13,
			fontWeight: "500",
			color: THEME.colors.text.primary,
		},

		// ── PRODUCT RANK ──
		productRank: {
			width: 22,
			height: 22,
			borderRadius: 11,
			backgroundColor: THEME.colors.border.subtle,
			alignItems: "center",
			justifyContent: "center",
			marginRight: 10,
		},
		productRankText: {
			fontSize: 11,
			fontWeight: "700",
			color: THEME.colors.text.secondary,
		},

		// ── REFRESH BUTTON ──
		refreshButton: {
			backgroundColor: THEME.colors.primary.amber,
			borderRadius: 12,
			padding: 14,
			alignItems: "center",
			marginTop: 8,
			marginBottom: 24,
		},
		refreshButtonText: {
			color: "#fff",
			fontWeight: "600",
			fontSize: 15,
		},
	});
}

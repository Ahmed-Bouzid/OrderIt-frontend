/**
 * AccountingScreen.jsx - Module Comptabilité Avancé
 * Interface de gestion financière complète avec graphiques et analyses
 */
import React, { useState, useEffect } from "react";
import {
	View,
	Text,
	TouchableOpacity,
	ScrollView,
	ActivityIndicator,
	Modal,
	Dimensions,
	Alert,
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
	const [dataLoaded, setDataLoaded] = useState(false);
	const [selectedPeriod, setSelectedPeriod] = useState("today");
	const [selectedTab, setSelectedTab] = useState("overview");
	const [selectedMetric, setSelectedMetric] = useState("revenue");

	// Données principales
	const [data, setData] = useState({
		// Métriques de base
		totalRevenue: 0,
		totalOrders: 0,
		averageOrderValue: 0,

		// Comptabilité avancée
		revenueHT: 0,
		revenueTTC: 0,
		tvaCollected: 0,
		costs: 0,
		grossMargin: 0,
		marginPercent: 0,
		netResult: 0,

		// Évolution
		previousPeriodRevenue: 0,
		growthRate: 0,

		// Produits
		topProduct: "N/A",
		topProducts: [],

		// Graphiques
		dailyRevenues: [],

		// Meta
		period: "today",
		startDate: "",
		endDate: "",
	});

	// ═══════════════════════════════════════════════════════════════════════
	// 🔧 CONFIGURATION
	// ═══════════════════════════════════════════════════════════════════════
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

	// ═══════════════════════════════════════════════════════════════════════
	// 🔧 HOOKS
	// ═══════════════════════════════════════════════════════════════════════
	useEffect(() => {
		const getToken = async () => {
			try {
				const storedToken = await SecureStore.getItemAsync("access_token");
				setToken(storedToken);
			} catch (error) {
				console.error(
					"❌ [AccountingScreen] Erreur récupération token:",
					error,
				);
			}
		};
		getToken();
	}, []);

	useEffect(() => {
		if (token && !dataLoaded) {
			setDataLoaded(true);
			loadData();
			if (selectedTab === "charts") {
				loadChartData();
			}
		}
	}, [token, dataLoaded, selectedPeriod]); // eslint-disable-line

	useEffect(() => {
		if (token && dataLoaded && selectedTab === "charts") {
			loadChartData();
		}
	}, [selectedTab, selectedPeriod]); // eslint-disable-line

	// ═══════════════════════════════════════════════════════════════════════
	// 📡 API CALLS
	// ═══════════════════════════════════════════════════════════════════════
	const loadData = async () => {
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
			}
		} catch (error) {
			console.error("❌ [AccountingScreen] Erreur:", error.message);
			Alert.alert("Erreur", "Impossible de charger les données comptables");
		} finally {
			setIsLoading(false);
		}
	};

	const loadChartData = async () => {
		try {
			// Pour l'instant, on utilise juste les données dailyRevenues
		} catch (error) {
			console.error(
				"❌ [AccountingScreen] Erreur chargement graphiques:",
				error,
			);
		}
	};

	// ═══════════════════════════════════════════════════════════════════════
	// 🎨 STYLES
	// ═══════════════════════════════════════════════════════════════════════
	const styles = {
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
		// Cartes métriques
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
		// Sections
		section: {
			marginBottom: 12,
		},
		sectionTitle: {
			fontSize: 16,
			fontWeight: "600",
			color: THEME.colors.text.primary,
			marginBottom: 12,
		},
		// Graphiques
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
		// Liste produits
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
		// Loading
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
	};

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

	const renderOverviewTab = () => (
		<ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
			<View style={styles.scrollContent}>
				{/* Métriques principales */}
				<View style={styles.metricsGrid}>
					<View style={styles.metricCard}>
						<Text style={styles.metricValue}>
							€{data.totalRevenue?.toFixed(2) || "0.00"}
						</Text>
						<Text style={styles.metricLabel}>Chiffre d&apos;Affaires</Text>
						{data.growthRate !== undefined && (
							<View style={styles.metricChange}>
								<Ionicons
									name={data.growthRate >= 0 ? "trending-up" : "trending-down"}
									size={16}
									color={data.growthRate >= 0 ? "#22C55E" : "#EF4444"}
								/>
								<Text
									style={[
										styles.metricChangeText,
										data.growthRate >= 0
											? styles.metricChangePositive
											: styles.metricChangeNegative,
									]}
								>
									{data.growthRate > 0 ? "+" : ""}
									{data.growthRate?.toFixed(1) || "0.0"}%
								</Text>
							</View>
						)}
					</View>

					<View style={styles.metricCard}>
						<Text style={styles.metricValue}>{data.totalOrders || 0}</Text>
						<Text style={styles.metricLabel}>Commandes</Text>
					</View>

					<View style={styles.metricCard}>
						<Text style={styles.metricValue}>
							€{data.averageOrderValue?.toFixed(2) || "0.00"}
						</Text>
						<Text style={styles.metricLabel}>Panier Moyen</Text>
					</View>

					<View style={styles.metricCard}>
						<Text style={styles.metricValue}>
							{data.marginPercent?.toFixed(1) || "0.0"}%
						</Text>
						<Text style={styles.metricLabel}>Marge Brute</Text>
					</View>
				</View>

				{/* Comptabilité avancée */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>📊 Analyse Comptable</Text>

					<View style={styles.metricsGrid}>
						<View style={styles.metricCard}>
							<Text style={styles.metricValue}>
								€{data.revenueHT?.toFixed(2) || "0.00"}
							</Text>
							<Text style={styles.metricLabel}>CA Hors Taxes</Text>
						</View>

						<View style={styles.metricCard}>
							<Text style={styles.metricValue}>
								€{data.tvaCollected?.toFixed(2) || "0.00"}
							</Text>
							<Text style={styles.metricLabel}>TVA Collectée</Text>
						</View>

						<View style={styles.metricCard}>
							<Text style={styles.metricValue}>
								€{data.costs?.toFixed(2) || "0.00"}
							</Text>
							<Text style={styles.metricLabel}>Coûts Estimés</Text>
						</View>

						<View style={styles.metricCard}>
							<Text style={styles.metricValue}>
								€{data.netResult?.toFixed(2) || "0.00"}
							</Text>
							<Text style={styles.metricLabel}>Résultat Net</Text>
						</View>
					</View>
				</View>

				{/* Top produits */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>🏆 Produits Populaires</Text>
					<View style={styles.productsList}>
						{data.topProducts?.length > 0 ? (
							data.topProducts.map((product, index) => (
								<View key={index} style={styles.productItem}>
									<Text style={styles.productName}>{product.name}</Text>
									<View style={styles.productStats}>
										<Text style={styles.productQuantity}>
											{product.quantity}x
										</Text>
										<Text style={styles.productRevenue}>
											€{product.revenue?.toFixed(2)}
										</Text>
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
			{
				key: "margin",
				label: "Marge Brute",
				icon: "trending-up-outline",
				color: "#22C55E",
				value: data.marginPercent,
				format: (v) => `${(v || 0).toFixed(1)}%`,
			},
		];

		const activeMetric = METRICS.find((m) => m.key === selectedMetric);

		// ── Préparer données graphique ──
		const MOIS = [
			"Jan",
			"Fév",
			"Mar",
			"Avr",
			"Mai",
			"Jun",
			"Jul",
			"Aoû",
			"Sep",
			"Oct",
			"Nov",
			"Déc",
		];
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
				case "margin":
					return chartPoints.map(
						(p) => (p.revenue || 0) * ((data.marginPercent || 70) / 100),
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
					{data.revenueHT > 0 && (
						<View style={styles.chartContainer}>
							<Text
								style={{
									fontSize: 14,
									fontWeight: "700",
									color: THEME.colors.text.primary,
									marginBottom: 4,
								}}
							>
								💰 Répartition CA HT
							</Text>
							<Text
								style={{
									fontSize: 11,
									color: THEME.colors.text.secondary,
									marginBottom: 16,
								}}
							>
								Marge brute estimée vs coûts opérationnels
							</Text>
							<View style={{ flexDirection: "row", alignItems: "center" }}>
								<SvgDonut
									segments={[
										{
											value: Math.max(data.grossMargin, 0.01),
											color: "#22C55E",
											label: "Marge",
										},
										{
											value: Math.max(data.costs, 0.01),
											color: "#EF4444",
											label: "Coûts",
										},
									]}
									size={160}
									thickness={30}
									centerLabel="CA HT"
									centerValue={`€${(data.revenueHT || 0).toFixed(0)}`}
								/>
								<View style={{ flex: 1, marginLeft: 16 }}>
									{[
										{
											color: "#22C55E",
											label: "Marge brute",
											value: Math.max(data.grossMargin, 0),
											pct: data.marginPercent?.toFixed(0) ?? "70",
										},
										{
											color: "#EF4444",
											label: "Coûts estimés",
											value: Math.max(data.costs, 0),
											pct: (100 - (data.marginPercent ?? 70)).toFixed(0),
										},
									].map((item, i) => (
										<View key={i} style={{ marginBottom: i === 0 ? 20 : 0 }}>
											<View
												style={{
													flexDirection: "row",
													alignItems: "center",
													marginBottom: 4,
												}}
											>
												<View
													style={{
														width: 10,
														height: 10,
														borderRadius: 5,
														backgroundColor: item.color,
														marginRight: 8,
													}}
												/>
												<Text
													style={{
														fontSize: 12,
														color: THEME.colors.text.secondary,
													}}
												>
													{item.label}
												</Text>
											</View>
											<Text
												style={{
													fontSize: 24,
													fontWeight: "700",
													color: item.color,
													marginLeft: 18,
												}}
											>
												{item.pct}%
											</Text>
											<Text
												style={{
													fontSize: 12,
													color: THEME.colors.text.secondary,
													marginLeft: 18,
												}}
											>
												€{item.value.toFixed(2)}
											</Text>
										</View>
									))}
								</View>
							</View>
						</View>
					)}

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
								const BAR_COLORS = [
									"#F59E0B",
									"#3B82F6",
									"#A855F7",
									"#22C55E",
									"#EF4444",
								];
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
				</View>
			</ScrollView>
		);
	};

	const renderDetailsTab = () => (
		<ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
			<View style={styles.scrollContent}>
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>📋 Détails de la Période</Text>

					<View style={styles.metricCard}>
						<Text style={styles.metricLabel}>Période sélectionnée</Text>
						<Text style={styles.metricValue}>
							{PERIODS.find((p) => p.key === selectedPeriod)?.label}
						</Text>
						<Text style={styles.metricLabel}>
							Du {data.startDate} au {data.endDate}
						</Text>
					</View>

					<View style={styles.metricsGrid}>
						<View style={styles.metricCard}>
							<Text style={styles.metricValue}>
								€{data.revenueTTC?.toFixed(2) || "0.00"}
							</Text>
							<Text style={styles.metricLabel}>CA Toutes Taxes</Text>
						</View>

						<View style={styles.metricCard}>
							<Text style={styles.metricValue}>
								€{data.previousPeriodRevenue?.toFixed(2) || "0.00"}
							</Text>
							<Text style={styles.metricLabel}>Période Précédente</Text>
						</View>
					</View>

					<TouchableOpacity
						style={{
							backgroundColor: THEME.colors.primary.amber,
							borderRadius: THEME.radius.lg,
							padding: THEME.spacing.md,
							alignItems: "center",
							marginTop: THEME.spacing.lg,
						}}
						onPress={loadData}
					>
						<Text
							style={{
								color: "#fff",
								fontWeight: "600",
								fontSize: 16,
							}}
						>
							🔄 Actualiser les données
						</Text>
					</TouchableOpacity>
				</View>
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
								setDataLoaded(false); // Forcer le rechargement
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

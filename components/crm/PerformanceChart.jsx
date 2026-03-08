/**
 * 📊 PerformanceChart — Line Charts 6 pattern
 * 4 metric selector cards + SVG gradient line chart
 */

import React, { useMemo, useState } from "react";
import {
	View,
	Text,
	TouchableOpacity,
	Dimensions,
	StyleSheet,
} from "react-native";
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
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
	useSharedValue,
	useAnimatedStyle,
	withSpring,
	withTiming,
} from "react-native-reanimated";

const { width: screenWidth } = Dimensions.get("window");

// ─────────────── Metric definitions ───────────────
const METRICS = [
	{
		key: "revenue",
		label: "CA",
		icon: "cash-outline",
		color: "#F59E0B",
		gradientId: "mRevenue",
		gradientColors: ["#F59E0B", "#FBBF24"],
		unit: "€",
		kpiField: "totalRevenue",
		trendField: "revenueGrowth",
		timelineField: "value",
	},
	{
		key: "commandes",
		label: "Commandes",
		icon: "receipt-outline",
		color: "#3B82F6",
		gradientId: "mCommandes",
		gradientColors: ["#3B82F6", "#60A5FA"],
		unit: "",
		kpiField: "totalOrders",
		trendField: "ordersGrowth",
		timelineField: "orders",
	},
	{
		key: "temps",
		label: "Tps moyen",
		icon: "time-outline",
		color: "#8B5CF6",
		gradientId: "mTemps",
		gradientColors: ["#8B5CF6", "#A78BFA"],
		unit: "min",
		kpiField: "averageServiceTime",
		trendField: "serviceTimeGrowth",
		timelineField: null,
	},
	{
		key: "serveurs",
		label: "Serveurs",
		icon: "people-outline",
		color: "#10B981",
		gradientId: "mServeurs",
		gradientColors: ["#10B981", "#34D399"],
		unit: "",
		kpiField: "activeServers",
		trendField: null,
		timelineField: null,
	},
];

// ─────────────── SVG Line Chart ───────────────
const SvgLineChart = ({ chartData, color, gradientId, height = 140 }) => {
	const PADDING_LEFT = 42;
	const PADDING_RIGHT = 12;
	const PADDING_TOP = 12;
	const PADDING_BOTTOM = 28;
	const chartW = screenWidth - 64 - PADDING_LEFT - PADDING_RIGHT;
	const chartH = height - PADDING_TOP - PADDING_BOTTOM;

	const values = chartData.map((d) => d.value);
	const minV = Math.min(...values);
	const maxV = Math.max(...values);
	const range = maxV - minV || 1;

	const toX = (i) => (i / Math.max(chartData.length - 1, 1)) * chartW;
	const toY = (v) => chartH - ((v - minV) / range) * chartH;

	const points = chartData.map((d, i) => ({ x: toX(i), y: toY(d.value) }));
	const linePath = points
		.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`)
		.join(" ");
	const areaPath = `${linePath} L${points[points.length - 1].x},${chartH} L0,${chartH} Z`;

	const yTicks = 4;
	const formatY = (v) => {
		if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
		return `${Math.round(v)}`;
	};

	const xStep = Math.max(1, Math.floor(chartData.length / 6));
	const xLabels = chartData
		.map((d, i) => ({ label: d.label, x: toX(i), i }))
		.filter((d) => d.i % xStep === 0);

	return (
		<Svg width={chartW + PADDING_LEFT + PADDING_RIGHT} height={height}>
			<Defs>
				<SvgLinearGradient id={`area_${gradientId}`} x1="0" y1="0" x2="0" y2="1">
					<Stop offset="0" stopColor={color} stopOpacity="0.25" />
					<Stop offset="1" stopColor={color} stopOpacity="0.02" />
				</SvgLinearGradient>
			</Defs>
			<G translateX={PADDING_LEFT} translateY={PADDING_TOP}>
				{Array.from({ length: yTicks + 1 }, (_, i) => {
					const y = (chartH / yTicks) * i;
					const val = maxV - (range / yTicks) * i;
					return (
						<G key={`grid_${i}`}>
							<SvgLine x1={0} y1={y} x2={chartW} y2={y} stroke="rgba(0,0,0,0.06)" strokeWidth={1} />
							<SvgText x={-6} y={y + 4} fontSize={10} fill="#9CA3AF" textAnchor="end">
								{formatY(val)}
							</SvgText>
						</G>
					);
				})}
				<Path d={areaPath} fill={`url(#area_${gradientId})`} />
				<Path d={linePath} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
				{points.map((p, i) => (
					<G key={`dot_${i}`}>
						<Circle cx={p.x} cy={p.y} r={5} fill="white" />
						<Circle cx={p.x} cy={p.y} r={3} fill={color} />
					</G>
				))}
				{xLabels.map((d) => (
					<SvgText key={`xl_${d.i}`} x={d.x} y={chartH + 18} fontSize={10} fill="#9CA3AF" textAnchor="middle">
						{d.label}
					</SvgText>
				))}
			</G>
		</Svg>
	);
};

// ─────────────── Main component ───────────────
const PerformanceChart = ({
	data = [],
	dashboard = null,
	title = "Performance Globale",
	subtitle = "",
	height = 280,
	loading = false,
	animationDelay = 0,
}) => {
	const [activeMetric, setActiveMetric] = useState("revenue");

	// ─────────────── Animations ───────────────
	const opacity = useSharedValue(0);
	const translateY = useSharedValue(20);
	const animatedStyle = useAnimatedStyle(() => ({
		opacity: opacity.value,
		transform: [{ translateY: translateY.value }],
	}));

	React.useEffect(() => {
		opacity.value = withTiming(1, { duration: 600, delay: animationDelay });
		translateY.value = withSpring(0, { damping: 18, stiffness: 100, delay: animationDelay });
	}, [animationDelay, opacity, translateY]);

	// ─────────────── Metric values ───────────────
	const kpi = dashboard?.kpi || {};
	const trends = dashboard?.trends || {};

	const formatValue = (metric, value) => {
		if (value === undefined || value === null) return "—";
		if (metric.key === "revenue") {
			if (value >= 1000) return `${(value / 1000).toFixed(1)}k€`;
			return `${Math.round(value)}€`;
		}
		if (metric.key === "temps") return `${Math.round(value)}min`;
		return `${Math.round(value)}`;
	};

	// ─────────────── Timeline data ───────────────
	const metricDef = METRICS.find((m) => m.key === activeMetric) || METRICS[0];
	const chartData = useMemo(() => {
		if (!data || data.length === 0 || !metricDef.timelineField) return [];
		return data.map((d) => ({
			label: d.label,
			value: d[metricDef.timelineField] || 0,
		}));
	}, [data, activeMetric, metricDef]);

	// ─────────────── Loading ───────────────
	if (loading) {
		return (
			<Animated.View style={[styles.card, animatedStyle]}>
				<LinearGradient colors={["#FFFFFF", "#F8FAFC"]} style={styles.inner}>
					<View style={styles.loadingHeader}>
						<View style={styles.loadingTitle} />
						<View style={styles.loadingSubtitle} />
					</View>
					<View style={styles.loadingMetrics}>
						{[0, 1, 2, 3].map((i) => <View key={i} style={styles.loadingMetricCard} />)}
					</View>
					<View style={styles.loadingChart} />
				</LinearGradient>
			</Animated.View>
		);
	}

	// ─────────────── Rendu ───────────────
	return (
		<Animated.View style={[styles.card, animatedStyle]}>
			<LinearGradient colors={["#FFFFFF", "#F8FAFC"]} style={styles.inner}>
				{/* Header */}
				<View style={styles.header}>
					<View>
						<Text style={styles.title}>{title}</Text>
						{subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
					</View>
					<Ionicons name="trending-up" size={20} color="#9CA3AF" />
				</View>

				{/* Metric selector cards */}
				<View style={styles.metricsRow}>
					{METRICS.map((metric) => {
						const isActive = activeMetric === metric.key;
						const rawValue = kpi[metric.kpiField];
						const trendVal = metric.trendField ? trends[metric.trendField] : null;
						const trendUp = trendVal > 0;
						return (
							<TouchableOpacity
								key={metric.key}
								onPress={() => setActiveMetric(metric.key)}
								activeOpacity={0.8}
								style={[styles.metricCard, isActive && { borderColor: metric.color, borderWidth: 2 }]}
							>
								{isActive ? (
									<LinearGradient
										colors={metric.gradientColors}
										style={styles.metricCardInner}
										start={{ x: 0, y: 0 }}
										end={{ x: 1, y: 1 }}
									>
										<Ionicons name={metric.icon} size={14} color="white" />
										<Text style={[styles.metricValue, { color: "white" }]}>
											{formatValue(metric, rawValue)}
										</Text>
										<Text style={[styles.metricLabel, { color: "rgba(255,255,255,0.85)" }]}>
											{metric.label}
										</Text>
										{trendVal !== null && trendVal !== undefined && (
											<View style={styles.trendBadge}>
												<Ionicons name={trendUp ? "arrow-up" : "arrow-down"} size={9} color={trendUp ? "#D1FAE5" : "#FEE2E2"} />
												<Text style={[styles.trendText, { color: trendUp ? "#D1FAE5" : "#FEE2E2" }]}>
													{Math.abs(Math.round(trendVal))}%
												</Text>
											</View>
										)}
									</LinearGradient>
								) : (
									<View style={styles.metricCardInner}>
										<Ionicons name={metric.icon} size={14} color={metric.color} />
										<Text style={[styles.metricValue, { color: "#1F2937" }]}>
											{formatValue(metric, rawValue)}
										</Text>
										<Text style={[styles.metricLabel, { color: "#6B7280" }]}>
											{metric.label}
										</Text>
										{trendVal !== null && trendVal !== undefined && (
											<View style={[styles.trendBadge, { backgroundColor: trendUp ? "#D1FAE533" : "#FEE2E233" }]}>
												<Ionicons name={trendUp ? "arrow-up" : "arrow-down"} size={9} color={trendUp ? "#10B981" : "#EF4444"} />
												<Text style={[styles.trendText, { color: trendUp ? "#10B981" : "#EF4444" }]}>
													{Math.abs(Math.round(trendVal))}%
												</Text>
											</View>
										)}
									</View>
								)}
							</TouchableOpacity>
						);
					})}
				</View>

				{/* SVG line chart or empty state */}
				{chartData.length >= 2 ? (
					<View style={styles.chartContainer}>
						<SvgLineChart
							chartData={chartData}
							color={metricDef.color}
							gradientId={metricDef.gradientId}
							height={height - 130}
						/>
					</View>
				) : (
					<View style={[styles.emptyChart, { height: height - 130 }]}>
						<Ionicons name="analytics-outline" size={30} color="#D1D5DB" />
						<Text style={styles.emptyText}>
							{metricDef.timelineField
								? "Données insuffisantes pour la période"
								: "Graphique non disponible pour cette métrique"}
						</Text>
					</View>
				)}
			</LinearGradient>
		</Animated.View>
	);
};


// ─────────────── Styles ───────────────
const styles = StyleSheet.create({
	card: {
		borderRadius: 16,
		marginBottom: 16,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.08,
		shadowRadius: 8,
		elevation: 4,
	},
	inner: {
		borderRadius: 16,
		padding: 16,
		borderWidth: 1,
		borderColor: "rgba(0,0,0,0.05)",
	},
	header: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "flex-start",
		marginBottom: 14,
	},
	title: {
		fontSize: 16,
		fontWeight: "700",
		color: "#111827",
	},
	subtitle: {
		fontSize: 12,
		color: "#6B7280",
		marginTop: 2,
	},
	metricsRow: {
		flexDirection: "row",
		gap: 8,
		marginBottom: 16,
	},
	metricCard: {
		flex: 1,
		borderRadius: 12,
		borderWidth: 1.5,
		borderColor: "rgba(0,0,0,0.06)",
		overflow: "hidden",
		backgroundColor: "#F9FAFB",
	},
	metricCardInner: {
		padding: 10,
		alignItems: "center",
		gap: 3,
		minHeight: 72,
		justifyContent: "center",
		borderRadius: 10,
	},
	metricValue: {
		fontSize: 12,
		fontWeight: "700",
		textAlign: "center",
	},
	metricLabel: {
		fontSize: 9,
		fontWeight: "500",
		textAlign: "center",
	},
	trendBadge: {
		flexDirection: "row",
		alignItems: "center",
		gap: 2,
		backgroundColor: "rgba(255,255,255,0.2)",
		borderRadius: 8,
		paddingHorizontal: 4,
		paddingVertical: 2,
	},
	trendText: {
		fontSize: 9,
		fontWeight: "600",
	},
	chartContainer: {
		alignItems: "center",
		marginTop: 4,
	},
	emptyChart: {
		justifyContent: "center",
		alignItems: "center",
		gap: 8,
	},
	emptyText: {
		fontSize: 13,
		color: "#9CA3AF",
		textAlign: "center",
		maxWidth: 220,
	},
	loadingHeader: {
		marginBottom: 16,
		gap: 6,
	},
	loadingTitle: {
		width: "55%",
		height: 16,
		backgroundColor: "#E5E7EB",
		borderRadius: 8,
	},
	loadingSubtitle: {
		width: "35%",
		height: 11,
		backgroundColor: "#F3F4F6",
		borderRadius: 6,
	},
	loadingMetrics: {
		flexDirection: "row",
		gap: 8,
		marginBottom: 16,
	},
	loadingMetricCard: {
		flex: 1,
		height: 72,
		backgroundColor: "#F3F4F6",
		borderRadius: 12,
	},
	loadingChart: {
		height: 100,
		backgroundColor: "#F3F4F6",
		borderRadius: 12,
	},
});

export default React.memo(PerformanceChart);

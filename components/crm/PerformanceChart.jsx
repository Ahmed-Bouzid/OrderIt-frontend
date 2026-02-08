/**
 * 📊 PerformanceChart - Composant graphique pour les performances CRM
 * Supporte plusieurs types de charts : line, bar, pie, area
 */

import React, { useMemo } from "react";
import { View, Text, Dimensions, StyleSheet } from "react-native";
import { LineChart, BarChart, PieChart } from "react-native-chart-kit";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
	useSharedValue,
	useAnimatedStyle,
	withSpring,
	withTiming,
} from "react-native-reanimated";

const { width: screenWidth } = Dimensions.get("window");

const PerformanceChart = ({
	data = [],
	type = "line",
	title = "",
	subtitle = "",
	color = "#F59E0B",
	height = 220,
	showLegend = true,
	loading = false,
	animationDelay = 0,
	onPress = null,
}) => {
	// ─────────────── Animations ───────────────
	const opacity = useSharedValue(0);
	const scale = useSharedValue(0.9);

	const animatedStyle = useAnimatedStyle(() => {
		return {
			opacity: opacity.value,
			transform: [{ scale: scale.value }],
		};
	});

	React.useEffect(() => {
		opacity.value = withTiming(1, {
			duration: 600,
			delay: animationDelay,
		});
		scale.value = withSpring(1, {
			damping: 15,
			stiffness: 100,
			delay: animationDelay,
		});
	}, [animationDelay, opacity, scale]);

	// ─────────────── Chart Config ───────────────
	const chartConfig = {
		backgroundColor: "transparent",
		backgroundGradientFrom: "#FFFFFF",
		backgroundGradientTo: "#F8FAFC",
		decimalPlaces: 0,
		color: (opacity = 1) => `rgba(245, 158, 11, ${opacity})`,
		labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
		style: {
			borderRadius: 16,
		},
		propsForDots: {
			r: "4",
			strokeWidth: "2",
			stroke: color,
			fill: color,
		},
		propsForBackgroundLines: {
			stroke: "rgba(0,0,0,0.05)",
			strokeWidth: 1,
		},
		propsForLabels: {
			fontSize: 12,
		},
		fillShadowGradient: color,
		fillShadowGradientOpacity: 0.3,
	};

	// ─────────────── Data Processing ───────────────
	const processedData = useMemo(() => {
		if (!data || data.length === 0) {
			return {
				labels: ["Pas de données"],
				datasets: [{ data: [0] }],
			};
		}

		switch (type) {
			case "line":
			case "bar":
				return {
					labels: data.map((item) => item.label || item.name || ""),
					datasets: [
						{
							data: data.map((item) => item.value || item.y || 0),
						},
					],
				};

			case "pie":
				return data.map((item, index) => ({
					name: item.label || item.name || `Item ${index + 1}`,
					population: item.value || item.y || 0,
					color: item.color || generateColor(index),
					legendFontColor: "#6B7280",
					legendFontSize: 12,
				}));

			default:
				return { labels: [], datasets: [{ data: [] }] };
		}
	}, [data, type]);

	// ─────────────── Color Generator ───────────────
	const generateColor = (index) => {
		const colors = [
			"#F59E0B",
			"#3B82F6",
			"#10B981",
			"#EF4444",
			"#8B5CF6",
			"#F97316",
			"#06B6D4",
			"#84CC16",
		];
		return colors[index % colors.length];
	};

	// ─────────────── Loading State ───────────────
	if (loading) {
		return (
			<Animated.View style={[styles.container, animatedStyle, { height }]}>
				<LinearGradient
					colors={["#F3F4F6", "#E5E7EB"]}
					style={styles.loadingContainer}
				>
					<View style={styles.loadingHeader}>
						<View style={styles.loadingTitle} />
						<View style={styles.loadingSubtitle} />
					</View>
					<View style={styles.loadingChart}>
						{Array.from({ length: 5 }).map((_, index) => (
							<View
								key={index}
								style={[styles.loadingBar, { height: Math.random() * 60 + 20 }]}
							/>
						))}
					</View>
				</LinearGradient>
			</Animated.View>
		);
	}

	// ─────────────── Chart Renderers ───────────────
	const renderLineChart = () => (
		<LineChart
			data={processedData}
			width={screenWidth - 60}
			height={height - 60}
			chartConfig={chartConfig}
			bezier
			style={styles.chart}
			withHorizontalLabels={true}
			withVerticalLabels={true}
			withInnerLines={false}
			withOuterLines={false}
			withHorizontalLines={true}
			withVerticalLines={false}
		/>
	);

	const renderBarChart = () => (
		<BarChart
			data={processedData}
			width={screenWidth - 60}
			height={height - 60}
			chartConfig={chartConfig}
			style={styles.chart}
			withHorizontalLabels={true}
			withVerticalLabels={true}
			withInnerLines={false}
			showValuesOnTopOfBars={true}
		/>
	);

	const renderPieChart = () => (
		<PieChart
			data={processedData}
			width={screenWidth - 60}
			height={height - 60}
			chartConfig={chartConfig}
			accessor="population"
			backgroundColor="transparent"
			paddingLeft="15"
			center={[0, 0]}
			style={styles.chart}
			hasLegend={showLegend}
		/>
	);

	const renderChart = () => {
		switch (type) {
			case "bar":
				return renderBarChart();
			case "pie":
				return renderPieChart();
			case "line":
			default:
				return renderLineChart();
		}
	};

	// ─────────────── Header ───────────────
	const renderHeader = () => {
		if (!title && !subtitle) return null;

		return (
			<View style={styles.header}>
				<View style={styles.headerInfo}>
					{title && <Text style={styles.title}>{title}</Text>}
					{subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
				</View>
				<Ionicons name={getChartIcon(type)} size={20} color="#6B7280" />
			</View>
		);
	};

	const getChartIcon = (chartType) => {
		const icons = {
			line: "trending-up",
			bar: "bar-chart",
			pie: "pie-chart",
			area: "analytics",
		};
		return icons[chartType] || "analytics";
	};

	// ─────────────── Empty State ───────────────
	if (!data || data.length === 0) {
		return (
			<Animated.View style={[styles.container, animatedStyle, { height }]}>
				<LinearGradient
					colors={["#FFFFFF", "#F8FAFC"]}
					style={styles.emptyContainer}
				>
					{renderHeader()}
					<View style={styles.emptyContent}>
						<Ionicons name="analytics-outline" size={40} color="#D1D5DB" />
						<Text style={styles.emptyText}>Aucune donnée disponible</Text>
						<Text style={styles.emptySubtext}>
							Les données apparaîtront ici
						</Text>
					</View>
				</LinearGradient>
			</Animated.View>
		);
	}

	// ─────────────── Rendu Principal ───────────────
	return (
		<Animated.View style={[styles.container, animatedStyle, { height }]}>
			<LinearGradient colors={["#FFFFFF", "#F8FAFC"]} style={styles.gradient}>
				{renderHeader()}
				<View style={styles.chartContainer}>{renderChart()}</View>
			</LinearGradient>
		</Animated.View>
	);
};

// ─────────────── Styles ───────────────
const styles = StyleSheet.create({
	container: {
		marginBottom: 16,
	},
	gradient: {
		flex: 1,
		borderRadius: 16,
		padding: 16,
		// Shadow iOS
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 6,
		// Shadow Android
		elevation: 4,
		borderWidth: 1,
		borderColor: "rgba(0,0,0,0.05)",
	},

	// Header
	header: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "flex-start",
		marginBottom: 16,
	},
	headerInfo: {
		flex: 1,
	},
	title: {
		fontSize: 16,
		fontWeight: "600",
		color: "#1F2937",
		marginBottom: 4,
	},
	subtitle: {
		fontSize: 12,
		color: "#6B7280",
	},

	// Chart
	chartContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
	},
	chart: {
		marginVertical: 8,
		borderRadius: 16,
	},

	// Loading states
	loadingContainer: {
		flex: 1,
		borderRadius: 16,
		padding: 16,
		opacity: 0.6,
	},
	loadingHeader: {
		marginBottom: 20,
	},
	loadingTitle: {
		width: "60%",
		height: 16,
		backgroundColor: "rgba(255, 255, 255, 0.7)",
		borderRadius: 8,
		marginBottom: 8,
	},
	loadingSubtitle: {
		width: "40%",
		height: 12,
		backgroundColor: "rgba(255, 255, 255, 0.5)",
		borderRadius: 6,
	},
	loadingChart: {
		flexDirection: "row",
		alignItems: "end",
		justifyContent: "space-around",
		flex: 1,
		paddingVertical: 20,
	},
	loadingBar: {
		width: 20,
		backgroundColor: "rgba(255, 255, 255, 0.7)",
		borderRadius: 4,
	},

	// Empty state
	emptyContainer: {
		flex: 1,
		borderRadius: 16,
		padding: 16,
	},
	emptyContent: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
	},
	emptyText: {
		fontSize: 14,
		fontWeight: "500",
		color: "#6B7280",
		marginTop: 8,
	},
	emptySubtext: {
		fontSize: 12,
		color: "#9CA3AF",
		marginTop: 4,
	},
});

export default React.memo(PerformanceChart);

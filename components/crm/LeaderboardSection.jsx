/**
 * 🏆 LeaderboardSection - Composant classement des serveurs
 * Podium, rankings et animations de victoire
 */

import React, { useMemo, useState } from "react";
import {
	View,
	Text,
	ScrollView,
	TouchableOpacity,
	FlatList,
	StyleSheet,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
	useSharedValue,
	useAnimatedStyle,
	withSpring,
	withTiming,
	withDelay,
} from "react-native-reanimated";

const LeaderboardSection = ({
	servers = [],
	period = "month",
	metric = "totalRevenue",
	onServerPress = null,
	loading = false,
	animationDelay = 0,
}) => {
	const [selectedMetric, setSelectedMetric] = useState(metric);

	// ─────────────── Animations ───────────────
	const opacity = useSharedValue(0);
	const slideY = useSharedValue(30);

	const animatedStyle = useAnimatedStyle(() => {
		return {
			opacity: opacity.value,
			transform: [{ translateY: slideY.value }],
		};
	});

	React.useEffect(() => {
		opacity.value = withTiming(1, {
			duration: 600,
			delay: animationDelay,
		});
		slideY.value = withTiming(0, {
			duration: 500,
			delay: animationDelay + 100,
		});
	}, [animationDelay, opacity, slideY]);

	// ─────────────── Metrics Options ───────────────
	const metrics = useMemo(
		() => [
			{
				key: "totalRevenue",
				label: "Chiffre d'Affaires",
				icon: "cash",
				unit: "€",
			},
			{ key: "totalOrders", label: "Commandes", icon: "restaurant", unit: "" },
			{
				key: "performanceScore",
				label: "Score Global",
				icon: "trophy",
				unit: "%",
			},
			{
				key: "customerRating",
				label: "Satisfaction",
				icon: "star",
				unit: "/5",
			},
			{
				key: "upsellRate",
				label: "Vente Additionnelle",
				icon: "trending-up",
				unit: "%",
			},
			{
				key: "averageServiceTime",
				label: "Rapidité",
				icon: "time",
				unit: "min",
				reverse: true,
			},
		],
		[],
	);

	// ─────────────── Data Processing ───────────────
	const rankedServers = useMemo(() => {
		if (!servers || servers.length === 0) return [];

		const currentMetric = metrics.find((m) => m.key === selectedMetric);
		const isReverse = currentMetric?.reverse || false;

		return [...servers]
			.filter((server) => server && typeof server[selectedMetric] === "number")
			.sort((a, b) => {
				const valueA = a[selectedMetric] || 0;
				const valueB = b[selectedMetric] || 0;
				return isReverse ? valueA - valueB : valueB - valueA;
			})
			.map((server, index) => ({
				...server,
				rank: index + 1,
				isTop3: index < 3,
			}));
	}, [servers, selectedMetric, metrics]);

	// ─────────────── Value Formatter ───────────────
	const formatValue = (value, metricKey) => {
		const currentMetric = metrics.find((m) => m.key === metricKey);
		if (!currentMetric) return value?.toString() || "0";

		const { unit } = currentMetric;

		switch (metricKey) {
			case "totalRevenue":
				if (value >= 1000) return `${(value / 1000).toFixed(1)}k${unit}`;
				return `${Math.round(value)}${unit}`;

			case "avgServiceTime":
				return `${Math.round(value)}${unit}`;

			case "customerRating":
				return `${(value || 0).toFixed(1)}${unit}`;

			case "upsellRate":
			case "performanceScore":
				return `${Math.round(value || 0)}${unit}`;

			default:
				return `${value || 0}${unit}`;
		}
	};

	// ─────────────── Podium Component ───────────────
	const PodiumItem = ({
		server,
		position,
		animationDelay: podiumDelay = 0,
	}) => {
		const podiumScale = useSharedValue(0);
		const podiumOpacity = useSharedValue(0);

		const podiumAnimatedStyle = useAnimatedStyle(() => {
			return {
				transform: [{ scale: podiumScale.value }],
				opacity: podiumOpacity.value,
			};
		});

		React.useEffect(() => {
			podiumScale.value = withDelay(
				podiumDelay,
				withSpring(1, { damping: 20, stiffness: 90 }),
			);
			podiumOpacity.value = withDelay(
				podiumDelay,
				withTiming(1, { duration: 500 }),
			);
		}, [podiumDelay, podiumScale, podiumOpacity]);

		const heights = { 1: 80, 2: 60, 3: 40 };
		const colors = {
			1: ["#FFD700", "#FFA500"], // Or
			2: ["#C0C0C0", "#A0A0A0"], // Argent
			3: ["#CD7F32", "#B8860B"], // Bronze
		};

		const icons = { 1: "trophy", 2: "medal", 3: "ribbon" };

		if (!server) {
			return (
				<Animated.View style={[styles.podiumEmpty, podiumAnimatedStyle]}>
					<View style={[styles.podiumColumn, { height: heights[position] }]} />
				</Animated.View>
			);
		}

		return (
			<Animated.View style={[styles.podiumItem, podiumAnimatedStyle]}>
				<TouchableOpacity
					onPress={() => onServerPress?.(server)}
					style={styles.podiumTouchable}
				>
					<View style={styles.podiumServer}>
						<Ionicons
							name={icons[position]}
							size={24}
							color={colors[position][0]}
						/>
						<Text style={styles.podiumName} numberOfLines={1}>
							{server.name}
						</Text>
						<Text style={styles.podiumValue}>
							{formatValue(server[selectedMetric], selectedMetric)}
						</Text>
					</View>

					<LinearGradient
						colors={colors[position]}
						style={[styles.podiumColumn, { height: heights[position] }]}
					>
						<Text style={styles.podiumRank}>{position}</Text>
					</LinearGradient>
				</TouchableOpacity>
			</Animated.View>
		);
	};

	// ─────────────── Metric Selector ───────────────
	const renderMetricSelector = () => (
		<ScrollView
			horizontal
			showsHorizontalScrollIndicator={false}
			style={styles.metricSelector}
			contentContainerStyle={styles.metricSelectorContent}
		>
			{metrics.map((metric) => (
				<TouchableOpacity
					key={metric.key}
					onPress={() => setSelectedMetric(metric.key)}
					style={[
						styles.metricButton,
						selectedMetric === metric.key && styles.metricButtonActive,
					]}
				>
					<Ionicons
						name={metric.icon}
						size={16}
						color={selectedMetric === metric.key ? "#FFFFFF" : "#6B7280"}
					/>
					<Text
						style={[
							styles.metricButtonText,
							selectedMetric === metric.key && styles.metricButtonTextActive,
						]}
					>
						{metric.label}
					</Text>
				</TouchableOpacity>
			))}
		</ScrollView>
	);

	// ─────────────── Podium ───────────────
	const renderPodium = () => {
		const topThree = rankedServers.slice(0, 3);
		const [first, second, third] = topThree;

		return (
			<View style={styles.podiumContainer}>
				<View style={styles.podiumRow}>
					{/* 2ème place */}
					<PodiumItem
						server={second}
						position={2}
						animationDelay={animationDelay + 200}
					/>

					{/* 1ère place */}
					<PodiumItem
						server={first}
						position={1}
						animationDelay={animationDelay + 100}
					/>

					{/* 3ème place */}
					<PodiumItem
						server={third}
						position={3}
						animationDelay={animationDelay + 300}
					/>
				</View>
			</View>
		);
	};

	// ─────────────── Rankings List ───────────────
	const renderRankingItem = ({ item: server, index }) => {
		if (index < 3) return null; // Skip top 3 (shown in podium)

		return (
			<View style={styles.rankingItem}>
				<View style={styles.rankingLeft}>
					<Text style={styles.rankingPosition}>{server.rank}</Text>
					<Text style={styles.rankingName}>{server.name}</Text>
				</View>
				<Text style={styles.rankingValue}>
					{formatValue(server[selectedMetric], selectedMetric)}
				</Text>
			</View>
		);
	};

	// ─────────────── Loading State ───────────────
	if (loading) {
		return (
			<Animated.View style={[styles.container, animatedStyle]}>
				<LinearGradient
					colors={["#F3F4F6", "#E5E7EB"]}
					style={styles.loadingContainer}
				>
					<View style={styles.loadingHeader}>
						<View style={styles.loadingTitle} />
						<View style={styles.loadingSelector} />
					</View>
					<View style={styles.loadingPodium}>
						{Array.from({ length: 3 }).map((_, index) => (
							<View key={index} style={styles.loadingPodiumItem} />
						))}
					</View>
				</LinearGradient>
			</Animated.View>
		);
	}

	// ─────────────── Empty State ───────────────
	if (!servers || servers.length === 0) {
		return (
			<Animated.View style={[styles.container, animatedStyle]}>
				<LinearGradient
					colors={["#FFFFFF", "#F8FAFC"]}
					style={styles.emptyContainer}
				>
					<Ionicons name="trophy-outline" size={40} color="#D1D5DB" />
					<Text style={styles.emptyText}>Aucun classement disponible</Text>
					<Text style={styles.emptySubtext}>Les données apparaîtront ici</Text>
				</LinearGradient>
			</Animated.View>
		);
	}

	// ─────────────── Rendu Principal ───────────────
	return (
		<Animated.View style={[styles.container, animatedStyle]}>
			<LinearGradient colors={["#FFFFFF", "#F8FAFC"]} style={styles.gradient}>
				{/* Header */}
				<View style={styles.header}>
					<View>
						<Text style={styles.title}>🏆 Classement</Text>
						<Text style={styles.subtitle}>Performances - {period}</Text>
					</View>
				</View>

				{/* Metric Selector */}
				{renderMetricSelector()}

				{/* Podium */}
				{renderPodium()}

				{/* Rankings List */}
				{rankedServers.length > 3 && (
					<View style={styles.rankingsContainer}>
						<Text style={styles.rankingsTitle}>Autres positions</Text>
						<FlatList
							data={rankedServers}
							renderItem={renderRankingItem}
							keyExtractor={(item) =>
								item.id?.toString() || Math.random().toString()
							}
							scrollEnabled={false}
							showsVerticalScrollIndicator={false}
						/>
					</View>
				)}
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
		borderRadius: 16,
		padding: 16,
		// Shadow
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 6,
		elevation: 4,
		borderWidth: 1,
		borderColor: "rgba(0,0,0,0.05)",
	},

	// Header
	header: {
		marginBottom: 16,
	},
	title: {
		fontSize: 18,
		fontWeight: "600",
		color: "#1F2937",
		marginBottom: 4,
	},
	subtitle: {
		fontSize: 12,
		color: "#6B7280",
	},

	// Metric Selector
	metricSelector: {
		marginBottom: 20,
	},
	metricSelectorContent: {
		paddingHorizontal: 4,
	},
	metricButton: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 12,
		paddingVertical: 8,
		marginRight: 8,
		backgroundColor: "#F3F4F6",
		borderRadius: 20,
	},
	metricButtonActive: {
		backgroundColor: "#F59E0B",
	},
	metricButtonText: {
		fontSize: 12,
		fontWeight: "500",
		color: "#6B7280",
		marginLeft: 6,
	},
	metricButtonTextActive: {
		color: "#FFFFFF",
	},

	// Podium
	podiumContainer: {
		marginBottom: 20,
	},
	podiumRow: {
		flexDirection: "row",
		alignItems: "end",
		justifyContent: "center",
		height: 120,
		paddingHorizontal: 20,
	},
	podiumItem: {
		alignItems: "center",
		marginHorizontal: 8,
		flex: 1,
	},
	podiumEmpty: {
		alignItems: "center",
		marginHorizontal: 8,
		flex: 1,
	},
	podiumTouchable: {
		alignItems: "center",
		width: "100%",
	},
	podiumServer: {
		alignItems: "center",
		marginBottom: 8,
	},
	podiumName: {
		fontSize: 12,
		fontWeight: "500",
		color: "#1F2937",
		marginTop: 4,
		textAlign: "center",
	},
	podiumValue: {
		fontSize: 10,
		color: "#6B7280",
		textAlign: "center",
	},
	podiumColumn: {
		width: "100%",
		borderRadius: 8,
		justifyContent: "center",
		alignItems: "center",
		minHeight: 40,
	},
	podiumRank: {
		fontSize: 18,
		fontWeight: "700",
		color: "white",
	},

	// Rankings
	rankingsContainer: {
		marginTop: 8,
	},
	rankingsTitle: {
		fontSize: 14,
		fontWeight: "500",
		color: "#6B7280",
		marginBottom: 8,
	},
	rankingItem: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		paddingVertical: 8,
		paddingHorizontal: 4,
		borderBottomWidth: 1,
		borderBottomColor: "#F3F4F6",
	},
	rankingLeft: {
		flexDirection: "row",
		alignItems: "center",
		flex: 1,
	},
	rankingPosition: {
		fontSize: 14,
		fontWeight: "600",
		color: "#6B7280",
		width: 24,
		textAlign: "center",
	},
	rankingName: {
		fontSize: 14,
		color: "#1F2937",
		marginLeft: 12,
	},
	rankingValue: {
		fontSize: 14,
		fontWeight: "500",
		color: "#F59E0B",
	},

	// Loading
	loadingContainer: {
		borderRadius: 16,
		padding: 16,
		opacity: 0.6,
		minHeight: 200,
	},
	loadingHeader: {
		marginBottom: 20,
	},
	loadingTitle: {
		width: "40%",
		height: 18,
		backgroundColor: "rgba(255, 255, 255, 0.7)",
		borderRadius: 9,
		marginBottom: 8,
	},
	loadingSelector: {
		width: "80%",
		height: 32,
		backgroundColor: "rgba(255, 255, 255, 0.5)",
		borderRadius: 16,
	},
	loadingPodium: {
		flexDirection: "row",
		justifyContent: "center",
		alignItems: "end",
		height: 100,
	},
	loadingPodiumItem: {
		width: 60,
		height: 80,
		backgroundColor: "rgba(255, 255, 255, 0.7)",
		borderRadius: 8,
		marginHorizontal: 8,
	},

	// Empty
	emptyContainer: {
		borderRadius: 16,
		padding: 32,
		alignItems: "center",
		justifyContent: "center",
	},
	emptyText: {
		fontSize: 14,
		fontWeight: "500",
		color: "#6B7280",
		marginTop: 12,
	},
	emptySubtext: {
		fontSize: 12,
		color: "#9CA3AF",
		marginTop: 4,
	},
});

export default React.memo(LeaderboardSection);

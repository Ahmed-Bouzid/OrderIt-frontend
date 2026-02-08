/**
 * 🎯 KPICard - Composant pour afficher les KPIs CRM
 * Carte avec animation, trend et couleurs adaptatives
 */

import React, { useMemo } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
	useSharedValue,
	useAnimatedStyle,
	withSpring,
	withTiming,
	withDelay,
} from "react-native-reanimated";

const KPICard = ({
	title,
	value,
	unit = "",
	icon,
	trend = null,
	color = "primary",
	onPress = null,
	loading = false,
	animationDelay = 0,
}) => {
	// ─────────────── Animations ───────────────
	const scale = useSharedValue(0.8);
	const opacity = useSharedValue(0);

	const animatedStyle = useAnimatedStyle(() => {
		return {
			transform: [{ scale: scale.value }],
			opacity: opacity.value,
		};
	});

	React.useEffect(() => {
		scale.value = withDelay(
			animationDelay,
			withSpring(1, {
				damping: 15,
				stiffness: 120,
			}),
		);
		opacity.value = withDelay(animationDelay, withTiming(1, { duration: 600 }));
	}, [animationDelay, scale, opacity]);

	// ─────────────── Logique Couleurs ───────────────
	const colorScheme = useMemo(() => {
		const schemes = {
			primary: {
				gradient: ["#F59E0B", "#FBBF24"],
				iconColor: "#FFFFFF",
				textColor: "#FFFFFF",
				trendUp: "#10B981",
				trendDown: "#EF4444",
			},
			success: {
				gradient: ["#10B981", "#34D399"],
				iconColor: "#FFFFFF",
				textColor: "#FFFFFF",
				trendUp: "#065F46",
				trendDown: "#DC2626",
			},
			warning: {
				gradient: ["#F59E0B", "#FCD34D"],
				iconColor: "#FFFFFF",
				textColor: "#FFFFFF",
				trendUp: "#10B981",
				trendDown: "#EF4444",
			},
			danger: {
				gradient: ["#EF4444", "#F87171"],
				iconColor: "#FFFFFF",
				textColor: "#FFFFFF",
				trendUp: "#10B981",
				trendDown: "#7F1D1D",
			},
			info: {
				gradient: ["#3B82F6", "#60A5FA"],
				iconColor: "#FFFFFF",
				textColor: "#FFFFFF",
				trendUp: "#10B981",
				trendDown: "#EF4444",
			},
		};

		return schemes[color] || schemes.primary;
	}, [color]);

	// ─────────────── Formatage Valeur ───────────────
	const formattedValue = useMemo(() => {
		if (loading) return "---";
		if (typeof value === "number") {
			if (value >= 1000000) {
				return `${(value / 1000000).toFixed(1)}M`;
			} else if (value >= 1000) {
				return `${(value / 1000).toFixed(1)}K`;
			}
			return value.toLocaleString("fr-FR");
		}
		return value?.toString() || "0";
	}, [value, loading]);

	// ─────────────── Trend Icon ───────────────
	const renderTrendIcon = () => {
		if (!trend || loading) return null;

		const isUp = trend > 0;
		const trendColor = isUp ? colorScheme.trendUp : colorScheme.trendDown;

		return (
			<View style={styles.trendContainer}>
				<Ionicons
					name={isUp ? "trending-up" : "trending-down"}
					size={16}
					color={trendColor}
				/>
				<Text style={[styles.trendText, { color: trendColor }]}>
					{Math.abs(trend).toFixed(1)}%
				</Text>
			</View>
		);
	};

	// ─────────────── Loading State ───────────────
	if (loading) {
		return (
			<Animated.View style={[styles.container, animatedStyle]}>
				<LinearGradient colors={["#E5E7EB", "#F3F4F6"]} style={styles.gradient}>
					<View style={styles.loadingContent}>
						<View style={styles.loadingIcon} />
						<View style={styles.loadingTitle} />
						<View style={styles.loadingValue} />
					</View>
				</LinearGradient>
			</Animated.View>
		);
	}

	// ─────────────── Rendu Principal ───────────────
	const CardContent = () => (
		<LinearGradient
			colors={colorScheme.gradient}
			style={styles.gradient}
			start={{ x: 0, y: 0 }}
			end={{ x: 1, y: 1 }}
		>
			{/* Header */}
			<View style={styles.header}>
				{icon && (
					<Ionicons name={icon} size={24} color={colorScheme.iconColor} />
				)}
				{renderTrendIcon()}
			</View>

			{/* Titre */}
			<Text style={[styles.title, { color: colorScheme.textColor }]}>
				{title}
			</Text>

			{/* Valeur */}
			<View style={styles.valueContainer}>
				<Text style={[styles.value, { color: colorScheme.textColor }]}>
					{formattedValue}
				</Text>
				{unit && (
					<Text style={[styles.unit, { color: colorScheme.textColor }]}>
						{unit}
					</Text>
				)}
			</View>

			{/* Glassmorphism overlay */}
			<View style={styles.glassOverlay} />
		</LinearGradient>
	);

	if (onPress) {
		return (
			<Animated.View style={[styles.container, animatedStyle]}>
				<TouchableOpacity
					activeOpacity={0.8}
					onPress={onPress}
					style={styles.touchable}
				>
					<CardContent />
				</TouchableOpacity>
			</Animated.View>
		);
	}

	return (
		<Animated.View style={[styles.container, animatedStyle]}>
			<CardContent />
		</Animated.View>
	);
};

// ─────────────── Styles ───────────────
const styles = StyleSheet.create({
	container: {
		flex: 1,
		minWidth: 140,
		height: 120,
		marginHorizontal: 5,
	},
	touchable: {
		flex: 1,
	},
	gradient: {
		flex: 1,
		borderRadius: 16,
		padding: 16,
		position: "relative",
		overflow: "hidden",
		// Shadow iOS
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.15,
		shadowRadius: 8,
		// Shadow Android
		elevation: 8,
	},
	glassOverlay: {
		position: "absolute",
		top: 0,
		left: 0,
		right: 0,
		height: "40%",
		backgroundColor: "rgba(255, 255, 255, 0.2)",
		borderTopLeftRadius: 16,
		borderTopRightRadius: 16,
	},
	header: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "flex-start",
		marginBottom: 8,
		zIndex: 1,
	},
	trendContainer: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "rgba(255, 255, 255, 0.15)",
		paddingHorizontal: 6,
		paddingVertical: 2,
		borderRadius: 12,
	},
	trendText: {
		fontSize: 12,
		fontWeight: "600",
		marginLeft: 2,
	},
	title: {
		fontSize: 12,
		fontWeight: "500",
		opacity: 0.9,
		marginBottom: 4,
		zIndex: 1,
	},
	valueContainer: {
		flexDirection: "row",
		alignItems: "baseline",
		flex: 1,
		justifyContent: "flex-start",
		zIndex: 1,
	},
	value: {
		fontSize: 24,
		fontWeight: "700",
		flexShrink: 1,
	},
	unit: {
		fontSize: 14,
		fontWeight: "500",
		marginLeft: 4,
		opacity: 0.8,
	},
	// Loading states
	loadingContent: {
		flex: 1,
		justifyContent: "space-between",
		opacity: 0.6,
	},
	loadingIcon: {
		width: 24,
		height: 24,
		backgroundColor: "rgba(255, 255, 255, 0.3)",
		borderRadius: 12,
		alignSelf: "flex-end",
	},
	loadingTitle: {
		width: "70%",
		height: 12,
		backgroundColor: "rgba(255, 255, 255, 0.3)",
		borderRadius: 6,
	},
	loadingValue: {
		width: "50%",
		height: 24,
		backgroundColor: "rgba(255, 255, 255, 0.3)",
		borderRadius: 12,
	},
});

export default React.memo(KPICard);

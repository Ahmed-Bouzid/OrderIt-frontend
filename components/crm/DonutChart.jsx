/**
 * 🍩 DonutChart - Graphique circulaire animé
 * Inspiré du modèle 21st.dev/community/components/ravikatiyar/donut-chart
 * Affiche des données sous forme de graphique en donut interactif
 */

import React, { useEffect, useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Circle, G } from "react-native-svg";
import Animated, {
	useSharedValue,
	useAnimatedProps,
	withTiming,
	Easing,
} from "react-native-reanimated";
import { useTheme } from "../../hooks/useTheme";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/**
 * Composant séparé pour un segment de donut
 */
const DonutSegment = ({
	segment,
	index,
	centerX,
	centerY,
	radius,
	strokeWidth,
	circumference,
	animationDuration,
	animationDelay,
}) => {
	const progress = useSharedValue(0);

	useEffect(() => {
		progress.value = withTiming(1, {
			duration: animationDuration,
			delay: animationDelay + index * 100,
			easing: Easing.bezier(0.25, 0.1, 0.25, 1),
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const animatedProps = useAnimatedProps(() => ({
		strokeDasharray: `${segment.strokeDasharray * progress.value} ${circumference}`,
		strokeDashoffset: segment.strokeDashoffset,
	}));

	return (
		<AnimatedCircle
			cx={centerX}
			cy={centerY}
			r={radius}
			stroke={segment.color}
			strokeWidth={strokeWidth}
			fill="none"
			strokeLinecap="round"
			animatedProps={animatedProps}
		/>
	);
};

const DonutChart = ({
	data = [],
	size = 200,
	strokeWidth = 30,
	title = "",
	subtitle = "",
	centerValue = null,
	centerLabel = "",
	showLegend = true,
	animationDuration = 1000,
	animationDelay = 0,
	colors = [],
}) => {
	const THEME = useTheme();

	// Calculs géométriques
	const radius = (size - strokeWidth) / 2;
	const circumference = 2 * Math.PI * radius;
	const centerX = size / 2;
	const centerY = size / 2;

	// Couleurs par défaut si non fournies
	const defaultColors = [
		THEME.colors.primary.amber,
		"#3B82F6",
		"#10B981",
		"#F59E0B",
		"#EF4444",
		"#8B5CF6",
		"#EC4899",
		"#14B8A6",
	];

	const chartColors = colors.length > 0 ? colors : defaultColors;

	// Total des valeurs
	const total = useMemo(() => {
		return data.reduce((sum, item) => sum + (item.value || 0), 0);
	}, [data]);

	// Préparation des segments
	const segments = useMemo(() => {
		let accumulatedPercentage = 0;

		return data.map((item, index) => {
			const percentage = total > 0 ? (item.value / total) * 100 : 0;
			const strokeDasharray = (percentage / 100) * circumference;
			const strokeDashoffset =
				circumference - (accumulatedPercentage / 100) * circumference;

			const segment = {
				...item,
				percentage,
				strokeDasharray,
				strokeDashoffset,
				color: item.color || chartColors[index % chartColors.length],
			};

			accumulatedPercentage += percentage;
			return segment;
		});
	}, [data, total, circumference, chartColors]);

	// Valeur centrale (total ou custom)
	const displayCenterValue = centerValue !== null ? centerValue : total;

	return (
		<View style={styles.container}>
			{/* Titre */}
			{title && (
				<Text style={[styles.title, { color: THEME.colors.text.primary }]}>
					{title}
				</Text>
			)}
			{subtitle && (
				<Text style={[styles.subtitle, { color: THEME.colors.text.secondary }]}>
					{subtitle}
				</Text>
			)}

			<View style={styles.chartContainer}>
				{/* Graphique SVG */}
				<Svg width={size} height={size}>
					<G rotation="-90" origin={`${centerX}, ${centerY}`}>
						{segments.map((segment, index) => (
							<DonutSegment
								key={index}
								segment={segment}
								index={index}
								centerX={centerX}
								centerY={centerY}
								radius={radius}
								strokeWidth={strokeWidth}
								circumference={circumference}
								animationDuration={animationDuration}
								animationDelay={animationDelay}
							/>
						))}
					</G>
				</Svg>

				{/* Valeur centrale */}
				<View style={styles.centerContent}>
					<Text
						style={[styles.centerValue, { color: THEME.colors.text.primary }]}
					>
						{typeof displayCenterValue === "number"
							? displayCenterValue.toLocaleString()
							: displayCenterValue}
					</Text>
					{centerLabel && (
						<Text
							style={[
								styles.centerLabel,
								{ color: THEME.colors.text.secondary },
							]}
						>
							{centerLabel}
						</Text>
					)}
				</View>
			</View>

			{/* Légende */}
			{showLegend && segments.length > 0 && (
				<View style={styles.legend}>
					{segments.map((segment, index) => (
						<View key={index} style={styles.legendItem}>
							<View
								style={[styles.legendColor, { backgroundColor: segment.color }]}
							/>
							<Text
								style={[
									styles.legendLabel,
									{ color: THEME.colors.text.primary },
								]}
								numberOfLines={1}
							>
								{segment.label || `Item ${index + 1}`}
							</Text>
							<Text
								style={[
									styles.legendValue,
									{ color: THEME.colors.text.secondary },
								]}
							>
								{segment.percentage.toFixed(1)}%
							</Text>
						</View>
					))}
				</View>
			)}
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		alignItems: "center",
		paddingVertical: 16,
	},
	title: {
		fontSize: 18,
		fontWeight: "bold",
		marginBottom: 4,
		textAlign: "center",
	},
	subtitle: {
		fontSize: 14,
		marginBottom: 16,
		textAlign: "center",
	},
	chartContainer: {
		position: "relative",
		justifyContent: "center",
		alignItems: "center",
		marginBottom: 20,
	},
	centerContent: {
		position: "absolute",
		alignItems: "center",
		justifyContent: "center",
	},
	centerValue: {
		fontSize: 32,
		fontWeight: "bold",
	},
	centerLabel: {
		fontSize: 12,
		marginTop: 4,
	},
	legend: {
		width: "100%",
		gap: 8,
	},
	legendItem: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 8,
		paddingVertical: 6,
		gap: 12,
	},
	legendColor: {
		width: 12,
		height: 12,
		borderRadius: 2,
	},
	legendLabel: {
		flex: 1,
		fontSize: 14,
	},
	legendValue: {
		fontSize: 14,
		fontWeight: "600",
		minWidth: 50,
		textAlign: "right",
	},
});

export default DonutChart;

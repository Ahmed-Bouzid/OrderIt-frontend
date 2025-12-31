/**
 * LoadingSkeleton.jsx - Composant de chargement Premium
 * Skeleton animé avec effets de brillance et design spatial
 * Support Mode Clair/Sombre
 */
import React, { useMemo } from "react";
import { View, Animated, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import useThemeStore from "../../src/stores/useThemeStore";
import { getTheme } from "../../utils/themeUtils";

// ─────────────── Skeleton Card Component ───────────────
const ReservationCardSkeleton = React.memo(({ index, styles }) => {
	const animatedValue = React.useRef(new Animated.Value(0)).current;
	const shimmerValue = React.useRef(new Animated.Value(0)).current;

	React.useEffect(() => {
		// Animation de pulsation
		Animated.loop(
			Animated.sequence([
				Animated.timing(animatedValue, {
					toValue: 1,
					duration: 1200,
					useNativeDriver: true,
				}),
				Animated.timing(animatedValue, {
					toValue: 0,
					duration: 1200,
					useNativeDriver: true,
				}),
			])
		).start();

		// Animation de shimmer
		Animated.loop(
			Animated.timing(shimmerValue, {
				toValue: 1,
				duration: 2000,
				useNativeDriver: true,
			})
		).start();
	}, [animatedValue, shimmerValue]);

	const opacity = animatedValue.interpolate({
		inputRange: [0, 1],
		outputRange: [0.4, 0.8],
	});

	const translateX = shimmerValue.interpolate({
		inputRange: [0, 1],
		outputRange: [-200, 200],
	});

	return (
		<View style={[styles.skeletonCard, { opacity: 1 - index * 0.08 }]}>
			{/* Shimmer overlay */}
			<Animated.View
				style={[styles.shimmerOverlay, { transform: [{ translateX }] }]}
			>
				<LinearGradient
					colors={["transparent", "rgba(255,255,255,0.05)", "transparent"]}
					start={{ x: 0, y: 0 }}
					end={{ x: 1, y: 0 }}
					style={StyleSheet.absoluteFill}
				/>
			</Animated.View>

			{/* Status bar glow */}
			<Animated.View style={[styles.statusBar, { opacity }]} />

			{/* Content skeleton */}
			<View style={styles.content}>
				<View style={styles.leftColumn}>
					<Animated.View style={[styles.skeletonName, { opacity }]} />
					<Animated.View style={[styles.skeletonText, { opacity }]} />
					<Animated.View style={[styles.skeletonTextShort, { opacity }]} />
				</View>
				<View style={styles.rightColumn}>
					<Animated.View style={[styles.skeletonBadge, { opacity }]} />
					<Animated.View style={[styles.skeletonTextSmall, { opacity }]} />
				</View>
			</View>
		</View>
	);
});

// ─────────────── Main Loading Skeleton ───────────────
const LoadingSkeleton = React.memo(({ count = 6 }) => {
	const { themeMode } = useThemeStore();
	const THEME = useMemo(() => getTheme(themeMode), [themeMode]);
	const styles = useMemo(() => createStyles(THEME), [THEME]);
	const safeCount = typeof count === "number" && count > 0 ? count : 6;

	return (
		<View style={styles.container}>
			<View style={styles.grid}>
				{Array.from({ length: safeCount }).map((_, index) => (
					<ReservationCardSkeleton key={index} index={index} styles={styles} />
				))}
			</View>
		</View>
	);
});

// ─────────────── Styles Premium ───────────────
const createStyles = (THEME) =>
	StyleSheet.create({
		container: {
			flex: 1,
			padding: THEME.spacing.md,
		},
		grid: {
			flexDirection: "row",
			flexWrap: "wrap",
			gap: THEME.spacing.md,
		},
		skeletonCard: {
			width: "48%",
			backgroundColor: THEME.colors.background.card,
			borderRadius: THEME.radius.lg,
			borderWidth: 1,
			borderColor: THEME.colors.border.subtle,
			overflow: "hidden",
			minHeight: 140,
		},
		shimmerOverlay: {
			position: "absolute",
			top: 0,
			left: 0,
			right: 0,
			bottom: 0,
			width: 200,
		},
		statusBar: {
			height: 4,
			backgroundColor: THEME.colors.primary.amber,
			borderTopLeftRadius: THEME.radius.lg,
			borderTopRightRadius: THEME.radius.lg,
		},
		content: {
			flexDirection: "row",
			justifyContent: "space-between",
			padding: THEME.spacing.md,
			flex: 1,
		},
		leftColumn: {
			flex: 1,
			gap: THEME.spacing.sm,
		},
		rightColumn: {
			alignItems: "flex-end",
			gap: THEME.spacing.sm,
		},
		skeletonName: {
			height: 18,
			width: "75%",
			borderRadius: THEME.radius.sm,
			backgroundColor: THEME.colors.background.elevated,
		},
		skeletonText: {
			height: 12,
			width: "60%",
			borderRadius: THEME.radius.sm,
			backgroundColor: THEME.colors.background.elevated,
		},
		skeletonTextShort: {
			height: 12,
			width: "40%",
			borderRadius: THEME.radius.sm,
			backgroundColor: THEME.colors.background.elevated,
		},
		skeletonTextSmall: {
			height: 10,
			width: 50,
			borderRadius: THEME.radius.sm,
			backgroundColor: THEME.colors.background.elevated,
		},
		skeletonBadge: {
			height: 24,
			width: 70,
			borderRadius: THEME.radius.xl,
			backgroundColor: THEME.colors.background.elevated,
		},
	});

LoadingSkeleton.displayName = "LoadingSkeleton";
ReservationCardSkeleton.displayName = "ReservationCardSkeleton";

export default LoadingSkeleton;

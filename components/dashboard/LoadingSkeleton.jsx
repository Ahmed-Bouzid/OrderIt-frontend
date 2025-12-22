import React from "react";
import { View, Animated, StyleSheet } from "react-native";

const ReservationCardSkeleton = React.memo(({ theme }) => {
	const safeTheme = theme || {
		cardColor: "#f0f0f0",
		borderColor: "#ddd",
		textColor: "#ccc",
	};
	const animatedValue = React.useRef(new Animated.Value(0)).current;

	React.useEffect(() => {
		Animated.loop(
			Animated.sequence([
				Animated.timing(animatedValue, {
					toValue: 1,
					duration: 1000,
					useNativeDriver: true,
				}),
				Animated.timing(animatedValue, {
					toValue: 0,
					duration: 1000,
					useNativeDriver: true,
				}),
			])
		).start();
	}, [animatedValue]);

	const opacity = animatedValue.interpolate({
		inputRange: [0, 1],
		outputRange: [0.3, 0.7],
	});

	return (
		<View
			style={[
				styles.skeletonCard,
				{
					backgroundColor: safeTheme.cardColor,
					borderColor: safeTheme.borderColor,
				},
			]}
		>
			<View style={styles.skeletonRow}>
				<View style={styles.skeletonLeft}>
					<Animated.View
						style={[
							styles.skeletonName,
							{
								backgroundColor: safeTheme.textColor,
								opacity,
							},
						]}
					/>
					<Animated.View
						style={[
							styles.skeletonText,
							{
								backgroundColor: safeTheme.textColor,
								opacity,
							},
						]}
					/>
					<Animated.View
						style={[
							styles.skeletonText,
							{
								backgroundColor: safeTheme.textColor,
								opacity,
							},
						]}
					/>
				</View>
				<View style={styles.skeletonRight}>
					<Animated.View
						style={[
							styles.skeletonText,
							{
								backgroundColor: safeTheme.textColor,
								opacity,
							},
						]}
					/>
					<Animated.View
						style={[
							styles.skeletonText,
							{
								backgroundColor: safeTheme.textColor,
								opacity,
							},
						]}
					/>
				</View>
			</View>
		</View>
	);
});

const LoadingSkeleton = React.memo(({ theme, count = 5 }) => {
	const safeCount = typeof count === "number" && count > 0 ? count : 5;
	return (
		<View style={styles.container}>
			{Array.from({ length: safeCount }).map((_, index) => (
				<ReservationCardSkeleton key={index} theme={theme} />
			))}
		</View>
	);
});

const styles = StyleSheet.create({
	container: {
		padding: 10,
	},
	skeletonCard: {
		padding: 15,
		marginBottom: 10,
		borderRadius: 10,
		borderWidth: 1,
	},
	skeletonRow: {
		flexDirection: "row",
		justifyContent: "space-between",
	},
	skeletonLeft: {
		flex: 1,
		gap: 10,
	},
	skeletonRight: {
		flex: 1,
		gap: 10,
		alignItems: "flex-end",
	},
	skeletonName: {
		height: 20,
		width: "80%",
		borderRadius: 4,
	},
	skeletonText: {
		height: 14,
		width: "60%",
		borderRadius: 4,
	},
});

LoadingSkeleton.displayName = "LoadingSkeleton";
ReservationCardSkeleton.displayName = "ReservationCardSkeleton";

export default LoadingSkeleton;

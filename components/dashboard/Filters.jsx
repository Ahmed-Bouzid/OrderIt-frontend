import React, { useRef, useEffect, useState } from "react";
import {
	View,
	Text,
	TouchableOpacity,
	Animated,
	Platform,
	UIManager,
} from "react-native";
import styles from "../styles";

// Enable LayoutAnimation on Android
if (
	Platform.OS === "android" &&
	UIManager.setLayoutAnimationEnabledExperimental
) {
	UIManager.setLayoutAnimationEnabledExperimental(true);
}

const FILTERS = [
	{ key: "actives", label: "En attente", icon: "⏳" },
	{ key: "present", label: "Présent", icon: "✓" },
	{ key: "ouverte", label: "Ouverte", icon: "🍽️" },
	{ key: "termine", label: "Terminée", icon: "✅" },
	{ key: "annulee", label: "Annulée", icon: "❌" },
];

const Filters = React.memo(({ activeFilter, onFilterChange, theme }) => {
	const [layouts, setLayouts] = useState({});
	const [isReady, setIsReady] = useState(false);
	const translateX = useRef(new Animated.Value(0)).current;
	const width = useRef(new Animated.Value(120)).current;

	const getFilterColor = (key) => {
		const colors = {
			actives: "#FFC107",
			present: "#4CAF50",
			ouverte: "#2196F3",
			termine: "#9E9E9E",
			annulee: "#F44336",
		};
		return colors[key] || "#9E9E9E";
	};

	const activeColor = getFilterColor(activeFilter);

	const handleLayout = (key, event) => {
		const { x, width: w } = event.nativeEvent.layout;
		setLayouts((prev) => {
			const newLayouts = { ...prev, [key]: { x, width: w } };
			// Initialiser le slider une fois que tous les layouts sont prêts
			if (Object.keys(newLayouts).length === FILTERS.length && !isReady) {
				setIsReady(true);
				const initialLayout = newLayouts[activeFilter];
				if (initialLayout) {
					translateX.setValue(initialLayout.x);
					width.setValue(initialLayout.width);
				}
			}
			return newLayouts;
		});
	};

	useEffect(() => {
		if (isReady && layouts[activeFilter]) {
			const layout = layouts[activeFilter];
			Animated.parallel([
				Animated.spring(translateX, {
					toValue: layout.x,
					useNativeDriver: false,
					bounciness: 8,
				}),
				Animated.spring(width, {
					toValue: layout.width,
					useNativeDriver: false,
					bounciness: 8,
				}),
			]).start();
		}
	}, [activeFilter, layouts, isReady]);

	return (
		<View style={styles.morphingNavContainer}>
			<View style={styles.morphingNavInner}>
				{/* Background slider - visible seulement quand prêt */}
				{isReady && (
					<Animated.View
						style={[
							styles.morphingNavSlider,
							{
								left: translateX,
								width: width,
								backgroundColor: `${activeColor}33`,
								borderColor: activeColor,
							},
						]}
					/>
				)}

				{/* Boutons */}
				{FILTERS.map(({ key, label, icon }) => {
					const isActive = activeFilter === key;
					const filterColor = getFilterColor(key);

					return (
						<TouchableOpacity
							key={key}
							onPress={() => onFilterChange(key)}
							activeOpacity={0.7}
							onLayout={(e) => handleLayout(key, e)}
						>
							<View style={styles.morphingNavItem}>
								<Text style={styles.morphingNavIcon}>{icon}</Text>
								<Text
									style={[
										styles.morphingNavLabel,
										{
											color: isActive
												? filterColor
												: theme?.textColor || "#666",
											fontWeight: isActive ? "700" : "500",
										},
									]}
								>
									{label}
								</Text>
							</View>
						</TouchableOpacity>
					);
				})}
			</View>
		</View>
	);
});

Filters.displayName = "Filters";

export default Filters;

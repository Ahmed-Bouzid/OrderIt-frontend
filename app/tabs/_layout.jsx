// app/(tabs)/_layout.jsx - Premium Design
/**
 * Navigation par onglets avec design spatial premium
 * Thème sombre cohérent avec le reste de l'application
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
	View,
	Text,
	TouchableOpacity,
	StyleSheet,
	Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Activity from "../../components/screens/Activity";
import FloorScreen from "../../components/screens/Floor";
import Settings from "../../components/screens/Settings";
import useSocket from "../../hooks/useSocket";
import ClientMessageNotification from "../../components/ui/ClientMessageNotification";

// Configuration des tabs
const TABS = [
	{ name: "activity", label: "Activité", icon: "calendar-outline" },
	{ name: "floor", label: "Floor", icon: "map-outline" },
	{ name: "reglage", label: "Réglages", icon: "settings-outline" },
];

// Design tokens locaux
const THEME = {
	colors: {
		background: { dark: "#0C0F17", card: "#151923", elevated: "#1E2433" },
		primary: { amber: "#F59E0B" },
		text: { primary: "#F8FAFC", secondary: "#94A3B8", muted: "#64748B" },
		border: { subtle: "rgba(148, 163, 184, 0.1)" },
	},
	spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 20 },
	radius: { md: 10, lg: 14, xl: 18 },
};

// TabButton component - Structure simplifiée sans Animated.View wrapper
const TabButton = React.memo(({ tab, isActive, onPress, onLayout }) => {
	// Extension de zone tactile pour le premier bouton (Activity) uniquement
	const hitSlop =
		tab.name === "activity"
			? { top: 10, bottom: 10, left: 20, right: 10 }
			: { top: 10, bottom: 10, left: 10, right: 10 };

	return (
		<TouchableOpacity
			onPress={onPress}
			activeOpacity={0.7}
			onLayout={onLayout}
			style={[tabStyles.tabButton]}
			hitSlop={hitSlop}
		>
			<Ionicons
				name={tab.icon}
				size={20}
				color={isActive ? THEME.colors.primary.amber : THEME.colors.text.muted}
				style={{ marginRight: THEME.spacing.sm }}
			/>
			<Text style={[tabStyles.tabText, isActive && tabStyles.tabTextActive]}>
				{tab.label}
			</Text>
		</TouchableOpacity>
	);
});

TabButton.displayName = "TabButton";

export default function TabsLayout() {
	const [activeTab, setActiveTab] = useState("activity");
	const { connect } = useSocket();

	// ═══════════════════════════════════════════════════════════════════════
	// 🎯 Sliding effect pour les TABs (comme Filters.jsx)
	// ═══════════════════════════════════════════════════════════════════════
	const [tabLayouts, setTabLayouts] = useState({});
	const [isSliderReady, setIsSliderReady] = useState(false);
	const sliderTranslateX = useRef(new Animated.Value(0)).current;
	const sliderWidth = useRef(new Animated.Value(100)).current;

	const handleTabLayout = (tabName, event) => {
		const { x, width: w } = event.nativeEvent.layout;
		setTabLayouts((prev) => {
			const newLayouts = { ...prev, [tabName]: { x, width: w } };
			// Initialiser le slider quand tous les layouts sont capturés
			if (Object.keys(newLayouts).length === TABS.length && !isSliderReady) {
				setIsSliderReady(true);
				const initialLayout = newLayouts[activeTab];
				if (initialLayout) {
					sliderTranslateX.setValue(initialLayout.x);
					sliderWidth.setValue(initialLayout.width);
				}
			}
			return newLayouts;
		});
	};

	// Animation au changement de tab
	useEffect(() => {
		if (isSliderReady && tabLayouts[activeTab]) {
			const layout = tabLayouts[activeTab];
			Animated.parallel([
				Animated.spring(sliderTranslateX, {
					toValue: layout.x,
					useNativeDriver: false,
					bounciness: 8,
				}),
				Animated.spring(sliderWidth, {
					toValue: layout.width,
					useNativeDriver: false,
					bounciness: 8,
				}),
			]).start();
		}
	}, [activeTab, tabLayouts, isSliderReady, sliderTranslateX, sliderWidth]);

	// ✅ Connecter WebSocket au montage (index.jsx gère déjà l'auth)
	useEffect(() => {
		connect();
	}, [connect]);

	const handleTabPress = useCallback(
		(tabName) => {
			setActiveTab(tabName);
		},
		[]
	);

	const handleStart = useCallback(() => {}, []);

	const renderContent = useCallback(() => {
		switch (activeTab) {
			case "activity":
				return <Activity onStart={handleStart} />;
			case "floor":
				return <FloorScreen />;
			case "reglage":
				return <Settings />;
			default:
				return null;
		}
	}, [activeTab, handleStart]);

	return (
		<SafeAreaView style={tabStyles.container}>
			<LinearGradient
				colors={[THEME.colors.background.dark, THEME.colors.background.card]}
				style={StyleSheet.absoluteFill}
			/>

			{/* 🔔 Notification des messages clients */}
			<ClientMessageNotification
				onMessagePress={(message) => {
					console.log("📨 Message cliqué:", message);
					// TODO: Naviguer vers la table ou ouvrir un détail
					setActiveTab("activity");
				}}
			/>

			<View style={{ flex: 1 }}>
				{/* Premium Navbar */}
				<View style={tabStyles.navbar}>
					<View style={tabStyles.brandContainer}>
						<LinearGradient
							colors={[
								`${THEME.colors.primary.amber}30`,
								`${THEME.colors.primary.amber}10`,
							]}
							style={tabStyles.brandIconBg}
						>
							<Ionicons
								name="restaurant"
								size={18}
								color={THEME.colors.primary.amber}
							/>
						</LinearGradient>
						<Text style={tabStyles.brandText}>OrderIt</Text>
					</View>

					<View style={tabStyles.tabsContainer}>
						{/* Slider animé (comme Filters.jsx) */}
						{isSliderReady && (
							<Animated.View
								pointerEvents="none"
								style={[
									tabStyles.tabSlider,
									{
										left: sliderTranslateX,
										width: sliderWidth,
									},
								]}
							/>
						)}
						{TABS.map((tab) => (
							<TabButton
								key={tab.name}
								tab={tab}
								isActive={activeTab === tab.name}
								onPress={() => handleTabPress(tab.name)}
								onLayout={(e) => handleTabLayout(tab.name, e)}
							/>
						))}
					</View>

					<View style={{ width: 100 }} />
				</View>

				<LinearGradient
					colors={["transparent", THEME.colors.border.subtle, "transparent"]}
					start={{ x: 0, y: 0 }}
					end={{ x: 1, y: 0 }}
					style={{ height: 1 }}
				/>

				<View style={{ flex: 1 }}>{renderContent()}</View>
			</View>
		</SafeAreaView>
	);
}

const tabStyles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: THEME.colors.background.dark,
	},
	loadingContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		backgroundColor: THEME.colors.background.dark,
	},
	loadingText: {
		marginTop: THEME.spacing.lg,
		fontSize: 14,
		fontWeight: "500",
		color: THEME.colors.text.secondary,
	},
	navbar: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		paddingVertical: THEME.spacing.md,
		paddingHorizontal: THEME.spacing.xl,
		backgroundColor: `${THEME.colors.background.card}95`,
		borderBottomWidth: 1,
		borderBottomColor: THEME.colors.border.subtle,
	},
	brandContainer: {
		flexDirection: "row",
		alignItems: "center",
		width: 100,
	},
	brandIconBg: {
		width: 38,
		height: 38,
		borderRadius: THEME.radius.md,
		justifyContent: "center",
		alignItems: "center",
		marginRight: THEME.spacing.sm,
	},
	brandText: {
		fontSize: 22,
		fontWeight: "800",
		color: THEME.colors.text.primary,
		letterSpacing: 0.8,
	},
	tabsContainer: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: THEME.colors.background.elevated,
		borderRadius: THEME.radius.xl,
		padding: THEME.spacing.xs,
		borderWidth: 1,
		borderColor: THEME.colors.border.subtle,
		position: "relative",
	},
	tabSlider: {
		position: "absolute",
		height: 44,
		backgroundColor: `${THEME.colors.primary.amber}25`,
		borderRadius: THEME.radius.lg,
		borderWidth: 2,
		borderColor: `${THEME.colors.primary.amber}60`,
		shadowColor: THEME.colors.primary.amber,
		shadowOffset: { width: 0, height: 0 },
		shadowOpacity: 0.4,
		shadowRadius: 12,
		elevation: 6,
		zIndex: 0,
	},
	tabButton: {
		flexDirection: "row",
		alignItems: "center",
		paddingVertical: THEME.spacing.md,
		paddingHorizontal: THEME.spacing.xl + 4,
		borderRadius: THEME.radius.lg,
		marginHorizontal: 6,
		overflow: "hidden",
		position: "relative",
		zIndex: 1,
	},
	tabButtonActive: {
		borderWidth: 1,
		borderColor: `${THEME.colors.primary.amber}40`,
	},
	tabText: {
		fontSize: 15,
		fontWeight: "500",
		color: THEME.colors.text.muted,
		lineHeight: 20,
	},
	tabTextActive: {
		color: THEME.colors.primary.amber,
		fontWeight: "600",
	},
});

// app/(tabs)/_layout.jsx - Premium Design
/**
 * Navigation par onglets avec design spatial premium
 * Thème sombre cohérent avec le reste de l'application
 * 🎯 Adaptation dynamique selon le Feature Level (complet/intermediaire/minimum)
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
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Activity from "../../components/screens/Activity";
import FloorScreen from "../../components/screens/Floor";
import Settings from "../../components/screens/Settings";
import useSocket from "../../hooks/useSocket";

import useUserStore from "../../src/stores/useUserStore";
import { useFeatureLevelStore } from "../../src/stores/useFeatureLevelStore";

import ClientMessagesPanel from "../../components/ui/ClientMessagesPanel";

// Tabs de base - affichés selon le niveau fonctionnel
const ALL_TABS = [
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
	// 🎯 Récupérer les tabs disponibles depuis le Feature Level Store
	const availableTabs = useFeatureLevelStore((state) => state.tabs);
	const isFeatureLevelReady = useFeatureLevelStore(
		(state) => state.isInitialized,
	);

	// Filtrer ALL_TABS selon les tabs disponibles dans le niveau actuel
	const TABS = ALL_TABS.filter((tab) => availableTabs.includes(tab.name));

	// Charger la catégorie dès le montage (initialise automatiquement le FeatureLevelStore)
	useEffect(() => {
		useUserStore.getState().init();
	}, []);

	// Initialiser le tab actif dynamiquement une fois que le Feature Level est prêt
	const [activeTab, setActiveTab] = useState("");
	const [showMessagesPanel, setShowMessagesPanel] = useState(false);
	const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);

	// Debug : surveiller le changement de showMessagesPanel
	useEffect(() => {
		console.log("🔍 showMessagesPanel a changé:", showMessagesPanel);
	}, [showMessagesPanel]);

	useEffect(() => {
		if (isFeatureLevelReady && TABS.length > 0 && !activeTab) {
			const firstTab = TABS[0]?.name || "floor";
			console.log("🎯 [TabsLayout] Premier tab disponible:", firstTab);
			setActiveTab(firstTab);
		}
	}, [isFeatureLevelReady, TABS, activeTab]);

	const { connect, socket, isConnected } = useSocket();

	// Écouter les nouveaux messages pour le badge
	useEffect(() => {
		if (!socket || !isConnected) return;

		const handleNewMessage = (event) => {
			if (event.type === "new-message") {
				setUnreadMessagesCount((prev) => prev + 1);
			}
		};

		socket.on("client-message", handleNewMessage);
		return () => socket.off("client-message", handleNewMessage);
	}, [socket, isConnected]);

	// Charger le compteur initial au montage
	useEffect(() => {
		const loadUnreadCount = async () => {
			try {
				const restaurantId = await AsyncStorage.getItem("restaurantId");
				const token = await AsyncStorage.getItem("token");
				if (!restaurantId || !token) return;

				const url = `${process.env.EXPO_PUBLIC_API_URL}/client-messages/restaurant/${restaurantId}?status=sent`;
				const response = await fetch(url, {
					headers: { Authorization: `Bearer ${token}` },
				});

				if (response.ok) {
					const data = await response.json();
					setUnreadMessagesCount(data.messages?.length || 0);
				}
			} catch (error) {
				console.error("❌ Erreur chargement compteur messages:", error);
			}
		};
		loadUnreadCount();
	}, []);

	// ═══════════════════════════════════════════════════════════════════════
	// 🎯 Sliding effect pour les TABs (comme Filters.jsx)
	// ═══════════════════════════════════════════════════════════════════════
	const [tabLayouts, setTabLayouts] = useState({});
	const [isSliderReady, setIsSliderReady] = useState(false);
	const sliderTranslateX = useRef(new Animated.Value(0)).current;
	const sliderWidth = useRef(new Animated.Value(100)).current;

	// Reset du slider si TABS change (ex: foodtruck)
	useEffect(() => {
		setTabLayouts({});
		setIsSliderReady(false);
	}, [TABS.length]);

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

	// Si la catégorie change (ex: login), s'assurer que le tab actif existe
	useEffect(() => {
		if (!TABS.find((t) => t.name === activeTab)) {
			setActiveTab(TABS[0]?.name);
		}
	}, [TABS, activeTab]);

	// ✅ Connecter WebSocket au montage (index.jsx gère déjà l'auth)
	useEffect(() => {
		connect();
	}, [connect]);

	const handleTabPress = useCallback((tabName) => {
		setActiveTab(tabName);
	}, []);

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
							<Ionicons name="sunny" size={40} color="#FFD600" />
						</LinearGradient>
						<Text
							style={tabStyles.brandText}
							numberOfLines={1}
							ellipsizeMode="clip"
						>
							SunnyGo
						</Text>
					</View>

					{/* Bouton Messages avec badge */}
					{/* <TouchableOpacity
						onPress={() => {
							console.log("🔔 Bouton Messages cliqué");
							console.log("showMessagesPanel avant:", showMessagesPanel);
							setShowMessagesPanel(true);
							setUnreadMessagesCount(0);
							console.log("showMessagesPanel après:", true);
						}}
						style={tabStyles.messagesButton}
						activeOpacity={0.7}
					>
						<Ionicons
							name="chatbubbles"
							size={22}
							color={THEME.colors.text.secondary}
						/>
						{unreadMessagesCount > 0 && (
							<View style={tabStyles.badge}>
								<Text style={tabStyles.badgeText}>
									{unreadMessagesCount > 9 ? "9+" : unreadMessagesCount}
								</Text>
							</View>
						)}
					</TouchableOpacity> */}

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

			{/* Panel des messages clients */}
			<ClientMessagesPanel
				visible={showMessagesPanel}
				onClose={() => setShowMessagesPanel(false)}
				onOpen={() => setShowMessagesPanel(true)}
			/>

			{/* Bouton flottant de messagerie (côté droit) */}
			<View style={tabStyles.floatingButtonWrapper}>
				<TouchableOpacity
					style={tabStyles.floatingMessageButton}
					onPress={() => setShowMessagesPanel(true)}
					activeOpacity={0.8}
				>
					<LinearGradient
						colors={["#667eea", "#764ba2"]}
						style={tabStyles.floatingButtonGradient}
					>
						<Ionicons name="chatbubbles" size={24} color="#fff" />
					</LinearGradient>
				</TouchableOpacity>
				{unreadMessagesCount > 0 && (
					<View style={tabStyles.floatingBadge}>
						<Text style={tabStyles.floatingBadgeText}>
							{unreadMessagesCount > 99 ? "99+" : unreadMessagesCount}
						</Text>
					</View>
				)}
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
		minWidth: 180,
		maxWidth: 280,
		width: "auto",
	},
	brandIconBg: {
		width: 50,
		height: 50,
		borderRadius: THEME.radius.md,
		justifyContent: "center",
		alignItems: "center",
		marginRight: THEME.spacing.sm,
	},
	brandText: {
		fontSize: 32,
		fontWeight: "700",
		flexShrink: 1,
		alignSelf: "center",
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
	messagesButton: {
		position: "relative",
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderRadius: 12,
		backgroundColor: "rgba(148, 163, 184, 0.1)",
		marginRight: THEME.spacing.md,
	},
	badge: {
		position: "absolute",
		top: -4,
		right: -4,
		backgroundColor: "#ef4444",
		borderRadius: 10,
		minWidth: 20,
		height: 20,
		justifyContent: "center",
		alignItems: "center",
		paddingHorizontal: 4,
		borderWidth: 2,
		borderColor: THEME.colors.background.dark,
	},
	badgeText: {
		fontSize: 11,
		fontWeight: "700",
		color: "#fff",
	},
	// Bouton flottant de messagerie (côté droit)
	floatingButtonWrapper: {
		position: "absolute",
		right: 16,
		top: "50%",
		zIndex: 999,
	},
	floatingMessageButton: {
		width: 56,
		height: 56,
		borderRadius: 28,
		shadowColor: "#667eea",
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.3,
		shadowRadius: 8,
		elevation: 8,
	},
	floatingButtonGradient: {
		width: 56,
		height: 56,
		borderRadius: 28,
		justifyContent: "center",
		alignItems: "center",
	},
	floatingBadge: {
		position: "absolute",
		top: -4,
		right: -4,
		backgroundColor: "#ef4444",
		borderRadius: 12,
		minWidth: 24,
		height: 24,
		justifyContent: "center",
		alignItems: "center",
		paddingHorizontal: 6,
		borderWidth: 2,
		borderColor: THEME.colors.background.dark,
	},
	floatingBadgeText: {
		fontSize: 11,
		fontWeight: "700",
		color: "#fff",
	},
});

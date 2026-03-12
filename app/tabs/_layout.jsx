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
	Image,
	Dimensions,
	ScrollView,
} from "react-native";

const IS_PHONE = Dimensions.get("window").width < 600;
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { useFonts } from "expo-font";
import { Ionicons } from "@expo/vector-icons";
import Activity from "../../components/screens/Activity";
import FloorScreen from "../../components/screens/Floor";
import AgendaScreen from "../../components/screens/AgendaScreen";
import Settings from "../../components/screens/Settings";
import useSocket from "../../hooks/useSocket";
import { getItem } from "../../utils/secureStorage";

import useUserStore from "../../src/stores/useUserStore";
import { useFeatureLevelStore } from "../../src/stores/useFeatureLevelStore";
import useExpressOrdersStore from "../../src/stores/useExpressOrdersStore";

import ClientMessagesPanel from "../../components/ui/ClientMessagesPanel";

// Tabs de base - affichés selon le niveau fonctionnel
const ALL_TABS = [
	{ name: "activity", label: "Activité", icon: "calendar-outline" },
	{ name: "floor", label: "Floor", icon: "map-outline" },
	{ name: "agenda", label: "Agenda", icon: "time-outline" },
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
			delayPressIn={0}
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
	const [fontsLoaded] = useFonts({
		"Melodrama-Bold": require("../../assets/fonts/Melodrama-Bold.otf"),
	});

	// 🎯 Récupérer les tabs disponibles depuis le Feature Level Store
	const availableTabs = useFeatureLevelStore((state) => state.tabs);
	const isFeatureLevelReady = useFeatureLevelStore(
		(state) => state.isInitialized,
	);
	const isMinimum = useFeatureLevelStore((state) => state.isMinimum());

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
	const [restaurantName, setRestaurantName] = useState("Restaurant");

	// Charger le nom du restaurant
	useEffect(() => {
		const loadRestaurantName = async () => {
			try {
				const restaurantId = await AsyncStorage.getItem("restaurantId");
				const token = await getItem("access_token");

				if (!restaurantId || !token) {
					return;
				}

				// Vérifier le cache : utiliser uniquement si le restaurantId correspond
				const cachedId = await AsyncStorage.getItem("restaurantNameId");
				const cachedName = await AsyncStorage.getItem("restaurantName");
				if (cachedId === restaurantId && cachedName) {
					setRestaurantName(cachedName);
					return;
				}

				// Cache invalide ou absent → fetch API

				const url = `${process.env.EXPO_PUBLIC_API_URL}/restaurants/${restaurantId}/info`;
				const response = await fetch(url);

				if (response.ok) {
					const data = await response.json();
					const name = data.name || "Restaurant";
					setRestaurantName(name);
					// Mettre en cache avec l'ID associé
					await AsyncStorage.setItem("restaurantName", name);
					await AsyncStorage.setItem("restaurantNameId", restaurantId);
				} else {
					console.error("❌ Erreur API restaurant:", response.status);
				}
			} catch (error) {
				console.error("❌ Erreur chargement nom restaurant:", error);
			}
		};
		loadRestaurantName();
	}, []);

	useEffect(() => {
		if (isFeatureLevelReady && TABS.length > 0 && !activeTab) {
			const firstTab = TABS[0]?.name || "floor";
			setActiveTab(firstTab);
		}
	}, [isFeatureLevelReady, TABS, activeTab]);

	const { connect, socket, isConnected } = useSocket();

	// ⚡ Attacher le store Express Orders aux WebSocket
	const { attachSocketListener: attachExpressOrdersListener } =
		useExpressOrdersStore();

	// Attacher les listeners WebSocket pour Express Orders
	useEffect(() => {
		let cleanup = null;

		if (socket && isConnected) {
			cleanup = attachExpressOrdersListener(socket);
		}

		return () => {
			if (cleanup) {
				cleanup();
			}
		};
	}, [socket, isConnected, attachExpressOrdersListener]);

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
	// ⚠️ Guard obligatoire : avant isFeatureLevelReady, TABS contient les tabs par défaut
	// ("activity" inclus) et activeTab="" → ce guard forcerait "activity" pour fast-food.
	useEffect(() => {
		if (!isFeatureLevelReady) return;
		if (!TABS.find((t) => t.name === activeTab)) {
			setActiveTab(TABS[0]?.name);
		}
	}, [isFeatureLevelReady, TABS, activeTab]);

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
			case "agenda":
				return <AgendaScreen />;
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
					{/* Bloc logo + nom */}
					<View style={tabStyles.brandContainer}>
						<LinearGradient
							colors={[
								`${THEME.colors.primary.amber}30`,
								`${THEME.colors.primary.amber}10`,
							]}
							style={tabStyles.brandIconBg}
						>
							<Image
								source={require("../../assets/images/sunflower.png")}
								style={{
									width: IS_PHONE ? 32 : 40,
									height: IS_PHONE ? 32 : 40,
								}}
								resizeMode="contain"
							/>
						</LinearGradient>
						<Text
							style={tabStyles.brandText}
							numberOfLines={1}
							ellipsizeMode="tail"
						>
							{restaurantName}
						</Text>
					</View>

					{/* Onglets — scroll horizontal sur iPhone */}
					{IS_PHONE ? (
						<ScrollView
							horizontal
							showsHorizontalScrollIndicator={false}
							contentContainerStyle={{ flexDirection: "row", alignItems: "center" }}
							style={tabStyles.tabsScrollPhone}
						>
							<View style={tabStyles.tabsContainer}>
								{isSliderReady && (
									<Animated.View
										pointerEvents="none"
										style={[
											tabStyles.tabSlider,
											{ left: sliderTranslateX, width: sliderWidth },
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
						</ScrollView>
					) : (
						<View style={tabStyles.tabsContainer}>
							{isSliderReady && (
								<Animated.View
									pointerEvents="none"
									style={[
										tabStyles.tabSlider,
										{ left: sliderTranslateX, width: sliderWidth },
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
					)}

					{/* Spacer droite (tablette uniquement, pour centrer les tabs) */}
					{!IS_PHONE && <View style={{ width: 100 }} />}
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
			{!isMinimum && (
				<ClientMessagesPanel
					visible={showMessagesPanel}
					onClose={() => setShowMessagesPanel(false)}
					onOpen={() => setShowMessagesPanel(true)}
				/>
			)}

			{/* Bouton flottant de messagerie (côté droit) */}
			{!isMinimum && (
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
			)}
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
		// Phone : colonne (nom resto en haut, tabs en dessous)
		// Tablette : ligne (nom à gauche, tabs au centre)
		flexDirection: IS_PHONE ? "column" : "row",
		justifyContent: IS_PHONE ? "center" : "space-between",
		alignItems: "center",
		paddingVertical: THEME.spacing.md,
		paddingHorizontal: THEME.spacing.xl,
		backgroundColor: `${THEME.colors.background.card}95`,
		borderBottomWidth: 1,
		borderBottomColor: THEME.colors.border.subtle,
		gap: IS_PHONE ? THEME.spacing.sm : 0,
	},
	brandContainer: {
		flexDirection: "row",
		alignItems: "center",
		width: IS_PHONE ? "100%" : "auto",
		justifyContent: IS_PHONE ? "center" : "flex-start",
	},
	brandIconBg: {
		width: IS_PHONE ? 36 : 50,
		height: IS_PHONE ? 36 : 50,
		borderRadius: THEME.radius.md,
		justifyContent: "center",
		alignItems: "center",
		marginRight: THEME.spacing.sm,
	},
	brandText: {
		fontSize: IS_PHONE ? 22 : 32,
		fontFamily: "Melodrama-Bold",
		flexShrink: 0,
		alignSelf: "center",
		color: THEME.colors.text.primary,
		letterSpacing: 0.8,
	},
	tabsScrollPhone: {
		// wrapper ScrollView horizontal sur iPhone
		alignSelf: "center",
		maxWidth: "100%",
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
	// Bouton flottant de messagerie (juste au-dessus du bouton +)
	floatingButtonWrapper: {
		position: "absolute",
		right: 25, // Aligné avec le FAB
		bottom: 120, // Au-dessus du FAB (24 + 60 + 16)
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

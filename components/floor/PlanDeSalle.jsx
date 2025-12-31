/**
 * PlanDeSalle.jsx - Composant Sidebar du plan de salle avec gestion des commandes
 * Affiche les onglets Plats, Boissons, Desserts avec items et timers (format sidebar)
 */
import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	FlatList,
	Animated,
	ActivityIndicator,
	ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import useThemeStore from "../../src/stores/useThemeStore";
import { getTheme } from "../../utils/themeUtils";
import { useAuthFetch } from "../../hooks/useAuthFetch";
import AsyncStorage from "@react-native-async-storage/async-storage";
import ItemRow from "./ItemRow";

const TABS = [
	{ id: "plat", label: "Plats", icon: "restaurant-outline", category: "plat" },
	{
		id: "boisson",
		label: "Boissons",
		icon: "wine-outline",
		category: "boisson",
	},
	{
		id: "dessert",
		label: "Desserts",
		icon: "ice-cream-outline",
		category: "dessert",
	},
];

const PlanDeSalle = React.memo(() => {
	const { themeMode } = useThemeStore();
	const THEME = useMemo(() => getTheme(themeMode), [themeMode]);
	const styles = useMemo(() => createStyles(THEME), [THEME]);
	const authFetch = useAuthFetch();

	const [activeTab, setActiveTab] = useState("plat");
	const [orders, setOrders] = useState([]);
	const [loading, setLoading] = useState(true);
	const [restaurantId, setRestaurantId] = useState(null);
	const [refreshing, setRefreshing] = useState(false);

	// Animation pour le slider
	const sliderAnim = React.useRef(new Animated.Value(0)).current;

	// Charger le restaurantId
	useEffect(() => {
		const loadRestaurantId = async () => {
			try {
				const id = await AsyncStorage.getItem("restaurantId");
				if (id) {
					setRestaurantId(id);
				}
			} catch (error) {
				console.error("Erreur chargement restaurantId:", error);
			}
		};
		loadRestaurantId();
	}, []);

	// Charger les commandes
	const fetchOrders = useCallback(async () => {
		if (!restaurantId) return;

		try {
			setLoading(true);
			const response = await authFetch(
				`/orders?restaurantId=${restaurantId}&status=confirmed,in_progress,ready`,
				{ method: "GET" }
			);

			if (response.ok) {
				const data = await response.json();
				setOrders(data.orders || []);
			}
		} catch (error) {
			console.error("Erreur chargement commandes:", error);
		} finally {
			setLoading(false);
		}
	}, [restaurantId, authFetch]);

	useEffect(() => {
		if (restaurantId) {
			fetchOrders();
		}
	}, [restaurantId, fetchOrders]);

	// Rafraîchir toutes les 30 secondes
	useEffect(() => {
		const interval = setInterval(() => {
			if (!refreshing && restaurantId) {
				fetchOrders();
			}
		}, 30000);

		return () => clearInterval(interval);
	}, [refreshing, restaurantId, fetchOrders]);

	// Extraire tous les items avec leur orderId
	const allItems = useMemo(() => {
		const items = [];
		orders.forEach((order) => {
			order.items?.forEach((item) => {
				items.push({
					...item,
					orderId: order._id,
					tableNumber: order.tableId?.number || "?",
					serverName: order.serverId?.name || "Non assigné",
					orderCreatedAt: order.createdAt,
					itemStartTime: item.startTime || order.createdAt, // Timer depuis startTime ou createdAt
					orderStatus: order.orderStatus,
				});
			});
		});
		// Trier du plus ancien au plus récent
		return items.sort((a, b) => {
			const timeA = new Date(a.itemStartTime).getTime();
			const timeB = new Date(b.itemStartTime).getTime();
			return timeA - timeB;
		});
	}, [orders]);

	// Filtrer les items par catégorie active
	const filteredItems = useMemo(() => {
		return allItems.filter((item) => item.category === activeTab);
	}, [allItems, activeTab]);

	// Changer d'onglet avec animation
	const handleTabChange = useCallback(
		(tabId, index) => {
			setActiveTab(tabId);
			Animated.spring(sliderAnim, {
				toValue: index * (100 / TABS.length),
				useNativeDriver: false,
				bounciness: 8,
			}).start();
		},
		[sliderAnim]
	);

	// Mettre à jour le statut d'un item
	const handleUpdateItemStatus = useCallback(
		async (orderId, itemId, newStatus) => {
			try {
				const response = await authFetch(
					`/orders/${orderId}/items/${itemId}/status`,
					{
						method: "PUT",
						body: JSON.stringify({ status: newStatus }),
					}
				);

				if (response.ok) {
					// Rafraîchir les données
					await fetchOrders();
				}
			} catch (error) {
				console.error("Erreur mise à jour statut:", error);
			}
		},
		[authFetch, fetchOrders]
	);

	// Pull to refresh
	const handleRefresh = useCallback(async () => {
		setRefreshing(true);
		await fetchOrders();
		setRefreshing(false);
	}, [fetchOrders]);

	// Rendu d'un item
	const renderItem = useCallback(
		({ item }) => (
			<ItemRow
				item={item}
				onUpdateStatus={handleUpdateItemStatus}
				THEME={THEME}
			/>
		),
		[handleUpdateItemStatus, THEME]
	);

	if (!restaurantId) {
		return (
			<View style={[styles.container, styles.centerContent]}>
				<Text style={styles.errorText}>Restaurant non configuré</Text>
			</View>
		);
	}

	return (
		<View style={styles.container}>
			{/* Header Sidebar */}
			<View style={styles.sidebarHeader}>
				<LinearGradient
					colors={["rgba(245, 158, 11, 0.15)", "rgba(245, 158, 11, 0.05)"]}
					style={styles.headerIconBg}
				>
					<Ionicons
						name="flame-outline"
						size={24}
						color={THEME.colors.primary.amber}
					/>
				</LinearGradient>
				<Text style={styles.headerTitle}>Plan de salle</Text>
			</View>

			{/* Tabs */}
			<View style={styles.tabsContainer}>
				<View style={styles.tabsInner}>
					{/* Slider animé */}
					<Animated.View
						style={[
							styles.tabSlider,
							{
								left: sliderAnim.interpolate({
									inputRange: [0, 100],
									outputRange: ["0%", "100%"],
								}),
								width: `${100 / TABS.length}%`,
							},
						]}
					/>

					{/* Tabs */}
					{TABS.map((tab, index) => {
						const isActive = activeTab === tab.id;
						const count = allItems.filter(
							(item) => item.category === tab.category
						).length;

						return (
							<TouchableOpacity
								key={tab.id}
								style={styles.tab}
								onPress={() => handleTabChange(tab.id, index)}
							>
								<Ionicons
									name={tab.icon}
									size={18}
									color={
										isActive
											? THEME.colors.primary.amber
											: THEME.colors.text.muted
									}
								/>
								<Text
									style={[styles.tabLabel, isActive && styles.tabLabelActive]}
								>
									{tab.label}
								</Text>
								{/* Badge count */}
								{count > 0 && (
									<View style={[styles.badge, isActive && styles.badgeActive]}>
										<Text style={styles.badgeText}>{count}</Text>
									</View>
								)}
							</TouchableOpacity>
						);
					})}
				</View>
			</View>

			{/* Content */}
			<ScrollView
				style={styles.scrollContent}
				contentContainerStyle={styles.listContent}
				showsVerticalScrollIndicator={false}
			>
				{loading ? (
					<View style={styles.centerContent}>
						<ActivityIndicator
							size="large"
							color={THEME.colors.primary.amber}
						/>
						<Text style={styles.loadingText}>Chargement...</Text>
					</View>
				) : filteredItems.length === 0 ? (
					<View style={styles.centerContent}>
						<Ionicons
							name="checkmark-circle-outline"
							size={48}
							color={THEME.colors.text.muted}
						/>
						<Text style={styles.emptyText}>
							Aucun {TABS.find((t) => t.id === activeTab)?.label.toLowerCase()}{" "}
							en cours
						</Text>
					</View>
				) : (
					filteredItems.map((item, index) => (
						<View
							key={`${item.orderId}-${item._id || index}`}
							style={styles.itemWrapper}
						>
							<ItemRow
								item={item}
								onUpdateStatus={handleUpdateItemStatus}
								THEME={THEME}
							/>
						</View>
					))
				)}
			</ScrollView>
		</View>
	);
});

PlanDeSalle.displayName = "PlanDeSalle";

const createStyles = (THEME) =>
	StyleSheet.create({
		container: {
			flex: 1,
			backgroundColor: THEME.colors.background.card,
		},
		centerContent: {
			flex: 1,
			justifyContent: "center",
			alignItems: "center",
			gap: THEME.spacing.md,
			paddingVertical: THEME.spacing.xl,
		},
		sidebarHeader: {
			flexDirection: "row",
			alignItems: "center",
			paddingHorizontal: THEME.spacing.lg,
			paddingVertical: THEME.spacing.xl,
			borderBottomWidth: 1,
			borderBottomColor: THEME.colors.border.subtle,
		},
		headerIconBg: {
			width: 48,
			height: 48,
			borderRadius: THEME.radius.lg,
			alignItems: "center",
			justifyContent: "center",
			marginRight: THEME.spacing.md,
		},
		headerTitle: {
			fontSize: THEME.typography.sizes.xl,
			fontWeight: THEME.typography.weights.bold,
			color: THEME.colors.text.primary,
		},
		tabsContainer: {
			backgroundColor: THEME.colors.background.elevated,
			borderBottomWidth: 1,
			borderBottomColor: THEME.colors.border.subtle,
		},
		tabsInner: {
			flexDirection: "row",
			position: "relative",
		},
		tabSlider: {
			position: "absolute",
			bottom: 0,
			height: 3,
			backgroundColor: THEME.colors.primary.amber,
			borderRadius: 2,
		},
		tab: {
			flex: 1,
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "center",
			paddingVertical: THEME.spacing.md,
			gap: THEME.spacing.xs,
		},
		tabLabel: {
			fontSize: 13,
			fontWeight: "600",
			color: THEME.colors.text.muted,
		},
		tabLabelActive: {
			color: THEME.colors.primary.amber,
		},
		badge: {
			backgroundColor: "rgba(245, 158, 11, 0.2)",
			borderRadius: 10,
			minWidth: 20,
			height: 20,
			alignItems: "center",
			justifyContent: "center",
			paddingHorizontal: 6,
		},
		badgeActive: {
			backgroundColor: THEME.colors.primary.amber,
		},
		badgeText: {
			fontSize: 11,
			fontWeight: "700",
			color: THEME.colors.primary.amber,
		},
		scrollContent: {
			flex: 1,
		},
		listContent: {
			padding: THEME.spacing.lg,
		},
		itemWrapper: {
			marginBottom: THEME.spacing.md,
		},
		loadingText: {
			fontSize: 14,
			color: THEME.colors.text.muted,
		},
		emptyText: {
			fontSize: 16,
			color: THEME.colors.text.muted,
			textAlign: "center",
		},
		errorText: {
			fontSize: 16,
			color: THEME.colors.status.error,
			textAlign: "center",
		},
	});

export default PlanDeSalle;

/**
 * Floor.jsx - Écran Plan de Salle Premium
 * Design spatial avec sidebar glassmorphism et gestion des items cuisine
 */
import React, {
	useEffect,
	useRef,
	useMemo,
	useState,
	useCallback,
} from "react";
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	Animated,
	ScrollView,
	FlatList,
	ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Dashboard from "./Dashboard";
import ItemRow from "../floor/ItemRow";
import { useAuthFetch } from "../../hooks/useAuthFetch";
import AsyncStorage from "@react-native-async-storage/async-storage";
import useThemeStore from "../../src/stores/useThemeStore";
import { getTheme } from "../../utils/themeUtils";

// ─────────────── Menu Item Component ───────────────
const MenuItem = React.memo(
	({ icon, label, isLast, count, isActive, onPress, floorStyles, THEME }) => {
		const scaleAnim = useRef(new Animated.Value(1)).current;

		const handlePressIn = () => {
			Animated.spring(scaleAnim, {
				toValue: 0.97,
				useNativeDriver: true,
			}).start();
		};

		const handlePressOut = () => {
			Animated.spring(scaleAnim, {
				toValue: 1,
				friction: 3,
				tension: 40,
				useNativeDriver: true,
			}).start();
		};

		return (
			<Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
				<TouchableOpacity
					onPressIn={handlePressIn}
					onPressOut={handlePressOut}
					onPress={onPress}
					activeOpacity={0.8}
					style={[
						floorStyles.menuItem,
						!isLast && floorStyles.menuItemBorder,
						isActive && floorStyles.menuItemActive,
					]}
				>
					<Ionicons
						name={icon}
						size={20}
						color={
							isActive ? THEME.colors.primary.amber : THEME.colors.text.muted
						}
						style={{ marginRight: 12 }}
					/>
					<Text
						style={[
							floorStyles.menuItemText,
							isActive && floorStyles.menuItemTextActive,
						]}
					>
						{label}
					</Text>
					{count > 0 && (
						<View style={floorStyles.countBadge}>
							<Text style={floorStyles.countBadgeText}>{count}</Text>
						</View>
					)}
				</TouchableOpacity>
			</Animated.View>
		);
	}
);

MenuItem.displayName = "MenuItem";

// ─────────────── Section Header Component ───────────────
const SectionHeader = React.memo(
	({ icon, label, gradientColors, floorStyles, THEME }) => (
		<LinearGradient
			colors={gradientColors}
			start={{ x: 0, y: 0 }}
			end={{ x: 1, y: 0 }}
			style={floorStyles.sectionHeader}
		>
			<Ionicons name={icon} size={20} color={THEME.colors.text.primary} />
			<Text style={floorStyles.sectionTitle}>{label}</Text>
		</LinearGradient>
	)
);

SectionHeader.displayName = "SectionHeader";

// ─────────────── Group Box Component ───────────────
const GroupBox = React.memo(({ children, floorStyles }) => (
	<View style={floorStyles.groupBox}>{children}</View>
));

GroupBox.displayName = "GroupBox";

export default function Floor({ onStart }) {
	const { themeMode, initTheme } = useThemeStore();
	const THEME = useMemo(() => getTheme(themeMode), [themeMode]);
	const floorStyles = useMemo(() => createFloorStyles(THEME), [THEME]);
	const authFetch = useAuthFetch();

	const [activeCategory, setActiveCategory] = useState(null);
	const [orders, setOrders] = useState([]);
	const [loading, setLoading] = useState(false);
	const [restaurantId, setRestaurantId] = useState(null);

	useEffect(() => {
		initTheme();
		loadRestaurantId();
	}, [initTheme]);

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
				setOrders(data || []);

				// 📦 Log des commandes reçues
				console.log(`📦 ${data.length} commandes chargées`);
				data.forEach((order, idx) => {
					console.log(`\n📋 Commande ${idx + 1}/${data.length}:`);
					console.log(`  - ID: ${order._id}`);
					console.log(`  - Table: ${order.tableId?.number || "?"}`);
					console.log(`  - Serveur: ${order.serverId?.name || "Non assigné"}`);
					console.log(`  - Statut commande: ${order.status}`);
					console.log(`  - Items (${order.items.length}):`);
					order.items.forEach((item, itemIdx) => {
						console.log(`    ${itemIdx + 1}. ${item.name} x${item.quantity}`);
						console.log(
							`       - Catégorie: ${item.category || "non définie"}`
						);
						console.log(
							`       - Statut item: ${item.itemStatus || "non défini"}`
						);
						if (item.startTime) {
							const elapsed = Math.floor(
								(Date.now() - new Date(item.startTime)) / 1000
							);
							console.log(`       - En préparation depuis: ${elapsed}s`);
						}
					});
				});
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
			const interval = setInterval(fetchOrders, 30000);
			return () => clearInterval(interval);
		}
	}, [restaurantId, fetchOrders]);

	// Extraire tous les items avec métadonnées
	const allItems = useMemo(() => {
		return orders.flatMap((order) =>
			order.items.map((item) => ({
				...item,
				orderId: order._id,
				tableNumber: order.tableId?.number || "?",
				serverName: order.serverId?.name || "Non assigné",
			}))
		);
	}, [orders]);

	// Compter items par catégorie
	const getCategoryCount = useCallback(
		(category) => {
			return allItems.filter((item) => item.category === category).length;
		},
		[allItems]
	);

	// Items filtrés par catégorie active
	const filteredItems = useMemo(() => {
		if (!activeCategory) return [];
		return allItems
			.filter((item) => item.category === activeCategory)
			.sort(
				(a, b) =>
					new Date(a.startTime || a.createdAt) -
					new Date(b.startTime || b.createdAt)
			);
	}, [allItems, activeCategory]);

	// Gérer changement de catégorie
	const handleCategoryPress = useCallback((category) => {
		setActiveCategory((prev) => (prev === category ? null : category));
	}, []);

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
					const result = await response.json();
					console.log(`\n🔄 Mise à jour statut item:`);
					console.log(`  - Commande: ${orderId}`);
					console.log(`  - Item: ${result.item?.name || itemId}`);
					console.log(`  - Nouveau statut: ${newStatus}`);
					if (result.item?.startTime) {
						console.log(
							`  - Timer démarré à: ${new Date(result.item.startTime).toLocaleTimeString()}`
						);
					}
					if (result.item?.endTime) {
						const duration = Math.floor(
							(new Date(result.item.endTime) -
								new Date(result.item.startTime)) /
								1000
						);
						console.log(`  - Durée totale: ${duration}s`);
					}
					await fetchOrders();
				}
			} catch (error) {
				console.error("Erreur mise à jour statut:", error);
			}
		},
		[authFetch, fetchOrders]
	);

	return (
		<View style={floorStyles.container}>
			{/* Background ambient effects */}
			<View style={StyleSheet.absoluteFill} pointerEvents="none">
				<LinearGradient
					colors={["rgba(245, 158, 11, 0.05)", "transparent"]}
					style={floorStyles.ambientGlow1}
				/>
				<LinearGradient
					colors={["rgba(14, 165, 233, 0.04)", "transparent"]}
					style={floorStyles.ambientGlow2}
				/>
			</View>

			{/* Container principal */}
			<View style={floorStyles.mainContainer}>
				{/* Sidebar Premium */}
				<View style={floorStyles.sidebar}>
					{/* Header Sidebar */}
					<View style={floorStyles.sidebarHeader}>
						<LinearGradient
							colors={["rgba(245, 158, 11, 0.15)", "rgba(245, 158, 11, 0.05)"]}
							style={floorStyles.headerIconBg}
						>
							<Ionicons
								name="restaurant-outline"
								size={24}
								color={THEME.colors.primary.amber}
							/>
						</LinearGradient>
						<Text style={floorStyles.headerTitle}>Plan de salle</Text>
					</View>

					<ScrollView
						showsVerticalScrollIndicator={false}
						contentContainerStyle={floorStyles.sidebarContent}
					>
						{/* Cuisine Section */}
						<SectionHeader
							icon="flame-outline"
							label="Cuisine"
							gradientColors={[
								"rgba(239, 68, 68, 0.15)",
								"rgba(239, 68, 68, 0.05)",
							]}
							floorStyles={floorStyles}
							THEME={THEME}
						/>
						<GroupBox floorStyles={floorStyles}>
							{/* Boissons */}
							<MenuItem
								icon="wine-outline"
								label="Boissons"
								count={getCategoryCount("boisson")}
								isActive={activeCategory === "boisson"}
								onPress={() => handleCategoryPress("boisson")}
								floorStyles={floorStyles}
								THEME={THEME}
							/>
							{activeCategory === "boisson" && (
								<View style={floorStyles.itemsSection}>
									{loading ? (
										<View style={floorStyles.loadingContainer}>
											<ActivityIndicator
												size="small"
												color={THEME.colors.primary.amber}
											/>
										</View>
									) : filteredItems.length === 0 ? (
										<View style={floorStyles.emptyContainer}>
											<Ionicons
												name="checkmark-circle-outline"
												size={24}
												color={THEME.colors.text.muted}
											/>
											<Text style={floorStyles.emptyText}>
												Aucune boisson en cours
											</Text>
										</View>
									) : (
										filteredItems.map((item, index) => (
											<View
												key={`${item.orderId}-${item._id || index}`}
												style={floorStyles.itemWrapper}
											>
												<ItemRow
													item={item}
													onUpdateStatus={handleUpdateItemStatus}
													THEME={THEME}
												/>
											</View>
										))
									)}
								</View>
							)}

							{/* Entrées */}
							<MenuItem
								icon="nutrition-outline"
								label="Entrées"
								count={getCategoryCount("entree")}
								isActive={activeCategory === "entree"}
								onPress={() => handleCategoryPress("entree")}
								floorStyles={floorStyles}
								THEME={THEME}
							/>
							{activeCategory === "entree" && (
								<View style={floorStyles.itemsSection}>
									{loading ? (
										<View style={floorStyles.loadingContainer}>
											<ActivityIndicator
												size="small"
												color={THEME.colors.primary.amber}
											/>
										</View>
									) : filteredItems.length === 0 ? (
										<View style={floorStyles.emptyContainer}>
											<Ionicons
												name="checkmark-circle-outline"
												size={24}
												color={THEME.colors.text.muted}
											/>
											<Text style={floorStyles.emptyText}>
												Aucune entrée en cours
											</Text>
										</View>
									) : (
										filteredItems.map((item, index) => (
											<View
												key={`${item.orderId}-${item._id || index}`}
												style={floorStyles.itemWrapper}
											>
												<ItemRow
													item={item}
													onUpdateStatus={handleUpdateItemStatus}
													THEME={THEME}
												/>
											</View>
										))
									)}
								</View>
							)}

							{/* Plats */}
							<MenuItem
								icon="restaurant-outline"
								label="Plats"
								count={getCategoryCount("plat")}
								isActive={activeCategory === "plat"}
								onPress={() => handleCategoryPress("plat")}
								floorStyles={floorStyles}
								THEME={THEME}
							/>
							{activeCategory === "plat" && (
								<View style={floorStyles.itemsSection}>
									{loading ? (
										<View style={floorStyles.loadingContainer}>
											<ActivityIndicator
												size="small"
												color={THEME.colors.primary.amber}
											/>
										</View>
									) : filteredItems.length === 0 ? (
										<View style={floorStyles.emptyContainer}>
											<Ionicons
												name="checkmark-circle-outline"
												size={24}
												color={THEME.colors.text.muted}
											/>
											<Text style={floorStyles.emptyText}>
												Aucun plat en cours
											</Text>
										</View>
									) : (
										filteredItems.map((item, index) => (
											<View
												key={`${item.orderId}-${item._id || index}`}
												style={floorStyles.itemWrapper}
											>
												<ItemRow
													item={item}
													onUpdateStatus={handleUpdateItemStatus}
													THEME={THEME}
												/>
											</View>
										))
									)}
								</View>
							)}

							{/* Desserts */}
							<MenuItem
								icon="ice-cream-outline"
								label="Desserts"
								count={getCategoryCount("dessert")}
								isActive={activeCategory === "dessert"}
								onPress={() => handleCategoryPress("dessert")}
								isLast
								floorStyles={floorStyles}
								THEME={THEME}
							/>
							{activeCategory === "dessert" && (
								<View style={floorStyles.itemsSection}>
									{loading ? (
										<View style={floorStyles.loadingContainer}>
											<ActivityIndicator
												size="small"
												color={THEME.colors.primary.amber}
											/>
										</View>
									) : filteredItems.length === 0 ? (
										<View style={floorStyles.emptyContainer}>
											<Ionicons
												name="checkmark-circle-outline"
												size={24}
												color={THEME.colors.text.muted}
											/>
											<Text style={floorStyles.emptyText}>
												Aucun dessert en cours
											</Text>
										</View>
									) : (
										filteredItems.map((item, index) => (
											<View
												key={`${item.orderId}-${item._id || index}`}
												style={floorStyles.itemWrapper}
											>
												<ItemRow
													item={item}
													onUpdateStatus={handleUpdateItemStatus}
													THEME={THEME}
												/>
											</View>
										))
									)}
								</View>
							)}
						</GroupBox>
						{/* Tables Section */}
						<SectionHeader
							icon="grid-outline"
							label="Tables"
							gradientColors={[
								"rgba(14, 165, 233, 0.15)",
								"rgba(14, 165, 233, 0.05)",
							]}
							floorStyles={floorStyles}
							THEME={THEME}
						/>
						<GroupBox floorStyles={floorStyles}>
							<MenuItem
								icon="ellipse-outline"
								label="1ère rangée"
								count={0}
								floorStyles={floorStyles}
								THEME={THEME}
							/>
							<MenuItem
								icon="ellipse-outline"
								label="2ème rangée"
								count={0}
								floorStyles={floorStyles}
								THEME={THEME}
							/>
							<MenuItem
								icon="ellipse-outline"
								label="3ème rangée"
								count={0}
								isLast
								floorStyles={floorStyles}
								THEME={THEME}
							/>
						</GroupBox>

						{/* Caisse Section */}
						<SectionHeader
							icon="card-outline"
							label="Caisse"
							gradientColors={[
								"rgba(16, 185, 129, 0.15)",
								"rgba(16, 185, 129, 0.05)",
							]}
							floorStyles={floorStyles}
							THEME={THEME}
						/>
						<GroupBox floorStyles={floorStyles}>
							<MenuItem
								icon="time-outline"
								label="En cours"
								count={0}
								floorStyles={floorStyles}
								THEME={THEME}
							/>
							<MenuItem
								icon="checkmark-circle-outline"
								label="Payée"
								count={0}
								isLast
								floorStyles={floorStyles}
								THEME={THEME}
							/>
						</GroupBox>
					</ScrollView>
				</View>

				{/* Séparateur Premium */}
				<LinearGradient
					colors={["transparent", THEME.colors.border.subtle, "transparent"]}
					style={floorStyles.verticalSeparator}
				/>

				{/* Dashboard Zone */}
				<View style={floorStyles.dashboardZone}>
					<Dashboard />
				</View>
			</View>
		</View>
	);
}

// ─────────────── Styles Premium ───────────────
const createFloorStyles = (THEME) =>
	StyleSheet.create({
		container: {
			flex: 1,
			backgroundColor: THEME.colors.background.dark,
		},
		ambientGlow1: {
			position: "absolute",
			top: -150,
			left: -100,
			width: 400,
			height: 400,
			borderRadius: 200,
			opacity: 0.6,
		},
		ambientGlow2: {
			position: "absolute",
			bottom: -100,
			right: -50,
			width: 300,
			height: 300,
			borderRadius: 150,
			opacity: 0.6,
		},
		mainContainer: {
			flex: 1,
			flexDirection: "row",
		},
		sidebar: {
			width: 380,
			backgroundColor: THEME.colors.background.card,
			borderRightWidth: 1,
			borderRightColor: THEME.colors.border.subtle,
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
		sidebarContent: {
			padding: THEME.spacing.lg,
		},
		sectionHeader: {
			flexDirection: "row",
			alignItems: "center",
			paddingVertical: THEME.spacing.md,
			paddingHorizontal: THEME.spacing.lg,
			borderRadius: THEME.radius.lg,
			marginBottom: THEME.spacing.md,
			marginTop: THEME.spacing.md,
		},
		sectionTitle: {
			fontSize: THEME.typography.sizes.md,
			fontWeight: THEME.typography.weights.semibold,
			color: THEME.colors.text.primary,
			marginLeft: THEME.spacing.md,
		},
		groupBox: {
			backgroundColor: THEME.colors.background.elevated,
			borderRadius: THEME.radius.xl,
			borderWidth: 1,
			borderColor: THEME.colors.border.subtle,
			overflow: "hidden",
			marginBottom: THEME.spacing.lg,
		},
		menuItem: {
			flexDirection: "row",
			alignItems: "center",
			paddingVertical: THEME.spacing.md + 4,
			paddingHorizontal: THEME.spacing.lg,
		},
		menuItemBorder: {
			borderBottomWidth: 1,
			borderBottomColor: THEME.colors.border.subtle,
		},
		menuItemActive: {
			backgroundColor: "rgba(245, 158, 11, 0.1)",
		},
		menuItemText: {
			flex: 1,
			fontSize: THEME.typography.sizes.md,
			fontWeight: THEME.typography.weights.medium,
			color: THEME.colors.text.secondary,
		},
		menuItemTextActive: {
			color: THEME.colors.primary.amber,
			fontWeight: THEME.typography.weights.semibold,
		},
		countBadge: {
			backgroundColor: THEME.colors.primary.amber,
			borderRadius: 12,
			minWidth: 24,
			height: 24,
			alignItems: "center",
			justifyContent: "center",
			paddingHorizontal: 8,
		},
		countBadgeText: {
			fontSize: 12,
			fontWeight: THEME.typography.weights.bold,
			color: "#FFF",
		},
		itemsSection: {
			paddingTop: THEME.spacing.sm,
			paddingHorizontal: THEME.spacing.md,
			paddingBottom: THEME.spacing.md,
			backgroundColor: "rgba(245, 158, 11, 0.05)",
			borderBottomWidth: 1,
			borderBottomColor: THEME.colors.border.subtle,
		},
		itemWrapper: {
			marginBottom: THEME.spacing.sm,
		},
		loadingContainer: {
			paddingVertical: THEME.spacing.md,
			alignItems: "center",
		},
		emptyContainer: {
			paddingVertical: THEME.spacing.md,
			alignItems: "center",
			gap: THEME.spacing.xs,
		},
		emptyText: {
			fontSize: THEME.typography.sizes.sm,
			color: THEME.colors.text.muted,
		},
		verticalSeparator: {
			width: 1,
			height: "100%",
		},
		dashboardZone: {
			flex: 1,
			backgroundColor: THEME.colors.background.dark,
		},
	});

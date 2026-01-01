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
import useSocket from "../../hooks/useSocket";

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
	const { socket, on, off, isConnected, connect } = useSocket();
	const [socketReady, setSocketReady] = useState(false);

	// Connecter le socket au montage
	useEffect(() => {
		console.log("📦 [STOCK] Initialisation socket...");
		connect();
	}, [connect]);

	// Vérifier la connexion socket périodiquement (moins fréquemment)
	useEffect(() => {
		const checkSocket = setInterval(() => {
			const connected = isConnected();
			if (connected !== socketReady) {
				console.log("📦 [STOCK] Socket status changé:", connected);
				setSocketReady(connected);
			}
		}, 1000);

		return () => clearInterval(checkSocket);
	}, [isConnected, socketReady]);

	const [activeCategory, setActiveCategory] = useState(null);
	const [orders, setOrders] = useState([]);
	const [loading, setLoading] = useState(false);
	const [restaurantId, setRestaurantId] = useState(null);

	// 📦 Stock bas
	const [lowStockProducts, setLowStockProducts] = useState({});
	const [stockExpanded, setStockExpanded] = useState(null); // catégorie stock ouverte
	const [stockLoading, setStockLoading] = useState(false);

	useEffect(() => {
		initTheme();
		loadRestaurantId();
	}, [initTheme]);

	const loadRestaurantId = async () => {
		try {
			const id = await AsyncStorage.getItem("restaurantId");
			console.log("📦 [STOCK] RestaurantId chargé:", id);
			if (id) {
				setRestaurantId(id);
			}
		} catch (error) {
			console.error("❌ [STOCK] Erreur chargement restaurantId:", error);
		}
	};

	// 📦 Charger les produits à stock bas
	const fetchLowStock = useCallback(async () => {
		if (!restaurantId) return;

		try {
			setStockLoading(true);
			const url = `/products/low-stock/${restaurantId}`;

			const result = await authFetch(url, { method: "GET" });
			const products = result?.lowStockProducts || {};
			const total = result?.total || 0;

			console.log("📦 [STOCK] Stocks bas récupérés:", total, "produits");

			setLowStockProducts(products);
		} catch (error) {
			console.error("❌ [STOCK] Erreur chargement stocks:", error);
		} finally {
			setStockLoading(false);
		}
	}, [restaurantId, authFetch]);

	// Charger les commandes
	const fetchOrders = useCallback(async () => {
		if (!restaurantId) {
			return;
		}

		try {
			setLoading(true);
			const url = `/orders?restaurantId=${restaurantId}`;

			const result = await authFetch(url, { method: "GET" });

			const data = result.orders || result || [];
			setOrders(data);
		} catch (error) {
		} finally {
			setLoading(false);
		}
	}, [restaurantId, authFetch]);

	// WebSocket listeners pour updates instantanées
	useEffect(() => {
		if (!restaurantId || !socketReady) return;

		console.log("📦 [SOCKET] Attachement listeners orders");

		const handleOrderCreated = (order) => {
			if (order.restaurantId === restaurantId) {
				setOrders((prev) => [...prev, order]);
			}
		};

		const handleOrderUpdated = (order) => {
			if (order.restaurantId === restaurantId) {
				setOrders((prev) => prev.map((o) => (o._id === order._id ? order : o)));
			}
		};

		const handleOrderItemStatusUpdated = ({ orderId, itemId, newStatus }) => {
			setOrders((prev) =>
				prev.map((order) =>
					order._id === orderId
						? {
								...order,
								items: order.items.map((item) =>
									item._id === itemId
										? { ...item, itemStatus: newStatus }
										: item
								),
							}
						: order
				)
			);
		};

		on("order:created", handleOrderCreated);
		on("order:updated", handleOrderUpdated);
		on("order:item:status:updated", handleOrderItemStatusUpdated);

		return () => {
			off("order:created", handleOrderCreated);
			off("order:updated", handleOrderUpdated);
			off("order:item:status:updated", handleOrderItemStatusUpdated);
		};
	}, [restaurantId, socketReady, on, off]);

	// 📦 WebSocket listener pour mise à jour stock
	useEffect(() => {
		if (!restaurantId || !socketReady) return;

		const handleStockUpdated = (data) => {
			console.log("📦 [STOCK] WebSocket product:stock:updated");
			fetchLowStock();
		};

		const handleProductUpdated = (data) => {
			console.log(
				"📦 [STOCK] WebSocket product:updated - ",
				data.name,
				"quantifiable:",
				data.quantifiable
			);
			if (data.quantifiable) {
				fetchLowStock();
			}
		};

		console.log("📦 [STOCK] ✅ Listeners WebSocket attachés");
		on("product:stock:updated", handleStockUpdated);
		on("product:updated", handleProductUpdated);

		return () => {
			off("product:stock:updated", handleStockUpdated);
			off("product:updated", handleProductUpdated);
		};
	}, [restaurantId, socketReady, fetchLowStock, on, off]);

	useEffect(() => {
		if (restaurantId) {
			fetchOrders();
			fetchLowStock(); // 📦 Charger aussi les stocks
			// Réduire l'intervalle puisque WebSocket gère les updates
			const interval = setInterval(fetchOrders, 60000); // 1 min au lieu de 30s
			return () => clearInterval(interval);
		}
	}, [restaurantId, fetchOrders, fetchLowStock]);

	// Extraire tous les items avec métadonnées (exclure "autre")
	const allItems = useMemo(() => {
		const items = orders
			.flatMap((order) =>
				order.items.map((item) => ({
					...item,
					orderId: order._id,
					tableNumber: order.tableId?.number || "?",
					serverName:
						order.serverId?.name ||
						(order.origin === "client" ? "Client" : "Non assigné"),
				}))
			)
			.filter((item) => item.category && item.category !== "autre");
		return items;
	}, [orders]);

	// Compter items par catégorie (exclure servis/annulés)
	const getCategoryCount = useCallback(
		(category) => {
			return allItems.filter(
				(item) =>
					item.category === category &&
					item.itemStatus !== "served" &&
					item.itemStatus !== "cancelled"
			).length;
		},
		[allItems]
	);

	// 📦 Compter produits à stock bas par catégorie
	const getLowStockCount = useCallback(
		(category) => {
			return (lowStockProducts[category] || []).length;
		},
		[lowStockProducts]
	);

	// 📦 Total produits à stock bas
	const totalLowStock = useMemo(() => {
		return Object.values(lowStockProducts).reduce(
			(sum, arr) => sum + arr.length,
			0
		);
	}, [lowStockProducts]);

	// 📦 Handler pour ouvrir/fermer catégorie stock
	const handleStockCategoryPress = useCallback((category) => {
		setStockExpanded((prev) => (prev === category ? null : category));
	}, []);

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

	// Mettre à jour le statut d'un item (optimiste + WebSocket)
	const handleUpdateItemStatus = useCallback(
		async (orderId, itemId, newStatus) => {
			// Update optimiste immédiat
			setOrders((prev) =>
				prev.map((order) =>
					order._id === orderId
						? {
								...order,
								items: order.items.map((item) =>
									item._id === itemId
										? { ...item, itemStatus: newStatus }
										: item
								),
							}
						: order
				)
			);

			try {
				await authFetch(`/orders/${orderId}/items/${itemId}/status`, {
					method: "PUT",
					body: { status: newStatus },
				});
			} catch (error) {
				// Rollback en cas d'erreur
				await fetchOrders();
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

						{/* 📦 Stock Section */}
						<SectionHeader
							icon="cube-outline"
							label="Stock"
							gradientColors={[
								"rgba(239, 68, 68, 0.15)",
								"rgba(239, 68, 68, 0.05)",
							]}
							floorStyles={floorStyles}
							THEME={THEME}
						/>
						<GroupBox floorStyles={floorStyles}>
							{totalLowStock === 0 ? (
								<View style={floorStyles.emptyStockContainer}>
									<Ionicons
										name="checkmark-circle-outline"
										size={20}
										color={THEME.colors.status.success}
									/>
									<Text style={floorStyles.emptyStockText}>Stocks OK</Text>
								</View>
							) : (
								<>
									{/* Boissons en stock bas */}
									<MenuItem
										icon="wine-outline"
										label="Boissons"
										count={getLowStockCount("boisson")}
										isActive={stockExpanded === "boisson"}
										onPress={() => handleStockCategoryPress("boisson")}
										floorStyles={floorStyles}
										THEME={THEME}
									/>
									{stockExpanded === "boisson" && (
										<View style={floorStyles.stockItemsSection}>
											{stockLoading ? (
												<ActivityIndicator
													size="small"
													color={THEME.colors.primary.amber}
												/>
											) : (lowStockProducts.boisson || []).length === 0 ? (
												<Text style={floorStyles.stockOkText}>✓ Stock OK</Text>
											) : (
												(lowStockProducts.boisson || []).map((product) => (
													<View
														key={product._id}
														style={[
															floorStyles.stockItem,
															product.quantity === 0 &&
																floorStyles.stockItemOutOfStock,
														]}
													>
														<Text style={floorStyles.stockItemName}>
															{product.name}
														</Text>
														<View
															style={[
																floorStyles.stockBadge,
																product.quantity === 0
																	? floorStyles.stockBadgeOut
																	: floorStyles.stockBadgeLow,
															]}
														>
															<Text style={floorStyles.stockBadgeText}>
																{product.quantity === 0
																	? "Épuisé"
																	: product.quantity}
															</Text>
														</View>
													</View>
												))
											)}
										</View>
									)}

									{/* Plats en stock bas */}
									<MenuItem
										icon="restaurant-outline"
										label="Plats"
										count={getLowStockCount("plat")}
										isActive={stockExpanded === "plat"}
										onPress={() => handleStockCategoryPress("plat")}
										floorStyles={floorStyles}
										THEME={THEME}
									/>
									{stockExpanded === "plat" && (
										<View style={floorStyles.stockItemsSection}>
											{stockLoading ? (
												<ActivityIndicator
													size="small"
													color={THEME.colors.primary.amber}
												/>
											) : (lowStockProducts.plat || []).length === 0 ? (
												<Text style={floorStyles.stockOkText}>✓ Stock OK</Text>
											) : (
												(lowStockProducts.plat || []).map((product) => (
													<View
														key={product._id}
														style={[
															floorStyles.stockItem,
															product.quantity === 0 &&
																floorStyles.stockItemOutOfStock,
														]}
													>
														<Text style={floorStyles.stockItemName}>
															{product.name}
														</Text>
														<View
															style={[
																floorStyles.stockBadge,
																product.quantity === 0
																	? floorStyles.stockBadgeOut
																	: floorStyles.stockBadgeLow,
															]}
														>
															<Text style={floorStyles.stockBadgeText}>
																{product.quantity === 0
																	? "Épuisé"
																	: product.quantity}
															</Text>
														</View>
													</View>
												))
											)}
										</View>
									)}

									{/* Desserts en stock bas */}
									<MenuItem
										icon="ice-cream-outline"
										label="Desserts"
										count={getLowStockCount("dessert")}
										isActive={stockExpanded === "dessert"}
										onPress={() => handleStockCategoryPress("dessert")}
										isLast
										floorStyles={floorStyles}
										THEME={THEME}
									/>
									{stockExpanded === "dessert" && (
										<View style={floorStyles.stockItemsSection}>
											{stockLoading ? (
												<ActivityIndicator
													size="small"
													color={THEME.colors.primary.amber}
												/>
											) : (lowStockProducts.dessert || []).length === 0 ? (
												<Text style={floorStyles.stockOkText}>✓ Stock OK</Text>
											) : (
												(lowStockProducts.dessert || []).map((product) => (
													<View
														key={product._id}
														style={[
															floorStyles.stockItem,
															product.quantity === 0 &&
																floorStyles.stockItemOutOfStock,
														]}
													>
														<Text style={floorStyles.stockItemName}>
															{product.name}
														</Text>
														<View
															style={[
																floorStyles.stockBadge,
																product.quantity === 0
																	? floorStyles.stockBadgeOut
																	: floorStyles.stockBadgeLow,
															]}
														>
															<Text style={floorStyles.stockBadgeText}>
																{product.quantity === 0
																	? "Épuisé"
																	: product.quantity}
															</Text>
														</View>
													</View>
												))
											)}
										</View>
									)}
								</>
							)}
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
		// 📦 Stock Section Styles
		emptyStockContainer: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "center",
			paddingVertical: THEME.spacing.lg,
			gap: THEME.spacing.sm,
		},
		emptyStockText: {
			fontSize: THEME.typography.sizes.md,
			fontWeight: THEME.typography.weights.medium,
			color: THEME.colors.status.success,
		},
		stockItemsSection: {
			paddingVertical: THEME.spacing.sm,
			paddingHorizontal: THEME.spacing.md,
			backgroundColor: "rgba(239, 68, 68, 0.05)",
			borderBottomWidth: 1,
			borderBottomColor: THEME.colors.border.subtle,
		},
		stockOkText: {
			fontSize: THEME.typography.sizes.sm,
			color: THEME.colors.status.success,
			textAlign: "center",
			paddingVertical: THEME.spacing.sm,
		},
		stockItem: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "space-between",
			paddingVertical: THEME.spacing.sm,
			paddingHorizontal: THEME.spacing.sm,
			backgroundColor: THEME.colors.background.card,
			borderRadius: THEME.radius.md,
			marginBottom: THEME.spacing.xs,
		},
		stockItemOutOfStock: {
			backgroundColor: "rgba(239, 68, 68, 0.1)",
			borderWidth: 1,
			borderColor: "rgba(239, 68, 68, 0.3)",
		},
		stockItemName: {
			fontSize: THEME.typography.sizes.sm,
			fontWeight: THEME.typography.weights.medium,
			color: THEME.colors.text.primary,
			flex: 1,
		},
		stockBadge: {
			borderRadius: THEME.radius.sm,
			paddingHorizontal: THEME.spacing.sm,
			paddingVertical: 2,
			minWidth: 40,
			alignItems: "center",
		},
		stockBadgeLow: {
			backgroundColor: "rgba(245, 158, 11, 0.2)",
		},
		stockBadgeOut: {
			backgroundColor: "rgba(239, 68, 68, 0.3)",
		},
		stockBadgeText: {
			fontSize: THEME.typography.sizes.xs,
			fontWeight: THEME.typography.weights.bold,
			color: THEME.colors.text.primary,
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

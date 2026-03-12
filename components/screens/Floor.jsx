/**
 * Floor.jsx - Écran Plan de Salle Premium
 * Design spatial avec sidebar glassmorphism et gestion des items cuisine
 * 🎯 Adaptation dynamique selon le Feature Level (plan salle, stocks, etc.)
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
	Alert,
	Dimensions,
} from "react-native";

const IS_PHONE = Dimensions.get("window").width < 600;
const SIDEBAR_W = IS_PHONE ? 230 : 380;
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Dashboard from "./Dashboard";
import { useFeatureLevel } from "../../src/stores/useFeatureLevelStore";
import ItemRow from "../floor/ItemRow";
import FloorPlanModal from "../floor/FloorPlanModal";
import { useAuthFetch } from "../../hooks/useAuthFetch";
import AsyncStorage from "@react-native-async-storage/async-storage";
import useThemeStore from "../../src/stores/useThemeStore";
import useReservationStore from "../../src/stores/useReservationStore";
import useUserStore from "../../src/stores/useUserStore";
import { useTheme } from "../../hooks/useTheme";
import useSocket from "../../hooks/useSocket";
import { ReceiptModal } from "../receipt";

// ─────────────── Menu Item Component ───────────────
const MenuItem = React.memo(
	({
		icon,
		label,
		isLast,
		count,
		value,
		isActive,
		onPress,
		floorStyles,
		THEME,
	}) => {
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
					{value !== undefined && (
						<Text style={floorStyles.valueBadge}>{value.toFixed(2)}€</Text>
					)}
				</TouchableOpacity>
			</Animated.View>
		);
	},
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
	),
);

SectionHeader.displayName = "SectionHeader";

// ─────────────── Group Box Component ───────────────
const GroupBox = React.memo(({ children, floorStyles }) => (
	<View style={floorStyles.groupBox}>{children}</View>
));

GroupBox.displayName = "GroupBox";

export default function Floor({ onStart }) {
	// 🎯 Feature Levels : Récupérer les fonctionnalités disponibles
	const { hasGestionStocks, hasPlanSalle, hasSalleCuisine, isMinimum } =
		useFeatureLevel();

	const { themeMode, initTheme } = useThemeStore();
	const THEME = useTheme(); // Utilise le hook avec multiplicateur de police
	const floorStyles = useMemo(() => createFloorStyles(THEME), [THEME]);
	const authFetch = useAuthFetch();
	const { socket, on, off, isConnected, connect } = useSocket();
	const [socketReady, setSocketReady] = useState(false);

	// ⭐ Récupérer les réservations du store pour la Caisse
	const reservations = useReservationStore((state) => state.reservations);
	const updateReservation = useReservationStore(
		(state) => state.updateReservation,
	);

	// 🔒 Récupérer le rôle et l'ID du serveur connecté
	const userId = useUserStore((state) => state.userId);
	const userRole = useUserStore((state) => state.role);
	const isManager = useUserStore((state) => state.isManager);
	const isServerOnly = userRole === "server" && !isManager;

	// 🔒 Tables des réservations ouvertes du serveur connecté
	const myOpenTableIds = useMemo(() => {
		if (!isServerOnly) return null; // admin/manager → pas de filtre
		const today = new Date();
		const todayStart = new Date(
			today.getFullYear(),
			today.getMonth(),
			today.getDate(),
		);
		const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

		const myResas = reservations.filter((r) => {
			const serverId = String(r.serverId?._id || r.serverId || "");
			const d = new Date(r.reservationDate || r.createdAt);
			return (
				serverId === userId &&
				r.status === "ouverte" &&
				d >= todayStart &&
				d < todayEnd
			);
		});

		const tableIds = myResas
			.map((r) => String(r.tableId?._id || r.tableId || ""))
			.filter(Boolean);

		return new Set(tableIds);
	}, [isServerOnly, userId, reservations]);

	// Helper : vérifie si une commande appartient aux tables ouvertes du serveur
	const isMyOrder = useCallback(
		(order) => {
			if (!myOpenTableIds) return true; // admin/manager voit tout
			const tableId = String(order.tableId?._id || order.tableId || "");
			return myOpenTableIds.has(tableId);
		},
		[myOpenTableIds],
	);

	// Helper : vérifie si une réservation appartient au serveur connecté
	const isMyReservation = useCallback(
		(reservation) => {
			if (!isServerOnly) return true; // admin/manager voit tout
			const serverId = String(
				reservation.serverId?._id || reservation.serverId || "",
			);
			return serverId === userId;
		},
		[isServerOnly, userId],
	);

	// ⭐ Stats Caisse dynamiques + listes de réservations (jour actuel uniquement)
	const caisseStats = useMemo(() => {
		const today = new Date();
		const todayStart = new Date(
			today.getFullYear(),
			today.getMonth(),
			today.getDate(),
		);
		const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
		const isToday = (r) => {
			const d = new Date(r.reservationDate || r.createdAt);
			return d >= todayStart && d < todayEnd;
		};

		const enCours = reservations.filter(
			(r) => r.status !== "terminée" && isToday(r) && isMyReservation(r),
		);
		const payees = reservations.filter(
			(r) => r.status === "terminée" && isToday(r) && isMyReservation(r),
		);

		return {
			enCoursCount: enCours.length,
			enCoursMontant: enCours.reduce((sum, r) => sum + (r.totalAmount || 0), 0),
			enCoursList: enCours,
			payeesCount: payees.length,
			payeesMontant: payees.reduce((sum, r) => sum + (r.totalAmount || 0), 0),
			payeesList: payees,
		};
	}, [reservations, isMyReservation]);

	// Connecter le socket au montage
	useEffect(() => {
		connect();
	}, [connect]);

	// Vérifier la connexion socket périodiquement (moins fréquemment)
	useEffect(() => {
		const checkSocket = setInterval(() => {
			const connected = isConnected();
			if (connected !== socketReady) {
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

	// 💰 Caisse - catégorie expandable
	const [caisseExpanded, setCaisseExpanded] = useState(null); // "enCours" ou "payees"
	const [receiptTargetCaisse, setReceiptTargetCaisse] = useState(null);

	// 🏗️ Floor Plan Modal
	const [showFloorPlan, setShowFloorPlan] = useState(false);
	const [activeRoom, setActiveRoom] = useState(1); // 1, 2 ou 3

	// 📱 Sidebar toggle (iPhone uniquement — masquée par défaut)
	const [sidebarVisible, setSidebarVisible] = useState(!IS_PHONE);
	const sidebarAnim = useRef(new Animated.Value(IS_PHONE ? -SIDEBAR_W : 0)).current;

	const toggleSidebar = useCallback(() => {
		const toValue = sidebarVisible ? -SIDEBAR_W : 0;
		Animated.timing(sidebarAnim, {
			toValue,
			duration: 260,
			useNativeDriver: true,
		}).start();
		setSidebarVisible((v) => !v);
	}, [sidebarVisible, sidebarAnim]);

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

		const handleSunnyGoemStatusUpdated = ({ orderId, itemId, newStatus }) => {
			setOrders((prev) =>
				prev.map((order) =>
					order._id === orderId
						? {
								...order,
								items: order.items.map((item) =>
									item._id === itemId
										? { ...item, itemStatus: newStatus }
										: item,
								),
							}
						: order,
				),
			);
		};

		on("order:created", handleOrderCreated);
		on("order:updated", handleOrderUpdated);
		on("order:item:status:updated", handleSunnyGoemStatusUpdated);

		return () => {
			off("order:created", handleOrderCreated);
			off("order:updated", handleOrderUpdated);
			off("order:item:status:updated", handleSunnyGoemStatusUpdated);
		};
	}, [restaurantId, socketReady, on, off]);

	// 📦 WebSocket listener pour mise à jour stock
	useEffect(() => {
		if (!restaurantId || !socketReady) return;

		const handleStockUpdated = (data) => {
			fetchLowStock();
		};

		const handleProductUpdated = (data) => {
			if (data.quantifiable) {
				fetchLowStock();
			}
		};

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
	// 🔒 Serveur : uniquement les items de SES commandes
	const allItems = useMemo(() => {
		const items = orders
			.filter(isMyOrder)
			.flatMap((order) =>
				order.items.map((item) => ({
					...item,
					orderId: order._id,
					tableNumber: order.tableId?.number || "?",
					serverName:
						order.serverId?.name ||
						(order.origin === "client" ? "Client" : "Non assigné"),
				})),
			)
			.filter((item) => item.category && item.category !== "autre");
		return items;
	}, [orders, isMyOrder]);

	// Compter items par catégorie (exclure servis/annulés)
	const getCategoryCount = useCallback(
		(category) => {
			return allItems.filter(
				(item) =>
					item.category === category &&
					item.itemStatus !== "served" &&
					item.itemStatus !== "cancelled",
			).length;
		},
		[allItems],
	);

	// 📦 Compter produits à stock bas par catégorie
	const getLowStockCount = useCallback(
		(category) => {
			return (lowStockProducts[category] || []).length;
		},
		[lowStockProducts],
	);

	// 📦 Total produits à stock bas
	const totalLowStock = useMemo(() => {
		return Object.values(lowStockProducts).reduce(
			(sum, arr) => sum + arr.length,
			0,
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
					new Date(b.startTime || b.createdAt),
			);
	}, [allItems, activeCategory]);

	// Gérer changement de catégorie
	const handleCategoryPress = useCallback((category) => {
		setActiveCategory((prev) => (prev === category ? null : category));
	}, []);

	// 💰 Caisse : marquer comme payé avec confirmation
	const handleCaisseMarkPaid = useCallback(
		(reservation) => {
			Alert.alert(
				"Confirmer le paiement",
				`Marquer ${reservation.clientName || "ce client"} comme payé ?`,
				[
					{ text: "Annuler", style: "cancel" },
					{
						text: "Confirmer",
						style: "default",
						onPress: async () => {
							try {
								const updated = await authFetch(
									`/reservations/${reservation._id}/payment`,
									{ method: "PUT", body: {} },
								);
								if (updated?._id) updateReservation(updated);
							} catch (e) {
								Alert.alert("Erreur", "Impossible de marquer comme payé.");
							}
						},
					},
				],
			);
		},
		[authFetch, updateReservation],
	);

	// 💰 Caisse : afficher le ticket de caisse
	const handleCaisseShowReceipt = useCallback(
		(reservation) => {
			const resaOrders = orders.filter(
				(o) =>
					(o.reservationId?._id?.toString() || o.reservationId?.toString()) ===
					reservation._id?.toString(),
			);
			const merged = {};
			resaOrders.forEach((order) => {
				(order.items || []).forEach((item) => {
					const key = item.productId?._id || item.productId || item.name;
					if (merged[key]) {
						merged[key].quantity += item.quantity || 1;
					} else {
						merged[key] = { ...item };
					}
				});
			});
			setReceiptTargetCaisse({
				reservation,
				items: Object.values(merged),
			});
		},
		[orders],
	);

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
										: item,
								),
							}
						: order,
				),
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
		[authFetch, fetchOrders],
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
			{/* Bouton hamburger — iPhone uniquement */}
			{IS_PHONE && !isMinimum && (
				<TouchableOpacity
					style={floorStyles.hamburgerBtn}
					onPress={toggleSidebar}
					activeOpacity={0.7}
				>
					<Ionicons
						name="menu"
						size={22}
						color={THEME.colors.text.primary}
					/>
				</TouchableOpacity>
			)}

			{/* Sidebar Premium : masquer pour niveau Minimum (foodtruck) */}
			{!isMinimum && (
				<Animated.View
					style={[
						floorStyles.sidebar,
						IS_PHONE && {
							position: "absolute",
							top: 0,
							bottom: 0,
							left: 0,
							zIndex: 50,
							transform: [{ translateX: sidebarAnim }],
						},
					]}
				>
					{/* Header Sidebar */}
					<View style={floorStyles.sidebarHeader}>
						<LinearGradient
							colors={[
								"rgba(245, 158, 11, 0.15)",
								"rgba(245, 158, 11, 0.05)",
							]}
							style={[floorStyles.headerIconBg, { width: 32, height: 32 }]}
						>
							<Ionicons
								name="restaurant-outline"
								size={15}
								color={THEME.colors.primary.amber}
							/>
						</LinearGradient>
						<Text style={floorStyles.headerTitle}>Gestion de salle</Text>
						{/* Bouton fermer sur iPhone */}
						{IS_PHONE && (
							<TouchableOpacity
								onPress={toggleSidebar}
								style={{ marginLeft: "auto", padding: 4 }}
							>
								<Ionicons name="close" size={20} color={THEME.colors.text.muted} />
							</TouchableOpacity>
						)}
					</View>
					<ScrollView
						showsVerticalScrollIndicator={false}
						contentContainerStyle={floorStyles.sidebarContent}
					>
							{/* Cuisine Section — restaurant classique uniquement */}
							{hasSalleCuisine && (
								<>
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
								</>
							)}

							{/* 🏢 Salles Section - Affiché seulement si Plan de Salle disponible */}
							{hasPlanSalle && (
								<>
									<SectionHeader
										icon="grid-outline"
										label="Salles"
										gradientColors={[
											"rgba(14, 165, 233, 0.15)",
											"rgba(14, 165, 233, 0.05)",
										]}
										floorStyles={floorStyles}
										THEME={THEME}
									/>
									<GroupBox floorStyles={floorStyles}>
										<MenuItem
											icon="restaurant-outline"
											label="Salle 1"
											count={0}
											onPress={() => {
												setActiveRoom(1);
												setShowFloorPlan(true);
											}}
											floorStyles={floorStyles}
											THEME={THEME}
										/>
										<MenuItem
											icon="restaurant-outline"
											label="Salle 2"
											count={0}
											onPress={() => {
												setActiveRoom(2);
												setShowFloorPlan(true);
											}}
											floorStyles={floorStyles}
											THEME={THEME}
										/>
										<MenuItem
											icon="restaurant-outline"
											label="Salle 3"
											count={0}
											isLast
											onPress={() => {
												setActiveRoom(3);
												setShowFloorPlan(true);
											}}
											floorStyles={floorStyles}
											THEME={THEME}
										/>
									</GroupBox>
								</>
							)}

							{/* 📦 Stock Section - Affiché seulement si Gestion Stocks disponible */}
							{hasGestionStocks && (
								<>
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
												<Text style={floorStyles.emptyStockText}>
													Stocks OK
												</Text>
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
														) : (lowStockProducts.boisson || []).length ===
														  0 ? (
															<Text style={floorStyles.stockOkText}>
																✓ Stock OK
															</Text>
														) : (
															(lowStockProducts.boisson || []).map(
																(product) => (
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
																),
															)
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
															<Text style={floorStyles.stockOkText}>
																✓ Stock OK
															</Text>
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
														) : (lowStockProducts.dessert || []).length ===
														  0 ? (
															<Text style={floorStyles.stockOkText}>
																✓ Stock OK
															</Text>
														) : (
															(lowStockProducts.dessert || []).map(
																(product) => (
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
																),
															)
														)}
													</View>
												)}
											</>
										)}
									</GroupBox>
								</>
							)}

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
									count={caisseStats.enCoursCount}
									value={caisseStats.enCoursMontant}
									isActive={caisseExpanded === "enCours"}
									onPress={() =>
										setCaisseExpanded(
											caisseExpanded === "enCours" ? null : "enCours",
										)
									}
									floorStyles={floorStyles}
									THEME={THEME}
								/>
								{caisseExpanded === "enCours" && (
									<View style={floorStyles.caisseDetailSection}>
										{caisseStats.enCoursList.length === 0 ? (
											<Text style={floorStyles.caisseDetailEmpty}>
												Aucune réservation en cours
											</Text>
										) : (
											caisseStats.enCoursList.map((r) => (
												<TouchableOpacity
													key={r._id}
													style={floorStyles.caisseDetailItem}
													onPress={() => handleCaisseMarkPaid(r)}
													activeOpacity={0.7}
												>
													<Text style={floorStyles.caisseDetailName}>
														{r.clientName || "Client"}
													</Text>
													<Text style={floorStyles.caisseDetailAmount}>
														{(r.totalAmount || 0).toFixed(2)}€
													</Text>
													<Ionicons
														name="card-outline"
														size={16}
														color="#F59E0B"
													/>
												</TouchableOpacity>
											))
										)}
									</View>
								)}
								<MenuItem
									icon="checkmark-circle-outline"
									label="Payée"
									count={caisseStats.payeesCount}
									value={caisseStats.payeesMontant}
									isActive={caisseExpanded === "payees"}
									onPress={() =>
										setCaisseExpanded(
											caisseExpanded === "payees" ? null : "payees",
										)
									}
									isLast={caisseExpanded !== "payees"}
									floorStyles={floorStyles}
									THEME={THEME}
								/>
								{caisseExpanded === "payees" && (
									<View style={floorStyles.caisseDetailSection}>
										{caisseStats.payeesList.length === 0 ? (
											<Text style={floorStyles.caisseDetailEmpty}>
												Aucune réservation payée
											</Text>
										) : (
											caisseStats.payeesList.map((r) => (
												<TouchableOpacity
													key={r._id}
													style={floorStyles.caisseDetailItem}
													onPress={() => handleCaisseShowReceipt(r)}
													activeOpacity={0.7}
												>
													<Text style={floorStyles.caisseDetailName}>
														{r.clientName || "Client"}
													</Text>
													<Text style={floorStyles.caisseDetailAmount}>
														{(r.totalAmount || 0).toFixed(2)}€
													</Text>
													<Ionicons
														name="receipt-outline"
														size={16}
														color="#10B981"
													/>
												</TouchableOpacity>
											))
										)}
									</View>
								)}
							</GroupBox>
					</ScrollView>
				</Animated.View>
				)}

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

			{/* 🏗️ Floor Plan Modal */}
			<FloorPlanModal
				visible={showFloorPlan}
				onClose={() => setShowFloorPlan(false)}
				restaurantId={restaurantId}
				roomNumber={activeRoom}
			/>
			{receiptTargetCaisse && (
				<ReceiptModal
					visible={!!receiptTargetCaisse}
					onClose={() => setReceiptTargetCaisse(null)}
					reservation={receiptTargetCaisse.reservation}
					items={receiptTargetCaisse.items}
					paymentMethod={
						receiptTargetCaisse.reservation.paymentMethod || "Autre"
					}
				/>
			)}
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
			width: SIDEBAR_W,
			backgroundColor: THEME.colors.background.card,
			borderRightWidth: 1,
			borderRightColor: THEME.colors.border.subtle,
		},
		sidebarOverlay: {
			position: "absolute",
			top: 0, left: 0, right: 0, bottom: 0,
			zIndex: 49,
			backgroundColor: "rgba(0,0,0,0.35)",
		},
		hamburgerBtn: {
			position: "absolute",
			top: 8,
			left: 8,
			zIndex: 60,
			backgroundColor: THEME.colors.background.elevated,
			borderRadius: 8,
			padding: 6,
			borderWidth: 1,
			borderColor: THEME.colors.border.subtle,
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
			fontSize: IS_PHONE ? 14 : 22,
			fontWeight: "800",
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
			fontSize: IS_PHONE ? 11 : THEME.typography.sizes.md,
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
			fontSize: IS_PHONE ? 11 : THEME.typography.sizes.md,
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
		valueBadge: {
			fontSize: 12,
			fontWeight: THEME.typography.weights.bold,
			color: THEME.colors.status.success,
			marginLeft: 8,
		},
		// 💰 Caisse Detail Styles
		caisseDetailSection: {
			paddingVertical: THEME.spacing.sm,
			paddingHorizontal: THEME.spacing.md,
			backgroundColor: "rgba(16, 185, 129, 0.05)",
			borderBottomWidth: 1,
			borderBottomColor: THEME.colors.border.subtle,
		},
		caisseDetailItem: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "space-between",
			paddingVertical: THEME.spacing.sm,
			paddingHorizontal: THEME.spacing.sm,
			backgroundColor: THEME.colors.background.card,
			borderRadius: THEME.radius.md,
			marginBottom: THEME.spacing.xs,
		},
		caisseDetailName: {
			fontSize: THEME.typography.sizes.sm,
			fontWeight: THEME.typography.weights.medium,
			color: THEME.colors.text.primary,
			flex: 1,
		},
		caisseDetailAmount: {
			fontSize: THEME.typography.sizes.sm,
			fontWeight: THEME.typography.weights.bold,
			color: THEME.colors.status.success,
			marginHorizontal: THEME.spacing.sm,
		},
		caisseDetailPers: {
			fontSize: THEME.typography.sizes.xs,
			fontWeight: THEME.typography.weights.medium,
			color: THEME.colors.text.muted,
			minWidth: 50,
			textAlign: "right",
		},
		caisseDetailEmpty: {
			fontSize: THEME.typography.sizes.sm,
			color: THEME.colors.text.muted,
			textAlign: "center",
			paddingVertical: THEME.spacing.sm,
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

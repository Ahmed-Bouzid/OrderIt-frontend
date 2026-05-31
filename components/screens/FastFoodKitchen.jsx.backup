/**
 * 🍔 FastFoodKitchen.jsx - Vue cuisine pour les fast-foods
 * Affiche toutes les réservations du jour avec leur statut de préparation (dishStatus).
 * Permet de marquer chaque commande comme préparée/servie.
 * ⚡ Mis à jour en temps réel via le store Zustand (WebSocket)
 */
import React, { useCallback, useMemo, useState, useEffect } from "react";
import {
	View,
	Text,
	StyleSheet,
	FlatList,
	TouchableOpacity,
	Alert,
	ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "../../hooks/useTheme";
import useReservationStore from "../../src/stores/useReservationStore";
import { useAuthFetch } from "../../hooks/useAuthFetch";
import { API_CONFIG } from "../../src/config/apiConfig";
import { ReceiptModal } from "../receipt";
import useKitchenOrdersStore from "../../src/stores/useKitchenOrdersStore"; // ✨ NOUVEAU
import useUserStore from "../../src/stores/useUserStore";
import useDeveloperStore from "../../src/stores/useDeveloperStore";
import PrintButton from "../PrintButton";
import { printReceiptTicket } from "../../services/thermalPrinter";

// ─────────────────────────────────────────────────────────────────
// Constantes
// ─────────────────────────────────────────────────────────────────
const DISH_STATUS_CONFIG = {
	"En attente": { color: "#F59E0B", icon: "time-outline", label: "En attente" },
	"En cours": {
		color: "#0EA5E9",
		icon: "restaurant-outline",
		label: "En cours",
	},
	Terminé: {
		color: "#10B981",
		icon: "checkmark-circle-outline",
		label: "Terminé",
	},
	Annulé: { color: "#F43F5E", icon: "close-circle-outline", label: "Annulé" },
};

// ─────────────────────────────────────────────────────────────────
// Composant carte réservation
// ─────────────────────────────────────────────────────────────────
const KitchenReservationCard = React.memo(
	({
		reservation,
		orders,
		isPaid,
		onMarkDone,
		onMarkPending,
		onMarkPaid,
		onShowReceipt,
		THEME,
	}) => {
		const isDone = reservation.dishStatus === "Terminé";
		const statusConfig =
			DISH_STATUS_CONFIG[reservation.dishStatus] ||
			DISH_STATUS_CONFIG["En attente"];

		const createdTime = reservation.reservationTime || "—";
		const amount =
			typeof reservation.totalAmount === "number"
				? `${reservation.totalAmount.toFixed(2)}€`
				: "0.00€";

		// Agréger tous les items de toutes les commandes liées
		const allItems = useMemo(() => {
			if (!orders || orders.length === 0) return [];
			const merged = {};
			orders.forEach((order) => {
				(order.items || []).forEach((item) => {
					const key = item.name;
					if (merged[key]) {
						merged[key].quantity += item.quantity;
					} else {
						merged[key] = {
							name: item.name,
							quantity: item.quantity,
							price: item.price,
						};
					}
				});
			});
			return Object.values(merged);
		}, [orders]);

		const orderRefs = useMemo(() => {
			if (!orders || orders.length === 0) return [];
			return orders.map((order) => ({
				id: order._id,
				shortId: String(order._id || "").slice(-6),
				paymentStatus: order.paymentStatus,
				orderStatus: order.orderStatus,
			}));
		}, [orders]);

		const cardBg = isDone
			? THEME.mode === "dark"
				? "#061a10"
				: "#e8f5e9"
			: THEME.mode === "dark"
				? "#050A12"
				: "#E5F3FF";
		const cardBorder = isDone
			? "#10B981"
			: THEME.mode === "dark"
				? "#1E3A5F"
				: "#90CAF9";

		return (
			<View
				style={[
					styles.card,
					{ backgroundColor: cardBg, borderColor: cardBorder },
				]}
			>
				{/* Header */}
				<View style={styles.cardHeader}>
					<Text
						style={[
							styles.clientName,
							{ color: THEME.mode === "dark" ? "#F8FAFC" : "#1A1A1A" },
						]}
					>
						{reservation.clientName || "Client"}
					</Text>
					<View
						style={[
							styles.dishStatusBadge,
							{ backgroundColor: statusConfig.color },
						]}
					>
						<Ionicons name={statusConfig.icon} size={12} color="#FFF" />
						<Text style={styles.dishStatusText}>{statusConfig.label}</Text>
					</View>
				</View>

				{/* Infos */}
				<View style={styles.infoRow}>
					<View style={styles.infoItem}>
						<Ionicons
							name="time-outline"
							size={13}
							color={THEME.mode === "dark" ? "#94A3B8" : "#666"}
						/>
						<Text
							style={[
								styles.infoText,
								{ color: THEME.mode === "dark" ? "#94A3B8" : "#666" },
							]}
						>
							{createdTime}
						</Text>
					</View>
					<View style={styles.infoItem}>
						<Ionicons
							name="people-outline"
							size={13}
							color={THEME.mode === "dark" ? "#94A3B8" : "#666"}
						/>
						<Text
							style={[
								styles.infoText,
								{ color: THEME.mode === "dark" ? "#94A3B8" : "#666" },
							]}
						>
							{reservation.nbPersonnes || 1} pers.
						</Text>
					</View>
					<View style={styles.infoItem}>
						<Ionicons
							name="wallet-outline"
							size={13}
							color={THEME.mode === "dark" ? "#94A3B8" : "#666"}
						/>
						<Text
							style={[
								styles.infoText,
								{ color: THEME.mode === "dark" ? "#94A3B8" : "#666" },
							]}
						>
							{amount}
						</Text>
					</View>
				</View>

				{orderRefs.length > 0 && (
					<View style={styles.orderRefsContainer}>
						{orderRefs.map((orderRef) => (
							<Text
								key={orderRef.id}
								style={[
									styles.orderRefText,
									{ color: THEME.mode === "dark" ? "#CBD5E1" : "#475569" },
								]}
							>
								Cmd #{orderRef.shortId} · {orderRef.paymentStatus} · {orderRef.orderStatus}
							</Text>
						))}
					</View>
				)}

				{/* Commande exacte — items de la commande */}
				{allItems.length > 0 ? (
					<View style={styles.orderItemsContainer}>
						<View style={styles.orderItemsDivider} />
						{allItems.map((item, i) => (
							<View key={i} style={styles.orderItemRow}>
								<View style={styles.orderItemQtyBadge}>
									<Text style={styles.orderItemQty}>{item.quantity}×</Text>
								</View>
								<Text
									style={[
										styles.orderItemName,
										{ color: THEME.mode === "dark" ? "#E2E8F0" : "#1E293B" },
									]}
									numberOfLines={1}
								>
									{item.name}
								</Text>
								{item.price > 0 && (
									<Text
										style={[
											styles.orderItemPrice,
											{ color: THEME.mode === "dark" ? "#64748B" : "#94A3B8" },
										]}
									>
										{(item.price * item.quantity).toFixed(2)}€
									</Text>
								)}
							</View>
						))}
					</View>
				) : !!reservation.orderSummary ? (
					<Text
						style={[
							styles.orderSummary,
							{ color: THEME.mode === "dark" ? "#64748B" : "#888" },
						]}
					>
						{reservation.orderSummary}
					</Text>
				) : null}

				{/* Boutons action - rangee double */}
				<View style={styles.btnRow}>
					{/* Preparation */}
					{!isDone ? (
						<TouchableOpacity
							style={[styles.btnDone, styles.btnFlex]}
							onPress={() =>
								onMarkDone(reservation._id, reservation.clientName)
							}
							activeOpacity={0.8}
						>
							<LinearGradient
								colors={["#10B981", "#059669"]}
								start={{ x: 0, y: 0 }}
								end={{ x: 1, y: 0 }}
								style={styles.btnGradient}
							>
								<Ionicons
									name="checkmark-circle-outline"
									size={15}
									color="#FFF"
								/>
								<Text style={styles.btnText}>Préparé</Text>
							</LinearGradient>
						</TouchableOpacity>
					) : (
						<TouchableOpacity
							style={[styles.btnPending, styles.btnFlex]}
							onPress={() => onMarkPending(reservation._id)}
							activeOpacity={0.8}
						>
							<Ionicons name="refresh-outline" size={14} color="#94A3B8" />
							<Text style={styles.btnPendingText}>En attente</Text>
						</TouchableOpacity>
					)}
					{/* Paiement */}
					{!isPaid ? (
						<TouchableOpacity
							style={[styles.btnPay, styles.btnFlex]}
							onPress={() =>
								onMarkPaid(reservation._id, reservation.clientName)
							}
							activeOpacity={0.8}
						>
							<LinearGradient
								colors={["#3B82F6", "#2563EB"]}
								start={{ x: 0, y: 0 }}
								end={{ x: 1, y: 0 }}
								style={styles.btnGradient}
							>
								<Ionicons name="card-outline" size={15} color="#FFF" />
								<Text style={styles.btnText}>Payer</Text>
							</LinearGradient>
						</TouchableOpacity>
					) : (
						<>
							<TouchableOpacity
								style={[styles.btnReceipt, styles.btnFlex]}
								onPress={() => onShowReceipt(reservation, orders)}
								activeOpacity={0.8}
							>
								<LinearGradient
									colors={["#8B5CF6", "#7C3AED"]}
									start={{ x: 0, y: 0 }}
									end={{ x: 1, y: 0 }}
									style={styles.btnGradient}
								>
									<Ionicons name="receipt-outline" size={15} color="#FFF" />
									<Text style={styles.btnText}>Imprimer / Reçu</Text>
								</LinearGradient>
							</TouchableOpacity>
							{/* 🖨️ Bouton impression Thermer — masqué temporairement */}
							{/* <PrintButton
								size="sm"
								label="Thermer"
								onPress={() =>
									printReceiptTicket({
										restaurantName:
											reservation.restaurantId?.name || "SunnyGo",
										billNumber:
											reservation._id?.slice(-6).toUpperCase() || "000000",
										tableNumber:
											reservation.tableNumber ||
											reservation.table ||
											reservation.tableId?.number,
										clientName: reservation.clientName,
										items: allItems.map((it) => ({
											name: it.name,
											quantity: it.quantity,
											price: it.price || 0,
										})),
										taxRate: 0,
									})
								}
							/> */}
						</>
					)}
				</View>
			</View>
		);
	},
);
KitchenReservationCard.displayName = "KitchenReservationCard";

// ─────────────────────────────────────────────────────────────────
// Composant principal
// ─────────────────────────────────────────────────────────────────
export default function FastFoodKitchen() {
	const THEME = useTheme();
	const authFetch = useAuthFetch();

	const reservations = useReservationStore((state) => state.reservations);
	const fetchReservations = useReservationStore(
		(state) => state.fetchReservations,
	);
	const isLoading = useReservationStore((state) => state.isLoading);

	// Map des orders par reservationId { [reservationId]: Order[] }
	const ordersMap = useKitchenOrdersStore((state) => state.ordersMap);
	const fetchOrdersForKitchen = useKitchenOrdersStore(
		(state) => state.fetchOrdersForKitchen,
	);
	// IDs des réservations marquées payées localement (optimiste)
	const [paidReservationIds, setPaidReservationIds] = useState(new Set());
	// Réservation cible pour l'affichage du reçu
	const [receiptTarget, setReceiptTarget] = useState(null);
	const [activeTab, setActiveTab] = useState("pending");

	// ⭐ Surveiller restaurantId : normal = useUserStore, dev = useDeveloperStore
	const restaurantIdFromUser = useUserStore((state) => state.restaurantId);
	const selectedRestaurant = useDeveloperStore((state) => state.selectedRestaurant);
	const restaurantIdFromStore = restaurantIdFromUser || selectedRestaurant?._id;

	useEffect(() => {
		fetchReservations(true);
		fetchOrdersForKitchen(true);
	}, [restaurantIdFromStore, fetchReservations, fetchOrdersForKitchen]);

	// Fallback temps réel: si le socket se coupe, on garde la cuisine à jour par polling.
	useEffect(() => {
		const intervalId = setInterval(() => {
			fetchReservations(true);
			fetchOrdersForKitchen(true);
		}, 10000);

		return () => clearInterval(intervalId);
	}, [fetchReservations, fetchOrdersForKitchen]);
	// Filtrer les réservations d'aujourd'hui (non-annulées), triées : non-terminées d'abord
	const todayReservations = useMemo(() => {
		const today = new Date();
		const todayStart = new Date(
			today.getFullYear(),
			today.getMonth(),
			today.getDate(),
		);
		const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

		return reservations
			.filter((r) => {
				if (r.status === "annulée") return false;

				const reservationDate = new Date(r.reservationDate || r.createdAt);
				const reservationIsToday =
					reservationDate >= todayStart && reservationDate < todayEnd;

				const linkedOrders = ordersMap[r._id] || [];
				const hasOrderToday = linkedOrders.some((order) => {
					const orderDate = new Date(order.createdAt || order.updatedAt);
					return orderDate >= todayStart && orderDate < todayEnd;
				});

				const pass = reservationIsToday || hasOrderToday;
				return pass;
			})
			.sort((a, b) => {
				// Non-terminés avant terminés
				const aDone = a.dishStatus === "Terminé" ? 1 : 0;
				const bDone = b.dishStatus === "Terminé" ? 1 : 0;
				if (aDone !== bDone) return aDone - bDone;
				// Puis par heure
				return (a.reservationTime || "").localeCompare(b.reservationTime || "");
			});
	}, [reservations, ordersMap]);

	const pendingCount = useMemo(
		() => todayReservations.filter((r) => r.dishStatus !== "Terminé").length,
		[todayReservations],
	);

	const totalCount = useMemo(
		() => todayReservations.length,
		[todayReservations],
	);

	const completedCount = useMemo(
		() => todayReservations.filter((r) => r.dishStatus === "Terminé").length,
		[todayReservations],
	);

	const filteredReservations = useMemo(() => {
		if (activeTab === "done") {
			return todayReservations.filter((r) => r.dishStatus === "Terminé");
		}

		const toTimestamp = (reservation) => {
			const rawDate = reservation.createdAt || reservation.updatedAt || reservation.reservationDate;
			const parsed = rawDate ? new Date(rawDate).getTime() : 0;
			return Number.isNaN(parsed) ? 0 : parsed;
		};

		return todayReservations
			.filter((r) => r.dishStatus !== "Terminé")
			.sort((a, b) => toTimestamp(b) - toTimestamp(a));
	}, [activeTab, todayReservations]);

	// ─── Actions ───────────────────────────────────────────────
	const updateDishStatus = useCallback(
		async (reservationId, dishStatus) => {
			try {
				await authFetch(
					`${API_CONFIG.baseURL}/reservations/${reservationId}/dish-status`,
					{
						method: "PATCH",
						body: { dishStatus },
					},
				);
			} catch (err) {
				console.error("❌ [KITCHEN] Erreur mise à jour dishStatus:", err);
				Alert.alert("Erreur", "Impossible de mettre à jour le statut");
			}
		},
		[authFetch],
	);

	const handleMarkDone = useCallback(
		(id, clientName) => {
			Alert.alert(
				"Commande prête",
				`Marquer la commande de ${clientName || "ce client"} comme préparée ?`,
				[
					{ text: "Annuler", style: "cancel" },
					{
						text: "Oui, c'est prêt",
						onPress: () => updateDishStatus(id, "Terminé"),
					},
				],
			);
		},
		[updateDishStatus],
	);

	const handleMarkPending = useCallback(
		(id) => {
			updateDishStatus(id, "En attente");
		},
		[updateDishStatus],
	);

	// 💳 Marquer une réservation comme payée
	const handleMarkPaid = useCallback(
		(id, clientName) => {
			Alert.alert(
				"Confirmer le paiement",
				`Marquer la commande de ${clientName || "ce client"} comme payée ?`,
				[
					{ text: "Annuler", style: "cancel" },
					{
						text: "Confirmer",
						onPress: async () => {
							try {
								await authFetch(
									`${API_CONFIG.baseURL}/reservations/${id}/payment`,
									{ method: "PUT", body: {} },
								);
								setPaidReservationIds((prev) => new Set([...prev, id]));
							} catch (err) {
								console.error("❌ [KITCHEN] Erreur paiement:", err);
								Alert.alert("Erreur", "Impossible de marquer comme payée");
							}
						},
					},
				],
			);
		},
		[authFetch],
	);

	// 🧾 Afficher le reçu pour une réservation
	const handleShowReceipt = useCallback((reservation, orders) => {
		const merged = {};
		(orders || []).forEach((order) => {
			(order.items || []).forEach((item) => {
				if (merged[item.name]) merged[item.name].quantity += item.quantity;
				else merged[item.name] = { ...item };
			});
		});
		setReceiptTarget({ reservation, items: Object.values(merged) });
	}, []);


	const handleRefresh = useCallback(() => {
		fetchReservations(true);
		fetchOrdersForKitchen(true);
	}, [fetchReservations, fetchOrdersForKitchen]);

	// ─── Render ────────────────────────────────────────────────
	const renderItem = useCallback(
		({ item }) => {
			const resaOrders = ordersMap[item._id] || [];
			const isPaid =
				paidReservationIds.has(item._id) ||
				item.status === "terminée" ||
				(resaOrders.length > 0 &&
					resaOrders.every((o) => o.paymentStatus === "paid"));
			return (
				<View style={styles.cardColumn}>
					<KitchenReservationCard
						reservation={item}
						orders={resaOrders}
						isPaid={isPaid}
						onMarkDone={handleMarkDone}
						onMarkPending={handleMarkPending}
						onMarkPaid={handleMarkPaid}
						onShowReceipt={handleShowReceipt}
						THEME={THEME}
					/>
				</View>
			);
		},
		[
			ordersMap,
			paidReservationIds,
			handleMarkDone,
			handleMarkPending,
			handleMarkPaid,
			handleShowReceipt,
			THEME,
		],
	);

	const keyExtractor = useCallback((item) => item._id, []);
	const listColumns = 2;

	return (
		<View
			style={[
				styles.container,
				{ backgroundColor: THEME.colors.background.dark },
			]}
		>
			{/* Header */}
			<LinearGradient
				colors={[THEME.colors.background.card, THEME.colors.background.card]}
				style={styles.header}
			>
				<View style={styles.headerLeft}>
					<Ionicons name="restaurant-outline" size={22} color="#F59E0B" />
					<Text
						style={[styles.headerTitle, { color: THEME.colors.text.primary }]}
					>
						Cuisine
					</Text>
				</View>
				<View style={styles.headerRight}>
					{totalCount > 0 && (
						<View style={styles.pendingBadge}>
							<Text style={styles.pendingBadgeText}>
								{pendingCount}/{totalCount}
							</Text>
						</View>
					)}
					<TouchableOpacity onPress={handleRefresh} style={styles.refreshBtn}>
						<Ionicons
							name="refresh"
							size={20}
							color={THEME.mode === "dark" ? "#94A3B8" : "#666"}
						/>
					</TouchableOpacity>
				</View>
			</LinearGradient>

			<View style={styles.tabsRow}>
				<TouchableOpacity
					style={[
						styles.tabButton,
						activeTab === "pending" && styles.tabButtonActive,
					]}
					onPress={() => setActiveTab("pending")}
					activeOpacity={0.85}
				>
					<Text
						style={[
							styles.tabText,
							activeTab === "pending" && styles.tabTextActive,
						]}
					>
						En attente ({pendingCount})
					</Text>
				</TouchableOpacity>

				<TouchableOpacity
					style={[
						styles.tabButton,
						activeTab === "done" && styles.tabButtonActive,
					]}
					onPress={() => setActiveTab("done")}
					activeOpacity={0.85}
				>
					<Text
						style={[
							styles.tabText,
							activeTab === "done" && styles.tabTextActive,
						]}
					>
						Terminé ({completedCount})
					</Text>
				</TouchableOpacity>
			</View>

			{/* Contenu */}
			{isLoading ? (
				<View style={styles.loadingContainer}>
					<ActivityIndicator size="large" color="#F59E0B" />
					<Text
						style={[
							styles.loadingText,
							{ color: THEME.mode === "dark" ? "#94A3B8" : "#888" },
						]}
					>
						Chargement...
					</Text>
				</View>
			) : filteredReservations.length === 0 ? (
				<View style={styles.emptyContainer}>
				<Ionicons
						name="restaurant-outline"
						size={52}
						color={THEME.mode === "dark" ? "#374151" : "#CBD5E1"}
					/>
					<Text
						style={[
							styles.emptyTitle,
							{ color: THEME.mode === "dark" ? "#94A3B8" : "#64748B" },
						]}
					>
						{activeTab === "done"
							? "Aucune commande terminée"
							: "Aucune commande en attente"}
					</Text>
				</View>
			) : (
				<FlatList
					key={`kitchen-list-${listColumns}`}
					data={filteredReservations}
					renderItem={renderItem}
					keyExtractor={keyExtractor}
					numColumns={listColumns}
					columnWrapperStyle={styles.columnWrapper}
					contentContainerStyle={styles.listContent}
					showsVerticalScrollIndicator={false}
					initialNumToRender={10}
					maxToRenderPerBatch={10}
					windowSize={5}
					removeClippedSubviews={true}
				/>
			)}
			{/* Modale reçu */}
			{receiptTarget && (
				<ReceiptModal
					visible={!!receiptTarget}
					onClose={() => setReceiptTarget(null)}
					reservation={receiptTarget.reservation}
					items={receiptTarget.items}
					amount={receiptTarget.reservation.totalAmount}
					paymentMethod={receiptTarget.reservation.paymentMethod || "Espèces"}
					theme={THEME}
				/>
			)}
		</View>
	);
}

// ─────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	header: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: 16,
		paddingVertical: 14,
		borderBottomWidth: 1,
		borderBottomColor: "rgba(148, 163, 184, 0.1)",
	},
	headerLeft: {
		flexDirection: "row",
		alignItems: "center",
		gap: 10,
	},
	headerTitle: {
		fontSize: 17,
		fontWeight: "700",
		letterSpacing: 0.3,
	},
	headerRight: {
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
	},
	pendingBadge: {
		backgroundColor: "#F59E0B",
		borderRadius: 12,
		minWidth: 24,
		height: 24,
		alignItems: "center",
		justifyContent: "center",
		paddingHorizontal: 6,
	},
	pendingBadgeText: {
		color: "#FFF",
		fontSize: 13,
		fontWeight: "700",
	},
	refreshBtn: {
		padding: 4,
	},
	tabsRow: {
		flexDirection: "row",
		gap: 10,
		paddingHorizontal: 12,
		paddingTop: 10,
		paddingBottom: 8,
	},
	tabButton: {
		flex: 1,
		paddingVertical: 9,
		borderRadius: 10,
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: "rgba(148, 163, 184, 0.12)",
		borderWidth: 1,
		borderColor: "rgba(148, 163, 184, 0.2)",
	},
	tabButtonActive: {
		backgroundColor: "#F59E0B",
		borderColor: "#F59E0B",
	},
	tabText: {
		fontSize: 13,
		fontWeight: "600",
		color: "#94A3B8",
	},
	tabTextActive: {
		color: "#FFFFFF",
	},
	loadingContainer: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		gap: 12,
	},
	loadingText: {
		fontSize: 14,
	},
	emptyContainer: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		gap: 12,
	},
	emptyTitle: {
		fontSize: 16,
		fontWeight: "500",
	},
	listContent: {
		padding: 12,
		paddingBottom: 16,
	},
	columnWrapper: {
		justifyContent: "space-between",
		marginBottom: 10,
	},
	cardColumn: {
		width: "49%",
	},
	// ─── Carte ───
	card: {
		borderRadius: 14,
		borderWidth: 2,
		padding: 14,
		marginBottom: 0,
	},
	cardHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 8,
	},
	clientName: {
		fontSize: 16,
		fontWeight: "700",
	},
	dishStatusBadge: {
		flexDirection: "row",
		alignItems: "center",
		gap: 4,
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 20,
	},
	dishStatusText: {
		color: "#FFF",
		fontSize: 11,
		fontWeight: "600",
	},
	infoRow: {
		flexDirection: "row",
		gap: 16,
		marginBottom: 8,
	},
	infoItem: {
		flexDirection: "row",
		alignItems: "center",
		gap: 4,
	},
	infoText: {
		fontSize: 13,
	},
	orderSummary: {
		fontSize: 12,
		marginBottom: 10,
		fontStyle: "italic",
		lineHeight: 17,
	},
	orderRefsContainer: {
		marginBottom: 8,
		gap: 2,
	},
	orderRefText: {
		fontSize: 11,
		fontWeight: "500",
	},
	btnRow: {
		flexDirection: "row",
		gap: 8,
		marginTop: 6,
	},
	btnFlex: {
		flex: 1,
	},
	btnPay: {
		borderRadius: 10,
		overflow: "hidden",
	},
	btnReceipt: {
		borderRadius: 10,
		overflow: "hidden",
	},
	btnDone: {
		borderRadius: 10,
		overflow: "hidden",
	},
	btnGradient: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 6,
		paddingVertical: 10,
		paddingHorizontal: 14,
	},
	btnText: {
		color: "#FFF",
		fontSize: 14,
		fontWeight: "600",
	},
	btnPending: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 6,
		paddingVertical: 8,
	},
	btnPendingText: {
		color: "#94A3B8",
		fontSize: 13,
	},
	// ─── Items commande ───
	orderItemsContainer: {
		marginBottom: 10,
	},
	orderItemsDivider: {
		height: 1,
		backgroundColor: "rgba(148,163,184,0.15)",
		marginBottom: 8,
	},
	orderItemRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
		marginBottom: 4,
	},
	orderItemQtyBadge: {
		minWidth: 28,
		height: 22,
		borderRadius: 6,
		backgroundColor: "#F59E0B22",
		alignItems: "center",
		justifyContent: "center",
		paddingHorizontal: 4,
	},
	orderItemQty: {
		color: "#F59E0B",
		fontSize: 12,
		fontWeight: "700",
	},
	orderItemName: {
		flex: 1,
		fontSize: 13,
		fontWeight: "500",
	},
	orderItemPrice: {
		fontSize: 12,
		fontWeight: "500",
	},
});

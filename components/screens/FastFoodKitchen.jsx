/**
 * 🍔 FastFoodKitchen.jsx - Vue cuisine pour les fast-foods
 * Affiche toutes les réservations du jour avec leur statut de préparation (dishStatus).
 * Permet de marquer chaque commande comme préparée/servie.
 * ⚡ Mis à jour en temps réel via le store Zustand (WebSocket)
 */
import React, { useCallback, useMemo } from "react";
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
import { useTheme } from "../../hooks/useTheme";
import useReservationStore from "../../src/stores/useReservationStore";
import { useAuthFetch } from "../../hooks/useAuthFetch";
import { API_CONFIG } from "../../src/config/apiConfig";

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
	({ reservation, onMarkDone, onMarkPending, THEME }) => {
		const isDone = reservation.dishStatus === "Terminé";
		const statusConfig =
			DISH_STATUS_CONFIG[reservation.dishStatus] ||
			DISH_STATUS_CONFIG["En attente"];

		const createdTime = reservation.reservationTime || "—";
		const amount =
			typeof reservation.totalAmount === "number"
				? `${reservation.totalAmount.toFixed(2)}€`
				: "0.00€";

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

				{/* Résumé commande si disponible */}
				{!!reservation.orderSummary && (
					<Text
						style={[
							styles.orderSummary,
							{ color: THEME.mode === "dark" ? "#64748B" : "#888" },
						]}
					>
						{reservation.orderSummary}
					</Text>
				)}

				{/* Bouton action */}
				{!isDone ? (
					<TouchableOpacity
						style={styles.btnDone}
						onPress={() => onMarkDone(reservation._id, reservation.clientName)}
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
								size={16}
								color="#FFF"
							/>
							<Text style={styles.btnText}>Marquer comme préparé</Text>
						</LinearGradient>
					</TouchableOpacity>
				) : (
					<TouchableOpacity
						style={styles.btnPending}
						onPress={() => onMarkPending(reservation._id)}
						activeOpacity={0.8}
					>
						<Ionicons name="refresh-outline" size={15} color="#94A3B8" />
						<Text style={styles.btnPendingText}>Remettre en attente</Text>
					</TouchableOpacity>
				)}
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
				const d = new Date(r.reservationDate || r.createdAt);
				return d >= todayStart && d < todayEnd;
			})
			.sort((a, b) => {
				// Non-terminés avant terminés
				const aDone = a.dishStatus === "Terminé" ? 1 : 0;
				const bDone = b.dishStatus === "Terminé" ? 1 : 0;
				if (aDone !== bDone) return aDone - bDone;
				// Puis par heure
				return (a.reservationTime || "").localeCompare(b.reservationTime || "");
			});
	}, [reservations]);

	const pendingCount = useMemo(
		() => todayReservations.filter((r) => r.dishStatus !== "Terminé").length,
		[todayReservations],
	);

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

	const handleRefresh = useCallback(() => {
		fetchReservations(true);
	}, [fetchReservations]);

	// ─── Render ────────────────────────────────────────────────
	const renderItem = useCallback(
		({ item }) => (
			<KitchenReservationCard
				reservation={item}
				onMarkDone={handleMarkDone}
				onMarkPending={handleMarkPending}
				THEME={THEME}
			/>
		),
		[handleMarkDone, handleMarkPending, THEME],
	);

	const keyExtractor = useCallback((item) => item._id, []);

	return (
		<View
			style={[
				styles.container,
				{ backgroundColor: THEME.colors.background.dark },
			]}
		>
			{/* Header */}
			<LinearGradient
				colors={
					THEME.mode === "dark"
						? ["#111827", "#0C1220"]
						: ["#F8FAFC", "#EFF6FF"]
				}
				style={styles.header}
			>
				<View style={styles.headerLeft}>
					<Ionicons name="restaurant-outline" size={22} color="#F59E0B" />
					<Text
						style={[
							styles.headerTitle,
							{ color: THEME.mode === "dark" ? "#F8FAFC" : "#1A1A1A" },
						]}
					>
						Cuisine
					</Text>
				</View>
				<View style={styles.headerRight}>
					{pendingCount > 0 && (
						<View style={styles.pendingBadge}>
							<Text style={styles.pendingBadgeText}>{pendingCount}</Text>
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
			) : todayReservations.length === 0 ? (
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
						Aucune commande aujourd&apos;hui
					</Text>
				</View>
			) : (
				<FlatList
					data={todayReservations}
					renderItem={renderItem}
					keyExtractor={keyExtractor}
					contentContainerStyle={styles.listContent}
					showsVerticalScrollIndicator={false}
					initialNumToRender={10}
					maxToRenderPerBatch={10}
					windowSize={5}
					removeClippedSubviews={true}
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
		gap: 10,
	},
	// ─── Carte ───
	card: {
		borderRadius: 14,
		borderWidth: 2,
		padding: 14,
		marginBottom: 2,
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
	btnDone: {
		marginTop: 6,
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
		marginTop: 6,
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
});

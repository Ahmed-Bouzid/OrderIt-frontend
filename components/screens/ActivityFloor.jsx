/**
 * 🏪 ActivityFloor.jsx — Mode Comptoir : Plan de salle interactif
 *
 * Affiche le plan de salle avec état temps réel des tables
 * Tap sur table → ouvre détail + prise de commande
 * Réutilise FloorPlanModal en mode "service" (pas d'édition)
 */

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	Dimensions,
	ActivityIndicator,
	ScrollView,
	RefreshControl,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../hooks/useTheme";
import useThemeStore from "../../src/stores/useThemeStore";
import useCounterTableStore from "../../src/stores/useCounterTableStore";
import useSocket from "../../hooks/useSocket";
import counterService from "../../services/counterService";

// Composants réutilisés
import FloorPlanModal from "../floor/FloorPlanModal";
import TableDetailModal from "./modals/TableDetailModal";

const IS_PHONE = Dimensions.get("window").width < 600;

const ActivityFloor = ({ restaurantInfo }) => {
	const THEME = useTheme();
	const { themeMode } = useThemeStore();
	const { socket } = useSocket();

	const [restaurantId, setRestaurantId] = useState(null);
	const [selectedRoom, setSelectedRoom] = useState(1);
	const [selectedTableId, setSelectedTableId] = useState(null);
	const [showFloorPlan, setShowFloorPlan] = useState(false);
	const [showTableDetail, setShowTableDetail] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [isRefreshing, setIsRefreshing] = useState(false);

	// Store
	const activeSessions = useCounterTableStore((state) =>
		state.getActiveSessions(restaurantId),
	);
	const stats = useCounterTableStore((state) =>
		state.getStats(restaurantId),
	);
	const fetchSessions = useCounterTableStore((state) =>
		state.fetchSessions,
	);
	const attachSocketListener = useCounterTableStore((state) =>
		state.attachSocketListener,
	);

	// Initialiser restaurantId
	useEffect(() => {
		const init = async () => {
			try {
				const id = await AsyncStorage.getItem("restaurantId");
				if (id) {
					setRestaurantId(id);
					await fetchSessions(id);
				}
			} catch (err) {
				console.error("[ActivityFloor] Erreur init:", err);
			}
		};

		init();
	}, []);

	// Attacher socket listener
	useEffect(() => {
		if (!socket || !restaurantId) return;

		attachSocketListener(socket);
	}, [socket, restaurantId, attachSocketListener]);

	// Refresh handler
	const handleRefresh = useCallback(async () => {
		if (!restaurantId) return;

		setIsRefreshing(true);
		try {
			await fetchSessions(restaurantId);
		} catch (err) {
			console.error("[ActivityFloor] Erreur refresh:", err);
		} finally {
			setIsRefreshing(false);
		}
	}, [restaurantId, fetchSessions]);

	// Styles dynamiques
	const dynamicStyles = useMemo(() => createStyles(THEME), [THEME]);

	// Retourner la session d'une table (pour affichage)
	const getTableSession = useCallback(
		(tableId) => {
			return activeSessions.find((s) => s.tableId === tableId) || null;
		},
		[activeSessions],
	);

	// Compter les tables par status
	const tableStats = useMemo(() => {
		return {
			free: activeSessions.filter((s) => s.billStatus === "closed").length,
			occupied: activeSessions.filter((s) => s.billStatus === "open").length,
			billRequested: activeSessions.filter(
				(s) => s.billStatus === "bill_requested",
			).length,
		};
	}, [activeSessions]);

	// Handler tap table
	const handleTableTap = (tableId) => {
		setSelectedTableId(tableId);
		setShowTableDetail(true);
	};

	// Retourner "Chargement..." si pas de restaurantId
	if (!restaurantId) {
		return (
			<View style={dynamicStyles.container}>
				<ActivityIndicator
					size="large"
					color={THEME.colors.primary.amber}
				/>
			</View>
		);
	}

	return (
		<View style={dynamicStyles.container}>
			{/* Header */}
			<LinearGradient
				colors={[
					THEME.colors.background.elevated,
					THEME.colors.background.dark,
				]}
				start={{ x: 0, y: 0 }}
				end={{ x: 1, y: 1 }}
				style={dynamicStyles.header}
			>
				<View style={dynamicStyles.headerContent}>
					<Text style={dynamicStyles.headerTitle}>☀️ Comptoir</Text>
					<TouchableOpacity
						onPress={() => setShowFloorPlan(true)}
						style={dynamicStyles.headerButton}
					>
						<Ionicons
							name="map-outline"
							size={24}
							color={THEME.colors.primary.amber}
						/>
					</TouchableOpacity>
				</View>

				{/* Sélecteur de salle */}
				<View style={dynamicStyles.roomSelector}>
					{[1, 2, 3].map((room) => (
						<TouchableOpacity
							key={room}
							onPress={() => setSelectedRoom(room)}
							style={[
								dynamicStyles.roomButton,
								selectedRoom === room &&
									dynamicStyles.roomButtonActive,
							]}
						>
							<Text
								style={[
									dynamicStyles.roomButtonText,
									selectedRoom === room &&
										dynamicStyles.roomButtonTextActive,
								]}
							>
								Salle {room}
							</Text>
						</TouchableOpacity>
					))}
				</View>
			</LinearGradient>

			{/* Filtres */}
			<View style={dynamicStyles.filterBar}>
				<Text style={dynamicStyles.filterLabel}>Filtres:</Text>
				<ScrollView
					horizontal
					showsHorizontalScrollIndicator={false}
					style={dynamicStyles.filterScroll}
				>
					{["Toutes", "Libres", "Occupées", "À encaisser"].map(
						(label) => (
							<TouchableOpacity
								key={label}
								style={dynamicStyles.filterButton}
							>
								<Text style={dynamicStyles.filterButtonText}>
									{label}
								</Text>
							</TouchableOpacity>
						),
					)}
				</ScrollView>
			</View>

			{/* Plan de salle — Grille des tables */}
			<ScrollView
				refreshControl={
					<RefreshControl
						refreshing={isRefreshing}
						onRefresh={handleRefresh}
						tintColor={THEME.colors.primary.amber}
					/>
				}
				style={dynamicStyles.tablesGrid}
			>
				<View style={dynamicStyles.gridContainer}>
					{/* Grid de tables fictives pour démo */}
					{Array.from({ length: 10 }).map((_, i) => {
						const tableId = `table-${i + 1}`;
						const session = getTableSession(tableId);

						return (
							<TouchableOpacity
								key={tableId}
								onPress={() => handleTableTap(tableId)}
								style={[
									dynamicStyles.tableCard,
									session?.billStatus === "open" &&
										dynamicStyles.tableCardOccupied,
									session?.billStatus ===
										"bill_requested" &&
										dynamicStyles.tableCardBillRequested,
									!session &&
										dynamicStyles.tableCardFree,
								]}
							>
								<View
									style={dynamicStyles.tableCardContent}
								>
									<Text style={dynamicStyles.tableNumber}>
										T{i + 1}
									</Text>

									{session ? (
										<>
											<Text
												style={dynamicStyles.tableIndicator}
											>
												●●●
											</Text>
											<Text
												style={dynamicStyles.tableAmount}
											>
												{session.totalAmount.toFixed(0)}€
											</Text>
											{session.billStatus ===
												"bill_requested" && (
												<Text style={dynamicStyles.tableBillBadge}>
													💶
												</Text>
											)}
										</>
									) : (
										<Text
											style={dynamicStyles.tableStatusFree}
										>
											Libre
										</Text>
									)}
								</View>
							</TouchableOpacity>
						);
					})}
				</View>
			</ScrollView>

			{/* Footer Stats */}
			<View style={dynamicStyles.footer}>
				<Text style={dynamicStyles.footerText}>
					📊 {stats.open} actives · 💶 {stats.billRequested}{" "}
					à encaisser · CA: {stats.totalAmount.toFixed(0)}€
				</Text>
			</View>

			{/* Modales */}
			{showFloorPlan && (
				<FloorPlanModal
					visible={showFloorPlan}
					onClose={() => setShowFloorPlan(false)}
					restaurantId={restaurantId}
					roomNumber={selectedRoom}
					focusTableId={selectedTableId}
				/>
			)}

			{showTableDetail && selectedTableId && (
				<TableDetailModal
					visible={showTableDetail}
					onClose={() => setShowTableDetail(false)}
					restaurantId={restaurantId}
					tableId={selectedTableId}
				/>
			)}
		</View>
	);
};

const createStyles = (THEME) =>
	StyleSheet.create({
		container: {
			flex: 1,
			backgroundColor: THEME.colors.background.dark,
		},

		header: {
			paddingHorizontal: 16,
			paddingVertical: 12,
			borderBottomWidth: 1,
			borderBottomColor: THEME.colors.border.subtle,
		},

		headerContent: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
			marginBottom: 12,
		},

		headerTitle: {
			fontSize: 20,
			fontWeight: "700",
			color: THEME.colors.text.primary,
		},

		headerButton: {
			padding: 8,
			borderRadius: 8,
			backgroundColor: `rgba(245, 158, 11, 0.1)`,
		},

		roomSelector: {
			flexDirection: "row",
			gap: 8,
		},

		roomButton: {
			flex: 1,
			paddingVertical: 8,
			paddingHorizontal: 12,
			borderRadius: 6,
			backgroundColor: "transparent",
			borderWidth: 1,
			borderColor: THEME.colors.border.subtle,
		},

		roomButtonActive: {
			backgroundColor: THEME.colors.primary.amber,
			borderColor: THEME.colors.primary.amber,
		},

		roomButtonText: {
			fontSize: 12,
			fontWeight: "600",
			color: THEME.colors.text.muted,
			textAlign: "center",
		},

		roomButtonTextActive: {
			color: THEME.colors.background.dark,
		},

		filterBar: {
			paddingHorizontal: 16,
			paddingVertical: 8,
			flexDirection: "row",
			alignItems: "center",
			gap: 8,
		},

		filterLabel: {
			fontSize: 12,
			fontWeight: "600",
			color: THEME.colors.text.secondary,
		},

		filterScroll: {
			flex: 1,
		},

		filterButton: {
			paddingVertical: 6,
			paddingHorizontal: 12,
			borderRadius: 4,
			backgroundColor: "transparent",
			borderWidth: 1,
			borderColor: THEME.colors.border.subtle,
			marginRight: 8,
		},

		filterButtonText: {
			fontSize: 11,
			fontWeight: "500",
			color: THEME.colors.text.muted,
		},

		tablesGrid: {
			flex: 1,
			paddingHorizontal: 12,
			paddingVertical: 12,
		},

		gridContainer: {
			flexDirection: "row",
			flexWrap: "wrap",
			justifyContent: "space-between",
			gap: 12,
		},

		tableCard: {
			width: "32%",
			aspectRatio: 1,
			borderRadius: 12,
			backgroundColor: THEME.colors.background.card,
			borderWidth: 2,
			borderColor: THEME.colors.border.subtle,
			justifyContent: "center",
			alignItems: "center",
		},

		tableCardFree: {
			borderColor: `rgba(148, 163, 184, 0.3)`,
			backgroundColor: "transparent",
		},

		tableCardOccupied: {
			borderColor: THEME.colors.primary.amber,
			backgroundColor: `rgba(245, 158, 11, 0.05)`,
		},

		tableCardBillRequested: {
			borderColor: "#FBBF24",
			backgroundColor: `rgba(251, 191, 36, 0.1)`,
		},

		tableCardContent: {
			alignItems: "center",
			gap: 4,
		},

		tableNumber: {
			fontSize: 18,
			fontWeight: "700",
			color: THEME.colors.text.primary,
		},

		tableIndicator: {
			fontSize: 14,
			color: THEME.colors.primary.amber,
		},

		tableAmount: {
			fontSize: 14,
			fontWeight: "600",
			color: THEME.colors.text.secondary,
		},

		tableBillBadge: {
			fontSize: 16,
		},

		tableStatusFree: {
			fontSize: 11,
			color: THEME.colors.text.muted,
			fontWeight: "500",
		},

		footer: {
			paddingHorizontal: 16,
			paddingVertical: 12,
			borderTopWidth: 1,
			borderTopColor: THEME.colors.border.subtle,
			backgroundColor: THEME.colors.background.card,
		},

		footerText: {
			fontSize: 12,
			color: THEME.colors.text.secondary,
			fontWeight: "500",
		},
	});

export default ActivityFloor;

/**
 * 📅 AgendaScreen — Onglet Agenda dédié
 * Contient : WeekView, ServiceCapacityBanner, AgendaView, modals
 */
import React, {
	useState,
	useCallback,
	useMemo,
	useEffect,
	useRef,
} from "react";
import {
	View,
	Text,
	StyleSheet,
	Animated,
	TouchableOpacity,
	ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_CONFIG } from "../../src/config/apiConfig";

// Composants agenda
import WeekView from "../dashboard/WeekView";
import ServiceCapacityBanner from "../dashboard/ServiceCapacityBanner";
import AgendaView from "../dashboard/AgendaView";
import GanttView from "../dashboard/GanttView";
import LoadingSkeleton from "../dashboard/LoadingSkeleton";
import DailyStatsModal from "../dashboard/DailyStatsModal";
import { Toaster } from "../ui/Toaster";

// Modals
import SettingsModal from "../dashboard/SettingsModal";
import NewReservationModal from "../dashboard/NewReservationModal";
import AssignTableModal from "../dashboard/AssignTableModal";
import AuditModal from "../dashboard/AuditModal";

// Hooks & stores
import { useDashboardData } from "../../hooks/useDashboardData";
import { useDashboardActions } from "../../hooks/useDashboardActions";
import { useTheme } from "../../hooks/useTheme";
import { useAuthFetch } from "../../hooks/useAuthFetch";
import useOptimizationSuggestions from "../../hooks/useOptimizationSuggestions";
import { useFeatureLevel } from "../../src/stores/useFeatureLevelStore";
import { useReservationAI } from "../../hooks/useReservationAI";
import { Ionicons } from "@expo/vector-icons";

export default function AgendaScreen() {
	const THEME = useTheme();
	const authFetch = useAuthFetch();

	// ─────────────── États ───────────────
	const [selectedDate, setSelectedDate] = useState(new Date());
	const [monthlyCounts, setMonthlyCounts] = useState({});
	const [viewMode, setViewMode] = useState("agenda"); // "agenda" | "gantt"
	const [showStatsModal, setShowStatsModal] = useState(false);

	// Refs
	const toasterRef = useRef(null);

	// Modals
	const [showSettingsModal, setShowSettingsModal] = useState(false);
	const [showNewReservationModal, setShowNewReservationModal] = useState(false);
	const [showAssignTableModal, setShowAssignTableModal] = useState(false);
	const [showAuditModal, setShowAuditModal] = useState(false);
	const [selectedReservation, setSelectedReservation] = useState(null);
	const [recreateData, setRecreateData] = useState(null);

	// ─────────────── Hooks data ───────────────
	const { reservations, tables, theme, loading, fetchReservations } =
		useDashboardData();

	const {
		activeReservation,
		setActiveReservation,
		refreshActiveReservation,
		togglePresent,
		updateStatus,
		cancelReservation,
		deleteReservation,
		assignTable,
		createReservation,
		payReservation,
	} = useDashboardActions(fetchReservations);

	// 📅 Agenda : afficher TOUTES les réservations du jour (pas de filtre par statut)
	const filteredReservations = useMemo(() => {
		if (!reservations || !Array.isArray(reservations)) return [];
		const normalizeDate = (date) => {
			const d = new Date(date);
			d.setHours(0, 0, 0, 0);
			return d.getTime();
		};
		const selectedDay = normalizeDate(selectedDate);
		return reservations.filter((r) => {
			if (!r?.reservationDate) return false;
			return normalizeDate(r.reservationDate) === selectedDay;
		});
	}, [reservations, selectedDate]);

	const localStyles = useMemo(() => createStyles(THEME), [THEME]);
	// ─────────────── Optimisation / Toasts ───────────────
	const { runAnalysis, showAlert } = useOptimizationSuggestions({
		toasterRef,
		reservations: filteredReservations,
		tables,
		selectedDate,
	});

	// ── IA ────────────────────────────────────────────────
	const { hasAiPrediction, hasAiWaitingList, hasAiAntiGaps } =
		useFeatureLevel();
	const { predict, getWaitingList, getGaps } = useReservationAI();
	const [prediction, setPrediction] = useState(null);
	const [waitingList, setWaitingList] = useState([]);
	const [waitingExpanded, setWaitingExpanded] = useState(false);
	const [gaps, setGaps] = useState([]);

	useEffect(() => {
		if (!hasAiPrediction) return;
		let cancelled = false;
		predict(selectedDate).then((r) => {
			if (!cancelled) setPrediction(r);
		});
		return () => {
			cancelled = true;
		};
	}, [selectedDate, hasAiPrediction, predict]);

	useEffect(() => {
		if (!hasAiWaitingList) return;
		let cancelled = false;
		setWaitingExpanded(false);
		getWaitingList(selectedDate).then((r) => {
			if (!cancelled) setWaitingList(Array.isArray(r) ? r : []);
		});
		return () => {
			cancelled = true;
		};
	}, [selectedDate, hasAiWaitingList, getWaitingList]);

	useEffect(() => {
		if (!hasAiAntiGaps) {
			setGaps([]);
			return;
		}
		let cancelled = false;
		getGaps(selectedDate).then((r) => {
			if (!cancelled) setGaps(Array.isArray(r) ? r : []);
		});
		return () => {
			cancelled = true;
		};
	}, [selectedDate, hasAiAntiGaps, getGaps]);

	useEffect(() => {
		if (!loading && filteredReservations.length > 0) {
			const t = setTimeout(() => runAnalysis(), 1800);
			return () => clearTimeout(t);
		}
	}, [selectedDate, loading]);

	// ─────────────── Drag & drop Gantt ───────────────
	const handleDrop = useCallback(
		async (resaId, { tableId, reservationTime }) => {
			try {
				await authFetch(`${API_CONFIG.baseURL}/reservations/${resaId}`, {
					method: "PUT",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ tableId, reservationTime }),
				});
				await fetchReservations(true);
				showAlert({
					title: "Réservation déplacée",
					message: `Déplacée à ${reservationTime}`,
					variant: "success",
					position: "bottom-right",
				});
				return true;
			} catch {
				showAlert({
					title: "Impossible de déplacer",
					message: "Vérifiez la connexion et réessayez.",
					variant: "error",
					position: "bottom-right",
				});
				return false;
			}
		},
		[authFetch, fetchReservations, showAlert],
	);
	// ─────────────── FAB animation ───────────────
	const fabScaleAnim = useRef(new Animated.Value(1)).current;
	const fabRotateAnim = useRef(new Animated.Value(0)).current;

	const handleFabPressIn = useCallback(() => {
		Animated.spring(fabScaleAnim, {
			toValue: 0.92,
			useNativeDriver: true,
		}).start();
		Animated.timing(fabRotateAnim, {
			toValue: 1,
			duration: 150,
			useNativeDriver: true,
		}).start();
	}, [fabScaleAnim, fabRotateAnim]);

	const handleFabPressOut = useCallback(() => {
		Animated.spring(fabScaleAnim, {
			toValue: 1,
			useNativeDriver: true,
		}).start();
		Animated.timing(fabRotateAnim, {
			toValue: 0,
			duration: 150,
			useNativeDriver: true,
		}).start();
	}, [fabScaleAnim, fabRotateAnim]);

	const fabRotation = fabRotateAnim.interpolate({
		inputRange: [0, 1],
		outputRange: ["0deg", "45deg"],
	});

	// ─────────────── Fetch monthlyCounts ───────────────
	const fetchMonthlyCounts = useCallback(
		async (year, month) => {
			try {
				const restaurantId = await AsyncStorage.getItem("restaurantId");
				if (!restaurantId) return;
				const data = await authFetch(
					`${API_CONFIG.baseURL}/reservations/restaurant/${restaurantId}/monthly-counts?year=${year}&month=${month}`,
				);
				if (data && typeof data === "object") {
					setMonthlyCounts(data);
				}
			} catch (_e) {
				// silencieux
			}
		},
		[authFetch],
	);

	// Fetch au montage et quand le mois change
	const currentYear = selectedDate.getFullYear();
	const currentMonth = selectedDate.getMonth();
	useEffect(() => {
		fetchMonthlyCounts(currentYear, currentMonth + 1);
	}, [currentYear, currentMonth, fetchMonthlyCounts]);

	// ─────────────── Callbacks modals ───────────────
	const handleOpenSettings = useCallback((reservation) => {
		setSelectedReservation(reservation);
		setShowSettingsModal(true);
	}, []);

	const handleCloseSettings = useCallback(() => {
		setShowSettingsModal(false);
		setSelectedReservation(null);
	}, []);

	const handleTogglePresent = useCallback(
		async (id) => {
			const success = await togglePresent(id);
			if (success) handleCloseSettings();
		},
		[togglePresent, handleCloseSettings],
	);

	const handleUpdateStatus = useCallback(
		async (id, status, reservation) => {
			const success = await updateStatus(id, status, reservation);
			if (success) handleCloseSettings();
		},
		[updateStatus, handleCloseSettings],
	);

	const handleCancel = useCallback(
		async (id) => {
			await cancelReservation(id);
			handleCloseSettings();
		},
		[cancelReservation, handleCloseSettings],
	);

	const handleDelete = useCallback(
		async (id) => {
			await deleteReservation(id);
			handleCloseSettings();
		},
		[deleteReservation, handleCloseSettings],
	);

	const handlePayReservation = useCallback(
		async (id, paidAmount, method) => {
			const success = await payReservation(id, paidAmount, method);
			if (success) handleCloseSettings();
		},
		[payReservation, handleCloseSettings],
	);

	const handleOpenAssignTable = useCallback(
		async (reservation) => {
			await refreshActiveReservation(reservation._id);
			setShowAssignTableModal(true);
		},
		[refreshActiveReservation],
	);

	const handleCloseAssignTable = useCallback(() => {
		setShowAssignTableModal(false);
		setActiveReservation(null);
	}, [setActiveReservation]);

	const handleAssignTable = useCallback(
		async (reservationId, tableId) => {
			const success = await assignTable(reservationId, tableId);
			if (success) handleCloseAssignTable();
		},
		[assignTable, handleCloseAssignTable],
	);

	const handleCreateReservation = useCallback(
		async (formData) => {
			const success = await createReservation(formData);
			if (success) {
				setShowNewReservationModal(false);
				if (formData.reservationDate) {
					setSelectedDate(new Date(formData.reservationDate));
				}
			}
			return success;
		},
		[createReservation],
	);

	const handleRecreateReservation = useCallback((reservation) => {
		setRecreateData({
			clientName: reservation.clientName,
			phone: reservation.phone,
			nbPersonnes: reservation.nbPersonnes,
			allergies: reservation.allergies,
			restrictions: reservation.restrictions,
			notes: reservation.notes,
			tableId: reservation.tableId,
		});
		setShowNewReservationModal(true);
	}, []);

	const handleCloseNewReservation = useCallback(() => {
		setShowNewReservationModal(false);
		setRecreateData(null);
	}, []);

	// ─────────────── Render ───────────────
	return (
		<View style={localStyles.container}>
			{/* Background */}
			<View style={StyleSheet.absoluteFill}>
				<LinearGradient
					colors={["rgba(245, 158, 11, 0.06)", "transparent"]}
					style={localStyles.ambientGlow}
				/>
			</View>

			{/* 📅 WeekView */}
			<WeekView
				selectedDate={selectedDate}
				onDayPress={setSelectedDate}
				monthlyCounts={monthlyCounts}
				tablesCount={tables.length}
			/>

			{/* ─── Toolbar : toggle vue + stats ─── */}
			<View style={localStyles.toolbar}>
				<TouchableOpacity
					onPress={() =>
						setViewMode(viewMode === "agenda" ? "gantt" : "agenda")
					}
					style={localStyles.viewToggle}
					activeOpacity={0.75}
				>
					<Text style={localStyles.toggleText}>
						{viewMode === "agenda" ? "Agenda" : "Gantt"}
					</Text>
					<Ionicons name="sync" size={13} color="#000" />
				</TouchableOpacity>

				<TouchableOpacity
					onPress={() => setShowStatsModal(true)}
					style={[
						localStyles.statsBtn,
						{
							backgroundColor: THEME.colors.background.elevated,
							borderColor: "#F59E0B40",
						},
					]}
				>
					<Ionicons name="stats-chart" size={14} color="#F59E0B" />
					<Text style={[localStyles.statsBtnText, { color: "#F59E0B" }]}>
						Stats
					</Text>
				</TouchableOpacity>
			</View>

			{/* ── IA Prédiction banner ── */}
			{hasAiPrediction && prediction && (
				<View style={localStyles.predBanner}>
					<Ionicons name="trending-up-outline" size={13} color="#F59E0B" />
					<Text style={localStyles.predText} numberOfLines={1}>
						IA · ~{prediction.predictedCount} résas prévues
						{prediction.peakTime ? ` · pic à ${prediction.peakTime}` : ""}
					</Text>
					{prediction.trend && (
						<Text style={localStyles.predTrend}>{prediction.trend}</Text>
					)}
					<View style={localStyles.predBadge}>
						<Text style={localStyles.predBadgeText}>
							{Math.round((prediction.confidence || 0) * 100)}%
						</Text>
					</View>
				</View>
			)}

			{/* 📊 Indicateur de charge */}
			{!loading && (
				<ServiceCapacityBanner
					reservations={filteredReservations}
					tablesCount={tables.length}
				/>
			)}

			{/* Contenu principal */}
			{loading ? (
				<LoadingSkeleton theme={theme} count={6} />
			) : viewMode === "gantt" ? (
				<GanttView
					reservations={filteredReservations}
					tables={tables}
					selectedDate={selectedDate}
					onResaPress={handleOpenSettings}
					onDrop={handleDrop}
				/>
			) : (
				<AgendaView
					reservations={filteredReservations}
					tables={tables}
					selectedDate={selectedDate}
					onResaPress={handleOpenSettings}
					gaps={gaps}
					onSlotPress={({ time, tableId }) => {
						setRecreateData({ reservationTime: time, tableId });
						setShowNewReservationModal(true);
					}}
				/>
			)}

			{/* ── IA Waiting List widget ── */}
			{hasAiWaitingList && waitingList.length > 0 && (
				<TouchableOpacity
					style={localStyles.waitingBanner}
					onPress={() => setWaitingExpanded((v) => !v)}
					activeOpacity={0.8}
				>
					<View style={localStyles.waitingRow}>
						<Ionicons name="people-circle-outline" size={16} color="#F59E0B" />
						<Text style={localStyles.waitingTitle}>
							{waitingList.length} client
							{waitingList.length > 1 ? "s" : ""} en attente
						</Text>
						<Ionicons
							name={waitingExpanded ? "chevron-up" : "chevron-down"}
							size={14}
							color={THEME.colors.text.muted}
						/>
					</View>
					{waitingExpanded &&
						waitingList.slice(0, 5).map((item, idx) => (
							<View key={idx} style={localStyles.waitingItem}>
								<Text style={localStyles.waitingName}>
									{item.reservation?.clientName || "—"}
								</Text>
								<Text style={localStyles.waitingPersons}>
									{item.reservation?.nbPersonnes}p
								</Text>
								<Text style={localStyles.waitingReason} numberOfLines={1}>
									{item.reason}
								</Text>
							</View>
						))}
				</TouchableOpacity>
			)}

			{/* ───── Modals ───── */}
			<SettingsModal
				visible={showSettingsModal}
				onClose={handleCloseSettings}
				reservation={selectedReservation}
				theme={theme}
				onTogglePresent={handleTogglePresent}
				onUpdateStatus={handleUpdateStatus}
				onCancel={handleCancel}
				onDelete={handleDelete}
				onPayReservation={handlePayReservation}
				onAssignTablePress={handleOpenAssignTable}
				onRecreate={handleRecreateReservation}
			/>

			<NewReservationModal
				visible={showNewReservationModal}
				onClose={handleCloseNewReservation}
				onSubmit={handleCreateReservation}
				tables={tables}
				initialData={recreateData}
				selectedDate={selectedDate}
			/>

			{activeReservation && (
				<AssignTableModal
					visible={showAssignTableModal}
					onClose={handleCloseAssignTable}
					reservation={activeReservation}
					onAssignTable={handleAssignTable}
				/>
			)}

			<AuditModal
				visible={showAuditModal}
				onClose={() => setShowAuditModal(false)}
				reservation={selectedReservation}
			/>

			{/* ─── Stats modal ─── */}
			<DailyStatsModal
				visible={showStatsModal}
				onClose={() => setShowStatsModal(false)}
				reservations={filteredReservations}
				tables={tables}
				selectedDate={selectedDate}
			/>

			{/* ─── Toaster (optimisation + alertes) ─── */}
			<Toaster ref={toasterRef} />

			{/* ─── FAB + nouvelle résa ─── */}
			<Animated.View
				style={[
					localStyles.fabContainer,
					{ transform: [{ scale: fabScaleAnim }] },
				]}
			>
				<TouchableOpacity
					onPress={() => setShowNewReservationModal(true)}
					onPressIn={handleFabPressIn}
					onPressOut={handleFabPressOut}
					activeOpacity={0.95}
				>
					<LinearGradient
						colors={["#F59E0B", "#D97706"]}
						style={localStyles.fab}
						start={{ x: 0, y: 0 }}
						end={{ x: 1, y: 1 }}
					>
						<Animated.View style={{ transform: [{ rotate: fabRotation }] }}>
							<Ionicons name="add" size={28} color="#FFFFFF" />
						</Animated.View>
					</LinearGradient>
				</TouchableOpacity>
			</Animated.View>
		</View>
	);
}

// ─────────────── Styles ───────────────
const createStyles = (THEME) =>
	StyleSheet.create({
		container: {
			flex: 1,
			backgroundColor: THEME.colors.background.dark,
		},
		ambientGlow: {
			position: "absolute",
			top: -100,
			left: -100,
			width: 400,
			height: 400,
			borderRadius: 200,
			opacity: 0.5,
		},
		fabContainer: {
			position: "absolute",
			bottom: 24,
			right: 24,
			zIndex: 100,
		},
		fab: {
			width: 60,
			height: 60,
			borderRadius: 30,
			alignItems: "center",
			justifyContent: "center",
			shadowColor: "#F59E0B",
			shadowOffset: { width: 0, height: 4 },
			shadowOpacity: 0.4,
			shadowRadius: 12,
			elevation: 8,
		},
		// ─── Toolbar ───
		toolbar: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
			paddingHorizontal: 14,
			paddingVertical: 8,
			borderBottomWidth: 1,
			borderBottomColor: THEME.colors.border.subtle,
			backgroundColor: THEME.colors.background.dark,
		},
		viewToggle: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "center",
			width: 90,
			gap: 6,
			paddingVertical: 7,
			borderRadius: 10,
			borderWidth: 1,
			backgroundColor: "#F59E0B",
			borderColor: "#D97706",
		},
		toggleText: {
			fontSize: 12,
			fontWeight: "700",
			color: "#000",
		},
		statsBtn: {
			flexDirection: "row",
			alignItems: "center",
			gap: 5,
			paddingHorizontal: 12,
			paddingVertical: 7,
			borderRadius: 10,
			borderWidth: 1,
		},
		statsBtnText: {
			fontSize: 12,
			fontWeight: "700",
		},
		// ── IA Styles ──────────────────────────────────────────────────────
		predBanner: {
			flexDirection: "row",
			alignItems: "center",
			gap: 6,
			paddingHorizontal: 14,
			paddingVertical: 6,
			backgroundColor: "rgba(245, 158, 11, 0.07)",
			borderBottomWidth: 1,
			borderBottomColor: "rgba(245, 158, 11, 0.14)",
		},
		predText: {
			flex: 1,
			fontSize: 12,
			color: THEME.colors.text.secondary,
		},
		predTrend: {
			fontSize: 11,
			color: "#10B981",
			fontWeight: "600",
		},
		predBadge: {
			backgroundColor: "rgba(245, 158, 11, 0.18)",
			borderRadius: 8,
			paddingHorizontal: 7,
			paddingVertical: 2,
		},
		predBadgeText: {
			fontSize: 11,
			fontWeight: "700",
			color: "#F59E0B",
		},
		waitingBanner: {
			marginHorizontal: 14,
			marginBottom: 8,
			paddingVertical: 8,
			paddingHorizontal: 12,
			backgroundColor: "rgba(245, 158, 11, 0.07)",
			borderRadius: 10,
			borderWidth: 1,
			borderColor: "rgba(245, 158, 11, 0.2)",
		},
		waitingRow: {
			flexDirection: "row",
			alignItems: "center",
			gap: 8,
		},
		waitingTitle: {
			flex: 1,
			fontSize: 13,
			fontWeight: "600",
			color: "#F59E0B",
		},
		waitingItem: {
			flexDirection: "row",
			alignItems: "center",
			gap: 8,
			paddingTop: 6,
			borderTopWidth: 1,
			borderTopColor: "rgba(245, 158, 11, 0.1)",
			marginTop: 4,
		},
		waitingName: {
			fontSize: 12,
			fontWeight: "600",
			color: THEME.colors.text.primary,
			minWidth: 80,
		},
		waitingPersons: {
			fontSize: 11,
			color: THEME.colors.text.muted,
			minWidth: 24,
		},
		waitingReason: {
			flex: 1,
			fontSize: 11,
			color: THEME.colors.text.muted,
			fontstyle: "italic",
		},
	});

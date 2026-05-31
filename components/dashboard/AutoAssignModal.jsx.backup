/**
 * AutoAssignModal.jsx
 * Modal d'attribution automatique des tables pour une date donnée.
 * Affiche la liste des réservations + tables, avec feedback visuel après attribution.
 */
import React, {
	useEffect,
	useRef,
	useMemo,
	useState,
	useCallback,
} from "react";
import {
	Modal,
	View,
	Text,
	TouchableOpacity,
	TouchableWithoutFeedback,
	StyleSheet,
	Animated,
	ScrollView,
	ActivityIndicator,
	Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../hooks/useTheme";
import { useAuthFetch } from "../../hooks/useAuthFetch";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_CONFIG } from "../../src/config/apiConfig";

// ── Statut couleur d'une ligne de réservation ─────────────────────────────────
// idle      : état initial (table déjà attribuée ou non)
// assigned  : vient d'être attribuée (vert)
// reassigned: a été réassignée (amber)
// unassigned: pas de table disponible (rouge)
// cleared   : table désattribuée (gris)

const STATUS_COLORS = {
	idle_with_table: {
		bg: "rgba(245,158,11,0.12)",
		border: "#F59E0B",
		text: "#F59E0B",
		icon: "checkmark-circle",
	},
	idle_no_table: {
		bg: "rgba(100,116,139,0.10)",
		border: "#475569",
		text: "#94A3B8",
		icon: "radio-button-off",
	},
	assigned: {
		bg: "rgba(16,185,129,0.15)",
		border: "#10B981",
		text: "#10B981",
		icon: "checkmark-circle",
	},
	reassigned: {
		bg: "rgba(245,158,11,0.20)",
		border: "#F59E0B",
		text: "#F59E0B",
		icon: "refresh-circle",
	},
	unassigned: {
		bg: "rgba(239,68,68,0.12)",
		border: "#EF4444",
		text: "#EF4444",
		icon: "close-circle",
	},
	cleared: {
		bg: "rgba(100,116,139,0.10)",
		border: "#475569",
		text: "#94A3B8",
		icon: "remove-circle-outline",
	},
};

const ReservationRow = React.memo(({ item, THEME, styles }) => {
	const scaleAnim = useRef(new Animated.Value(1)).current;

	useEffect(() => {
		if (
			item.assignStatus === "assigned" ||
			item.assignStatus === "reassigned"
		) {
			Animated.sequence([
				Animated.timing(scaleAnim, {
					toValue: 1.04,
					duration: 180,
					useNativeDriver: true,
				}),
				Animated.spring(scaleAnim, {
					toValue: 1,
					friction: 4,
					useNativeDriver: true,
				}),
			]).start();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [item.assignStatus]);

	const colorConfig =
		STATUS_COLORS[item.assignStatus] || STATUS_COLORS.idle_no_table;

	const formatTime = (t) => t || "–";
	const formatDate = (d) => {
		if (!d) return "";
		const date = new Date(d);
		return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
	};

	return (
		<Animated.View
			style={[
				styles.row,
				{
					transform: [{ scale: scaleAnim }],
					backgroundColor: colorConfig.bg,
					borderColor: colorConfig.border,
				},
			]}
		>
			{/* Icône statut */}
			<View
				style={[
					styles.statusBadge,
					{ backgroundColor: colorConfig.border + "25" },
				]}
			>
				<Ionicons
					name={colorConfig.icon}
					size={20}
					color={colorConfig.border}
				/>
			</View>

			{/* Infos réservation */}
			<View style={styles.rowInfo}>
				<Text
					style={[styles.rowName, { color: THEME.colors.text.primary }]}
					numberOfLines={1}
				>
					{item.clientName || "Inconnu"}
				</Text>
				<View style={styles.rowMeta}>
					<Ionicons
						name="time-outline"
						size={12}
						color={THEME.colors.text.muted}
					/>
					<Text
						style={[styles.rowMetaText, { color: THEME.colors.text.muted }]}
					>
						{formatTime(item.reservationTime)}
					</Text>
					<Ionicons
						name="people-outline"
						size={12}
						color={THEME.colors.text.muted}
						style={{ marginLeft: 8 }}
					/>
					<Text
						style={[styles.rowMetaText, { color: THEME.colors.text.muted }]}
					>
						{item.nbPersonnes || 1} pers.
					</Text>
					<Text
						style={[
							styles.rowMetaText,
							{ color: THEME.colors.text.muted, marginLeft: 8 },
						]}
					>
						{formatDate(item.reservationDate)}
					</Text>
				</View>
			</View>

			{/* Badge table */}
			<View
				style={[
					styles.tableBadge,
					{ borderColor: colorConfig.border, backgroundColor: colorConfig.bg },
				]}
			>
				{item.tableName ? (
					<>
						<Ionicons name="grid-outline" size={12} color={colorConfig.text} />
						<Text style={[styles.tableBadgeText, { color: colorConfig.text }]}>
							{item.tableName}
						</Text>
					</>
				) : (
					<Text style={[styles.tableBadgeText, { color: colorConfig.text }]}>
						Non assignée
					</Text>
				)}
			</View>
		</Animated.View>
	);
});
ReservationRow.displayName = "ReservationRow";

// ── Légende ───────────────────────────────────────────────────────────────────
const Legend = React.memo(({ styles, THEME }) => (
	<View style={styles.legend}>
		{[
			{ key: "assigned", label: "Nouvelle attribution" },
			{ key: "reassigned", label: "Réassignée" },
			{ key: "idle_with_table", label: "Déjà attribuée" },
			{ key: "unassigned", label: "Sans table disponible" },
		].map(({ key, label }) => (
			<View style={styles.legendItem} key={key}>
				<View
					style={[
						styles.legendDot,
						{ backgroundColor: STATUS_COLORS[key].border },
					]}
				/>
				<Text style={[styles.legendText, { color: THEME.colors.text.muted }]}>
					{label}
				</Text>
			</View>
		))}
	</View>
));
Legend.displayName = "Legend";

// ── Composant principal ───────────────────────────────────────────────────────
const AutoAssignModal = React.memo(
	({ visible, onClose, selectedDate, onComplete }) => {
		const THEME = useTheme();
		const styles = useMemo(() => createStyles(THEME), [THEME]);
		const authFetch = useAuthFetch();

		// Animations d'entrée
		const scaleAnim = useRef(new Animated.Value(0.92)).current;
		const opacityAnim = useRef(new Animated.Value(0)).current;

		// Données
		const [rows, setRows] = useState([]); // réservations avec statut
		const [loadingData, setLoadingData] = useState(false);
		const [assigning, setAssigning] = useState(false);
		const [clearing, setClearing] = useState(false);
		const [hasResult, setHasResult] = useState(false);
		const [summary, setSummary] = useState(null); // { assigned, reassigned, unassigned }

		// ── Chargement des réservations du jour ─────────────────────────────────
		const fetchDayReservations = useCallback(async () => {
			setLoadingData(true);
			setHasResult(false);
			setSummary(null);

			try {
				const restaurantId = await AsyncStorage.getItem("restaurantId");
				if (!restaurantId) return;

				const dateString = selectedDate.toISOString().split("T")[0];
				const data = await authFetch(
					`${API_CONFIG.baseURL}/reservations/restaurant/${restaurantId}?date=${dateString}`,
				);

				// L'API renvoie soit un tableau soit { reservations: [...] }
				const list = Array.isArray(data) ? data : (data?.reservations ?? []);

				// Filtrer : uniquement "en attente" ou "ouverte"
				const filtered = list.filter((r) =>
					["en attente", "ouverte"].includes(r.status),
				);

				// Construire les lignes avec statut initial
				const initialRows = filtered.map((r) => ({
					_id: r._id,
					clientName: r.clientName,
					reservationTime: r.reservationTime,
					reservationDate: r.reservationDate,
					nbPersonnes: r.nbPersonnes,
					tableName:
						r.tableId?.number ||
						r.tableId?.label ||
						(typeof r.tableId === "string" ? null : null),
					tableId: r.tableId?._id || r.tableId,
					assignStatus: r.tableId ? "idle_with_table" : "idle_no_table",
				}));

				// Trier par heure
				initialRows.sort((a, b) =>
					(a.reservationTime || "").localeCompare(b.reservationTime || ""),
				);
				setRows(initialRows);
			} catch (_e) {
				// silencieux — on laisse la liste vide
			} finally {
				setLoadingData(false);
			}
		}, [selectedDate, authFetch]);

		// ── Animation d'ouverture/fermeture ─────────────────────────────────────
		useEffect(() => {
			if (visible) {
				fetchDayReservations();
				Animated.parallel([
					Animated.spring(scaleAnim, {
						toValue: 1,
						friction: 7,
						tension: 60,
						useNativeDriver: true,
					}),
					Animated.timing(opacityAnim, {
						toValue: 1,
						duration: 220,
						useNativeDriver: true,
					}),
				]).start();
			} else {
				Animated.parallel([
					Animated.timing(scaleAnim, {
						toValue: 0.92,
						duration: 180,
						useNativeDriver: true,
					}),
					Animated.timing(opacityAnim, {
						toValue: 0,
						duration: 180,
						useNativeDriver: true,
					}),
				]).start();
			}
			// eslint-disable-next-line react-hooks/exhaustive-deps
		}, [visible, fetchDayReservations]);
		const handleAutoAssign = useCallback(async () => {
			setAssigning(true);
			try {
				const restaurantId = await AsyncStorage.getItem("restaurantId");
				if (!restaurantId) return;

				const dateString = selectedDate.toISOString().split("T")[0];
				const result = await authFetch(
					`${process.env.EXPO_PUBLIC_API_URL}/assistant/auto-assign-tables`,
					{
						method: "POST",
						body: JSON.stringify({ restaurantId, date: dateString }),
					},
				);

				if (result?.status === "success" || result?.details) {
					const details = result.details || {};
					const assigned = details.assigned || [];
					const reassigned = details.reassigned || [];
					const unassigned = details.unassigned || [];

					// Mettre à jour les lignes avec le résultat
					setRows((prev) =>
						prev.map((row) => {
							const wasAssigned = assigned.find(
								(a) => a.reservationId?.toString() === row._id?.toString(),
							);
							const wasReassigned = reassigned.find(
								(a) => a.reservationId?.toString() === row._id?.toString(),
							);
							const wasUnassigned = unassigned.find(
								(a) => a.reservationId?.toString() === row._id?.toString(),
							);

							if (wasAssigned) {
								return {
									...row,
									assignStatus: "assigned",
									tableName:
										wasAssigned.tableName ||
										wasAssigned.tableNumber ||
										row.tableName,
								};
							}
							if (wasReassigned) {
								return {
									...row,
									assignStatus: "reassigned",
									tableName:
										wasReassigned.newTableName ||
										wasReassigned.tableName ||
										row.tableName,
								};
							}
							if (wasUnassigned) {
								return { ...row, assignStatus: "unassigned", tableName: null };
							}
							return row;
						}),
					);

					setHasResult(true);
					setSummary({
						assigned: assigned.length,
						reassigned: reassigned.length,
						unassigned: unassigned.length,
					});
					onComplete?.();
				}
			} catch (_e) {
				// Ne rien faire silencieusement
			} finally {
				setAssigning(false);
			}
		}, [selectedDate, authFetch, onComplete]);

		// ── Désattribution globale ───────────────────────────────────────────────
		const handleClearAll = useCallback(async () => {
			setClearing(true);
			try {
				const restaurantId = await AsyncStorage.getItem("restaurantId");
				if (!restaurantId) return;

				const dateString = selectedDate.toISOString().split("T")[0];
				const result = await authFetch(
					`${process.env.EXPO_PUBLIC_API_URL}/assistant/clear-assignments`,
					{
						method: "POST",
						body: JSON.stringify({ restaurantId, date: dateString }),
					},
				);

				if (result?.status === "success") {
					setRows((prev) =>
						prev.map((r) => ({
							...r,
							assignStatus: "cleared",
							tableName: null,
						})),
					);
					setHasResult(true);
					setSummary({
						assigned: 0,
						reassigned: 0,
						unassigned: 0,
						cleared: result.clearedCount || 0,
					});
					onComplete?.();
				}
			} catch (_e) {
				// silencieux
			} finally {
				setClearing(false);
			}
		}, [selectedDate, authFetch, onComplete]);

		// ── Format date header ───────────────────────────────────────────────────
		const dateLabel = useMemo(() => {
			if (!selectedDate) return "";
			return selectedDate.toLocaleDateString("fr-FR", {
				weekday: "long",
				day: "numeric",
				month: "long",
			});
		}, [selectedDate]);

		// ── Résumé textuel ───────────────────────────────────────────────────────
		const summaryLabel = useMemo(() => {
			if (!summary) return null;
			if (summary.cleared != null) {
				return `${summary.cleared} attribution(s) supprimée(s)`;
			}
			const parts = [];
			if (summary.assigned > 0) parts.push(`${summary.assigned} attribuée(s)`);
			if (summary.reassigned > 0)
				parts.push(`${summary.reassigned} réassignée(s)`);
			if (summary.unassigned > 0)
				parts.push(`${summary.unassigned} sans table`);
			return parts.join(" · ") || "Aucun changement";
		}, [summary]);

		return (
			<Modal
				visible={visible}
				transparent
				animationType="none"
				onRequestClose={onClose}
				statusBarTranslucent
			>
				<TouchableWithoutFeedback onPress={onClose}>
					<View style={styles.backdrop} />
				</TouchableWithoutFeedback>

				<View style={styles.centeredView} pointerEvents="box-none">
					<Animated.View
						style={[
							styles.modalContainer,
							{ opacity: opacityAnim, transform: [{ scale: scaleAnim }] },
						]}
					>
						{/* ── Header ────────────────────────────────────────────────── */}
						<LinearGradient
							colors={["rgba(245,158,11,0.18)", "transparent"]}
							style={styles.headerGradient}
						>
							<View style={styles.header}>
								<View style={styles.headerLeft}>
									<View style={styles.headerIcon}>
										<Ionicons name="sparkles" size={20} color="#F59E0B" />
									</View>
									<View>
										<Text
											style={[
												styles.headerTitle,
												{ color: THEME.colors.text.primary },
											]}
										>
											Attribution automatique
										</Text>
										<Text
											style={[
												styles.headerSubtitle,
												{ color: THEME.colors.text.muted },
											]}
										>
											{dateLabel}
										</Text>
									</View>
								</View>
								<TouchableOpacity
									onPress={onClose}
									style={styles.closeButton}
									activeOpacity={0.7}
								>
									<Ionicons
										name="close"
										size={20}
										color={THEME.colors.text.secondary}
									/>
								</TouchableOpacity>
							</View>
						</LinearGradient>

						{/* ── Résumé résultat ───────────────────────────────────────── */}
						{hasResult && summaryLabel && (
							<View
								style={[
									styles.summaryBanner,
									{
										backgroundColor:
											summary?.cleared != null
												? "rgba(148,163,184,0.12)"
												: "rgba(16,185,129,0.12)",
										borderColor:
											summary?.cleared != null ? "#475569" : "#10B981",
									},
								]}
							>
								<Ionicons
									name={
										summary?.cleared != null
											? "remove-circle-outline"
											: "checkmark-circle"
									}
									size={16}
									color={summary?.cleared != null ? "#94A3B8" : "#10B981"}
								/>
								<Text
									style={[
										styles.summaryText,
										{
											color: summary?.cleared != null ? "#94A3B8" : "#10B981",
										},
									]}
								>
									{summaryLabel}
								</Text>
							</View>
						)}

						{/* ── Légende ──────────────────────────────────────────────── */}
						<Legend styles={styles} THEME={THEME} />

						{/* ── Liste réservations ────────────────────────────────────── */}
						<ScrollView
							style={styles.list}
							contentContainerStyle={styles.listContent}
							showsVerticalScrollIndicator={false}
						>
							{loadingData ? (
								<View style={styles.loadingContainer}>
									<ActivityIndicator size="large" color="#F59E0B" />
									<Text
										style={[
											styles.loadingText,
											{ color: THEME.colors.text.muted },
										]}
									>
										Chargement des réservations…
									</Text>
								</View>
							) : rows.length === 0 ? (
								<View style={styles.emptyContainer}>
									<Ionicons
										name="calendar-outline"
										size={40}
										color={THEME.colors.text.muted}
									/>
									<Text
										style={[
											styles.emptyText,
											{ color: THEME.colors.text.muted },
										]}
									>
										Aucune réservation ce jour
									</Text>
								</View>
							) : (
								rows.map((item) => (
									<ReservationRow
										key={item._id}
										item={item}
										THEME={THEME}
										styles={styles}
									/>
								))
							)}
						</ScrollView>

						{/* ── Actions ───────────────────────────────────────────────── */}
						<View
							style={[
								styles.footer,
								{
									borderTopColor:
										THEME.colors.border?.subtle || "rgba(255,255,255,0.08)",
								},
							]}
						>
							{/* Bouton désattribuer */}
							<TouchableOpacity
								style={[
									styles.clearButton,
									(clearing || loadingData) && { opacity: 0.5 },
								]}
								onPress={handleClearAll}
								disabled={clearing || loadingData || assigning}
								activeOpacity={0.75}
							>
								{clearing ? (
									<ActivityIndicator size="small" color="#EF4444" />
								) : (
									<Ionicons name="trash-outline" size={16} color="#EF4444" />
								)}
								<Text style={styles.clearButtonText}>
									{clearing ? "Suppression…" : "Désattribuer toutes"}
								</Text>
							</TouchableOpacity>

							{/* Bouton attribuer */}
							<TouchableOpacity
								onPress={handleAutoAssign}
								disabled={
									assigning || loadingData || clearing || rows.length === 0
								}
								activeOpacity={0.85}
								style={[
									(assigning || loadingData || rows.length === 0) && {
										opacity: 0.5,
									},
								]}
							>
								<LinearGradient
									colors={["#F59E0B", "#D97706"]}
									style={styles.assignButton}
									start={{ x: 0, y: 0 }}
									end={{ x: 1, y: 1 }}
								>
									{assigning ? (
										<ActivityIndicator size="small" color="#FFFFFF" />
									) : (
										<Ionicons name="color-wand" size={16} color="#FFFFFF" />
									)}
									<Text style={styles.assignButtonText}>
										{assigning ? "Attribution…" : "Attribuer automatiquement"}
									</Text>
								</LinearGradient>
							</TouchableOpacity>
						</View>
					</Animated.View>
				</View>
			</Modal>
		);
	},
);

AutoAssignModal.displayName = "AutoAssignModal";
export default AutoAssignModal;

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const createStyles = (THEME) =>
	StyleSheet.create({
		backdrop: {
			...StyleSheet.absoluteFillObject,
			backgroundColor: "rgba(0,0,0,0.65)",
		},
		centeredView: {
			flex: 1,
			justifyContent: "flex-end",
			paddingHorizontal: 0,
		},
		modalContainer: {
			backgroundColor: THEME.colors.background.card,
			borderTopLeftRadius: 24,
			borderTopRightRadius: 24,
			maxHeight: "88%",
			...Platform.select({
				ios: {
					shadowColor: "#000",
					shadowOffset: { width: 0, height: -4 },
					shadowOpacity: 0.3,
					shadowRadius: 16,
				},
				android: { elevation: 16 },
			}),
		},
		headerGradient: {
			borderTopLeftRadius: 24,
			borderTopRightRadius: 24,
		},
		header: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "space-between",
			paddingHorizontal: 20,
			paddingTop: 20,
			paddingBottom: 16,
		},
		headerLeft: {
			flexDirection: "row",
			alignItems: "center",
			gap: 12,
			flex: 1,
		},
		headerIcon: {
			width: 40,
			height: 40,
			borderRadius: 12,
			backgroundColor: "rgba(245,158,11,0.18)",
			alignItems: "center",
			justifyContent: "center",
			borderWidth: 1,
			borderColor: "rgba(245,158,11,0.35)",
		},
		headerTitle: {
			fontSize: THEME.typography.sizes.lg,
			fontWeight: "700",
			letterSpacing: -0.3,
		},
		headerSubtitle: {
			fontSize: THEME.typography.sizes.sm,
			marginTop: 2,
			textTransform: "capitalize",
		},
		closeButton: {
			width: 36,
			height: 36,
			borderRadius: 18,
			backgroundColor:
				THEME.colors.background.elevated || "rgba(255,255,255,0.07)",
			alignItems: "center",
			justifyContent: "center",
		},

		// Résumé
		summaryBanner: {
			flexDirection: "row",
			alignItems: "center",
			gap: 8,
			marginHorizontal: 16,
			marginBottom: 8,
			paddingHorizontal: 14,
			paddingVertical: 10,
			borderRadius: 10,
			borderWidth: 1,
		},
		summaryText: {
			fontSize: THEME.typography.sizes.sm,
			fontWeight: "600",
		},

		// Légende
		legend: {
			flexDirection: "row",
			flexWrap: "wrap",
			gap: 8,
			paddingHorizontal: 16,
			marginBottom: 12,
		},
		legendItem: {
			flexDirection: "row",
			alignItems: "center",
			gap: 5,
		},
		legendDot: {
			width: 8,
			height: 8,
			borderRadius: 4,
		},
		legendText: {
			fontSize: 11,
			fontWeight: "500",
		},

		// Liste
		list: {
			maxHeight: 380,
		},
		listContent: {
			paddingHorizontal: 16,
			paddingBottom: 8,
			gap: 8,
		},
		loadingContainer: {
			alignItems: "center",
			paddingVertical: 40,
			gap: 12,
		},
		loadingText: {
			fontSize: THEME.typography.sizes.sm,
		},
		emptyContainer: {
			alignItems: "center",
			paddingVertical: 40,
			gap: 12,
		},
		emptyText: {
			fontSize: THEME.typography.sizes.sm,
		},

		// Ligne réservation
		row: {
			flexDirection: "row",
			alignItems: "center",
			gap: 12,
			padding: 12,
			borderRadius: 12,
			borderWidth: 1.5,
		},
		statusBadge: {
			width: 36,
			height: 36,
			borderRadius: 10,
			alignItems: "center",
			justifyContent: "center",
		},
		rowInfo: {
			flex: 1,
		},
		rowName: {
			fontSize: THEME.typography.sizes.sm,
			fontWeight: "700",
			marginBottom: 3,
		},
		rowMeta: {
			flexDirection: "row",
			alignItems: "center",
			gap: 3,
		},
		rowMetaText: {
			fontSize: 11,
			fontWeight: "500",
		},
		tableBadge: {
			flexDirection: "row",
			alignItems: "center",
			gap: 4,
			paddingHorizontal: 10,
			paddingVertical: 5,
			borderRadius: 8,
			borderWidth: 1,
		},
		tableBadgeText: {
			fontSize: 12,
			fontWeight: "700",
		},

		// Footer
		footer: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "space-between",
			paddingHorizontal: 16,
			paddingVertical: 16,
			paddingBottom: Platform.OS === "ios" ? 32 : 16,
			borderTopWidth: 1,
			gap: 12,
		},
		clearButton: {
			flexDirection: "row",
			alignItems: "center",
			gap: 6,
			paddingHorizontal: 14,
			paddingVertical: 12,
			borderRadius: 12,
			borderWidth: 1,
			borderColor: "#EF4444",
			backgroundColor: "rgba(239,68,68,0.08)",
		},
		clearButtonText: {
			fontSize: THEME.typography.sizes.sm,
			fontWeight: "600",
			color: "#EF4444",
		},
		assignButton: {
			flexDirection: "row",
			alignItems: "center",
			gap: 8,
			paddingHorizontal: 18,
			paddingVertical: 12,
			borderRadius: 12,
			...Platform.select({
				ios: {
					shadowColor: "#F59E0B",
					shadowOffset: { width: 0, height: 3 },
					shadowOpacity: 0.4,
					shadowRadius: 8,
				},
				android: { elevation: 6 },
			}),
		},
		assignButtonText: {
			fontSize: THEME.typography.sizes.sm,
			fontWeight: "700",
			color: "#FFFFFF",
		},
	});

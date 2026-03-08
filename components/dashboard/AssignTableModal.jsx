/**
 * AssignTableModal.jsx - Modal d'assignation de table Premium
 * Interface de sélection de table avec design spatial et animations
 * Support Mode Clair/Sombre
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
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import useThemeStore from "../../src/stores/useThemeStore";
import { useTheme } from "../../hooks/useTheme";
import { useAuthFetch } from "../../hooks/useAuthFetch";
import { useFeatureLevel } from "../../src/stores/useFeatureLevelStore";
import { useReservationAI } from "../../hooks/useReservationAI";

// ─────────────── Table Button Component ───────────────
const TableButton = React.memo(
	({
		table,
		isAssignedToCurrent,
		isAvailable,
		onPress,
		THEME,
		tableStyles,
	}) => {
		const scaleAnim = useRef(new Animated.Value(1)).current;

		const handlePressIn = () => {
			Animated.spring(scaleAnim, {
				toValue: 0.92,
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

		// Couleurs selon le statut
		const getTableStyle = () => {
			if (isAssignedToCurrent) {
				return {
					bgColor: THEME.colors.primary.amber,
					borderColor: THEME.colors.primary.amber,
					textColor: "#FFFFFF",
					icon: "checkmark-circle",
				};
			}
			if (isAvailable) {
				return {
					bgColor: "rgba(16, 185, 129, 0.15)",
					borderColor: THEME.colors.status.success,
					textColor: THEME.colors.status.success,
					icon: "checkmark-outline",
				};
			}
			return {
				bgColor: "rgba(239, 68, 68, 0.15)",
				borderColor: THEME.colors.status.error,
				textColor: THEME.colors.status.error,
				icon: "close-outline",
			};
		};

		const style = getTableStyle();
		const canSelect = isAvailable || isAssignedToCurrent;

		return (
			<Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
				<TouchableOpacity
					onPress={onPress}
					onPressIn={canSelect ? handlePressIn : undefined}
					onPressOut={canSelect ? handlePressOut : undefined}
					disabled={!canSelect}
					activeOpacity={0.85}
					style={[
						tableStyles.tableButton,
						{
							backgroundColor: style.bgColor,
							borderColor: style.borderColor,
							opacity: canSelect ? 1 : 0.5,
						},
					]}
				>
					<Ionicons
						name={style.icon}
						size={14}
						color={style.textColor}
						style={{ marginBottom: 2 }}
					/>
					<Text style={[tableStyles.tableNumber, { color: style.textColor }]}>
						{table.number || "?"}
					</Text>
					<Text style={[tableStyles.tableCapacity, { color: style.textColor }]}>
						{table.capacity || 0} pers.
					</Text>
				</TouchableOpacity>
			</Animated.View>
		);
	},
);

TableButton.displayName = "TableButton";

const AssignTableModal = React.memo(
	({ visible, onClose, tables, activeReservation, onAssignTable }) => {
		// Animations
		const scaleAnim = useRef(new Animated.Value(0.9)).current;
		const opacityAnim = useRef(new Animated.Value(0)).current;

		// Thème dynamique
		const { themeMode } = useThemeStore();
		const THEME = useTheme(); // Utilise le hook avec multiplicateur de police
		const modalStyles = useMemo(() => createModalStyles(THEME), [THEME]);
		const tableStyles = useMemo(() => createTableStyles(THEME), [THEME]);
		const authFetch = useAuthFetch();

		// ── IA ──────────────────────────────────────────────────────────────
		const { hasAiAutoAssign } = useFeatureLevel();
		const { autoAssign, loading: aiLoading } = useReservationAI();
		const [aiSuggestion, setAiSuggestion] = useState(null);

		const handleAutoAssign = useCallback(async () => {
			if (!activeReservation?._id) return;
			setAiSuggestion(null);
			const result = await autoAssign(activeReservation._id);
			if (result) setAiSuggestion(result);
		}, [autoAssign, activeReservation]);

		// ⭐ Tables avec disponibilité calculée
		const [tablesWithAvailability, setTablesWithAvailability] = useState(
			tables || [],
		);
		const [loadingTables, setLoadingTables] = useState(false);

		// ⭐ Charger les tables avec disponibilité quand la modale s'ouvre
		useEffect(() => {
			const fetchTablesWithAvailability = async () => {
				if (!visible || !activeReservation) return;

				// Si pas de date/heure dans la réservation, utiliser les tables par défaut
				if (
					!activeReservation.reservationDate ||
					!activeReservation.reservationTime
				) {
					setTablesWithAvailability(tables || []);
					return;
				}

				setLoadingTables(true);
				try {
					const restaurantId = activeReservation.restaurantId;
					if (!restaurantId) {
						setTablesWithAvailability(tables || []);
						return;
					}

					// Formater la date en ISO
					const dateISO = new Date(activeReservation.reservationDate)
						.toISOString()
						.split("T")[0];
					const time = activeReservation.reservationTime;

					const enrichedTables = await authFetch(
						`/tables/restaurant/${restaurantId}/available?date=${dateISO}&time=${time}&excludeReservationId=${activeReservation._id}`,
					);

					setTablesWithAvailability(enrichedTables || tables || []);
				} catch (error) {
					console.error("❌ [ASSIGN] Erreur chargement disponibilité:", error);
					setTablesWithAvailability(tables || []);
				} finally {
					setLoadingTables(false);
				}
			};

			fetchTablesWithAvailability();
		}, [visible, activeReservation, tables, authFetch]);

		useEffect(() => {
			if (visible) {
				Animated.parallel([
					Animated.spring(scaleAnim, {
						toValue: 1,
						useNativeDriver: true,
						tension: 65,
						friction: 8,
					}),
					Animated.timing(opacityAnim, {
						toValue: 1,
						duration: 200,
						useNativeDriver: true,
					}),
				]).start();
			} else {
				scaleAnim.setValue(0.9);
				opacityAnim.setValue(0);
			}
		}, [visible, scaleAnim, opacityAnim]);

		// Guard clause
		if (!activeReservation || !visible) return null;

		const safeOnClose = onClose || (() => {});
		const safeTables = Array.isArray(tablesWithAvailability)
			? tablesWithAvailability
			: [];

		// Séparer les tables par disponibilité
		const availableTables = safeTables.filter(
			(t) => t.isAvailable || t._id === activeReservation?.tableId,
		);
		const occupiedTables = safeTables.filter(
			(t) => !t.isAvailable && t._id !== activeReservation?.tableId,
		);

		return (
			<Modal
				visible={visible}
				transparent
				animationType="none"
				onRequestClose={safeOnClose}
			>
				<TouchableWithoutFeedback onPress={safeOnClose}>
					<Animated.View
						style={[modalStyles.overlay, { opacity: opacityAnim }]}
					>
						<TouchableWithoutFeedback onPress={() => {}}>
							<Animated.View
								style={[
									modalStyles.modalContainer,
									{
										transform: [{ scale: scaleAnim }],
										opacity: opacityAnim,
									},
								]}
							>
								{/* Header */}
								<View style={modalStyles.header}>
									<View style={modalStyles.headerLeft}>
										<LinearGradient
											colors={[
												"rgba(14, 165, 233, 0.2)",
												"rgba(14, 165, 233, 0.05)",
											]}
											style={modalStyles.headerIconBg}
										>
											<Ionicons
												name="grid-outline"
												size={20}
												color={THEME.colors.primary.sky}
											/>
										</LinearGradient>
										<View>
											<Text style={modalStyles.modalTitle}>
												Assignation de table
											</Text>
											<Text style={modalStyles.modalSubtitle}>
												{activeReservation?.clientName || "Client"}
											</Text>
										</View>
									</View>
									<TouchableOpacity
										style={modalStyles.closeButton}
										onPress={safeOnClose}
									>
										<Ionicons
											name="close"
											size={22}
											color={THEME.colors.text.secondary}
										/>
									</TouchableOpacity>
								</View>

								{/* Divider */}
								<LinearGradient
									colors={[
										"transparent",
										THEME.colors.border.subtle,
										"transparent",
									]}
									start={{ x: 0, y: 0 }}
									end={{ x: 1, y: 0 }}
									style={modalStyles.divider}
								/>

								{/* Legend */}
								<View style={modalStyles.legend}>
									<View style={modalStyles.legendItem}>
										<View
											style={[
												modalStyles.legendDot,
												{ backgroundColor: THEME.colors.primary.amber },
											]}
										/>
										<Text style={modalStyles.legendText}>Assignée</Text>
									</View>
									<View style={modalStyles.legendItem}>
										<View
											style={[
												modalStyles.legendDot,
												{ backgroundColor: THEME.colors.status.success },
											]}
										/>
										<Text style={modalStyles.legendText}>Disponible</Text>
									</View>
									<View style={modalStyles.legendItem}>
										<View
											style={[
												modalStyles.legendDot,
												{ backgroundColor: THEME.colors.status.error },
											]}
										/>
										<Text style={modalStyles.legendText}>Occupée</Text>
									</View>
								</View>
								{/* ── IA Auto-Assign ─────────────────────────────────────────── */}
								{hasAiAutoAssign && (
									<View style={modalStyles.aiBar}>
										<TouchableOpacity
											style={[
												modalStyles.aiButton,
												aiLoading.autoAssign && { opacity: 0.6 },
											]}
											onPress={handleAutoAssign}
											disabled={!!aiLoading.autoAssign}
										>
											{aiLoading.autoAssign ? (
												<ActivityIndicator size="small" color="#F59E0B" />
											) : (
												<Ionicons
													name="color-wand-outline"
													size={15}
													color="#F59E0B"
												/>
											)}
											<Text style={modalStyles.aiButtonText}>
												{aiLoading.autoAssign
													? "Analyse en cours…"
													: "Assigner automatiquement"}
											</Text>
										</TouchableOpacity>

										{aiSuggestion && (
											<TouchableOpacity
												style={modalStyles.aiResultCard}
												onPress={() =>
													onAssignTable?.(
														activeReservation._id,
														aiSuggestion.tableId,
													)
												}
											>
												<View style={modalStyles.aiResultLeft}>
													<Ionicons name="sparkles" size={14} color="#F59E0B" />
													<Text style={modalStyles.aiResultTable}>
														Table {aiSuggestion.tableName}
													</Text>
													<Text style={modalStyles.aiResultCapacity}>
														{aiSuggestion.capacity} pers.
													</Text>
												</View>
												<View style={modalStyles.aiResultRight}>
													<Text
														style={modalStyles.aiResultReason}
														numberOfLines={1}
													>
														{aiSuggestion.reason}
													</Text>
													<Text style={modalStyles.aiResultConfirm}>
														Confirmer →
													</Text>
												</View>
											</TouchableOpacity>
										)}
									</View>
								)}
								{/* Tables Grid */}
								<ScrollView
									style={modalStyles.tablesScroll}
									contentContainerStyle={modalStyles.tablesContainer}
									showsVerticalScrollIndicator={false}
								>
									{/* Available Tables Section */}
									{availableTables.length > 0 && (
										<>
											<Text style={modalStyles.sectionTitle}>
												Tables disponibles ({availableTables.length})
											</Text>
											<View style={modalStyles.tablesGrid}>
												{availableTables.map((table) => {
													if (!table) return null;
													const isAssignedToCurrent =
														table._id === activeReservation?.tableId;

													return (
														<TableButton
															key={table._id || Math.random().toString()}
															table={table}
															isAssignedToCurrent={isAssignedToCurrent}
															isAvailable={true}
															THEME={THEME}
															tableStyles={tableStyles}
															onPress={() => {
																if (onAssignTable && activeReservation?._id) {
																	onAssignTable(
																		activeReservation._id,
																		table._id,
																	);
																}
															}}
														/>
													);
												})}
											</View>
										</>
									)}

									{/* Occupied Tables Section */}
									{occupiedTables.length > 0 && (
										<>
											<Text
												style={[
													modalStyles.sectionTitle,
													{ marginTop: THEME.spacing.md },
												]}
											>
												Tables occupées ({occupiedTables.length})
											</Text>
											<View style={modalStyles.tablesGrid}>
												{occupiedTables.map((table) => {
													if (!table) return null;
													return (
														<TableButton
															key={table._id || Math.random().toString()}
															table={table}
															isAssignedToCurrent={false}
															isAvailable={false}
															THEME={THEME}
															tableStyles={tableStyles}
															onPress={() => {}}
														/>
													);
												})}
											</View>
										</>
									)}
								</ScrollView>

								{/* Footer */}
								<TouchableOpacity
									style={modalStyles.footerButton}
									onPress={safeOnClose}
								>
									<Ionicons
										name="chevron-back"
										size={18}
										color={THEME.colors.text.secondary}
									/>
									<Text style={modalStyles.footerButtonText}>Fermer</Text>
								</TouchableOpacity>
							</Animated.View>
						</TouchableWithoutFeedback>
					</Animated.View>
				</TouchableWithoutFeedback>
			</Modal>
		);
	},
);

AssignTableModal.displayName = "AssignTableModal";

// ─────────────── Table Button Styles ───────────────
const createTableStyles = (THEME) =>
	StyleSheet.create({
		tableButton: {
			width: 72,
			height: 72,
			borderRadius: THEME.radius.lg,
			borderWidth: 2,
			alignItems: "center",
			justifyContent: "center",
			margin: THEME.spacing.xs,
		},
		tableNumber: {
			fontSize: 18,
			fontWeight: "700",
		},
		tableCapacity: {
			fontSize: 10,
			fontWeight: "500",
			opacity: 0.8,
		},
	});

// ─────────────── Modal Styles Premium ───────────────
const createModalStyles = (THEME) =>
	StyleSheet.create({
		overlay: {
			flex: 1,
			backgroundColor: "rgba(0, 0, 0, 0.75)",
			justifyContent: "center",
			alignItems: "center",
		},
		modalContainer: {
			width: 380,
			maxHeight: "80%",
			backgroundColor: THEME.colors.background.card,
			borderRadius: THEME.radius.xl,
			borderWidth: 1,
			borderColor: THEME.colors.border.subtle,
			overflow: "hidden",
			shadowColor: "#000",
			shadowOffset: { width: 0, height: 10 },
			shadowOpacity: 0.3,
			shadowRadius: 20,
			elevation: 10,
		},
		header: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
			padding: THEME.spacing.lg,
		},
		headerLeft: {
			flexDirection: "row",
			alignItems: "center",
		},
		headerIconBg: {
			width: 44,
			height: 44,
			borderRadius: THEME.radius.md,
			alignItems: "center",
			justifyContent: "center",
			marginRight: THEME.spacing.md,
		},
		modalTitle: {
			fontSize: THEME.typography.sizes.lg,
			fontWeight: THEME.typography.weights.bold,
			color: THEME.colors.text.primary,
		},
		modalSubtitle: {
			fontSize: THEME.typography.sizes.sm,
			color: THEME.colors.text.secondary,
			marginTop: 2,
		},
		closeButton: {
			width: 36,
			height: 36,
			borderRadius: 18,
			backgroundColor: THEME.colors.background.elevated,
			alignItems: "center",
			justifyContent: "center",
		},
		divider: {
			height: 1,
			marginHorizontal: THEME.spacing.lg,
		},
		legend: {
			flexDirection: "row",
			justifyContent: "center",
			gap: THEME.spacing.lg,
			paddingVertical: THEME.spacing.md,
			paddingHorizontal: THEME.spacing.lg,
		},
		legendItem: {
			flexDirection: "row",
			alignItems: "center",
			gap: THEME.spacing.xs,
		},
		legendDot: {
			width: 10,
			height: 10,
			borderRadius: 5,
		},
		legendText: {
			fontSize: 12,
			color: THEME.colors.text.muted,
		},
		tablesScroll: {
			maxHeight: 300,
		},
		tablesContainer: {
			paddingHorizontal: THEME.spacing.lg,
			paddingBottom: THEME.spacing.md,
		},
		sectionTitle: {
			fontSize: THEME.typography.sizes.sm,
			fontWeight: THEME.typography.weights.semibold,
			color: THEME.colors.text.secondary,
			marginBottom: THEME.spacing.sm,
		},
		tablesGrid: {
			flexDirection: "row",
			flexWrap: "wrap",
			justifyContent: "flex-start",
		},
		footerButton: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "center",
			paddingVertical: THEME.spacing.lg,
			borderTopWidth: 1,
			borderTopColor: THEME.colors.border.subtle,
			gap: THEME.spacing.xs,
		},
		footerButtonText: {
			fontSize: THEME.typography.sizes.md,
			color: THEME.colors.text.secondary,
			fontWeight: THEME.typography.weights.medium,
		},
		// ── IA Styles ──────────────────────────────────────────────────────
		aiBar: {
			paddingHorizontal: THEME.spacing.lg,
			paddingBottom: THEME.spacing.sm,
			gap: THEME.spacing.sm,
		},
		aiButton: {
			flexDirection: "row",
			alignItems: "center",
			gap: 6,
			backgroundColor: "rgba(245, 158, 11, 0.10)",
			borderWidth: 1,
			borderColor: "rgba(245, 158, 11, 0.28)",
			borderRadius: THEME.radius.md,
			paddingVertical: THEME.spacing.sm,
			paddingHorizontal: THEME.spacing.md,
			alignSelf: "flex-start",
		},
		aiButtonText: {
			fontSize: 13,
			fontWeight: "600",
			color: "#F59E0B",
		},
		aiResultCard: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "space-between",
			backgroundColor: "rgba(245, 158, 11, 0.08)",
			borderWidth: 1,
			borderColor: "rgba(245, 158, 11, 0.22)",
			borderRadius: THEME.radius.md,
			paddingVertical: THEME.spacing.sm,
			paddingHorizontal: THEME.spacing.md,
		},
		aiResultLeft: {
			flexDirection: "row",
			alignItems: "center",
			gap: 6,
		},
		aiResultTable: {
			fontSize: 14,
			fontWeight: "700",
			color: "#F59E0B",
		},
		aiResultCapacity: {
			fontSize: 11,
			color: THEME.colors.text.muted,
		},
		aiResultRight: {
			flex: 1,
			marginLeft: THEME.spacing.sm,
			alignItems: "flex-end",
		},
		aiResultReason: {
			fontSize: 11,
			color: THEME.colors.text.muted,
			textAlign: "right",
		},
		aiResultConfirm: {
			fontSize: 12,
			fontWeight: "600",
			color: "#F59E0B",
			marginTop: 2,
		},
	});

export default AssignTableModal;

/**
 * 🎨 Dashboard - Écran principal des réservations
 * Design spatial avec gradients et animations fluides
 */
import React, {
	useState,
	useCallback,
	useRef,
	useMemo,
	useEffect,
} from "react";
import useUserStore from "../../src/stores/useUserStore";
import {
	View,
	FlatList,
	Text,
	StyleSheet,
	Animated,
	TouchableOpacity,
	Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import ReservationCard from "../dashboard/ReservationCard";
import Filters from "../dashboard/Filters";
import DateNavigator from "../dashboard/DateNavigator";
import SettingsModal from "../dashboard/SettingsModal";
import NewReservationModal from "../dashboard/NewReservationModal";
import CreateFastFoodOrderModal from "../dashboard/CreateFastFoodOrderModal";
import AssignTableModal from "../dashboard/AssignTableModal";
import AuditLogModal from "../activity/modals/AuditLogModal";
import LoadingSkeleton from "../dashboard/LoadingSkeleton";
import ExpressOrders from "./ExpressOrders"; // 🏃 NOUVEAU
import FastFoodKitchen from "./FastFoodKitchen"; // 🍔 NOUVEAU
import { useDashboardData } from "../../hooks/useDashboardData";
import { useDashboardActions } from "../../hooks/useDashboardActions";
import { useDashboardFilters } from "../../hooks/useDashboardFilters";
import useThemeStore from "../../src/stores/useThemeStore";
import { useTheme } from "../../hooks/useTheme";
import { useFeatureLevel } from "../../src/stores/useFeatureLevelStore";

export default function Dashboard() {
	const category = useUserStore((state) => state.category);
	const {
		hasCalendrier,
		hasCommandesExpress,
		hasFabFastCommande,
		hasAutoTables,
		hasCuisine,
		isMinimum,
	} = useFeatureLevel();
	const { themeMode } = useThemeStore();
	const THEME = useTheme(); // Utilise le hook avec multiplicateur de police

	// Animation FAB
	const fabScaleAnim = useRef(new Animated.Value(1)).current;
	const fabRotateAnim = useRef(new Animated.Value(0)).current;

	// ─────────────── États Locaux ───────────────
	const [showSettingsModal, setShowSettingsModal] = useState(false);
	const [showNewReservationModal, setShowNewReservationModal] = useState(false);
	const [showAssignTableModal, setShowAssignTableModal] = useState(false);
	const [showExpressOrders, setShowExpressOrders] = useState(false); // 🏃 NOUVEAU pour Le Grillz
	const [showKitchen, setShowKitchen] = useState(false); // 🍔 Vue cuisine fast-food
	const [showFastFoodOrderModal, setShowFastFoodOrderModal] = useState(false);
	const [showAuditLog, setShowAuditLog] = useState(false);
	const [auditReservation, setAuditReservation] = useState(null);
	const [selectedReservation, setSelectedReservation] = useState(null);
	const [recreateData, setRecreateData] = useState(null); // ⭐ Données pour recréer une réservation
	const [selectedDate, setSelectedDate] = useState(new Date()); // 📅 Date sélectionnée pour le filtrage

	// Si pas de calendrier (foodtruck/snack), forcer la date à aujourd'hui
	useEffect(() => {
		if (!hasCalendrier) {
			const today = new Date();
			setSelectedDate(today);
		}
	}, [hasCalendrier]);

	// 🍔 Cuisine activée : afficher directement la vue Kitchen au montage
	useEffect(() => {
		if (hasCuisine) {
			setShowKitchen(true);
		}
	}, [hasCuisine]);

	// 🚐 Commandes Express activées : afficher directement les Commandes Express au montage
	useEffect(() => {
		if (hasCommandesExpress) {
			setShowExpressOrders(true);
		}
	}, [hasCommandesExpress]);

	// ─────────────── Hooks Custom ───────────────
	const { reservations, tables, theme, loading, fetchReservations } =
		useDashboardData();

	const localStyles = useMemo(() => createStyles(THEME), [THEME]);

	const {
		activeReservation,
		setActiveReservation,
		refreshActiveReservation,
		togglePresent,
		updateStatus,
		cancelReservation,
		deleteReservation,
		assignTable,
		updateReservationField,
		createReservation,
		payReservation,
	} = useDashboardActions(fetchReservations);

	const {
		filter,
		filteredReservations,
		changeFilter,
		searchQuery,
		setSearchQuery,
	} = useDashboardFilters(reservations, selectedDate);

	// ─────────────── Callbacks ───────────────
	const handleOpenSettings = useCallback((reservation) => {
		setSelectedReservation(reservation);
		setShowSettingsModal(true);
	}, []);

	const handleCloseSettings = useCallback(() => {
		setShowSettingsModal(false);
		setSelectedReservation(null);
	}, []);

	// 🏃 Handler pour les filtres avec gestion spéciale pour "express" et "cuisine"
	const handleFilterChange = useCallback(
		(newFilter) => {
			if (newFilter === "express") {
				// ExpressOrders : pour tous les foodtrucks ET pour Le Grillz spécifiquement
				setShowExpressOrders(true);
			} else if (newFilter === "cuisine") {
				// Ouvrir la vue cuisine pour les fast-foods
				setShowKitchen(true);
			} else {
				// Revenir à la liste normale si on change de filtre
				setShowExpressOrders(false);
				setShowKitchen(false);
				changeFilter(newFilter);
			}
		},
		[changeFilter],
	);

	// ⭐ Handler pour recréer une réservation
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

	// ⭐ Fermer le modal de nouvelle réservation et reset recreateData
	const handleCloseNewReservation = useCallback(() => {
		setShowNewReservationModal(false);
		setRecreateData(null);
	}, []);

	const handleTogglePresent = useCallback(
		async (id) => {
			const success = await togglePresent(id);
			if (success) {
				handleCloseSettings();
			}
		},
		[togglePresent, handleCloseSettings],
	);

	const handleUpdateStatus = useCallback(
		async (id, status, reservation) => {
			// ⭐ Vérifier que la réservation est pour aujourd'hui avant d'ouvrir
			if (status === "ouverte" && reservation?.reservationDate) {
				const today = new Date();
				today.setHours(0, 0, 0, 0);
				const resaDate = new Date(reservation.reservationDate);
				resaDate.setHours(0, 0, 0, 0);

				if (resaDate.getTime() !== today.getTime()) {
					const formattedDate = new Date(
						reservation.reservationDate,
					).toLocaleDateString("fr-FR", {
						weekday: "long",
						day: "numeric",
						month: "long",
					});

					return new Promise((resolve) => {
						Alert.alert(
							"Réservation pas pour aujourd'hui",
							`Cette réservation est prévue pour le ${formattedDate}.\n\nSouhaitez-vous créer une réservation pour aujourd'hui avec les informations de ce client ?`,
							[
								{
									text: "Non",
									style: "cancel",
									onPress: () => resolve(false),
								},
								{
									text: "Oui, créer pour aujourd'hui",
									onPress: () => {
										handleCloseSettings();
										handleRecreateReservation(reservation);
										resolve(false);
									},
								},
							],
						);
					});
				}
			}

			const success = await updateStatus(id, status, reservation);
			if (success) {
				handleCloseSettings();
			}
		},
		[updateStatus, handleCloseSettings, handleRecreateReservation],
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
			if (success) {
				handleCloseSettings();
			}
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

	// ⭐ Handler pour éditer le nombre de personnes
	const handleEditNbPersonnes = useCallback(
		(reservation) => {
			Alert.prompt(
				"Nombre de personnes",
				"Entrez le nouveau nombre de personnes :",
				[
					{ text: "Annuler", style: "cancel" },
					{
						text: "OK",
						onPress: async (value) => {
							const nb = parseInt(value, 10);
							if (!isNaN(nb) && nb > 0) {
								await updateReservationField(
									reservation._id,
									"nbPersonnes",
									nb,
								);
							} else {
								Alert.alert("Erreur", "Veuillez entrer un nombre valide");
							}
						},
					},
				],
				"plain-text",
				String(reservation.nbPersonnes || 1),
				"number-pad",
			);
		},
		[updateReservationField],
	);

	// ⭐ Handler pour éditer le téléphone
	const handleEditPhone = useCallback(
		(reservation) => {
			Alert.prompt(
				"Numéro de téléphone",
				"Entrez le nouveau numéro :",
				[
					{ text: "Annuler", style: "cancel" },
					{
						text: "OK",
						onPress: async (value) => {
							if (value && value.trim()) {
								await updateReservationField(
									reservation._id,
									"phone",
									value.trim(),
								);
							}
						},
					},
				],
				"plain-text",
				reservation.phone || "",
				"phone-pad",
			);
		},
		[updateReservationField],
	);

	const handleCloseAssignTable = useCallback(() => {
		setShowAssignTableModal(false);
		setActiveReservation(null);
	}, [setActiveReservation]);

	const handleAssignTable = useCallback(
		async (reservationId, tableId) => {
			const success = await assignTable(reservationId, tableId);
			if (success) {
				handleCloseAssignTable();
			}
		},
		[assignTable, handleCloseAssignTable],
	);

	const handleCreateReservation = useCallback(
		async (formData) => {
			const success = await createReservation(formData);
			if (success) {
				setShowNewReservationModal(false);
				// ⭐ Changer la date sélectionnée vers la date de la réservation créée
				if (formData.reservationDate) {
					const newDate = new Date(formData.reservationDate);
					setSelectedDate(newDate);
				}
			}
			return success;
		},
		[createReservation],
	);

	// ─────────────── Render Item FlatList ───────────────
	const renderReservationCard = useCallback(
		({ item }) => (
			<ReservationCard
				reservation={item}
				onSettingsPress={handleOpenSettings}
				onAssignTablePress={hasAutoTables ? handleOpenAssignTable : undefined}
				onEditNbPersonnes={handleEditNbPersonnes}
				onEditPhone={handleEditPhone}
				onAuditPress={(resa) => {
					setAuditReservation(resa);
					setShowAuditLog(true);
				}}
				theme={theme}
			/>
		),
		[
			handleOpenSettings,
			handleOpenAssignTable,
			handleEditNbPersonnes,
			handleEditPhone,
			theme,
			hasAutoTables,
		],
	);

	const keyExtractor = useCallback((item) => item._id, []);

	const ListEmptyComponent = useCallback(
		() => (
			<View style={localStyles.emptyContainer}>
				<Ionicons
					name="calendar-outline"
					size={64}
					color={THEME.colors.text.muted}
				/>
				<Text style={localStyles.emptyTitle}>Aucune réservation</Text>
				<Text style={localStyles.emptySubtitle}>
					Les réservations pour ce filtre apparaîtront ici
				</Text>
			</View>
		),
		[THEME, localStyles],
	);

	// FAB animations
	const handleFabPressIn = () => {
		Animated.parallel([
			Animated.spring(fabScaleAnim, {
				toValue: 0.9,
				friction: 5,
				useNativeDriver: true,
			}),
			Animated.timing(fabRotateAnim, {
				toValue: 1,
				duration: 150,
				useNativeDriver: true,
			}),
		]).start();
	};

	const handleFabPressOut = () => {
		Animated.parallel([
			Animated.spring(fabScaleAnim, {
				toValue: 1,
				friction: 5,
				useNativeDriver: true,
			}),
			Animated.timing(fabRotateAnim, {
				toValue: 0,
				duration: 150,
				useNativeDriver: true,
			}),
		]).start();
	};

	const fabRotation = fabRotateAnim.interpolate({
		inputRange: [0, 1],
		outputRange: ["0deg", "45deg"],
	});

	// ─────────────── Render ───────────────
	return (
		<View style={localStyles.container}>
			{/* Background ambient effects */}
			<View style={StyleSheet.absoluteFill}>
				<LinearGradient
					colors={["rgba(245, 158, 11, 0.08)", "transparent"]}
					style={localStyles.ambientGlow1}
				/>
				<LinearGradient
					colors={["rgba(14, 165, 233, 0.06)", "transparent"]}
					style={localStyles.ambientGlow2}
				/>
			</View>

			{/* Filtres */}
			<Filters
				activeFilter={showKitchen && hasCuisine ? "cuisine" : filter}
				onFilterChange={handleFilterChange}
				searchQuery={searchQuery}
				onSearchChange={setSearchQuery}
				theme={theme}
			/>

			{/* 🏃 Screen ExpressOrders (foodtruck = vue par défaut, autre = filtre express) */}
			{showExpressOrders ? (
				<View style={{ flex: 1 }}>
					<ExpressOrders />
				</View>
			) : showKitchen ? (
				<View style={{ flex: 1 }}>
					{/* Bouton Retour — masqué en mode cuisine FastFood (vue unique) */}
					{!hasCuisine && (
						<View style={localStyles.expressHeader}>
							<TouchableOpacity
								onPress={() => {
									setShowKitchen(false);
									changeFilter("actives");
								}}
								style={localStyles.backButton}
							>
								<Ionicons
									name="arrow-back"
									size={20}
									color={THEME.colors.text.secondary}
								/>
								<Text
									style={[
										localStyles.backButtonText,
										{ color: THEME.colors.text.secondary },
									]}
								>
									Retour
								</Text>
							</TouchableOpacity>
						</View>
					)}
					<FastFoodKitchen />
				</View>
			) : (
				<>
					{/* 📅 Navigateur de date */}
					{/* Afficher le DateNavigator seulement pour restaurants classiques */}
					{hasCalendrier && (
						<DateNavigator
							selectedDate={selectedDate}
							onDateChange={setSelectedDate}
							onAssignmentComplete={() => fetchReservations(true)}
						/>
					)}

					{/* Liste des réservations */}
					{loading ? (
						<LoadingSkeleton theme={theme} count={6} />
					) : (
						<FlatList
							data={filteredReservations}
							renderItem={renderReservationCard}
							keyExtractor={keyExtractor}
							numColumns={2}
							contentContainerStyle={localStyles.listContent}
							ListEmptyComponent={ListEmptyComponent}
							initialNumToRender={10}
							maxToRenderPerBatch={10}
							windowSize={5}
							removeClippedSubviews={true}
							showsVerticalScrollIndicator={false}
						/>
					)}
				</>
			)}

			{/* FAB Premium */}
			{!isMinimum && (
				<Animated.View
					style={[
						localStyles.fabContainer,
						{ transform: [{ scale: fabScaleAnim }] },
					]}
				>
					<TouchableOpacity
						onPress={() => {
							if (hasFabFastCommande) {
								setShowFastFoodOrderModal(true);
							} else {
								setShowNewReservationModal(true);
							}
						}}
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
			)}

			{/* Modales */}
			<SettingsModal
				visible={showSettingsModal}
				onClose={handleCloseSettings}
				reservation={selectedReservation}
				theme={theme}
				onTogglePresent={handleTogglePresent}
				onUpdateStatus={handleUpdateStatus}
				onCancel={handleCancel}
				onRecreate={handleRecreateReservation}
				onPayReservation={handlePayReservation}
				onDelete={handleDelete}
			/>

			<NewReservationModal
				visible={showNewReservationModal}
				onClose={handleCloseNewReservation}
				onCreate={handleCreateReservation}
				tables={tables}
				theme={theme}
				initialData={recreateData}
			/>

			<AssignTableModal
				visible={showAssignTableModal && hasAutoTables}
				onClose={handleCloseAssignTable}
				tables={tables}
				activeReservation={activeReservation}
				onAssignTable={handleAssignTable}
				theme={theme}
			/>

			{/* 🍔 Modale commande fast-food */}
			<CreateFastFoodOrderModal
				visible={showFastFoodOrderModal}
				onClose={() => setShowFastFoodOrderModal(false)}
				onCreated={() => {
					setShowFastFoodOrderModal(false);
					fetchReservations(true);
				}}
			/>

			{/* ⭐ Modale audit */}
			<AuditLogModal
				visible={showAuditLog}
				onClose={() => {
					setShowAuditLog(false);
					setAuditReservation(null);
				}}
				reservation={auditReservation}
				theme={THEME}
			/>
		</View>
	);
}

// ─────────────── Styles Locaux ───────────────
const createStyles = (THEME) =>
	StyleSheet.create({
		container: {
			flex: 1,
			backgroundColor: THEME.colors.background.dark,
		},
		ambientGlow1: {
			position: "absolute",
			top: -100,
			left: -100,
			width: 400,
			height: 400,
			borderRadius: 200,
			opacity: 0.5,
		},
		ambientGlow2: {
			position: "absolute",
			bottom: -50,
			right: -100,
			width: 300,
			height: 300,
			borderRadius: 150,
			opacity: 0.5,
		},
		listContent: {
			paddingHorizontal: 12,
			paddingVertical: 16,
			paddingBottom: 100,
		},
		emptyContainer: {
			flex: 1,
			alignItems: "center",
			justifyContent: "center",
			paddingVertical: 80,
		},
		emptyIconContainer: {
			width: 80,
			height: 80,
			borderRadius: 40,
			backgroundColor: THEME.colors.background.elevated,
			alignItems: "center",
			justifyContent: "center",
			marginBottom: 16,
			borderWidth: 1,
			borderColor: THEME.colors.border.subtle,
		},
		emptyTitle: {
			fontSize: 18,
			fontWeight: "700",
			color: THEME.colors.text.primary,
			marginTop: 16,
			marginBottom: 8,
		},
		emptySubtitle: {
			fontSize: 14,
			color: THEME.colors.text.muted,
			textAlign: "center",
			paddingHorizontal: 32,
		},
		emptyText: {
			fontSize: 17,
			fontWeight: "600",
			color: THEME.colors.text.secondary,
			marginBottom: 4,
		},
		emptySubtext: {
			fontSize: 14,
			color: THEME.colors.text.muted,
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
			shadowColor: THEME.colors.primary.amber,
			shadowOffset: { width: 0, height: 4 },
			shadowOpacity: 0.4,
			shadowRadius: 12,
			elevation: 8,
		},
		// 🏃 Styles pour ExpressOrders
		expressHeader: {
			paddingHorizontal: 16,
			paddingVertical: 12,
			borderBottomWidth: 1,
			borderBottomColor: THEME.colors.border.subtle,
		},
		backButton: {
			flexDirection: "row",
			alignItems: "center",
		},
		backButtonText: {
			fontSize: 16,
			fontWeight: "500",
			marginLeft: 8,
		},
	});

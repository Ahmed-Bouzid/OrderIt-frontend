/**
 * 🎨 Dashboard - Écran principal des réservations
 * Design spatial avec gradients et animations fluides
 */
import React, { useState, useCallback, useRef, useMemo } from "react";
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
import ReservationCard from "../dashboard/ReservationCard";
import Filters from "../dashboard/Filters";
import DateNavigator from "../dashboard/DateNavigator";
import SettingsModal from "../dashboard/SettingsModal";
import NewReservationModal from "../dashboard/NewReservationModal";
import AssignTableModal from "../dashboard/AssignTableModal";
import LoadingSkeleton from "../dashboard/LoadingSkeleton";
import { useDashboardData } from "../../hooks/useDashboardData";
import { useDashboardActions } from "../../hooks/useDashboardActions";
import { useDashboardFilters } from "../../hooks/useDashboardFilters";
import useThemeStore from "../../src/stores/useThemeStore";
import { useTheme } from "../../hooks/useTheme";

export default function Dashboard() {
	const { themeMode } = useThemeStore();
	const THEME = useTheme(); // Utilise le hook avec multiplicateur de police

	// Animation FAB
	const fabScaleAnim = useRef(new Animated.Value(1)).current;
	const fabRotateAnim = useRef(new Animated.Value(0)).current;

	// ─────────────── États Locaux ───────────────
	const [showSettingsModal, setShowSettingsModal] = useState(false);
	const [showNewReservationModal, setShowNewReservationModal] = useState(false);
	const [showAssignTableModal, setShowAssignTableModal] = useState(false);
	const [selectedReservation, setSelectedReservation] = useState(null);
	const [recreateData, setRecreateData] = useState(null); // ⭐ Données pour recréer une réservation
	const [selectedDate, setSelectedDate] = useState(new Date()); // 📅 Date sélectionnée pour le filtrage

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
		assignTable,
		updateReservationField,
		createReservation,
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
		console.log("🔍 Ouverture settings pour:", {
			status: reservation?.status,
			isPresent: reservation?.isPresent,
			clientName: reservation?.clientName,
		});
		setSelectedReservation(reservation);
		setShowSettingsModal(true);
	}, []);

	const handleCloseSettings = useCallback(() => {
		setShowSettingsModal(false);
		setSelectedReservation(null);
	}, []);

	// ⭐ Handler pour recréer une réservation
	const handleRecreateReservation = useCallback((reservation) => {
		console.log("🔄 Recréation réservation:", reservation.clientName);
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
		[togglePresent, handleCloseSettings]
	);

	const handleUpdateStatus = useCallback(
		async (id, status, reservation) => {
			const success = await updateStatus(id, status, reservation);
			if (success) {
				handleCloseSettings();
			}
		},
		[updateStatus, handleCloseSettings]
	);

	const handleCancel = useCallback(
		async (id) => {
			await cancelReservation(id);
			handleCloseSettings();
		},
		[cancelReservation, handleCloseSettings]
	);

	const handleOpenAssignTable = useCallback(
		async (reservation) => {
			await refreshActiveReservation(reservation._id);
			setShowAssignTableModal(true);
		},
		[refreshActiveReservation]
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
									nb
								);
							} else {
								Alert.alert("Erreur", "Veuillez entrer un nombre valide");
							}
						},
					},
				],
				"plain-text",
				String(reservation.nbPersonnes || 1),
				"number-pad"
			);
		},
		[updateReservationField]
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
									value.trim()
								);
							}
						},
					},
				],
				"plain-text",
				reservation.phone || "",
				"phone-pad"
			);
		},
		[updateReservationField]
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
		[assignTable, handleCloseAssignTable]
	);

	const handleCreateReservation = useCallback(
		async (formData) => {
			const success = await createReservation(formData);
			if (success) {
				setShowNewReservationModal(false);
			}
			return success;
		},
		[createReservation]
	);

	// ─────────────── Render Item FlatList ───────────────
	const renderReservationCard = useCallback(
		({ item }) => (
			<ReservationCard
				reservation={item}
				onSettingsPress={handleOpenSettings}
				onAssignTablePress={handleOpenAssignTable}
				onEditNbPersonnes={handleEditNbPersonnes}
				onEditPhone={handleEditPhone}
				theme={theme}
			/>
		),
		[
			handleOpenSettings,
			handleOpenAssignTable,
			handleEditNbPersonnes,
			handleEditPhone,
			theme,
		]
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
		[THEME, localStyles]
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
				activeFilter={filter}
				onFilterChange={changeFilter}
				searchQuery={searchQuery}
				onSearchChange={setSearchQuery}
				theme={theme}
			/>

			{/* 📅 Navigateur de date */}
			<DateNavigator
				selectedDate={selectedDate}
				onDateChange={setSelectedDate}
			/>

			{/* Liste des réservations avec FlatList */}
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

			{/* FAB Premium */}
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
				visible={showAssignTableModal}
				onClose={handleCloseAssignTable}
				tables={tables}
				activeReservation={activeReservation}
				onAssignTable={handleAssignTable}
				theme={theme}
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
	});

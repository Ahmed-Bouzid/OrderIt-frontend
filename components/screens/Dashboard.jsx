import React, { useState, useCallback } from "react";
import { View, FlatList, Text } from "react-native";
import DraggableButton from "../ui/draggableButton";
import ReservationCard from "../dashboard/ReservationCard";
import Filters from "../dashboard/Filters";
import SettingsModal from "../dashboard/SettingsModal";
import NewReservationModal from "../dashboard/NewReservationModal";
import AssignTableModal from "../dashboard/AssignTableModal";
import LoadingSkeleton from "../dashboard/LoadingSkeleton";
import { useDashboardData } from "../../hooks/useDashboardData";
import { useDashboardActions } from "../../hooks/useDashboardActions";
import { useDashboardFilters } from "../../hooks/useDashboardFilters";

export default function Dashboard() {
	// ─────────────── Hooks Custom ───────────────
	const { reservations, tables, theme, loading, fetchReservations } =
		useDashboardData();

	const {
		activeReservation,
		setActiveReservation,
		refreshActiveReservation,
		togglePresent,
		updateStatus,
		cancelReservation,
		assignTable,
		createReservation,
	} = useDashboardActions(fetchReservations);

	const { filter, filteredReservations, changeFilter } =
		useDashboardFilters(reservations);

	// ─────────────── États Locaux ───────────────
	const [showSettingsModal, setShowSettingsModal] = useState(false);
	const [showNewReservationModal, setShowNewReservationModal] = useState(false);
	const [showAssignTableModal, setShowAssignTableModal] = useState(false);
	const [selectedReservation, setSelectedReservation] = useState(null);

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
				theme={theme}
			/>
		),
		[handleOpenSettings, handleOpenAssignTable, theme]
	);

	const keyExtractor = useCallback((item) => item._id, []);

	const ListEmptyComponent = useCallback(
		() => (
			<View style={{ padding: 20, alignItems: "center" }}>
				<Text
					style={{
						fontSize: 16,
						color: theme.textColor,
						textAlign: "center",
					}}
				>
					Aucune réservation
				</Text>
			</View>
		),
		[theme]
	);

	// ─────────────── Render ───────────────
	return (
		<View style={{ flex: 1, backgroundColor: theme.backgroundColor }}>
			{/* Filtres */}
			<Filters
				activeFilter={filter}
				onFilterChange={changeFilter}
				theme={theme}
			/>

			{/* Liste des réservations avec FlatList */}
			{loading ? (
				<LoadingSkeleton theme={theme} count={5} />
			) : (
				<FlatList
					data={filteredReservations}
					renderItem={renderReservationCard}
					keyExtractor={keyExtractor}
					numColumns={2}
					contentContainerStyle={{
						paddingHorizontal: 10,
						paddingVertical: 10,
					}}
					ListEmptyComponent={ListEmptyComponent}
					initialNumToRender={10}
					maxToRenderPerBatch={10}
					windowSize={5}
					removeClippedSubviews={true}
				/>
			)}

			{/* Bouton flottant */}
			<DraggableButton
				onPress={() => setShowNewReservationModal(true)}
				color="#b87a23ff"
				initialPosition={{ bottom: 24, right: 24 }}
			/>

			{/* Modales */}
			<SettingsModal
				visible={showSettingsModal}
				onClose={handleCloseSettings}
				reservation={selectedReservation}
				theme={theme}
				onTogglePresent={handleTogglePresent}
				onUpdateStatus={handleUpdateStatus}
				onCancel={handleCancel}
			/>

			<NewReservationModal
				visible={showNewReservationModal}
				onClose={() => setShowNewReservationModal(false)}
				onCreate={handleCreateReservation}
				tables={tables}
				theme={theme}
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

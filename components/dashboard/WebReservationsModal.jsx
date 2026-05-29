/**
 * 📱 WebReservationsModal - Liste des réservations en ligne
 * Affichage type "inbox" des réservations "À distance"
 * Permet de consulter sans valider
 */
import React, { useMemo } from "react";
import {
	View,
	Text,
	Modal,
	TouchableOpacity,
	FlatList,
	StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../../hooks/useTheme";
import useReservationStore from "../../src/stores/useReservationStore";
import useWebReservationStore from "../../src/stores/useWebReservationStore";

export default function WebReservationsModal({ visible, onClose }) {
	const THEME = useTheme();
	const reservations = useReservationStore((state) => state.reservations);
	const markAllAsSeen = useWebReservationStore((state) => state.markAllAsSeen);
	
	// Filtrer uniquement les réservations "À distance"
	const webReservations = useMemo(() => {
		return reservations
			.filter((r) => r.reservationSource === "À distance")
			.sort((a, b) => {
				// Trier par date de réservation (plus récent en premier)
				const dateA = new Date(a.reservationDate);
				const dateB = new Date(b.reservationDate);
				return dateB - dateA;
			});
	}, [reservations]);
	
	const handleClose = () => {
		// Marquer toutes comme vues au moment de la fermeture
		markAllAsSeen(reservations);
		onClose();
	};
	
	const formatDate = (dateString) => {
		const date = new Date(dateString);
		const days = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
		const months = [
			"jan", "fév", "mar", "avr", "mai", "juin",
			"juil", "août", "sep", "oct", "nov", "déc",
		];
		return `${days[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]}`;
	};
	
	const getStatusColor = (status) => {
		const statusMap = {
			"en attente": THEME.colors.status.warning,
			"present": THEME.colors.status.success,
			"terminée": THEME.colors.text.muted,
			"annulée": THEME.colors.status.error,
		};
		return statusMap[status] || THEME.colors.text.muted;
	};
	
	const renderItem = ({ item }) => {
		const statusColor = getStatusColor(item.status);
		
		return (
			<View style={[styles.itemCard, { backgroundColor: THEME.colors.background.elevated }]}>
				{/* Header */}
				<View style={styles.itemHeader}>
					<View style={styles.itemHeaderLeft}>
						<View style={[styles.statusDot, { backgroundColor: statusColor }]} />
						<Text style={[styles.clientName, { color: THEME.colors.text.primary }]}>
							{item.clientName}
						</Text>
					</View>
					<Text style={[styles.itemDate, { color: THEME.colors.text.muted }]}>
						{formatDate(item.reservationDate)}
					</Text>
				</View>
				
				{/* Body */}
				<View style={styles.itemBody}>
					<View style={styles.infoRow}>
						<Ionicons name="time-outline" size={14} color={THEME.colors.text.muted} />
						<Text style={[styles.infoText, { color: THEME.colors.text.secondary }]}>
							{item.reservationTime}
						</Text>
					</View>
					
					<View style={styles.infoRow}>
						<Ionicons name="people-outline" size={14} color={THEME.colors.text.muted} />
						<Text style={[styles.infoText, { color: THEME.colors.text.secondary }]}>
							{item.nbPersonnes} pers.
						</Text>
					</View>
					
					<View style={styles.infoRow}>
						<Ionicons name="call-outline" size={14} color={THEME.colors.text.muted} />
						<Text style={[styles.infoText, { color: THEME.colors.text.secondary }]}>
							{item.phone || "—"}
						</Text>
					</View>
				</View>
				
				{/* Notes si présentes */}
				{item.notes && (
					<View style={[styles.notesContainer, { backgroundColor: THEME.colors.background.card }]}>
						<Text style={[styles.notesText, { color: THEME.colors.text.muted }]}>
							{item.notes}
						</Text>
					</View>
				)}
				
				{/* Badge statut */}
				<View style={[styles.statusBadge, { backgroundColor: `${statusColor}15` }]}>
					<Text style={[styles.statusText, { color: statusColor }]}>
						{item.status}
					</Text>
				</View>
			</View>
		);
	};
	
	const styles = createStyles(THEME);
	
	return (
		<Modal
			visible={visible}
			animationType="slide"
			transparent={true}
			onRequestClose={handleClose}
		>
			<View style={styles.modalOverlay}>
				<View style={[styles.modalContainer, { backgroundColor: THEME.colors.background.base }]}>
					{/* Header */}
					<LinearGradient
						colors={[THEME.colors.primary.amber, THEME.colors.primary.dark]}
						start={{ x: 0, y: 0 }}
						end={{ x: 1, y: 0 }}
						style={styles.header}
					>
						<View style={styles.headerLeft}>
							<Ionicons name="globe-outline" size={24} color="#FFFFFF" />
							<Text style={styles.headerTitle}>Réservations en ligne</Text>
						</View>
						<TouchableOpacity onPress={handleClose} style={styles.closeButton}>
							<Ionicons name="close" size={24} color="#FFFFFF" />
						</TouchableOpacity>
					</LinearGradient>
					
					{/* Liste */}
					{webReservations.length === 0 ? (
						<View style={styles.emptyContainer}>
							<Ionicons
								name="checkmark-circle-outline"
								size={48}
								color={THEME.colors.text.muted}
							/>
							<Text style={[styles.emptyText, { color: THEME.colors.text.muted }]}>
								Aucune réservation en ligne
							</Text>
						</View>
					) : (
						<FlatList
							data={webReservations}
							renderItem={renderItem}
							keyExtractor={(item) => item._id}
							contentContainerStyle={styles.listContent}
							showsVerticalScrollIndicator={false}
						/>
					)}
				</View>
			</View>
		</Modal>
	);
}

const createStyles = (THEME) =>
	StyleSheet.create({
		modalOverlay: {
			flex: 1,
			backgroundColor: "rgba(0, 0, 0, 0.5)",
			justifyContent: "flex-end",
		},
		modalContainer: {
			height: "85%",
			borderTopLeftRadius: 24,
			borderTopRightRadius: 24,
			overflow: "hidden",
		},
		header: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "space-between",
			paddingHorizontal: 20,
			paddingVertical: 16,
		},
		headerLeft: {
			flexDirection: "row",
			alignItems: "center",
			gap: 12,
		},
		headerTitle: {
			fontSize: THEME.typography.size.lg,
			fontWeight: "700",
			color: "#FFFFFF",
		},
		closeButton: {
			padding: 4,
		},
		listContent: {
			padding: 16,
			gap: 12,
		},
		itemCard: {
			borderRadius: 12,
			padding: 16,
			gap: 12,
			shadowColor: "#000",
			shadowOffset: { width: 0, height: 2 },
			shadowOpacity: 0.05,
			shadowRadius: 4,
			elevation: 2,
		},
		itemHeader: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "space-between",
		},
		itemHeaderLeft: {
			flexDirection: "row",
			alignItems: "center",
			gap: 8,
		},
		statusDot: {
			width: 8,
			height: 8,
			borderRadius: 4,
		},
		clientName: {
			fontSize: THEME.typography.size.base,
			fontWeight: "700",
		},
		itemDate: {
			fontSize: THEME.typography.size.xs,
			fontWeight: "600",
			textTransform: "uppercase",
		},
		itemBody: {
			flexDirection: "row",
			flexWrap: "wrap",
			gap: 16,
		},
		infoRow: {
			flexDirection: "row",
			alignItems: "center",
			gap: 6,
		},
		infoText: {
			fontSize: THEME.typography.size.sm,
		},
		notesContainer: {
			padding: 10,
			borderRadius: 8,
		},
		notesText: {
			fontSize: THEME.typography.size.xs,
			lineHeight: 16,
		},
		statusBadge: {
			alignSelf: "flex-start",
			paddingHorizontal: 10,
			paddingVertical: 4,
			borderRadius: 12,
		},
		statusText: {
			fontSize: THEME.typography.size.xs,
			fontWeight: "700",
			textTransform: "uppercase",
		},
		emptyContainer: {
			flex: 1,
			alignItems: "center",
			justifyContent: "center",
			gap: 16,
		},
		emptyText: {
			fontSize: THEME.typography.size.base,
			fontWeight: "600",
		},
	});

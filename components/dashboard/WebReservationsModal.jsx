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
	TouchableWithoutFeedback,
	FlatList,
	StyleSheet,
	Animated,
} from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../../hooks/useTheme";
import useReservationStore from "../../src/stores/useReservationStore";
import useWebReservationStore from "../../src/stores/useWebReservationStore";

export default function WebReservationsModal({ visible, onClose }) {
	const THEME = useTheme();
	const reservations = useReservationStore((state) => state.reservations);
	const { seenIds, markAllAsSeen, markAsSeen } = useWebReservationStore((state) => ({
		seenIds: state.seenIds,
		markAllAsSeen: state.markAllAsSeen,
		markAsSeen: state.markAsSeen,
	}));
	
	// Filtrer uniquement les réservations "À distance" non vues
	const webReservations = useMemo(() => {
		return reservations
			.filter((r) => r.reservationSource === "À distance" && !seenIds.has(r._id)) // Exclure les vues
			.sort((a, b) => {
				// Trier par date de réservation (plus récent en premier)
				const dateA = new Date(a.reservationDate);
				const dateB = new Date(b.reservationDate);
				return dateB - dateA;
			});
	}, [reservations, seenIds]);
	
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

	const handleDismiss = (itemId) => {
		// Marquer comme vue pour la masquer définitivement
		markAsSeen(itemId);
	};

	const renderRightActions = (itemId) => {
		return (
			<TouchableOpacity
				style={[styles.deleteAction, { backgroundColor: THEME.colors.status.error }]}
				onPress={() => handleDismiss(itemId)}
			>
				<Ionicons name="trash-outline" size={22} color="#FFFFFF" />
				<Text style={styles.deleteText}>Masquer</Text>
			</TouchableOpacity>
		);
	};
	
	const renderItem = ({ item }) => {
		const statusColor = getStatusColor(item.status);
		const initials = item.clientName.charAt(0).toUpperCase();
		
		return (
			<Swipeable
				renderRightActions={() => renderRightActions(item._id)}
				overshootRight={false}
			>
				<TouchableOpacity 
					activeOpacity={0.7}
					style={[styles.mailItem, { backgroundColor: THEME.colors.background.elevated }]}
				>
				{/* Avatar avec initiale */}
				<View style={[styles.avatar, { backgroundColor: THEME.colors.primary.amber }]}>
					<Text style={styles.avatarText}>{initials}</Text>
				</View>
				
				{/* Contenu */}
				<View style={styles.mailContent}>
					{/* Première ligne : Nom + Date */}
					<View style={styles.mailHeader}>
						<Text 
							style={[styles.mailName, { color: THEME.colors.text.primary }]}
							numberOfLines={1}
						>
							{item.clientName}
						</Text>
						<Text style={[styles.mailDate, { color: THEME.colors.text.muted }]}>
							{formatDate(item.reservationDate)}
						</Text>
					</View>
					
					{/* Deuxième ligne : Heure + Personnes + Téléphone */}
					<Text 
						style={[styles.mailSubject, { color: THEME.colors.text.secondary }]}
						numberOfLines={1}
					>
						{item.reservationTime} • {item.nbPersonnes} pers. • {item.phone || "Pas de tél."}
					</Text>
					
					{/* Notes en aperçu si présentes */}
					{item.notes && (
						<Text 
							style={[styles.mailPreview, { color: THEME.colors.text.muted }]}
							numberOfLines={2}
						>
							{item.notes}
						</Text>
					)}
					
					{/* Badge statut discret */}
					<View style={styles.statusRow}>
						<View style={[styles.statusDot, { backgroundColor: statusColor }]} />
						<Text style={[styles.statusLabel, { color: statusColor }]}>
							{item.status}
						</Text>
					</View>
				</View>
				</TouchableOpacity>
			</Swipeable>
		);
	};
	
	const styles = createStyles(THEME);
	
	return (
		<Modal
			visible={visible}
			animationType="fade"
			transparent={true}
			onRequestClose={handleClose}
		>
			<TouchableOpacity 
				style={styles.modalOverlay}
				activeOpacity={1}
				onPress={handleClose}
			>
				<TouchableWithoutFeedback>
					<View style={[styles.modalContainer, { backgroundColor: THEME.colors.background.card }]}>
					{/* Header */}
					<LinearGradient
						colors={[THEME.colors.primary.amber, THEME.colors.primary.dark]}
						start={{ x: 0, y: 0 }}
						end={{ x: 1, y: 0 }}
						style={styles.header}
					>
						<View style={styles.headerLeft}>
							<Ionicons name="globe-outline" size={20} color="#FFFFFF" />
							<Text style={styles.headerTitle}>Réservations en ligne</Text>
						</View>
						<TouchableOpacity 
							onPress={handleClose} 
							style={styles.closeButton}
							hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
						>
							<View style={styles.closeButtonCircle}>
								<Ionicons name="close" size={20} color="#FFFFFF" />
							</View>
						</TouchableOpacity>

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
				</TouchableWithoutFeedback>
			</TouchableOpacity>
		</Modal>
	);
}

const createStyles = (THEME) =>
	StyleSheet.create({
		modalOverlay: {
			flex: 1,
			backgroundColor: "rgba(0, 0, 0, 0.75)",
			justifyContent: "center",
			alignItems: "center",
			paddingHorizontal: 20,
		},
		modalContainer: {
			width: "100%",
			maxWidth: 380,
			maxHeight: "60%",
			minHeight: 300,
			borderRadius: 16,
			overflow: "hidden",
			shadowColor: "#000",
			shadowOffset: { width: 0, height: 8 },
			shadowOpacity: 0.44,
			shadowRadius: 12,
			elevation: 16,
		},
		header: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "space-between",
			paddingHorizontal: 16,
			paddingVertical: 14,
		},
		headerLeft: {
			flexDirection: "row",
			alignItems: "center",
			gap: 10,
		},
		headerTitle: {
			fontSize: THEME.typography.sizes.base,
			fontWeight: "700",
			color: "#FFFFFF",
		},
		closeButton: {
			padding: 4,
			zIndex: 10,
		},
		closeButtonCircle: {
			width: 32,
			height: 32,
			borderRadius: 16,
			backgroundColor: "rgba(255, 255, 255, 0.2)",
			alignItems: "center",
			justifyContent: "center",
		},
		listContent: {
			paddingBottom: 8,
		},
		deleteAction: {
			justifyContent: "center",
			alignItems: "center",
			width: 80,
			paddingHorizontal: 12,
			gap: 4,
		},
		deleteText: {
			color: "#FFFFFF",
			fontSize: 12,
			fontWeight: "600",
		},
		// Style type Mail iOS
		mailItem: {
			flexDirection: "row",
			paddingVertical: 12,
			paddingHorizontal: 16,
			borderBottomWidth: 0.5,
			borderBottomColor: THEME.colors.text.muted + "20",
		},
		avatar: {
			width: 40,
			height: 40,
			borderRadius: 20,
			alignItems: "center",
			justifyContent: "center",
			marginRight: 12,
		},
		avatarText: {
			fontSize: 16,
			fontWeight: "700",
			color: "#FFFFFF",
		},
		mailContent: {
			flex: 1,
			gap: 4,
		},
		mailHeader: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
		},
		mailName: {
			fontSize: THEME.typography.sizes.base,
			fontWeight: "600",
			flex: 1,
			marginRight: 8,
		},
		mailDate: {
			fontSize: THEME.typography.sizes.xs,
			fontWeight: "400",
		},
		mailSubject: {
			fontSize: THEME.typography.sizes.sm,
			fontWeight: "500",
		},
		mailPreview: {
			fontSize: THEME.typography.sizes.xs,
			lineHeight: 16,
			fontStyle: "italic",
		},
		statusRow: {
			flexDirection: "row",
			alignItems: "center",
			gap: 6,
			marginTop: 2,
		},
		statusDot: {
			width: 6,
			height: 6,
			borderRadius: 3,
		},
		statusLabel: {
			fontSize: THEME.typography.sizes.xs,
			fontWeight: "600",
			textTransform: "capitalize",
		},
		emptyContainer: {
			flex: 1,
			alignItems: "center",
			justifyContent: "center",
			gap: 12,
			paddingHorizontal: 40,
		},
		emptyText: {
			fontSize: THEME.typography.sizes.sm,
			fontWeight: "500",
			textAlign: "center",
		},
	});

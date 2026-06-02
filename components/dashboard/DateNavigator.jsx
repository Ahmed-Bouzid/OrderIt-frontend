/**
 * 📅 DateNavigator - Composant de navigation par date
 * Affiche la date sélectionnée avec navigation jour par jour
 */
import React, { useState, useCallback, useEffect } from "react";
import {
	View,
	Text,
	TouchableOpacity,
	StyleSheet,
	Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../hooks/useTheme";
import DatePickerModal from "./DatePickerModal";
import AutoAssignModal from "./AutoAssignModal";
import WebReservationsModal from "./WebReservationsModal";
import { useAuthFetch } from "../../hooks/useAuthFetch";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_CONFIG } from "../../src/config/apiConfig";
import useReservationStore from "../../src/stores/useReservationStore";
import useWebReservationStore from "../../src/stores/useWebReservationStore";

export default function DateNavigator({
	selectedDate,
	onDateChange,
	onAssignmentComplete,
	onMonthlyCountsChange,
}) {
	const THEME = useTheme();
	const [showDatePicker, setShowDatePicker] = useState(false);
	const [monthlyReservationCounts, setMonthlyReservationCounts] = useState({});
	const [showAssistantMenu, setShowAssistantMenu] = useState(false);
	const [showAutoAssignModal, setShowAutoAssignModal] = useState(false);
	const [showWebReservationsModal, setShowWebReservationsModal] = useState(false);
	const authFetch = useAuthFetch();
	
	// 🔔 Stores pour notifications de réservations web
	const reservations = useReservationStore((state) => state.reservations);
	const { unreadCount, init, updateUnreadCount, isInitialized } = useWebReservationStore();
	
	// Initialiser le store au montage
	useEffect(() => {
		init();
	}, [init]);
	
	// Calculer le compteur non lus uniquement après initialisation
	useEffect(() => {
		// ✅ Attendre que le store soit initialisé depuis AsyncStorage
		if (!isInitialized) return;
		
		updateUnreadCount(reservations);
	}, [reservations, isInitialized, updateUnreadCount]);

	const fetchMonthlyCounts = useCallback(
		async (year, month) => {
			try {
				const restaurantId = await AsyncStorage.getItem("restaurantId");
				if (!restaurantId) return;
				const data = await authFetch(
					`${API_CONFIG.baseURL}/reservations/restaurant/${restaurantId}/monthly-counts?year=${year}&month=${month}`,
				);
				if (data && typeof data === "object") {
					setMonthlyReservationCounts(data);
					onMonthlyCountsChange?.(data);
				}
			} catch (_e) {
				// silencieux
			}
		},
		[authFetch, onMonthlyCountsChange],
	);

	// Formater la date en français : "Lundi 5 janvier"
	const formatDate = (date) => {
		const days = [
			"Dimanche",
			"Lundi",
			"Mardi",
			"Mercredi",
			"Jeudi",
			"Vendredi",
			"Samedi",
		];
		const months = [
			"janvier",
			"février",
			"mars",
			"avril",
			"mai",
			"juin",
			"juillet",
			"août",
			"septembre",
			"octobre",
			"novembre",
			"décembre",
		];

		const dayName = days[date.getDay()];
		const day = date.getDate();
		const monthName = months[date.getMonth()];

		return `${dayName} ${day} ${monthName}`;
	};

	// Navigation jour précédent
	const handlePreviousDay = () => {
		const newDate = new Date(selectedDate);
		newDate.setDate(newDate.getDate() - 1);
		onDateChange(newDate);
	};

	// Navigation jour suivant
	const handleNextDay = () => {
		const newDate = new Date(selectedDate);
		newDate.setDate(newDate.getDate() + 1);
		onDateChange(newDate);
	};

	// Ouvrir le modal d'attribution automatique
	const handleAutoAssign = () => {
		setShowAssistantMenu(false);
		setShowAutoAssignModal(true);
	};

	const styles = createStyles(THEME);

	return (
		<>
			{/* Overlay pour fermer le menu */}
			{showAssistantMenu && (
				<TouchableOpacity
					style={styles.overlay}
					activeOpacity={1}
					onPress={() => setShowAssistantMenu(false)}
				/>
			)}

			<View style={styles.container}>
				{/* 🔔 Bouton Notifications Réservations Web */}
				<View style={styles.notificationContainer}>
					<TouchableOpacity
						style={[
							styles.notificationButton,
							unreadCount > 0 && styles.notificationButtonActive,
						]}
						onPress={() => setShowWebReservationsModal(true)}
						activeOpacity={0.7}
					>
						<Ionicons
							name={unreadCount > 0 ? "notifications" : "notifications-outline"}
							size={22}
							color={unreadCount > 0 ? THEME.colors.primary.amber : THEME.colors.text.muted}
						/>
						{unreadCount > 0 && (
							<View style={styles.badge}>
								<Text style={styles.badgeText}>{unreadCount}</Text>
							</View>
						)}
					</TouchableOpacity>
				</View>
				
				<TouchableOpacity
					style={styles.arrowButton}
					onPress={handlePreviousDay}
					activeOpacity={0.7}
				>
					<Ionicons
						name="chevron-back"
						size={22}
						color={THEME.colors.primary.amber}
					/>
				</TouchableOpacity>

				<TouchableOpacity
					style={styles.dateButton}
					onPress={() => {
						setShowDatePicker(true);
						const d = selectedDate || new Date();
						fetchMonthlyCounts(d.getFullYear(), d.getMonth() + 1);
					}}
					activeOpacity={0.7}
				>
					<Ionicons
						name="calendar-outline"
						size={18}
						color={THEME.colors.primary.amber}
						style={styles.calendarIcon}
					/>
					<Text style={styles.dateText}>{formatDate(selectedDate)}</Text>
				</TouchableOpacity>

				<TouchableOpacity
					style={styles.arrowButton}
					onPress={handleNextDay}
					activeOpacity={0.7}
				>
					<Ionicons
						name="chevron-forward"
						size={22}
						color={THEME.colors.primary.amber}
					/>
				</TouchableOpacity>

				{/* Bouton Assistant */}
				<View style={styles.assistantContainer}>
					<TouchableOpacity
						style={styles.assistantButton}
						onPress={() => setShowAssistantMenu(!showAssistantMenu)}
						activeOpacity={0.7}
					>
						<Ionicons
							name="sparkles"
							size={20}
							color={THEME.colors.primary.amber}
						/>
					</TouchableOpacity>

					{/* Dropdown Menu */}
					{showAssistantMenu && (
						<View style={styles.dropdownMenu}>
							<TouchableOpacity
								style={styles.menuItem}
								onPress={handleAutoAssign}
								activeOpacity={0.7}
							>
								<Ionicons
									name="sparkles"
									size={18}
									color={THEME.colors.primary.amber}
								/>
								<View style={styles.menuItemContent}>
									<Text style={styles.menuText}>Attribution automatique</Text>
									<Text style={styles.menuTextSub}>
										Visualiser et attribuer les tables
									</Text>
								</View>
								<Ionicons
									name="chevron-forward"
									size={16}
									color={THEME.colors.text.muted}
								/>
							</TouchableOpacity>
						</View>
					)}
				</View>

				<DatePickerModal
					visible={showDatePicker}
					selectedDate={selectedDate}
					onDateChange={onDateChange}
					onClose={() => setShowDatePicker(false)}
					reservationDays={monthlyReservationCounts}
					onMonthChange={fetchMonthlyCounts}
				/>
			</View>

			<AutoAssignModal
				visible={showAutoAssignModal}
				onClose={() => setShowAutoAssignModal(false)}
				selectedDate={selectedDate}
				onComplete={() => {
					if (onAssignmentComplete) onAssignmentComplete();
				}}
			/>
			
			<WebReservationsModal
				visible={showWebReservationsModal}
				onClose={() => setShowWebReservationsModal(false)}
			/>
		</>
	);
}

const createStyles = (THEME) =>
	StyleSheet.create({
		container: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "center",
			paddingVertical: 12,
			paddingHorizontal: 16,
			marginBottom: 8,
		},
		notificationContainer: {
			marginRight: 8,
		},
		notificationButton: {
			width: 40,
			height: 40,
			borderRadius: 20,
			backgroundColor: THEME.colors.background.card + "40",
			alignItems: "center",
			justifyContent: "center",
			position: "relative",
			...Platform.select({
				ios: {
					shadowColor: THEME.colors.text.muted,
					shadowOffset: { width: 0, height: 2 },
					shadowOpacity: 0.1,
					shadowRadius: 4,
				},
				android: {
					elevation: 2,
				},
			}),
		},
		notificationButtonActive: {
			backgroundColor: THEME.colors.primary.amber + "20",
			...Platform.select({
				ios: {
					shadowColor: THEME.colors.primary.amber,
					shadowOffset: { width: 0, height: 2 },
					shadowOpacity: 0.25,
					shadowRadius: 6,
				},
				android: {
					elevation: 4,
				},
			}),
		},
		badge: {
			position: "absolute",
			top: -2,
			right: -2,
			backgroundColor: THEME.colors.status.error,
			borderRadius: 10,
			minWidth: 20,
			height: 20,
			alignItems: "center",
			justifyContent: "center",
			paddingHorizontal: 4,
		},
		badgeText: {
			fontSize: 11,
			fontWeight: "700",
			color: "#FFFFFF",
		},
		arrowButton: {
			width: 40,
			height: 40,
			borderRadius: 20,
			backgroundColor: THEME.colors.background.card + "40",
			alignItems: "center",
			justifyContent: "center",
			...Platform.select({
				ios: {
					shadowColor: THEME.colors.primary.amber,
					shadowOffset: { width: 0, height: 2 },
					shadowOpacity: 0.15,
					shadowRadius: 4,
				},
				android: {
					elevation: 3,
				},
			}),
		},
		dateButton: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "center",
			paddingHorizontal: 16,
			paddingVertical: 10,
			marginHorizontal: 8,
			borderRadius: 12,
			backgroundColor: THEME.colors.background.card,
			width: 250,
			...Platform.select({
				ios: {
					shadowColor: THEME.colors.primary.amber,
					shadowOffset: { width: 0, height: 2 },
					shadowOpacity: 0.2,
					shadowRadius: 6,
				},
				android: {
					elevation: 4,
				},
			}),
		},
		calendarIcon: {
			marginRight: 8,
		},
		dateText: {
			fontSize: THEME.typography.sizes.md,
			fontWeight: "600",
			color: THEME.colors.text.primary,
			letterSpacing: 0.3,
		},
		assistantContainer: {
			position: "relative",
			marginLeft: 8,
		},
		assistantButton: {
			flexDirection: "row",
			alignItems: "center",
			gap: 6,
			paddingHorizontal: 14,
			paddingVertical: 8,
			borderRadius: 12,
			backgroundColor: THEME.colors.background.card + "80",
			borderWidth: 1,
			borderColor: THEME.colors.primary.amber + "40",
			...Platform.select({
				ios: {
					shadowColor: THEME.colors.primary.amber,
					shadowOffset: { width: 0, height: 2 },
					shadowOpacity: 0.2,
					shadowRadius: 4,
				},
				android: {
					elevation: 3,
				},
			}),
		},
		assistantText: {
			fontSize: THEME.typography.sizes.sm,
			fontWeight: "600",
			color: THEME.colors.primary.amber,
		},
		dropdownMenu: {
			position: "absolute",
			top: 44,
			right: 0,
			minWidth: 280,
			backgroundColor: THEME.colors.background.card,
			borderRadius: 12,
			borderWidth: 1,
			borderColor: THEME.colors.primary.amber + "30",
			...Platform.select({
				ios: {
					shadowColor: "#000",
					shadowOffset: { width: 0, height: 4 },
					shadowOpacity: 0.25,
					shadowRadius: 8,
				},
				android: {
					elevation: 8,
				},
			}),
			zIndex: 1000,
		},
		menuItem: {
			flexDirection: "row",
			alignItems: "center",
			gap: 10,
			paddingVertical: 14,
			paddingHorizontal: 16,
			borderRadius: 12,
		},
		menuText: {
			fontSize: THEME.typography.sizes.sm,
			fontWeight: "600",
			color: THEME.colors.text.primary,
		},
		menuItemContent: {
			flex: 1,
		},
		menuTextSub: {
			fontSize: 11,
			fontWeight: "400",
			color: THEME.colors.text.muted,
			marginTop: 1,
		},
		menuSeparator: {
			height: 1,
			backgroundColor: THEME.colors.primary.amber + "20",
			marginHorizontal: 12,
			marginVertical: 4,
		},
		menuItemDanger: {},
		menuTextDanger: {
			fontSize: THEME.typography.sizes.sm,
			fontWeight: "500",
			color: "#EF4444",
			flex: 1,
		},
		overlay: {
			position: "absolute",
			top: 0,
			left: 0,
			right: 0,
			bottom: 0,
			zIndex: 999,
		},
	});

/**
 * 📅 DateNavigator - Composant de navigation par date
 * Affiche la date sélectionnée avec navigation jour par jour
 */
import React, { useState } from "react";
import {
	View,
	Text,
	TouchableOpacity,
	StyleSheet,
	Platform,
	Alert,
	ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../hooks/useTheme";
import DatePickerModal from "./DatePickerModal";
import { useAuthFetch } from "../../hooks/useAuthFetch";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function DateNavigator({
	selectedDate,
	onDateChange,
	onAssignmentComplete,
}) {
	const THEME = useTheme();
	const [showDatePicker, setShowDatePicker] = useState(false);
	const [showAssistantMenu, setShowAssistantMenu] = useState(false);
	const [loading, setLoading] = useState(false);
	const authFetch = useAuthFetch();

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

	// Attribution automatique des tables
	const handleAutoAssign = async () => {
		setLoading(true);
		setShowAssistantMenu(false);

		try {
			const restaurantId = await AsyncStorage.getItem("restaurantId");
			if (!restaurantId) {
				Alert.alert("Erreur", "Restaurant non trouvé");
				return;
			}

			const dateString = selectedDate.toISOString().split("T")[0];
			const result = await authFetch(
				`${process.env.EXPO_PUBLIC_API_URL}/assistant/auto-assign-tables`,
				{
					method: "POST",
					body: JSON.stringify({ restaurantId, date: dateString }),
				}
			);

			if (result.status === "success") {
				const {
					assignedCount = 0,
					reassignedCount = 0,
					unassignedCount = 0,
				} = result;
				const totalSuccess = assignedCount + reassignedCount;

				let message = "";
				if (assignedCount > 0)
					message += `✅ ${assignedCount} table(s) attribuée(s)\n`;
				if (reassignedCount > 0)
					message += `🔄 ${reassignedCount} table(s) réassignée(s)\n`;

				if (totalSuccess > 0 && unassignedCount === 0) {
					setTimeout(
						() => Alert.alert("✅ Optimisation réussie", message.trim()),
						100
					);
				} else if (totalSuccess > 0 && unassignedCount > 0) {
					setTimeout(
						() => Alert.alert("⚠️ Optimisation partielle", message.trim()),
						100
					);
				}
			} else {
				Alert.alert("Erreur", result.message || "Attribution impossible");
			}
		} catch (error) {
			Alert.alert("Erreur", `Impossible d'attribuer: ${error.message}`);
		} finally {
			setLoading(false);
			if (onAssignmentComplete) onAssignmentComplete();
		}
	};

	// Supprimer toutes les attributions de la date
	const handleClearAssignments = async () => {
		Alert.alert(
			"⚠️ Confirmer la suppression",
			"Supprimer toutes les attributions de tables pour cette date ?",
			[
				{ text: "Annuler", style: "cancel" },
				{
					text: "Supprimer",
					style: "destructive",
					onPress: async () => {
						try {
							const restaurantId = await AsyncStorage.getItem("restaurantId");
							if (!restaurantId) {
								Alert.alert("Erreur", "Restaurant non trouvé");
								return;
							}

							const dateString = selectedDate.toISOString().split("T")[0];

							const result = await authFetch(
								`${process.env.EXPO_PUBLIC_API_URL}/assistant/clear-assignments`,
								{
									method: "POST",
									body: JSON.stringify({
										restaurantId,
										date: dateString,
									}),
								}
							);

							if (result.status === "success") {
								if (onAssignmentComplete) {
									onAssignmentComplete();
								}
								setTimeout(() => {
									Alert.alert(
										"✅ Attributions supprimées",
										result.message ||
											`${result.clearedCount} attribution(s) supprimée(s)`
									);
								}, 100);
							} else {
								Alert.alert(
									"Erreur",
									result.message || "Suppression impossible"
								);
							}
						} catch (error) {
							Alert.alert(
								"Erreur",
								`Impossible de supprimer: ${error.message}`
							);
						}
					},
				},
			]
		);
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
					onPress={() => setShowDatePicker(true)}
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
						disabled={loading}
					>
						{loading ? (
							<ActivityIndicator
								size="small"
								color={THEME.colors.primary.amber}
							/>
						) : (
							<>
								<Ionicons
									name="sparkles"
									size={20}
									color={THEME.colors.primary.amber}
								/>
								<Text style={styles.assistantText}>Assistant</Text>
								<Ionicons
									name={showAssistantMenu ? "chevron-up" : "chevron-down"}
									size={16}
									color={THEME.colors.primary.amber}
								/>
							</>
						)}
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
									name="radio-button-on"
									size={18}
									color={THEME.colors.primary.amber}
								/>
								<Text style={styles.menuText}>🪄 Attribution automatique</Text>
							</TouchableOpacity>

							<View style={styles.menuSeparator} />

							<TouchableOpacity
								style={[styles.menuItem, styles.menuItemDanger]}
								onPress={handleClearAssignments}
								activeOpacity={0.7}
							>
								<Ionicons name="trash-outline" size={18} color="#EF4444" />
								<Text style={styles.menuTextDanger}>
									🗑️ Supprimer les attributions
								</Text>
							</TouchableOpacity>
						</View>
					)}
				</View>

				<DatePickerModal
					visible={showDatePicker}
					selectedDate={selectedDate}
					onDateChange={onDateChange}
					onClose={() => setShowDatePicker(false)}
				/>
			</View>
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
			marginLeft: 12,
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
			fontWeight: "500",
			color: THEME.colors.text.primary,
			flex: 1,
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

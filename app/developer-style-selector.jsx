/**
 * Écran de sélection de style pour développeur
 * Permet d'appliquer un style à un restaurant
 */
import React, { useState, useEffect, useCallback } from "react";
import {
	View,
	Text,
	TouchableOpacity,
	ScrollView,
	ActivityIndicator,
	Alert,
	StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAuthFetch } from "../hooks/useAuthFetch";
import useThemeStore from "../src/stores/useThemeStore";

export default function DeveloperStyleSelector() {
	const router = useRouter();
	const { theme } = useThemeStore();
	const authFetch = useAuthFetch();

	// États
	const [loading, setLoading] = useState(true);
	const [restaurants, setRestaurants] = useState([]);
	const [stylesList, setStylesList] = useState([]);
	const [selectedRestaurant, setSelectedRestaurant] = useState(null);
	const [selectedStyle, setSelectedStyle] = useState(null);
	const [applying, setApplying] = useState(false);

	// Couleurs selon thème
	const colors = {
		background: theme === "dark" ? "#0f172a" : "#f8fafc",
		card: theme === "dark" ? "#1e293b" : "#ffffff",
		cardBorder: theme === "dark" ? "#334155" : "#e2e8f0",
		text: theme === "dark" ? "#f1f5f9" : "#0f172a",
		textMuted: theme === "dark" ? "#94a3b8" : "#64748b",
		primary: "#f59e0b",
		primaryDark: "#d97706",
	};

	const loadData = useCallback(async () => {
		console.log("🔄 [StyleSelector] Chargement des données...");
		setLoading(true);
		try {
			const [restaurantsData, stylesData] = await Promise.all([
				authFetch("/developer/restaurants", { method: "GET" }),
				authFetch("/developer/styles", { method: "GET" }),
			]);

			console.log("📥 Restaurants:", restaurantsData?.count || 0);
			console.log("📥 Styles:", stylesData?.count || 0);

			if (restaurantsData?.restaurants) {
				setRestaurants(restaurantsData.restaurants);
			}

			if (stylesData?.styles) {
				setStylesList(stylesData.styles);
			}
		} catch (error) {
			console.error("❌ Erreur chargement:", error);
			Alert.alert("Erreur", "Impossible de charger les données");
		} finally {
			setLoading(false);
		}
	}, [authFetch]);

	// Charger données au montage
	useEffect(() => {
		loadData();
	}, [loadData]);

	const handleApplyStyle = async () => {
		if (!selectedRestaurant || !selectedStyle) {
			Alert.alert("Erreur", "Sélectionnez un restaurant et un style");
			return;
		}

		setApplying(true);
		try {
			const response = await authFetch("/developer/apply-style", {
				method: "POST",
				body: JSON.stringify({
					restaurant_id: selectedRestaurant._id,
					style_key: selectedStyle.key,
				}),
			});

			if (response?.status === "success") {
				Alert.alert(
					"✅ Succès",
					`Style '${selectedStyle.name}' appliqué au restaurant '${selectedRestaurant.name}'`,
					[
						{
							text: "OK",
							onPress: () => router.back(),
						},
					],
				);
			} else {
				Alert.alert("Erreur", response?.message || "Échec de l'application");
			}
		} catch (error) {
			console.error("❌ Erreur application style:", error);
			Alert.alert("Erreur", "Impossible d'appliquer le style");
		} finally {
			setApplying(false);
		}
	};

	if (loading) {
		return (
			<LinearGradient
				colors={[colors.background, colors.background]}
				style={styles.container}
			>
				<SafeAreaView style={styles.container}>
					<View style={styles.loadingContainer}>
						<ActivityIndicator size="large" color={colors.primary} />
						<Text style={[styles.loadingText, { color: colors.text }]}>
							Chargement...
						</Text>
					</View>
				</SafeAreaView>
			</LinearGradient>
		);
	}

	return (
		<LinearGradient
			colors={[colors.background, colors.background]}
			style={styles.container}
		>
			<SafeAreaView style={styles.container} edges={["top"]}>
				{/* Header */}
				<View style={[styles.header, { backgroundColor: colors.card }]}>
					<TouchableOpacity
						onPress={() => router.back()}
						style={styles.backButton}
					>
						<Ionicons name="arrow-back" size={24} color={colors.text} />
					</TouchableOpacity>
					<View style={styles.headerCenter}>
						<Ionicons name="color-palette" size={24} color={colors.primary} />
						<Text style={[styles.headerTitle, { color: colors.text }]}>
							Appliquer un Style
						</Text>
					</View>
					<View style={{ width: 40 }} />
				</View>

				<ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
					{/* Section Restaurant */}
					<View style={styles.section}>
						<Text style={[styles.sectionTitle, { color: colors.text }]}>
							1. Sélectionner un Restaurant ({restaurants.length})
						</Text>
						{restaurants.length === 0 ? (
							<Text style={[styles.emptyText, { color: colors.textMuted }]}>
								Aucun restaurant disponible
							</Text>
						) : (
							restaurants.map((resto) => (
								<TouchableOpacity
									key={resto._id}
									style={[
										styles.card,
										{
											backgroundColor: colors.card,
											borderColor:
												selectedRestaurant?._id === resto._id
													? colors.primary
													: colors.cardBorder,
											borderWidth:
												selectedRestaurant?._id === resto._id ? 2 : 1,
										},
									]}
									onPress={() => setSelectedRestaurant(resto)}
								>
									<View style={styles.cardContent}>
										<Ionicons
											name="restaurant"
											size={20}
											color={
												selectedRestaurant?._id === resto._id
													? colors.primary
													: colors.textMuted
											}
										/>
										<View style={styles.cardInfo}>
											<Text style={[styles.cardTitle, { color: colors.text }]}>
												{resto.name}
											</Text>
											<Text
												style={[
													styles.cardSubtitle,
													{ color: colors.textMuted },
												]}
											>
												{resto.email}
											</Text>
											{resto.styleKey && (
												<View style={styles.styleBadge}>
													<Ionicons
														name="color-palette"
														size={12}
														color={colors.primary}
													/>
													<Text
														style={[
															styles.styleBadgeText,
															{ color: colors.primary },
														]}
													>
														Style actuel:{" "}
														{stylesList.find((s) => s.key === resto.styleKey)
															?.name || resto.styleKey}
													</Text>
												</View>
											)}
										</View>
									</View>
									{selectedRestaurant?._id === resto._id && (
										<Ionicons
											name="checkmark-circle"
											size={24}
											color={colors.primary}
										/>
									)}
								</TouchableOpacity>
							))
						)}
					</View>

					{/* Section Style */}
					<View style={styles.section}>
						<Text style={[styles.sectionTitle, { color: colors.text }]}>
							2. Sélectionner un Style ({stylesList.length})
						</Text>
						{stylesList.length === 0 ? (
							<Text style={[styles.emptyText, { color: colors.textMuted }]}>
								Aucun style disponible
							</Text>
						) : (
							stylesList.map((style) => (
								<TouchableOpacity
									key={style.id}
									style={[
										styles.card,
										{
											backgroundColor: colors.card,
											borderColor:
												selectedStyle?.id === style.id
													? colors.primary
													: colors.cardBorder,
											borderWidth: selectedStyle?.id === style.id ? 2 : 1,
										},
									]}
									onPress={() => setSelectedStyle(style)}
								>
									<View style={styles.cardContent}>
										<Ionicons
											name="color-palette-outline"
											size={20}
											color={
												selectedStyle?.id === style.id
													? colors.primary
													: colors.textMuted
											}
										/>
										<View style={styles.cardInfo}>
											<Text style={[styles.cardTitle, { color: colors.text }]}>
												{style.name}
											</Text>
											<Text
												style={[
													styles.cardSubtitle,
													{ color: colors.textMuted },
												]}
											>
												{style.description}
											</Text>
											{style.suitableFor && style.suitableFor.length > 0 && (
												<Text
													style={[styles.cardTags, { color: colors.textMuted }]}
												>
													Adapté pour: {style.suitableFor.join(", ")}
												</Text>
											)}
										</View>
									</View>
									{selectedStyle?.id === style.id && (
										<Ionicons
											name="checkmark-circle"
											size={24}
											color={colors.primary}
										/>
									)}
								</TouchableOpacity>
							))
						)}
					</View>
				</ScrollView>

				{/* Footer avec boutons */}
				<View style={[styles.footer, { backgroundColor: colors.card }]}>
					<TouchableOpacity
						style={[styles.button, styles.cancelButton]}
						onPress={() => router.back()}
						disabled={applying}
					>
						<Text style={styles.cancelButtonText}>Annuler</Text>
					</TouchableOpacity>

					<TouchableOpacity
						style={[
							styles.button,
							styles.applyButton,
							{
								opacity:
									!selectedRestaurant || !selectedStyle || applying ? 0.5 : 1,
							},
						]}
						onPress={handleApplyStyle}
						disabled={!selectedRestaurant || !selectedStyle || applying}
					>
						{applying ? (
							<ActivityIndicator color="#fff" />
						) : (
							<>
								<Ionicons name="checkmark-circle" size={20} color="#fff" />
								<Text style={styles.applyButtonText}>Appliquer le Style</Text>
							</>
						)}
					</TouchableOpacity>
				</View>
			</SafeAreaView>
		</LinearGradient>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	loadingContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		gap: 16,
	},
	loadingText: {
		fontSize: 16,
		fontWeight: "500",
	},
	header: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderBottomWidth: 1,
		borderBottomColor: "rgba(0,0,0,0.1)",
	},
	backButton: {
		padding: 8,
	},
	headerCenter: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
	},
	headerTitle: {
		fontSize: 18,
		fontWeight: "700",
	},
	content: {
		flex: 1,
		padding: 16,
	},
	section: {
		marginBottom: 24,
	},
	sectionTitle: {
		fontSize: 16,
		fontWeight: "700",
		marginBottom: 12,
	},
	emptyText: {
		fontSize: 14,
		fontStyle: "italic",
		textAlign: "center",
		marginVertical: 20,
	},
	card: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		padding: 16,
		borderRadius: 12,
		marginBottom: 8,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
		elevation: 2,
	},
	cardContent: {
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
		flex: 1,
	},
	cardInfo: {
		flex: 1,
	},
	cardTitle: {
		fontSize: 16,
		fontWeight: "600",
		marginBottom: 4,
	},
	cardSubtitle: {
		fontSize: 14,
		marginBottom: 4,
	},
	cardTags: {
		fontSize: 12,
		fontStyle: "italic",
	},
	styleBadge: {
		flexDirection: "row",
		alignItems: "center",
		gap: 4,
		marginTop: 4,
	},
	styleBadgeText: {
		fontSize: 12,
		fontWeight: "600",
	},
	footer: {
		flexDirection: "row",
		padding: 16,
		gap: 12,
		borderTopWidth: 1,
		borderTopColor: "rgba(0,0,0,0.1)",
	},
	button: {
		flex: 1,
		paddingVertical: 14,
		borderRadius: 12,
		alignItems: "center",
		justifyContent: "center",
	},
	cancelButton: {
		backgroundColor: "#e2e8f0",
	},
	cancelButtonText: {
		fontSize: 16,
		fontWeight: "600",
		color: "#475569",
	},
	applyButton: {
		backgroundColor: "#f59e0b",
		flexDirection: "row",
		gap: 8,
	},
	applyButtonText: {
		fontSize: 16,
		fontWeight: "700",
		color: "#fff",
	},
});

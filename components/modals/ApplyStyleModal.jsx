/**
 * ApplyStyleModal - Interface développeur pour appliquer un style à un restaurant
 * Permet de sélectionner un restaurant et un style, puis d'appliquer la config
 */
import React, { useState, useEffect } from "react";
import {
	Modal,
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
import { BlurView } from "expo-blur";
import { useAuthFetch } from "../../hooks/useAuthFetch";
import useThemeStore from "../../src/stores/useThemeStore";
import { getTheme } from "../../utils/themeUtils";

export default function ApplyStyleModal({ visible, onClose }) {
	const { themeMode } = useThemeStore();
	const THEME = React.useMemo(() => getTheme(themeMode), [themeMode]);
	const authFetch = useAuthFetch();

	// États
	const [loading, setLoading] = useState(false);
	const [restaurants, setRestaurants] = useState([]);
	const [styles, setStyles] = useState([]);
	const [selectedRestaurant, setSelectedRestaurant] = useState(null);
	const [selectedStyle, setSelectedStyle] = useState(null);
	const [applying, setApplying] = useState(false);

	// Charger restaurants et styles
	const loadData = async () => {
		console.log("🔄 [ApplyStyleModal] Chargement des données...");
		setLoading(true);
		try {
			console.log("📡 [ApplyStyleModal] Appel API restaurants et styles...");
			const [restaurantsData, stylesData] = await Promise.all([
				authFetch("/developer/restaurants", { method: "GET" }),
				authFetch("/developer/styles", { method: "GET" }),
			]);

			console.log("📥 [ApplyStyleModal] Restaurants reçus:", restaurantsData);
			console.log("📥 [ApplyStyleModal] Styles reçus:", stylesData);

			// Gestion robuste : authFetch peut retourner [] en cas d'erreur
			if (Array.isArray(restaurantsData) && restaurantsData.length === 0) {
				console.error(
					"❌ [ApplyStyleModal] Erreur: authFetch a retourné [] pour restaurants",
				);
				Alert.alert(
					"Erreur",
					"Impossible de charger les restaurants. Vérifiez votre connexion.",
				);
			} else if (restaurantsData?.restaurants) {
				console.log(
					`✅ [ApplyStyleModal] ${restaurantsData.restaurants.length} restaurants chargés`,
				);
				setRestaurants(restaurantsData.restaurants);
			} else {
				console.warn(
					"⚠️ [ApplyStyleModal] Format de réponse restaurants inattendu:",
					restaurantsData,
				);
			}

			if (Array.isArray(stylesData) && stylesData.length === 0) {
				console.error(
					"❌ [ApplyStyleModal] Erreur: authFetch a retourné [] pour styles",
				);
				Alert.alert(
					"Erreur",
					"Impossible de charger les styles. Vérifiez votre connexion.",
				);
			} else if (stylesData?.styles) {
				console.log(
					`✅ [ApplyStyleModal] ${stylesData.styles.length} styles chargés`,
				);
				setStyles(stylesData.styles);
			} else {
				console.warn(
					"⚠️ [ApplyStyleModal] Format de réponse styles inattendu:",
					stylesData,
				);
			}
		} catch (error) {
			console.error("❌ [ApplyStyleModal] Erreur chargement données:", error);
			Alert.alert("Erreur", "Impossible de charger les données");
		} finally {
			setLoading(false);
			console.log("✅ [ApplyStyleModal] Chargement terminé");
		}
	};

	// Charger au montage du modal
	useEffect(() => {
		if (visible) {
			loadData();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [visible]);

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
							onPress: () => {
								// Reset et fermer
								setSelectedRestaurant(null);
								setSelectedStyle(null);
								onClose?.();
							},
						},
					],
				);
			} else {
				Alert.alert("Erreur", response?.message || "Échec de l'application");
			}
		} catch (error) {
			console.error("❌ Erreur application style:", error);
			Alert.alert("Erreur", error.message || "Impossible d'appliquer le style");
		} finally {
			setApplying(false);
		}
	};

	const styles_local = createStyles(THEME);

	return (
		<Modal visible={visible} transparent animationType="fade">
			<BlurView intensity={40} style={StyleSheet.absoluteFill}>
				<View style={styles_local.overlay}>
					<View style={styles_local.container}>
						{/* Header */}
						<LinearGradient
							colors={[
								THEME.colors.primary.amber,
								THEME.colors.primary.amberDark,
							]}
							style={styles_local.header}
						>
							<View style={styles_local.headerLeft}>
								<Ionicons name="color-palette" size={24} color="#fff" />
								<Text style={styles_local.headerTitle}>Appliquer un Style</Text>
							</View>
							<TouchableOpacity
								onPress={onClose}
								style={styles_local.closeButton}
							>
								<Ionicons name="close" size={24} color="#fff" />
							</TouchableOpacity>
						</LinearGradient>

						{/* Content */}
						{loading ? (
							<View style={styles_local.loadingContainer}>
								<ActivityIndicator
									size="large"
									color={THEME.colors.primary.amber}
								/>
								<Text style={styles_local.loadingText}>Chargement...</Text>
							</View>
						) : (
							<ScrollView style={styles_local.scrollView}>
								{/* Debug info */}
								{restaurants.length === 0 && styles.length === 0 && (
									<View style={styles_local.section}>
										<Text
											style={[styles_local.sectionTitle, { color: "#ef4444" }]}
										>
											⚠️ Aucune donnée chargée
										</Text>
										<Text style={styles_local.cardSubtitle}>
											Restaurants: {restaurants.length} | Styles:{" "}
											{styles.length}
										</Text>
									</View>
								)}

								{/* Section Restaurant */}
								<View style={styles_local.section}>
									<Text style={styles_local.sectionTitle}>
										1. Sélectionner un Restaurant ({restaurants.length})
									</Text>
									{restaurants.length === 0 && (
										<Text style={styles_local.cardSubtitle}>
											Aucun restaurant disponible
										</Text>
									)}
									{restaurants.map((resto) => (
										<TouchableOpacity
											key={resto._id}
											style={[
												styles_local.card,
												selectedRestaurant?._id === resto._id &&
													styles_local.cardSelected,
											]}
											onPress={() => setSelectedRestaurant(resto)}
										>
											<View style={styles_local.cardContent}>
												<Ionicons
													name="restaurant"
													size={20}
													color={
														selectedRestaurant?._id === resto._id
															? THEME.colors.primary.amber
															: THEME.colors.text.secondary
													}
												/>
												<View style={styles_local.cardInfo}>
													<Text style={styles_local.cardTitle}>
														{resto.name}
													</Text>
													<Text style={styles_local.cardSubtitle}>
														{resto.email}
													</Text>
												</View>
											</View>
											{selectedRestaurant?._id === resto._id && (
												<Ionicons
													name="checkmark-circle"
													size={24}
													color={THEME.colors.primary.amber}
												/>
											)}
										</TouchableOpacity>
									))}
								</View>

								{/* Section Style */}
								<View style={styles_local.section}>
									<Text style={styles_local.sectionTitle}>
										2. Sélectionner un Style ({styles.length})
									</Text>
									{styles.length === 0 && (
										<Text style={styles_local.cardSubtitle}>
											Aucun style disponible
										</Text>
									)}
									{styles.map((style) => (
										<TouchableOpacity
											key={style.id}
											style={[
												styles_local.card,
												selectedStyle?.id === style.id &&
													styles_local.cardSelected,
											]}
											onPress={() => setSelectedStyle(style)}
										>
											<View style={styles_local.cardContent}>
												<Ionicons
													name="color-palette-outline"
													size={20}
													color={
														selectedStyle?.id === style.id
															? THEME.colors.primary.amber
															: THEME.colors.text.secondary
													}
												/>
												<View style={styles_local.cardInfo}>
													<Text style={styles_local.cardTitle}>
														{style.name}
													</Text>
													<Text style={styles_local.cardSubtitle}>
														{style.description}
													</Text>
													{style.suitableFor &&
														style.suitableFor.length > 0 && (
															<Text style={styles_local.cardTags}>
																Adapté pour: {style.suitableFor.join(", ")}
															</Text>
														)}
												</View>
											</View>
											{selectedStyle?.id === style.id && (
												<Ionicons
													name="checkmark-circle"
													size={24}
													color={THEME.colors.primary.amber}
												/>
											)}
										</TouchableOpacity>
									))}
								</View>
							</ScrollView>
						)}

						{/* Footer */}
						<View style={styles_local.footer}>
							<TouchableOpacity
								style={[styles_local.footerButton, styles_local.cancelButton]}
								onPress={onClose}
							>
								<Text style={styles_local.cancelButtonText}>Annuler</Text>
							</TouchableOpacity>
							<TouchableOpacity
								style={[
									styles_local.footerButton,
									(!selectedRestaurant || !selectedStyle || applying) &&
										styles_local.buttonDisabled,
								]}
								onPress={handleApplyStyle}
								disabled={!selectedRestaurant || !selectedStyle || applying}
							>
								<LinearGradient
									colors={[
										THEME.colors.primary.amber,
										THEME.colors.primary.amberDark,
									]}
									style={styles_local.applyButtonGradient}
								>
									{applying ? (
										<ActivityIndicator size="small" color="#fff" />
									) : (
										<>
											<Ionicons name="brush" size={20} color="#fff" />
											<Text style={styles_local.applyButtonText}>
												Appliquer
											</Text>
										</>
									)}
								</LinearGradient>
							</TouchableOpacity>
						</View>
					</View>
				</View>
			</BlurView>
		</Modal>
	);
}

const createStyles = (THEME) =>
	StyleSheet.create({
		overlay: {
			flex: 1,
			justifyContent: "center",
			alignItems: "center",
			backgroundColor: "rgba(0,0,0,0.5)",
		},
		container: {
			width: "90%",
			maxWidth: 600,
			maxHeight: "80%",
			backgroundColor: THEME.colors.background.card,
			borderRadius: THEME.radius.xl,
			overflow: "hidden",
		},
		header: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "space-between",
			paddingHorizontal: THEME.spacing.lg,
			paddingVertical: THEME.spacing.lg,
		},
		headerLeft: {
			flexDirection: "row",
			alignItems: "center",
			gap: THEME.spacing.md,
		},
		headerTitle: {
			fontSize: THEME.typography.sizes.xl,
			fontWeight: "700",
			color: "#fff",
		},
		closeButton: {
			padding: THEME.spacing.sm,
		},
		loadingContainer: {
			flex: 1,
			justifyContent: "center",
			alignItems: "center",
			paddingVertical: THEME.spacing["3xl"],
		},
		loadingText: {
			marginTop: THEME.spacing.md,
			fontSize: THEME.typography.sizes.md,
			color: THEME.colors.text.secondary,
		},
		scrollView: {
			flex: 1,
		},
		section: {
			padding: THEME.spacing.lg,
		},
		sectionTitle: {
			fontSize: THEME.typography.sizes.lg,
			fontWeight: "700",
			color: THEME.colors.text.primary,
			marginBottom: THEME.spacing.md,
		},
		card: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "space-between",
			padding: THEME.spacing.md,
			marginBottom: THEME.spacing.sm,
			backgroundColor: THEME.colors.background.elevated,
			borderRadius: THEME.radius.md,
			borderWidth: 2,
			borderColor: "transparent",
		},
		cardSelected: {
			borderColor: THEME.colors.primary.amber,
			backgroundColor: THEME.colors.primary.light,
		},
		cardContent: {
			flexDirection: "row",
			alignItems: "center",
			gap: THEME.spacing.md,
			flex: 1,
		},
		cardInfo: {
			flex: 1,
		},
		cardTitle: {
			fontSize: THEME.typography.sizes.md,
			fontWeight: "600",
			color: THEME.colors.text.primary,
			marginBottom: 2,
		},
		cardSubtitle: {
			fontSize: THEME.typography.sizes.sm,
			color: THEME.colors.text.secondary,
		},
		cardTags: {
			fontSize: THEME.typography.sizes.xs,
			color: THEME.colors.text.muted,
			marginTop: 4,
			fontStyle: "italic",
		},
		footer: {
			flexDirection: "row",
			gap: THEME.spacing.md,
			padding: THEME.spacing.lg,
			borderTopWidth: 1,
			borderTopColor: THEME.colors.border.default,
		},
		footerButton: {
			flex: 1,
			height: 48,
			borderRadius: THEME.radius.md,
			overflow: "hidden",
		},
		cancelButton: {
			backgroundColor: THEME.colors.background.elevated,
			justifyContent: "center",
			alignItems: "center",
		},
		cancelButtonText: {
			fontSize: THEME.typography.sizes.md,
			fontWeight: "600",
			color: THEME.colors.text.secondary,
		},
		applyButtonGradient: {
			flex: 1,
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "center",
			gap: THEME.spacing.sm,
		},
		applyButtonText: {
			fontSize: THEME.typography.sizes.md,
			fontWeight: "700",
			color: "#fff",
		},
		buttonDisabled: {
			opacity: 0.5,
		},
	});

/**
 * 🛠️ Interface Développeur - Gestion des Feature Overrides
 *
 * Permet d'activer/désactiver les fonctionnalités TOGGLEABLES pour chaque restaurant.
 * Ces overrides s'appliquent en temps réel sur la matrice de features (useFeatureLevelStore).
 *
 * COMPLET (restaurant)      → toggle : chat_client
 * INTERMEDIAIRE (fast-food…) → toggle : gestion_stocks
 * MINIMUM (foodtruck)       → toggle : fab_fast_commande
 */

import React, { useState, useEffect, useCallback } from "react";
import {
	View,
	Text,
	StyleSheet,
	ScrollView,
	Switch,
	Alert,
	TouchableOpacity,
	ActivityIndicator,
	TextInput,
	RefreshControl,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { fetchWithAuth } from "../utils/tokenManager";
import useDeveloperStore from "../src/stores/useDeveloperStore";

// ─────────────────────────────────────────────
// Correspondances catégorie → niveau
// ─────────────────────────────────────────────
const CATEGORY_TO_LEVEL = {
	restaurant: "complet",
	snack: "intermediaire",
	"fast-food": "intermediaire",
	cafe: "intermediaire",
	boulangerie: "intermediaire",
	bar: "intermediaire",
	foodtruck: "minimum",
};

const LEVEL_LABELS = {
	complet: { label: "Complet", color: "#1565C0", bg: "#E3F2FD" },
	intermediaire: { label: "Intermédiaire", color: "#E65100", bg: "#FFF3E0" },
	minimum: { label: "Minimum", color: "#2E7D32", bg: "#E8F5E9" },
};

// ─────────────────────────────────────────────
// Features ON par défaut dans la matrice de base (sans override)
// Permet à isFeatureEnabled de déduire l'état initial correct
// ─────────────────────────────────────────────
const BASE_ON_BY_LEVEL = {
	complet: [
		"activite",
		"plan_salle",
		"salle_cuisine",
		"chat_client",
		"calendrier",
		"gestion_stocks",
		"auto_tables",
		"statistiques",
	],
	intermediaire: ["cuisine", "fab_fast_commande", "gestion_stocks"],
	minimum: ["commandes_express", "fab_fast_commande", "gestion_stocks"],
};

// ─────────────────────────────────────────────
// Toutes les features toggleables par niveau
// (celles dans la base = ON par défaut, les autres = OFF par défaut)
// ─────────────────────────────────────────────
const TOGGLEABLE_BY_LEVEL = {
	complet: [
		{
			key: "activite",
			title: "Onglet Activité",
			description: "Onglet et tableau de bord activité",
			icon: "pulse",
		},
		{
			key: "plan_salle",
			title: "Plan de salle",
			description: "Visualisation et gestion graphique des tables",
			icon: "grid",
		},
		{
			key: "salle_cuisine",
			title: "Sidebar Cuisine",
			description: "Panneau latéral Boissons / Entrées / Plats / Desserts",
			icon: "flame",
		},
		{
			key: "chat_client",
			title: "Messagerie client",
			description: "Communication temps réel client ↔ serveur",
			icon: "chatbox",
		},
		{
			key: "calendrier",
			title: "Calendrier",
			description: "Navigation par date et planning des réservations",
			icon: "calendar",
		},
		{
			key: "gestion_stocks",
			title: "Gestion des stocks",
			description: "Suivi des stocks et alertes niveaux bas",
			icon: "layers",
		},
		{
			key: "auto_tables",
			title: "Attribution auto tables",
			description: "Suggestion automatique de table lors d'une réservation",
			icon: "color-wand",
		},
		{
			key: "statistiques",
			title: "Statistiques",
			description: "Graphiques et rapports d'activité",
			icon: "bar-chart",
		},
		{
			key: "comptabilite",
			title: "Comptabilité",
			description: "Module comptable et exports financiers",
			icon: "calculator",
		},
		{
			key: "avis_google",
			title: "Avis Google",
			description: "Intégration et gestion des avis Google",
			icon: "star",
		},
	],
	intermediaire: [
		{
			key: "cuisine",
			title: "Vue Cuisine (dashboard)",
			description: "Bouton et vue FastFoodKitchen dans le dashboard",
			icon: "restaurant",
		},
		{
			key: "fab_fast_commande",
			title: "FAB → Commande directe",
			description: "Bouton + crée une commande directe",
			icon: "flash",
		},
		{
			key: "gestion_stocks",
			title: "Gestion des stocks",
			description: "Suivi des stocks et alertes niveaux bas",
			icon: "layers",
		},
		{
			key: "activite",
			title: "Onglet Activité",
			description: "Onglet et tableau de bord activité",
			icon: "pulse",
		},
		{
			key: "plan_salle",
			title: "Plan de salle",
			description: "Visualisation et gestion graphique des tables",
			icon: "grid",
		},
		{
			key: "chat_client",
			title: "Messagerie client",
			description: "Communication temps réel client ↔ serveur",
			icon: "chatbox",
		},
		{
			key: "calendrier",
			title: "Calendrier",
			description: "Navigation par date et planning",
			icon: "calendar",
		},
		{
			key: "comptabilite",
			title: "Comptabilité",
			description: "Module comptable et exports financiers",
			icon: "calculator",
		},
		{
			key: "avis_google",
			title: "Avis Google",
			description: "Intégration et gestion des avis Google",
			icon: "star",
		},
	],
	minimum: [
		{
			key: "commandes_express",
			title: "Commandes Express",
			description: "Vue commandes express (affichée par défaut)",
			icon: "rocket",
		},
		{
			key: "fab_fast_commande",
			title: "FAB → Commande directe",
			description: "Bouton + crée une commande directe",
			icon: "flash",
		},
		{
			key: "gestion_stocks",
			title: "Gestion des stocks",
			description: "Suivi des stocks et alertes niveaux bas",
			icon: "layers",
		},
		{
			key: "chat_client",
			title: "Messagerie client",
			description: "Communication temps réel client ↔ serveur",
			icon: "chatbox",
		},
		{
			key: "cuisine",
			title: "Vue Cuisine (dashboard)",
			description: "Bouton et vue FastFoodKitchen dans le dashboard",
			icon: "restaurant",
		},
		{
			key: "comptabilite",
			title: "Comptabilité",
			description: "Module comptable et exports financiers",
			icon: "calculator",
		},
		{
			key: "avis_google",
			title: "Avis Google",
			description: "Intégration et gestion des avis Google",
			icon: "star",
		},
	],
};

export default function ManageFeatures() {
	const router = useRouter();
	const { isDeveloper } = useDeveloperStore();

	// Bouton Retour accessible et espacé (pattern import menu)
	const BackButton = () => (
		<TouchableOpacity
			style={{
				flexDirection: "row",
				alignItems: "center",
				marginBottom: 20,
				marginTop: 40,
				paddingHorizontal: 20,
			}}
			onPress={() => router.back()}
		>
			<Ionicons name="arrow-back" size={24} color="#0f172a" />
			<Text
				style={{
					color: "#0f172a",
					fontSize: 16,
					marginLeft: 8,
					fontWeight: "600",
				}}
			>
				Retour
			</Text>
		</TouchableOpacity>
	);

	const [restaurants, setRestaurants] = useState([]);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	const [filteredRestaurants, setFilteredRestaurants] = useState([]);

	// ✅ Vérification accès développeur
	useEffect(() => {
		if (!isDeveloper) {
			Alert.alert(
				"Accès refusé",
				"Cette fonctionnalité est réservée aux développeurs.",
				[{ text: "OK", onPress: () => router.back() }],
			);
		}
	}, [isDeveloper, router]);

	// ─────────────────────────────────────────────
	// Chargement
	// ─────────────────────────────────────────────
	const fetchData = useCallback(async () => {
		try {
			console.log("🔍 [FEATURE-OVERRIDES] Chargement des restaurants...");

			const API_URL =
				process.env.EXPO_PUBLIC_API_URL ||
				"https://orderit-backend-6y1m.onrender.com";

			const res = await fetchWithAuth(`${API_URL}/developer/restaurants`);

			if (res.ok) {
				const data = await res.json();
				const list = data.restaurants || [];
				console.log("✅ [FEATURE-OVERRIDES] Restaurants chargés:", list.length);
				setRestaurants(list);
			} else {
				console.error("❌ [FEATURE-OVERRIDES] Erreur:", res.status);
				Alert.alert("Erreur", "Impossible de charger la liste des restaurants");
			}
		} catch (error) {
			console.error("Erreur chargement:", error);
			Alert.alert("Erreur", "Impossible de charger les données");
		} finally {
			setLoading(false);
			setRefreshing(false);
		}
	}, []);

	useEffect(() => {
		fetchData();
	}, [fetchData]);

	// Filtrage
	useEffect(() => {
		const q = searchQuery.toLowerCase();
		const filtered = restaurants.filter(
			(r) =>
				r.name?.toLowerCase().includes(q) || r.email?.toLowerCase().includes(q),
		);
		setFilteredRestaurants(filtered);
	}, [restaurants, searchQuery]);

	const onRefresh = useCallback(() => {
		setRefreshing(true);
		fetchData();
	}, [fetchData]);

	// ─────────────────────────────────────────────
	// Toggle une feature override
	// ─────────────────────────────────────────────
	const toggleFeature = async (restaurantId, featureKey, currentEnabled) => {
		const newEnabled = !currentEnabled;

		try {
			console.log("🔧 [FEATURE-OVERRIDES] Toggle:", {
				restaurantId,
				featureKey,
				currentEnabled,
				newEnabled,
			});

			const API_URL =
				process.env.EXPO_PUBLIC_API_URL ||
				"https://orderit-backend-6y1m.onrender.com";

			// Récupérer les overrides existants du restaurant localement
			const restaurant = restaurants.find((r) => r._id === restaurantId);
			const existingOverrides = restaurant?.featureOverrides || {};

			// Construire le nouvel objet d'overrides
			const updatedOverrides = {
				...existingOverrides,
				[featureKey]: newEnabled,
			};

			const response = await fetchWithAuth(
				`${API_URL}/developer/restaurants/${restaurantId}/feature-overrides`,
				{
					method: "PUT",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ overrides: updatedOverrides }),
				},
			);

			if (response.ok) {
				console.log("✅ [FEATURE-OVERRIDES] Toggle réussi");

				// Mise à jour locale
				setRestaurants((prev) =>
					prev.map((r) =>
						r._id === restaurantId
							? { ...r, featureOverrides: updatedOverrides }
							: r,
					),
				);
			} else {
				const errorData = await response.json().catch(() => ({}));
				console.error("❌ [FEATURE-OVERRIDES] Erreur:", errorData);
				throw new Error(errorData.message || "Erreur API");
			}
		} catch (error) {
			console.error("❌ [FEATURE-OVERRIDES] Erreur toggle:", error);
			Alert.alert(
				"Erreur",
				error.message || "Impossible de modifier la fonctionnalité",
			);
		}
	};

	// ─────────────────────────────────────────────
	// Helpers
	// ─────────────────────────────────────────────
	/**
	 * Détermine si une feature est active pour un restaurant.
	 * - Si override explicite → respecte l'override
	 * - Sinon → vérifie si la feature est dans la matrice de base du niveau
	 */
	const isFeatureEnabled = (featureKey, featureOverrides, level) => {
		if (featureOverrides && featureKey in featureOverrides) {
			return featureOverrides[featureKey] === true;
		}
		// Pas d'override → état par défaut selon la matrice de base du niveau
		return (BASE_ON_BY_LEVEL[level] || []).includes(featureKey);
	};

	// ─────────────────────────────────────────────
	// Rendu d'un restaurant
	// ─────────────────────────────────────────────
	const renderRestaurant = (restaurant) => {
		const rawCategory = restaurant.category || "restaurant";
		const level = CATEGORY_TO_LEVEL[rawCategory] || "complet";
		const levelMeta = LEVEL_LABELS[level];
		const toggleableFeatures = TOGGLEABLE_BY_LEVEL[level] || [];
		const overrides = restaurant.featureOverrides || {};

		return (
			<View key={restaurant._id} style={styles.restaurantCard}>
				{/* En-tête restaurant */}
				<View style={styles.restaurantHeader}>
					<View style={styles.restaurantInfo}>
						<Text style={styles.restaurantName}>{restaurant.name}</Text>
						<Text style={styles.restaurantEmail}>{restaurant.email}</Text>
					</View>
					{/* Badge niveau */}
					<View style={[styles.levelBadge, { backgroundColor: levelMeta.bg }]}>
						<Text style={[styles.levelBadgeText, { color: levelMeta.color }]}>
							{levelMeta.label}
						</Text>
						<Text style={[styles.categoryText, { color: levelMeta.color }]}>
							{rawCategory}
						</Text>
					</View>
				</View>

				{/* Features toggleables */}
				{toggleableFeatures.length === 0 ? (
					<Text style={styles.noFeatures}>Aucune feature toggleable</Text>
				) : (
					<View style={styles.featuresGrid}>
						{toggleableFeatures.map((feature) => {
							const enabled = isFeatureEnabled(feature.key, overrides, level);
							return (
								<View key={feature.key} style={styles.featureItem}>
									<View style={styles.featureInfo}>
										<View
											style={[
												styles.featureIconBg,
												{
													backgroundColor: enabled
														? "rgba(46, 125, 50, 0.1)"
														: "rgba(0,0,0,0.05)",
												},
											]}
										>
											<Ionicons
												name={feature.icon}
												size={18}
												color={enabled ? "#2E7D32" : "#9E9E9E"}
											/>
										</View>
										<View style={styles.featureText}>
											<Text style={styles.featureTitle}>{feature.title}</Text>
											<Text style={styles.featureDesc}>
												{feature.description}
											</Text>
										</View>
									</View>
									<Switch
										value={enabled}
										onValueChange={() =>
											toggleFeature(restaurant._id, feature.key, enabled)
										}
										trackColor={{ false: "#9E9E9E", true: "#2E7D32" }}
										thumbColor="#FFFFFF"
										ios_backgroundColor="#9E9E9E"
									/>
								</View>
							);
						})}
					</View>
				)}
			</View>
		);
	};

	// ─────────────────────────────────────────────
	// Loading state
	// ─────────────────────────────────────────────
	if (loading) {
		return (
			<View style={styles.loadingContainer}>
				<Stack.Screen
					options={{
						title: "Feature Overrides",
						headerBackTitle: "Retour",
					}}
				/>
				<ActivityIndicator size="large" color="#1565C0" />
				<Text style={styles.loadingText}>Chargement des restaurants...</Text>
			</View>
		);
	}

	// ─────────────────────────────────────────────
	// Render principal
	// ─────────────────────────────────────────────
	return (
		<LinearGradient colors={["#EEF2FF", "#F8FAFC"]} style={styles.container}>
			<Stack.Screen
				options={{
					title: "Feature Overrides",
					headerBackTitle: "Retour",
				}}
			/>
			<BackButton />

			{/* Recherche */}
			<View style={styles.searchContainer}>
				<Ionicons
					name="search"
					size={20}
					color="#757575"
					style={styles.searchIcon}
				/>
				<TextInput
					style={styles.searchInput}
					placeholder="Rechercher un restaurant..."
					value={searchQuery}
					onChangeText={setSearchQuery}
				/>
			</View>

			{/* Légende niveaux */}
			<View style={styles.legendRow}>
				{Object.entries(LEVEL_LABELS).map(([lvl, meta]) => (
					<View
						key={lvl}
						style={[styles.legendItem, { backgroundColor: meta.bg }]}
					>
						<Text style={[styles.legendText, { color: meta.color }]}>
							{meta.label}
						</Text>
					</View>
				))}
			</View>

			{/* Liste des restaurants */}
			<ScrollView
				style={styles.restaurantsList}
				refreshControl={
					<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
				}
				showsVerticalScrollIndicator={false}
			>
				{filteredRestaurants.length === 0 ? (
					<View style={styles.emptyState}>
						<Ionicons name="restaurant-outline" size={48} color="#9E9E9E" />
						<Text style={styles.emptyText}>Aucun restaurant trouvé</Text>
					</View>
				) : (
					filteredRestaurants.map(renderRestaurant)
				)}
			</ScrollView>
		</LinearGradient>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		paddingTop: 10,
	},
	loadingContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		backgroundColor: "#F8F9FA",
	},
	loadingText: {
		marginTop: 10,
		fontSize: 16,
		color: "#757575",
	},
	searchContainer: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "white",
		marginHorizontal: 15,
		marginBottom: 10,
		paddingHorizontal: 15,
		paddingVertical: 10,
		borderRadius: 12,
		elevation: 2,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
	},
	searchIcon: {
		marginRight: 10,
	},
	searchInput: {
		flex: 1,
		fontSize: 16,
		color: "#333",
	},
	legendRow: {
		flexDirection: "row",
		marginHorizontal: 15,
		marginBottom: 12,
		gap: 8,
	},
	legendItem: {
		paddingHorizontal: 10,
		paddingVertical: 4,
		borderRadius: 8,
	},
	legendText: {
		fontSize: 12,
		fontWeight: "600",
	},
	restaurantsList: {
		flex: 1,
		paddingHorizontal: 15,
	},
	restaurantCard: {
		backgroundColor: "white",
		marginBottom: 15,
		borderRadius: 14,
		padding: 16,
		elevation: 3,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
	},
	restaurantHeader: {
		flexDirection: "row",
		alignItems: "flex-start",
		marginBottom: 14,
	},
	restaurantInfo: {
		flex: 1,
	},
	restaurantName: {
		fontSize: 17,
		fontWeight: "bold",
		color: "#1a1a2e",
		marginBottom: 2,
	},
	restaurantEmail: {
		fontSize: 13,
		color: "#757575",
	},
	levelBadge: {
		alignItems: "center",
		paddingHorizontal: 10,
		paddingVertical: 6,
		borderRadius: 10,
		marginLeft: 10,
	},
	levelBadgeText: {
		fontSize: 12,
		fontWeight: "700",
	},
	categoryText: {
		fontSize: 11,
		marginTop: 1,
		opacity: 0.8,
	},
	noFeatures: {
		fontSize: 13,
		color: "#9E9E9E",
		fontStyle: "italic",
		textAlign: "center",
		paddingVertical: 8,
	},
	featuresGrid: {
		gap: 10,
	},
	featureItem: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingVertical: 6,
	},
	featureInfo: {
		flex: 1,
		flexDirection: "row",
		alignItems: "center",
	},
	featureIconBg: {
		width: 38,
		height: 38,
		borderRadius: 10,
		alignItems: "center",
		justifyContent: "center",
		marginRight: 12,
	},
	featureText: {
		flex: 1,
	},
	featureTitle: {
		fontSize: 15,
		color: "#1a1a2e",
		fontWeight: "600",
	},
	featureDesc: {
		fontSize: 12,
		color: "#757575",
		marginTop: 1,
	},
	emptyState: {
		alignItems: "center",
		paddingVertical: 60,
		gap: 12,
	},
	emptyText: {
		fontSize: 16,
		color: "#9E9E9E",
	},
});

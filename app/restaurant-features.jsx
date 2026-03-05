/**
 * 🛠️ Développeur — Gérer Fonctionnalités
 *
 * Interface unique et centralisée pour :
 * 1. Choisir le FORMAT (catégorie) du restaurant → détermine le niveau par défaut
 * 2. Activer / désactiver TOUTES les fonctionnalités individuellement via overrides
 *
 * Architecture :
 * - ALL_FEATURES = source unique de toutes les features disponibles
 * - DEFAULT_ENABLED = matrice "activé par défaut" pour chaque niveau
 * - featureOverrides (MongoDB) = surcharge individuelle (true/false forcé)
 * - isFeatureEnabled(key, overrides, level) = vérité effective
 *
 * Aucun code hardcodé par catégorie : tout passe par cette page.
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
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
// Config catégories & niveaux
// ─────────────────────────────────────────────
const CATEGORY_TO_LEVEL = {
	restaurant: "complet",
	"fast-food": "intermediaire",
	cafe: "intermediaire",
	boulangerie: "intermediaire",
	bar: "intermediaire",
	foodtruck: "minimum",
};

const LEVEL_META = {
	complet: {
		label: "Complet",
		subtitle: "Restaurant classique",
		color: "#1565C0",
		bg: "#E3F2FD",
		border: "#90CAF9",
	},
	intermediaire: {
		label: "Intermédiaire",
		subtitle: "Fast-food / Café / Bar",
		color: "#E65100",
		bg: "#FFF3E0",
		border: "#FFCC80",
	},
	minimum: {
		label: "Minimum",
		subtitle: "Foodtruck",
		color: "#2E7D32",
		bg: "#E8F5E9",
		border: "#A5D6A7",
	},
};

const CATEGORIES = [
	{ key: "restaurant", label: "Restaurant", icon: "restaurant-outline" },
	{ key: "fast-food", label: "Fast-food", icon: "fast-food-outline" },
	{ key: "cafe", label: "Café", icon: "cafe-outline" },
	{ key: "boulangerie", label: "Boulangerie", icon: "storefront-outline" },
	{ key: "bar", label: "Bar", icon: "wine-outline" },
	{ key: "foodtruck", label: "Foodtruck", icon: "car-outline" },
];

// ─────────────────────────────────────────────
// Liste MAÎTRE de toutes les fonctionnalités
// Source unique de vérité — ne jamais hardcoder ailleurs
// ─────────────────────────────────────────────
const ALL_FEATURES = [
	// ── Interface & Navigation ──
	{
		key: "activite",
		title: "Activity Tracker",
		description: "Onglet et tableau de bord d'activité temps réel",
		icon: "pulse-outline",
		group: "Interface & Navigation",
	},
	{
		key: "plan_salle",
		title: "Plan de salle interactif",
		description: "Visualisation et gestion graphique des tables",
		icon: "grid-outline",
		group: "Interface & Navigation",
	},
	{
		key: "commandes_express",
		title: "Commandes Express",
		description: "Vue commandes simplifiée pour les flux rapides (foodtruck)",
		icon: "rocket-outline",
		group: "Interface & Navigation",
	},
	{
		key: "cuisine",
		title: "Vue Cuisine Dashboard",
		description: "Bouton et vue FastFoodKitchen dans le dashboard",
		icon: "restaurant-outline",
		group: "Interface & Navigation",
	},
	{
		key: "fab_fast_commande",
		title: "FAB → Commande directe",
		description: "Bouton flottant pour créer une commande sans table",
		icon: "flash-outline",
		group: "Interface & Navigation",
	},
	{
		key: "salle_cuisine",
		title: "Sidebar Cuisine (Floor)",
		description: "Panneau latéral Boissons / Entrées / Plats / Desserts",
		icon: "flame-outline",
		group: "Interface & Navigation",
	},

	// ── Communication ──
	{
		key: "chat_client",
		title: "Chat client-serveur",
		description: "Messagerie temps réel entre le client et le serveur",
		icon: "chatbox-outline",
		group: "Communication",
	},
	{
		key: "messagerie_interne",
		title: "Messagerie interne",
		description: "Communication entre membres du personnel",
		icon: "chatbubbles-outline",
		group: "Communication",
	},
	{
		key: "notifications_push",
		title: "Notifications push",
		description: "Alertes et notifications en temps réel",
		icon: "notifications-outline",
		group: "Communication",
	},

	// ── Gestion ──
	{
		key: "gestion_plats",
		title: "Gestion des plats",
		description: "Création, modification et organisation du menu",
		icon: "fast-food-outline",
		group: "Gestion",
	},
	{
		key: "gestion_stocks",
		title: "Gestion des stocks",
		description: "Suivi des stocks et alertes de niveaux bas",
		icon: "layers-outline",
		group: "Gestion",
	},
	{
		key: "auto_tables",
		title: "Assistant tables",
		description: "Suggestion automatique de table lors d'une réservation",
		icon: "color-wand-outline",
		group: "Gestion",
	},
	{
		key: "allergies_visibles",
		title: "Allergènes / Restrictions",
		description: "Affichage des allergènes et restrictions alimentaires",
		icon: "warning-outline",
		group: "Gestion",
	},

	// ── Finance ──
	{
		key: "pourboire",
		title: "Pourboire",
		description: "Gestion des pourboires et partage d'équipe",
		icon: "gift-outline",
		group: "Finance",
	},
	{
		key: "comptabilite",
		title: "Comptabilité avancée",
		description: "Module comptable, exports financiers et rapports",
		icon: "calculator-outline",
		group: "Finance",
	},
	{
		key: "statistiques",
		title: "Statistiques employés",
		description: "Graphiques et rapports de performance du personnel",
		icon: "bar-chart-outline",
		group: "Finance",
	},

	// ── Client & Visibilité ──
	{
		key: "avis_google",
		title: "Google Avis",
		description: "Intégration et redirection vers les avis Google",
		icon: "star-outline",
		group: "Client & Visibilité",
	},
	{
		key: "reservations",
		title: "Réservations",
		description: "Gestion des réservations et du planning",
		icon: "calendar-clear-outline",
		group: "Client & Visibilité",
	},
	{
		key: "calendrier",
		title: "Calendrier",
		description: "Navigation par date et visualisation du planning",
		icon: "calendar-outline",
		group: "Client & Visibilité",
	},

	// ── Système ──
	{
		key: "recherche_globale",
		title: "Recherche globale",
		description: "Barre de recherche dans toute l'application",
		icon: "search-outline",
		group: "Système",
	},
];

const FEATURE_GROUPS = [
	"Interface & Navigation",
	"Communication",
	"Gestion",
	"Finance",
	"Client & Visibilité",
	"Système",
];

// ─────────────────────────────────────────────
// Matrice : features actives PAR DÉFAUT selon le niveau
// Les featureOverrides du restaurant prennent le dessus
// ─────────────────────────────────────────────
const DEFAULT_ENABLED = {
	// Interface & Navigation
	activite: ["complet"],
	plan_salle: ["complet"],
	commandes_express: ["minimum"],
	cuisine: ["intermediaire"],
	fab_fast_commande: ["intermediaire", "minimum"],
	salle_cuisine: ["complet"],
	// Communication
	chat_client: ["complet"],
	messagerie_interne: ["complet", "intermediaire"],
	notifications_push: ["complet", "intermediaire", "minimum"],
	// Gestion
	gestion_plats: ["complet", "intermediaire", "minimum"],
	gestion_stocks: ["complet", "intermediaire", "minimum"],
	auto_tables: ["complet"],
	allergies_visibles: ["complet", "intermediaire"],
	// Finance
	pourboire: ["complet", "intermediaire"],
	comptabilite: ["complet"],
	statistiques: ["complet"],
	// Client & Visibilité
	avis_google: ["complet", "intermediaire", "minimum"],
	reservations: ["complet", "intermediaire"],
	calendrier: ["complet"],
	// Système
	recherche_globale: ["complet", "intermediaire"],
};

// ─────────────────────────────────────────────
// Helper : état effectif d'une feature
// Override explicite > matrice de base
// ─────────────────────────────────────────────
const isFeatureEnabled = (featureKey, overrides, level) => {
	if (overrides && featureKey in overrides) {
		return overrides[featureKey] === true;
	}
	return (DEFAULT_ENABLED[featureKey] || []).includes(level);
};

const API_URL =
	process.env.EXPO_PUBLIC_API_URL ||
	"https://orderit-backend-6y1m.onrender.com";
// ═══════════════════════════════════════════════════════
// Composant principal
// ═══════════════════════════════════════════════════════
export default function ManageFeatures() {
	const router = useRouter();
	const { isDeveloper } = useDeveloperStore();

	const [restaurants, setRestaurants] = useState([]);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	const [expandedIds, setExpandedIds] = useState(new Set());

	// ── Vérification accès développeur
	useEffect(() => {
		if (!isDeveloper) {
			Alert.alert(
				"Accès refusé",
				"Cette fonctionnalité est réservée aux développeurs.",
				[{ text: "OK", onPress: () => router.back() }],
			);
		}
	}, [isDeveloper, router]);

	// ── Chargement des restaurants
	const fetchData = useCallback(async () => {
		try {
			const res = await fetchWithAuth(`${API_URL}/developer/restaurants`);
			if (res.ok) {
				const data = await res.json();
				setRestaurants(data.restaurants || []);
			} else {
				Alert.alert("Erreur", "Impossible de charger la liste des restaurants");
			}
		} catch (error) {
			const isExpected =
				error?.name === "AbortError" ||
				(error?.message || "").includes("Session") ||
				(error?.message || "").includes("token");
			if (!isExpected) console.error("Erreur chargement:", error);
			else console.warn("⚠️ Chargement interrompu (session):", error?.message);
		} finally {
			setLoading(false);
			setRefreshing(false);
		}
	}, []);

	useEffect(() => {
		fetchData();
	}, [fetchData]);

	const onRefresh = useCallback(() => {
		setRefreshing(true);
		fetchData();
	}, [fetchData]);

	// ── Filtrage
	const filteredRestaurants = useMemo(() => {
		const q = searchQuery.toLowerCase().trim();
		if (!q) return restaurants;
		return restaurants.filter(
			(r) =>
				r.name?.toLowerCase().includes(q) || r.email?.toLowerCase().includes(q),
		);
	}, [restaurants, searchQuery]);

	// ── Expand / Collapse
	const toggleExpand = useCallback((id) => {
		setExpandedIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	}, []);

	// ── Changer la catégorie d'un restaurant (optimistic)
	const updateCategory = useCallback(
		async (restaurantId, newCategory) => {
			setRestaurants((prev) =>
				prev.map((r) =>
					r._id === restaurantId ? { ...r, category: newCategory } : r,
				),
			);
			try {
				const res = await fetchWithAuth(
					`${API_URL}/developer/restaurants/${restaurantId}/category`,
					{
						method: "PUT",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({ category: newCategory }),
					},
				);
				if (!res.ok) {
					const err = await res.json().catch(() => ({}));
					throw new Error(err.message || "Erreur API");
				}
			} catch (error) {
				console.error("❌ Erreur update catégorie:", error);
				Alert.alert("Erreur", "Impossible de changer le format du restaurant");
				fetchData();
			}
		},
		[fetchData],
	);

	// ── Toggle feature override (optimistic)
	const toggleFeature = useCallback(
		async (restaurantId, featureKey, currentEnabled) => {
			const newEnabled = !currentEnabled;
			const restaurant = restaurants.find((r) => r._id === restaurantId);
			const existingOverrides = {
				...(restaurant?.featureOverrides || {}),
			};
			const updatedOverrides = {
				...existingOverrides,
				[featureKey]: newEnabled,
			};

			setRestaurants((prev) =>
				prev.map((r) =>
					r._id === restaurantId
						? { ...r, featureOverrides: updatedOverrides }
						: r,
				),
			);

			try {
				const res = await fetchWithAuth(
					`${API_URL}/developer/restaurants/${restaurantId}/feature-overrides`,
					{
						method: "PUT",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({ overrides: updatedOverrides }),
					},
				);
				if (!res.ok) {
					const err = await res.json().catch(() => ({}));
					throw new Error(err.message || "Erreur API");
				}
			} catch (error) {
				console.error("❌ Erreur toggle feature:", error);
				Alert.alert(
					"Erreur",
					error.message || "Impossible de modifier la fonctionnalité",
				);
				setRestaurants((prev) =>
					prev.map((r) =>
						r._id === restaurantId
							? { ...r, featureOverrides: existingOverrides }
							: r,
					),
				);
			}
		},
		[restaurants],
	);

	// ── Réinitialiser tous les overrides
	const resetOverrides = useCallback(
		async (restaurantId, restaurantName) => {
			Alert.alert(
				"Réinitialiser les overrides",
				`Remettre toutes les fonctionnalités aux valeurs par défaut pour "${restaurantName}" ?`,
				[
					{ text: "Annuler", style: "cancel" },
					{
						text: "Réinitialiser",
						style: "destructive",
						onPress: async () => {
							setRestaurants((prev) =>
								prev.map((r) =>
									r._id === restaurantId ? { ...r, featureOverrides: {} } : r,
								),
							);
							try {
								await fetchWithAuth(
									`${API_URL}/developer/restaurants/${restaurantId}/feature-overrides`,
									{
										method: "PUT",
										headers: { "Content-Type": "application/json" },
										body: JSON.stringify({ overrides: {} }),
									},
								);
							} catch (error) {
								console.error("❌ Erreur reset:", error);
								fetchData();
							}
						},
					},
				],
			);
		},
		[fetchData],
	);

	// ─────────────────────────────────────────────
	// Loading state
	// ─────────────────────────────────────────────
	if (loading) {
		return (
			<View style={styles.loadingContainer}>
				<Stack.Screen
					options={{
						title: "Gérer Fonctionnalités",
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
					title: "Gérer Fonctionnalités",
					headerBackTitle: "Retour",
				}}
			/>

			{/* Bouton Retour */}
			<TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
				<Ionicons name="arrow-back" size={24} color="#0f172a" />
				<Text style={styles.backButtonText}>Retour</Text>
			</TouchableOpacity>

			{/* En-tête */}
			<View style={styles.pageHeader}>
				<Text style={styles.pageTitle}>⚙️ Gérer les fonctionnalités</Text>
				<Text style={styles.pageSubtitle}>
					{ALL_FEATURES.length} fonctionnalités · {restaurants.length}{" "}
					restaurant
					{restaurants.length !== 1 ? "s" : ""}
				</Text>
			</View>

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
					clearButtonMode="while-editing"
				/>
			</View>

			{/* Liste des restaurants */}
			<ScrollView
				style={styles.list}
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
					filteredRestaurants.map((restaurant) => (
						<RestaurantCard
							key={restaurant._id}
							restaurant={restaurant}
							isExpanded={expandedIds.has(restaurant._id)}
							onToggleExpand={() => toggleExpand(restaurant._id)}
							onUpdateCategory={updateCategory}
							onToggleFeature={toggleFeature}
							onResetOverrides={resetOverrides}
						/>
					))
				)}
				<View style={{ height: 50 }} />
			</ScrollView>
		</LinearGradient>
	);
}

// ═══════════════════════════════════════════════════════
// Card Restaurant (collapsable)
// ═══════════════════════════════════════════════════════
function RestaurantCard({
	restaurant,
	isExpanded,
	onToggleExpand,
	onUpdateCategory,
	onToggleFeature,
	onResetOverrides,
}) {
	const category = restaurant.category || "restaurant";
	const level = CATEGORY_TO_LEVEL[category] || "complet";
	const meta = LEVEL_META[level];
	const overrides = restaurant.featureOverrides || {};

	const overrideCount = Object.keys(overrides).length;

	const deviatingCount = ALL_FEATURES.filter((f) => {
		const def = (DEFAULT_ENABLED[f.key] || []).includes(level);
		const cur =
			overrides[f.key] !== undefined ? Boolean(overrides[f.key]) : def;
		return cur !== def;
	}).length;

	return (
		<View style={styles.card}>
			{/* En-tête cliquable */}
			<TouchableOpacity
				style={styles.cardHeader}
				onPress={onToggleExpand}
				activeOpacity={0.75}
			>
				<View style={styles.cardHeaderLeft}>
					<Text style={styles.cardName}>{restaurant.name}</Text>
					<Text style={styles.cardEmail}>{restaurant.email}</Text>
					{deviatingCount > 0 && (
						<View style={styles.overrideCountBadge}>
							<Text style={styles.overrideCountText}>
								{deviatingCount} override
								{deviatingCount > 1 ? "s" : ""}
							</Text>
						</View>
					)}
				</View>
				<View style={styles.cardHeaderRight}>
					<View
						style={[
							styles.levelBadge,
							{
								backgroundColor: meta.bg,
								borderColor: meta.border,
							},
						]}
					>
						<Text style={[styles.levelBadgeText, { color: meta.color }]}>
							{meta.label}
						</Text>
						<Text style={[styles.levelCatText, { color: meta.color }]}>
							{category}
						</Text>
					</View>
					<Ionicons
						name={isExpanded ? "chevron-up" : "chevron-down"}
						size={20}
						color="#757575"
						style={{ marginLeft: 8 }}
					/>
				</View>
			</TouchableOpacity>

			{/* Contenu déplié */}
			{isExpanded && (
				<View style={styles.cardBody}>
					{/* ── Sélecteur de format ── */}
					<View style={styles.sectionBlock}>
						<Text style={styles.sectionLabel}>📋 Format du restaurant</Text>
						<ScrollView
							horizontal
							showsHorizontalScrollIndicator={false}
							style={styles.categoryScroll}
						>
							{CATEGORIES.map((cat) => {
								const isActive = category === cat.key;
								return (
									<TouchableOpacity
										key={cat.key}
										style={[
											styles.categoryBtn,
											isActive && {
												backgroundColor: meta.color,
												borderColor: meta.color,
											},
										]}
										onPress={() =>
											!isActive && onUpdateCategory(restaurant._id, cat.key)
										}
										activeOpacity={0.7}
									>
										<Ionicons
											name={cat.icon}
											size={15}
											color={isActive ? "#FFFFFF" : "#555"}
										/>
										<Text
											style={[
												styles.categoryBtnText,
												isActive && styles.categoryBtnTextActive,
											]}
										>
											{cat.label}
										</Text>
									</TouchableOpacity>
								);
							})}
						</ScrollView>
						<Text style={styles.levelHint}>
							Niveau actuel :{" "}
							<Text
								style={{
									fontWeight: "700",
									color: meta.color,
								}}
							>
								{meta.label}
							</Text>{" "}
							— {meta.subtitle}
						</Text>
					</View>

					{/* ── Features par groupe ── */}
					{FEATURE_GROUPS.map((group) => {
						const features = ALL_FEATURES.filter((f) => f.group === group);
						return (
							<View key={group} style={styles.groupBlock}>
								<Text style={styles.groupTitle}>{group}</Text>
								{features.map((feature) => {
									const isOn = isFeatureEnabled(feature.key, overrides, level);
									const defaultOn = (
										DEFAULT_ENABLED[feature.key] || []
									).includes(level);
									const hasOverride = feature.key in overrides;
									const isDeviant = isOn !== defaultOn;

									return (
										<View key={feature.key} style={styles.featureRow}>
											<View
												style={[
													styles.featureIconBg,
													{
														backgroundColor: isOn
															? "rgba(21,101,192,0.1)"
															: "rgba(0,0,0,0.05)",
													},
												]}
											>
												<Ionicons
													name={feature.icon}
													size={18}
													color={isOn ? "#1565C0" : "#BDBDBD"}
												/>
											</View>
											<View style={styles.featureInfo}>
												<View style={styles.featureTitleRow}>
													<Text
														style={[
															styles.featureTitle,
															!isOn && styles.featureTitleOff,
														]}
													>
														{feature.title}
													</Text>
													{hasOverride && isDeviant && (
														<View
															style={[
																styles.overridePill,
																{
																	backgroundColor: isOn ? "#E8F5E9" : "#FFEBEE",
																},
															]}
														>
															<Text
																style={[
																	styles.overridePillText,
																	{
																		color: isOn ? "#2E7D32" : "#C62828",
																	},
																]}
															>
																override
															</Text>
														</View>
													)}
												</View>
												<Text style={styles.featureDesc}>
													{feature.description}
												</Text>
											</View>
											<Switch
												value={isOn}
												onValueChange={() =>
													onToggleFeature(restaurant._id, feature.key, isOn)
												}
												trackColor={{
													false: "#E0E0E0",
													true: "#1565C0",
												}}
												thumbColor="#FFFFFF"
												ios_backgroundColor="#E0E0E0"
											/>
										</View>
									);
								})}
							</View>
						);
					})}

					{/* ── Reset overrides ── */}
					{overrideCount > 0 && (
						<TouchableOpacity
							style={styles.resetBtn}
							onPress={() => onResetOverrides(restaurant._id, restaurant.name)}
						>
							<Ionicons name="refresh-outline" size={16} color="#C62828" />
							<Text style={styles.resetBtnText}>
								Remettre aux valeurs par défaut ({overrideCount} override
								{overrideCount > 1 ? "s" : ""})
							</Text>
						</TouchableOpacity>
					)}
				</View>
			)}
		</View>
	);
}

// ─────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────
const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	loadingContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		backgroundColor: "#F8F9FA",
	},
	loadingText: {
		marginTop: 12,
		fontSize: 16,
		color: "#757575",
	},
	backButton: {
		flexDirection: "row",
		alignItems: "center",
		marginTop: 52,
		marginBottom: 4,
		paddingHorizontal: 20,
	},
	backButtonText: {
		color: "#0f172a",
		fontSize: 16,
		marginLeft: 8,
		fontWeight: "600",
	},
	pageHeader: {
		paddingHorizontal: 20,
		paddingVertical: 10,
	},
	pageTitle: {
		fontSize: 22,
		fontWeight: "700",
		color: "#0f172a",
	},
	pageSubtitle: {
		fontSize: 13,
		color: "#64748B",
		marginTop: 2,
	},
	searchContainer: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "white",
		marginHorizontal: 15,
		marginBottom: 12,
		paddingHorizontal: 14,
		paddingVertical: 10,
		borderRadius: 12,
		elevation: 2,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.08,
		shadowRadius: 4,
	},
	searchIcon: {
		marginRight: 10,
	},
	searchInput: {
		flex: 1,
		fontSize: 15,
		color: "#333",
	},
	list: {
		flex: 1,
		paddingHorizontal: 15,
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
	card: {
		backgroundColor: "white",
		borderRadius: 16,
		marginBottom: 14,
		overflow: "hidden",
		elevation: 3,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.08,
		shadowRadius: 6,
	},
	cardHeader: {
		flexDirection: "row",
		alignItems: "flex-start",
		justifyContent: "space-between",
		padding: 16,
	},
	cardHeaderLeft: {
		flex: 1,
		marginRight: 10,
	},
	cardName: {
		fontSize: 16,
		fontWeight: "700",
		color: "#0f172a",
		marginBottom: 2,
	},
	cardEmail: {
		fontSize: 12,
		color: "#94a3b8",
		marginBottom: 4,
	},
	overrideCountBadge: {
		alignSelf: "flex-start",
		backgroundColor: "#FFF3E0",
		paddingHorizontal: 8,
		paddingVertical: 2,
		borderRadius: 6,
	},
	overrideCountText: {
		fontSize: 11,
		fontWeight: "600",
		color: "#E65100",
	},
	cardHeaderRight: {
		flexDirection: "row",
		alignItems: "center",
	},
	levelBadge: {
		alignItems: "center",
		paddingHorizontal: 10,
		paddingVertical: 6,
		borderRadius: 10,
		borderWidth: 1,
	},
	levelBadgeText: {
		fontSize: 12,
		fontWeight: "700",
	},
	levelCatText: {
		fontSize: 10,
		marginTop: 1,
		opacity: 0.8,
	},
	cardBody: {
		paddingHorizontal: 16,
		paddingBottom: 16,
		borderTopWidth: 1,
		borderTopColor: "#F1F5F9",
	},
	sectionBlock: {
		marginTop: 14,
		marginBottom: 10,
	},
	sectionLabel: {
		fontSize: 13,
		fontWeight: "600",
		color: "#475569",
		marginBottom: 10,
		textTransform: "uppercase",
		letterSpacing: 0.5,
	},
	categoryScroll: {
		flexDirection: "row",
	},
	categoryBtn: {
		flexDirection: "row",
		alignItems: "center",
		gap: 5,
		paddingHorizontal: 12,
		paddingVertical: 7,
		borderRadius: 20,
		borderWidth: 1,
		borderColor: "#CBD5E1",
		marginRight: 8,
		backgroundColor: "#F8FAFC",
	},
	categoryBtnText: {
		fontSize: 13,
		color: "#555",
		fontWeight: "500",
	},
	categoryBtnTextActive: {
		color: "#FFFFFF",
		fontWeight: "600",
	},
	levelHint: {
		fontSize: 12,
		color: "#64748B",
		marginTop: 10,
	},
	groupBlock: {
		marginTop: 16,
	},
	groupTitle: {
		fontSize: 11,
		fontWeight: "700",
		color: "#94A3B8",
		textTransform: "uppercase",
		letterSpacing: 1,
		marginBottom: 10,
	},
	featureRow: {
		flexDirection: "row",
		alignItems: "center",
		paddingVertical: 8,
		borderBottomWidth: 1,
		borderBottomColor: "#F8FAFC",
	},
	featureIconBg: {
		width: 38,
		height: 38,
		borderRadius: 10,
		alignItems: "center",
		justifyContent: "center",
		marginRight: 12,
	},
	featureInfo: {
		flex: 1,
		marginRight: 8,
	},
	featureTitleRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
		flexWrap: "wrap",
	},
	featureTitle: {
		fontSize: 14,
		fontWeight: "600",
		color: "#1e293b",
	},
	featureTitleOff: {
		color: "#94A3B8",
	},
	featureDesc: {
		fontSize: 12,
		color: "#94A3B8",
		marginTop: 2,
	},
	overridePill: {
		paddingHorizontal: 6,
		paddingVertical: 2,
		borderRadius: 4,
	},
	overridePillText: {
		fontSize: 10,
		fontWeight: "700",
	},
	resetBtn: {
		flexDirection: "row",
		alignItems: "center",
		gap: 7,
		marginTop: 18,
		paddingVertical: 10,
		paddingHorizontal: 14,
		backgroundColor: "#FFF5F5",
		borderRadius: 10,
		borderWidth: 1,
		borderColor: "#FECACA",
	},
	resetBtnText: {
		fontSize: 13,
		color: "#C62828",
		fontWeight: "500",
		flex: 1,
	},
});

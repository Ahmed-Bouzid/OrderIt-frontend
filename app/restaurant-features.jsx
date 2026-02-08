/**
 * 🛠️ Interface Développeur - Gestion des fonctionnalités payantes
 *
 * Permet d'activer/désactiver les fonctionnalités premium pour chaque restaurant
 */

import React, { useState, useEffect, useCallback } from "react";
import {
	View,
	Text,
	StyleSheet,
	ScrollView,
	Switch,
	Alert,
	ActivityIndicator,
	TextInput,
	RefreshControl,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Stack } from "expo-router";

const FEATURES_CONFIG = [
	{
		key: "accounting",
		title: "Comptabilité avancée",
		description: "Module comptable complet avec graphiques et périodes",
		icon: "calculator",
	},
	{
		key: "feedback",
		title: "Système feedback",
		description: "Gestion avis clients et intégration Google",
		icon: "star",
	},
	{
		key: "messaging",
		title: "Messagerie",
		description: "Communication client-serveur en temps réel",
		icon: "chatbox",
	},
	{
		key: "tableAssistant",
		title: "Assistant tables",
		description: "Assistant intelligent pour gestion des tables",
		icon: "restaurant",
	},
	{
		key: "analytics",
		title: "Analytics",
		description: "Statistiques avancées et rapports détaillés",
		icon: "analytics",
	},
	{
		key: "advancedNotifications",
		title: "Notifications+",
		description: "Notifications push avancées et personnalisées",
		icon: "notifications",
	},
	{
		key: "customization",
		title: "Personnalisation",
		description: "Thèmes personnalisés et branding",
		icon: "color-palette",
	},
];

export default function ManageFeatures() {
	const [restaurants, setRestaurants] = useState([]);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [stats, setStats] = useState(null);
	const [searchQuery, setSearchQuery] = useState("");
	const [filteredRestaurants, setFilteredRestaurants] = useState([]);

	// Charger les données
	const fetchData = useCallback(async () => {
		try {
			const [restaurantsRes, statsRes] = await Promise.all([
				fetch(
					"https://orderit-backend-6y1m.onrender.com/api/developer/features",
				),
				fetch(
					"https://orderit-backend-6y1m.onrender.com/api/developer/features/stats",
				),
			]);

			if (restaurantsRes.ok && statsRes.ok) {
				const restaurantsData = await restaurantsRes.json();
				const statsData = await statsRes.json();

				setRestaurants(restaurantsData.data);
				setStats(statsData.data);
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

	// Filtrage des restaurants
	useEffect(() => {
		const filtered = restaurants.filter(
			(restaurant) =>
				restaurant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
				restaurant.email.toLowerCase().includes(searchQuery.toLowerCase()),
		);
		setFilteredRestaurants(filtered);
	}, [restaurants, searchQuery]);

	// Rafraîchir
	const onRefresh = useCallback(() => {
		setRefreshing(true);
		fetchData();
	}, [fetchData]);

	// Toggle une fonctionnalité
	const toggleFeature = async (restaurantId, featureName, currentEnabled) => {
		try {
			const response = await fetch(
				`https://orderit-backend-6y1m.onrender.com/api/developer/features/${restaurantId}/toggle`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						featureName,
						enabled: !currentEnabled,
						developerName: "Interface Web",
					}),
				},
			);

			if (response.ok) {
				// Mettre à jour localement
				setRestaurants((prev) =>
					prev.map((restaurant) => {
						if (restaurant._id === restaurantId) {
							const updatedFeatures = restaurant.features || {};
							if (!updatedFeatures[featureName]) {
								updatedFeatures[featureName] = {
									enabled: false,
									activatedAt: null,
								};
							}
							updatedFeatures[featureName].enabled = !currentEnabled;
							updatedFeatures[featureName].activatedAt = !currentEnabled
								? new Date().toISOString()
								: null;

							return {
								...restaurant,
								features: updatedFeatures,
								lastModified: new Date().toISOString(),
							};
						}
						return restaurant;
					}),
				);

				// Rafraîchir les stats
				fetchData();
			} else {
				throw new Error("Erreur API");
			}
		} catch (error) {
			console.error("Erreur toggle:", error);
			Alert.alert("Erreur", "Impossible de modifier la fonctionnalité");
		}
	};

	// Rendu d'un restaurant
	const renderRestaurant = (restaurant) => {
		const features = restaurant.features || {};

		return (
			<View key={restaurant._id} style={styles.restaurantCard}>
				<View style={styles.restaurantHeader}>
					<View style={styles.restaurantInfo}>
						<Text style={styles.restaurantName}>{restaurant.name}</Text>
						<Text style={styles.restaurantEmail}>{restaurant.email}</Text>
						{restaurant.lastModified && (
							<Text style={styles.lastModified}>
								Modifié le{" "}
								{new Date(restaurant.lastModified).toLocaleDateString("fr-FR")}
							</Text>
						)}
					</View>
				</View>

				<View style={styles.featuresGrid}>
					{FEATURES_CONFIG.map((feature) => {
						const isEnabled = features[feature.key]?.enabled || false;

						return (
							<View key={feature.key} style={styles.featureItem}>
								<View style={styles.featureInfo}>
									<Ionicons
										name={feature.icon}
										size={16}
										color={isEnabled ? "#4CAF50" : "#757575"}
									/>
									<View style={styles.featureText}>
										<Text style={styles.featureTitle}>{feature.title}</Text>
									</View>
								</View>
								<Switch
									value={isEnabled}
									onValueChange={() =>
										toggleFeature(restaurant._id, feature.key, isEnabled)
									}
									trackColor={{ false: "#E0E0E0", true: "#4CAF50" }}
									thumbColor={isEnabled ? "#FFFFFF" : "#FFFFFF"}
								/>
							</View>
						);
					})}
				</View>
			</View>
		);
	};

	if (loading) {
		return (
			<View style={styles.loadingContainer}>
				<Stack.Screen options={{ title: "Gestion des fonctionnalités" }} />
				<ActivityIndicator size="large" color="#4CAF50" />
				<Text style={styles.loadingText}>Chargement des restaurants...</Text>
			</View>
		);
	}

	return (
		<LinearGradient colors={["#E8F5E8", "#F1F8E9"]} style={styles.container}>
			<Stack.Screen
				options={{
					title: "Fonctionnalités premium",
					headerBackTitle: "Retour",
				}}
			/>

			{/* Stats en-tête */}
			{stats && (
				<View style={styles.statsContainer}>
					<View style={styles.statItem}>
						<Text style={styles.statNumber}>{stats.totalRestaurants}</Text>
						<Text style={styles.statLabel}>Restaurants</Text>
					</View>
					<View style={styles.statItem}>
						<Text style={styles.statNumber}>
							{stats.restaurantsWithFeatures}
						</Text>
						<Text style={styles.statLabel}>Avec options</Text>
					</View>
					<View style={styles.statItem}>
						<Text style={styles.statNumber}>
							{Object.values(stats.featuresUsage || {}).reduce(
								(a, b) => a + b,
								0,
							)}
						</Text>
						<Text style={styles.statLabel}>Features actives</Text>
					</View>
				</View>
			)}

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

			{/* Liste des restaurants */}
			<ScrollView
				style={styles.restaurantsList}
				refreshControl={
					<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
				}
				showsVerticalScrollIndicator={false}
			>
				{filteredRestaurants.map(renderRestaurant)}
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
	statsContainer: {
		flexDirection: "row",
		justifyContent: "space-around",
		paddingVertical: 15,
		paddingHorizontal: 20,
		backgroundColor: "rgba(255,255,255,0.9)",
		marginHorizontal: 15,
		marginBottom: 10,
		borderRadius: 12,
		elevation: 2,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
	},
	statItem: {
		alignItems: "center",
	},
	statNumber: {
		fontSize: 24,
		fontWeight: "bold",
		color: "#4CAF50",
	},
	statLabel: {
		fontSize: 12,
		color: "#757575",
		marginTop: 2,
	},
	searchContainer: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "white",
		marginHorizontal: 15,
		marginBottom: 15,
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
	restaurantsList: {
		flex: 1,
		paddingHorizontal: 15,
	},
	restaurantCard: {
		backgroundColor: "white",
		marginBottom: 15,
		borderRadius: 12,
		padding: 15,
		elevation: 3,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
	},
	restaurantHeader: {
		marginBottom: 15,
	},
	restaurantInfo: {
		flex: 1,
	},
	restaurantName: {
		fontSize: 18,
		fontWeight: "bold",
		color: "#333",
		marginBottom: 2,
	},
	restaurantEmail: {
		fontSize: 14,
		color: "#757575",
		marginBottom: 4,
	},
	lastModified: {
		fontSize: 12,
		color: "#4CAF50",
		fontStyle: "italic",
	},
	featuresGrid: {
		gap: 8,
	},
	featureItem: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingVertical: 8,
		paddingHorizontal: 4,
	},
	featureInfo: {
		flex: 1,
		flexDirection: "row",
		alignItems: "center",
	},
	featureText: {
		marginLeft: 10,
		flex: 1,
	},
	featureTitle: {
		fontSize: 15,
		color: "#333",
		fontWeight: "500",
	},
});

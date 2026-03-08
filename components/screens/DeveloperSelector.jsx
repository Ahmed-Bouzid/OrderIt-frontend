/**
 * 🔧 Developer Selector - Sélection de restaurant pour développeur
 * Interface réservée au compte développeur (Ahmed)
 */
import React, { useState, useMemo, useEffect } from "react";
import {
	View,
	Text,
	StyleSheet,
	FlatList,
	TouchableOpacity,
	TextInput,
	ActivityIndicator,
	Alert,
	Modal,
	Switch,
	ScrollView,
	Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import useDeveloperStore from "../../src/stores/useDeveloperStore";
import useReservationStore from "../../src/stores/useReservationStore";
import useThemeStore from "../../src/stores/useThemeStore";
import { useTheme } from "../../hooks/useTheme";
import { fetchWithAuth } from "../../utils/tokenManager";
import { clearAllUserData } from "../../utils/storageHelper";

export default function DeveloperSelector() {
	const router = useRouter();
	const { theme } = useThemeStore();
	const THEME = useTheme();
	const { restaurants, selectRestaurant, initDeveloper } = useDeveloperStore();
	const { resetReservations } = useReservationStore();

	const [search, setSearch] = useState("");
	const [loading, setLoading] = useState(false);
	const [showCreateModal, setShowCreateModal] = useState(false);
	const [creatingRestaurant, setCreatingRestaurant] = useState(false);

	// 🔧 Feature overrides par restaurant
	const [expandedOverridesId, setExpandedOverridesId] = useState(null);
	const [restaurantOverrides, setRestaurantOverrides] = useState({}); // { [restaurantId]: { featureKey: bool } }

	// Formulaire de création
	const [newRestaurant, setNewRestaurant] = useState({
		name: "",
		email: "",
		password: "",
		phone: "",
		address: "",
		turnoverTime: "120",
	});

	// ⭐ Charger les restaurants au montage du composant (reload)
	useEffect(() => {
		const loadRestaurants = async () => {
			// Si on a déjà des restaurants dans le store, pas besoin de refetch
			if (restaurants && restaurants.length > 0) {
				return;
			}

			try {
				const API_URL = process.env.EXPO_PUBLIC_API_URL;
				const response = await fetchWithAuth(
					`${API_URL}/developer/restaurants`,
				);

				if (response.ok) {
					const data = await response.json();
					if (data.restaurants) {
						await initDeveloper(data.restaurants);
					}
				} else {
					console.error("❌ Erreur fetch restaurants:", response.status);
				}
			} catch (error) {
				const errorMessage = error?.message || "";
				const isExpectedSessionError =
					error?.name === "AbortError" ||
					errorMessage.includes("Session expirée") ||
					errorMessage.includes("refresh échoué") ||
					errorMessage.includes("Token manquant") ||
					errorMessage.includes("Pas de token disponible");

				if (isExpectedSessionError) {
					console.warn("⚠️ Chargement restaurants interrompu:", errorMessage);
				} else {
					console.error("❌ Erreur chargement restaurants:", error);
				}

				// ⚠️ Si erreur de token (session expirée), rediriger vers login
				if (
					errorMessage.includes("Session expirée") ||
					errorMessage.includes("refresh échoué") ||
					errorMessage.includes("Token manquant") ||
					errorMessage.includes("Pas de token disponible")
				) {
					Alert.alert(
						"Session expirée",
						"Votre session a expiré. Veuillez vous reconnecter.",
						[
							{
								text: "OK",
								onPress: () => {
									// Nettoyer complètement avant de rediriger
									AsyncStorage.multiRemove([
										"token",
										"@access_token",
										"refreshToken",
										"restaurantId",
										"userRole",
									]).then(() => {
										router.replace("/login");
									});
								},
							},
						],
					);
				}
			}
		};

		loadRestaurants();
	}, []); // Exécuter une seule fois au montage

	// Filtrage par recherche
	const filteredRestaurants = useMemo(() => {
		if (!search.trim()) return restaurants;
		const query = search.toLowerCase();
		return restaurants.filter(
			(r) =>
				r.name?.toLowerCase().includes(query) ||
				r.email?.toLowerCase().includes(query) ||
				r.address?.toLowerCase().includes(query),
		);
	}, [restaurants, search]);

	const handleSelectRestaurant = async (restaurant) => {
		if (!restaurant.active) {
			Alert.alert(
				"Restaurant désactivé",
				"Ce restaurant est actuellement désactivé. Activez-le d'abord pour y accéder.",
			);
			return;
		}

		setLoading(true);
		try {
			const success = await selectRestaurant(restaurant);
			if (success) {
				resetReservations();
				setTimeout(() => {
					router.push("/(tabs)/dashboard"); // Correction du routage pour rediriger vers le Dashboard
				}, 500);
			} else {
				Alert.alert("Erreur", "Impossible de sélectionner ce restaurant");
			}
		} catch (error) {
			console.error("❌ Erreur sélection:", error);
			Alert.alert("Erreur", "Une erreur est survenue");
		} finally {
			setLoading(false);
		}
	};

	const handleToggleActive = async (restaurant) => {
		// 📸 Sauvegarder l'état AVANT toute modification pour pouvoir rollback
		const originalRestaurants = [...restaurants];

		try {
			const API_URL = process.env.EXPO_PUBLIC_API_URL;

			// 🎯 Update optimiste : mettre à jour localement d'abord
			const updatedRestaurants = restaurants.map((r) =>
				r._id === restaurant._id ? { ...r, active: !r.active } : r,
			);
			await initDeveloper(updatedRestaurants);

			const response = await fetchWithAuth(
				`${API_URL}/developer/toggle-restaurant/${restaurant._id}`,
				{
					method: "PATCH",
				},
			);

			const data = await response.json();

			if (response.ok && data.status === "success") {
				// Refresh la liste des restaurants (confirmation serveur)
				const refreshResponse = await fetchWithAuth(
					`${API_URL}/developer/restaurants`,
				);

				const refreshData = await refreshResponse.json();
				if (refreshResponse.ok) {
					await initDeveloper(refreshData.restaurants);
				}

				Alert.alert(
					"✅ Succès",
					`Restaurant ${data.restaurant.active ? "activé" : "désactivé"}`,
				);
			} else {
				// ⚠️ Rollback : restaurer l'état ORIGINAL
				await initDeveloper(originalRestaurants);
				Alert.alert("Erreur", data.message || "Erreur lors du toggle");
			}
		} catch (error) {
			console.error("❌ Erreur toggle:", error);
			// ⚠️ Rollback : restaurer l'état ORIGINAL
			await initDeveloper(originalRestaurants);

			if (error.message.includes("Session expirée")) {
				Alert.alert("Session expirée", "Veuillez vous reconnecter", [
					{ text: "OK", onPress: () => router.replace("/login") },
				]);
			} else {
				Alert.alert("Erreur", "Impossible de modifier le statut");
			}
		}
	};

	// ══════════════════════════════════════════
	// 🔧 GESTION DES FEATURE OVERRIDES
	// ══════════════════════════════════════════

	/**
	 * Features toggleables par catégorie de restaurant :
	 * - restaurant       → messagerie (chat_client)
	 * - fast-food/snack  → gestion des stocks (gestion_stocks)
	 * - foodtruck        → bouton + commande directe (fab_fast_commande)
	 */
	const STAT_FEATURE = {
		key: "statistiques",
		label: "Stats & CRM Performance",
		icon: "bar-chart-outline",
	};

	const TOGGLEABLE_FEATURES = {
		restaurant: [
			{
				key: "chat_client",
				label: "Messagerie client-serveur",
				icon: "chatbubbles-outline",
			},
			STAT_FEATURE,
			// ─── IA Premium ───────────────────────────────────────────────────
			{
				key: "ai_auto_assign",
				label: "IA — Assignation automatique de table",
				icon: "color-wand-outline",
			},
			{
				key: "ai_slot_suggestions",
				label: "IA — Suggestions si créneau complet",
				icon: "git-branch-outline",
			},
			{
				key: "ai_heatmap",
				label: "IA — Heatmap d'occupation",
				icon: "grid-outline",
			},
			{
				key: "ai_anti_gaps",
				label: "IA — Protection anti-trous",
				icon: "shield-checkmark-outline",
			},
			{
				key: "ai_smart_duration",
				label: "IA — Durée intelligente (groupe)",
				icon: "timer-outline",
			},
			{
				key: "ai_waiting_list",
				label: "IA — Liste d'attente intelligente",
				icon: "people-circle-outline",
			},
			{
				key: "ai_prediction",
				label: "IA — Prédiction de remplissage",
				icon: "trending-up-outline",
			},
			{
				key: "ai_strategic_slots",
				label: "IA — Créneaux stratégiques",
				icon: "bulb-outline",
			},
		],
		"fast-food": [
			{
				key: "gestion_stocks",
				label: "Gestion des stocks",
				icon: "cube-outline",
			},
			STAT_FEATURE,
		],
		snack: [
			{
				key: "gestion_stocks",
				label: "Gestion des stocks",
				icon: "cube-outline",
			},
			STAT_FEATURE,
		],
		cafe: [
			{
				key: "gestion_stocks",
				label: "Gestion des stocks",
				icon: "cube-outline",
			},
			STAT_FEATURE,
		],
		boulangerie: [
			{
				key: "gestion_stocks",
				label: "Gestion des stocks",
				icon: "cube-outline",
			},
			STAT_FEATURE,
		],
		bar: [
			{
				key: "gestion_stocks",
				label: "Gestion des stocks",
				icon: "cube-outline",
			},
			STAT_FEATURE,
		],
		foodtruck: [
			{
				key: "fab_fast_commande",
				label: "Bouton + commande directe",
				icon: "add-circle-outline",
			},
			STAT_FEATURE,
		],
	};

	/** Ouvre / ferme le panneau d'overrides d'un restaurant et charge les données si besoin */
	const handleToggleOverridePanel = async (restaurant) => {
		const id = restaurant._id;

		// Fermer si déjà ouvert
		if (expandedOverridesId === id) {
			setExpandedOverridesId(null);
			return;
		}

		setExpandedOverridesId(id);

		// Charger les overrides depuis le serveur si pas encore en cache
		if (!restaurantOverrides[id]) {
			try {
				const API_URL = process.env.EXPO_PUBLIC_API_URL;
				const response = await fetchWithAuth(
					`${API_URL}/developer/restaurants/${id}/feature-overrides`,
				);
				if (response.ok) {
					const data = await response.json();
					setRestaurantOverrides((prev) => ({
						...prev,
						[id]: data.featureOverrides || {},
					}));
				} else {
					setRestaurantOverrides((prev) => ({ ...prev, [id]: {} }));
				}
			} catch {
				setRestaurantOverrides((prev) => ({ ...prev, [id]: {} }));
			}
		}
	};

	/** Bascule un override et persiste sur le serveur */
	const handleUpdateFeatureOverride = async (restaurant, featureKey) => {
		const id = restaurant._id;
		const current = restaurantOverrides[id] || {};

		// La valeur courante : si override explicite → utiliser, sinon laisser undefined (= matrice par défaut)
		// On calcule la valeur de base selon la catégorie pour déterminer ce qu'on va toggler
		const BASE_ON_FEATURES = {
			restaurant: {
				chat_client: true,
				statistiques: true,
				ai_auto_assign: true,
				ai_slot_suggestions: true,
				ai_heatmap: true,
				ai_anti_gaps: true,
				ai_smart_duration: true,
				ai_waiting_list: true,
				ai_prediction: true,
				ai_strategic_slots: true,
			},
			"fast-food": { gestion_stocks: true, statistiques: false },
			snack: { gestion_stocks: true, statistiques: false },
			cafe: { gestion_stocks: true, statistiques: false },
			boulangerie: { gestion_stocks: true, statistiques: false },
			bar: { gestion_stocks: true, statistiques: false },
			foodtruck: { fab_fast_commande: true, statistiques: false },
		};
		const baseValue =
			(BASE_ON_FEATURES[restaurant.category] || {})[featureKey] ?? true;
		const effectiveValue =
			featureKey in current ? current[featureKey] : baseValue;
		const newValue = !effectiveValue;

		const newOverrides = { ...current, [featureKey]: newValue };

		// Optimiste local
		setRestaurantOverrides((prev) => ({
			...prev,
			[id]: newOverrides,
		}));

		try {
			const API_URL = process.env.EXPO_PUBLIC_API_URL;
			const response = await fetchWithAuth(
				`${API_URL}/developer/restaurants/${id}/feature-overrides`,
				{
					method: "PUT",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ overrides: newOverrides }),
				},
			);
			if (!response.ok) {
				throw new Error("Erreur serveur");
			}
		} catch {
			// Rollback
			setRestaurantOverrides((prev) => ({
				...prev,
				[id]: current,
			}));
			Alert.alert("Erreur", "Impossible de sauvegarder l'override");
		}
	};

	const handleCreateRestaurant = async () => {
		// Validation
		if (
			!newRestaurant.name ||
			!newRestaurant.email ||
			!newRestaurant.password
		) {
			Alert.alert("Erreur", "Nom, email et mot de passe sont requis");
			return;
		}

		setCreatingRestaurant(true);

		try {
			const API_URL = process.env.EXPO_PUBLIC_API_URL;

			const response = await fetchWithAuth(
				`${API_URL}/developer/create-restaurant`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						name: newRestaurant.name,
						email: newRestaurant.email,
						password: newRestaurant.password,
						phone: newRestaurant.phone,
						address: newRestaurant.address,
						turnoverTime: parseInt(newRestaurant.turnoverTime) || 120,
					}),
				},
			);

			const data = await response.json();

			if (response.ok && data.status === "success") {
				Alert.alert(
					"✅ Succès",
					`Restaurant "${data.restaurant.name}" créé avec succès !\n\nAdmin créé: ${data.admin.email}`,
				);

				// Refresh la liste
				const refreshResponse = await fetchWithAuth(
					`${API_URL}/developer/restaurants`,
				);

				const refreshData = await refreshResponse.json();
				if (refreshResponse.ok) {
					await initDeveloper(refreshData.restaurants);
				}

				// Reset formulaire
				setNewRestaurant({
					name: "",
					email: "",
					password: "",
					phone: "",
					address: "",
					turnoverTime: "120",
				});
				setShowCreateModal(false);
			} else {
				Alert.alert("Erreur", data.message || "Erreur lors de la création");
			}
		} catch (error) {
			console.error("❌ Erreur création:", error);
			if (error.message.includes("Session expirée")) {
				Alert.alert("Session expirée", "Veuillez vous reconnecter", [
					{ text: "OK", onPress: () => router.replace("/login") },
				]);
			} else {
				Alert.alert("Erreur", "Impossible de créer le restaurant");
			}
		} finally {
			setCreatingRestaurant(false);
		}
	};

	// Fonctions de suppression pour mode développeur
	const handleLogout = async () => {
		Alert.alert("Déconnexion", "Voulez-vous vous déconnecter ?", [
			{ text: "Annuler", style: "cancel" },
			{
				text: "Déconnecter",
				style: "destructive",
				onPress: async () => {
					await clearAllUserData();
					router.replace("/login");
				},
			},
		]);
	};

	const handleDeleteTables = async (restaurant) => {
		Alert.alert(
			"⚠️ Supprimer les tables",
			`Supprimer toutes les tables de ${restaurant.name} ?\n\n${restaurant.stats?.tables || 0} table(s) seront supprimée(s).`,
			[
				{ text: "Annuler", style: "cancel" },
				{
					text: "Supprimer",
					style: "destructive",
					onPress: async () => {
						try {
							const API_URL = process.env.EXPO_PUBLIC_API_URL;
							const response = await fetchWithAuth(
								`${API_URL}/developer/restaurants/${restaurant._id}/tables`,
								{ method: "DELETE" },
							);

							const data = await response.json();

							if (response.ok) {
								Alert.alert("✅ Succès", data.message);
								// Refresh la liste
								const refreshResponse = await fetchWithAuth(
									`${API_URL}/developer/restaurants`,
								);
								const refreshData = await refreshResponse.json();
								if (refreshResponse.ok) {
									await initDeveloper(refreshData.restaurants);
								}
							} else {
								Alert.alert("❌ Erreur", data.message);
							}
						} catch (error) {
							console.error("❌ Erreur suppression tables:", error);
							Alert.alert("Erreur", "Impossible de supprimer les tables");
						}
					},
				},
			],
		);
	};

	const handleDeleteEmployees = async (restaurant) => {
		Alert.alert(
			"⚠️ Supprimer les employés",
			`Supprimer tous les employés de ${restaurant.name} ?\n\n${restaurant.stats?.servers || 0} employé(s) seront supprimé(s).`,
			[
				{ text: "Annuler", style: "cancel" },
				{
					text: "Supprimer",
					style: "destructive",
					onPress: async () => {
						try {
							const API_URL = process.env.EXPO_PUBLIC_API_URL;
							const response = await fetchWithAuth(
								`${API_URL}/developer/restaurants/${restaurant._id}/employees`,
								{ method: "DELETE" },
							);

							const data = await response.json();

							if (response.ok) {
								Alert.alert("✅ Succès", data.message);
								// Refresh la liste
								const refreshResponse = await fetchWithAuth(
									`${API_URL}/developer/restaurants`,
								);
								const refreshData = await refreshResponse.json();
								if (refreshResponse.ok) {
									await initDeveloper(refreshData.restaurants);
								}
							} else {
								Alert.alert("❌ Erreur", data.message);
							}
						} catch (error) {
							console.error("❌ Erreur suppression employés:", error);
							Alert.alert("Erreur", "Impossible de supprimer les employés");
						}
					},
				},
			],
		);
	};

	const handleDeleteProducts = async (restaurant) => {
		Alert.alert(
			"⚠️ Supprimer les produits",
			`Supprimer tous les produits de ${restaurant.name} ?\n\n${restaurant.stats?.products || 0} produit(s) seront supprimé(s).`,
			[
				{ text: "Annuler", style: "cancel" },
				{
					text: "Supprimer",
					style: "destructive",
					onPress: async () => {
						try {
							const API_URL = process.env.EXPO_PUBLIC_API_URL;
							const response = await fetchWithAuth(
								`${API_URL}/developer/restaurants/${restaurant._id}/products`,
								{ method: "DELETE" },
							);

							const data = await response.json();

							if (response.ok) {
								Alert.alert("✅ Succès", data.message);
								// Refresh la liste
								const refreshResponse = await fetchWithAuth(
									`${API_URL}/developer/restaurants`,
								);
								const refreshData = await refreshResponse.json();
								if (refreshResponse.ok) {
									await initDeveloper(refreshData.restaurants);
								}
							} else {
								Alert.alert("❌ Erreur", data.message);
							}
						} catch (error) {
							console.error("❌ Erreur suppression produits:", error);
							Alert.alert("Erreur", "Impossible de supprimer les produits");
						}
					},
				},
			],
		);
	};

	const handleDeleteRestaurant = async (restaurant) => {
		Alert.alert(
			"🚨 SUPPRIMER LE RESTAURANT",
			`ATTENTION : Cette action supprimera définitivement ${restaurant.name} et TOUTES ses données :\n\n• ${restaurant.stats?.tables || 0} tables\n• ${restaurant.stats?.servers || 0} employés\n• ${restaurant.stats?.products || 0} produits\n• ${restaurant.stats?.reservations || 0} réservations\n\nCette action est IRRÉVERSIBLE !`,
			[
				{ text: "Annuler", style: "cancel" },
				{
					text: "SUPPRIMER",
					style: "destructive",
					onPress: async () => {
						try {
							const API_URL = process.env.EXPO_PUBLIC_API_URL;
							const response = await fetchWithAuth(
								`${API_URL}/developer/restaurants/${restaurant._id}`,
								{ method: "DELETE" },
							);

							const data = await response.json();

							if (response.ok) {
								Alert.alert(
									"✅ Restaurant supprimé",
									`${data.message}\n\nSupprimé :\n• ${data.deleted.tables} tables\n• ${data.deleted.employees} employés\n• ${data.deleted.products} produits\n• ${data.deleted.reservations} réservations`,
								);
								// Refresh la liste
								const refreshResponse = await fetchWithAuth(
									`${API_URL}/developer/restaurants`,
								);
								const refreshData = await refreshResponse.json();
								if (refreshResponse.ok) {
									await initDeveloper(refreshData.restaurants);
								}
							} else {
								Alert.alert("❌ Erreur", data.message);
							}
						} catch (error) {
							console.error("❌ Erreur suppression restaurant:", error);
							Alert.alert("Erreur", "Impossible de supprimer le restaurant");
						}
					},
				},
			],
		);
	};

	const renderRestaurant = ({ item }) => (
		<View
			style={[
				styles.restaurantCard,
				{
					backgroundColor:
						theme === "dark" ? "rgba(30,41,59,0.8)" : "rgba(255,255,255,0.9)",
					opacity: item.active ? 1 : 0.6,
					borderColor: item.active ? "#10b981" : "#ef4444",
					borderWidth: 2,
				},
			]}
		>
			<TouchableOpacity
				style={styles.restaurantContent}
				onPress={() => handleSelectRestaurant(item)}
				disabled={loading || !item.active}
			>
				<View style={styles.restaurantHeader}>
					<View
						style={[
							styles.iconContainer,
							{
								backgroundColor: item.active
									? theme === "dark"
										? "rgba(16,185,129,0.2)"
										: "rgba(16,185,129,0.1)"
									: theme === "dark"
										? "rgba(239,68,68,0.2)"
										: "rgba(239,68,68,0.1)",
							},
						]}
					>
						<Ionicons
							name="restaurant"
							size={28}
							color={item.active ? "#10b981" : "#ef4444"}
						/>
					</View>
					<View style={styles.restaurantInfo}>
						<Text
							style={[
								styles.restaurantName,
								{ color: theme === "dark" ? "#f1f5f9" : "#1e293b" },
							]}
						>
							{item.name}
						</Text>
						<Text
							style={[
								styles.restaurantEmail,
								{ color: theme === "dark" ? "#94a3b8" : "#64748b" },
							]}
						>
							{item.email}
						</Text>
						{item.address && (
							<Text
								style={[
									styles.restaurantAddress,
									{ color: theme === "dark" ? "#94a3b8" : "#64748b" },
								]}
							>
								📍 {item.address}
							</Text>
						)}
						{item.stats && (
							<View style={styles.statsRow}>
								<View style={styles.stat}>
									<Ionicons
										name="grid-outline"
										size={14}
										color={theme === "dark" ? "#94a3b8" : "#64748b"}
									/>
									<Text
										style={[
											styles.statText,
											{ color: theme === "dark" ? "#94a3b8" : "#64748b" },
										]}
									>
										{item.stats.tables} tables
									</Text>
								</View>
								<View style={styles.stat}>
									<Ionicons
										name="people-outline"
										size={14}
										color={theme === "dark" ? "#94a3b8" : "#64748b"}
									/>
									<Text
										style={[
											styles.statText,
											{ color: theme === "dark" ? "#94a3b8" : "#64748b" },
										]}
									>
										{item.stats.servers} employés
									</Text>
								</View>
								<View style={styles.stat}>
									<Ionicons
										name="fast-food-outline"
										size={14}
										color={theme === "dark" ? "#94a3b8" : "#64748b"}
									/>
									<Text
										style={[
											styles.statText,
											{ color: theme === "dark" ? "#94a3b8" : "#64748b" },
										]}
									>
										{item.stats.products} produits
									</Text>
								</View>
							</View>
						)}
					</View>
				</View>
			</TouchableOpacity>

			{/* Boutons de suppression */}
			<View style={styles.planAndActions}>
				{/* Formule d'abonnement */}
				{item.subscriptionPlan && (
					<View
						style={[
							styles.planBadge,
							{
								backgroundColor:
									item.subscriptionPlan === "free"
										? "#94a3b8"
										: item.subscriptionPlan === "starter"
											? "#3b82f6"
											: item.subscriptionPlan === "pro"
												? "#f59e0b"
												: "#8b5cf6",
							},
						]}
					>
						<Text style={styles.planText}>
							{item.subscriptionPlan.toUpperCase()}
						</Text>
					</View>
				)}

				{/* Boutons d'action destructifs */}
				<View style={styles.deleteIcons}>
					<TouchableOpacity
						style={styles.iconButton}
						onPress={() => handleDeleteTables(item)}
					>
						<Ionicons name="grid-outline" size={18} color="#ef4444" />
					</TouchableOpacity>

					<TouchableOpacity
						style={styles.iconButton}
						onPress={() => handleDeleteEmployees(item)}
					>
						<Ionicons name="people-outline" size={18} color="#f97316" />
					</TouchableOpacity>

					<TouchableOpacity
						style={styles.iconButton}
						onPress={() => handleDeleteProducts(item)}
					>
						<Ionicons name="fast-food-outline" size={18} color="#ea580c" />
					</TouchableOpacity>

					<TouchableOpacity
						style={styles.iconButton}
						onPress={() => handleDeleteRestaurant(item)}
					>
						<Ionicons name="trash-outline" size={18} color="#dc2626" />
					</TouchableOpacity>
				</View>
			</View>

			{/* Toggle activation */}
			<View style={styles.toggleContainer}>
				<Text
					style={[
						styles.toggleLabel,
						{ color: theme === "dark" ? "#94a3b8" : "#64748b" },
					]}
				>
					{item.active ? "Actif" : "Désactivé"}
				</Text>
				<Switch
					value={item.active}
					onValueChange={() => handleToggleActive(item)}
					trackColor={{ false: "#ef4444", true: "#10b981" }}
					thumbColor="#fff"
				/>
			</View>

			{/* 🔧 Fonctionnalités toggleables */}
			{(TOGGLEABLE_FEATURES[item.category] || []).length > 0 && (
				<>
					<TouchableOpacity
						style={[
							styles.toggleContainer,
							{
								borderTopWidth: 1,
								borderTopColor:
									theme === "dark"
										? "rgba(255,255,255,0.07)"
										: "rgba(0,0,0,0.06)",
								marginTop: 2,
							},
						]}
						onPress={() => handleToggleOverridePanel(item)}
					>
						<View
							style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
						>
							<Ionicons
								name="settings-outline"
								size={15}
								color={theme === "dark" ? "#94a3b8" : "#64748b"}
							/>
							<Text
								style={[
									styles.toggleLabel,
									{ color: theme === "dark" ? "#94a3b8" : "#64748b" },
								]}
							>
								Fonctionnalités
							</Text>
						</View>
						<Ionicons
							name={
								expandedOverridesId === item._id ? "chevron-up" : "chevron-down"
							}
							size={16}
							color={theme === "dark" ? "#94a3b8" : "#64748b"}
						/>
					</TouchableOpacity>

					{expandedOverridesId === item._id && (
						<View style={{ paddingHorizontal: 12, paddingBottom: 10, gap: 8 }}>
							{(TOGGLEABLE_FEATURES[item.category] || []).map((feat) => {
								const BASE_ON = {
									restaurant: { chat_client: true, statistiques: true },
									"fast-food": { gestion_stocks: true, statistiques: false },
									snack: { gestion_stocks: true, statistiques: false },
									cafe: { gestion_stocks: true, statistiques: false },
									boulangerie: { gestion_stocks: true, statistiques: false },
									bar: { gestion_stocks: true, statistiques: false },
									foodtruck: { fab_fast_commande: true, statistiques: false },
								};
								const overrides = restaurantOverrides[item._id] || {};
								const baseVal =
									(BASE_ON[item.category] || {})[feat.key] ?? true;
								const value =
									feat.key in overrides ? overrides[feat.key] : baseVal;
								return (
									<View
										key={feat.key}
										style={{
											flexDirection: "row",
											alignItems: "center",
											justifyContent: "space-between",
											backgroundColor:
												theme === "dark"
													? "rgba(255,255,255,0.04)"
													: "rgba(0,0,0,0.04)",
											borderRadius: 8,
											paddingHorizontal: 10,
											paddingVertical: 8,
										}}
									>
										<View
											style={{
												flexDirection: "row",
												alignItems: "center",
												gap: 8,
												flex: 1,
											}}
										>
											<Ionicons
												name={feat.icon}
												size={15}
												color={value ? "#10b981" : "#94a3b8"}
											/>
											<Text
												style={{
													fontSize: 13,
													color: theme === "dark" ? "#e2e8f0" : "#334155",
													flex: 1,
												}}
											>
												{feat.label}
											</Text>
										</View>
										<Switch
											value={value}
											onValueChange={() =>
												handleUpdateFeatureOverride(item, feat.key)
											}
											trackColor={{ false: "#64748b", true: "#10b981" }}
											thumbColor="#fff"
											style={{
												transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }],
											}}
										/>
									</View>
								);
							})}
						</View>
					)}
				</>
			)}
		</View>
	);

	return (
		<LinearGradient
			colors={
				theme === "dark"
					? ["#0f172a", "#1e293b", "#334155"]
					: ["#e0f2fe", "#bae6fd", "#7dd3fc"]
			}
			style={styles.container}
		>
			{/* Header */}
			<View style={styles.header}>
				<View style={styles.titleContainer}>
					<View
						style={[
							styles.iconBadge,
							{ backgroundColor: theme === "dark" ? "#f59e0b" : "#fbbf24" },
						]}
					>
						<Ionicons name="code-slash" size={28} color="#000" />
					</View>
					<Text
						style={[
							styles.title,
							{ color: theme === "dark" ? "#f1f5f9" : "#1e293b" },
						]}
					>
						Mode Développeur
					</Text>
				</View>
				<Text
					style={[
						styles.subtitle,
						{ color: theme === "dark" ? "#94a3b8" : "#64748b" },
					]}
				>
					Gérez tous les restaurants de la plateforme
				</Text>

				{/* Boutons d'action */}
				<View style={styles.actionButtons}>
					<TouchableOpacity
						style={[
							styles.actionButton,
							{ backgroundColor: theme === "dark" ? "#0ea5e9" : "#0284c7" },
						]}
						onPress={() => setShowCreateModal(true)}
					>
						<Ionicons name="add-circle" size={20} color="#fff" />
						<Text style={styles.actionButtonText}>Créer Restaurant</Text>
					</TouchableOpacity>

					{/* ✨ NOUVEAU : Bouton Appliquer Style */}
					<TouchableOpacity
						style={[
							styles.actionButton,
							{ backgroundColor: theme === "dark" ? "#f59e0b" : "#d97706" },
						]}
						onPress={() => router.push("/developer-style-selector")}
					>
						<Ionicons name="color-palette" size={20} color="#fff" />
						<Text style={styles.actionButtonText}>Appliquer Style</Text>
					</TouchableOpacity>

					<TouchableOpacity
						style={[
							styles.actionButton,
							{ backgroundColor: theme === "dark" ? "#8b5cf6" : "#7c3aed" },
						]}
						onPress={() => router.push("/developer-menu-import")}
					>
						<Ionicons name="scan" size={20} color="#fff" />
						<Text style={styles.actionButtonText}>Scan Menu</Text>
					</TouchableOpacity>
					{/* ✨ NOUVEAU : Bouton Gérer Fonctionnalités */}
					<TouchableOpacity
						style={[
							styles.actionButton,
							{ backgroundColor: theme === "dark" ? "#10b981" : "#059669" },
						]}
						onPress={() => router.push("/restaurant-features")}
					>
						<Ionicons name="settings" size={20} color="#fff" />
						<Text style={styles.actionButtonText}>Gérer Fonctionnalités</Text>
					</TouchableOpacity>
					<TouchableOpacity
						style={[
							styles.actionButton,
							{ backgroundColor: theme === "dark" ? "#ef4444" : "#dc2626" },
						]}
						onPress={handleLogout}
					>
						<Ionicons name="log-out" size={20} color="#fff" />
						<Text style={styles.actionButtonText}>Déconnexion</Text>
					</TouchableOpacity>
				</View>
			</View>

			{/* Barre de recherche */}
			<View
				style={[
					styles.searchContainer,
					{
						backgroundColor:
							theme === "dark" ? "rgba(30,41,59,0.8)" : "rgba(255,255,255,0.9)",
					},
				]}
			>
				<Ionicons
					name="search"
					size={20}
					color={theme === "dark" ? "#94a3b8" : "#64748b"}
				/>
				<TextInput
					style={[
						styles.searchInput,
						{ color: theme === "dark" ? "#f1f5f9" : "#1e293b" },
					]}
					placeholder="Rechercher un restaurant..."
					placeholderTextColor={theme === "dark" ? "#64748b" : "#94a3b8"}
					value={search}
					onChangeText={setSearch}
				/>
				{search.length > 0 && (
					<TouchableOpacity onPress={() => setSearch("")}>
						<Ionicons
							name="close-circle"
							size={20}
							color={theme === "dark" ? "#94a3b8" : "#64748b"}
						/>
					</TouchableOpacity>
				)}
			</View>

			{/* Compteur */}
			<Text
				style={[
					styles.count,
					{ color: theme === "dark" ? "#94a3b8" : "#64748b" },
				]}
			>
				{filteredRestaurants.length} restaurant
				{filteredRestaurants.length > 1 ? "s" : ""} •{" "}
				{filteredRestaurants.filter((r) => r.active).length} actif
				{filteredRestaurants.filter((r) => r.active).length > 1 ? "s" : ""}
			</Text>

			{/* Liste */}
			{loading ? (
				<View style={styles.loadingContainer}>
					<ActivityIndicator size="large" color={THEME.colors.primary} />
					<Text
						style={[
							styles.loadingText,
							{ color: theme === "dark" ? "#94a3b8" : "#64748b" },
						]}
					>
						Chargement...
					</Text>
				</View>
			) : (
				<FlatList
					data={filteredRestaurants}
					renderItem={renderRestaurant}
					keyExtractor={(item) => item._id}
					contentContainerStyle={styles.list}
					showsVerticalScrollIndicator={false}
					ListEmptyComponent={
						<View style={styles.emptyContainer}>
							<Ionicons
								name="restaurant-outline"
								size={64}
								color={theme === "dark" ? "#475569" : "#cbd5e1"}
							/>
							<Text
								style={[
									styles.emptyText,
									{ color: theme === "dark" ? "#94a3b8" : "#64748b" },
								]}
							>
								Aucun restaurant trouvé
							</Text>
						</View>
					}
				/>
			)}

			{/* Modal de création */}
			<Modal
				visible={showCreateModal}
				animationType="slide"
				transparent={true}
				onRequestClose={() => setShowCreateModal(false)}
			>
				<View style={styles.modalOverlay}>
					<View
						style={[
							styles.modalContent,
							{
								backgroundColor: theme === "dark" ? "#1e293b" : "#fff",
							},
						]}
					>
						<View style={styles.modalHeader}>
							<Text
								style={[
									styles.modalTitle,
									{ color: theme === "dark" ? "#f1f5f9" : "#1e293b" },
								]}
							>
								🏪 Créer un Restaurant
							</Text>
							<TouchableOpacity onPress={() => setShowCreateModal(false)}>
								<Ionicons
									name="close"
									size={28}
									color={theme === "dark" ? "#94a3b8" : "#64748b"}
								/>
							</TouchableOpacity>
						</View>

						<ScrollView style={styles.formContainer}>
							<View style={styles.formGroup}>
								<Text
									style={[
										styles.label,
										{ color: theme === "dark" ? "#cbd5e1" : "#475569" },
									]}
								>
									Nom du restaurant *
								</Text>
								<TextInput
									style={[
										styles.input,
										{
											backgroundColor:
												theme === "dark"
													? "rgba(30,41,59,0.5)"
													: "rgba(248,250,252,1)",
											color: theme === "dark" ? "#f1f5f9" : "#1e293b",
											borderColor:
												theme === "dark"
													? "rgba(100,116,139,0.3)"
													: "rgba(203,213,225,1)",
										},
									]}
									placeholder="Le Petit Bistrot"
									placeholderTextColor={
										theme === "dark" ? "#64748b" : "#94a3b8"
									}
									value={newRestaurant.name}
									onChangeText={(text) =>
										setNewRestaurant({ ...newRestaurant, name: text })
									}
								/>
							</View>

							<View style={styles.formGroup}>
								<Text
									style={[
										styles.label,
										{ color: theme === "dark" ? "#cbd5e1" : "#475569" },
									]}
								>
									Email *
								</Text>
								<TextInput
									style={[
										styles.input,
										{
											backgroundColor:
												theme === "dark"
													? "rgba(30,41,59,0.5)"
													: "rgba(248,250,252,1)",
											color: theme === "dark" ? "#f1f5f9" : "#1e293b",
											borderColor:
												theme === "dark"
													? "rgba(100,116,139,0.3)"
													: "rgba(203,213,225,1)",
										},
									]}
									placeholder="contact@restaurant.com"
									placeholderTextColor={
										theme === "dark" ? "#64748b" : "#94a3b8"
									}
									keyboardType="email-address"
									autoCapitalize="none"
									value={newRestaurant.email}
									onChangeText={(text) =>
										setNewRestaurant({ ...newRestaurant, email: text })
									}
								/>
							</View>

							<View style={styles.formGroup}>
								<Text
									style={[
										styles.label,
										{ color: theme === "dark" ? "#cbd5e1" : "#475569" },
									]}
								>
									Mot de passe *
								</Text>
								<TextInput
									style={[
										styles.input,
										{
											backgroundColor:
												theme === "dark"
													? "rgba(30,41,59,0.5)"
													: "rgba(248,250,252,1)",
											color: theme === "dark" ? "#f1f5f9" : "#1e293b",
											borderColor:
												theme === "dark"
													? "rgba(100,116,139,0.3)"
													: "rgba(203,213,225,1)",
										},
									]}
									placeholder="Mot de passe sécurisé"
									placeholderTextColor={
										theme === "dark" ? "#64748b" : "#94a3b8"
									}
									secureTextEntry
									value={newRestaurant.password}
									onChangeText={(text) =>
										setNewRestaurant({ ...newRestaurant, password: text })
									}
								/>
							</View>

							<View style={styles.formGroup}>
								<Text
									style={[
										styles.label,
										{ color: theme === "dark" ? "#cbd5e1" : "#475569" },
									]}
								>
									Téléphone
								</Text>
								<TextInput
									style={[
										styles.input,
										{
											backgroundColor:
												theme === "dark"
													? "rgba(30,41,59,0.5)"
													: "rgba(248,250,252,1)",
											color: theme === "dark" ? "#f1f5f9" : "#1e293b",
											borderColor:
												theme === "dark"
													? "rgba(100,116,139,0.3)"
													: "rgba(203,213,225,1)",
										},
									]}
									placeholder="+33 1 23 45 67 89"
									placeholderTextColor={
										theme === "dark" ? "#64748b" : "#94a3b8"
									}
									keyboardType="phone-pad"
									value={newRestaurant.phone}
									onChangeText={(text) =>
										setNewRestaurant({ ...newRestaurant, phone: text })
									}
								/>
							</View>

							<View style={styles.formGroup}>
								<Text
									style={[
										styles.label,
										{ color: theme === "dark" ? "#cbd5e1" : "#475569" },
									]}
								>
									Adresse
								</Text>
								<TextInput
									style={[
										styles.input,
										{
											backgroundColor:
												theme === "dark"
													? "rgba(30,41,59,0.5)"
													: "rgba(248,250,252,1)",
											color: theme === "dark" ? "#f1f5f9" : "#1e293b",
											borderColor:
												theme === "dark"
													? "rgba(100,116,139,0.3)"
													: "rgba(203,213,225,1)",
										},
									]}
									placeholder="123 Rue de la Paix, Paris"
									placeholderTextColor={
										theme === "dark" ? "#64748b" : "#94a3b8"
									}
									value={newRestaurant.address}
									onChangeText={(text) =>
										setNewRestaurant({ ...newRestaurant, address: text })
									}
								/>
							</View>

							<View style={styles.formGroup}>
								<Text
									style={[
										styles.label,
										{ color: theme === "dark" ? "#cbd5e1" : "#475569" },
									]}
								>
									Durée moyenne de service (minutes)
								</Text>
								<TextInput
									style={[
										styles.input,
										{
											backgroundColor:
												theme === "dark"
													? "rgba(30,41,59,0.5)"
													: "rgba(248,250,252,1)",
											color: theme === "dark" ? "#f1f5f9" : "#1e293b",
											borderColor:
												theme === "dark"
													? "rgba(100,116,139,0.3)"
													: "rgba(203,213,225,1)",
										},
									]}
									placeholder="120"
									placeholderTextColor={
										theme === "dark" ? "#64748b" : "#94a3b8"
									}
									keyboardType="numeric"
									value={newRestaurant.turnoverTime}
									onChangeText={(text) =>
										setNewRestaurant({ ...newRestaurant, turnoverTime: text })
									}
								/>
							</View>

							<TouchableOpacity
								style={[
									styles.createButton,
									{
										backgroundColor: theme === "dark" ? "#10b981" : "#059669",
										opacity: creatingRestaurant ? 0.6 : 1,
									},
								]}
								onPress={handleCreateRestaurant}
								disabled={creatingRestaurant}
							>
								{creatingRestaurant ? (
									<ActivityIndicator color="#fff" />
								) : (
									<>
										<Ionicons name="checkmark-circle" size={24} color="#fff" />
										<Text style={styles.createButtonText}>
											Créer le Restaurant
										</Text>
									</>
								)}
							</TouchableOpacity>
						</ScrollView>
					</View>
				</View>
			</Modal>
		</LinearGradient>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	header: {
		padding: 20,
		paddingTop: Platform.OS === "ios" ? 60 : 40,
	},
	titleContainer: {
		flexDirection: "row",
		alignItems: "center",
		marginBottom: 8,
		gap: 12,
	},
	iconBadge: {
		width: 48,
		height: 48,
		borderRadius: 12,
		justifyContent: "center",
		alignItems: "center",
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.3,
		shadowRadius: 8,
		elevation: 5,
	},
	title: {
		fontSize: 28,
		fontWeight: "bold",
	},
	subtitle: {
		fontSize: 14,
		marginBottom: 16,
	},
	actionButtons: {
		flexDirection: "row",
		gap: 12,
	},
	actionButton: {
		flex: 1,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: 14,
		paddingHorizontal: 16,
		borderRadius: 12,
		gap: 8,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.2,
		shadowRadius: 4,
		elevation: 3,
	},
	actionButtonText: {
		color: "#fff",
		fontSize: 14,
		fontWeight: "600",
	},
	searchContainer: {
		flexDirection: "row",
		alignItems: "center",
		marginHorizontal: 20,
		marginBottom: 12,
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderRadius: 12,
		gap: 12,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
		elevation: 2,
	},
	searchInput: {
		flex: 1,
		fontSize: 16,
	},
	count: {
		fontSize: 14,
		marginHorizontal: 20,
		marginBottom: 12,
		fontWeight: "500",
	},
	list: {
		paddingHorizontal: 20,
		paddingBottom: 40,
	},
	restaurantCard: {
		borderRadius: 16,
		marginBottom: 16,
		overflow: "hidden",
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.15,
		shadowRadius: 8,
		elevation: 4,
	},
	restaurantContent: {
		padding: 16,
	},
	restaurantHeader: {
		flexDirection: "row",
		alignItems: "flex-start",
		gap: 12,
	},
	iconContainer: {
		width: 56,
		height: 56,
		borderRadius: 12,
		justifyContent: "center",
		alignItems: "center",
	},
	restaurantInfo: {
		flex: 1,
	},
	restaurantName: {
		fontSize: 18,
		fontWeight: "700",
		marginBottom: 4,
	},
	restaurantEmail: {
		fontSize: 13,
		marginBottom: 2,
	},
	restaurantAddress: {
		fontSize: 12,
		marginTop: 4,
	},
	statsRow: {
		flexDirection: "row",
		gap: 16,
		marginTop: 8,
	},
	stat: {
		flexDirection: "row",
		alignItems: "center",
		gap: 4,
	},
	statText: {
		fontSize: 12,
		fontWeight: "500",
	},
	toggleContainer: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderTopWidth: 1,
		borderTopColor: "rgba(100,116,139,0.2)",
	},
	toggleLabel: {
		fontSize: 14,
		fontWeight: "600",
	},
	loadingContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		gap: 16,
	},
	loadingText: {
		fontSize: 16,
	},
	emptyContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		paddingVertical: 60,
		gap: 16,
	},
	emptyText: {
		fontSize: 16,
	},
	modalOverlay: {
		flex: 1,
		backgroundColor: "rgba(0,0,0,0.6)",
		justifyContent: "flex-end",
	},
	modalContent: {
		borderTopLeftRadius: 24,
		borderTopRightRadius: 24,
		maxHeight: "90%",
		shadowColor: "#000",
		shadowOffset: { width: 0, height: -4 },
		shadowOpacity: 0.3,
		shadowRadius: 12,
		elevation: 10,
	},
	modalHeader: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		padding: 20,
		borderBottomWidth: 1,
		borderBottomColor: "rgba(100,116,139,0.2)",
	},
	modalTitle: {
		fontSize: 22,
		fontWeight: "bold",
	},
	formContainer: {
		padding: 20,
	},
	formGroup: {
		marginBottom: 20,
	},
	label: {
		fontSize: 14,
		fontWeight: "600",
		marginBottom: 8,
	},
	input: {
		paddingHorizontal: 16,
		paddingVertical: 14,
		borderRadius: 12,
		fontSize: 16,
		borderWidth: 1,
	},
	createButton: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: 16,
		borderRadius: 12,
		gap: 8,
		marginTop: 12,
		marginBottom: 20,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.2,
		shadowRadius: 6,
		elevation: 4,
	},
	createButtonText: {
		color: "#fff",
		fontSize: 16,
		fontWeight: "700",
	},
	planBadge: {
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 12,
		alignSelf: "flex-start",
	},
	planText: {
		color: "#fff",
		fontSize: 11,
		fontWeight: "700",
		letterSpacing: 0.5,
	},
	planAndActions: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		marginTop: 12,
		paddingTop: 12,
		borderTopWidth: 1,
		borderTopColor: "rgba(100,116,139,0.15)",
	},
	deleteIcons: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
	},
	iconButton: {
		width: 36,
		height: 36,
		borderRadius: 8,
		backgroundColor: "rgba(0,0,0,0.05)",
		alignItems: "center",
		justifyContent: "center",
	},
});

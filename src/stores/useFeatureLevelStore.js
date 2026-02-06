/**
 * 🎯 Store de Niveaux Fonctionnels - SERVICE (Frontend)
 *
 * Gère le niveau fonctionnel de l'application serveur selon la catégorie du restaurant.
 * Permet de vérifier facilement si une fonctionnalité est disponible.
 */

import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Configuration inline (évite les problèmes d'import shared-api en React Native)
const LEVELS = {
	COMPLET: "complet",
	INTERMEDIAIRE: "intermediaire",
	MINIMUM: "minimum",
};

const CATEGORY_TO_LEVEL = {
	restaurant: LEVELS.COMPLET,
	snack: LEVELS.INTERMEDIAIRE,
	foodtruck: LEVELS.MINIMUM,
	cafe: LEVELS.INTERMEDIAIRE,
	boulangerie: LEVELS.INTERMEDIAIRE,
	bar: LEVELS.INTERMEDIAIRE,
};

const SERVICE_FEATURES = {
	CAISSE_COMPLETE: "caisse_complete",
	CAISSE_SIMPLE: "caisse_simple",
	STATUT_COMMANDES: "statut_commandes",
	STATUT_COMMANDES_SIMPLIFIE: "statut_commandes_simplifie",
	PLAN_SALLE: "plan_salle",
	CHAT_CLIENT: "chat_client",
	STATISTIQUES: "statistiques",
	AUTO_TABLES: "auto_tables",
	CALENDRIER: "calendrier",
	ACTIVITE: "activite",
	RECHERCHE_GLOBALE: "recherche_globale",
	GESTION_STOCKS: "gestion_stocks",
	REGLAGES_COMPLETS: "reglages_complets",
	REGLAGES_BASIQUES: "reglages_basiques",
	RESERVATIONS: "reservations",
	ALLERGIES_VISIBLES: "allergies_visibles",
};

const SERVICE_LEVEL_CONFIG = {
	[LEVELS.COMPLET]: {
		label: "Complet",
		description: "Restaurant classique - Dashboard complet",
		features: [
			SERVICE_FEATURES.CAISSE_COMPLETE,
			SERVICE_FEATURES.STATUT_COMMANDES,
			SERVICE_FEATURES.PLAN_SALLE,
			SERVICE_FEATURES.CHAT_CLIENT,
			SERVICE_FEATURES.STATISTIQUES,
			SERVICE_FEATURES.AUTO_TABLES,
			SERVICE_FEATURES.CALENDRIER,
			SERVICE_FEATURES.ACTIVITE,
			SERVICE_FEATURES.RECHERCHE_GLOBALE,
			SERVICE_FEATURES.GESTION_STOCKS,
			SERVICE_FEATURES.REGLAGES_COMPLETS,
			SERVICE_FEATURES.RESERVATIONS,
			SERVICE_FEATURES.ALLERGIES_VISIBLES,
		],
		tabs: ["activity", "floor", "reglage"],
	},
	[LEVELS.INTERMEDIAIRE]: {
		label: "Intermédiaire",
		description: "Snack / Fast Food - Dashboard simplifié",
		features: [
			SERVICE_FEATURES.CAISSE_COMPLETE,
			SERVICE_FEATURES.STATUT_COMMANDES,
			SERVICE_FEATURES.GESTION_STOCKS,
			SERVICE_FEATURES.REGLAGES_COMPLETS,
			SERVICE_FEATURES.RESERVATIONS,
			SERVICE_FEATURES.RECHERCHE_GLOBALE,
			SERVICE_FEATURES.ALLERGIES_VISIBLES,
		],
		tabs: ["floor", "reglage"],
	},
	[LEVELS.MINIMUM]: {
		label: "Minimum",
		description: "Food Truck - Essentiel uniquement",
		features: [
			SERVICE_FEATURES.CAISSE_SIMPLE,
			SERVICE_FEATURES.STATUT_COMMANDES_SIMPLIFIE,
			SERVICE_FEATURES.REGLAGES_BASIQUES,
		],
		tabs: ["floor", "reglage"],
	},
};

// Fonction utilitaire
const getLevelFromCategory = (category) => {
	return CATEGORY_TO_LEVEL[category] || LEVELS.COMPLET;
};

const getServiceConfig = (category) => {
	const level = getLevelFromCategory(category);
	return {
		level,
		...SERVICE_LEVEL_CONFIG[level],
	};
};

// ============ STORE ZUSTAND ============

export const useFeatureLevelStore = create((set, get) => ({
	// État
	level: LEVELS.COMPLET,
	category: "restaurant",
	features: [],
	tabs: ["activity", "floor", "reglage"],
	isInitialized: false,

	// ============ ACTIONS ============

	/**
	 * Initialise le store depuis AsyncStorage ou avec une catégorie donnée
	 * @param {string} category - Catégorie du restaurant (optionnel)
	 */
	init: async (category = null) => {
		try {
			// Si pas de catégorie fournie, la récupérer depuis AsyncStorage
			let cat = category;
			if (!cat) {
				cat = await AsyncStorage.getItem("category");
			}
			cat = cat || "restaurant";

			const config = getServiceConfig(cat);

			console.log(`🎯 [SERVICE] Feature Level initialisé:`, {
				category: cat,
				level: config.level,
				tabs: config.tabs,
				featuresCount: config.features.length,
			});

			set({
				level: config.level,
				category: cat,
				features: config.features,
				tabs: config.tabs,
				isInitialized: true,
			});

			return config;
		} catch (error) {
			console.error("❌ Erreur init FeatureLevelStore:", error);
			// Fallback niveau complet
			const config = getServiceConfig("restaurant");
			set({
				level: config.level,
				category: "restaurant",
				features: config.features,
				tabs: config.tabs,
				isInitialized: true,
			});
			return config;
		}
	},

	/**
	 * Met à jour le niveau selon une nouvelle catégorie
	 * @param {string} category - Nouvelle catégorie
	 */
	setCategory: (category) => {
		const config = getServiceConfig(category);
		set({
			level: config.level,
			category,
			features: config.features,
			tabs: config.tabs,
		});
	},

	/**
	 * Vérifie si une fonctionnalité est active
	 * @param {string} feature - Clé de la fonctionnalité
	 * @returns {boolean}
	 */
	hasFeature: (feature) => {
		const { features } = get();
		return features.includes(feature);
	},

	/**
	 * Reset le store
	 */
	reset: () => {
		set({
			level: LEVELS.COMPLET,
			category: "restaurant",
			features: [],
			tabs: ["activity", "floor", "reglage"],
			isInitialized: false,
		});
	},

	// ============ GETTERS PRATIQUES ============

	// Plan de salle
	hasPlanSalle: () => get().hasFeature(SERVICE_FEATURES.PLAN_SALLE),

	// Chat client
	hasChatClient: () => get().hasFeature(SERVICE_FEATURES.CHAT_CLIENT),

	// Statistiques
	hasStatistiques: () => get().hasFeature(SERVICE_FEATURES.STATISTIQUES),

	// Auto-attribution tables
	hasAutoTables: () => get().hasFeature(SERVICE_FEATURES.AUTO_TABLES),

	// Calendrier
	hasCalendrier: () => get().hasFeature(SERVICE_FEATURES.CALENDRIER),

	// Activité
	hasActivite: () => get().hasFeature(SERVICE_FEATURES.ACTIVITE),

	// Recherche globale
	hasRechercheGlobale: () =>
		get().hasFeature(SERVICE_FEATURES.RECHERCHE_GLOBALE),

	// Gestion stocks
	hasGestionStocks: () => get().hasFeature(SERVICE_FEATURES.GESTION_STOCKS),

	// Réservations
	hasReservations: () => get().hasFeature(SERVICE_FEATURES.RESERVATIONS),

	// Allergies visibles
	hasAllergiesVisibles: () =>
		get().hasFeature(SERVICE_FEATURES.ALLERGIES_VISIBLES),

	// Caisse complète
	hasCaisseComplete: () => get().hasFeature(SERVICE_FEATURES.CAISSE_COMPLETE),

	// Réglages complets
	hasReglagesComplets: () =>
		get().hasFeature(SERVICE_FEATURES.REGLAGES_COMPLETS),

	// Vérifications de niveau
	isMinimum: () => get().level === LEVELS.MINIMUM,
	isIntermediate: () => get().level === LEVELS.INTERMEDIAIRE,
	isComplete: () => get().level === LEVELS.COMPLET,

	// Obtient les tabs disponibles
	getAvailableTabs: () => get().tabs,
}));

// ============ HOOK PRATIQUE ============

/**
 * Hook pour accéder facilement aux fonctionnalités SERVICE
 * @returns {object} Objet avec les vérifications de fonctionnalités
 */
export const useFeatureLevel = () => {
	const store = useFeatureLevelStore();

	return {
		level: store.level,
		category: store.category,
		tabs: store.tabs,
		isInitialized: store.isInitialized,

		// Fonctionnalités
		hasPlanSalle: store.hasPlanSalle(),
		hasChatClient: store.hasChatClient(),
		hasStatistiques: store.hasStatistiques(),
		hasAutoTables: store.hasAutoTables(),
		hasCalendrier: store.hasCalendrier(),
		hasActivite: store.hasActivite(),
		hasRechercheGlobale: store.hasRechercheGlobale(),
		hasGestionStocks: store.hasGestionStocks(),
		hasReservations: store.hasReservations(),
		hasAllergiesVisibles: store.hasAllergiesVisibles(),
		hasCaisseComplete: store.hasCaisseComplete(),
		hasReglagesComplets: store.hasReglagesComplets(),

		// Niveaux
		isMinimum: store.isMinimum(),
		isIntermediate: store.isIntermediate(),
		isComplete: store.isComplete(),

		// Vérification générique
		hasFeature: store.hasFeature,
		getAvailableTabs: store.getAvailableTabs,
	};
};

// Export des constantes pour usage externe
export { LEVELS, SERVICE_FEATURES, CATEGORY_TO_LEVEL };

export default useFeatureLevelStore;

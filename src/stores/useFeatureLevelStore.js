/**
 * 🎯 Store de Niveaux Fonctionnels - SERVICE (Frontend)
 *
 * Gère le niveau fonctionnel de l'application serveur selon la catégorie du restaurant.
 * Permet de vérifier facilement si une fonctionnalité est disponible.
 *
 * ──────────────────────────────────────────────
 * MATRICE DES FEATURES PAR TYPE DE RESTAURANT :
 *
 * COMPLET    (restaurant classique) :
 *   Toutes les features sauf CUISINE et COMMANDES_EXPRESS.
 *   + Bouton FAB = réservation uniquement.
 *   Toggleable : CHAT_CLIENT (messagerie)
 *
 * INTERMEDIAIRE (fast-food, snack, café, bar, boulangerie) :
 *   Caisse, Commandes, Stocks, Réglages, Réservations, Recherche, Allergies,
 *   CUISINE (vue FastFoodKitchen), FAB_FAST_COMMANDE.
 *   Pas de Plan de Salle, Activité, Calendrier, Messagerie, Auto-Tables,
 *   Section Cuisine dans Floor.jsx.
 *   Toggleable : GESTION_STOCKS
 *
 * MINIMUM    (foodtruck) :
 *   Caisse Simple, Commandes Simplifiée, COMMANDES_EXPRESS, FAB_FAST_COMMANDE,
 *   Stocks, Réglages simples.
 *   Pas de floor plan, Messagerie, Calendrier, Activité.
 *   Toggleable : FAB_FAST_COMMANDE
 * ──────────────────────────────────────────────
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
	"fast-food": LEVELS.INTERMEDIAIRE,
	foodtruck: LEVELS.MINIMUM,
	cafe: LEVELS.INTERMEDIAIRE,
	boulangerie: LEVELS.INTERMEDIAIRE,
	bar: LEVELS.INTERMEDIAIRE,
};

const SERVICE_FEATURES = {
	// ── Caisse ──
	CAISSE_COMPLETE: "caisse_complete",
	CAISSE_SIMPLE: "caisse_simple",
	// ── Commandes ──
	STATUT_COMMANDES: "statut_commandes",
	STATUT_COMMANDES_SIMPLIFIE: "statut_commandes_simplifie",
	// ── Salle / Plan ──
	PLAN_SALLE: "plan_salle",
	SALLE_CUISINE: "salle_cuisine", // Sidebar Cuisine (Boissons/Entrées/Plats/Desserts) dans Floor.jsx
	// ── Communication ──
	CHAT_CLIENT: "chat_client",
	// ── Analytics ──
	STATISTIQUES: "statistiques",
	// ── Assignation tables ──
	AUTO_TABLES: "auto_tables",
	// ── Planning ──
	CALENDRIER: "calendrier",
	ACTIVITE: "activite",
	// ── Recherche ──
	RECHERCHE_GLOBALE: "recherche_globale",
	// ── Stocks ──
	GESTION_STOCKS: "gestion_stocks",
	// ── Paramètres ──
	REGLAGES_COMPLETS: "reglages_complets",
	REGLAGES_BASIQUES: "reglages_basiques",
	// ── Réservations ──
	RESERVATIONS: "reservations",
	// ── Allergènes ──
	ALLERGIES_VISIBLES: "allergies_visibles",
	// ── Fast-Food : vue cuisine dans Dashboard ──
	CUISINE: "cuisine",
	// ── Foodtruck : commandes express ──
	COMMANDES_EXPRESS: "commandes_express",
	// ── Fast-Food + Foodtruck : bouton FAB crée une commande directe ──
	FAB_FAST_COMMANDE: "fab_fast_commande",
	// ── Gestion des plats ──
	GESTION_PLATS: "gestion_plats",
	// ── Pourboire ──
	POURBOIRE: "pourboire",
	// ── Messagerie interne (staff ↔ staff) ──
	MESSAGERIE_INTERNE: "messagerie_interne",
	// ── Notifications push ──
	NOTIFICATIONS_PUSH: "notifications_push",
	// ── Comptabilité avancée ──
	COMPTABILITE: "comptabilite",
	// ── Avis Google ──
	AVIS_GOOGLE: "avis_google",

	// ─────────────────────────────────────────────────────────────────
	// ⭐ FONCTIONNALITÉS IA PREMIUM (réservation intelligente)
	// Toutes actives par défaut pour COMPLET, toggleables depuis le mode dev
	// ─────────────────────────────────────────────────────────────────

	// 4. Assignation automatique de table (bouton "Auto" dans AssignTableModal)
	AI_AUTO_ASSIGN: "ai_auto_assign",

	// 6. Suggestions d'horaires alternatifs si créneau complet
	AI_SLOT_SUGGESTIONS: "ai_slot_suggestions",

	// 7. Heatmap d'occupation par jour/créneau (page Analytics)
	AI_HEATMAP: "ai_heatmap",

	// 8. Protection anti-trous entre réservations (badges AgendaView)
	AI_ANTI_GAPS: "ai_anti_gaps",

	// 9. Durée intelligente selon taille groupe (NewReservationModal)
	AI_SMART_DURATION: "ai_smart_duration",

	// 10. Liste d'attente intelligente + promotion automatique
	AI_WAITING_LIST: "ai_waiting_list",

	// 11. Prédiction de remplissage dans l'en-tête AgendaScreen
	AI_PREDICTION: "ai_prediction",

	// 12. Recommandations horaires stratégiques (page Analytics)
	AI_STRATEGIC_SLOTS: "ai_strategic_slots",
};

const SERVICE_LEVEL_CONFIG = {
	[LEVELS.COMPLET]: {
		label: "Complet",
		description: "Restaurant classique - Dashboard complet",
		features: [
			SERVICE_FEATURES.CAISSE_COMPLETE,
			SERVICE_FEATURES.STATUT_COMMANDES,
			SERVICE_FEATURES.PLAN_SALLE,
			SERVICE_FEATURES.SALLE_CUISINE,
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
			SERVICE_FEATURES.GESTION_PLATS,
			SERVICE_FEATURES.POURBOIRE,
			SERVICE_FEATURES.MESSAGERIE_INTERNE,
			SERVICE_FEATURES.NOTIFICATIONS_PUSH,
			SERVICE_FEATURES.COMPTABILITE,
			SERVICE_FEATURES.AVIS_GOOGLE,
			// ⭐ IA Premium — actives par défaut, toggleables mode dev
			SERVICE_FEATURES.AI_AUTO_ASSIGN,
			SERVICE_FEATURES.AI_SLOT_SUGGESTIONS,
			SERVICE_FEATURES.AI_HEATMAP,
			SERVICE_FEATURES.AI_ANTI_GAPS,
			SERVICE_FEATURES.AI_SMART_DURATION,
			SERVICE_FEATURES.AI_WAITING_LIST,
			SERVICE_FEATURES.AI_PREDICTION,
			SERVICE_FEATURES.AI_STRATEGIC_SLOTS,
		],
		tabs: ["activity", "floor", "agenda", "reglage"],
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
			SERVICE_FEATURES.CUISINE,
			SERVICE_FEATURES.FAB_FAST_COMMANDE,
			SERVICE_FEATURES.GESTION_PLATS,
			SERVICE_FEATURES.POURBOIRE,
			SERVICE_FEATURES.MESSAGERIE_INTERNE,
			SERVICE_FEATURES.NOTIFICATIONS_PUSH,
			SERVICE_FEATURES.AVIS_GOOGLE,
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
			SERVICE_FEATURES.GESTION_STOCKS,
			SERVICE_FEATURES.COMMANDES_EXPRESS,
			SERVICE_FEATURES.FAB_FAST_COMMANDE,
			SERVICE_FEATURES.GESTION_PLATS,
			SERVICE_FEATURES.NOTIFICATIONS_PUSH,
			SERVICE_FEATURES.AVIS_GOOGLE,
		],
		tabs: ["floor", "reglage"],
	},
};

// ============ UTILITIES ============

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

/**
 * Applique les overrides (Map<feature, boolean>) sur une liste de features.
 * - override = true  → ajoute la feature si absente
 * - override = false → retire la feature si présente
 */
const applyFeatureOverrides = (features, overrides = {}) => {
	let result = [...features];
	Object.entries(overrides).forEach(([feature, enabled]) => {
		if (enabled && !result.includes(feature)) {
			result.push(feature);
		} else if (!enabled) {
			result = result.filter((f) => f !== feature);
		}
	});
	return result;
};

// ============ STORE ZUSTAND ============

export const useFeatureLevelStore = create((set, get) => ({
	// État
	level: LEVELS.COMPLET,
	category: "restaurant",
	features: [],
	tabs: ["activity", "floor", "agenda", "reglage"],
	isInitialized: false,

	// ============ ACTIONS ============

	/**
	 * Initialise le store depuis AsyncStorage ou avec une catégorie donnée.
	 * Applique ensuite les overrides persistés (featureOverrides en AsyncStorage).
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

			// Lire les overrides persistés (stockés lors du login ou depuis DeveloperSelector)
			let baseFeatures = [...config.features];
			try {
				const overridesRaw = await AsyncStorage.getItem("featureOverrides");
				if (overridesRaw) {
					const overrides = JSON.parse(overridesRaw);
					baseFeatures = applyFeatureOverrides(baseFeatures, overrides);
				}
			} catch (overrideErr) {
				console.warn("⚠️ Erreur lecture featureOverrides:", overrideErr);
			}

			set({
				level: config.level,
				category: cat,
				features: baseFeatures,
				tabs: config.tabs,
				isInitialized: true,
			});

			return { ...config, features: baseFeatures };
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
	 * Applique des overrides (Map<feature, boolean>) sur les features actives.
	 * Persiste aussi les overrides dans AsyncStorage pour les sessions suivantes.
	 * @param {Record<string, boolean>} overrides
	 */
	applyOverrides: async (overrides = {}) => {
		try {
			// Recalculer depuis la base (catégorie actuelle) + appliquer les overrides
			const { category } = get();
			const config = getServiceConfig(category);
			const updatedFeatures = applyFeatureOverrides(config.features, overrides);

			// Persister dans AsyncStorage
			await AsyncStorage.setItem("featureOverrides", JSON.stringify(overrides));

			set({ features: updatedFeatures });
		} catch (err) {
			console.error("❌ Erreur applyOverrides:", err);
		}
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
			tabs: ["activity", "floor", "agenda", "reglage"],
			isInitialized: false,
		});
	},

	// ============ GETTERS PRATIQUES ============

	// Plan de salle (restaurant classique)
	hasPlanSalle: () => get().hasFeature(SERVICE_FEATURES.PLAN_SALLE),

	// Sidebar Cuisine dans Floor.jsx (Boissons/Entrées/Plats/Desserts) — restaurant uniquement
	hasSalleCuisine: () => get().hasFeature(SERVICE_FEATURES.SALLE_CUISINE),

	// Chat client / messagerie
	hasChatClient: () => get().hasFeature(SERVICE_FEATURES.CHAT_CLIENT),

	// Statistiques
	hasStatistiques: () => get().hasFeature(SERVICE_FEATURES.STATISTIQUES),

	// Auto-attribution tables
	hasAutoTables: () => get().hasFeature(SERVICE_FEATURES.AUTO_TABLES),

	// Calendrier
	hasCalendrier: () => get().hasFeature(SERVICE_FEATURES.CALENDRIER),

	// Activité (onglet + dashboard avancé)
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

	// Vue FastFoodKitchen dans Dashboard (fast-food)
	hasCuisine: () => get().hasFeature(SERVICE_FEATURES.CUISINE),

	// Commandes Express (foodtruck)
	hasCommandesExpress: () =>
		get().hasFeature(SERVICE_FEATURES.COMMANDES_EXPRESS),

	// Bouton FAB crée une commande directe (fast-food + foodtruck)
	hasFabFastCommande: () =>
		get().hasFeature(SERVICE_FEATURES.FAB_FAST_COMMANDE),

	// Gestion des plats
	hasGestionPlats: () => get().hasFeature(SERVICE_FEATURES.GESTION_PLATS),

	// Pourboire
	hasPourboire: () => get().hasFeature(SERVICE_FEATURES.POURBOIRE),

	// Messagerie interne (staff ↔ staff)
	hasMessagerieInterne: () =>
		get().hasFeature(SERVICE_FEATURES.MESSAGERIE_INTERNE),

	// Notifications push
	hasNotificationsPush: () =>
		get().hasFeature(SERVICE_FEATURES.NOTIFICATIONS_PUSH),

	// Comptabilité avancée
	hasComptabilite: () => get().hasFeature(SERVICE_FEATURES.COMPTABILITE),

	// Avis Google
	hasAvisGoogle: () => get().hasFeature(SERVICE_FEATURES.AVIS_GOOGLE),

	// ── IA Premium ──
	hasAiAutoAssign: () => get().hasFeature(SERVICE_FEATURES.AI_AUTO_ASSIGN),
	hasAiSlotSuggestions: () =>
		get().hasFeature(SERVICE_FEATURES.AI_SLOT_SUGGESTIONS),
	hasAiHeatmap: () => get().hasFeature(SERVICE_FEATURES.AI_HEATMAP),
	hasAiAntiGaps: () => get().hasFeature(SERVICE_FEATURES.AI_ANTI_GAPS),
	hasAiSmartDuration: () =>
		get().hasFeature(SERVICE_FEATURES.AI_SMART_DURATION),
	hasAiWaitingList: () => get().hasFeature(SERVICE_FEATURES.AI_WAITING_LIST),
	hasAiPrediction: () => get().hasFeature(SERVICE_FEATURES.AI_PREDICTION),
	hasAiStrategicSlots: () =>
		get().hasFeature(SERVICE_FEATURES.AI_STRATEGIC_SLOTS),

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

		// Fonctionnalités (restaurant classique)
		hasPlanSalle: store.hasPlanSalle(),
		hasSalleCuisine: store.hasSalleCuisine(), // Sidebar Boissons/Entrées/Plats/Desserts dans Floor.jsx
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

		// Fonctionnalités (fast-food)
		hasCuisine: store.hasCuisine(), // Vue FastFoodKitchen dans Dashboard
		hasFabFastCommande: store.hasFabFastCommande(), // FAB → commande directe

		// Fonctionnalités (foodtruck)
		hasCommandesExpress: store.hasCommandesExpress(),

		// Nouvelles fonctionnalités universelles
		hasGestionPlats: store.hasGestionPlats(),
		hasPourboire: store.hasPourboire(),
		hasMessagerieInterne: store.hasMessagerieInterne(),
		hasNotificationsPush: store.hasNotificationsPush(),
		hasComptabilite: store.hasComptabilite(),
		hasAvisGoogle: store.hasAvisGoogle(),

		// ⭐ IA Premium (toggleables depuis le mode dev)
		hasAiAutoAssign: store.hasAiAutoAssign(),
		hasAiSlotSuggestions: store.hasAiSlotSuggestions(),
		hasAiHeatmap: store.hasAiHeatmap(),
		hasAiAntiGaps: store.hasAiAntiGaps(),
		hasAiSmartDuration: store.hasAiSmartDuration(),
		hasAiWaitingList: store.hasAiWaitingList(),
		hasAiPrediction: store.hasAiPrediction(),
		hasAiStrategicSlots: store.hasAiStrategicSlots(),

		// Niveaux
		isMinimum: store.isMinimum(),
		isIntermediate: store.isIntermediate(),
		isComplete: store.isComplete(),

		// Vérification générique
		hasFeature: store.hasFeature,
		getAvailableTabs: store.getAvailableTabs,

		// Action : appliquer des overrides depuis l'extérieur
		applyOverrides: store.applyOverrides,
	};
};

// Export des constantes pour usage externe
export { LEVELS, SERVICE_FEATURES, CATEGORY_TO_LEVEL };

export default useFeatureLevelStore;

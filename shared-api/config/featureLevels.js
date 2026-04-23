/**
 * 🎯 Configuration des Niveaux Fonctionnels SunnyGo
 *
 * Ce fichier définit les fonctionnalités disponibles selon :
 * - Le type de restaurant (category)
 * - L'application (SELF = client-end / SERVICE = frontend)
 *
 * Niveaux :
 * - COMPLET (restaurant classique) : Toutes les fonctionnalités
 * - INTERMEDIAIRE (snack/fast food) : Fonctionnalités réduites
 * - MINIMUM (food truck) : Fonctionnalités essentielles uniquement
 */

// ============ CONSTANTES ============

export const LEVELS = {
	COMPLET: "complet",
	INTERMEDIAIRE: "intermediaire",
	MINIMUM: "minimum",
};

export const CATEGORIES = {
	RESTAURANT: "restaurant",
	SNACK: "snack",
	FOODTRUCK: "foodtruck",
	CAFE: "cafe",
	BOULANGERIE: "boulangerie",
	BAR: "bar",
};

// ============ MAPPING CATÉGORIE → NIVEAU ============

export const CATEGORY_TO_LEVEL = {
	[CATEGORIES.RESTAURANT]: LEVELS.COMPLET,
	[CATEGORIES.SNACK]: LEVELS.INTERMEDIAIRE,
	[CATEGORIES.FOODTRUCK]: LEVELS.MINIMUM,
	// Catégories additionnelles → niveau par défaut
	[CATEGORIES.CAFE]: LEVELS.INTERMEDIAIRE,
	[CATEGORIES.BOULANGERIE]: LEVELS.INTERMEDIAIRE,
	[CATEGORIES.BAR]: LEVELS.INTERMEDIAIRE,
};

// ============ FONCTIONNALITÉS SELF (CLIENT-END) ============

export const SELF_FEATURES = {
	// 📖 Menu
	MENU_COMPLET: "menu_complet",
	MENU_SIMPLIFIE: "menu_simplifie",

	// 💬 Restrictions & Allergies
	RESTRICTIONS: "restrictions",
	ALLERGIES: "allergies",

	// 💳 Paiement
	STRIPE_PAYMENT: "stripe_payment",

	// 💡 Suggestions
	SUGGESTIONS: "suggestions",
	SUGGESTIONS_RAPIDES: "suggestions_rapides",

	// 📶 WebSocket
	WEBSOCKET_REALTIME: "websocket_realtime",

	// 🧾 Ticket
	TICKET_CAISSE: "ticket_caisse",

	// 🪑 Tables
	TABLE_DYNAMIQUE: "table_dynamique", // Attribution dynamique (restaurant)
	TABLE_TEMPORAIRE: "table_temporaire", // Table temporaire par client (snack)
	TABLE_UNIQUE: "table_unique", // Table unique partagée (foodtruck)
};

// ============ FONCTIONNALITÉS SERVICE (FRONTEND) ============

export const SERVICE_FEATURES = {
	// 🧾 Caisse
	CAISSE_COMPLETE: "caisse_complete",
	CAISSE_SIMPLE: "caisse_simple",

	// 🍽️ Commandes
	STATUT_COMMANDES: "statut_commandes",
	STATUT_COMMANDES_SIMPLIFIE: "statut_commandes_simplifie",

	// 🪑 Plan de salle
	PLAN_SALLE: "plan_salle",

	// 💬 Chat
	CHAT_CLIENT: "chat_client",

	// 📈 Stats
	STATISTIQUES: "statistiques",

	// 🤖 Automatisation
	AUTO_TABLES: "auto_tables",

	// 📅 Calendrier
	CALENDRIER: "calendrier",
	ACTIVITE: "activite",

	// 🧠 Recherche
	RECHERCHE_GLOBALE: "recherche_globale",

	// 📦 Stocks
	GESTION_STOCKS: "gestion_stocks",

	// 🧩 Réglages
	REGLAGES_COMPLETS: "reglages_complets",
	REGLAGES_BASIQUES: "reglages_basiques",

	// 📅 Réservations
	RESERVATIONS: "reservations",

	// 💬 Allergies/Restrictions visibles
	ALLERGIES_VISIBLES: "allergies_visibles",
};

// ============ CONFIGURATION PAR NIVEAU - SELF ============

export const SELF_LEVEL_CONFIG = {
	[LEVELS.COMPLET]: {
		label: "Complet",
		description: "Restaurant classique - Toutes les fonctionnalités",
		features: [
			SELF_FEATURES.MENU_COMPLET,
			SELF_FEATURES.RESTRICTIONS,
			SELF_FEATURES.ALLERGIES,
			SELF_FEATURES.STRIPE_PAYMENT,
			SELF_FEATURES.SUGGESTIONS,
			SELF_FEATURES.WEBSOCKET_REALTIME,
			SELF_FEATURES.TICKET_CAISSE,
			SELF_FEATURES.TABLE_DYNAMIQUE,
		],
		tableMode: "dynamic", // Attribution dynamique selon QR code
	},

	[LEVELS.INTERMEDIAIRE]: {
		label: "Intermédiaire",
		description: "Snack / Fast Food - Fonctionnalités adaptées",
		features: [
			SELF_FEATURES.MENU_COMPLET,
			SELF_FEATURES.RESTRICTIONS,
			SELF_FEATURES.ALLERGIES,
			SELF_FEATURES.STRIPE_PAYMENT,
			SELF_FEATURES.SUGGESTIONS,
			SELF_FEATURES.WEBSOCKET_REALTIME,
			SELF_FEATURES.TICKET_CAISSE,
			SELF_FEATURES.TABLE_TEMPORAIRE,
		],
		tableMode: "temporary", // Table temporaire générée par client
	},

	[LEVELS.MINIMUM]: {
		label: "Minimum",
		description: "Food Truck - Essentiel uniquement",
		features: [
			SELF_FEATURES.MENU_SIMPLIFIE,
			SELF_FEATURES.STRIPE_PAYMENT,
			SELF_FEATURES.SUGGESTIONS_RAPIDES,
			SELF_FEATURES.WEBSOCKET_REALTIME,
			SELF_FEATURES.TICKET_CAISSE,
			SELF_FEATURES.TABLE_UNIQUE,
		],
		tableMode: "unique", // Tous les clients = même table
	},
};

// ============ CONFIGURATION PAR NIVEAU - SERVICE ============

export const SERVICE_LEVEL_CONFIG = {
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
		tabs: ["floor", "reglage"], // Pas de tab activité
	},

	[LEVELS.MINIMUM]: {
		label: "Minimum",
		description: "Food Truck - Essentiel uniquement",
		features: [
			SERVICE_FEATURES.CAISSE_SIMPLE,
			SERVICE_FEATURES.STATUT_COMMANDES_SIMPLIFIE,
			SERVICE_FEATURES.REGLAGES_BASIQUES,
		],
		tabs: ["floor", "reglage"], // Uniquement floor et réglages
	},
};

// ============ FONCTIONS UTILITAIRES ============

/**
 * Détermine le niveau fonctionnel à partir de la catégorie du restaurant
 * @param {string} category - Catégorie du restaurant
 * @returns {string} Niveau fonctionnel (complet/intermediaire/minimum)
 */
export const getLevelFromCategory = (category) => {
	return CATEGORY_TO_LEVEL[category] || LEVELS.COMPLET;
};

/**
 * Vérifie si une fonctionnalité SELF est disponible pour un niveau donné
 * @param {string} level - Niveau fonctionnel
 * @param {string} feature - Fonctionnalité à vérifier
 * @returns {boolean}
 */
export const isSelfFeatureEnabled = (level, feature) => {
	const config = SELF_LEVEL_CONFIG[level];
	if (!config) return false;
	return config.features.includes(feature);
};

/**
 * Vérifie si une fonctionnalité SERVICE est disponible pour un niveau donné
 * @param {string} level - Niveau fonctionnel
 * @param {string} feature - Fonctionnalité à vérifier
 * @returns {boolean}
 */
export const isServiceFeatureEnabled = (level, feature) => {
	const config = SERVICE_LEVEL_CONFIG[level];
	if (!config) return false;
	return config.features.includes(feature);
};

/**
 * Obtient le mode de gestion des tables pour un niveau SELF
 * @param {string} level - Niveau fonctionnel
 * @returns {string} Mode de table (dynamic/temporary/unique)
 */
export const getTableMode = (level) => {
	const config = SELF_LEVEL_CONFIG[level];
	return config?.tableMode || "dynamic";
};

/**
 * Obtient les tabs disponibles pour un niveau SERVICE
 * @param {string} level - Niveau fonctionnel
 * @returns {string[]} Liste des tabs
 */
export const getServiceTabs = (level) => {
	const config = SERVICE_LEVEL_CONFIG[level];
	return config?.tabs || ["activity", "floor", "reglage"];
};

/**
 * Obtient la configuration complète pour SELF
 * @param {string} category - Catégorie du restaurant
 * @returns {object} Configuration SELF
 */
export const getSelfConfig = (category) => {
	const level = getLevelFromCategory(category);
	return {
		level,
		...SELF_LEVEL_CONFIG[level],
	};
};

/**
 * Obtient la configuration complète pour SERVICE
 * @param {string} category - Catégorie du restaurant
 * @returns {object} Configuration SERVICE
 */
export const getServiceConfig = (category) => {
	const level = getLevelFromCategory(category);
	return {
		level,
		...SERVICE_LEVEL_CONFIG[level],
	};
};

export default {
	LEVELS,
	CATEGORIES,
	CATEGORY_TO_LEVEL,
	SELF_FEATURES,
	SERVICE_FEATURES,
	SELF_LEVEL_CONFIG,
	SERVICE_LEVEL_CONFIG,
	getLevelFromCategory,
	isSelfFeatureEnabled,
	isServiceFeatureEnabled,
	getTableMode,
	getServiceTabs,
	getSelfConfig,
	getServiceConfig,
};

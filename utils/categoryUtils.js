/**
 * 🍔 categoryUtils.js - Utilitaires pour la gestion des catégories de restaurants
 *
 * Catégories supportées:
 * - restaurant: Service à table classique (réservations complètes)
 * - foodtruck: Pas de salle, commandes rapides
 * - snack/fastfood: Service rapide, pas de réservations traditionnelles
 */

/**
 * Catégories considérées comme "fast service" (pas de réservations complètes)
 * Pour ces catégories:
 * - Pas de bouton "en attente" / "présent"
 * - Pas de calendrier (juste aujourd'hui)
 * - Formulaire simplifié (pas de tél, pas d'heure, pas de table)
 */
const FAST_SERVICE_CATEGORIES = [
	"snack",
	"fastfood",
	"fast-food",
	"fast food",
	"fast_food",
];

/**
 * Catégories sans salle physique (pas de plan de salle)
 */
const NO_FLOOR_CATEGORIES = ["foodtruck", "food-truck", "food truck"];

/**
 * Vérifie si la catégorie est de type "fast service"
 * @param {string} category - Catégorie du restaurant
 * @returns {boolean}
 */
export const isFastService = (category) => {
	if (!category) return false;
	const normalized = category.toLowerCase().trim();
	return FAST_SERVICE_CATEGORIES.includes(normalized);
};

/**
 * Vérifie si la catégorie est de type "foodtruck" (pas de salle)
 * @param {string} category - Catégorie du restaurant
 * @returns {boolean}
 */
export const isFoodtruck = (category) => {
	if (!category) return false;
	const normalized = category.toLowerCase().trim();
	return NO_FLOOR_CATEGORIES.includes(normalized);
};

/**
 * Vérifie si la catégorie nécessite des réservations simplifiées
 * Combine fastService ET foodtruck
 * @param {string} category - Catégorie du restaurant
 * @returns {boolean}
 */
export const isSimplifiedReservation = (category) => {
	return isFastService(category) || isFoodtruck(category);
};

/**
 * Vérifie si la catégorie doit afficher le calendrier
 * @param {string} category - Catégorie du restaurant
 * @returns {boolean}
 */
export const shouldShowCalendar = (category) => {
	return !isFastService(category) && !isFoodtruck(category);
};

/**
 * Vérifie si la catégorie doit afficher les statuts présent/en attente
 * @param {string} category - Catégorie du restaurant
 * @returns {boolean}
 */
export const shouldShowPresenceStatus = (category) => {
	return !isFastService(category);
};

/**
 * Vérifie si la catégorie doit afficher le formulaire complet de réservation
 * @param {string} category - Catégorie du restaurant
 * @returns {boolean}
 */
export const shouldShowFullReservationForm = (category) => {
	return !isFastService(category) && !isFoodtruck(category);
};

/**
 * Vérifie si le restaurant est de type "fast-food" avec commandes directes
 * (fast_food, fastfood, fast-food, fast food mais PAS snack)
 * → Active la modale "Créer commande" depuis le bouton "+"
 * @param {string} category - Catégorie du restaurant
 * @returns {boolean}
 */
export const isFastFoodOrder = (category) => {
	if (!category) {
		return false;
	}
	const normalized = category.toLowerCase().trim();
	const result = ["fastfood", "fast-food", "fast food", "fast_food"].includes(
		normalized,
	);
	return result;
};

export default {
	isFastService,
	isFoodtruck,
	isFastFoodOrder,
	isSimplifiedReservation,
	shouldShowCalendar,
	shouldShowPresenceStatus,
	shouldShowFullReservationForm,
	FAST_SERVICE_CATEGORIES,
	NO_FLOOR_CATEGORIES,
};

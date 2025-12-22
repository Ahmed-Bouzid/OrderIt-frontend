// src/stores/usePresentStore.js
import { create } from "zustand";

/**
 * Store local pour gérer l'état "présent" des réservations
 * Cet état est uniquement côté frontend et ne touche pas la BDD
 */
const usePresentStore = create((set, get) => ({
	// Map des réservations présentes : { reservationId: true }
	presentReservations: {},

	/**
	 * Marquer une réservation comme présente
	 * @param {string} reservationId
	 */
	markAsPresent: (reservationId) =>
		set((state) => ({
			presentReservations: {
				...state.presentReservations,
				[reservationId]: true,
			},
		})),

	/**
	 * Retirer le statut présent d'une réservation
	 * @param {string} reservationId
	 */
	removePresent: (reservationId) =>
		set((state) => {
			const newPresent = { ...state.presentReservations };
			delete newPresent[reservationId];
			return { presentReservations: newPresent };
		}),

	/**
	 * Vérifier si une réservation est présente
	 * @param {string} reservationId
	 * @returns {boolean}
	 */
	isPresent: (reservationId) => {
		return Boolean(get().presentReservations[reservationId]);
	},

	/**
	 * Obtenir le statut effectif d'une réservation
	 * Logique BDD : en attente → present → ouverte → fermee/annulee
	 * @param {object} reservation
	 * @returns {string} "en attente" | "present" | "ouverte" | "fermee" | "annulee"
	 */
	getEffectiveStatus: (reservation) => {
		if (!reservation) return "en attente";

		// Le statut vient directement de la BDD maintenant
		return reservation.status || "en attente";
	},

	/**
	 * Nettoyer une réservation (quand elle passe à fermée ou annulée)
	 * @param {string} reservationId
	 */
	cleanup: (reservationId) => {
		get().removePresent(reservationId);
	},
}));

export default usePresentStore;

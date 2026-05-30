/**
 * Store pour gérer les notifications de réservations web
 * - Compteur de nouvelles réservations "À distance" non consultées
 * - Liste des réservations web pour affichage dans le modal
 */
import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "@sunnygo_web_reservations_seen";

const useWebReservationStore = create((set, get) => ({
	// IDs des réservations web déjà vues
	seenIds: new Set(),
	
	// Compteur de nouvelles réservations (jauge visuelle)
	unreadCount: 0,
	
	// Initialiser depuis AsyncStorage
	init: async () => {
		try {
			const stored = await AsyncStorage.getItem(STORAGE_KEY);
			if (stored) {
				const ids = JSON.parse(stored);
				set({ seenIds: new Set(ids) });
			}
		} catch (error) {
			console.error("[WebReservationStore] Erreur init:", error);
		}
	},
	
	// Calculer le compteur non lus depuis les réservations
	updateUnreadCount: (allReservations) => {
		const { seenIds } = get();
		const webReservations = allReservations.filter(
			(r) => r.reservationSource === "À distance"
		);
		const unread = webReservations.filter((r) => !seenIds.has(r._id)).length;
		set({ unreadCount: unread });
	},
	
	// Marquer toutes les réservations web actuelles comme vues
	markAllAsSeen: async (allReservations) => {
		const webReservations = allReservations.filter(
			(r) => r.reservationSource === "À distance"
		);
		const webIds = webReservations.map((r) => r._id);
		const newSeenIds = new Set([...get().seenIds, ...webIds]);
		
		set({ seenIds: newSeenIds, unreadCount: 0 });
		
		// Persister dans AsyncStorage
		try {
			await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([...newSeenIds]));
		} catch (error) {
			console.error("[WebReservationStore] Erreur persist:", error);
		}
	},
	
	// Marquer une seule réservation comme vue (pour swipe to dismiss)
	markAsSeen: async (reservationId) => {
		const newSeenIds = new Set([...get().seenIds, reservationId]);
		set({ seenIds: newSeenIds });
		
		// Persister dans AsyncStorage
		try {
			await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([...newSeenIds]));
		} catch (error) {
			console.error("[WebReservationStore] Erreur persist:", error);
		}
	},
	
	// Reset (pour tests)
	reset: async () => {
		set({ seenIds: new Set(), unreadCount: 0 });
		try {
			await AsyncStorage.removeItem(STORAGE_KEY);
		} catch (error) {
			console.error("[WebReservationStore] Erreur reset:", error);
		}
	},
}));

export default useWebReservationStore;

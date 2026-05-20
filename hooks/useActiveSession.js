/**
 * 🏪 useActiveSession — Hook pour récupérer la session active d'une table
 *
 * Peut être utilisé en polling ou en temps réel via socket
 * Retourne { session, loading, error, refresh }
 */

import { useEffect, useState, useCallback } from "react";
import counterService from "../services/counterService";
import useCounterTableStore from "../src/stores/useCounterTableStore";

/**
 * Hook pour récupérer la session active d'une table
 *
 * @param {string} tableId — ID de la table
 * @param {object} options — { pollInterval: 5000 (ms), autoFetch: true }
 */
export const useActiveSession = (tableId, options = {}) => {
	const { pollInterval = 5000, autoFetch = true } = options;

	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);

	// Récupérer la session depuis le store table
	const tableSession = useCounterTableStore((state) => state.getTableSession);

	// On suppose que restaurantId est disponible globalement ou en param
	// Pour maintenant, on le cherche via un store utilisateur
	const getRestaurantId = useCallback(async () => {
		// Chercher dans AsyncStorage ou useUserStore
		const useUserStore = require("../stores/useUserStore").default;
		const fromStore = useUserStore.getState().restaurantId;
		if (fromStore) return fromStore;

		const AsyncStorage = require("@react-native-async-storage/async-storage").default;
		const fromStorage = await AsyncStorage.getItem("restaurantId");
		return fromStorage;
	}, []);

	const [restaurantId, setRestaurantId] = useState(null);

	// Initialiser le restaurantId
	useEffect(() => {
		getRestaurantId().then((id) => setRestaurantId(id));
	}, [getRestaurantId]);

	// Fetch initial de la session active
	const fetchSession = useCallback(async () => {
		if (!tableId) return;

		setLoading(true);
		setError(null);

		try {
			const session = await counterService.getActiveSession(tableId);

			if (session) {
				// Stocker dans le table store
				if (restaurantId) {
					useCounterTableStore.getState().openSession(restaurantId, tableId, session);
				}
			}
		} catch (err) {
			setError(err.message);
			console.error("[useActiveSession] Erreur fetch:", err);
		} finally {
			setLoading(false);
		}
	}, [tableId, restaurantId]);

	// Fetch initial si autoFetch
	useEffect(() => {
		if (autoFetch && tableId && restaurantId) {
			fetchSession();
		}
	}, [autoFetch, tableId, restaurantId, fetchSession]);

	// Polling optionnel
	useEffect(() => {
		if (!pollInterval || !tableId || !restaurantId) return;

		const interval = setInterval(() => {
			fetchSession();
		}, pollInterval);

		return () => clearInterval(interval);
	}, [pollInterval, tableId, restaurantId, fetchSession]);

	// Retourner la session du store
	const session =
		restaurantId && tableId
			? useCounterTableStore.getState().getTableSession(restaurantId, tableId)
			: null;

	return {
		session,
		loading,
		error,
		refresh: fetchSession,
	};
};

export default useActiveSession;

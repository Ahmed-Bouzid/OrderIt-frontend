/**
 * 🧑‍💼 useServerDetail - Hook pour les données détaillées d'un serveur
 * Gère le chargement du profil individuel, les objectifs et la mise à jour
 */
import { useState, useCallback, useRef } from "react";
import { useAuthFetch } from "./useAuthFetch";
import useUserStore from "../src/stores/useUserStore";

export const useServerDetail = (serverId) => {
	const [data, setData] = useState(null);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState(null);
	const [isSavingObjectives, setIsSavingObjectives] = useState(false);

	const cacheRef = useRef(new Map());
	const authFetch = useAuthFetch();
	const restaurantId = useUserStore((state) => state.restaurantId);

	/**
	 * Charge les données détaillées du serveur
	 */
	const fetchDetail = useCallback(
		async (period = "week", forceRefresh = false) => {
			if (!serverId || !restaurantId) return;

			const cacheKey = `server-detail-${serverId}-${period}`;
			const cached = cacheRef.current.get(cacheKey);

			// Cache valide 90 secondes
			if (!forceRefresh && cached && Date.now() - cached.timestamp < 90000) {
				setData(cached.data);
				return cached.data;
			}

			setIsLoading(true);
			setError(null);

			try {
				const response = await authFetch(
					`/crm/server/${serverId}/detail?period=${period}`,
					{ method: "GET" },
				);

				if (response.success) {
					setData(response.data);
					cacheRef.current.set(cacheKey, {
						data: response.data,
						timestamp: Date.now(),
					});
					return response.data;
				} else {
					throw new Error(response.message || "Erreur chargement profil");
				}
			} catch (err) {
				console.error("❌ [useServerDetail] Erreur:", err);
				setError(err.message);
				return null;
			} finally {
				setIsLoading(false);
			}
		},
		[serverId, restaurantId, authFetch],
	);

	/**
	 * Sauvegarde les objectifs d'un serveur
	 */
	const saveObjectives = useCallback(
		async (objectives) => {
			if (!serverId) return false;

			setIsSavingObjectives(true);
			try {
				const response = await authFetch(`/crm/server/${serverId}/objectives`, {
					method: "PUT",
					body: JSON.stringify(objectives),
				});

				if (response.success) {
					// Mettre à jour les données locales
					setData((prev) =>
						prev ? { ...prev, objectives: response.data } : prev,
					);
					// Invalider le cache
					cacheRef.current.clear();
					return true;
				} else {
					throw new Error(response.message || "Erreur sauvegarde objectifs");
				}
			} catch (err) {
				console.error("❌ [useServerDetail] Erreur save objectives:", err);
				return false;
			} finally {
				setIsSavingObjectives(false);
			}
		},
		[serverId, authFetch],
	);

	/**
	 * Invalide le cache (pour forcer un refresh)
	 */
	const invalidateCache = useCallback(() => {
		cacheRef.current.clear();
	}, []);

	return {
		data,
		isLoading,
		error,
		isSavingObjectives,
		fetchDetail,
		saveObjectives,
		invalidateCache,
	};
};

export default useServerDetail;

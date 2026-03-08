/**
 * 🎯 useCRMData - Hook pour récupérer les données CRM
 * Gère le cache, le loading et la synchronisation des données performance
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuthFetch } from "./useAuthFetch";
import useUserStore from "../src/stores/useUserStore";

export const useCRMData = (period = "week") => {
	// État principal
	const [dashboard, setDashboard] = useState(null);
	const [servers, setServers] = useState(null);
	const [leaderboard, setLeaderboard] = useState(null);
	const [trends, setTrends] = useState(null);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState(null);

	// Cache pour éviter les requêtes inutiles
	const cacheRef = useRef(new Map());
	const lastFetchRef = useRef(null);

	const authFetch = useAuthFetch();
	const restaurantId = useUserStore((state) => state.restaurantId);

	/**
	 * Récupère les données du dashboard
	 */
	const fetchDashboard = useCallback(async () => {
		if (!restaurantId) return;

		const cacheKey = `dashboard-${period}-${restaurantId}`;
		const cached = cacheRef.current.get(cacheKey);

		// Cache valide pendant 2 minutes
		if (cached && Date.now() - cached.timestamp < 120000) {
			setDashboard(cached.data);
			return cached.data;
		}

		try {

			const response = await authFetch(
				`/crm/dashboard?period=${period}&restaurantId=${restaurantId}`,
				{
					method: "GET",
				},
			);

			if (response.success) {
				setDashboard(response.data);

				// Mettre en cache
				cacheRef.current.set(cacheKey, {
					data: response.data,
					timestamp: Date.now(),
				});

				setError(null);
				return response.data;
			} else {
				throw new Error(
					response.message || "Erreur lors de la récupération des données",
				);
			}
		} catch (error) {
			console.error("❌ [CRM] Erreur dashboard:", error);
			setError(error.message);
			return null;
		}
	}, [period, restaurantId, authFetch]);

	/**
	 * Récupère les données des serveurs
	 */
	const fetchServers = useCallback(
		async (detailed = false) => {
			if (!restaurantId) return;

			const cacheKey = `servers-${period}-${restaurantId}-${detailed}`;
			const cached = cacheRef.current.get(cacheKey);

			if (cached && Date.now() - cached.timestamp < 120000) {
				setServers(cached.data);
				return cached.data;
			}

			try {

				const response = await authFetch(
					`/crm/servers?period=${period}&detailed=${detailed}`,
					{
						method: "GET",
					},
				);

				if (response.success) {
					setServers(response.data);

					cacheRef.current.set(cacheKey, {
						data: response.data,
						timestamp: Date.now(),
					});

					return response.data;
				} else {
					throw new Error(
						response.message || "Erreur lors de la récupération des serveurs",
					);
				}
			} catch (error) {
				console.error("❌ [CRM] Erreur servers:", error);
				setError(error.message);
				return null;
			}
		},
		[period, restaurantId, authFetch],
	);

	/**
	 * Récupère le leaderboard
	 */
	const fetchLeaderboard = useCallback(
		async (metric = "sales") => {
			if (!restaurantId) return;

			const cacheKey = `leaderboard-${period}-${metric}-${restaurantId}`;
			const cached = cacheRef.current.get(cacheKey);

			if (cached && Date.now() - cached.timestamp < 120000) {
				setLeaderboard(cached.data);
				return cached.data;
			}

			try {

				const response = await authFetch(
					`/crm/leaderboard?period=${period}&metric=${metric}`,
					{
						method: "GET",
					},
				);

				if (response.success) {
					setLeaderboard(response.data);

					cacheRef.current.set(cacheKey, {
						data: response.data,
						timestamp: Date.now(),
					});

					return response.data;
				} else {
					throw new Error(
						response.message || "Erreur lors de la récupération du classement",
					);
				}
			} catch (error) {
				console.error("❌ [CRM] Erreur leaderboard:", error);
				setError(error.message);
				return null;
			}
		},
		[period, restaurantId, authFetch],
	);

	/**
	 * Récupère les tendances
	 */
	const fetchTrends = useCallback(async () => {
		if (!restaurantId) return;

		const cacheKey = `trends-${restaurantId}`;
		const cached = cacheRef.current.get(cacheKey);

		// Cache plus long pour les tendances (5 minutes)
		if (cached && Date.now() - cached.timestamp < 300000) {
			setTrends(cached.data);
			return cached.data;
		}

		try {

			const response = await authFetch(`/crm/trends`, {
				method: "GET",
			});

			if (response.success) {
				setTrends(response.data);

				cacheRef.current.set(cacheKey, {
					data: response.data,
					timestamp: Date.now(),
				});

				return response.data;
			} else {
				throw new Error(
					response.message || "Erreur lors de la récupération des tendances",
				);
			}
		} catch (error) {
			console.error("❌ [CRM] Erreur trends:", error);
			setError(error.message);
			return null;
		}
	}, [restaurantId, authFetch]);

	/**
	 * Récupère toutes les données
	 */
	const fetchAllData = useCallback(async () => {
		setIsLoading(true);
		setError(null);

		try {
			// Priorité au dashboard, puis parallélisation des autres
			const dashboardData = await fetchDashboard();

			if (dashboardData) {
				// Récupérer les autres données en parallèle
				const [serversData, leaderboardData, trendsData] =
					await Promise.allSettled([
						fetchServers(true),
						fetchLeaderboard("sales"),
						fetchTrends(),
					]);

				// Logger les erreurs mais ne pas bloquer
				if (serversData.status === "rejected") {
					console.warn("⚠️ Erreur chargement serveurs:", serversData.reason);
				}
				if (leaderboardData.status === "rejected") {
					console.warn(
						"⚠️ Erreur chargement leaderboard:",
						leaderboardData.reason,
					);
				}
				if (trendsData.status === "rejected") {
					console.warn("⚠️ Erreur chargement trends:", trendsData.reason);
				}
			}
		} catch (error) {
			console.error("❌ [CRM] Erreur fetchAllData:", error);
			setError("Impossible de charger les données CRM");
		} finally {
			setIsLoading(false);
			lastFetchRef.current = Date.now();
		}
	}, [fetchDashboard, fetchServers, fetchLeaderboard, fetchTrends]);

	/**
	 * Rafraîchit toutes les données
	 */
	const refreshData = useCallback(async () => {
		// Vider le cache pour forcer le refresh
		cacheRef.current.clear();
		await fetchAllData();
	}, [fetchAllData]);

	/**
	 * Invalide le cache pour une période donnée
	 */
	const invalidateCache = useCallback((targetPeriod = null) => {
		if (targetPeriod) {
			// Invalider seulement pour cette période
			for (const key of cacheRef.current.keys()) {
				if (key.includes(targetPeriod)) {
					cacheRef.current.delete(key);
				}
			}
		} else {
			// Invalider tout le cache
			cacheRef.current.clear();
		}
	}, []);

	// ─────────────── Effets ───────────────

	/**
	 * Chargement initial et changement de période
	 */
	useEffect(() => {
		if (restaurantId) {
			fetchAllData();
		}
	}, [period, restaurantId, fetchAllData]); // Inclure fetchAllData dans les dépendances

	/**
	 * Auto-refresh périodique (5 minutes)
	 */
	useEffect(() => {
		if (!restaurantId) return;

		const interval = setInterval(() => {
			const timeSinceLastFetch = lastFetchRef.current
				? Date.now() - lastFetchRef.current
				: Infinity;

			// Auto-refresh seulement si pas de fetch récent
			if (timeSinceLastFetch > 300000) {
				// 5 minutes
				fetchDashboard(); // Refresh discret du dashboard seulement
			}
		}, 300000); // Vérification toutes les 5 minutes

		return () => clearInterval(interval);
	}, [restaurantId, fetchDashboard]);

	// ─────────────── API Publique ───────────────
	return {
		// Données
		dashboard,
		servers,
		leaderboard,
		trends,

		// États
		isLoading,
		error,

		// Actions
		refreshData,
		fetchDashboard,
		fetchServers,
		fetchLeaderboard,
		fetchTrends,
		invalidateCache,

		// Métadonnées
		lastFetch: lastFetchRef.current,
		cacheSize: cacheRef.current.size,
	};
};

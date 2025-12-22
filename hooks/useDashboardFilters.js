import { useState, useMemo, useCallback, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import usePresentStore from "../src/stores/usePresentStore";

export const useDashboardFilters = (reservations) => {
	const [filter, setFilter] = useState("actives");
	const { getEffectiveStatus } = usePresentStore();

	// Restaurer le filtre au montage
	useEffect(() => {
		const loadFilter = async () => {
			try {
				const savedFilter = await AsyncStorage.getItem("dashboardFilter");
				if (savedFilter) {
					setFilter(savedFilter);
				}
			} catch (error) {
				console.error("❌ Erreur chargement filtre:", error);
			}
		};
		loadFilter();
	}, []);

	const filteredReservations = useMemo(() => {
		// ⭐ Garde-fou : toujours retourner un tableau
		if (!reservations || !Array.isArray(reservations)) return [];

		try {
			switch (filter) {
				case "actives":
					return reservations.filter((r) => {
						if (!r) return false;
						const effectiveStatus = getEffectiveStatus(r);
						return effectiveStatus === "en attente";
					});
				case "present":
					return reservations.filter((r) => {
						if (!r) return false;
						const effectiveStatus = getEffectiveStatus(r);
						return (
							effectiveStatus === "present" || effectiveStatus === "ouverte"
						);
					});
				case "ouverte":
					return reservations.filter((r) => r?.status === "ouverte");
				case "termine":
					return reservations.filter((r) => r?.status === "fermee");
				case "annulee":
					return reservations.filter((r) => r?.status === "annulee");
				default:
					return reservations.filter(Boolean); // ⭐ Filtrer les valeurs null/undefined
			}
		} catch (error) {
			console.error("❌ Erreur filtrage réservations:", error);
			return [];
		}
	}, [reservations, filter, getEffectiveStatus]);

	const changeFilter = useCallback(async (newFilter) => {
		setFilter(newFilter);
		try {
			await AsyncStorage.setItem("dashboardFilter", newFilter);
		} catch (error) {
			console.error("❌ Erreur sauvegarde filtre:", error);
		}
	}, []);

	return {
		filter,
		filteredReservations,
		changeFilter,
	};
};

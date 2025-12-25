import { useState, useMemo, useCallback, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import usePresentStore from "../src/stores/usePresentStore";

export const useDashboardFilters = (reservations) => {
	const [filter, setFilter] = useState("actives");

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
					// Toutes les "en attente" (présent ou non)
					return reservations.filter((r) => r?.status === "en attente");
				case "present":
					// Toutes les réservations isPresent true (quel que soit le status)
					return reservations.filter((r) => r?.isPresent === true);
				case "ouverte":
					// Toutes les "ouverte" (présent ou non)
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
	}, [reservations, filter]);

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

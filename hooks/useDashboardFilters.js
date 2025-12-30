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
					// ⭐ RÈGLE MÉTIER: Réservations présentes ET en attente ou ouvertes uniquement
					// (isPresent=true impossible avec terminée/annulée)
					return reservations.filter(
						(r) =>
							r?.isPresent === true &&
							(r?.status === "en attente" || r?.status === "ouverte")
					);
				case "ouverte":
					// Toutes les "ouverte"
					return reservations.filter((r) => r?.status === "ouverte");
				case "terminée":
					return reservations.filter((r) => r?.status === "terminée");
				case "annulée":
					return reservations.filter((r) => r?.status === "annulée");
				default:
					return reservations.filter(Boolean);
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

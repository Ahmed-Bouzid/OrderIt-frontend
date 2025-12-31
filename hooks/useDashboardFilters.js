import { useState, useMemo, useCallback, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import usePresentStore from "../src/stores/usePresentStore";

export const useDashboardFilters = (reservations) => {
	const [filter, setFilter] = useState("actives");
	const [searchQuery, setSearchQuery] = useState("");

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

	// 🔍 Filtrage par recherche (tous statuts confondus)
	const searchedReservations = useMemo(() => {
		if (!reservations || !Array.isArray(reservations)) return [];
		if (!searchQuery.trim()) return reservations;

		const query = searchQuery.toLowerCase().trim();
		return reservations.filter((r) => {
			const clientName = (r?.clientName || "").toLowerCase();
			return clientName.includes(query);
		});
	}, [reservations, searchQuery]);

	const filteredReservations = useMemo(() => {
		// ⭐ Garde-fou : toujours retourner un tableau
		if (!searchedReservations || !Array.isArray(searchedReservations))
			return [];

		// 🔍 Si recherche active, ignorer le filtre de statut
		if (searchQuery.trim()) {
			return searchedReservations;
		}

		try {
			switch (filter) {
				case "actives":
					// Toutes les "en attente" (présent ou non)
					return searchedReservations.filter((r) => r?.status === "en attente");
				case "present":
					// ⭐ RÈGLE MÉTIER: Réservations présentes ET en attente ou ouvertes uniquement
					// (isPresent=true impossible avec terminée/annulée)
					return searchedReservations.filter(
						(r) =>
							r?.isPresent === true &&
							(r?.status === "en attente" || r?.status === "ouverte")
					);
				case "ouverte":
					// Toutes les "ouverte"
					return searchedReservations.filter((r) => r?.status === "ouverte");
				case "terminée":
					return searchedReservations.filter((r) => r?.status === "terminée");
				case "annulée":
					return searchedReservations.filter((r) => r?.status === "annulée");
				default:
					return searchedReservations.filter(Boolean);
			}
		} catch (error) {
			console.error("❌ Erreur filtrage réservations:", error);
			return [];
		}
	}, [searchedReservations, filter, searchQuery]);

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
		searchQuery,
		setSearchQuery,
	};
};

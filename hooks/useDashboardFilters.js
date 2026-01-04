import { useState, useMemo, useCallback, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import usePresentStore from "../src/stores/usePresentStore";

export const useDashboardFilters = (
	reservations,
	selectedDate = new Date()
) => {
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

	// 📅 Filtrage par date sélectionnée
	const dateFilteredReservations = useMemo(() => {
		if (!searchedReservations || !Array.isArray(searchedReservations))
			return [];

		// Normaliser les dates pour comparer uniquement jour/mois/année
		const normalizeDate = (date) => {
			const d = new Date(date);
			d.setHours(0, 0, 0, 0);
			return d.getTime();
		};

		const selectedDay = normalizeDate(selectedDate);

		return searchedReservations.filter((r) => {
			if (!r?.reservationDate) return false;
			const reservationDay = normalizeDate(r.reservationDate);
			return reservationDay === selectedDay;
		});
	}, [searchedReservations, selectedDate]);

	const filteredReservations = useMemo(() => {
		// ⭐ Garde-fou : toujours retourner un tableau
		if (!dateFilteredReservations || !Array.isArray(dateFilteredReservations))
			return [];

		// 🔍 Si recherche active, ignorer le filtre de statut
		if (searchQuery.trim()) {
			return dateFilteredReservations;
		}

		// 📅 Déterminer si la date sélectionnée est passée, future ou aujourd'hui
		const normalizeDate = (date) => {
			const d = new Date(date);
			d.setHours(0, 0, 0, 0);
			return d.getTime();
		};

		const selectedDay = normalizeDate(selectedDate);
		const today = normalizeDate(new Date());

		const isPastDate = selectedDay < today;
		const isFutureDate = selectedDay > today;
		const isToday = selectedDay === today;

		try {
			switch (filter) {
				case "actives":
					// 📅 Logique adaptée selon la date
					if (isPastDate) {
						// Date passée : pas de réservations "en attente" (devrait être terminée/annulée)
						return [];
					}
					// Toutes les "en attente" (présent ou non)
					return dateFilteredReservations.filter(
						(r) => r?.status === "en attente"
					);

				case "present":
					// 📅 "Présent" seulement pour aujourd'hui et le futur
					if (isPastDate) {
						return [];
					}
					// ⭐ RÈGLE MÉTIER: Réservations présentes ET en attente ou ouvertes uniquement
					return dateFilteredReservations.filter(
						(r) =>
							r?.isPresent === true &&
							(r?.status === "en attente" || r?.status === "ouverte")
					);

				case "ouverte":
					// 📅 "Ouverte" seulement pour aujourd'hui
					if (!isToday) {
						return [];
					}
					return dateFilteredReservations.filter(
						(r) => r?.status === "ouverte"
					);

				case "terminée":
					// 📅 "Terminée" visible à tout moment
					return dateFilteredReservations.filter(
						(r) => r?.status === "terminée"
					);

				case "annulée":
					// 📅 "Annulée" visible à tout moment
					return dateFilteredReservations.filter(
						(r) => r?.status === "annulée"
					);

				default:
					return dateFilteredReservations.filter(Boolean);
			}
		} catch (error) {
			console.error("❌ Erreur filtrage réservations:", error);
			return [];
		}
	}, [dateFilteredReservations, filter, searchQuery, selectedDate]);

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

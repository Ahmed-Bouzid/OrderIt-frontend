import { useState, useMemo, useCallback, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import usePresentStore from "../src/stores/usePresentStore";
import useUserStore from "../src/stores/useUserStore";

// Catégories avec filtres simplifiés (pas de "actives"/"present")
const SIMPLIFIED_CATEGORIES = ["foodtruck", "snack", "fastfood", "fast-food"];

export const useDashboardFilters = (
	reservations,
	selectedDate = new Date(),
) => {
	const category = useUserStore((state) => state.category);
	const isSimplifiedMode = SIMPLIFIED_CATEGORIES.includes(category);

	// Filtre par défaut selon la catégorie
	const defaultFilter = isSimplifiedMode ? "ouverte" : "actives";
	const [filter, setFilter] = useState(defaultFilter);
	const [searchQuery, setSearchQuery] = useState("");

	// Restaurer le filtre au montage (ou forcer un filtre valide)
	useEffect(() => {
		const loadFilter = async () => {
			try {
				const savedFilter = await AsyncStorage.getItem("dashboardFilter");
				if (savedFilter) {
					// Si mode simplifié et filtre sauvegardé invalide, utiliser le défaut
					if (
						isSimplifiedMode &&
						(savedFilter === "actives" || savedFilter === "present")
					) {
						setFilter("ouverte");
					} else {
						setFilter(savedFilter);
					}
				} else {
					setFilter(defaultFilter);
				}
			} catch (error) {
				console.error("❌ Erreur chargement filtre:", error);
			}
		};
		loadFilter();
	}, [isSimplifiedMode, defaultFilter]);

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
		const isToday = selectedDay === today;

		try {
			let result = [];
			switch (filter) {
				case "actives":
					// 📅 Logique adaptée selon la date
					if (isPastDate) {
						// Date passée : pas de réservations "en attente" (devrait être terminée/annulée)
						result = [];
					} else {
						// Toutes les "en attente" (présent ou non)
						result = dateFilteredReservations.filter(
							(r) => r?.status === "en attente",
						);
					}
					break;

				case "present":
					// 📅 "Présent" seulement pour aujourd'hui et le futur
					if (isPastDate) {
						result = [];
					} else {
						// ⭐ RÈGLE MÉTIER: Réservations présentes ET en attente ou ouvertes uniquement
						result = dateFilteredReservations.filter(
							(r) =>
								r?.isPresent === true &&
								(r?.status === "en attente" || r?.status === "ouverte"),
						);
					}
					break;

				case "ouverte":
					// 📅 "Ouverte" : toujours toutes les dates (une resa ouverte hier = encore active)
					result = searchedReservations.filter(
						(r) => r?.status === "ouverte",
					);
					break;

				case "terminée":
					// 📅 "Terminée" visible à tout moment
					result = dateFilteredReservations.filter(
						(r) => r?.status === "terminée",
					);
					break;

				case "annulée":
					// 📅 "Annulée" visible à tout moment
					result = dateFilteredReservations.filter(
						(r) => r?.status === "annulée",
					);
					break;

				default:
					result = dateFilteredReservations.filter(Boolean);
			}
			return result;
		} catch (error) {
			console.error("❌ Erreur filtrage réservations:", error);
			return [];
		}
	}, [dateFilteredReservations, searchedReservations, filter, searchQuery, selectedDate]);

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

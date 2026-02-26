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
		if (!searchedReservations || !Array.isArray(searchedReservations)) {
			console.log("🔍 [DEBUG DATE] Aucune réservation à filtrer par date");
			return [];
		}

		console.log(`\n📅 [DEBUG DATE] Filtrage par date...`);
		console.log(`📋 Total réservations avant filtrage date: ${searchedReservations.length}`);

		// Normaliser les dates pour comparer uniquement jour/mois/année
		const normalizeDate = (date) => {
			const d = new Date(date);
			d.setHours(0, 0, 0, 0);
			return d.getTime();
		};

		const selectedDay = normalizeDate(selectedDate);
		console.log(`📅 Date sélectionnée normalisée: ${new Date(selectedDay).toLocaleDateString()}`);

		const result = searchedReservations.filter((r) => {
			if (!r?.reservationDate) {
				console.log(`⚠️ Réservation sans date: ${r?.clientName} (${r?._id?.slice(-6)})`);
				return false;
			}
			const reservationDay = normalizeDate(r.reservationDate);
			const match = reservationDay === selectedDay;
			
			if (!match) {
				console.log(`❌ ${r.clientName} (${r._id?.slice(-6)}) → date ${new Date(reservationDay).toLocaleDateString()} ≠ ${new Date(selectedDay).toLocaleDateString()}`);
			}
			
			return match;
		});

		console.log(`✅ Résultat filtrage date: ${result.length} réservations correspondent`);
		result.forEach(r => {
			console.log(`   ✓ ${r.clientName} (${r._id?.slice(-6)}) - ${r.status}`);
		});

		return result;
	}, [searchedReservations, selectedDate]);

	const filteredReservations = useMemo(() => {
		// ⭐ Garde-fou : toujours retourner un tableau
		if (!dateFilteredReservations || !Array.isArray(dateFilteredReservations)) {
			console.log("🔍 [DEBUG FILTRES] Pas de réservations filtrées par date");
			return [];
		}

		console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
		console.log(`🔍 [DEBUG FILTRES] ANALYSE DU FILTRAGE`);
		console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
		console.log(`📋 Total réservations avant filtrage: ${dateFilteredReservations.length}`);
		console.log(`🎯 Filtre actif: "${filter}"`);
		console.log(`🔎 Recherche: "${searchQuery}"`);
		console.log(`📅 Date sélectionnée: ${selectedDate.toLocaleDateString()}`);

		// 🔍 Si recherche active, ignorer le filtre de statut
		if (searchQuery.trim()) {
			console.log(`✅ Mode recherche actif → ${dateFilteredReservations.length} résultats\n`);
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

		console.log(`📅 Type de date: ${isPastDate ? 'PASSÉE' : isFutureDate ? 'FUTURE' : 'AUJOURD\'HUI'}`);

		try {
			let result = [];
			switch (filter) {
				case "actives":
					// 📅 Logique adaptée selon la date
					if (isPastDate) {
						// Date passée : pas de réservations "en attente" (devrait être terminée/annulée)
						console.log(`⚠️ Date passée → aucune réservation "en attente" affichée`);
						result = [];
					} else {
						// Toutes les "en attente" (présent ou non)
						result = dateFilteredReservations.filter(
							(r) => r?.status === "en attente",
						);
						console.log(`✅ Filtre "actives" → ${result.length} réservations`);
						result.forEach(r => console.log(`   - ${r.clientName} (${r._id?.slice(-6)})`));
					}
					break;

				case "present":
					// 📅 "Présent" seulement pour aujourd'hui et le futur
					if (isPastDate) {
						console.log(`⚠️ Date passée → aucune réservation "présent" affichée`);
						result = [];
					} else {
						// ⭐ RÈGLE MÉTIER: Réservations présentes ET en attente ou ouvertes uniquement
						result = dateFilteredReservations.filter(
							(r) =>
								r?.isPresent === true &&
								(r?.status === "en attente" || r?.status === "ouverte"),
						);
						console.log(`✅ Filtre "present" → ${result.length} réservations`);
						result.forEach(r => console.log(`   - ${r.clientName} (${r._id?.slice(-6)}, present=${r.isPresent}, status=${r.status})`));
					}
					break;

				case "ouverte":
					// 📅 "Ouverte" seulement pour aujourd'hui
					if (!isToday) {
						console.log(`⚠️ Pas aujourd'hui → aucune réservation "ouverte" affichée`);
						result = [];
					} else {
						result = dateFilteredReservations.filter(
							(r) => r?.status === "ouverte",
						);
						console.log(`✅ Filtre "ouverte" → ${result.length} réservations`);
						result.forEach(r => console.log(`   - ${r.clientName} (${r._id?.slice(-6)})`));
					}
					break;

				case "terminée":
					// 📅 "Terminée" visible à tout moment
					result = dateFilteredReservations.filter(
						(r) => r?.status === "terminée",
					);
					console.log(`✅ Filtre "terminée" → ${result.length} réservations`);
					break;

				case "annulée":
					// 📅 "Annulée" visible à tout moment
					result = dateFilteredReservations.filter(
						(r) => r?.status === "annulée",
					);
					console.log(`✅ Filtre "annulée" → ${result.length} réservations`);
					break;

				default:
					result = dateFilteredReservations.filter(Boolean);
					console.log(`✅ Filtre par défaut → ${result.length} réservations`);
			}

			console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
			return result;
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

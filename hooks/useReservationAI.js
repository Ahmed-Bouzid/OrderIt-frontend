/**
 * useReservationAI.js
 *
 * Hook React Native qui expose les 9 fonctions d'IA de réservation
 * via l'API backend /ai/:restaurantId/...
 *
 * Chaque fonction :
 *  - retourne les données directement (null si erreur)
 *  - met à jour loading[key] et errors[key]
 *  - utilise useAuthFetch pour l'authentification JWT
 *
 * Usage :
 *   const { getSmartSlots, predict, loading, errors } = useReservationAI();
 *   const slots = await getSmartSlots("2026-03-10", 4);
 *   const pred  = await predict("2026-03-15");
 */

import { useState, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuthFetch } from "./useAuthFetch";
import { API_CONFIG } from "../src/config/apiConfig";

const BASE = API_CONFIG.baseURL;

/** Formate une Date en YYYY-MM-DD */
function toDateStr(date) {
	if (!date) return "";
	const d = new Date(date);
	return d.toISOString().slice(0, 10);
}

export function useReservationAI() {
	const authFetch = useAuthFetch();
	const [loading, setLoading] = useState({});
	const [errors, setErrors] = useState({});

	/** Lance un appel API avec gestion loading/erreur */
	const call = useCallback(async (key, fn) => {
		setLoading((s) => ({ ...s, [key]: true }));
		setErrors((s) => ({ ...s, [key]: null }));
		try {
			return await fn();
		} catch (e) {
			setErrors((s) => ({ ...s, [key]: e.message }));
			return null;
		} finally {
			setLoading((s) => ({ ...s, [key]: false }));
		}
	}, []);

	/** Récupère le restaurantId depuis AsyncStorage */
	const rid = useCallback(() => AsyncStorage.getItem("restaurantId"), []);

	// ── 1. Créneaux disponibles enrichis ──────────────────────────────────────
	/**
	 * Retourne les créneaux d'une journée avec score d'occupation et label.
	 * @param {Date|string} date
	 * @param {number} guests - 0 = sans filtre capacité
	 * @returns {Array<{ time, availableTables, totalTables, occupancyRate, label }>}
	 *
	 * UX : afficher les créneaux colorés dans NewReservationModal
	 *   vert = libre, orange = animé, rouge = complet
	 */
	const getSmartSlots = useCallback(
		async (date, guests = 0) => {
			const restaurantId = await rid();
			if (!restaurantId) return null;
			const d = toDateStr(date);
			return call("smartSlots", () =>
				authFetch(
					`${BASE}/ai/${restaurantId}/smart-slots?date=${d}&guests=${guests}`,
				),
			);
		},
		[authFetch, call, rid],
	);

	// ── 2. Alternatives si créneau complet ────────────────────────────────────
	/**
	 * Retourne jusqu'à 8 créneaux alternatifs proches du créneau demandé.
	 * @param {Date|string} date
	 * @param {string} time  "HH:MM"
	 * @param {number} guests
	 * @returns {Array<{ date, time, availableTables, distanceScore, dayOffset }>}
	 *
	 * UX : modal "Ce créneau est complet" → liste déroulante des alternatives
	 */
	const getAlternatives = useCallback(
		async (date, time, guests = 0) => {
			const restaurantId = await rid();
			if (!restaurantId) return null;
			const d = toDateStr(date);
			return call("alternatives", () =>
				authFetch(
					`${BASE}/ai/${restaurantId}/alternatives?date=${d}&time=${encodeURIComponent(time)}&guests=${guests}`,
				),
			);
		},
		[authFetch, call, rid],
	);

	// ── 3. Auto-assignation de table ─────────────────────────────────────────
	/**
	 * Trouve et retourne la table optimale pour une réservation.
	 * @param {string} reservationId
	 * @returns {{ tableId, tableName, capacity, reason, score } | null}
	 *
	 * UX : bouton "Assigner auto" dans AssignTableModal / SettingsModal
	 *   → 1 tap remplace 10 secondes de recherche manuelle
	 */
	const autoAssign = useCallback(
		async (reservationId) => {
			const restaurantId = await rid();
			if (!restaurantId) return null;
			return call("autoAssign", () =>
				authFetch(`${BASE}/ai/${restaurantId}/auto-assign/${reservationId}`, {
					method: "POST",
				}),
			);
		},
		[authFetch, call, rid],
	);

	// ── 4. Heatmap d'occupation ───────────────────────────────────────────────
	/**
	 * Retourne la matrice jour × créneau de l'affluence historique.
	 * @param {number} weeks - nombre de semaines d'historique (défaut 8)
	 * @returns {{ matrix, peakDay, peakDayName, peakTime, minimalDay, totalResas }}
	 *
	 * UX : page Analytics → grille colorée type "GitHub contributions"
	 *   → Le manager voit ses vendredis 20h saturés vs lundis creux
	 */
	const getHeatmap = useCallback(
		async (weeks = 8) => {
			const restaurantId = await rid();
			if (!restaurantId) return null;
			return call("heatmap", () =>
				authFetch(`${BASE}/ai/${restaurantId}/heatmap?weeks=${weeks}`),
			);
		},
		[authFetch, call, rid],
	);

	// ── 5. Détection de trous morts ──────────────────────────────────────────
	/**
	 * Liste les intervalles inutilisables entre deux réservations.
	 * @param {Date|string} date
	 * @returns {Array<{ tableName, gapMinutes, severity, suggestion }>}
	 *
	 * UX : badge d'alerte orange sur la table concernée dans AgendaView
	 *   → "T3 : 25min libres à 14h — décalez une résa adjacente"
	 */
	const getGaps = useCallback(
		async (date) => {
			const restaurantId = await rid();
			if (!restaurantId) return null;
			const d = toDateStr(date);
			return call("gaps", () =>
				authFetch(`${BASE}/ai/${restaurantId}/gaps?date=${d}`),
			);
		},
		[authFetch, call, rid],
	);

	// ── 6. Durée intelligente ────────────────────────────────────────────────
	/**
	 * Recommande une durée selon le nombre de convives + historique.
	 * @param {number} guests
	 * @returns {{ recommendedMinutes, baseTurnover, adjustment, reason }}
	 *
	 * UX : NewReservationModal pré-sélectionne la durée dès que le nb de pers. est saisi
	 *   → "Groupe de 8 : 160 min recommandés (grand groupe + ticket élevé)"
	 */
	const getSmartDuration = useCallback(
		async (guests) => {
			const restaurantId = await rid();
			if (!restaurantId) return null;
			return call("smartDuration", () =>
				authFetch(`${BASE}/ai/${restaurantId}/smart-duration?guests=${guests}`),
			);
		},
		[authFetch, call, rid],
	);

	// ── 7a. Liste d'attente ──────────────────────────────────────────────────
	/**
	 * Retourne les réservations sans table du jour, triées par priorité.
	 * @param {Date|string} date
	 * @returns {Array<{ reservation, priority, reason }>}
	 *
	 * UX : widget "File d'attente" dans AgendaScreen
	 *   → "Dupont (4p, attente 35min) en première position"
	 */
	const getWaitingList = useCallback(
		async (date) => {
			const restaurantId = await rid();
			if (!restaurantId) return null;
			const d = toDateStr(date);
			return call("waitingList", () =>
				authFetch(`${BASE}/ai/${restaurantId}/waiting-list?date=${d}`),
			);
		},
		[authFetch, call, rid],
	);

	// ── 7b. Promotion de la liste d'attente ──────────────────────────────────
	/**
	 * Quand une table se libère, retourne la meilleure résa à placer.
	 * @param {Date|string} date
	 * @param {string} freedTableId
	 * @returns {{ reservation, tableId, tableName, reason } | null}
	 *
	 * UX : notification push "T4 libérée — Dupont (4p) peut s'installer"
	 */
	const promoteWaiting = useCallback(
		async (date, freedTableId) => {
			const restaurantId = await rid();
			if (!restaurantId) return null;
			const d = toDateStr(date);
			return call("promoteWaiting", () =>
				authFetch(`${BASE}/ai/${restaurantId}/promote-waiting`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ date: d, freedTableId }),
				}),
			);
		},
		[authFetch, call, rid],
	);

	// ── 8. Prédiction d'affluence ────────────────────────────────────────────
	/**
	 * Prédit le nombre de réservations pour une date cible.
	 * @param {Date|string} date
	 * @param {number} weeks - semaines d'historique
	 * @returns {{ predictedCount, confidence, trend, peakTime, historicPoints }}
	 *
	 * UX : en-tête AgendaScreen "Vendredi → ≈18 résas attendues (+12% tendance)"
	 *   → Le manager prépare l'équipe et les stocks en avance
	 */
	const predict = useCallback(
		async (date, weeks = 8) => {
			const restaurantId = await rid();
			if (!restaurantId) return null;
			const d = toDateStr(date);
			return call("predict", () =>
				authFetch(
					`${BASE}/ai/${restaurantId}/predict?date=${d}&weeks=${weeks}`,
				),
			);
		},
		[authFetch, call, rid],
	);

	// ── 9. Créneaux stratégiques ─────────────────────────────────────────────
	/**
	 * Retourne les 20 créneaux les plus sous-exploités avec recommandations.
	 * @returns {Array<{ dayName, time, avgOccupancy, recommendation, urgency }>}
	 *
	 * UX : onglet "Stratégie" → carte prioritaire des actions marketing
	 *   "Vendredi 15h : 10% occ. sur jour fort → Happy Hour idéal (urgence haute)"
	 */
	const getStrategicSlots = useCallback(async () => {
		const restaurantId = await rid();
		if (!restaurantId) return null;
		return call("strategicSlots", () =>
			authFetch(`${BASE}/ai/${restaurantId}/strategic-slots`),
		);
	}, [authFetch, call, rid]);

	// ─────────────────────────────────────────────────────────────────────────

	return {
		// Actions
		getSmartSlots,
		getAlternatives,
		autoAssign,
		getHeatmap,
		getGaps,
		getSmartDuration,
		getWaitingList,
		promoteWaiting,
		predict,
		getStrategicSlots,
		// États
		loading,
		errors,
	};
}

/**
 * useOptimizationSuggestions.js
 * Analyse les réservations + tables et génère des suggestions
 * d'optimisation / alertes upselling à afficher via Toaster.
 *
 * Usage :
 *   const { runAnalysis } = useOptimizationSuggestions({ toasterRef, reservations, tables, selectedDate });
 *   // runAnalysis() à appeler manuellement ou sur changement de date
 */
import { useCallback, useRef } from "react";

// ─── Helpers ─────────────────────────────────────────────────────────────────
const toMin = (str) => {
	if (!str) return null;
	const [h, m] = str.split(":").map(Number);
	return h * 60 + (m || 0);
};

const toHHMM = (min) => {
	const h = Math.floor(min / 60);
	const m = min % 60;
	return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

const getTableId = (r) => {
	const raw = r?.tableId;
	if (!raw) return null;
	return typeof raw === "object" ? raw._id : raw;
};

const tableLabel = (t) => t?.number?.toString() || t?.name || "?";

// ─── Règles d'analyse ────────────────────────────────────────────────────────

/**
 * Règle 1 — Réservations sans table dans les 45 min
 * Génère warning / error selon urgence
 */
const checkUnassignedUrgent = (reservations) => {
	const now = new Date();
	const nowMin = now.getHours() * 60 + now.getMinutes();

	const unassigned = reservations.filter((r) => {
		const s = ["en attente", "actives", "present"].includes(
			(r.status || "").toLowerCase(),
		);
		return s && !getTableId(r);
	});

	const urgent = unassigned.filter((r) => {
		const start = toMin(r.reservationTime?.substring(0, 5));
		return start !== null && start - nowMin <= 45 && start > nowMin;
	});

	if (urgent.length === 0) return null;
	const variant = urgent.length >= 3 ? "error" : "warning";
	return {
		variant,
		position: "top-right",
		title: `${urgent.length} résa${urgent.length > 1 ? "s" : ""} sans table`,
		message: `Dans moins de 45 min — assignez une table rapidement.`,
		duration: 5000,
	};
};

/**
 * Règle 2 — Créneaux libres consécutifs d'au moins 2h sur une table
 * Sugère d'y placer une réservation ou de le proposer à la vente
 */
const checkFreeSlots = (reservations, tables, turnoverTime = 90) => {
	const ACTIVE = ["en attente", "actives", "present", "ouverte"];
	const suggestions = [];

	tables.forEach((t) => {
		const resasOnTable = reservations
			.filter(
				(r) =>
					ACTIVE.includes((r.status || "").toLowerCase()) &&
					getTableId(r) === t._id,
			)
			.map((r) => ({
				start: toMin(r.reservationTime?.substring(0, 5)) ?? null,
				end:
					(toMin(r.reservationTime?.substring(0, 5)) ?? 0) +
					(r.turnoverTime || turnoverTime),
			}))
			.filter((b) => b.start !== null)
			.sort((a, b) => a.start - b.start);

		// Chercher des gaps ≥ 120 min
		for (let i = 0; i < resasOnTable.length - 1; i++) {
			const gap = resasOnTable[i + 1].start - resasOnTable[i].end;
			if (gap >= 120) {
				suggestions.push({
					table: t,
					from: resasOnTable[i].end,
					to: resasOnTable[i + 1].start,
					gap,
				});
			}
		}
	});

	if (suggestions.length === 0) return null;

	// Top suggestion = gap le plus long
	suggestions.sort((a, b) => b.gap - a.gap);
	const top = suggestions[0];
	return {
		variant: "default",
		position: "bottom-right",
		title: "Créneau libre détecté",
		message: `Table ${tableLabel(top.table)} libre de ${toHHMM(top.from)} à ${toHHMM(top.to)} (${Math.round(top.gap / 60)}h${top.gap % 60 > 0 ? top.gap % 60 : ""}). Pensez à proposer une résa.`,
		duration: 6000,
		highlightTitle: false,
		_count: suggestions.length,
	};
};

/**
 * Règle 3 — Tables vides toute la journée
 */
const checkIdleTables = (reservations, tables) => {
	const ACTIVE = [
		"en attente",
		"actives",
		"present",
		"ouverte",
		"terminée",
		"termine",
	];
	const activeIds = new Set(
		reservations
			.filter((r) => ACTIVE.includes((r.status || "").toLowerCase()))
			.map((r) => getTableId(r))
			.filter(Boolean),
	);

	const idle = tables.filter((t) => !activeIds.has(t._id));
	if (idle.length === 0) return null;

	return {
		variant: "default",
		position: "bottom-left",
		title: `${idle.length} table${idle.length > 1 ? "s" : ""} sans réservation`,
		message: `${idle.map(tableLabel).slice(0, 4).join(", ")}${idle.length > 4 ? "…" : ""} — potentiel non exploité.`,
		duration: 5000,
	};
};

/**
 * Règle 4 — Risque no-show : réservations sans téléphone
 */
const checkNoShowRisk = (reservations) => {
	const atRisk = reservations.filter(
		(r) =>
			["en attente", "actives"].includes((r.status || "").toLowerCase()) &&
			!r.phone,
	);
	if (atRisk.length < 2) return null;
	return {
		variant: "warning",
		position: "top-right",
		title: "Risque no-show",
		message: `${atRisk.length} réservations sans numéro de téléphone. Confirmez par message.`,
		duration: 5000,
	};
};

/**
 * Règle 5 — Upsell : revenu estimé sous le seuil
 * (uniquement si au moins 3 réservations terminées)
 */
const checkUpsellOpportunity = (reservations, tables) => {
	const done = reservations.filter((r) =>
		["terminée", "termine"].includes((r.status || "").toLowerCase()),
	);
	if (done.length < 3) return null;

	const avg = done.reduce((s, r) => s + (r.totalAmount || 0), 0) / done.length;
	if (avg >= 25) return null; // Seuil arbitraire : moyenne ≥ 25€ = OK

	return {
		variant: "default",
		position: "bottom-left",
		title: "Upsell",
		message: `Ticket moyen : ${avg.toFixed(0)}€. Proposez des formules ou boissons pour augmenter le panier.`,
		duration: 6000,
	};
};

// ─── Hook principal ───────────────────────────────────────────────────────────
const useOptimizationSuggestions = ({
	toasterRef,
	reservations = [],
	tables = [],
	turnoverTime = 90,
	selectedDate,
}) => {
	// Évite de spammer les mêmes alertes
	const lastRunRef = useRef(null);

	const runAnalysis = useCallback(
		({ force = false } = {}) => {
			if (!toasterRef?.current) return;

			const now = Date.now();
			// Throttle : pas plus d'une analyse toutes les 60s (sauf force)
			if (!force && lastRunRef.current && now - lastRunRef.current < 60_000) {
				return;
			}
			lastRunRef.current = now;

			const rules = [
				checkUnassignedUrgent(reservations),
				checkFreeSlots(reservations, tables, turnoverTime),
				checkNoShowRisk(reservations),
				checkIdleTables(reservations, tables),
				checkUpsellOpportunity(reservations, tables),
			];

			// Afficher les toasts avec un léger décalage entre chaque
			let delay = 0;
			rules.forEach((suggestion) => {
				if (!suggestion) return;
				setTimeout(() => {
					toasterRef.current?.show(suggestion);
				}, delay);
				delay += 600;
			});
		},
		[toasterRef, reservations, tables, turnoverTime],
	);

	/**
	 * Alerte immédiate — ex : après un drag & drop réussi
	 * variant: "success" | "error" | "warning" | "default"
	 */
	const showAlert = useCallback(
		({
			title,
			message,
			variant = "success",
			position = "bottom-right",
			duration = 3500,
			actions,
		}) => {
			toasterRef?.current?.show({
				title,
				message,
				variant,
				position,
				duration,
				actions,
			});
		},
		[toasterRef],
	);

	return { runAnalysis, showAlert };
};

export default useOptimizationSuggestions;

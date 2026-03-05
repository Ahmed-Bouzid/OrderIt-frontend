import useSocket from "./useSocket";
// hooks/useReservationManager.js
import { useState, useEffect, useCallback, useRef } from "react";
import { Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { API_CONFIG } from "../src/config/apiConfig";
import { useAuthFetch } from "./useAuthFetch";

/**
 * Hook custom pour gérer la logique des réservations
 */
// ⭐ Fonction pour nettoyer le cache global
const clearCachedActiveId = () => {
	AsyncStorage.removeItem("activeReservationId").catch(console.error);
};

export const useReservationManager = (reservations, fetchReservations) => {
	const authFetch = useAuthFetch();
	const { socket } = useSocket();
	const hasRestoredIdRef = useRef(false);
	const hasLoadedReservationsRef = useRef(false);
	const hasAutoSelectedRef = useRef(false);

	// ⭐ Initialiser directement avec les réservations ouvertes si disponibles (protection contre undefined)
	const initialOpenedResas =
		Array.isArray(reservations) && reservations
			? reservations.filter((r) => r.status === "ouverte")
			: [];
	const [openedReservations, setOpenedReservations] =
		useState(initialOpenedResas);

	// ⭐ NE PAS initialiser avec cachedActiveId - commencer à null pour éviter le flash
	const [activeId, setActiveId] = useState(null);

	// ⭐ NE PAS initialiser activeReservation - attendre la validation
	const [activeReservation, setActiveReservation] = useState(null);

	const [orders, setOrders] = useState([]);
	const lastFetchedReservationRef = useRef(null);

	// ⭐ Restaurer activeId depuis AsyncStorage UNIQUEMENT si la réservation est ouverte
	useEffect(() => {
		const restoreActiveId = async () => {
			if (hasRestoredIdRef.current) return;

			// ⭐ Attendre que les réservations soient chargées
			if (!Array.isArray(reservations) || reservations.length === 0) return;

			hasRestoredIdRef.current = true;
			const saved = await AsyncStorage.getItem("activeReservationId");

			if (saved) {
				// ⭐ Valider que la réservation existe ET est ouverte
				const savedResa = reservations.find((r) => r._id === saved);
				if (savedResa && savedResa.status === "ouverte") {
					setActiveId(saved);
					// updateCachedActiveId supprimé (inutile)
				} else {
					// ⭐ Réservation fermée ou inexistante - nettoyer
					console.log("🧹 Réservation sauvegardée invalide, nettoyage");
					await AsyncStorage.removeItem("activeReservationId");
					clearCachedActiveId();
				}
			}
		};
		restoreActiveId();

		return () => {
			if (activeId) {
				AsyncStorage.setItem("activeReservationId", activeId).catch(
					console.error,
				);
			}
		};
	}, [activeId, reservations]);

	// Synchroniser réservations ouvertes
	useEffect(() => {
		// Marquer comme chargé dès qu'on a des réservations (même si vide)
		if (
			Array.isArray(reservations) &&
			reservations.length >= 0 &&
			!hasLoadedReservationsRef.current
		) {
			hasLoadedReservationsRef.current = true;
		}

		if (Array.isArray(reservations) && reservations.length > 0) {
			const openedResas = reservations.filter((r) => r.status === "ouverte");
			setOpenedReservations(openedResas);

			if (activeId) {
				const activeResa = reservations.find((r) => r._id === activeId);
				// Si la réservation n'existe plus OU est fermée/annulée
				if (
					!activeResa ||
					activeResa.status === "terminée" ||
					activeResa.status === "annulée"
				) {
					setActiveId(null);
					setActiveReservation(null);
					clearCachedActiveId(); // ⭐ Nettoyer le cache global
					AsyncStorage.removeItem("activeReservationId").catch(console.error);
					// ⭐ NE PAS auto-sélectionner une autre réservation après fermeture manuelle
					hasAutoSelectedRef.current = true;
				}
			} else if (openedResas.length > 0 && !hasAutoSelectedRef.current) {
				// ⭐ Auto-sélectionner la première réservation ouverte si aucune n'est active (une seule fois)
				hasAutoSelectedRef.current = true;
				setActiveId(openedResas[0]._id);
				// updateCachedActiveId supprimé (inutile)
				AsyncStorage.setItem("activeReservationId", openedResas[0]._id).catch(
					console.error,
				);
			}
		} else if (hasLoadedReservationsRef.current && activeId) {
			// Si les réservations sont chargées et qu'il n'y en a aucune, nettoyer activeId
			setActiveId(null);
			setActiveReservation(null);
			clearCachedActiveId(); // ⭐ Nettoyer le cache global
			AsyncStorage.removeItem("activeReservationId").catch(console.error);
		}
	}, [reservations, activeId]);

	// Ajouter réservation active si manquante
	useEffect(() => {
		if (activeId && Array.isArray(reservations) && reservations.length > 0) {
			const reservation = reservations.find((r) => r._id === activeId);
			if (reservation && !openedReservations.some((o) => o._id === activeId)) {
				setOpenedReservations((prev) => [...prev, reservation]);
			}
		}
	}, [reservations, activeId, openedReservations]);

	// Mettre à jour activeReservation
	useEffect(() => {
		const reservation = Array.isArray(reservations)
			? reservations.find((r) => r._id === activeId) || null
			: null;

		// ⭐ Ne pas mettre à jour si la réservation est fermée/annulée
		if (
			reservation &&
			(reservation.status === "terminée" || reservation.status === "annulée")
		) {
			return;
		}

		if (reservation) {
			setActiveReservation((prev) => {
				// ⭐ Si c'est la même réservation, préserver les modifications locales
				if (prev && prev._id === reservation._id) {
					return {
						...reservation,
						// ⭐ Préserver orderItems locaux (quantités ajoutées)
						orderItems: prev.orderItems || reservation.orderItems || [],
						// ⭐ Préserver modifications locales si différentes du backend
						notes:
							prev.notes !== undefined ? prev.notes : reservation.notes || "",
						allergies:
							prev.allergies !== undefined
								? prev.allergies
								: reservation.allergies || "",
						restrictions:
							prev.restrictions !== undefined
								? prev.restrictions
								: reservation.restrictions || "Aucune",
						staffNotes:
							prev.staffNotes !== undefined
								? prev.staffNotes
								: reservation.staffNotes || "",
						customerName: reservation.customerName || "",
						tableId: reservation.tableId || null,
						status: reservation.status || "pending",
						createdAt: reservation.createdAt || null,
						updatedAt: reservation.updatedAt || null,
						totalPrice: reservation.totalPrice || 0,
						paymentStatus: reservation.paymentStatus || "unpaid",
					};
				}
				// ⭐ Nouvelle réservation : utiliser les valeurs du backend
				return {
					...reservation,
					orderItems: reservation.orderItems || [],
					notes: reservation.notes || "",
					allergies: reservation.allergies || "",
					restrictions: reservation.restrictions || "Aucune",
					staffNotes: reservation.staffNotes || "",
					customerName: reservation.customerName || "",
					tableId: reservation.tableId || null,
					status: reservation.status || "pending",
					createdAt: reservation.createdAt || null,
					updatedAt: reservation.updatedAt || null,
					totalPrice: reservation.totalPrice || 0,
					paymentStatus: reservation.paymentStatus || "unpaid",
				};
			});
		} else {
			setActiveReservation(null);
		}
	}, [openedReservations, activeId, reservations]);

	// Calculer le total
	useEffect(() => {
		if (!activeReservation) return;

		const total = orders
			.reduce(
				(total, order) =>
					total + order.items.reduce((sum, i) => sum + i.price * i.quantity, 0),
				0,
			)
			.toFixed(2);

		setActiveReservation((prev) => {
			if (!prev) return prev;
			if (prev.totalAmount === total) return prev;
			return { ...prev, totalAmount: total };
		});
	}, [orders, activeReservation]);

	// ⭐ Écouter les mises à jour de réservations via WebSocket
	useEffect(() => {
		if (!socket) return;

		const handleReservationUpdate = (event) => {
			if (event.type === "updated" && event.data) {
				// Mettre à jour openedReservations si la réservation est dedans
				setOpenedReservations((prev) =>
					prev.map((r) => (r._id === event.data._id ? event.data : r)),
				);
				console.log(
					`✅ Activity: Réservation ${event.data._id} mise à jour, totalAmount: ${event.data.totalAmount}€`,
				);
			}
		};

		socket.on("reservation", handleReservationUpdate);

		return () => {
			socket.off("reservation", handleReservationUpdate);
		};
	}, [socket]);

	// Fetch orders - PAR RESERVATION (nouvelle route backend)
	const fetchOrders = useCallback(
		async (tableId, reservationId, force = false) => {
			if (!reservationId) {
				console.warn("⚠️ fetchOrders appelé sans reservationId");
				setOrders([]);
				return;
			}

			// ⭐ Ne pas refetch si c'est la même réservation (sauf si force=true)
			if (!force && lastFetchedReservationRef.current === reservationId) {
				console.log(`⏭️ Commandes déjà chargées pour ${reservationId}, skip`);
				return;
			}

			try {
				// ⭐ UTILISER LA NOUVELLE ROUTE /orders/reservation/:reservationId
				const data = await authFetch(
					`${API_CONFIG.baseURL}/orders/reservation/${reservationId}`,
				);

				console.log(
					`📦 Commandes récupérées pour réservation ${reservationId}:`,
					(data || []).length,
				);
				setOrders(data || []);
				lastFetchedReservationRef.current = reservationId;
			} catch (error) {
				console.error("Erreur fetch commandes :", error);
				setOrders([]);
			}
		},
		[authFetch],
	);

	// Marquer réservation comme fermée
	const markReservationAsFinished = useCallback(
		async (reservationId) => {
			try {
				// ⭐ CORRECTION: Utiliser la route /:id/status qui applique les règles métier
				// (isPresent=false automatique, validation des transitions)
				const response = await authFetch(
					`${API_CONFIG.baseURL}/reservations/${reservationId}/status`,
					{
						method: "PUT",
						body: { status: "terminée" },
					},
				);
				return response;
			} catch (error) {
				console.error("❌ markReservationAsFinished error:", error);
				return null;
			}
		},
		[authFetch],
	);

	// Marquer réservation comme ouverte
	const markReservationAsOpened = useCallback(
		async (reservationId) => {
			try {
				const response = await authFetch(
					`${API_CONFIG.baseURL}/reservations/${reservationId}/status`,
					{
						method: "PUT",
						body: { status: "ouverte" },
					},
				);

				if (Array.isArray(response) && response.length === 0) {
					console.error("❌ Erreur changement statut - array vide");
					return null;
				}

				return response;
			} catch (error) {
				console.error("❌ markReservationAsOpened error:", error);
				return null;
			}
		},
		[authFetch],
	);

	// ⭐ Rafraîchir une réservation (pour récupérer totalAmount mis à jour)
	const refreshReservation = useCallback(
		async (reservationId) => {
			try {
				const updatedResa = await authFetch(
					`${API_CONFIG.baseURL}/reservations/${reservationId}`,
				);

				if (!updatedResa || Array.isArray(updatedResa)) {
					console.error("❌ Erreur refresh réservation");
					return;
				}

				// Mettre à jour dans openedReservations
				setOpenedReservations((prev) =>
					prev.map((r) => (r._id === reservationId ? updatedResa : r)),
				);
			} catch (error) {
				console.error("❌ refreshReservation error:", error);
			}
		},
		[authFetch],
	);

	// Ouvrir prochaine réservation
	// ⭐ RÈGLE MÉTIER: Seules les réservations isPresent=true ET status="en attente" peuvent être ouvertes
	const openNextReservation = useCallback(async () => {
		// ⭐ IMPORTANT: Utiliser les données du state (synchronisées avec WebSocket)
		// Le state `reservations` vient maintenant du store Zustand via useActivityData
		// qui est mis à jour en temps réel par les événements WebSocket
		let freshReservations = reservations || [];

		// ⭐ Helper pour extraire les 6 derniers caractères de l'ID
		const getShortId = (id) => (id ? id.slice(-6) : null);

		// ⭐ Debug : afficher les réservations ouvrables (isPresent=true ET status="en attente")
		// UTILISER freshReservations au lieu de reservations
		// ⭐ CORRECTION: Comparer avec les bons formats d'ID (openedReservations utilise 'id' court)
		const openableReservations = freshReservations.filter((r) => {
			const shortId = getShortId(r._id);
			const isAlreadyOpened = openedReservations.some(
				(o) =>
					o._id === r._id || o.id === shortId || getShortId(o._id) === shortId,
			);
			return (
				r.isPresent === true && r.status === "en attente" && !isAlreadyOpened
			);
		});
		// ⭐ RÈGLE MÉTIER: Chercher UNIQUEMENT les réservations présentes EN ATTENTE
		const nextResa = openableReservations.sort(
			(a, b) =>
				new Date(`${a.reservationDate} ${a.reservationTime}`) -
				new Date(`${b.reservationDate} ${b.reservationTime}`),
		)[0];

		if (!nextResa) {
			Alert.alert(
				"Aucune réservation",
				"Il n'y a pas de réservation présente en attente à ouvrir.\n\nAssurez-vous qu'un client est marqué comme présent.",
				[{ text: "OK" }],
			);
			return null;
		}

		const updatedResa = await markReservationAsOpened(nextResa._id);

		if (!updatedResa || updatedResa.status !== "ouverte") {
			console.error("❌ Échec de l'ouverture de la réservation");
			Alert.alert("Erreur", "Impossible d'ouvrir la réservation");
			return null;
		}

		// ⭐ Ajouter immédiatement la nouvelle réservation aux openedReservations
		setOpenedReservations((prev) => {
			// Éviter les doublons
			if (prev.some((r) => r._id === updatedResa._id)) return prev;
			return [...prev, updatedResa];
		});

		setActiveId(updatedResa._id);
		await AsyncStorage.setItem("activeReservationId", updatedResa._id);

		return updatedResa;
	}, [
		reservations,
		openedReservations,
		markReservationAsOpened,
		fetchReservations,
	]);

	// Sauvegarder un champ dans le backend
	const saveFieldToBackend = useCallback(
		async (reservationId, field, value) => {
			try {
				await authFetch(`${API_CONFIG.baseURL}/reservations/${reservationId}`, {
					method: "PUT",
					body: { [field]: value },
				});
			} catch (error) {
				console.error(`❌ Erreur sauvegarde ${field}:`, error);
			}
		},
		[authFetch],
	);

	// Modifier un champ
	const editField = useCallback(
		(field, value, saveImmediately = false) => {
			if (!activeId) return;

			const finalValue =
				typeof value === "function" ? value(activeReservation?.[field]) : value;

			// ⭐ Mettre à jour openedReservations
			setOpenedReservations((prev) =>
				prev.map((r) =>
					r._id === activeId
						? {
								...r,
								[field]: finalValue,
							}
						: r,
				),
			);
			// ⭐ Mettre à jour activeReservation immédiatement pour une UI réactive
			setActiveReservation((prev) => {
				if (!prev || prev._id !== activeId) return prev;
				return {
					...prev,
					[field]: finalValue,
				};
			});

			// ⭐ Sauvegarder dans le backend (pour notes, allergies, restrictions)
			if (saveImmediately && activeId) {
				saveFieldToBackend(activeId, field, finalValue);
			}
		},
		[activeId, activeReservation, saveFieldToBackend],
	);

	return {
		openedReservations,
		setOpenedReservations, // ⭐ Exposer pour permettre le reset immédiat depuis Activity
		activeId,
		setActiveId,
		activeReservation,
		setActiveReservation,
		orders,
		setOrders,
		fetchOrders,
		refreshReservation,
		markReservationAsFinished,
		markReservationAsOpened,
		openNextReservation,
		editField,
		isReservationsLoaded: hasLoadedReservationsRef.current,
		clearCachedActiveId, // ⭐ Exporter pour nettoyer le cache depuis Activity.jsx
	};
};

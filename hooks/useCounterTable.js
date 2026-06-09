/**
 * 🏪 useCounterTable — Hook composite pour gérer une table en mode Comptoir
 *
 * ✅ Refactor complet (2 juin 2026) :
 * - Timers sur actions métier (sendToCook, closeTable, cancelOrder)
 * - Validation stricte des params
 * - Factorisation calcul totalAmount (helper computeSessionTotal)
 * - Logs standardisés avec contexte métier
 * - Pattern cohérent avec useReservationManager (Activity mode)
 *
 * Retourne { session, cart, actions: { addItem, removeItem, sendToCook, requestBill, close } }
 */

import { useEffect, useCallback, useState, useMemo } from "react";
import useCounterCartStore from "../src/stores/useCounterCartStore";
import useCounterTableStore from "../src/stores/useCounterTableStore";
import useUserStore from "../src/stores/useUserStore";
import counterService from "../services/counterService";
import useSocket from "./useSocket";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuthFetch } from "./useAuthFetch";
import { API_CONFIG } from "../src/config/apiConfig";

/**
 * Helper : calculer le total d'une session (somme des orders non cancelled)
 * Factorisation : utilisé dans sendToCook + cancelOrder + closeTable
 */
// ✅ Constante pour éviter de créer un nouveau array à chaque setState
const EMPTY_ARRAY = [];

const computeSessionTotal = (orders) => {
	const activeOrders = orders.filter(o => o.orderStatus !== "cancelled");
	const totalAmount = activeOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
	const itemsCount = activeOrders.reduce((sum, o) => sum + (o.items?.length || 0), 0);
	return { totalAmount, itemsCount };
};

/**
 * Hook composite pour gérer une table en mode Comptoir
 *
 * @param {string} tableId — ID de la table
 * @param {string} restaurantId — ID du restaurant (optionnel, cherché dans le store si absent)
 */
export const useCounterTable = (tableId, restaurantId = null) => {
	const [actualRestaurantId, setActualRestaurantId] = useState(restaurantId);
	const [isOpening, setIsOpening] = useState(false);
	const [sessionOrders, setSessionOrders] = useState(EMPTY_ARRAY);
	const [hasInitializedRestaurantId, setHasInitializedRestaurantId] = useState(false);

	// Auth fetch (même hook qu'Activity.jsx — retry auto, logs erreur détaillés)
	const authFetch = useAuthFetch();

	// Stores
	const rawCart = useCounterCartStore((state) => state.carts[tableId]);
	const cart = useMemo(() => rawCart || [], [rawCart]);
	const cartTotal = useMemo(
		() => cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
		[cart],
	);
	const cartItemsCount = useMemo(
		() => cart.reduce((sum, item) => sum + item.quantity, 0),
		[cart],
	);

	const addCartItem = useCounterCartStore((state) => state.addItem);
	const removeCartItem = useCounterCartStore((state) => state.removeItem);
	const setCartQty = useCounterCartStore((state) => state.setQty);
	const clearCart = useCounterCartStore((state) => state.clearCart);

	// ✅ User ID pour assigner les commandes au serveur
	const userId = useUserStore((state) => state.userId);

	const rawTableSessions = useCounterTableStore((state) => state.sessions[actualRestaurantId]);
	const tableSession = useMemo(() => {
		const sessions = rawTableSessions || [];
		return sessions.find((s) => s.tableId === tableId && s.billStatus !== "closed") || null;
	}, [rawTableSessions, tableId]);
	// ✅ Extraire sessionId stable pour éviter boucle infinie (tableSession change de ref à chaque mutation store)
	const sessionId = tableSession?._id;
	const openTableSession = useCounterTableStore((state) => state.openSession);
	const updateTableSession = useCounterTableStore((state) =>
		state.updateSession,
	);
	const closeTableSession = useCounterTableStore((state) => state.closeSession);

	// Socket
	const { socket } = useSocket();

	// Initialiser restaurantId si absent (une seule fois)
	useEffect(() => {
		if (actualRestaurantId || hasInitializedRestaurantId) return;

		const initRestaurantId = async () => {
			try {
				const useUserStore = require("../stores/useUserStore").default;
				const fromStore = useUserStore.getState().restaurantId;
				if (fromStore) {
					setActualRestaurantId(fromStore);
				} else {
					const fromStorage = await AsyncStorage.getItem("restaurantId");
					if (fromStorage) {
						setActualRestaurantId(fromStorage);
					}
				}
			} catch (err) {
				console.error("[useCounterTable] Erreur init restaurantId:", err);
			} finally {
				setHasInitializedRestaurantId(true);
			}
		};

		initRestaurantId();
	}, [actualRestaurantId, hasInitializedRestaurantId]);

	// (session ouverte explicitement via actions.openTable, pas au mount)

	// Attacher socket listener
	useEffect(() => {
		if (!socket || !actualRestaurantId) return;

		const unsubscribe = useCounterTableStore
			.getState()
			.attachSocketListener(socket);

		return () => {
			if (unsubscribe) unsubscribe();
		};
	}, [socket, actualRestaurantId]);

	// Charger les orders de la session active
	useEffect(() => {
		if (!sessionId) {
			setSessionOrders(EMPTY_ARRAY);
			return;
		}

		let cancelled = false;
		const load = async () => {
			// 🗑️ ÉTAPE 1 : Nettoyer les orphelins AVANT de charger
			await counterService.cleanupOrphans(tableId, actualRestaurantId);
			
			// 📦 ÉTAPE 2 : Charger les orders (maintenant propres)
			const orders = await counterService.getSessionOrders(
				sessionId,
				actualRestaurantId,
				tableId,
			);
			
			// 🔍 CONSOLE LOG : Commandes chargées depuis l'API
			if (orders && orders.length > 0) {
				console.log("\n📦 [ORDERS API] Commandes chargées pour session:", sessionId);
				
				// ⚠️ Distinguer les orders liés à la session counter vs orphelins d'anciennes réservations
				const linkedToSession = orders.filter(o => o.tableSessionId === sessionId);
				const orphans = orders.filter(o => o.tableSessionId !== sessionId);
				
				console.log("🔗 [ORDERS] Liées à cette session counter:", linkedToSession.length);
				console.log("👻 [ORDERS] Orphelines (anciennes résa/sessions):", orphans.length);
				
				if (linkedToSession.length > 0) {
					console.log("✅ [ORDERS] Commandes de cette session:", JSON.stringify(linkedToSession, null, 2));
				}
				
				if (orphans.length > 0) {
					console.log("⚠️ [ORDERS] Commandes orphelines (affichées mais pas de cette session):");
					console.log("   Raisons possibles: ancienne réservation non payée, session fermée sans encaissement");
					console.log("   Détails:", orphans.map(o => ({
						orderId: o._id,
						reservationId: o.reservationId?._id || 'N/A',
						tableSessionId: o.tableSessionId || 'null',
						items: o.items?.length,
						total: o.totalAmount,
						status: o.orderStatus
					})));
				}
				
				console.log("📊 [ORDERS] Résumé global:", {
					total: orders.length,
					liéesSession: linkedToSession.length,
					orphelines: orphans.length,
					totalItems: orders.reduce((sum, o) => sum + (o.items?.length || 0), 0)
				});
				
				// ✅ Ne conserver QUE les orders liés à cette session
				if (!cancelled) setSessionOrders(linkedToSession.length > 0 ? linkedToSession : EMPTY_ARRAY);
			} else {
				console.log("📭 [ORDERS API] Aucune commande pour session:", sessionId);
				if (!cancelled) setSessionOrders(EMPTY_ARRAY);
			}
		};
		load();

		return () => { cancelled = true; };
	}, [sessionId, actualRestaurantId, tableId]);

	/**
	 * Rafraîchir les orders depuis le backend (utilisé après WebSocket order event).
	 * Pattern identique à fetchOrders() dans useReservationManager.
	 * ✅ Utilise sessionId au lieu de tableSession objet pour éviter boucle infinie
	 */
	const refreshSessionOrders = useCallback(async () => {
		if (!sessionId) return;
		const orders = await counterService.getSessionOrders(
			sessionId,
			actualRestaurantId,
			tableId,
		);
		// ✅ Filtrer les orphelins (même filtre que dans le useEffect principal)
		const linkedToSession = orders.filter(o => o.tableSessionId === sessionId);
		// ✅ Utiliser EMPTY_ARRAY quand vide pour éviter les re-renders inutiles
		setSessionOrders(linkedToSession.length > 0 ? linkedToSession : EMPTY_ARRAY);
	}, [sessionId, actualRestaurantId, tableId]);

	/**
	 * WebSocket — écoute les events "order" pour mettre à jour les statuts
	 * en temps réel (confirmed → ready → completed).
	 * Même pattern que le listener "reservation" dans useReservationManager.
	 * ✅ Utilise sessionId stable au lieu de tableSession objet
	 */
	useEffect(() => {
		if (!socket || !sessionId) return;

		const handleOrderEvent = (event) => {
			const { type, data } = event || {};
			// Filtrer : uniquement les orders de notre session
			if (!data?.tableSessionId) return;
			const eventSessionId = String(data.tableSessionId);
			const currentSessionId = String(sessionId);
			if (eventSessionId !== currentSessionId) return;

			// Sur tout changement de statut → recharger la liste complète
			if (["created", "updated", "statusUpdated", "cancelled"].includes(type)) {
				refreshSessionOrders();
			}
		};

		socket.on("order", handleOrderEvent);
		return () => socket.off("order", handleOrderEvent);
	}, [socket, sessionId, refreshSessionOrders]);

	/**
	 * WebSocket — écoute les paiements Stripe validés (payment-completed)
	 * Permet de synchroniser le total de la table quand un client paie via Stripe.
	 * Format payload: { type: "payment_completed", data: { tableId, orderId, amount, ... } }
	 */
	useEffect(() => {
		if (!socket || !tableId) return;

		const handlePaymentCompleted = (payload) => {
			const paymentTableId = payload?.data?.tableId?.toString();
			const currentTableId = tableId?.toString();

			// Filtrer : uniquement les paiements de notre table
			if (paymentTableId !== currentTableId) return;

			// Recharger les orders pour mettre à jour le total (order marqué paid)
			refreshSessionOrders();
		};

		socket.on("payment-completed", handlePaymentCompleted);
		return () => socket.off("payment-completed", handlePaymentCompleted);
	}, [socket, tableId, refreshSessionOrders]);

	// ⭐ Polling fallback 5s — rattrape les orders si socket déconnecté
	useEffect(() => {
		if (!sessionId) return;
		const interval = setInterval(() => refreshSessionOrders(), 5000);
		return () => clearInterval(interval);
	}, [sessionId, refreshSessionOrders]);

	// Actions métier
	const actions = {
		/**
		 * Ouvrir la session table (action explicite du serveur)
		 */
		openTable: async () => {
			const startTime = Date.now(); // ✅ Timer
			
			// ✅ Validation stricte
			if (!actualRestaurantId || !tableId) {
				throw new Error("restaurantId et tableId requis");
			}
			
			setIsOpening(true);
			try {
				const session = await counterService.openSession(
					actualRestaurantId,
					tableId,
				);
				openTableSession(actualRestaurantId, tableId, session);
				
				const elapsed = Date.now() - startTime;
			} catch (err) {
				const elapsed = Date.now() - startTime;
				console.error(`[Counter] openTable FAIL after ${elapsed}ms:`, err.message);
				throw err;
			} finally {
				setIsOpening(false);
			}
		},

		/**
		 * Ajouter un produit au panier
		 */
		addItem: (product) => {
			addCartItem(tableId, product);
		},

		/**
		 * Changer la quantité d'un item
		 */
		setQty: (tempId, qty) => {
			setCartQty(tableId, tempId, qty);
		},

		/**
		 * Supprimer un item du panier
		 */
		removeItem: (tempId) => {
			removeCartItem(tableId, tempId);
		},

		/**
		 * Envoyer le panier en cuisine
		 * Flush du panier local → POST /orders
		 * Pattern identique à Activity.jsx submitOrder
		 */
		sendToCook: async () => {
			const startTime = Date.now(); // ✅ Timer
			
			// ✅ Validation stricte
			if (!tableSession || !cart || cart.length === 0) {
				throw new Error("Panier vide");
			}

			try {
				// Préparer les items — même structure qu'Activity.jsx
				const items = cart.map((item) => ({
					productId: item.productId,
					name: item.name,
					quantity: item.quantity,
					price: item.price,
					category: item.category || "autre",
					...(item.notes ? { notes: item.notes } : {}),
				}));

				// Validation avant envoi (garde-fou)
				if (items.some((i) => typeof i.price !== "number" || i.price < 0)) {
					throw new Error("Prix invalide dans le panier — relancer l'app");
				}

				// Recalculer le total depuis les items (comme Activity) pour garantir la cohérence
				const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

			// 🔑 Récupérer serverId depuis la session (assigné à l'ouverture de table)
			const rawServerId = tableSession?.serverId;
			const serverId = rawServerId?._id || rawServerId || userId; // Extraire _id si objet populé

			// POST /orders via authFetch — retry auto sur 5xx, logs body erreur automatiques
			const order = await authFetch(`${API_CONFIG.baseURL}/orders`, {
				method: "POST",
				body: {
					tableId,
					items,
					total,
					restaurantId: actualRestaurantId,
					tableSessionId: tableSession._id,
					serverId, // ✅ Serveur de la session (ou admin connecté en fallback)
						source: "counter",
						orderStatus: "confirmed",
					},
				});

				// authFetch retourne [] comme airbag sur erreur
				if (!order || (Array.isArray(order) && order.length === 0)) {
					throw new Error("Échec envoi commande — voir logs Metro");
				}

				// Vider le panier après succès
				clearCart(tableId);

				// Recharger les orders pour afficher le nouvel envoi
				const updatedOrders = await counterService.getSessionOrders(
					tableSession._id,
					actualRestaurantId,
					tableId,
				);
				// ✅ Filtrer les orphelins (cohérence avec refreshSessionOrders)
				const linkedToSession = updatedOrders.filter(o => o.tableSessionId === tableSession._id);
				setSessionOrders(linkedToSession);

				// ✅ Sync totalAmount dans le store avec helper factorisé
				const { totalAmount: newTotal, itemsCount: newItemsCount } = computeSessionTotal(linkedToSession);
				updateTableSession(actualRestaurantId, tableSession._id, { 
					totalAmount: newTotal, 
					itemsCount: newItemsCount 
				});

				const elapsed = Date.now() - startTime;

				return order;
			} catch (err) {
				const elapsed = Date.now() - startTime;
				console.error(`[Counter] sendToCook FAIL after ${elapsed}ms:`, err.message);
				throw err;
			}
		},

		/**
		 * Annuler une commande individuelle.
		 * Guard : commande déjà annulée → silent skip.
		 * Pattern identique à handleCancelOrder() dans Activity.jsx.
		 * Route backend : PATCH /orders/:id/cancel
		 */
		cancelOrder: async (orderId) => {
			const startTime = Date.now(); // ✅ Timer
			
			// ✅ Validation stricte
			if (!orderId) throw new Error("orderId manquant");
			if (!tableSession) throw new Error("Aucune session active");
			
			try {
				await authFetch(`/orders/${orderId}/cancel`, { method: "PATCH" });
				await refreshSessionOrders();

				// ✅ Recalculer le total avec helper factorisé
				const updatedOrders = await counterService.getSessionOrders(
					tableSession._id,
					actualRestaurantId,
					tableId,
				);
				// ✅ Filtrer les orphelins avant de calculer le total
				const linkedToSession = updatedOrders.filter(o => o.tableSessionId === tableSession._id);
				const { totalAmount: newTotal, itemsCount: newItemsCount } = computeSessionTotal(linkedToSession);
				updateTableSession(actualRestaurantId, tableSession._id, { 
					totalAmount: newTotal, 
					itemsCount: newItemsCount 
				});
				
				const elapsed = Date.now() - startTime;
			} catch (err) {
				const elapsed = Date.now() - startTime;
				console.error(`[Counter] cancelOrder FAIL after ${elapsed}ms:`, err.message);
				throw err;
			}
		},

		/**
		 * Demander l'addition (passer la table en jaune)
		 */
		requestBill: async () => {
			if (!tableSession) {
				throw new Error("Aucune session active");
			}

			const startTime = Date.now();
			try {
				const updated = await counterService.requestBill(tableSession._id);
				updateTableSession(actualRestaurantId, tableSession._id, {
					billStatus: "bill_requested",
				});
				
				const elapsed = Date.now() - startTime;
				return updated;
			} catch (err) {
				const elapsed = Date.now() - startTime;
				console.error(`[Counter] requestBill FAIL after ${elapsed}ms:`, err.message);
				throw err;
			}
		},

		/**
		 * Encaisser et libérer la table
		 * @param {string} paymentMethod - "cash" | "card_offline"
		 * @param {Array} discounts - Liste des réductions (optionnel)
		 */
		closeTable: async (paymentMethod, discounts = []) => {
			const startTime = Date.now();
			
			// ✅ Validation stricte
			if (!tableSession) {
				throw new Error("Aucune session active");
			}
			if (!["cash", "card_offline"].includes(paymentMethod)) {
				throw new Error('paymentMethod doit être "cash" ou "card_offline"');
			}

			try {
				const closed = await counterService.closeSession(
					tableSession._id,
					paymentMethod,
					discounts,
				);
				
				// ✅ Cleanup : fermer la session dans le store + vider le panier
				closeTableSession(actualRestaurantId, tableSession._id);
				clearCart(tableId);
				
				const elapsed = Date.now() - startTime;
				return closed;
			} catch (err) {
				const elapsed = Date.now() - startTime;
				console.error(`[Counter] closeTable FAIL after ${elapsed}ms:`, err.message);
				throw err;
			}
		},
	};

	// Total des items déjà envoyés en cuisine (somme des orders NON annulées)
	const sentTotal = useMemo(
		() =>
			sessionOrders
				.filter((o) => o.orderStatus !== "cancelled")
				.reduce((sum, o) => sum + (o.totalAmount || 0), 0),
		[sessionOrders],
	);

	return {
		// État session
		session: tableSession,
		isOpening,

		// Orders envoyés en cuisine
		sessionOrders,
		sentTotal,
		refreshSessionOrders,

		// État panier
		cart,
		cartTotal,
		cartItemsCount,

		// Actions
		actions,

		// Helpers
		isTableFree: !tableSession || tableSession.billStatus === "closed",
		isBillRequested:
			tableSession && tableSession.billStatus === "bill_requested",
	};
};

export default useCounterTable;

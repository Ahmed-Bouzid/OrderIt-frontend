/**
 * 🏪 useCounterTable — Hook composite pour gérer une table en mode Comptoir
 *
 * Combine stores + services + sockets en une API simple
 * Retourne { session, cart, actions: { addItem, removeItem, sendToCook, requestBill, close } }
 */

import { useEffect, useCallback, useState, useMemo } from "react";
import useCounterCartStore from "../src/stores/useCounterCartStore";
import useCounterTableStore from "../src/stores/useCounterTableStore";
import counterService from "../services/counterService";
import useSocket from "./useSocket";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuthFetch } from "./useAuthFetch";
import { API_CONFIG } from "../src/config/apiConfig";

/**
 * Hook composite pour gérer une table en mode Comptoir
 *
 * @param {string} tableId — ID de la table
 * @param {string} restaurantId — ID du restaurant (optionnel, cherché dans le store si absent)
 */
export const useCounterTable = (tableId, restaurantId = null) => {
	const [actualRestaurantId, setActualRestaurantId] = useState(restaurantId);
	const [isOpening, setIsOpening] = useState(false);
	const [sessionOrders, setSessionOrders] = useState([]);

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

	// Initialiser restaurantId si absent
	useEffect(() => {
		if (actualRestaurantId) return;

		const initRestaurantId = async () => {
			try {
				const useUserStore = require("../stores/useUserStore").default;
				const fromStore = useUserStore.getState().restaurantId;
				if (fromStore) {
					setActualRestaurantId(fromStore);
					return;
				}

				const fromStorage = await AsyncStorage.getItem("restaurantId");
				if (fromStorage) {
					setActualRestaurantId(fromStorage);
				}
			} catch (err) {
				console.error("[useCounterTable] Erreur init restaurantId:", err);
			}
		};

		initRestaurantId();
	}, [actualRestaurantId]);

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
			setSessionOrders([]);
			return;
		}

		console.log(
			`[useCounterTable] table=${tableId} session=${String(sessionId)} restaurant=${actualRestaurantId}`,
		);

		let cancelled = false;
		const load = async () => {
			const orders = await counterService.getSessionOrders(
				sessionId,
				actualRestaurantId,
				tableId,
			);
			if (!cancelled) setSessionOrders(orders);
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
		setSessionOrders(orders);
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

	// Actions métier
	const actions = {
		/**
		 * Ouvrir la session table (action explicite du serveur)
		 * ✅ Fix race condition : vérifier que le store est mis à jour AVANT de mettre isOpening=false
		 */
		openTable: async () => {
			if (!actualRestaurantId || !tableId) return;
			setIsOpening(true);
			try {
				const session = await counterService.openSession(
					actualRestaurantId,
					tableId,
				);
				openTableSession(actualRestaurantId, tableId, session);
				
				// ✅ Attendre que le store contienne la session (max 500ms)
				// Sinon : composant re-render avec isOpening=false mais tableSession=null → spinner reste affiché
				const maxWait = 500;
				const startWait = Date.now();
				while (Date.now() - startWait < maxWait) {
					const currentStore = useCounterTableStore.getState();
					const sessions = currentStore.sessions[actualRestaurantId] || [];
					const found = sessions.find(s => s.tableId === tableId && s.billStatus !== "closed");
					if (found) {
						console.log(`[useCounterTable] Store mis à jour après ${Date.now() - startWait}ms`);
						break;
					}
					await new Promise(resolve => setTimeout(resolve, 10));
				}
			} catch (err) {
				console.error("[useCounterTable] Erreur ouverture session:", err);
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
				}));

				// Validation avant envoi (garde-fou)
				if (items.some((i) => typeof i.price !== "number" || i.price < 0)) {
					throw new Error("Prix invalide dans le panier — relancer l'app");
				}

				// Recalculer le total depuis les items (comme Activity) pour garantir la cohérence
				const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

				console.log(`[Counter] sendToCook → table=${tableId} session=${tableSession._id} total=${total.toFixed(2)}€ items=${items.length}`);

				// POST /orders via authFetch — retry auto sur 5xx, logs body erreur automatiques
				const order = await authFetch(`${API_CONFIG.baseURL}/orders`, {
					method: "POST",
					body: {
						tableId,
						items,
						total,
						restaurantId: actualRestaurantId,
						tableSessionId: tableSession._id,
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
				setSessionOrders(updatedOrders);

				// Sync totalAmount dans le store → les cartes du plan de salle s'actualisent
				// ⚠️ Exclure les orders cancelled du total
				const activeOrders = updatedOrders.filter((o) => o.orderStatus !== "cancelled");
				const newTotal = activeOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
				const newItemsCount = activeOrders.reduce((sum, o) => sum + (o.items?.length || 0), 0);
				updateTableSession(actualRestaurantId, tableSession._id, { totalAmount: newTotal, itemsCount: newItemsCount });

				return order;
			} catch (err) {
				console.error("[useCounterTable] Erreur envoi cuisine:", err);
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
			if (!orderId) throw new Error("orderId manquant");
			try {
				await authFetch(`/orders/${orderId}/cancel`, { method: "PATCH" });
				await refreshSessionOrders();

				// ⚠️ Recalculer le total (excluant les cancelled) et mettre à jour le store
				// pour que les cartes du plan de salle affichent le bon montant
				const updatedOrders = await counterService.getSessionOrders(
					tableSession._id,
					actualRestaurantId,
					tableId,
				);
				const activeOrders = updatedOrders.filter((o) => o.orderStatus !== "cancelled");
				const newTotal = activeOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
				const newItemsCount = activeOrders.reduce((sum, o) => sum + (o.items?.length || 0), 0);
				updateTableSession(actualRestaurantId, tableSession._id, { totalAmount: newTotal, itemsCount: newItemsCount });
			} catch (err) {
				console.error("[useCounterTable] Erreur annulation commande:", err);
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

			try {
				const updated = await counterService.requestBill(tableSession._id);
				updateTableSession(actualRestaurantId, tableSession._id, {
					billStatus: "bill_requested",
				});
				return updated;
			} catch (err) {
				console.error("[useCounterTable] Erreur demande addition:", err);
				throw err;
			}
		},

		/**
		 * Encaisser et libérer la table
		 * @param {string} paymentMethod - "cash" | "card_offline"
		 * @param {Array} discounts - Liste des réductions (optionnel)
		 */
		closeTable: async (paymentMethod, discounts = []) => {
			if (!tableSession) {
				throw new Error("Aucune session active");
			}

			if (!["cash", "card_offline"].includes(paymentMethod)) {
				throw new Error(
					'paymentMethod doit être "cash" ou "card_offline"',
				);
			}

			try {
				const closed = await counterService.closeSession(
					tableSession._id,
					paymentMethod,
					discounts,
				);
				closeTableSession(actualRestaurantId, tableSession._id);
				clearCart(tableId);
				return closed;
			} catch (err) {
				console.error("[useCounterTable] Erreur fermeture table:", err);
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

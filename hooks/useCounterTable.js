/**
 * 🏪 useCounterTable — Hook composite pour gérer une table en mode Comptoir
 *
 * Combine stores + services + sockets en une API simple
 * Retourne { session, cart, actions: { addItem, removeItem, sendToCook, requestBill, close } }
 */

import { useEffect, useCallback, useState } from "react";
import useCounterCartStore from "../src/stores/useCounterCartStore";
import useCounterTableStore from "../src/stores/useCounterTableStore";
import counterService from "../services/counterService";
import useSocket from "./useSocket";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Hook composite pour gérer une table en mode Comptoir
 *
 * @param {string} tableId — ID de la table
 * @param {string} restaurantId — ID du restaurant (optionnel, cherché dans le store si absent)
 */
export const useCounterTable = (tableId, restaurantId = null) => {
	const [actualRestaurantId, setActualRestaurantId] = useState(restaurantId);
	const [isOpening, setIsOpening] = useState(false);

	// Stores
	const cart = useCounterCartStore((state) => state.getCart(tableId));
	const cartTotal = useCounterCartStore((state) =>
		state.getCartTotal(tableId),
	);
	const cartItemsCount = useCounterCartStore((state) =>
		state.getCartItemsCount(tableId),
	);

	const addCartItem = useCounterCartStore((state) => state.addItem);
	const removeCartItem = useCounterCartStore((state) => state.removeItem);
	const setCartQty = useCounterCartStore((state) => state.setQty);
	const clearCart = useCounterCartStore((state) => state.clearCart);

	const tableSession = useCounterTableStore((state) =>
		state.getTableSession(actualRestaurantId, tableId),
	);
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

	// Ouvrir la session table au mount
	useEffect(() => {
		if (!actualRestaurantId || !tableId) return;

		const openSession = async () => {
			setIsOpening(true);
			try {
				const session = await counterService.openSession(
					actualRestaurantId,
					tableId,
				);
				openTableSession(actualRestaurantId, tableId, session);
			} catch (err) {
				console.error("[useCounterTable] Erreur ouverture session:", err);
			} finally {
				setIsOpening(false);
			}
		};

		openSession();
	}, [actualRestaurantId, tableId, openTableSession]);

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

	// Actions métier
	const actions = {
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
		 */
		sendToCook: async () => {
			if (!tableSession || !cart || cart.length === 0) {
				throw new Error("Panier vide");
			}

			try {
				// Préparer les items pour l'API
				const items = cart.map((item) => ({
					productId: item.productId,
					name: item.name,
					quantity: item.quantity,
					price: item.price,
					category: item.category,
					notes: item.notes,
				}));

				// POST /orders avec source: "counter"
				const order = await counterService.sendToCook(
					tableSession._id,
					items,
					cartTotal,
					actualRestaurantId,
					tableId,
				);

				// Vider le panier après succès
				clearCart(tableId);

				return order;
			} catch (err) {
				console.error("[useCounterTable] Erreur envoi cuisine:", err);
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
		 */
		closeTable: async (paymentMethod) => {
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

	return {
		// État session
		session: tableSession,
		isOpening,

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

/**
 * 🏪 useCounterCartStore — Panier local par table (mode Comptoir)
 *
 * Scope : tableId — chaque table a son propre panier
 * Persistence : NON (panier perdu à refresh, volontaire)
 * Synchronisation : Frontend uniquement, envoi via POST /orders au moment du flush
 */

import { create } from "zustand";

/**
 * Structure CartItem (interne, avant envoi au backend)
 * {
 *   tempId: string (UUID local, pour les commandes non persistées)
 *   productId: ObjectId (optionnel au moment de l'ajout local)
 *   name: string
 *   quantity: number
 *   price: number
 *   category: string
 *   notes: string
 * }
 */

// Store singleton qui gère les paniers par tableId
const useCounterCartStore = create((set, get) => ({
	// Structure : { [tableId]: CartItem[] }
	carts: {},

	/**
	 * Récupérer le panier d'une table (ou array vide)
	 */
	getCart: (tableId) => {
		return get().carts[tableId] || [];
	},

	/**
	 * Ajouter un produit au panier d'une table
	 * @param {string} tableId
	 * @param {object} product { productId, name, price, category, notes }
	 */
	addItem: (tableId, product) => {
		set((state) => {
			const cart = state.carts[tableId] || [];

			// Générer un tempId unique local
			const tempId = `${tableId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

			const newItem = {
				tempId,
				productId: product.productId || null,
				name: product.name,
				quantity: product.quantity || 1,
				price: product.price || 0,
				category: product.category || "autre",
				notes: product.notes || "",
			};

			return {
				carts: {
					...state.carts,
					[tableId]: [...cart, newItem],
				},
			};
		});
	},

	/**
	 * Mettre à jour la quantité d'un item
	 * @param {string} tableId
	 * @param {string} tempId
	 * @param {number} qty
	 */
	setQty: (tableId, tempId, qty) => {
		if (qty < 1) {
			// Si qty < 1, supprimer l'item
			get().removeItem(tableId, tempId);
			return;
		}

		set((state) => {
			const cart = state.carts[tableId] || [];
			return {
				carts: {
					...state.carts,
					[tableId]: cart.map((item) =>
						item.tempId === tempId ? { ...item, quantity: qty } : item,
					),
				},
			};
		});
	},

	/**
	 * Supprimer un item du panier
	 * @param {string} tableId
	 * @param {string} tempId
	 */
	removeItem: (tableId, tempId) => {
		set((state) => {
			const cart = state.carts[tableId] || [];
			return {
				carts: {
					...state.carts,
					[tableId]: cart.filter((item) => item.tempId !== tempId),
				},
			};
		});
	},

	/**
	 * Vider le panier d'une table
	 * @param {string} tableId
	 */
	clearCart: (tableId) => {
		set((state) => {
			const newCarts = { ...state.carts };
			delete newCarts[tableId];
			return { carts: newCarts };
		});
	},

	/**
	 * Récupérer le total du panier (avant taxes)
	 * @param {string} tableId
	 */
	getCartTotal: (tableId) => {
		const cart = get().getCart(tableId);
		return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
	},

	/**
	 * Récupérer le nombre d'items dans le panier
	 * @param {string} tableId
	 */
	getCartItemsCount: (tableId) => {
		const cart = get().getCart(tableId);
		return cart.reduce((sum, item) => sum + item.quantity, 0);
	},
}));

export default useCounterCartStore;

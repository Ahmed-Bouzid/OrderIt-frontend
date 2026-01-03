/**
 * 💬 useClientMessagesStore - Store Zustand pour les messages clients
 *
 * Gère les messages reçus des clients côté serveur/dashboard
 * Inclut le comptage des messages non lus, historique, etc.
 */

import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

const useClientMessagesStore = create((set, get) => ({
	// Messages non lus (par table)
	unreadMessages: {},
	// Tous les messages reçus (dernier 24h)
	allMessages: [],
	// Compteur total non lus
	unreadCount: 0,

	/**
	 * Ajoute un nouveau message reçu
	 */
	addMessage: (message) => {
		set((state) => {
			const tableId = message.tableId?.toString() || "unknown";
			const newMessage = {
				...message,
				receivedAt: new Date().toISOString(),
				read: false,
			};

			// Ajouter aux messages non lus de la table
			const tableMessages = state.unreadMessages[tableId] || [];
			const newUnreadMessages = {
				...state.unreadMessages,
				[tableId]: [...tableMessages, newMessage],
			};

			return {
				unreadMessages: newUnreadMessages,
				allMessages: [newMessage, ...state.allMessages].slice(0, 100), // Garder 100 max
				unreadCount: state.unreadCount + 1,
			};
		});

		// Persister
		get().persistMessages();
	},

	/**
	 * Marque un message comme lu
	 */
	markAsRead: (messageId) => {
		set((state) => {
			let found = false;
			const newUnreadMessages = {};

			for (const [tableId, messages] of Object.entries(state.unreadMessages)) {
				const filtered = messages.filter((m) => {
					if (m.id === messageId) {
						found = true;
						return false;
					}
					return true;
				});
				if (filtered.length > 0) {
					newUnreadMessages[tableId] = filtered;
				}
			}

			return {
				unreadMessages: newUnreadMessages,
				unreadCount: found ? state.unreadCount - 1 : state.unreadCount,
				allMessages: state.allMessages.map((m) =>
					m.id === messageId ? { ...m, read: true } : m
				),
			};
		});

		get().persistMessages();
	},

	/**
	 * Marque tous les messages d'une table comme lus
	 */
	markTableAsRead: (tableId) => {
		set((state) => {
			const tableMessages = state.unreadMessages[tableId] || [];
			const countToRemove = tableMessages.length;

			const { [tableId]: removed, ...rest } = state.unreadMessages;

			return {
				unreadMessages: rest,
				unreadCount: Math.max(0, state.unreadCount - countToRemove),
				allMessages: state.allMessages.map((m) =>
					m.tableId?.toString() === tableId ? { ...m, read: true } : m
				),
			};
		});

		get().persistMessages();
	},

	/**
	 * Récupère les messages non lus d'une table
	 */
	getTableMessages: (tableId) => {
		return get().unreadMessages[tableId] || [];
	},

	/**
	 * Compte les messages non lus d'une table
	 */
	getTableUnreadCount: (tableId) => {
		return (get().unreadMessages[tableId] || []).length;
	},

	/**
	 * Efface tous les messages
	 */
	clearAll: () => {
		set({
			unreadMessages: {},
			allMessages: [],
			unreadCount: 0,
		});
		AsyncStorage.removeItem("clientMessages");
	},

	/**
	 * Persiste les messages dans AsyncStorage
	 */
	persistMessages: async () => {
		try {
			const state = get();
			await AsyncStorage.setItem(
				"clientMessages",
				JSON.stringify({
					unreadMessages: state.unreadMessages,
					allMessages: state.allMessages.slice(0, 50), // Limiter pour le stockage
					unreadCount: state.unreadCount,
				})
			);
		} catch (error) {
			console.error("Erreur persistance messages:", error);
		}
	},

	/**
	 * Restaure les messages depuis AsyncStorage
	 */
	loadMessages: async () => {
		try {
			const stored = await AsyncStorage.getItem("clientMessages");
			if (stored) {
				const data = JSON.parse(stored);
				set({
					unreadMessages: data.unreadMessages || {},
					allMessages: data.allMessages || [],
					unreadCount: data.unreadCount || 0,
				});
			}
		} catch (error) {
			console.error("Erreur chargement messages:", error);
		}
	},
}));

export default useClientMessagesStore;

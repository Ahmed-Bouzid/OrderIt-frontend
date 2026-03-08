/**
 * 🔔 useNotificationStore - Store unifié pour le système de notifications serveur
 *
 * Gère à la fois :
 * - Les toasts (notifications instantanées)
 * - L'inbox (liste des messages non lus)
 * - La synchronisation WebSocket
 */

import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Types de notifications
export const NOTIFICATION_TYPES = {
	MESSAGE: "message",
	PAYMENT: "payment",
	ORDER: "order",
	SYSTEM: "system",
};

// Variantes de toast
export const TOAST_VARIANTS = {
	DEFAULT: "default",
	SUCCESS: "success",
	WARNING: "warning",
	ERROR: "error",
};

// Configuration des catégories
export const CATEGORY_CONFIG = {
	service: { emoji: "🍽️", color: "#667eea", label: "Service" },
	commande: { emoji: "📝", color: "#f59e0b", label: "Commande" },
	paiement: { emoji: "💳", color: "#22c55e", label: "Paiement" },
	autre: { emoji: "💬", color: "#8b5cf6", label: "Autre" },
};

/**
 * Calcule le temps écoulé depuis une date
 */
export const getElapsedTime = (timestamp) => {
	const now = Date.now();
	const then = new Date(timestamp).getTime();
	const diff = Math.floor((now - then) / 1000);

	if (diff < 60) return `${diff}s`;
	if (diff < 3600) {
		const mins = Math.floor(diff / 60);
		const secs = diff % 60;
		return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
	}
	if (diff < 86400) {
		const hours = Math.floor(diff / 3600);
		const mins = Math.floor((diff % 3600) / 60);
		return `${hours}h${mins.toString().padStart(2, "0")}`;
	}
	return "1j+";
};

const useNotificationStore = create((set, get) => ({
	// ═══════════════════════════════════════════════════════════════════════
	// 📊 ÉTAT
	// ═══════════════════════════════════════════════════════════════════════

	// Notifications inbox (messages clients)
	notifications: [],
	unreadCount: 0,

	// File d'attente des toasts
	toastQueue: [],
	currentToast: null,

	// Inbox ouverte
	isInboxOpen: false,

	// Filtre actif (all | unread)
	activeFilter: "all",

	// ═══════════════════════════════════════════════════════════════════════
	// 🔔 TOASTS
	// ═══════════════════════════════════════════════════════════════════════

	/**
	 * Affiche un toast
	 */
	showToast: ({
		title,
		message,
		variant = TOAST_VARIANTS.DEFAULT,
		duration = 5000,
		action = null,
		data = null,
	}) => {
		const toast = {
			id: `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
			title,
			message,
			variant,
			duration,
			action,
			data,
			createdAt: new Date().toISOString(),
		};

		set((state) => {
			// Si pas de toast actuel, afficher directement
			if (!state.currentToast) {
				return { currentToast: toast };
			}
			// Sinon ajouter à la file d'attente
			return { toastQueue: [...state.toastQueue, toast] };
		});

		return toast.id;
	},

	/**
	 * Masque le toast actuel et affiche le suivant
	 */
	hideToast: () => {
		set((state) => {
			const nextToast = state.toastQueue[0] || null;
			return {
				currentToast: nextToast,
				toastQueue: state.toastQueue.slice(1),
			};
		});
	},

	/**
	 * Vide tous les toasts
	 */
	clearToasts: () => {
		set({ currentToast: null, toastQueue: [] });
	},

	// ═══════════════════════════════════════════════════════════════════════
	// 📬 INBOX NOTIFICATIONS
	// ═══════════════════════════════════════════════════════════════════════

	/**
	 * Ajoute une notification (message client)
	 */
	addNotification: (notification) => {
		const newNotification = {
			id: notification.id || `notif-${Date.now()}`,
			type: notification.type || NOTIFICATION_TYPES.MESSAGE,
			tableNumber: notification.tableNumber || "?",
			tableId: notification.tableId,
			guestName: notification.clientName || notification.guestName || "Client",
			message: notification.messageText || notification.message,
			category: notification.category || "service",
			icon: notification.icon || "chatbubble-outline",
			reservationId: notification.reservationId,
			read: false,
			createdAt: notification.timestamp || new Date().toISOString(),
		};

		set((state) => ({
			notifications: [newNotification, ...state.notifications].slice(0, 100),
			unreadCount: state.unreadCount + 1,
		}));

		// Afficher un toast
		const categoryConfig =
			CATEGORY_CONFIG[newNotification.category] || CATEGORY_CONFIG.autre;
		get().showToast({
			title: `${categoryConfig.emoji} Table ${newNotification.tableNumber}`,
			message: `${newNotification.guestName} : ${newNotification.message}`,
			variant: TOAST_VARIANTS.DEFAULT,
			action: { label: "Voir", type: "open-inbox" },
			data: newNotification,
		});

		// Persister
		get().persistNotifications();

		return newNotification;
	},

	/**
	 * Ajoute une notification de paiement
	 */
	addPaymentNotification: ({
		tableNumber,
		guestName,
		amount,
		reservationId,
	}) => {
		const notification = {
			id: `payment-${Date.now()}`,
			type: NOTIFICATION_TYPES.PAYMENT,
			tableNumber,
			guestName: guestName || "Client",
			message: `Paiement de ${amount?.toFixed(2) || "0.00"}€ reçu`,
			category: "paiement",
			icon: "card-outline",
			reservationId,
			read: false,
			createdAt: new Date().toISOString(),
		};

		set((state) => ({
			notifications: [notification, ...state.notifications].slice(0, 100),
			unreadCount: state.unreadCount + 1,
		}));

		// Toast success pour paiement
		get().showToast({
			title: `💳 Paiement reçu – Table ${tableNumber}`,
			message: `${guestName || "Le client"} vient de régler ${amount?.toFixed(2) || "sa note"}€`,
			variant: TOAST_VARIANTS.SUCCESS,
			duration: 6000,
			data: notification,
		});

		get().persistNotifications();

		return notification;
	},

	/**
	 * Marque une notification comme lue
	 */
	markAsRead: (notificationId) => {
		set((state) => {
			const notification = state.notifications.find(
				(n) => n.id === notificationId,
			);
			if (!notification || notification.read) return state;

			return {
				notifications: state.notifications.map((n) =>
					n.id === notificationId ? { ...n, read: true } : n,
				),
				unreadCount: Math.max(0, state.unreadCount - 1),
			};
		});

		get().persistNotifications();
	},

	/**
	 * Marque toutes les notifications comme lues
	 */
	markAllAsRead: () => {
		set((state) => ({
			notifications: state.notifications.map((n) => ({ ...n, read: true })),
			unreadCount: 0,
		}));

		get().persistNotifications();
	},

	/**
	 * Supprime une notification
	 */
	removeNotification: (notificationId) => {
		set((state) => {
			const notification = state.notifications.find(
				(n) => n.id === notificationId,
			);
			return {
				notifications: state.notifications.filter(
					(n) => n.id !== notificationId,
				),
				unreadCount:
					notification && !notification.read
						? Math.max(0, state.unreadCount - 1)
						: state.unreadCount,
			};
		});

		get().persistNotifications();
	},

	/**
	 * Vide toutes les notifications
	 */
	clearNotifications: () => {
		set({ notifications: [], unreadCount: 0 });
		AsyncStorage.removeItem("serverNotifications");
	},

	// ═══════════════════════════════════════════════════════════════════════
	// 📋 INBOX UI
	// ═══════════════════════════════════════════════════════════════════════

	/**
	 * Ouvre l'inbox
	 */
	openInbox: () => {
		set({ isInboxOpen: true });
	},

	/**
	 * Ferme l'inbox
	 */
	closeInbox: () => {
		set({ isInboxOpen: false });
	},

	/**
	 * Toggle inbox
	 */
	toggleInbox: () => {
		set((state) => ({ isInboxOpen: !state.isInboxOpen }));
	},

	/**
	 * Change le filtre actif
	 */
	setFilter: (filter) => {
		set({ activeFilter: filter });
	},

	/**
	 * Récupère les notifications filtrées
	 */
	getFilteredNotifications: () => {
		const { notifications, activeFilter } = get();
		if (activeFilter === "unread") {
			return notifications.filter((n) => !n.read);
		}
		return notifications;
	},

	// ═══════════════════════════════════════════════════════════════════════
	// 💾 PERSISTENCE
	// ═══════════════════════════════════════════════════════════════════════

	/**
	 * Persiste les notifications
	 */
	persistNotifications: async () => {
		try {
			const { notifications, unreadCount } = get();
			await AsyncStorage.setItem(
				"serverNotifications",
				JSON.stringify({
					notifications: notifications.slice(0, 50),
					unreadCount,
					savedAt: new Date().toISOString(),
				}),
			);
		} catch (error) {
			console.error("Erreur persistance notifications:", error);
		}
	},

	/**
	 * Charge les notifications depuis le stockage
	 */
	loadNotifications: async () => {
		try {
			const stored = await AsyncStorage.getItem("serverNotifications");
			if (stored) {
				const data = JSON.parse(stored);
				// Ne pas charger les notifications de plus de 24h
				const cutoff = Date.now() - 24 * 60 * 60 * 1000;
				const validNotifications = (data.notifications || []).filter(
					(n) => new Date(n.createdAt).getTime() > cutoff,
				);
				const validUnread = validNotifications.filter((n) => !n.read).length;

				set({
					notifications: validNotifications,
					unreadCount: validUnread,
				});
			}
		} catch (error) {
			console.error("Erreur chargement notifications:", error);
		}
	},

	// ═══════════════════════════════════════════════════════════════════════
	// 🔌 WEBSOCKET HANDLERS
	// ═══════════════════════════════════════════════════════════════════════

	/**
	 * Attache les listeners WebSocket
	 */
	attachSocketListeners: (socket) => {
		if (!socket) return;

		// Message client
		socket.on("client-message", (event) => {

			if (event.type === "new-message" && event.data) {
				get().addNotification({
					id: event.data.messageId,
					type: NOTIFICATION_TYPES.MESSAGE,
					tableNumber: event.data.tableNumber,
					tableId: event.data.tableId,
					clientName: event.data.clientName,
					messageText: event.data.messageText,
					category: event.data.category,
					icon: event.data.icon,
					reservationId: event.data.reservationId,
					timestamp: event.timestamp,
				});
			}
		});

		// Paiement reçu
		socket.on("payment-completed", (event) => {

			if (event.data) {
				get().addPaymentNotification({
					tableNumber: event.data.tableNumber,
					guestName: event.data.clientName,
					amount: event.data.amount,
					reservationId: event.data.reservationId,
				});
			}
		});

		// Réponse serveur envoyée (peut masquer la notification)
		socket.on("server-response", (event) => {
			if (event.data?.clientMessageId) {
				get().markAsRead(event.data.clientMessageId);
			}
		});

	},

	/**
	 * Détache les listeners WebSocket
	 */
	detachSocketListeners: (socket) => {
		if (!socket) return;
		socket.off("client-message");
		socket.off("payment-completed");
		socket.off("server-response");
	},
}));

export default useNotificationStore;

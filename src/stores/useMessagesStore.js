/**
 * 📨 useMessagesStore - Gestion d'état des messages internes
 */
import { create } from "zustand";

export const useMessagesStore = create((set, get) => ({
	// État
	messages: [],
	unreadCount: 0,
	isLoading: false,
	error: null,
	featureAvailable: true, // Devient false si 404 détecté
	lastErrorTime: null, // Timestamp de la dernière erreur (cooldown)

	// Setters
	setMessages: (messages) => set({ messages }),
	setUnreadCount: (count) => set({ unreadCount: count }),
	setIsLoading: (loading) => set({ isLoading: loading }),
	setError: (error) => set({ error }),
	setFeatureAvailable: (available) => {
		set({
			featureAvailable: available,
			lastErrorTime: !available ? Date.now() : null,
		});
	},

	// Ajouter un message
	addMessage: (message) =>
		set((state) => ({
			messages: [message, ...state.messages],
			unreadCount: state.unreadCount + (message.isRead ? 0 : 1),
		})),

	// Supprimer un message
	removeMessage: (messageId) =>
		set((state) => ({
			messages: state.messages.filter((m) => m._id !== messageId),
		})),

	// Mettre à jour un message
	updateMessage: (messageId, updates) =>
		set((state) => ({
			messages: state.messages.map((m) =>
				m._id === messageId ? { ...m, ...updates } : m,
			),
		})),

	// Marquer comme lu
	markAsRead: (messageId) =>
		set((state) => {
			const message = state.messages.find((m) => m._id === messageId);
			return {
				messages: state.messages.map((m) =>
					m._id === messageId ? { ...m, isRead: true, readAt: new Date() } : m,
				),
				unreadCount:
					message && !message.isRead
						? state.unreadCount - 1
						: state.unreadCount,
			};
		}),

	// Répondre à un message
	respondToMessage: (messageId, response) =>
		set((state) => ({
			messages: state.messages.map((m) =>
				m._id === messageId
					? {
							...m,
							response,
							status: response.status,
						}
					: m,
			),
		})),

	// Réinitialiser le store
	reset: () =>
		set({
			messages: [],
			unreadCount: 0,
			isLoading: false,
			error: null,
			featureAvailable: true,
			lastErrorTime: null,
		}),
}));

/**
 * 🏪 useCounterTableStore — Sessions tables actives (mode Comptoir)
 *
 * Gère l'état des sessions tables pour un restaurant
 * Persistence : AsyncStorage optionnelle (session cache)
 * Synchronisation : WebSocket pour updates temps réel
 */

import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Structure TableSession (depuis backend, complétée frontend)
 * {
 *   _id: string (ObjectId)
 *   restaurantId: string
 *   tableId: string
 *   openedAt: ISO Date
 *   closedAt: ISO Date | null
 *   source: "counter"
 *   billStatus: "open" | "bill_requested" | "closed"
 *   totalAmount: number
 *   paymentMethod: "cash" | "card_offline" | null
 *   ordersCount?: number (frontend)
 *   itemsCount?: number (frontend)
 * }
 */

const useCounterTableStore = create((set, get) => ({
	// Structure : { [restaurantId]: TableSession[] }
	sessions: {},

	// Indicateur chargement par restaurant
	isLoading: {},

	// Socket listener attaché
	socketListener: null,

	/**
	 * Charger les sessions actives pour un restaurant
	 * Appel backend POST /counter/sessions pour initialiser
	 */
	fetchSessions: async (restaurantId) => {
		if (!restaurantId) return;

		set((state) => ({
			isLoading: { ...state.isLoading, [restaurantId]: true },
		}));

		try {
			// On ne charge pas toutes les sessions via GET, on les reçoit via socket
			// Ici on init juste le cache vide, le socket va remplir
			set((state) => ({
				sessions: {
					...state.sessions,
					[restaurantId]: state.sessions[restaurantId] || [],
				},
				isLoading: { ...state.isLoading, [restaurantId]: false },
			}));
		} catch (err) {
			console.error(
				`[Counter] Erreur chargement sessions ${restaurantId}:`,
				err,
			);
			set((state) => ({
				isLoading: { ...state.isLoading, [restaurantId]: false },
			}));
		}
	},

	/**
	 * Ouvrir une session pour une table
	 * @param {string} restaurantId
	 * @param {string} tableId
	 * @param {object} session — réponse du backend
	 */
	openSession: (restaurantId, tableId, session) => {
		set((state) => {
			const sessions = state.sessions[restaurantId] || [];

			// Vérifier si elle existe déjà (par tableId)
			// ✅ Gérer tableId string OU objet populate
			const normalizeId = (id) => typeof id === 'object' ? id._id : id;
			const targetId = normalizeId(tableId);
			const exists = sessions.find((s) => normalizeId(s.tableId) === targetId);
			if (exists) {
				// Remplacer (mise à jour)
				return {
					sessions: {
						...state.sessions,
						[restaurantId]: sessions.map((s) =>
							normalizeId(s.tableId) === targetId ? session : s,
						),
					},
				};
			}

			// Ajouter nouvelle
			return {
				sessions: {
					...state.sessions,
					[restaurantId]: [...sessions, session],
				},
			};
		});
	},

	/**
	 * Mettre à jour une session (addition demandée, etc.)
	 * @param {string} restaurantId
	 * @param {string} sessionId
	 * @param {object} updates
	 */
	updateSession: (restaurantId, sessionId, updates) => {
		set((state) => {
			const sessions = state.sessions[restaurantId] || [];
			return {
				sessions: {
					...state.sessions,
					[restaurantId]: sessions.map((s) =>
						s._id === sessionId ? { ...s, ...updates } : s,
					),
				},
			};
		});
	},

	/**
	 * Fermer une session (encaisser)
	 * @param {string} restaurantId
	 * @param {string} sessionId
	 */
	closeSession: (restaurantId, sessionId) => {
		set((state) => {
			const sessions = state.sessions[restaurantId] || [];
			return {
				sessions: {
					...state.sessions,
					[restaurantId]: sessions.filter((s) => s._id !== sessionId),
				},
			};
		});
	},

	/**
	 * Récupérer la session active d'une table
	 * @param {string} restaurantId
	 * @param {string} tableId
	 */
	getTableSession: (restaurantId, tableId) => {
		const sessions = get().sessions[restaurantId] || [];
		return sessions.find(
			(s) => s.tableId === tableId && s.billStatus !== "closed",
		) || null;
	},

	/**
	 * Récupérer toutes les sessions actives
	 * @param {string} restaurantId
	 */
	getActiveSessions: (restaurantId) => {
		return get().sessions[restaurantId] || [];
	},

	/**
	 * Compter les tables par statut
	 * @param {string} restaurantId
	 */
	getStats: (restaurantId) => {
		const sessions = get().getActiveSessions(restaurantId);
		return {
			total: sessions.length,
			open: sessions.filter((s) => s.billStatus === "open").length,
			billRequested: sessions.filter(
				(s) => s.billStatus === "bill_requested",
			).length,
			totalAmount: sessions.reduce((sum, s) => sum + (s.totalAmount || 0), 0),
		};
	},

	/**
	 * Attacher le listener WebSocket
	 * @param {object} socket
	 */
	attachSocketListener: (socket) => {
		if (!socket) return;

		const listener = (event) => {
			const { type, data } = event;
			const state = get();

			switch (type) {
				case "opened":
					state.openSession(data.restaurantId, data.tableId, data);
					break;

				case "bill_requested":
					state.updateSession(data.restaurantId, data._id, {
						billStatus: "bill_requested",
					});
					break;

				case "closed":
					state.closeSession(data.restaurantId, data._id);
					break;

				default:
					break;
			}
		};

		socket.on("table-session", listener);

		set({ socketListener: listener });

		return () => {
			socket.off("table-session", listener);
		};
	},

	/**
	 * Détacher le listener WebSocket
	 * @param {object} socket
	 */
	detachSocketListener: (socket) => {
		const listener = get().socketListener;
		if (socket && listener) {
			socket.off("table-session", listener);
			set({ socketListener: null });
		}
	},
}));

export default useCounterTableStore;

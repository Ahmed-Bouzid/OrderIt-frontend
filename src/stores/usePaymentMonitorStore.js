// stores/usePaymentMonitorStore.js
import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Store Zustand pour le PaymentsCommandCenter
 * Gère l'état de la fenêtre, les données de paiements, et les alertes
 *
 * MODE RÉEL : connecte au WebSocket (payment-monitor) + GET /payments/today
 * MODE MOCK : fallback si pas de socket disponible
 */

// ── Générateurs mock (fallback) ───────────────────────────────────
const MOCK_CLIENTS = [
	"Table 3", "Table 7", "Table 12", "Comptoir", "Table 1",
	"Table 5", "Emporté", "Table 9", "Livraison", "Table 2",
];
const MOCK_MODES = ["card", "cash", "apple_pay", "google_pay"];
const MOCK_STATUSES = ["success", "success", "success", "success", "pending", "failed"];

let _mockIdCounter = 1000;

function randomBetween(min, max) {
	return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

function generateMockPayment() {
	const status = MOCK_STATUSES[Math.floor(Math.random() * MOCK_STATUSES.length)];
	const mode = MOCK_MODES[Math.floor(Math.random() * MOCK_MODES.length)];
	const client = MOCK_CLIENTS[Math.floor(Math.random() * MOCK_CLIENTS.length)];
	const amount = randomBetween(4.5, 89.0);
	const now = new Date();
	_mockIdCounter += 1;

	return {
		id: `pay_${_mockIdCounter}`,
		orderId: `#${1000 + Math.floor(Math.random() * 9000)}`,
		amount, client, status, mode,
		timestamp: now.toISOString(),
		timeLabel: now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
	};
}

function generateInitialPayments(count = 12) {
	const payments = [];
	for (let i = 0; i < count; i++) payments.push(generateMockPayment());
	return payments.reverse();
}

// ── KPI Calculator ────────────────────────────────────────────────
function computeKPIs(payments) {
	let totalToday = 0;
	let onlineCount = 0, onlineTotal = 0;
	let counterCount = 0, counterTotal = 0;
	let pendingCount = 0, pendingTotal = 0;
	let failedCount = 0, failedTotal = 0;

	for (const p of payments) {
		if (p.status === "success") {
			totalToday += p.amount;
			if (p.mode === "cash") { counterCount++; counterTotal += p.amount; }
			else { onlineCount++; onlineTotal += p.amount; }
		} else if (p.status === "pending") { pendingCount++; pendingTotal += p.amount; }
		else if (p.status === "failed") { failedCount++; failedTotal += p.amount; }
	}

	return {
		totalToday: Math.round(totalToday * 100) / 100,
		online: { count: onlineCount, total: Math.round(onlineTotal * 100) / 100 },
		counter: { count: counterCount, total: Math.round(counterTotal * 100) / 100 },
		pending: { count: pendingCount, total: Math.round(pendingTotal * 100) / 100 },
		failed: { count: failedCount, total: Math.round(failedTotal * 100) / 100 },
	};
}

function formatLocalTimeLabel(timestamp) {
	const date = new Date(timestamp || Date.now());
	if (Number.isNaN(date.getTime())) {
		return "--:--";
	}

	return date.toLocaleTimeString("fr-FR", {
		hour: "2-digit",
		minute: "2-digit",
	});
}

function normalizePaymentForUI(payment) {
	const timestamp = payment?.timestamp || payment?.createdAt || new Date().toISOString();

	return {
		...payment,
		timestamp,
		// Toujours calculer l'heure côté frontend (timezone locale),
		// pour éviter les décalages liés au timezone du serveur.
		timeLabel: formatLocalTimeLabel(timestamp),
	};
}

// ── Store ─────────────────────────────────────────────────────────
const usePaymentMonitorStore = create((set, get) => ({
	// ── Fenêtre ──
	isOpen: false,
	isMinimized: false,
	isCompact: false,
	soundEnabled: false,

	// ── Données ──
	payments: [],
	kpis: computeKPIs([]),
	alerts: [],
	lastUpdate: new Date().toISOString(),
	isLoading: false,
	dataSource: "none", // "live", "mock", "none"
	debugInfo: {
		resolvedRestaurantId: null,
		query: null,
		count: null,
		lastFetchAt: null,
		lastError: null,
	},

	// ── Internals ──
	_pollingId: null,
	_socketListener: null,

	// ── Actions fenêtre ──
	open: () => set({ isOpen: true, isMinimized: false }),
	close: () => {
		const { _pollingId } = get();
		if (_pollingId) clearInterval(_pollingId);
		set({ isOpen: false, isMinimized: false, _pollingId: null });
	},
	minimize: () => set({ isMinimized: true }),
	restore: () => set({ isMinimized: false }),
	toggleCompact: () => set((s) => ({ isCompact: !s.isCompact })),
	toggleSound: () => set((s) => ({ soundEnabled: !s.soundEnabled })),

	// ── Données ──
	addPayment: (payment) => {
		set((s) => {
			const normalizedPayment = normalizePaymentForUI(payment);
			const newPayments = [normalizedPayment, ...s.payments].slice(0, 50);
			const newAlerts = [...s.alerts];

			if (normalizedPayment.status === "failed") {
				newAlerts.unshift({
					id: `alert_${Date.now()}`,
					type: "failed",
					message: `Paiement refusé — ${normalizedPayment.client} (${normalizedPayment.orderId})`,
					timestamp: normalizedPayment.timestamp,
					read: false,
				});
			}

			return {
				payments: newPayments,
				kpis: computeKPIs(newPayments),
				alerts: newAlerts.slice(0, 20),
				lastUpdate: new Date().toISOString(),
			};
		});
	},

	markAlertRead: (alertId) => {
		set((s) => ({
			alerts: s.alerts.map((a) => (a.id === alertId ? { ...a, read: true } : a)),
		}));
	},

	dismissAlert: (alertId) => {
		set((s) => ({
			alerts: s.alerts.filter((a) => a.id !== alertId),
		}));
	},

	// ══════════════════════════════════════════════════════════════
	// MODE RÉEL : WebSocket + API
	// ══════════════════════════════════════════════════════════════

	/**
	 * Charge les paiements du jour depuis l'API
	 * @param {Function} authFetch - hook useAuthFetch()
	 */
	fetchTodayPayments: async (authFetch, restaurantId = null) => {
		if (!authFetch) return;
		set({ isLoading: true });

		try {
			let resolvedRestaurantId = restaurantId;
			if (!resolvedRestaurantId) {
				resolvedRestaurantId = await AsyncStorage.getItem("restaurantId");
			}

			if (!resolvedRestaurantId) {
				const selectedRestaurantRaw = await AsyncStorage.getItem("selectedRestaurant");
				if (selectedRestaurantRaw) {
					try {
						const selectedRestaurant = JSON.parse(selectedRestaurantRaw);
						resolvedRestaurantId = selectedRestaurant?._id || null;
					} catch (e) {
						console.warn("⚠️ [PaymentsMonitor] selectedRestaurant JSON invalide");
					}
				}
			}

			const query = resolvedRestaurantId
				? `/payments/today?restaurantId=${encodeURIComponent(resolvedRestaurantId)}`
				: "/payments/today";
			const nowIso = new Date().toISOString();

			console.log("[PaymentsMonitor] fetchTodayPayments", {
				resolvedRestaurantId,
				query,
			});

			const data = await authFetch(query);

			if (data?.success && Array.isArray(data.payments)) {
				const payments = data.payments.map(normalizePaymentForUI);
				console.log("[PaymentsMonitor] payments loaded", {
					count: payments.length,
					restaurantId: resolvedRestaurantId,
				});
				set({
					payments,
					kpis: computeKPIs(payments),
					lastUpdate: new Date().toISOString(),
					isLoading: false,
					dataSource: "live",
					debugInfo: {
						resolvedRestaurantId,
						query,
						count: payments.length,
						lastFetchAt: nowIso,
						lastError: null,
					},
				});
				return true;
			}

			console.warn("⚠️ [PaymentsMonitor] Réponse inattendue", {
				restaurantId: resolvedRestaurantId,
				hasSuccess: !!data?.success,
				hasPaymentsArray: Array.isArray(data?.payments),
			});
			set({
				isLoading: false,
				debugInfo: {
					resolvedRestaurantId,
					query,
					count: null,
					lastFetchAt: nowIso,
					lastError: "Réponse inattendue",
				},
			});
			return false;
		} catch (err) {
			console.warn("⚠️ Erreur chargement paiements:", err);
			set({
				isLoading: false,
				debugInfo: {
					resolvedRestaurantId: restaurantId,
					query: null,
					count: null,
					lastFetchAt: new Date().toISOString(),
					lastError: err?.message || "Erreur inconnue",
				},
			});
			return false;
		}
	},

	/**
	 * Connecte le store au WebSocket pour recevoir les paiements temps réel
	 * @param {Object} socketHook - le hook useSocket() exposé par SocketContext
	 */
	connectWebSocket: (socketHook) => {
		if (!socketHook) return;

		// Éviter les doublons
		const existing = get()._socketListener;
		if (existing) return;

		const handler = (payload) => {
			if (payload?.data) {
				get().addPayment(payload.data);
			}
		};

		socketHook.on("payment-monitor", handler);
		set({ _socketListener: handler, dataSource: "live" });
	},

	/**
	 * Déconnecte le listener WebSocket
	 */
	disconnectWebSocket: (socketHook) => {
		const handler = get()._socketListener;
		if (handler && socketHook) {
			socketHook.off("payment-monitor", handler);
		}
		set({ _socketListener: null });
	},

	// ══════════════════════════════════════════════════════════════
	// MODE MOCK : Fallback si pas de données réelles
	// ══════════════════════════════════════════════════════════════

	startMockPolling: () => {
		const existing = get()._pollingId;
		if (existing) return;

		// Pré-remplir si vide
		if (get().payments.length === 0) {
			const initial = generateInitialPayments(12);
			set({
				payments: initial,
				kpis: computeKPIs(initial),
				alerts: [
					{
						id: "alert_mock_1",
						type: "failed",
						message: "Paiement refusé — Table 7 (#3021)",
						timestamp: new Date(Date.now() - 120000).toISOString(),
						read: false,
					},
					{
						id: "alert_mock_2",
						type: "no_payment",
						message: "Commande #3019 sans paiement confirmé",
						timestamp: new Date(Date.now() - 300000).toISOString(),
						read: false,
					},
				],
				dataSource: "mock",
			});
		}

		const id = setInterval(() => {
			get().addPayment(generateMockPayment());
		}, 6000 + Math.random() * 8000);

		set({ _pollingId: id, dataSource: "mock" });
	},

	stopMockPolling: () => {
		const { _pollingId } = get();
		if (_pollingId) {
			clearInterval(_pollingId);
			set({ _pollingId: null });
		}
	},
}));

export default usePaymentMonitorStore;

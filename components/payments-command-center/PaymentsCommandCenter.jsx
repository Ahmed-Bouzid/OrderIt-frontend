// components/payments-command-center/PaymentsCommandCenter.jsx
//
// Fenêtre flottante premium de monitoring paiements
// ─ Responsive : bottom-sheet mobile, panneau latéral tablette, fenêtre desktop
// ─ Draggable, minimisable, fermable
// ─ Thème isolé (centre de contrôle sombre)
// ─ Overlay + glassmorphism

import React, { memo, useEffect, useRef, useCallback, useMemo } from "react";
import {
	View,
	Text,
	TouchableOpacity,
	StyleSheet,
	Dimensions,
	Platform,
	Animated,
	PanResponder,
	Modal,
	ScrollView,
	useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import usePaymentMonitorStore from "../../src/stores/usePaymentMonitorStore";
import useUserStore from "../../src/stores/useUserStore";
import { useSocketContext } from "../../src/stores/SocketContext";
import { useAuthFetch } from "../../hooks/useAuthFetch";
import KPICards from "./KPICards";
import LiveFeed from "./LiveFeed";
import AlertsPanel from "./AlertsPanel";
import T from "./theme";

// ── Breakpoints ───────────────────────────────────────────────────
const BP = { mobile: 0, tablet: 768, desktop: 1024 };

function useBreakpoint() {
	const { width } = useWindowDimensions();
	if (width >= BP.desktop) return "desktop";
	if (width >= BP.tablet) return "tablet";
	return "mobile";
}

// ── Header de la fenêtre ──────────────────────────────────────────
const WindowHeader = memo(
	({ isCompact, onToggleCompact, onMinimize, onClose, onToggleSound, soundEnabled, lastUpdate }) => {
		const updateTime = useMemo(() => {
			if (!lastUpdate) return "";
			return new Date(lastUpdate).toLocaleTimeString("fr-FR", {
				hour: "2-digit",
				minute: "2-digit",
				second: "2-digit",
			});
		}, [lastUpdate]);

		return (
			<View style={s.header}>
				{/* Drag handle + titre */}
				<View style={s.headerLeft}>
					<View style={s.dragHandle} />
					<View style={s.titleGroup}>
						<Text style={s.windowTitle}>Payments</Text>
						<Text style={s.windowSubtitle}>Command Center</Text>
					</View>
				</View>

				{/* Statut */}
				<View style={s.headerCenter}>
					<View style={s.statusDot} />
					<Text style={s.statusText}>Live · {updateTime}</Text>
				</View>

				{/* Actions */}
				<View style={s.headerRight}>
					<TouchableOpacity
						onPress={onToggleSound}
						style={s.headerBtn}
						hitSlop={8}
					>
						<Ionicons
							name={soundEnabled ? "volume-high" : "volume-mute"}
							size={16}
							color={T.text.muted}
						/>
					</TouchableOpacity>
					<TouchableOpacity
						onPress={onToggleCompact}
						style={s.headerBtn}
						hitSlop={8}
					>
						<Ionicons
							name={isCompact ? "expand" : "contract"}
							size={16}
							color={T.text.muted}
						/>
					</TouchableOpacity>
					<TouchableOpacity
						onPress={onMinimize}
						style={s.headerBtn}
						hitSlop={8}
					>
						<Ionicons name="remove" size={16} color={T.text.muted} />
					</TouchableOpacity>
					<TouchableOpacity
						onPress={onClose}
						style={[s.headerBtn, s.closeBtn]}
						hitSlop={8}
					>
						<Ionicons name="close" size={16} color={T.accent.red} />
					</TouchableOpacity>
				</View>
			</View>
		);
	},
);

WindowHeader.displayName = "WindowHeader";

// ── Minimized bar ─────────────────────────────────────────────────
const MinimizedBar = memo(({ kpis, onRestore, onClose }) => {
	return (
		<TouchableOpacity onPress={onRestore} activeOpacity={0.85}>
			<View style={s.minimizedBar}>
				<View style={s.minimizedLeft}>
					<View style={s.miniDot} />
					<Text style={s.miniTitle}>PCC</Text>
				</View>
				<Text style={s.miniTotal}>
					{kpis?.totalToday?.toLocaleString("fr-FR", { minimumFractionDigits: 2 })}€
				</Text>
				<TouchableOpacity onPress={onClose} hitSlop={8}>
					<Ionicons name="close" size={14} color={T.text.muted} />
				</TouchableOpacity>
			</View>
		</TouchableOpacity>
	);
});

MinimizedBar.displayName = "MinimizedBar";

// ── MAIN : PaymentsCommandCenter ──────────────────────────────────
const PaymentsCommandCenter = memo(() => {
	const isOpen = usePaymentMonitorStore((s) => s.isOpen);
	const isMinimized = usePaymentMonitorStore((s) => s.isMinimized);
	const isCompact = usePaymentMonitorStore((s) => s.isCompact);
	const soundEnabled = usePaymentMonitorStore((s) => s.soundEnabled);
	const payments = usePaymentMonitorStore((s) => s.payments);
	const kpis = usePaymentMonitorStore((s) => s.kpis);
	const alerts = usePaymentMonitorStore((s) => s.alerts);
	const lastUpdate = usePaymentMonitorStore((s) => s.lastUpdate);

	const close = usePaymentMonitorStore((s) => s.close);
	const minimize = usePaymentMonitorStore((s) => s.minimize);
	const restore = usePaymentMonitorStore((s) => s.restore);
	const toggleCompact = usePaymentMonitorStore((s) => s.toggleCompact);
	const toggleSound = usePaymentMonitorStore((s) => s.toggleSound);
	const markAlertRead = usePaymentMonitorStore((s) => s.markAlertRead);
	const dismissAlert = usePaymentMonitorStore((s) => s.dismissAlert);
	const startMockPolling = usePaymentMonitorStore((s) => s.startMockPolling);
	const stopMockPolling = usePaymentMonitorStore((s) => s.stopMockPolling);
	const fetchTodayPayments = usePaymentMonitorStore((s) => s.fetchTodayPayments);
	const connectWebSocket = usePaymentMonitorStore((s) => s.connectWebSocket);
	const disconnectWebSocket = usePaymentMonitorStore((s) => s.disconnectWebSocket);
	const dataSource = usePaymentMonitorStore((s) => s.dataSource);
	const debugInfo = usePaymentMonitorStore((s) => s.debugInfo);
	const currentRestaurantId = useUserStore((s) => s.restaurantId);

	const { socket: socketHook, connected: socketConnected } = useSocketContext();
	const authFetch = useAuthFetch();
	const breakpoint = useBreakpoint();

	// ── Connexion données : API d'abord, WebSocket si disponible, fallback mock si API KO ──
	useEffect(() => {
		if (!isOpen || isMinimized) return;

		let usedMock = false;

		const initData = async () => {
			// 1. Tenter de charger les paiements réels
			const loaded = await fetchTodayPayments(authFetch, currentRestaurantId);

			// 2. Écouter les mises à jour temps réel si socket connecté
			if (loaded && socketConnected && socketHook) {
				connectWebSocket(socketHook);
			} else if (!loaded) {
				// 3. Fallback mock si pas de données réelles
				startMockPolling();
				usedMock = true;
			}
		};

		initData();

		return () => {
			if (usedMock) stopMockPolling();
			if (socketHook) disconnectWebSocket(socketHook);
		};
	}, [
		authFetch,
		connectWebSocket,
		currentRestaurantId,
		disconnectWebSocket,
		fetchTodayPayments,
		isMinimized,
		isOpen,
		socketConnected,
		socketHook,
		startMockPolling,
		stopMockPolling,
	]);

	// ── Refresh périodique API pour rester à jour même sans WebSocket ──
	useEffect(() => {
		if (!isOpen || isMinimized) return;

		const intervalId = setInterval(() => {
			fetchTodayPayments(authFetch, currentRestaurantId);
		}, 12000);

		return () => clearInterval(intervalId);
	}, [authFetch, currentRestaurantId, fetchTodayPayments, isMinimized, isOpen]);

	// ── Drag (desktop/tablette) ──
	const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
	const panResponder = useRef(
		PanResponder.create({
			onStartShouldSetPanResponder: () => breakpoint !== "mobile",
			onMoveShouldSetPanResponder: (_, g) =>
				breakpoint !== "mobile" && (Math.abs(g.dx) > 3 || Math.abs(g.dy) > 3),
			onPanResponderGrant: () => {
				pan.setOffset({ x: pan.x._value, y: pan.y._value });
				pan.setValue({ x: 0, y: 0 });
			},
			onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
				useNativeDriver: false,
			}),
			onPanResponderRelease: () => {
				pan.flattenOffset();
			},
		}),
	).current;

	// ── Animations ouverture/fermeture ──
	const slideAnim = useRef(new Animated.Value(0)).current;
	const fadeAnim = useRef(new Animated.Value(0)).current;

	useEffect(() => {
		if (isOpen && !isMinimized) {
			Animated.parallel([
				Animated.spring(slideAnim, {
					toValue: 1,
					tension: 65,
					friction: 10,
					useNativeDriver: true,
				}),
				Animated.timing(fadeAnim, {
					toValue: 1,
					duration: 250,
					useNativeDriver: true,
				}),
			]).start();
		} else {
			Animated.parallel([
				Animated.timing(slideAnim, {
					toValue: 0,
					duration: 200,
					useNativeDriver: true,
				}),
				Animated.timing(fadeAnim, {
					toValue: 0,
					duration: 200,
					useNativeDriver: true,
				}),
			]).start();
		}
	}, [isOpen, isMinimized, slideAnim, fadeAnim]);

	// ── Callbacks ──
	const handleClose = useCallback(() => close(), [close]);
	const handleMinimize = useCallback(() => minimize(), [minimize]);
	const handleRestore = useCallback(() => restore(), [restore]);

	if (!isOpen) return null;

	// ── Minimized ──
	if (isMinimized) {
		return <MinimizedBar kpis={kpis} onRestore={handleRestore} onClose={handleClose} />;
	}

	// ── Style responsive ──
	const windowStyle = getWindowStyle(breakpoint);
	const translateY = slideAnim.interpolate({
		inputRange: [0, 1],
		outputRange: [breakpoint === "mobile" ? 600 : 30, 0],
	});

	// ── Contenu fenêtre ──
	const windowContent = (
		<Animated.View
			style={[
				s.window,
				windowStyle,
				T.shadow.window,
				{
					opacity: fadeAnim,
					transform: [
						{ translateY },
						...(breakpoint !== "mobile" ? [{ translateX: pan.x }, { translateY: pan.y }] : []),
					],
				},
			]}
			{...(breakpoint !== "mobile" ? panResponder.panHandlers : {})}
		>
			<WindowHeader
				isCompact={isCompact}
				onToggleCompact={toggleCompact}
				onMinimize={handleMinimize}
				onClose={handleClose}
				onToggleSound={toggleSound}
				soundEnabled={soundEnabled}
				lastUpdate={lastUpdate}
			/>

			{/* Séparateur lumineux */}
			<View style={s.headerSeparator} />

			<ScrollView
				style={s.body}
				contentContainerStyle={s.bodyContent}
				showsVerticalScrollIndicator={false}
				bounces={false}
			>
				{/* KPI */}
				<KPICards kpis={kpis} isCompact={isCompact} />

				{/* Alertes */}
				<AlertsPanel
					alerts={alerts}
					onDismiss={dismissAlert}
					onMarkRead={markAlertRead}
					isCompact={isCompact}
				/>

				{/* Séparateur */}
				<View style={s.divider} />
			</ScrollView>

			{/* Live Feed (non scrollable, prend l'espace restant) */}
			<LiveFeed payments={payments} isCompact={isCompact} />

			{/* Footer */}
			<View style={s.footer}>
				<Text style={s.footerText}>
					PaymentsCommandCenter — {dataSource === "live" ? "Stripe Live" : dataSource === "mock" ? "Mock Data" : "…"}
				</Text>
				<Text style={s.footerText}>
					{payments.length} transactions · {alerts.filter((a) => !a.read).length} alertes
				</Text>
				<Text style={s.debugText}>
					RID: {debugInfo?.resolvedRestaurantId || "null"} | count: {debugInfo?.count ?? "null"}
				</Text>
				<Text style={s.debugText} numberOfLines={1}>
					Q: {debugInfo?.query || "(none)"}
				</Text>
				<Text style={s.debugText} numberOfLines={1}>
					ERR: {debugInfo?.lastError || "none"}
				</Text>
			</View>
		</Animated.View>
	);

	// ── Mobile : Modal overlay / Desktop-Tablet : absolute positioned ──
	if (breakpoint === "mobile") {
		return (
			<Modal
				visible={isOpen && !isMinimized}
				transparent
				animationType="none"
				statusBarTranslucent
				onRequestClose={handleClose}
			>
				<View style={s.overlay}>
					<TouchableOpacity
						style={s.overlayDismiss}
						activeOpacity={1}
						onPress={handleClose}
					/>
					{windowContent}
				</View>
			</Modal>
		);
	}

	return (
		<View style={s.absoluteWrap} pointerEvents="box-none">
			<TouchableOpacity
				style={s.overlayDismissDesktop}
				activeOpacity={1}
				onPress={handleClose}
			/>
			<Animated.View
				style={[s.overlayDesktop, { opacity: fadeAnim }]}
				pointerEvents="none"
			/>
			{windowContent}
		</View>
	);
});

PaymentsCommandCenter.displayName = "PaymentsCommandCenter";

// ── Style adaptatif fenêtre ───────────────────────────────────────
function getWindowStyle(breakpoint) {
	const { width, height } = Dimensions.get("window");

	switch (breakpoint) {
		case "desktop":
			return {
				position: "absolute",
				right: 20,
				top: 20,
				width: Math.min(520, width * 0.35),
				height: height - 40,
				borderRadius: T.radius.xl,
			};
		case "tablet":
			return {
				position: "absolute",
				right: 12,
				top: 12,
				width: Math.min(440, width * 0.45),
				height: height - 24,
				borderRadius: T.radius.xl,
			};
		default: // mobile
			return {
				width: "100%",
				maxHeight: height * 0.92,
				borderTopLeftRadius: T.radius.xl,
				borderTopRightRadius: T.radius.xl,
				borderBottomLeftRadius: 0,
				borderBottomRightRadius: 0,
				marginTop: "auto",
			};
	}
}

// ── Styles ────────────────────────────────────────────────────────
const s = StyleSheet.create({
	// Overlay
	overlay: {
		flex: 1,
		backgroundColor: T.bg.overlay,
		justifyContent: "flex-end",
	},
	overlayDismiss: {
		flex: 1,
	},
	overlayDesktop: {
		...StyleSheet.absoluteFillObject,
		backgroundColor: "rgba(0,0,0,0.3)",
	},
	overlayDismissDesktop: {
		...StyleSheet.absoluteFillObject,
		zIndex: 9000,
	},
	absoluteWrap: {
		...StyleSheet.absoluteFillObject,
		zIndex: 9000,
	},

	// Window
	window: {
		backgroundColor: T.bg.primary,
		overflow: "hidden",
		borderWidth: 1,
		borderColor: T.border.card,
		zIndex: 9001,
	},

	// Header
	header: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: T.spacing.lg,
		paddingTop: Platform.OS === "ios" ? 48 : T.spacing.md,
		paddingBottom: T.spacing.sm,
	},
	headerLeft: {
		flexDirection: "row",
		alignItems: "center",
		gap: 10,
	},
	dragHandle: {
		width: 4,
		height: 20,
		borderRadius: 2,
		backgroundColor: T.border.card,
	},
	titleGroup: {
		gap: -2,
	},
	windowTitle: {
		fontSize: 16,
		fontWeight: "800",
		color: T.accent.cyan,
		letterSpacing: 0.5,
	},
	windowSubtitle: {
		fontSize: 9,
		fontWeight: "600",
		color: T.text.muted,
		textTransform: "uppercase",
		letterSpacing: 2,
	},
	headerCenter: {
		flex: 1,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 5,
	},
	statusDot: {
		width: 6,
		height: 6,
		borderRadius: 3,
		backgroundColor: T.accent.green,
	},
	statusText: {
		fontSize: 10,
		color: T.text.muted,
	},
	headerRight: {
		flexDirection: "row",
		alignItems: "center",
		gap: 4,
	},
	headerBtn: {
		width: 28,
		height: 28,
		borderRadius: T.radius.sm,
		alignItems: "center",
		justifyContent: "center",
	},
	closeBtn: {
		backgroundColor: T.accent.redDim,
	},
	headerSeparator: {
		height: 1,
		backgroundColor: T.border.subtle,
		marginHorizontal: T.spacing.lg,
	},

	// Body
	body: {
		maxHeight: 340,
	},
	bodyContent: {
		paddingVertical: T.spacing.sm,
	},
	divider: {
		height: 1,
		backgroundColor: T.border.subtle,
		marginHorizontal: T.spacing.lg,
		marginTop: T.spacing.sm,
	},

	// Footer
	footer: {
		flexDirection: "column",
		alignItems: "flex-start",
		gap: 2,
		paddingHorizontal: T.spacing.lg,
		paddingVertical: T.spacing.sm,
		borderTopWidth: 1,
		borderTopColor: T.border.subtle,
	},
	footerText: {
		fontSize: 9,
		color: T.text.muted,
	},
	debugText: {
		fontSize: 9,
		color: T.accent.cyan,
		fontFamily: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" }),
	},

	// Minimized bar
	minimizedBar: {
		position: "absolute",
		bottom: Platform.OS === "ios" ? 90 : 70,
		right: 12,
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: T.bg.glass,
		borderRadius: T.radius.pill,
		paddingHorizontal: T.spacing.md,
		paddingVertical: T.spacing.sm,
		gap: 8,
		borderWidth: 1,
		borderColor: T.border.card,
		zIndex: 9000,
		...T.shadow.card,
	},
	minimizedLeft: {
		flexDirection: "row",
		alignItems: "center",
		gap: 5,
	},
	miniDot: {
		width: 6,
		height: 6,
		borderRadius: 3,
		backgroundColor: T.accent.green,
	},
	miniTitle: {
		fontSize: 11,
		fontWeight: "800",
		color: T.accent.cyan,
		letterSpacing: 1,
	},
	miniTotal: {
		fontSize: 14,
		fontWeight: "700",
		color: T.text.primary,
		fontFamily: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" }),
	},
});

export default PaymentsCommandCenter;

/**
 * 📋 DailyLogsScreen.jsx — Journal quotidien (Manager+)
 *
 * Agrège tous les auditLog des réservations du jour.
 * Lecture seule — rien n'est supprimable.
 * Filtre visuel : Tous / Non lus / Lus
 * Lu/Non lu → persisté en AsyncStorage
 */
import React, {
	useState,
	useEffect,
	useCallback,
	useMemo,
} from "react";
import {
	View,
	Text,
	FlatList,
	TouchableOpacity,
	StyleSheet,
	ActivityIndicator,
	Pressable,
	SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "../../hooks/useTheme";
import useUserStore from "../../src/stores/useUserStore";
import { API_CONFIG } from "../../src/config/apiConfig";

// ─── Constantes ──────────────────────────────────────────────────────────────

const READ_KEY = "dailyLogs_readIds";

const ACTION_CONFIG = {
	created:           { icon: "add-circle-outline",       color: "#10B981", label: "Création" },
	created_client:    { icon: "person-add-outline",        color: "#10B981", label: "Client" },
	joined:            { icon: "people-outline",            color: "#06B6D4", label: "Rejoint" },
	table_assigned:    { icon: "grid-outline",              color: "#3B82F6", label: "Table" },
	table_changed:     { icon: "swap-horizontal-outline",   color: "#8B5CF6", label: "Table" },
	table_released:    { icon: "log-out-outline",           color: "#6B7280", label: "Table" },
	status_changed:    { icon: "sync-outline",              color: "#F59E0B", label: "Statut" },
	payment:           { icon: "card-outline",              color: "#10B981", label: "Paiement" },
	order_sent:        { icon: "restaurant-outline",        color: "#F97316", label: "Commande" },
	present_changed:   { icon: "eye-outline",               color: "#06B6D4", label: "Présence" },
	cancelled:         { icon: "close-circle-outline",      color: "#EF4444", label: "Annulation" },
	closed_client:     { icon: "checkmark-done-outline",    color: "#6B7280", label: "Fermeture" },
	deleted:           { icon: "trash-outline",             color: "#EF4444", label: "Suppression" },
	dish_status_changed:{ icon: "flame-outline",            color: "#F97316", label: "Plat" },
	field_updated:     { icon: "create-outline",            color: "#8B5CF6", label: "Modif" },
};

const FILTERS = [
	{ key: "all",    label: "Tous" },
	{ key: "unread", label: "Non lus" },
	{ key: "read",   label: "Lus" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatTime = (ts) => {
	if (!ts) return "";
	const d = new Date(ts);
	const h = String(d.getHours()).padStart(2, "0");
	const m = String(d.getMinutes()).padStart(2, "0");
	return `${h}:${m}`;
};

const isToday = (ts) => {
	if (!ts) return false;
	const d = new Date(ts);
	const now = new Date();
	return (
		d.getDate() === now.getDate() &&
		d.getMonth() === now.getMonth() &&
		d.getFullYear() === now.getFullYear()
	);
};

/**
 * Construit un ID unique et stable pour chaque entrée d'audit.
 * Format : reservationId__index (le log n'a pas d'_id propre)
 */
const makeLogId = (reservationId, index) => `${reservationId}__${index}`;

// ─── Composant principal ─────────────────────────────────────────────────────

export default function DailyLogsScreen({ onClose }) {
	const THEME = useTheme();
	const s = useMemo(() => createStyles(THEME), [THEME]);

	const [logs, setLogs] = useState([]);       // entrées du jour triées par heure desc
	const [readIds, setReadIds] = useState(new Set());
	const [filter, setFilter] = useState("all");
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	// ── Charger les IDs déjà lus ────────────────────────────────────────────
	useEffect(() => {
		AsyncStorage.getItem(READ_KEY).then((raw) => {
			if (raw) {
				try {
					setReadIds(new Set(JSON.parse(raw)));
				} catch {
					// ignore parse error
				}
			}
		});
	}, []);

	// ── Charger les réservations du jour ────────────────────────────────────
	const fetchLogs = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const token = await useUserStore.getState().getToken();
			const res = await fetch(`${API_CONFIG.baseURL}/reservations`, {
				headers: { Authorization: `Bearer ${token}` },
			});
			if (!res.ok) throw new Error(`Erreur ${res.status}`);
			const reservations = await res.json();

			// Aplatir tous les auditLog du jour
			const allEntries = [];
			(reservations || []).forEach((resa) => {
				if (!Array.isArray(resa.auditLog)) return;
				resa.auditLog.forEach((entry, idx) => {
					if (!isToday(entry.timestamp)) return;
					allEntries.push({
						...entry,
						_logId: makeLogId(resa._id, idx),
						reservationId: resa._id,
						reservationLabel: resa.clientName || resa.tableNumber || "—",
					});
				});
			});

			// Tri : plus récent en premier
			allEntries.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
			setLogs(allEntries);
		} catch (e) {
			setError("Impossible de charger les logs.");
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchLogs();
	}, [fetchLogs]);

	// ── Marquer un log comme lu ──────────────────────────────────────────────
	const markRead = useCallback(
		async (logId) => {
			if (readIds.has(logId)) return;
			const next = new Set(readIds);
			next.add(logId);
			setReadIds(next);
			await AsyncStorage.setItem(READ_KEY, JSON.stringify([...next]));
		},
		[readIds],
	);

	// ── Tout marquer lu ─────────────────────────────────────────────────────
	const markAllRead = useCallback(async () => {
		const next = new Set(logs.map((l) => l._logId));
		setReadIds(next);
		await AsyncStorage.setItem(READ_KEY, JSON.stringify([...next]));
	}, [logs]);

	// ── Filtrage ────────────────────────────────────────────────────────────
	const filteredLogs = useMemo(() => {
		if (filter === "unread") return logs.filter((l) => !readIds.has(l._logId));
		if (filter === "read")   return logs.filter((l) =>  readIds.has(l._logId));
		return logs;
	}, [logs, filter, readIds]);

	const unreadCount = useMemo(
		() => logs.filter((l) => !readIds.has(l._logId)).length,
		[logs, readIds],
	);

	// ── Rendu d'une entrée ──────────────────────────────────────────────────
	const renderItem = useCallback(
		({ item }) => {
			const isRead = readIds.has(item._logId);
			const cfg = ACTION_CONFIG[item.action] || {
				icon: "ellipsis-horizontal-outline",
				color: "#6B7280",
				label: "Action",
			};

			return (
				<Pressable
					onPress={() => markRead(item._logId)}
					style={({ pressed }) => [
						s.logRow,
						isRead && s.logRowRead,
						pressed && s.logRowPressed,
					]}
				>
					{/* Indicateur non-lu */}
					<View style={[s.unreadDot, isRead && s.unreadDotRead]} />

					{/* Icône action */}
					<View style={[s.iconWrap, { backgroundColor: `${cfg.color}18` }]}>
						<Ionicons name={cfg.icon} size={16} color={cfg.color} />
					</View>

					{/* Contenu */}
					<View style={s.logContent}>
						<View style={s.logHeader}>
							<Text style={[s.logAction, { color: cfg.color }]} numberOfLines={1}>
								{cfg.label}
							</Text>
							<Text style={s.logMeta} numberOfLines={1}>
								{item.userName || "Système"} · {item.reservationLabel}
							</Text>
						</View>
						<Text
							style={[s.logMessage, isRead && s.logMessageRead]}
							numberOfLines={2}
						>
							{item.message || item.action}
						</Text>
					</View>

					{/* Heure */}
					<Text style={s.logTime}>{formatTime(item.timestamp)}</Text>
				</Pressable>
			);
		},
		[readIds, markRead, s],
	);

	// ── Séparateur ──────────────────────────────────────────────────────────
	const Separator = () => <View style={s.separator} />;

	// ── Rendu ───────────────────────────────────────────────────────────────
	return (
		<SafeAreaView style={s.root}>
			{/* Header */}
			<View style={s.header}>
				<Pressable onPress={onClose} style={s.backBtn} hitSlop={12}>
					<Ionicons
						name="chevron-back"
						size={22}
						color={THEME.colors.text.primary}
					/>
				</Pressable>
				<View style={s.headerCenter}>
					<Text style={s.headerTitle}>Journal du jour</Text>
					{unreadCount > 0 && (
						<View style={s.badge}>
							<Text style={s.badgeText}>{unreadCount}</Text>
						</View>
					)}
				</View>
				<Pressable
					onPress={markAllRead}
					style={({ pressed }) => [s.markAllBtn, pressed && { opacity: 0.6 }]}
					hitSlop={12}
				>
					<Text style={s.markAllText}>Tout lire</Text>
				</Pressable>
			</View>

			{/* Filtres */}
			<View style={s.filterRow}>
				{FILTERS.map((f) => {
					const active = filter === f.key;
					return (
						<Pressable
							key={f.key}
							onPress={() => setFilter(f.key)}
							style={[s.filterChip, active && s.filterChipActive]}
						>
							<Text style={[s.filterLabel, active && s.filterLabelActive]}>
								{f.label}
							</Text>
						</Pressable>
					);
				})}
			</View>

			{/* Contenu */}
			{loading ? (
				<View style={s.center}>
					<ActivityIndicator
						size="large"
						color={THEME.colors.primary?.amber || "#F59E0B"}
					/>
					<Text style={s.loadingText}>Chargement des logs…</Text>
				</View>
			) : error ? (
				<View style={s.center}>
					<Ionicons name="cloud-offline-outline" size={40} color="#6B7280" />
					<Text style={s.errorText}>{error}</Text>
					<TouchableOpacity style={s.retryBtn} onPress={fetchLogs}>
						<Text style={s.retryText}>Réessayer</Text>
					</TouchableOpacity>
				</View>
			) : filteredLogs.length === 0 ? (
				<View style={s.center}>
					<Ionicons name="document-text-outline" size={44} color="#6B7280" />
					<Text style={s.emptyText}>
						{filter === "unread"
							? "Tout est lu 👌"
							: filter === "read"
							? "Aucun log lu pour l'instant"
							: "Aucun log aujourd'hui"}
					</Text>
				</View>
			) : (
				<FlatList
					data={filteredLogs}
					keyExtractor={(item) => item._logId}
					renderItem={renderItem}
					ItemSeparatorComponent={Separator}
					contentContainerStyle={s.listContent}
					showsVerticalScrollIndicator={false}
				/>
			)}
		</SafeAreaView>
	);
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const createStyles = (THEME) => {
	const bg = THEME.colors?.background || {};
	const txt = THEME.colors?.text || {};
	const isDark = THEME.isDark ?? true;

	return StyleSheet.create({
		root: {
			flex: 1,
			backgroundColor: bg.primary || (isDark ? "#0F1117" : "#F8F9FB"),
		},

		// ── Header ──────────────────────────────────────────────────────────
		header: {
			flexDirection: "row",
			alignItems: "center",
			paddingHorizontal: 16,
			paddingTop: 12,
			paddingBottom: 12,
			borderBottomWidth: 1,
			borderBottomColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.07)",
		},
		backBtn: {
			width: 36,
			height: 36,
			borderRadius: 18,
			backgroundColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)",
			alignItems: "center",
			justifyContent: "center",
		},
		headerCenter: {
			flex: 1,
			flexDirection: "row",
			alignItems: "center",
			marginLeft: 12,
			gap: 8,
		},
		headerTitle: {
			fontSize: 17,
			fontWeight: "600",
			color: txt.primary || (isDark ? "#F1F5F9" : "#111827"),
			letterSpacing: -0.3,
		},
		badge: {
			backgroundColor: "#EF4444",
			borderRadius: 10,
			minWidth: 20,
			height: 20,
			paddingHorizontal: 6,
			alignItems: "center",
			justifyContent: "center",
		},
		badgeText: {
			color: "#fff",
			fontSize: 11,
			fontWeight: "700",
		},
		markAllBtn: {
			paddingHorizontal: 12,
			paddingVertical: 6,
			borderRadius: 8,
			backgroundColor: isDark ? "rgba(245,158,11,0.12)" : "rgba(245,158,11,0.1)",
		},
		markAllText: {
			fontSize: 13,
			fontWeight: "600",
			color: "#F59E0B",
		},

		// ── Filtres ─────────────────────────────────────────────────────────
		filterRow: {
			flexDirection: "row",
			paddingHorizontal: 16,
			paddingVertical: 10,
			gap: 8,
		},
		filterChip: {
			paddingHorizontal: 14,
			paddingVertical: 6,
			borderRadius: 20,
			backgroundColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)",
		},
		filterChipActive: {
			backgroundColor: "#F59E0B",
		},
		filterLabel: {
			fontSize: 13,
			fontWeight: "500",
			color: txt.secondary || (isDark ? "#94A3B8" : "#6B7280"),
		},
		filterLabelActive: {
			color: "#fff",
			fontWeight: "600",
		},

		// ── Liste ────────────────────────────────────────────────────────────
		listContent: {
			paddingHorizontal: 16,
			paddingTop: 4,
			paddingBottom: 32,
		},
		separator: {
			height: 1,
			backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)",
			marginLeft: 52,
		},

		// ── Ligne de log ─────────────────────────────────────────────────────
		logRow: {
			flexDirection: "row",
			alignItems: "flex-start",
			paddingVertical: 12,
			gap: 10,
		},
		logRowRead: {
			opacity: 0.55,
		},
		logRowPressed: {
			opacity: 0.75,
		},
		unreadDot: {
			width: 7,
			height: 7,
			borderRadius: 4,
			backgroundColor: "#F59E0B",
			marginTop: 7,
			flexShrink: 0,
		},
		unreadDotRead: {
			backgroundColor: "transparent",
		},
		iconWrap: {
			width: 32,
			height: 32,
			borderRadius: 10,
			alignItems: "center",
			justifyContent: "center",
			flexShrink: 0,
		},
		logContent: {
			flex: 1,
			gap: 2,
		},
		logHeader: {
			flexDirection: "row",
			alignItems: "center",
			gap: 6,
			flexWrap: "wrap",
		},
		logAction: {
			fontSize: 12,
			fontWeight: "700",
			textTransform: "uppercase",
			letterSpacing: 0.5,
		},
		logMeta: {
			fontSize: 12,
			color: txt.secondary || (isDark ? "#64748B" : "#9CA3AF"),
			flexShrink: 1,
		},
		logMessage: {
			fontSize: 14,
			color: txt.primary || (isDark ? "#E2E8F0" : "#1F2937"),
			lineHeight: 19,
		},
		logMessageRead: {
			color: txt.secondary || (isDark ? "#64748B" : "#9CA3AF"),
		},
		logTime: {
			fontSize: 12,
			color: txt.secondary || (isDark ? "#475569" : "#9CA3AF"),
			marginTop: 2,
			flexShrink: 0,
			fontVariant: ["tabular-nums"],
		},

		// ── États vides ─────────────────────────────────────────────────────
		center: {
			flex: 1,
			alignItems: "center",
			justifyContent: "center",
			gap: 12,
			paddingHorizontal: 32,
		},
		loadingText: {
			fontSize: 14,
			color: txt.secondary || "#94A3B8",
		},
		emptyText: {
			fontSize: 15,
			color: txt.secondary || "#94A3B8",
			textAlign: "center",
		},
		errorText: {
			fontSize: 14,
			color: "#EF4444",
			textAlign: "center",
		},
		retryBtn: {
			marginTop: 4,
			paddingHorizontal: 20,
			paddingVertical: 10,
			borderRadius: 10,
			backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
		},
		retryText: {
			fontSize: 14,
			fontWeight: "600",
			color: txt.primary || (isDark ? "#F1F5F9" : "#111827"),
		},
	});
};

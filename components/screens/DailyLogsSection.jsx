/**
 * 📋 DailyLogsSection.jsx — Journal quotidien (Manager+)
 *
 * Section inline dans le portail manager.
 * Agrège tous les auditLog des réservations du jour.
 * Lecture seule — rien n'est supprimable.
 * Filtre : Tous / Non lus / Lus
 * Lu/Non lu → persisté en AsyncStorage
 */
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
	View,
	Text,
	FlatList,
	TouchableOpacity,
	StyleSheet,
	ActivityIndicator,
	Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "../../hooks/useTheme";
import useUserStore from "../../src/stores/useUserStore";
import { API_CONFIG } from "../../src/config/apiConfig";

// ─── Constantes ──────────────────────────────────────────────────────────────

const READ_KEY = "dailyLogs_readIds";
const DISCOUNT_LOG_KEY = "dailyLogs_discount_entries";
const CANCELLATION_LOG_KEY = "dailyLogs_cancellation_entries";

const ACTION_CONFIG = {
	discount_applied:       { icon: "pricetag-outline",       color: "#8B5CF6", label: "Réduction" },
	pin_used:               { icon: "lock-open-outline",      color: "#F59E0B", label: "PIN" },
	reservation_cancelled:  { icon: "close-circle-outline",   color: "#EF4444", label: "Annulation" },
	created:                { icon: "add-circle-outline",     color: "#10B981", label: "Création" },
	created_client:      { icon: "person-add-outline",      color: "#10B981", label: "Client" },
	joined:              { icon: "people-outline",          color: "#06B6D4", label: "Rejoint" },
	table_assigned:      { icon: "grid-outline",            color: "#3B82F6", label: "Table" },
	table_changed:       { icon: "swap-horizontal-outline", color: "#8B5CF6", label: "Table" },
	table_released:      { icon: "log-out-outline",         color: "#6B7280", label: "Libération" },
	status_changed:      { icon: "sync-outline",            color: "#F59E0B", label: "Statut" },
	payment:             { icon: "card-outline",            color: "#10B981", label: "Paiement" },
	order_sent:          { icon: "restaurant-outline",      color: "#F97316", label: "Commande" },
	present_changed:     { icon: "eye-outline",             color: "#06B6D4", label: "Présence" },
	cancelled:           { icon: "close-circle-outline",    color: "#EF4444", label: "Annulation" },
	closed_client:       { icon: "checkmark-done-outline",  color: "#6B7280", label: "Fermeture" },
	deleted:             { icon: "trash-outline",           color: "#EF4444", label: "Suppression" },
	dish_status_changed: { icon: "flame-outline",           color: "#F97316", label: "Plat" },
	field_updated:       { icon: "create-outline",          color: "#8B5CF6", label: "Modif" },
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
	return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
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

const makeLogId = (reservationId, index) => `${reservationId}__${index}`;

// ─── Composant ───────────────────────────────────────────────────────────────

export default function DailyLogsSection() {
	const THEME = useTheme();
	const s = useMemo(() => createStyles(THEME), [THEME]);

	const [logs, setLogs] = useState([]);
	const [readIds, setReadIds] = useState(new Set());
	const [filter, setFilter] = useState("all");
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	// ── Charger les IDs lus ──────────────────────────────────────────────────
	useEffect(() => {
		AsyncStorage.getItem(READ_KEY).then((raw) => {
			if (raw) {
				try { setReadIds(new Set(JSON.parse(raw))); } catch { /* ignore */ }
			}
		});
	}, []);

	// ── Fetch logs du jour ───────────────────────────────────────────────────
	const fetchLogs = useCallback(async () => {
		setLoading(true);
		setError(null);

		const allEntries = [];

		// 1. Logs API (auditLog réservations) — échec silencieux
		try {
			const token = await useUserStore.getState().getToken();
			const res = await fetch(`${API_CONFIG.baseURL}/reservations`, {
				headers: { Authorization: `Bearer ${token}` },
			});
			if (res.ok) {
				const reservations = await res.json();
				(reservations || []).forEach((resa) => {
					if (!Array.isArray(resa.auditLog)) return;
					resa.auditLog.forEach((entry, idx) => {
						if (!isToday(entry.timestamp)) return;
						allEntries.push({
							...entry,
							_logId: makeLogId(resa._id, idx),
							reservationLabel: resa.clientName || resa.tableNumber || "—",
						});
					});
				});
			}
		} catch {
			// API indisponible → on continue avec les logs locaux
		}

		// 2. Logs locaux de réductions (comptoir)
		try {
			const rawDiscounts = await AsyncStorage.getItem(DISCOUNT_LOG_KEY);
			if (rawDiscounts) {
				JSON.parse(rawDiscounts).forEach((entry) => {
					if (!isToday(entry.timestamp)) return;
					allEntries.push(entry);
				});
			}
		} catch { /* ignore */ }

		// 3. Logs locaux d'usage PIN
		try {
			const rawPin = await AsyncStorage.getItem("dailyLogs_pin_entries");
			if (rawPin) {
				JSON.parse(rawPin).forEach((entry) => {
					if (!isToday(entry.timestamp)) return;
					allEntries.push(entry);
				});
			}
		} catch { /* ignore */ }

		// 4. Logs locaux d'annulations de réservations
		try {
			const rawCancel = await AsyncStorage.getItem(CANCELLATION_LOG_KEY);
			if (rawCancel) {
				JSON.parse(rawCancel).forEach((entry) => {
					if (!isToday(entry.timestamp)) return;
					allEntries.push(entry);
				});
			}
		} catch { /* ignore */ }

		// Tri : plus récent en premier
		allEntries.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
		setLogs(allEntries);
		setLoading(false);
	}, []);

	useEffect(() => { fetchLogs(); }, [fetchLogs]);

	// ── Marquer lu ───────────────────────────────────────────────────────────
	const markRead = useCallback(async (logId) => {
		if (readIds.has(logId)) return;
		const next = new Set(readIds);
		next.add(logId);
		setReadIds(next);
		await AsyncStorage.setItem(READ_KEY, JSON.stringify([...next]));
	}, [readIds]);

	const markAllRead = useCallback(async () => {
		const next = new Set(logs.map((l) => l._logId));
		setReadIds(next);
		await AsyncStorage.setItem(READ_KEY, JSON.stringify([...next]));
	}, [logs]);

	// ── Filtrage ─────────────────────────────────────────────────────────────
	const filteredLogs = useMemo(() => {
		if (filter === "unread") return logs.filter((l) => !readIds.has(l._logId));
		if (filter === "read")   return logs.filter((l) =>  readIds.has(l._logId));
		return logs;
	}, [logs, filter, readIds]);

	const unreadCount = useMemo(
		() => logs.filter((l) => !readIds.has(l._logId)).length,
		[logs, readIds],
	);

	// ── Rendu ligne ──────────────────────────────────────────────────────────
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
						pressed && { opacity: 0.7 },
					]}
				>
					<View style={[s.unreadDot, isRead && s.unreadDotRead]} />
					<View style={[s.iconWrap, { backgroundColor: `${cfg.color}18` }]}>
						<Ionicons name={cfg.icon} size={15} color={cfg.color} />
					</View>
					<View style={s.logContent}>
						<View style={s.logMeta}>
							<Text style={[s.logLabel, { color: cfg.color }]}>{cfg.label}</Text>
							<Text style={s.logBy} numberOfLines={1}>
								{item.userName || "Système"} · {item.reservationLabel}
							</Text>
						</View>
						<Text style={[s.logMessage, isRead && s.logMessageRead]} numberOfLines={2}>
							{item.message || item.action}
						</Text>
					</View>
					<Text style={s.logTime}>{formatTime(item.timestamp)}</Text>
				</Pressable>
			);
		},
		[readIds, markRead, s],
	);

	const Separator = () => <View style={s.separator} />;

	// ── Rendu principal ──────────────────────────────────────────────────────
	return (
		<View style={s.root}>
			{/* Titre + badge + Tout lire */}
			<View style={s.topRow}>
				<View style={s.titleRow}>
					<Text style={s.title}>Journal du jour</Text>
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
							style={[s.chip, active && s.chipActive]}
						>
							<Text style={[s.chipLabel, active && s.chipLabelActive]}>
								{f.label}
							</Text>
						</Pressable>
					);
				})}
				<Pressable
					onPress={fetchLogs}
					style={[s.chip, { marginLeft: "auto" }]}
					hitSlop={8}
				>
					<Ionicons name="refresh-outline" size={14} color={THEME.colors?.text?.secondary || "#94A3B8"} />
				</Pressable>
			</View>

			{/* Contenu */}
			{loading ? (
				<View style={s.center}>
					<ActivityIndicator size="small" color="#6366F1" />
					<Text style={s.statusText}>Chargement…</Text>
				</View>
			) : error ? (
				<View style={s.center}>
					<Ionicons name="cloud-offline-outline" size={28} color="#6B7280" />
					<Text style={s.statusText}>{error}</Text>
					<TouchableOpacity onPress={fetchLogs} style={s.retryBtn}>
						<Text style={s.retryText}>Réessayer</Text>
					</TouchableOpacity>
				</View>
			) : filteredLogs.length === 0 ? (
				<View style={s.center}>
					<Ionicons name="document-text-outline" size={32} color="#6B7280" />
					<Text style={s.statusText}>
						{filter === "unread" ? "Tout est lu 👌" : "Aucun log"}
					</Text>
				</View>
			) : (
				<FlatList
					data={filteredLogs}
					keyExtractor={(item) => item._logId}
					renderItem={renderItem}
					ItemSeparatorComponent={Separator}
					scrollEnabled={false}
					showsVerticalScrollIndicator={false}
				/>
			)}
		</View>
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
		},

		// ── Header ──────────────────────────────────────────────────────────
		topRow: {
			flexDirection: "row",
			alignItems: "center",
			marginBottom: 12,
		},
		titleRow: {
			flex: 1,
			flexDirection: "row",
			alignItems: "center",
			gap: 8,
		},
		title: {
			fontSize: 16,
			fontWeight: "700",
			color: txt.primary || (isDark ? "#F1F5F9" : "#111827"),
			letterSpacing: -0.2,
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
			paddingHorizontal: 10,
			paddingVertical: 5,
			borderRadius: 8,
			backgroundColor: isDark ? "rgba(99,102,241,0.15)" : "rgba(99,102,241,0.1)",
		},
		markAllText: {
			fontSize: 12,
			fontWeight: "600",
			color: "#6366F1",
		},

		// ── Filtres ─────────────────────────────────────────────────────────
		filterRow: {
			flexDirection: "row",
			alignItems: "center",
			marginBottom: 12,
			gap: 6,
		},
		chip: {
			paddingHorizontal: 12,
			paddingVertical: 5,
			borderRadius: 16,
			backgroundColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)",
		},
		chipActive: {
			backgroundColor: "#6366F1",
		},
		chipLabel: {
			fontSize: 12,
			fontWeight: "500",
			color: txt.secondary || (isDark ? "#94A3B8" : "#6B7280"),
		},
		chipLabelActive: {
			color: "#fff",
			fontWeight: "600",
		},

		// ── Ligne ────────────────────────────────────────────────────────────
		separator: {
			height: 1,
			backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)",
			marginLeft: 50,
		},
		logRow: {
			flexDirection: "row",
			alignItems: "flex-start",
			paddingVertical: 10,
			gap: 8,
		},
		logRowRead: {
			opacity: 0.45,
		},
		unreadDot: {
			width: 6,
			height: 6,
			borderRadius: 3,
			backgroundColor: "#6366F1",
			marginTop: 8,
			flexShrink: 0,
		},
		unreadDotRead: {
			backgroundColor: "transparent",
		},
		iconWrap: {
			width: 30,
			height: 30,
			borderRadius: 8,
			alignItems: "center",
			justifyContent: "center",
			flexShrink: 0,
		},
		logContent: {
			flex: 1,
			gap: 2,
		},
		logMeta: {
			flexDirection: "row",
			alignItems: "center",
			gap: 6,
			flexWrap: "wrap",
		},
		logLabel: {
			fontSize: 11,
			fontWeight: "700",
			textTransform: "uppercase",
			letterSpacing: 0.4,
		},
		logBy: {
			fontSize: 11,
			color: txt.secondary || (isDark ? "#64748B" : "#9CA3AF"),
			flexShrink: 1,
		},
		logMessage: {
			fontSize: 13,
			color: txt.primary || (isDark ? "#CBD5E1" : "#1F2937"),
			lineHeight: 18,
		},
		logMessageRead: {
			color: txt.secondary || (isDark ? "#475569" : "#9CA3AF"),
		},
		logTime: {
			fontSize: 11,
			color: txt.secondary || (isDark ? "#475569" : "#9CA3AF"),
			marginTop: 2,
			flexShrink: 0,
		},

		// ── États ────────────────────────────────────────────────────────────
		center: {
			paddingVertical: 32,
			alignItems: "center",
			gap: 8,
		},
		statusText: {
			fontSize: 13,
			color: txt.secondary || "#94A3B8",
			textAlign: "center",
		},
		retryBtn: {
			marginTop: 4,
			paddingHorizontal: 16,
			paddingVertical: 8,
			borderRadius: 8,
			backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)",
		},
		retryText: {
			fontSize: 13,
			fontWeight: "600",
			color: txt.primary || (isDark ? "#F1F5F9" : "#111827"),
		},
	});
};

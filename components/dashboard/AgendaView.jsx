/**
 * AgendaView.jsx — Planning de salle par table
 * Axe vertical  = heures (créneaux 30 min)
 * Axe horizontal = tables + colonne "Sans table" (urgente)
 * La colonne "Sans table" devient rouge quand les résa non-assignées
 * approchent ou dépassent le nombre de tables encore libres.
 */
import React, { useMemo, useRef } from "react";
import {
	View,
	Text,
	ScrollView,
	TouchableOpacity,
	StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../hooks/useTheme";

// ─── Constantes ───
const SLOT_HEIGHT = 56; // hauteur d'un créneau 30 min en px
const COL_WIDTH = 110; // largeur d'une colonne table
const TIME_COL_WIDTH = 48; // largeur de la colonne heure
const DEFAULT_OPEN = "11:00";
const DEFAULT_CLOSE = "23:00";
const SLOT_DURATION = 30; // minutes

// Couleurs par statut
const STATUS_COLORS = {
	"en attente": { bg: "rgba(251,191,36,0.18)", border: "#FBBF24" },
	actives: { bg: "rgba(251,191,36,0.18)", border: "#FBBF24" },
	present: { bg: "rgba(16,185,129,0.18)", border: "#10B981" },
	ouverte: { bg: "rgba(14,165,233,0.18)", border: "#0EA5E9" },
	terminée: { bg: "rgba(100,116,139,0.15)", border: "#64748B" },
	termine: { bg: "rgba(100,116,139,0.15)", border: "#64748B" },
	annulée: { bg: "rgba(244,63,94,0.15)", border: "#F43F5E" },
	annulee: { bg: "rgba(244,63,94,0.15)", border: "#F43F5E" },
};
const DEFAULT_COLOR = { bg: "rgba(251,191,36,0.18)", border: "#FBBF24" };

// ─── Helpers ───

/** "12:30" → 750 */
const timeToMinutes = (str) => {
	if (!str) return 0;
	const [h, m] = str.split(":").map(Number);
	return h * 60 + (m || 0);
};

/** 750 → "12:30" */
const minutesToLabel = (m) => {
	const h = Math.floor(m / 60);
	const mm = m % 60;
	return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
};

/** Génère les créneaux entre open et close */
const buildSlots = (open, close) => {
	const start = timeToMinutes(open || DEFAULT_OPEN);
	const end = timeToMinutes(close || DEFAULT_CLOSE);
	const slots = [];
	for (let m = start; m < end; m += SLOT_DURATION) {
		slots.push({ startMin: m, label: minutesToLabel(m) });
	}
	return slots;
};

/** Extrait les minutes depuis minuit depuis reservationTime */
const getReservationMinutes = (resa) => {
	const t = resa.reservationTime;
	if (!t) return null;
	if (/^\d{1,2}:\d{2}$/.test(t)) return timeToMinutes(t);
	const d = new Date(t);
	if (!isNaN(d.getTime())) return d.getHours() * 60 + d.getMinutes();
	return null;
};

/** Normalise tableId en string (gère string ou objet) */
const getTableId = (r) => {
	if (!r.tableId) return null;
	if (typeof r.tableId === "string") return r.tableId;
	if (typeof r.tableId === "object") return r.tableId._id || null;
	return null;
};

/**
 * Calcule l'urgence de la colonne "Sans table"
 * @returns "none" | "ok" | "warning" | "critical"
 */
const getUnassignedUrgency = (unassignedCount, tables, dayReservations) => {
	if (unassignedCount === 0) return "none";
	const takenIds = new Set(
		dayReservations
			.filter((r) => getTableId(r) !== null)
			.map((r) => getTableId(r)),
	);
	const freeTables = tables.filter((t) => !takenIds.has(t._id)).length;
	if (freeTables === 0) return "critical";
	if (unassignedCount >= freeTables) return "critical";
	if (unassignedCount >= Math.ceil(freeTables * 0.6)) return "warning";
	return "ok";
};

// Palette par niveau d'urgence
const URGENCY_PALETTE = {
	none: {
		header: "transparent",
		headerBorder: "transparent",
		text: null,
		badge: null,
	},
	ok: {
		header: "rgba(16,185,129,0.10)",
		headerBorder: "#10B981",
		text: "#10B981",
		badge: "#10B981",
	},
	warning: {
		header: "rgba(245,158,11,0.14)",
		headerBorder: "#F59E0B",
		text: "#F59E0B",
		badge: "#F59E0B",
	},
	critical: {
		header: "rgba(239,68,68,0.16)",
		headerBorder: "#EF4444",
		text: "#EF4444",
		badge: "#EF4444",
	},
};

// ─── Composant ───

const AgendaView = React.memo(
	({
		reservations = [],
		tables = [],
		selectedDate,
		onResaPress,
		onSlotPress,
		openTime,
		closeTime,
		turnoverTime = 120,
		gaps = [], // IA anti-trous
	}) => {
		const THEME = useTheme();
		const styles = useMemo(() => createStyles(THEME), [THEME]);

		const contentHScrollRef = useRef(null);
		const headerHScrollRef = useRef(null);

		const open = openTime || DEFAULT_OPEN;
		const close = closeTime || DEFAULT_CLOSE;

		const slots = useMemo(() => buildSlots(open, close), [open, close]);
		const startMin = slots.length ? slots[0].startMin : 0;
		const totalHeight = slots.length * SLOT_HEIGHT;

		// ── Gaps IA par nom de table ──
		const gapsByTable = useMemo(() => {
			const map = {};
			if (Array.isArray(gaps)) {
				gaps.forEach((g) => {
					if (g.tableName) {
						if (!map[g.tableName]) map[g.tableName] = [];
						map[g.tableName].push(g);
					}
				});
			}
			return map;
		}, [gaps]);

		// Réservations actives du jour
		const dayReservations = useMemo(() => {
			const statuts = ["en attente", "actives", "present", "ouverte"];
			return reservations.filter((r) =>
				statuts.includes((r.status || "").toLowerCase()),
			);
		}, [reservations]);

		// Construction des colonnes
		const { unassignedCol, tableColumns } = useMemo(() => {
			const unassigned = dayReservations.filter((r) => getTableId(r) === null);
			const u = getUnassignedUrgency(
				unassigned.length,
				tables,
				dayReservations,
			);

			return {
				unassignedCol: {
					id: "unassigned",
					label: "Sans table",
					count: unassigned.length,
					reservations: unassigned,
					isUnassigned: true,
					urgency: u,
				},
				tableColumns: [...tables]
					.sort((a, b) => {
						const parseNum = (t) => {
							const raw = t.number ?? t.name ?? "";
							const match = String(raw).match(/(\d+)/);
							return match ? parseInt(match[1], 10) : Infinity;
						};
						return parseNum(a) - parseNum(b);
					})
					.map((table) => ({
						id: table._id,
						label:
							table.name ||
							table.number?.toString() ||
							`T${(table._id || "").slice(-3)}`,
						capacity: table.capacity || table.seats || null,
						reservations: dayReservations.filter(
							(r) => getTableId(r) === table._id,
						),
						isUnassigned: false,
						urgency: "none",
					})),
			};
		}, [dayReservations, tables]);

		/** Minutes → position verticale en px */
		const minToPx = (m) => (m - startMin) * (SLOT_HEIGHT / SLOT_DURATION);

		/** Calcule top + height + couleurs d'un bloc résa */
		const getBlock = (resa) => {
			const s = getReservationMinutes(resa);
			if (s === null) return null;
			const top = minToPx(s);
			const height = Math.max(
				((resa.turnoverTime || turnoverTime) / SLOT_DURATION) * SLOT_HEIGHT,
				SLOT_HEIGHT * 0.75,
			);
			const c =
				STATUS_COLORS[(resa.status || "").toLowerCase()] || DEFAULT_COLOR;
			return { top, height, colors: c };
		};

		/** Rendu d'une colonne (sans table ou table) */
		const renderColumn = (col, colIndex = 0) => {
			const palette = URGENCY_PALETTE[col.isUnassigned ? col.urgency : "none"];
			return (
				<View key={col.id} style={[styles.column, { height: totalHeight }]}>
					{slots.map((slot, i) => (
						<TouchableOpacity
							key={slot.startMin}
							activeOpacity={col.isUnassigned ? 1 : 0.35}
							onPress={() => {
								if (!col.isUnassigned) {
									onSlotPress?.({
										time: slot.label,
										date: selectedDate,
										tableId: col.id,
									});
								}
							}}
							style={[
								styles.slotCell,
								{
									top: i * SLOT_HEIGHT,
									borderTopColor:
										slot.startMin % 60 === 0
											? "rgba(148,163,184,0.22)"
											: "rgba(148,163,184,0.09)",
								},
								col.isUnassigned && col.urgency !== "none"
									? { backgroundColor: palette.header }
									: null,
							]}
						/>
					))}
					{col.reservations.map((resa, ri) => {
						const block = getBlock(resa);
						if (!block) return null;
						const isCritical = col.isUnassigned && col.urgency === "critical";
						return (
							<TouchableOpacity
								key={resa._id || ri}
								activeOpacity={0.75}
								onPress={() => onResaPress?.(resa)}
								style={[
									styles.resaBlock,
									{
										top: block.top,
										height: block.height,
										backgroundColor: block.colors.bg,
										borderLeftColor: block.colors.border,
									},
									isCritical ? styles.resaBlockCritical : null,
								]}
							>
								<Text style={styles.resaName} numberOfLines={1}>
									{resa.clientName || "—"}
								</Text>
								<Text style={styles.resaMeta} numberOfLines={1}>
									{resa.reservationTime?.substring(0, 5) || "?"} ·{" "}
									{resa.nbPersonnes || "?"}p
								</Text>
							</TouchableOpacity>
						);
					})}
				</View>
			);
		};

		/** Rendu de l'en-tête d'une colonne */
		const renderColHeader = (col) => {
			const palette = URGENCY_PALETTE[col.isUnassigned ? col.urgency : "none"];
			return (
				<View
					key={col.id}
					style={[
						styles.colHeader,
						{
							backgroundColor: palette.header,
							borderColor: palette.headerBorder,
						},
					]}
				>
					{col.isUnassigned ? (
						<>
							<Ionicons
								name="warning-outline"
								size={12}
								color={palette.text || THEME.colors.text.muted}
							/>
							<Text
								style={[
									styles.colHeaderText,
									palette.text ? { color: palette.text } : null,
								]}
							>
								Sans table
							</Text>
							{col.count > 0 && (
								<View
									style={[
										styles.badge,
										{ backgroundColor: palette.badge || "#64748B" },
									]}
								>
									<Text style={styles.badgeText}>{col.count}</Text>
								</View>
							)}
						</>
					) : (
						<>
							<Text style={styles.colHeaderText} numberOfLines={1}>
								{col.label}
							</Text>
							{col.capacity != null && (
								<Text style={styles.colCapacity}>{col.capacity}p</Text>
							)}
							{gapsByTable[col.label] && (
								<View style={styles.gapBadge}>
									<Ionicons name="alert-circle" size={11} color="#F59E0B" />
								</View>
							)}
						</>
					)}
				</View>
			);
		};

		return (
			<View style={styles.container}>
				{/* ── En-têtes (sticky) ── */}
				<View style={styles.headerRow}>
					{/* Espace heure */}
					<View style={{ width: TIME_COL_WIDTH }} />

					{/* En-tête "Sans table" fixe */}
					{renderColHeader(unassignedCol)}

					{/* Séparateur vertical */}
					<View style={styles.stickyDivider} />

					{/* En-têtes tables scrollables */}
					<ScrollView
						ref={headerHScrollRef}
						horizontal
						scrollEnabled={false}
						showsHorizontalScrollIndicator={false}
					>
						{tableColumns.map(renderColHeader)}
					</ScrollView>
				</View>

				{/* ── Timeline ── */}
				<ScrollView
					style={styles.scrollContainer}
					contentContainerStyle={{ paddingBottom: 40 }}
					showsVerticalScrollIndicator={false}
				>
					<View style={{ flexDirection: "row" }}>
						{/* Colonne heures */}
						<View style={{ width: TIME_COL_WIDTH }}>
							{slots.map((slot) => (
								<View
									key={slot.startMin}
									style={[styles.timeLabelCell, { height: SLOT_HEIGHT }]}
								>
									<Text
										style={
											slot.startMin % 60 === 0
												? styles.timeLabelBold
												: styles.timeLabel
										}
									>
										{slot.label}
									</Text>
								</View>
							))}
						</View>

						{/* Colonne "Sans table" FIXE */}
						{renderColumn(unassignedCol, 0)}

						{/* Séparateur vertical */}
						<View style={styles.stickyDivider} />

						{/* Colonnes tables SCROLLABLES horizontalement */}
						<ScrollView
							ref={contentHScrollRef}
							horizontal
							nestedScrollEnabled
							showsHorizontalScrollIndicator={false}
							onScroll={(e) => {
								headerHScrollRef.current?.scrollTo({
									x: e.nativeEvent.contentOffset.x,
									animated: false,
								});
							}}
							scrollEventThrottle={16}
						>
							<View style={{ flexDirection: "row" }}>
								{tableColumns.map((col, i) => renderColumn(col, i + 1))}
							</View>
						</ScrollView>
					</View>
				</ScrollView>
			</View>
		);
	},
);

AgendaView.displayName = "AgendaView";
export default AgendaView;

// ─── Styles ───
const createStyles = (THEME) =>
	StyleSheet.create({
		container: {
			flex: 1,
		},
		headerRow: {
			flexDirection: "row",
			paddingHorizontal: 4,
			paddingBottom: 6,
			borderBottomWidth: 1,
			borderBottomColor: THEME.colors.border.subtle,
		},
		colHeader: {
			width: COL_WIDTH,
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "center",
			paddingVertical: 7,
			paddingHorizontal: 6,
			borderRadius: 8,
			borderWidth: 1,
			gap: 4,
			marginHorizontal: 2,
		},
		colHeaderText: {
			fontSize: 11,
			fontWeight: "700",
			color: THEME.colors.text.primary,
			letterSpacing: 0.2,
		},
		colCapacity: {
			fontSize: 10,
			color: THEME.colors.text.muted,
			fontWeight: "500",
		},
		badge: {
			borderRadius: 8,
			minWidth: 16,
			height: 16,
			alignItems: "center",
			justifyContent: "center",
			paddingHorizontal: 4,
		},
		badgeText: {
			fontSize: 10,
			fontWeight: "800",
			color: "#fff",
		},
		scrollContainer: {
			flex: 1,
		},
		timeLabelCell: {
			justifyContent: "flex-start",
			alignItems: "flex-end",
			paddingRight: 6,
			paddingTop: 2,
		},
		timeLabel: {
			fontSize: 10,
			color: THEME.colors.text.muted,
			fontWeight: "400",
		},
		timeLabelBold: {
			fontSize: 11,
			color: THEME.colors.text.secondary,
			fontWeight: "700",
		},
		stickyDivider: {
			width: 1,
			backgroundColor: "rgba(148,163,184,0.20)",
			marginHorizontal: 2,
		},
		column: {
			width: COL_WIDTH,
			position: "relative",
			borderRightWidth: 1,
			borderRightColor: "rgba(148,163,184,0.10)",
			marginHorizontal: 2,
		},
		slotCell: {
			position: "absolute",
			left: 0,
			right: 0,
			height: SLOT_HEIGHT,
			borderTopWidth: 1,
		},
		resaBlock: {
			position: "absolute",
			left: 3,
			right: 3,
			borderLeftWidth: 3,
			borderRadius: 7,
			paddingHorizontal: 7,
			paddingVertical: 4,
			justifyContent: "center",
			zIndex: 10,
		},
		resaBlockCritical: {
			borderWidth: 1,
			borderLeftWidth: 3,
			borderColor: "#EF4444",
		},
		resaName: {
			fontSize: 12,
			fontWeight: "700",
			color: THEME.colors.text.primary,
		},
		resaMeta: {
			fontSize: 10,
			color: THEME.colors.text.secondary,
			marginTop: 1,
		},		// ── IA gap badge ──
		gapBadge: {
			width: 16,
			height: 16,
			borderRadius: 8,
			backgroundColor: "rgba(245, 158, 11, 0.18)",
			alignItems: "center",
			justifyContent: "center",
			marginLeft: 2,
		},	});

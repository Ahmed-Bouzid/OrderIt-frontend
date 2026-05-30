/**
 * GanttView.jsx — Planning de salle Gantt horizontal
 *
 * Layout :
 *   Colonne gauche fixe = noms des tables
 *   Axe X horizontal scrollable = horaires (créneaux 30 min)
 *   Barres colorées = réservations (draggables)
 *
 * Drag & Drop :
 *   - Glisser une réservation → repositionne table + créneau
 *   - Snap sur la grille au lâcher
 *   - PUT /reservations/:id via callback onDrop
 *
 * Usage :
 *   <GanttView
 *     reservations={filteredReservations}
 *     tables={tables}
 *     selectedDate={selectedDate}
 *     onResaPress={fn}      // ouvre le SettingsModal
 *     onDrop={fn}           // async (id, { tableId, reservationTime }) => bool
 *     openTime="11:00"
 *     closeTime="23:00"
 *     turnoverTime={90}
 *   />
 */
import React, {
	useMemo,
	useRef,
	useState,
	useCallback,
	useEffect,
} from "react";
import {
	View,
	Text,
	ScrollView,
	Animated,
	PanResponder,
	StyleSheet,
	TouchableOpacity,
	Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../hooks/useTheme";

// ─── Constantes grille ───────────────────────────────────────────────────────
const ROW_HEIGHT = 64; // hauteur d'une ligne-table
const SLOT_WIDTH = 72; // largeur d'un créneau 30 min
const TABLE_COL_W = 72; // largeur de la colonne fixe des noms de tables
const SLOT_DURATION = 30; // minutes par créneau
const DEFAULT_OPEN = "11:00";
const DEFAULT_CLOSE = "23:00";
const HEADER_HEIGHT = 36;

// ─── Couleurs statut ─────────────────────────────────────────────────────────
const STATUS_COLORS = {
	"en attente": {
		bg: "rgba(251,191,36,0.22)",
		border: "#FBBF24",
		text: "#FBBF24",
	},
	actives: { bg: "rgba(251,191,36,0.22)", border: "#FBBF24", text: "#FBBF24" },
	present: { bg: "rgba(16,185,129,0.22)", border: "#10B981", text: "#10B981" },
	ouverte: { bg: "rgba(14,165,233,0.22)", border: "#0EA5E9", text: "#0EA5E9" },
	terminée: {
		bg: "rgba(100,116,139,0.18)",
		border: "#64748B",
		text: "#64748B",
	},
	termine: { bg: "rgba(100,116,139,0.18)", border: "#64748B", text: "#64748B" },
	annulée: { bg: "rgba(244,63,94,0.18)", border: "#F43F5E", text: "#F43F5E" },
	annulee: { bg: "rgba(244,63,94,0.18)", border: "#F43F5E", text: "#F43F5E" },
};
const DEFAULT_COLOR = STATUS_COLORS["en attente"];

// ─── Helpers ─────────────────────────────────────────────────────────────────
const toMin = (str) => {
	if (!str) return 0;
	const [h, m] = str.split(":").map(Number);
	return h * 60 + (m || 0);
};

const toHHMM = (min) => {
	const h = Math.floor(min / 60);
	const m = min % 60;
	return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

const getTableId = (r) => {
	const raw = r?.tableId;
	if (!raw) return null;
	if (typeof raw === "string") return raw;
	if (typeof raw === "object") return raw._id || null;
	return null;
};

/** "12:30" ou Date → minutes depuis minuit */
const resaStartMin = (resa) => {
	if (resa.reservationTime) return toMin(resa.reservationTime.substring(0, 5));
	if (resa.reservationDate) {
		const d = new Date(resa.reservationDate);
		return d.getHours() * 60 + d.getMinutes();
	}
	return null;
};

// ─── Sous-composant : barre de réservation draggable ─────────────────────────
const ResaBar = React.memo(
	({
		resa,
		startMin,
		tableIndex,
		allTables,
		onPress,
		onDrop,
		openMin,
		turnoverTime,
	}) => {
		const THEME = useTheme();

		const s = resaStartMin(resa);
		if (s === null) return null;

		const duration = resa.turnoverTime || turnoverTime || 90;
		const left = (s - openMin) * (SLOT_WIDTH / SLOT_DURATION);
		const width = Math.max(
			duration * (SLOT_WIDTH / SLOT_DURATION),
			SLOT_WIDTH * 0.8,
		);
		const top = tableIndex * ROW_HEIGHT + 6;

		const col =
			STATUS_COLORS[(resa.status || "").toLowerCase()] || DEFAULT_COLOR;

		// Animation position
		const pan = useRef(new Animated.ValueXY({ x: left, y: top })).current;

		const [dragging, setDragging] = useState(false);
		const [dropHighlight, setDropHighlight] = useState(null); // { tableIndex, minute }
		const startOffset = useRef({ x: left, y: top });

		// Reset position if resa changes
		useEffect(() => {
			pan.setValue({ x: left, y: top });
			startOffset.current = { x: left, y: top };
		}, [left, top]);

		const panResponder = useRef(
			PanResponder.create({
				onStartShouldSetPanResponder: () => true,
				onMoveShouldSetPanResponder: (_, gs) =>
					Math.abs(gs.dx) > 5 || Math.abs(gs.dy) > 5,

				onPanResponderGrant: () => {
					pan.setOffset({ x: pan.x._value, y: pan.y._value });
					pan.setValue({ x: 0, y: 0 });
					setDragging(true);
				},

				onPanResponderMove: (_, gs) => {
					pan.x.setValue(gs.dx);
					pan.y.setValue(gs.dy);

					// Calcul drop zone ciblée
					const curX = startOffset.current.x + gs.dx;
					const curY = startOffset.current.y + gs.dy;
					const snapMin =
						openMin +
						Math.round(curX / (SLOT_WIDTH / SLOT_DURATION) / SLOT_DURATION) *
							SLOT_DURATION;
					const snapTableIdx = Math.max(
						0,
						Math.min(allTables.length - 1, Math.round(curY / ROW_HEIGHT)),
					);
					setDropHighlight({ tableIndex: snapTableIdx, minute: snapMin });
				},

				onPanResponderRelease: (_, gs) => {
					pan.flattenOffset();
					setDragging(false);
					setDropHighlight(null);

					const finalX = startOffset.current.x + gs.dx;
					const finalY = startOffset.current.y + gs.dy;

					// Snap sur la grille
					const rawMin = openMin + finalX / (SLOT_WIDTH / SLOT_DURATION);
					const snappedMin = Math.round(rawMin / SLOT_DURATION) * SLOT_DURATION;
					const snappedTableIdx = Math.max(
						0,
						Math.min(allTables.length - 1, Math.round(finalY / ROW_HEIGHT)),
					);

					const newTable = allTables[snappedTableIdx];
					const newTime = toHHMM(snappedMin);
					const newPos = {
						x: (snappedMin - openMin) * (SLOT_WIDTH / SLOT_DURATION),
						y: snappedTableIdx * ROW_HEIGHT + 6,
					};

					// Confirm drop via callback
					onDrop?.(resa._id, {
						tableId: newTable._id,
						reservationTime: newTime,
					})
						.then((ok) => {
							if (!ok) {
								// Revenir à la position initiale si échec
								Animated.spring(pan, {
									toValue: { x: left, y: top },
									useNativeDriver: false,
								}).start();
							} else {
								// Animer vers la nouvelle position snappée
								Animated.spring(pan, {
									toValue: newPos,
									tension: 80,
									friction: 8,
									useNativeDriver: false,
								}).start(() => {
									startOffset.current = newPos;
								});
							}
						})
						.catch(() => {
							Animated.spring(pan, {
								toValue: { x: left, y: top },
								useNativeDriver: false,
							}).start();
						});
				},

				onPanResponderTerminate: () => {
					pan.flattenOffset();
					setDragging(false);
					setDropHighlight(null);
					Animated.spring(pan, {
						toValue: { x: left, y: top },
						useNativeDriver: false,
					}).start();
				},
			}),
		).current;

		return (
			<>
				{/* Highlight de la drop zone */}
				{dragging && dropHighlight && (
					<View
						pointerEvents="none"
						style={{
							position: "absolute",
							left:
								(dropHighlight.minute - openMin) * (SLOT_WIDTH / SLOT_DURATION),
							top: dropHighlight.tableIndex * ROW_HEIGHT,
							width,
							height: ROW_HEIGHT,
							backgroundColor: "rgba(245,158,11,0.12)",
							borderRadius: 10,
							borderWidth: 2,
							borderColor: "#F59E0B",
							borderStyle: "dashed",
						}}
					/>
				)}

				<Animated.View
					{...panResponder.panHandlers}
					style={[
						{
							position: "absolute",
							left: pan.x,
							top: pan.y,
							width,
							height: ROW_HEIGHT - 12,
							backgroundColor: col.bg,
							borderLeftWidth: 3,
							borderLeftColor: col.border,
							borderRadius: 10,
							paddingHorizontal: 8,
							paddingVertical: 4,
							justifyContent: "center",
							zIndex: dragging ? 999 : 10,
						},
						dragging && {
							shadowColor: col.border,
							shadowOffset: { width: 0, height: 6 },
							shadowOpacity: 0.5,
							shadowRadius: 12,
							elevation: 16,
							opacity: 0.95,
						},
					]}
				>
					<TouchableOpacity
						activeOpacity={0.85}
						onPress={() => !dragging && onPress?.(resa)}
					>
						<Text
							style={{
								color: col.text,
								fontWeight: "700",
								fontSize: 11,
								letterSpacing: 0.3,
							}}
							numberOfLines={1}
						>
							{resa.clientName || "—"}
						</Text>
						<Text
							style={{
								color: col.text,
								opacity: 0.75,
								fontSize: 10,
								marginTop: 1,
							}}
							numberOfLines={1}
						>
							{toHHMM(s)} · {resa.nbPersonnes || "?"}p
						</Text>
					</TouchableOpacity>
				</Animated.View>
			</>
		);
	},
);
ResaBar.displayName = "ResaBar";

// ─── Composant principal ──────────────────────────────────────────────────────
const GanttView = ({
	reservations = [],
	tables = [],
	selectedDate,
	onResaPress,
	onDrop,
	openTime,
	closeTime,
	turnoverTime = 90,
}) => {
	const THEME = useTheme();
	const styles = useMemo(() => createStyles(THEME), [THEME]);

	const openMin = toMin(openTime || DEFAULT_OPEN);
	const closeMin = toMin(closeTime || DEFAULT_CLOSE);

	// Créneaux de l'axe X
	const slots = useMemo(() => {
		const arr = [];
		for (let m = openMin; m < closeMin; m += SLOT_DURATION) {
			arr.push(m);
		}
		return arr;
	}, [openMin, closeMin]);

	const totalWidth = slots.length * SLOT_WIDTH;

	// Tables triées
	const sortedTables = useMemo(() => {
		return [...tables].sort((a, b) => {
			const parseNum = (t) => {
				const raw = t.number ?? t.name ?? "";
				const match = String(raw).match(/(\d+)/);
				return match ? parseInt(match[1], 10) : Infinity;
			};
			return parseNum(a) - parseNum(b);
		});
	}, [tables]);

	// Réservations actives du jour
	const dayReservations = useMemo(() => {
		const statuts = ["en attente", "actives", "present", "ouverte"];
		return reservations.filter((r) =>
			statuts.includes((r.status || "").toLowerCase()),
		);
	}, [reservations]);

	// Table label
	const tableLabel = (t) =>
		t.number?.toString() || t.name || `T${(t._id || "").slice(-3)}`;

	// Scroll sync header ↔ content
	const headerScrollRef = useRef(null);
	const contentScrollRef = useRef(null);

	const onHeaderScroll = useCallback((e) => {
		contentScrollRef.current?.scrollTo({
			x: e.nativeEvent.contentOffset.x,
			animated: false,
		});
	}, []);

	const onContentScroll = useCallback((e) => {
		headerScrollRef.current?.scrollTo({
			x: e.nativeEvent.contentOffset.x,
			animated: false,
		});
	}, []);

	// Heure courante (ligne rouge Now)
	const nowMin = useMemo(() => {
		const now = new Date();
		const sel = selectedDate ? new Date(selectedDate) : new Date();
		const isToday =
			now.getFullYear() === sel.getFullYear() &&
			now.getMonth() === sel.getMonth() &&
			now.getDate() === sel.getDate();
		if (!isToday) return null;
		return now.getHours() * 60 + now.getMinutes();
	}, [selectedDate]);

	const nowLeft =
		nowMin !== null ? (nowMin - openMin) * (SLOT_WIDTH / SLOT_DURATION) : null;

	// Hauteur du conteneur de contenu
	const gridHeight = Math.max(sortedTables.length * ROW_HEIGHT, 80);

	return (
		<View style={styles.container}>
			{/* ── Ligne d'en-tête (horaires) ── */}
			<View style={styles.headerRow}>
				{/* Coin supérieur gauche fixe */}
				<View style={[styles.tableColFixed, { height: HEADER_HEIGHT }]}>
					<Ionicons
						name="restaurant"
						size={14}
						color={THEME.colors.text.muted}
					/>
				</View>

				{/* Horaires scrollables */}
				<ScrollView
					ref={headerScrollRef}
					horizontal
					showsHorizontalScrollIndicator={false}
					scrollEnabled={false}
					style={{ flex: 1 }}
					contentContainerStyle={{ width: totalWidth }}
				>
					{slots.map((min) => (
						<View key={min} style={styles.slotHeader}>
							{min % 60 === 0 ? (
								<Text style={styles.slotLabelBold}>{toHHMM(min)}</Text>
							) : (
								<Text style={styles.slotLabelLight}>·</Text>
							)}
						</View>
					))}
				</ScrollView>
			</View>

			{/* ── Corps du Gantt ── */}
			<ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
				<View style={{ flexDirection: "row" }}>
					{/* Colonne gauche fixe : noms tables */}
					<View style={[styles.tableColFixed, { height: gridHeight }]}>
						{sortedTables.map((t) => (
							<View
								key={t._id}
								style={[
									styles.tableLabelCell,
									{ borderTopColor: THEME.colors.border.subtle },
								]}
							>
								<Text style={styles.tableLabelText} numberOfLines={1}>
									{tableLabel(t)}
								</Text>
								{t.capacity && (
									<View style={styles.capacityBadge}>
										<Text style={styles.capacityText}>{t.capacity}</Text>
									</View>
								)}
							</View>
						))}
					</View>

					{/* Grille + barres de réservation */}
					<ScrollView
						ref={contentScrollRef}
						horizontal
						showsHorizontalScrollIndicator={true}
						onScroll={onContentScroll}
						scrollEventThrottle={16}
						style={{ flex: 1 }}
						contentContainerStyle={{ width: totalWidth }}
					>
						{/* Fond de grille */}
						<View
							style={{
								width: totalWidth,
								height: gridHeight,
								position: "relative",
							}}
						>
							{/* Lignes horizontales des tables */}
							{sortedTables.map((t, idx) => (
								<View
									key={t._id + "_row"}
									style={{
										position: "absolute",
										top: idx * ROW_HEIGHT,
										left: 0,
										right: 0,
										height: ROW_HEIGHT,
										borderTopWidth: 1,
										borderTopColor: THEME.colors.border.subtle,
										flexDirection: "row",
									}}
								>
									{/* Colonnes créneaux : fond alternant légèrement pour les heures pleines */}
									{slots.map((min) => (
										<View
											key={min}
											style={{
												width: SLOT_WIDTH,
												height: ROW_HEIGHT,
												borderRightWidth: 1,
												borderRightColor:
													min % 60 === 0
														? "rgba(148,163,184,0.18)"
														: "rgba(148,163,184,0.07)",
												backgroundColor:
													min % 60 === 0
														? "transparent"
														: "rgba(30,41,59,0.04)",
											}}
										/>
									))}
								</View>
							))}

							{/* Ligne rouge "Now" */}
							{nowLeft !== null && nowLeft >= 0 && nowLeft <= totalWidth && (
								<View
									pointerEvents="none"
									style={{
										position: "absolute",
										left: nowLeft,
										top: 0,
										bottom: 0,
										width: 2,
										backgroundColor: "#EF4444",
										zIndex: 50,
									}}
								>
									<View
										style={{
											position: "absolute",
											top: 0,
											left: -5,
											width: 12,
											height: 12,
											borderRadius: 6,
											backgroundColor: "#EF4444",
										}}
									/>
								</View>
							)}

							{/* Barres de réservation draggables */}
							{dayReservations.map((resa) => {
								const tid = getTableId(resa);
								const tableIdx = sortedTables.findIndex((t) => t._id === tid);
								if (tableIdx === -1) return null;

								return (
									<ResaBar
										key={resa._id}
										resa={resa}
										startMin={resaStartMin(resa)}
										tableIndex={tableIdx}
										allTables={sortedTables}
										onPress={onResaPress}
										onDrop={onDrop}
										openMin={openMin}
										turnoverTime={turnoverTime}
									/>
								);
							})}
						</View>
					</ScrollView>
				</View>
			</ScrollView>
		</View>
	);
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const createStyles = (THEME) =>
	StyleSheet.create({
		container: {
			flex: 1,
			backgroundColor: THEME.colors.background.dark,
		},
		headerRow: {
			flexDirection: "row",
			height: HEADER_HEIGHT,
			borderBottomWidth: 1,
			borderBottomColor: THEME.colors.border.subtle,
			backgroundColor: THEME.colors.background.elevated,
		},
		tableColFixed: {
			width: TABLE_COL_W,
			backgroundColor: THEME.colors.background.elevated,
			borderRightWidth: 1,
			borderRightColor: THEME.colors.border.subtle,
			alignItems: "center",
			justifyContent: "center",
		},
		slotHeader: {
			width: SLOT_WIDTH,
			height: HEADER_HEIGHT,
			alignItems: "flex-start",
			justifyContent: "center",
			paddingLeft: 6,
			borderRightWidth: 1,
			borderRightColor: "rgba(148,163,184,0.12)",
		},
		slotLabelBold: {
			fontSize: 11,
			fontWeight: "700",
			color: THEME.colors.text.secondary,
		},
		slotLabelLight: {
			fontSize: 14,
			color: THEME.colors.text.muted,
			opacity: 0.4,
		},
		tableLabelCell: {
			width: TABLE_COL_W,
			height: ROW_HEIGHT,
			paddingHorizontal: 8,
			paddingVertical: 6,
			justifyContent: "center",
			borderTopWidth: 1,
		},
		tableLabelText: {
			fontSize: 12,
			fontWeight: "700",
			color: THEME.colors.text.primary,
		},
		capacityBadge: {
			flexDirection: "row",
			alignItems: "center",
			marginTop: 2,
		},
		capacityText: {
			fontSize: 10,
			color: THEME.colors.text.muted,
			fontWeight: "500",
		},
	});

GanttView.displayName = "GanttView";
export default GanttView;

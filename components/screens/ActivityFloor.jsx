/**
 * 🏪 ActivityFloor.jsx — Mode Comptoir : Plan de salle interactif
 *
 * Affiche le plan de salle avec état temps réel des tables
 * Tap sur table → ouvre détail + prise de commande
 * Réutilise FloorPlanModal en mode "service" (pas d'édition)
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
	View,
	Text,
	Image,
	StyleSheet,
	TouchableOpacity,
	Dimensions,
	ActivityIndicator,
	PanResponder,
	Animated,
	Alert,
	TextInput,
	Modal,
	Pressable,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../hooks/useTheme";
import useThemeStore from "../../src/stores/useThemeStore";
import useCounterTableStore from "../../src/stores/useCounterTableStore";
import { useSocketContext } from "../../src/stores/SocketContext";
import counterService from "../../services/counterService";
import cashShiftService from "../../services/cashShiftService";
import { useAuthFetch } from "../../hooks/useAuthFetch";
import useUserStore from "../../src/stores/useUserStore";
import useReservationStore from "../../src/stores/useReservationStore";

// Composants réutilisés
import FloorPlanModal from "../floor/FloorPlanModal";
import TableDetailModal from "./modals/TableDetailModal";
import { usePinGuard } from "../../hooks/usePinGuard";

const SCREEN_W = Dimensions.get("window").width;
const IS_PHONE = SCREEN_W < 600;
const CARD_SIZE = IS_PHONE ? 336 : 384;
const CARD_GAP = 12;
const CANVAS_PADDING = 12;
/** Formate l'affichage du numéro de table */
const formatTableLabel = (number) =>
	/^\d+$/.test(String(number ?? "")) ? `T${number}` : String(number ?? "?");

/** Formate le badge "prochaine réservation" : Marie · 13:00 / dem. 13:00 / 15/06 13:00 */
const formatResaBadge = (reservation) => {
	const resaDate = new Date(reservation.reservationDate);
	const now = new Date();
	const name = reservation.clientName ? reservation.clientName.slice(0, 10) : "";
	const time = reservation.reservationTime || "";
	const todayStr = now.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
	const resaStr = resaDate.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
	const tomorrowDate = new Date(now);
	tomorrowDate.setDate(now.getDate() + 1);
	const tomorrowStr = tomorrowDate.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
	if (resaStr === todayStr) return `${name} · ${time}`;
	if (resaStr === tomorrowStr) return `${name} · dem. ${time}`;
	const day = resaDate.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
	return `${name} · ${day} ${time}`;
};

// ─── EditTableModal ──────────────────────────────────────────────────────────
const EditTableModal = ({ visible, table, onClose, onSave }) => {
	const [numVal, setNumVal] = useState("");
	const [capVal, setCapVal] = useState("");

	useEffect(() => {
		if (table && visible) {
			setNumVal(String(table.number ?? ""));
			setCapVal(String(table.capacity ?? "4"));
		}
	}, [table, visible]);

	const handleSave = () => {
		const cap = parseInt(capVal, 10);
		if (!numVal.trim()) {
			Alert.alert("Erreur", "Le numéro de table est requis");
			return;
		}
		if (isNaN(cap) || cap < 1) {
			Alert.alert("Erreur", "La capacité doit être ≥ 1");
			return;
		}
		onSave(numVal.trim(), cap);
	};

	return (
		<Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
			<View style={etStyles.overlay}>
				<View style={etStyles.sheet}>
					<Text style={etStyles.title}>Modifier la table</Text>

					<Text style={etStyles.label}>Numéro / Nom</Text>
					<TextInput
						style={etStyles.input}
						value={numVal}
						onChangeText={setNumVal}
						placeholder="Ex: 1 ou T1"
						placeholderTextColor="#64748B"
						autoCapitalize="none"
					/>

					<Text style={etStyles.label}>Capacité (places)</Text>
					<TextInput
						style={etStyles.input}
						value={capVal}
						onChangeText={setCapVal}
						keyboardType="number-pad"
						placeholder="Ex: 4"
						placeholderTextColor="#64748B"
					/>

					<View style={etStyles.buttons}>
						<TouchableOpacity style={etStyles.btnCancel} onPress={onClose}>
							<Text style={etStyles.btnCancelText}>Annuler</Text>
						</TouchableOpacity>
						<TouchableOpacity style={etStyles.btnSave} onPress={handleSave}>
							<Text style={etStyles.btnSaveText}>Enregistrer</Text>
						</TouchableOpacity>
					</View>
				</View>
			</View>
		</Modal>
	);
};

const etStyles = StyleSheet.create({
	overlay: {
		flex: 1,
		backgroundColor: "rgba(0,0,0,0.65)",
		justifyContent: "center",
		alignItems: "center",
	},
	sheet: {
		backgroundColor: "#1E293B",
		borderRadius: 18,
		padding: 24,
		width: Math.min(SCREEN_W - 48, 320),
		borderWidth: 1,
		borderColor: "rgba(255,255,255,0.08)",
	},
	title: {
		color: "#F8FAFC",
		fontSize: 17,
		fontWeight: "700",
		marginBottom: 18,
	},
	label: {
		color: "#94A3B8",
		fontSize: 12,
		fontWeight: "600",
		marginBottom: 6,
		textTransform: "uppercase",
		letterSpacing: 0.5,
	},
	input: {
		backgroundColor: "rgba(255,255,255,0.06)",
		borderRadius: 10,
		borderWidth: 1,
		borderColor: "rgba(255,255,255,0.1)",
		color: "#F8FAFC",
		fontSize: 15,
		paddingHorizontal: 14,
		paddingVertical: 10,
		marginBottom: 14,
	},
	buttons: {
		flexDirection: "row",
		gap: 10,
		marginTop: 6,
	},
	btnCancel: {
		flex: 1,
		paddingVertical: 12,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: "rgba(255,255,255,0.12)",
		alignItems: "center",
	},
	btnCancelText: {
		color: "#94A3B8",
		fontWeight: "600",
		fontSize: 14,
	},
	btnSave: {
		flex: 1,
		paddingVertical: 12,
		borderRadius: 10,
		backgroundColor: "#FBBF24",
		alignItems: "center",
	},
	btnSaveText: {
		color: "#0F172A",
		fontWeight: "700",
		fontSize: 14,
	},
});

// ─── ServerPickerModal ────────────────────────────────────────────────────────
const WAITER_COLORS = ["#6366F1","#EC4899","#14B8A6","#F59E0B","#3B82F6","#10B981","#EF4444","#8B5CF6","#F97316","#06B6D4"];

const getInitials = (name) => {
	const parts = String(name ?? "?").trim().split(/\s+/);
	return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
};

const buildDisplayNames = (serverList) => {
	const firstNameCount = {};
	for (const srv of serverList) {
		const first = (srv.name || "").trim().split(/\s+/)[0] || "";
		if (first) firstNameCount[first] = (firstNameCount[first] || 0) + 1;
	}
	const map = {};
	for (const srv of serverList) {
		if (!srv._id) continue;
		const parts = (srv.name || "").trim().split(/\s+/);
		const first = parts[0] || "Serveur";
		const lastInitial = parts[1]?.[0]?.toUpperCase();
		map[srv._id] = (firstNameCount[first] > 1 && lastInitial) ? `${first} ${lastInitial}.` : first;
	}
	return map;
};

const ServerPickerModal = ({ visible, onClose, onConfirm, servers, selectedWaiter, onSelectWaiter, currentUser }) => {
	const displayNames = useMemo(() => buildDisplayNames(servers), [servers]);
	return (
	<Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
			<View style={spStyles.overlay}>
				<View style={spStyles.sheet}>
					<Text style={spStyles.title}>Qui prend cette table ?</Text>

					{servers.length === 0 ? (
						<View style={spStyles.currentUserBox}>
							<View style={[spStyles.avatar, { backgroundColor: "#6366F1" }, spStyles.avatarSelected]}>
								<Ionicons name="checkmark" size={22} color="#fff" />
							</View>
							<Text style={spStyles.currentUserName}>{currentUser?.name ?? "Vous"}</Text>
							<Text style={spStyles.currentUserRole}>Ouverture en votre nom</Text>
						</View>
					) : (
						<View style={spStyles.grid}>
							{servers.map((s, i) => {
								const isSel = selectedWaiter?._id === s._id;
								const color = WAITER_COLORS[i % WAITER_COLORS.length];
								return (
									<TouchableOpacity
										key={s._id}
										style={spStyles.serverItem}
										onPress={() => onSelectWaiter(s)}
										activeOpacity={0.75}
									>
										<View style={[
											spStyles.avatar,
											!s.avatar && { backgroundColor: color },
											isSel && spStyles.avatarSelected,
										]}>
											{s.avatar ? (
												<>
													<Image source={{ uri: s.avatar }} style={spStyles.avatarPhoto} />
													{isSel && (
														<View style={spStyles.avatarCheckOverlay}>
															<Ionicons name="checkmark" size={22} color="#fff" />
														</View>
													)}
												</>
											) : isSel ? (
												<Ionicons name="checkmark" size={22} color="#fff" />
											) : (
												<Text style={spStyles.avatarText}>{getInitials(s.name)}</Text>
											)}
										</View>
										<Text
											style={[spStyles.serverName, isSel && spStyles.serverNameSelected]}
											numberOfLines={1}
										>
											{displayNames[s._id] || s.name}
										</Text>
									</TouchableOpacity>
								);
							})}
						</View>
					)}

					<View style={spStyles.buttons}>
						<TouchableOpacity style={spStyles.btnCancel} onPress={onClose}>
							<Text style={spStyles.btnCancelText}>Annuler</Text>
						</TouchableOpacity>
						<TouchableOpacity
							style={[spStyles.btnOpen, (servers.length > 0 && !selectedWaiter) && spStyles.btnOpenDisabled]}
							onPress={(servers.length === 0 || selectedWaiter) ? onConfirm : undefined}
							activeOpacity={(servers.length === 0 || selectedWaiter) ? 0.8 : 1}
						>
							<Text style={spStyles.btnOpenText}>Ouvrir la table</Text>
						</TouchableOpacity>
					</View>
				</View>
			</View>
		</Modal>
	);
};

const spStyles = StyleSheet.create({
	overlay: {
		flex: 1,
		backgroundColor: "rgba(0,0,0,0.7)",
		justifyContent: "center",
		alignItems: "center",
		paddingHorizontal: 24,
	},
	sheet: {
		backgroundColor: "#1E293B",
		borderRadius: 20,
		padding: 24,
		width: "100%",
		maxWidth: 400,
		borderWidth: 1,
		borderColor: "rgba(255,255,255,0.08)",
	},
	title: {
		color: "#F8FAFC",
		fontSize: 18,
		fontWeight: "700",
		marginBottom: 20,
		textAlign: "center",
	},
	emptyText: {
		color: "#64748B",
		fontSize: 14,
		textAlign: "center",
		marginVertical: 20,
	},
	currentUserBox: {
		alignItems: "center",
		paddingVertical: 16,
		marginBottom: 8,
	},
	currentUserName: {
		color: "#FBBF24",
		fontSize: 15,
		fontWeight: "700",
		marginTop: 8,
	},
	currentUserRole: {
		color: "#64748B",
		fontSize: 12,
		marginTop: 3,
	},
	grid: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: 12,
		justifyContent: "center",
		marginBottom: 24,
	},
	serverItem: {
		alignItems: "center",
		width: 72,
	},
	avatar: {
		width: 64,
		height: 64,
		borderRadius: 32,
		justifyContent: "center",
		alignItems: "center",
		marginBottom: 6,
	},
	avatarSelected: {
		borderWidth: 3,
		borderColor: "#FBBF24",
		shadowColor: "#FBBF24",
		shadowOffset: { width: 0, height: 0 },
		shadowOpacity: 0.6,
		shadowRadius: 8,
		elevation: 6,
	},
	avatarText: {
		color: "#fff",
		fontSize: 20,
		fontWeight: "700",
	},
	serverName: {
		color: "#94A3B8",
		fontSize: 12,
		fontWeight: "500",
		textAlign: "center",
	},
	serverNameSelected: {
		color: "#FBBF24",
		fontWeight: "700",
	},
	buttons: {
		flexDirection: "row",
		gap: 10,
	},
	btnCancel: {
		flex: 1,
		paddingVertical: 13,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: "rgba(255,255,255,0.12)",
		alignItems: "center",
	},
	btnCancelText: {
		color: "#94A3B8",
		fontWeight: "600",
		fontSize: 14,
	},
	btnOpen: {
		flex: 2,
		paddingVertical: 13,
		borderRadius: 12,
		backgroundColor: "#FBBF24",
		alignItems: "center",
	},
	btnOpenDisabled: {
		backgroundColor: "rgba(251,191,36,0.3)",
	},
	btnOpenText: {
		color: "#0F172A",
		fontWeight: "700",
		fontSize: 14,
	},
	avatarPhoto: {
		width: 64,
		height: 64,
		borderRadius: 32,
	},
	avatarCheckOverlay: {
		...StyleSheet.absoluteFillObject,
		borderRadius: 32,
		backgroundColor: "rgba(0,0,0,0.45)",
		alignItems: "center",
		justifyContent: "center",
	},
});

// ─── DraggableTableCard ──────────────────────────────────────────────────────
const LANG_FLAGS = {
	en: "🇬🇧",
	it: "🇮🇹",
	es: "🇪🇸",
	de: "🇩🇪",
	zh: "🇨🇳",
	ja: "🇯🇵",
	nl: "🇳🇱",
};

const FALLBACK_POSITIONS = [
	{ x: 60, y: 40 }, { x: 300, y: 100 }, { x: 645, y: 35 },
	{ x: 975, y: 50 }, { x: 60, y: 280 }, { x: 340, y: 280 },
	{ x: 620, y: 290 }, { x: 900, y: 280 }, { x: 300, y: 520 },
	{ x: 700, y: 520 }, { x: 100, y: 700 },
];

const DraggableTableCard = ({ table, session, tableIndex, upcomingReservations = [], onPress, onPositionSave, onRegisterPan }) => {
	const [isDragging, setIsDragging] = useState(false);

	const isFree = !session;
	const isBill = session?.billStatus === "bill_requested";
	const isOccupied = session?.billStatus === "open";
	const dotCount = Math.min(session?.itemsCount ?? 0, 3);
	const isLarge = (table?.capacity ?? 4) >= 6;
	const cardW = isLarge ? 231 : 168;
	const label = formatTableLabel(table?.number);

	//  Trouver la prochaine réservation pour cette table
	const nextReservation = useMemo(() => {
		if (!table?._id || !upcomingReservations.length) return null;
		
		const tableIdStr = table._id.toString();
		return upcomingReservations
			.filter((r) => {
				const rTableId = r.tableId?._id?.toString() || r.tableId?.toString();
				const rTableIds = (r.tableIds || []).map(tid => tid?._id?.toString() || tid?.toString());
				return rTableId === tableIdStr || rTableIds.includes(tableIdStr);
			})
			.sort((a, b) => new Date(a.reservationDate) - new Date(b.reservationDate))[0];
	}, [table, upcomingReservations]);

	const initPos = useMemo(() => {
		if (table?.position?.x != null && table?.position?.y != null) {
			return { x: table.position.x, y: table.position.y };
		}
		if (tableIndex < FALLBACK_POSITIONS.length) return FALLBACK_POSITIONS[tableIndex];
		const col = tableIndex % 5;
		const row = Math.floor(tableIndex / 5);
		return { x: 40 + col * 175, y: 30 + row * 182 };
	}, []); // volontairement stable — init position uniquement

	const pan = useRef(new Animated.ValueXY(initPos)).current;
	const scaleAnim = useRef(new Animated.Value(1)).current;
	const dragActiveRef = useRef(false);
	const longPressTimer = useRef(null);
	const latestDxRef = useRef(0);
	const latestDyRef = useRef(0);
	const dxAtDragStartRef = useRef(0);
	const dyAtDragStartRef = useRef(0);

	// Refs stables pour callbacks (évite closure stale dans PanResponder)
	const onPressRef = useRef(onPress);
	const onPositionSaveRef = useRef(onPositionSave);
	const tableRef = useRef(table);
	useEffect(() => { onPressRef.current = onPress; }, [onPress]);
	useEffect(() => { onPositionSaveRef.current = onPositionSave; }, [onPositionSave]);
	useEffect(() => { tableRef.current = table; }, [table]);
	// Expose pan + largeur au parent pour détection d'overlap
	useEffect(() => {
		if (onRegisterPan) onRegisterPan(table._id, pan, cardW);
	}, []); // eslint-disable-line react-hooks/exhaustive-deps

	const panResponder = useRef(
		PanResponder.create({
			onStartShouldSetPanResponder: () => true,
			onMoveShouldSetPanResponder: () => true,
			onPanResponderGrant: () => {
				latestDxRef.current = 0;
				latestDyRef.current = 0;
				// Déclenche le drag après 500ms de pression maintenue
				longPressTimer.current = setTimeout(() => {
					dragActiveRef.current = true;
					dxAtDragStartRef.current = latestDxRef.current;
					dyAtDragStartRef.current = latestDyRef.current;
					pan.setOffset({ x: pan.x._value, y: pan.y._value });
					pan.setValue({ x: 0, y: 0 });
					setIsDragging(true);
					Animated.spring(scaleAnim, {
						toValue: 1.08,
						useNativeDriver: true,
						friction: 7,
					}).start();
				}, 500);
			},
			onPanResponderMove: (evt, gestureState) => {
				latestDxRef.current = gestureState.dx;
				latestDyRef.current = gestureState.dy;
				// Annule le long press si le doigt bouge trop vite
				if (!dragActiveRef.current && Math.abs(gestureState.dx) + Math.abs(gestureState.dy) > 8) {
					clearTimeout(longPressTimer.current);
				}
				if (dragActiveRef.current) {
					pan.x.setValue(gestureState.dx - dxAtDragStartRef.current);
					pan.y.setValue(gestureState.dy - dyAtDragStartRef.current);
				}
			},
			onPanResponderRelease: (evt, gestureState) => {
				clearTimeout(longPressTimer.current);
				const moved = Math.abs(gestureState.dx) + Math.abs(gestureState.dy);
				if (dragActiveRef.current) {
					dragActiveRef.current = false;
					pan.flattenOffset();
					const finalX = Math.max(0, pan.x._value);
					const finalY = Math.max(0, pan.y._value);
					pan.x.setValue(finalX);
					pan.y.setValue(finalY);
					setIsDragging(false);
					Animated.spring(scaleAnim, {
						toValue: 1,
						useNativeDriver: true,
						friction: 7,
					}).start();
					if (moved > 4) {
						onPositionSaveRef.current?.(tableRef.current._id, { x: finalX, y: finalY });
					}
				} else if (moved < 8) {
					onPressRef.current?.();
				}
			},
			onPanResponderTerminate: () => {
				clearTimeout(longPressTimer.current);
				if (dragActiveRef.current) {
					dragActiveRef.current = false;
					pan.flattenOffset();
					setIsDragging(false);
					Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, friction: 7 }).start();
				}
			},
		}),
	).current;

	return (
		<Animated.View
			style={[
				dcStyles.card,
				{
					width: cardW,
					transform: [
						{ translateX: pan.x },
						{ translateY: pan.y },
						{ scale: scaleAnim },
					],
				},
				isFree && dcStyles.cardFree,
				isOccupied && dcStyles.cardOccupied,
				isBill && dcStyles.cardBill,
				isDragging && dcStyles.cardDragging,
			]}
			{...panResponder.panHandlers}
		>
			{/* Numéro de table */}
			<Text
				style={[
					dcStyles.label,
					isFree && dcStyles.labelFree,
					isOccupied && dcStyles.labelOccupied,
					isBill && dcStyles.labelBill,
				]}
			>
				{label}
			</Text>

			{/* Contenu selon statut */}
			{isFree ? (
				<Text style={dcStyles.statusFree}>libre</Text>
			) : isBill ? (
				<>
					<Text style={dcStyles.dotsGold}>€</Text>
					<Text style={dcStyles.amountBill}>
						{session.totalAmount?.toFixed(2) ?? "0.00"} €
					</Text>
				</>
			) : (
				<>
					<Text style={dcStyles.dotsGreen}>
						{dotCount === 0 ? "···" : "●".repeat(dotCount)}
					</Text>
					<Text style={dcStyles.amountOccupied}>
						{session.totalAmount?.toFixed(2) ?? "0.00"} €
					</Text>
				</>
			)}

			{/* 👤 Badge client : prénom + drapeau langue (si ≠ fr) */}
			{!isFree && session?.clientName ? (
				<View style={dcStyles.clientBadge}>
					<Text style={dcStyles.clientName} numberOfLines={1}>
						{session.clientName.slice(0, 12)}
						{session.clientLang && session.clientLang !== "fr" && LANG_FLAGS[session.clientLang]
							? ` ${LANG_FLAGS[session.clientLang]}`
							: ""}
					</Text>
				</View>
			) : null}

			{/* Point de couleur coin sup droit */}
			<View
				style={[
					dcStyles.statusDot,
					{ backgroundColor: isFree ? "#60A5FA" : isBill ? "#F87171" : "#4ADE80" },
				]}
			/>

			{/* 📅 Badge réservation à venir (sous la carte) */}
			{nextReservation && (
				<View style={dcStyles.reservationBadge}>
					<Text style={dcStyles.reservationText} numberOfLines={1}>
						{formatResaBadge(nextReservation)}
					</Text>
				</View>
			)}
		</Animated.View>
	);
};

const dcStyles = StyleSheet.create({
	card: {
		position: "absolute",
		height: 168,
		borderRadius: 17,
		justifyContent: "center",
		alignItems: "center",
		gap: 6,
		borderWidth: 1,
	},
	cardFree: {
		backgroundColor: "rgba(59,130,246,0.1)",
		borderColor: "rgba(96,165,250,0.45)",
	},
	cardOccupied: {
		backgroundColor: "rgba(74,222,128,0.1)",
		borderColor: "rgba(74,222,128,0.45)",
	},
	cardBill: {
		backgroundColor: "rgba(239,68,68,0.13)",
		borderColor: "rgba(248,113,113,0.55)",
	},
	statusDot: {
		position: "absolute",
		top: 10,
		right: 10,
		width: 10,
		height: 10,
		borderRadius: 5,
	},
	cardDragging: {
		borderColor: "#FBBF24",
		borderWidth: 2,
		shadowColor: "#FBBF24",
		shadowOffset: { width: 0, height: 0 },
		shadowOpacity: 0.55,
		shadowRadius: 10,
		elevation: 10,
		zIndex: 999,
	},
	label: {
		fontSize: 20,
		fontWeight: "700",
	},
	labelFree: { color: "#60A5FA" },
	labelOccupied: { color: "#4ADE80" },
	labelBill: { color: "#F87171" },
	statusFree: {
		fontSize: 13,
		color: "#60A5FA",
		fontWeight: "500",
	},
	dotsGreen: {
		fontSize: 14,
		color: "#4ADE80",
		letterSpacing: 6,
	},
	dotsGold: {
		fontSize: 20,
		color: "#F87171",
		fontWeight: "700",
	},
	amountOccupied: {
		fontSize: 15,
		fontWeight: "600",
		color: "#4ADE80",
	},
	amountBill: {
		fontSize: 15,
		fontWeight: "600",
		color: "#F87171",
	},
	reservationBadge: {
		position: "absolute",
		bottom: -22,
		left: 0,
		right: 0,
		alignItems: "center",
		paddingHorizontal: 8,
	},
	reservationText: {
		fontSize: 11,
		fontStyle: "italic",
		color: "#94A3B8",
		fontWeight: "500",
	},
	clientBadge: {
		position: "absolute",
		bottom: 8,
		left: 0,
		right: 0,
		alignItems: "center",
		paddingHorizontal: 6,
	},
	clientName: {
		fontSize: 12,
		fontWeight: "600",
		color: "rgba(255,255,255,0.75)",
	},
});

const ActivityFloor = ({ restaurantInfo }) => {
	const THEME = useTheme();
	const { themeMode } = useThemeStore();
	const { socket: socketHookObj, connected: socketConnected } = useSocketContext();
	const socket = socketHookObj?.socket ?? null;
	const isConnected = () => socketConnected;

	const authFetch = useAuthFetch();

	// ⭐ Debounce ref — empêche les appels rafales (reconnexions socket, etc.)
	const refreshDebounceTimer = useRef(null);

	const [restaurantId, setRestaurantId] = useState(null);
	const [tables, setTables] = useState([]);
	const [showTableDetail, setShowTableDetail] = useState(false);
	const [isLoadingTables, setIsLoadingTables] = useState(true);
	const [activeFilter, setActiveFilter] = useState("Toutes");
	const [editModalTable, setEditModalTable] = useState(null); // {tableId, table}
	const [layoutKey, setLayoutKey] = useState(0);
	const [upcomingReservations, setUpcomingReservations] = useState([]);
	// Z de caisse déplacé dans Réglages → Comptabilité
	const isManager = useUserStore((state) => state.role === "admin" || state.userType === "admin");

	// ─── Swap de tables ───────────────────────────────────────
	const [swapCandidates, setSwapCandidates] = useState(null); // { idA, idB }
	const panRefsMap = useRef({}); // tableId → { pan, cardW }
	const tablesRef = useRef([]);
	useEffect(() => { tablesRef.current = tables; }, [tables]);

	// Utilisateur actuel (fallback waiter si pas de serveurs)
	const currentUserId = useUserStore((state) => state.userId);
	const currentUserEmail = useUserStore((state) => state.email);
	const currentUser = useMemo(() => ({
		_id: currentUserId,
		name: currentUserEmail?.split("@")[0] ?? "Moi",
	}), [currentUserId, currentUserEmail]);

	// ─── Serveurs (mode comptoir) ─────────────────────────────
	const [servers, setServers] = useState([]);
	const [serverPickerTableId, setServerPickerTableId] = useState(null);
	const [selectedWaiter, setSelectedWaiter] = useState(null);
	const [rooms, setRooms] = useState([]);
	const [selectedRoomIndex, setSelectedRoomIndex] = useState(-1); // -1 = toutes les tables
	const selectedRoom = selectedRoomIndex; // compatibilité avec les usages existants
	const [showFloorPlan, setShowFloorPlan] = useState(false);
	const [showDebugPanel, setShowDebugPanel] = useState(false);
	const [showForceQuit, setShowForceQuit] = useState(false);
	const [forceQuitLoading, setForceQuitLoading] = useState(null); // sessionId en cours
	const [hasActiveShift, setHasActiveShift] = useState(null); // null = non vérifié, true/false
	const { PinModal, requirePin } = usePinGuard();
	const [selectedTableId, setSelectedTableId] = useState(null);

	// Store
	const rawSessions = useCounterTableStore((state) => state.sessions[restaurantId]);
	const activeSessions = useMemo(() => rawSessions || [], [rawSessions]);
	const reservations = useReservationStore((state) => state.reservations);

	const stats = useMemo(
		() => ({
			total: activeSessions.length,
			open: activeSessions.filter((s) => s.billStatus === "open").length,
			billRequested: activeSessions.filter((s) => s.billStatus === "bill_requested").length,
			totalAmount: activeSessions.reduce((sum, s) => sum + (s.totalAmount || 0), 0),
		}),
		[activeSessions],
	);

	/**
	 * Vérifie s'il y a une réservation prévue dans les 2 prochaines heures sur cette table
	 */
	const checkUpcomingReservation = useCallback((tableId) => {
		const now = new Date();
		const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);
		
		return reservations.find((r) => {
			// ✅ Skip si pas de table assignée (réservations web sans table)
			if (!r.tableId) return false;
			
			// Vérifier si c'est pour cette table
			const resaTableId = typeof r.tableId === 'object' ? r.tableId._id : r.tableId;
			if (resaTableId !== tableId) return false;
			
			// Vérifier si c'est une réservation active (en attente ou confirmée)
			if (!['en attente', 'ouverte', 'pending', 'confirmed'].includes(r.status)) return false;
			
			// Vérifier si la réservation est dans les 2 prochaines heures
			const resaDate = new Date(r.reservationDate);
			return resaDate >= now && resaDate <= twoHoursLater;
		});
	}, [reservations]);

	const ALL_TABLE_IDS = useMemo(
		() => (tables ?? []).map((t) => t._id.toString()),
		[tables],
	);

	const filteredTableIds = useMemo(() => {
		if (activeFilter === "Toutes") return ALL_TABLE_IDS;
		return ALL_TABLE_IDS.filter((tableId) => {
			const session = activeSessions.find((s) => s.tableId === tableId);
			if (activeFilter === "Libres") return !session;
			if (activeFilter === "Occup\u00e9es") return session?.billStatus === "open";
			if (activeFilter === "\u00c0 encaisser") return session?.billStatus === "bill_requested";
			return true;
		});
	}, [activeFilter, activeSessions, ALL_TABLE_IDS]);

	// Bouton swap — affiché quand deux tables se touchent
	const swapButtonEl = useMemo(() => {
		if (!swapCandidates) return null;
		const tA = tables.find(t => t._id.toString() === swapCandidates.idA);
		const tB = tables.find(t => t._id.toString() === swapCandidates.idB);
		if (!tA || !tB) return null;
		const refA = panRefsMap.current[swapCandidates.idA];
		const refB = panRefsMap.current[swapCandidates.idB];
		const xA = refA ? refA.pan.x._value : (tA.position?.x ?? 0);
		const yA = refA ? refA.pan.y._value : (tA.position?.y ?? 0);
		const wA = refA?.cardW ?? 168;
		const xB = refB ? refB.pan.x._value : (tB.position?.x ?? 0);
		const yB = refB ? refB.pan.y._value : (tB.position?.y ?? 0);
		const wB = refB?.cardW ?? 168;
		const midX = (xA + wA / 2 + xB + wB / 2) / 2 - 24;
		const midY = (yA + 84 + yB + 84) / 2 - 24;
		return (
			<TouchableOpacity
				style={{
					position: 'absolute',
					left: midX,
					top: midY,
					width: 48,
					height: 48,
					borderRadius: 24,
					backgroundColor: '#FBBF24',
					alignItems: 'center',
					justifyContent: 'center',
					zIndex: 9999,
					elevation: 12,
					shadowColor: '#FBBF24',
					shadowOffset: { width: 0, height: 0 },
					shadowOpacity: 0.7,
					shadowRadius: 8,
				}}
				onPress={() => handleSwapTables(swapCandidates.idA, swapCandidates.idB)}
				activeOpacity={0.85}
			>
				<Ionicons name="sync" size={22} color="#1A1A1A" />
			</TouchableOpacity>
		);
	}, [swapCandidates, tables, handleSwapTables]); // eslint-disable-line react-hooks/exhaustive-deps
	const attachSocketListener = useCounterTableStore((state) =>
		state.attachSocketListener,
	);

	/**
	 * Hydrate le sessions store depuis la réponse getTablesState.
	 * Pattern identique à useReservationStore.fetchReservations dans Activity :
	 * on charge l'état serveur → on peuple le store local.
	 */
	const hydrateSessionsFromTables = useCallback((restaurantIdParam, tablesWithState) => {
		if (!tablesWithState || !restaurantIdParam) return;
		
		let hydratedCount = 0;
		tablesWithState.forEach((table) => {
			if (table.status !== "free" && table.sessionId) {
				const sessionObj = {
					_id: table.sessionId,
					tableId: table._id.toString(),
					restaurantId: restaurantIdParam,
					billStatus: table.status === "bill_requested" ? "bill_requested" : "open",
					totalAmount: table.totalAmount ?? 0,
					itemsCount: table.itemsCount ?? 0,
					openedAt: table.openedAt ?? null,
					serverId: table.serverId ?? null,
					source: "counter",
					clientName: table.clientName ?? null,
					clientLang: table.clientLang ?? "fr",
				};
				useCounterTableStore.getState().openSession(restaurantIdParam, sessionObj.tableId, sessionObj);
				hydratedCount++;
			}
		});
		
	}, []);

	// Initialiser restaurantId
	useEffect(() => {
		const init = async () => {
			try {
				const id = await AsyncStorage.getItem("restaurantId");
				if (id) {
					setRestaurantId(id);
					
					// ✅ Vérifier si un shift est actif
					try {
						const shiftResponse = await cashShiftService.getActiveShift();
						setHasActiveShift(!!shiftResponse?.shift);
					} catch (err) {
						console.warn("[ActivityFloor] checkActiveShift échoué:", err);
						setHasActiveShift(false);
					}
					
					const tablesState = await counterService.getTablesState(id).catch((err) => {
						console.error("[ActivityFloor] getTablesState failed (init):", err?.message, err);
						return [];
					});
					setTables(tablesState);
					
					// 🔍 CONSOLE LOG : Contenu de toutes les tables au chargement du comptoir
					console.log("\n🏪 [COMPTOIR CHARGÉ] Contenu de toutes les tables:", JSON.stringify(tablesState, null, 2));
					console.log("📊 [COMPTOIR] Résumé:", {
						total: tablesState.length,
						occupées: tablesState.filter(t => t.status === 'occupied' || t.status === 'bill_requested').length,
						libres: tablesState.filter(t => t.status === 'free').length,
						avecSession: tablesState.filter(t => t.sessionId).length
					});
					
					// Hydrater le store sessions (équivalent fetchReservations dans Activity)
					hydrateSessionsFromTables(id, tablesState);
					
					// ✅ Charger les réservations pour vérifier les tables avec réservations à venir
					await useReservationStore.getState().fetchReservations();
				}
			} catch (err) {
				console.error("[ActivityFloor] Erreur init:", err);
			} finally {
				setIsLoadingTables(false);
			}
		};

		init();
	}, [authFetch]);

	// Attacher socket listener
	useEffect(() => {
		if (!socket || !restaurantId) return;
		console.log("[ActivityFloor] 🔌 socket useEffect MOUNT", new Date().toISOString());

		attachSocketListener(socket);
		
		// ✅ Attacher aussi les listeners WebSocket pour les réservations
		const unsubscribeReservations = useReservationStore.getState().attachSocketListener(socket);

		// ⭐ Refresh immédiat à chaque (re)connexion socket — rattrape les events perdus pendant déco
		handleRefreshRef.current();

		// ⭐ Handlers pour mise à jour granulaire (évite full refetch systématique)
		const handleOrderEvent = (payload) => {
			if (!payload?.data?.tableId) return;
			const tableId = payload.data.tableId._id || payload.data.tableId;
			const concernsFloor = tablesRef.current.some(t => t._id.toString() === tableId.toString());
			if (concernsFloor) {
				handleRefreshRef.current();
			}
		};

		const handlePaymentCompleted = (payload) => {
			if (!payload?.data?.tableId) return;
			const tableId = payload.data.tableId._id || payload.data.tableId;
			const concernsFloor = tablesRef.current.some(t => t._id.toString() === tableId.toString());
			if (concernsFloor) {
				handleRefreshRef.current();
			}
		};

		const handleTableSession = (payload) => {
			console.log("[ActivityFloor] 📡 table-session event reçu", payload?.type, new Date().toISOString());
			handleRefreshRef.current();
		};
		const handleReservation = () => { handleRefreshRef.current(); };
		const handleConnect = () => { handleRefreshRef.current(); };

		// ⭐ Écouter les événements temps réel
		socket.on("order", handleOrderEvent);
		socket.on("payment-completed", handlePaymentCompleted);
		socket.on("table-session", handleTableSession);
		socket.on("reservation", handleReservation);
		socket.on("connect", handleConnect);
		
		return () => {
			if (unsubscribeReservations) unsubscribeReservations();
			socket.off("order", handleOrderEvent);
			socket.off("payment-completed", handlePaymentCompleted);
			socket.off("table-session", handleTableSession);
			socket.off("reservation", handleReservation);
			socket.off("connect", handleConnect);
		};
	}, [socket, restaurantId]);

	// Fetch serveurs du restaurant (mode comptoir)
	useEffect(() => {
		if (!restaurantId) return;
		authFetch(`/servers/${restaurantId}`)
			.then((data) => setServers(Array.isArray(data) ? data : []))
			.catch((err) => console.warn("[ActivityFloor] fetch servers:", err));
	}, [restaurantId, authFetch]);

	// Fetch salles du restaurant
	useEffect(() => {
		if (!restaurantId) return;
		authFetch(`/rooms/restaurant/${restaurantId}`)
			.then((data) => setRooms(Array.isArray(data) ? data : []))
			.catch((err) => console.warn("[ActivityFloor] fetch rooms:", err));
	}, [restaurantId, authFetch]);

	// ⭐ Polling fallback : uniquement si socket déconnecté
	useEffect(() => {
		if (!restaurantId) return;
		const interval = setInterval(() => {
			if (!isConnected()) {
				handleRefreshRef.current();
			}
		}, 5000);
		return () => clearInterval(interval);
	}, [restaurantId, isConnected]);

	// 📅 Fetch réservations à venir (72h)
	useEffect(() => {
		if (!restaurantId) return;
		
		authFetch(`/reservations/upcoming/${restaurantId}`)
			.then((data) => {
				if (Array.isArray(data)) {
					setUpcomingReservations(data);
				}
			})
			.catch((err) => console.warn("[ActivityFloor] fetch upcoming reservations:", err));
	}, [restaurantId, authFetch]);

	// Refresh handler — debounced 800ms pour éviter les rafales (socket reconnect, etc.)
	const handleRefresh = useCallback(async () => {
		if (!restaurantId) return;

		// ⭐ Debounce : annuler le timer précédent, relancer
		if (refreshDebounceTimer.current) clearTimeout(refreshDebounceTimer.current);
		refreshDebounceTimer.current = setTimeout(async () => {

		try {
			const tablesState = await counterService.getTablesState(restaurantId).catch((err) => {
				console.error("[ActivityFloor] getTablesState failed (refresh):", err?.message, err);
				return [];
			});
			if (tablesState && tablesState.length > 0) {
				setTables(tablesState);
				hydrateSessionsFromTables(restaurantId, tablesState);
			}
		} catch (err) {
			console.error("[ActivityFloor] Erreur refresh:", err);
		}
		}, 800);
	}, [restaurantId, hydrateSessionsFromTables]);

	// ⭐ Ref stable pour handleRefresh — évite les deps cycliques dans les useEffect
	const handleRefreshRef = useRef(handleRefresh);
	useEffect(() => { handleRefreshRef.current = handleRefresh; }, [handleRefresh]);

	// Styles dynamiques
	const dynamicStyles = useMemo(() => createStyles(THEME), [THEME]);

	// Retourner la session d'une table (pour affichage)
	const getTableSession = useCallback(
		(tableId) => {
			return activeSessions.find((s) => {
				// ✅ Normaliser tableId (peut être string ou objet)
				const sessionTableId = typeof s.tableId === 'object' && s.tableId?._id 
					? s.tableId._id 
					: s.tableId;
				return sessionTableId === tableId || sessionTableId?.toString() === tableId?.toString();
			}) || null;
		},
		[activeSessions],
	);

	// Handler tap table
	const handleTableTap = useCallback((tableId) => {
		setSelectedTableId(tableId);
		const session = activeSessions.find((s) => s.tableId === tableId);
		if (!session) {
			// Table libre → d'abord vérifier si la caisse est ouverte
			if (hasActiveShift === false) {
				promptOpenShift(tableId);
				return;
			}
			// Puis vérifier s'il y a une réservation prévue dans les 2h
			const upcomingResa = checkUpcomingReservation(tableId);
			
			if (upcomingResa) {
				const resaDate = new Date(upcomingResa.reservationDate);
				const timeLeft = Math.round((resaDate - new Date()) / 60000); // minutes restantes
				const formattedTime = upcomingResa.reservationTime || resaDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
				
				Alert.alert(
					"⚠️ Réservation prévue",
					`Une réservation est prévue dans ${timeLeft} min (${formattedTime}).\n\n` +
					`Client: ${upcomingResa.clientName}\n` +
					`Personnes: ${upcomingResa.nbPersonnes}\n\n` +
					`Voulez-vous quand même ouvrir cette table maintenant ?`,
					[
						{
							text: "Annuler",
							style: "cancel",
							onPress: () => setSelectedTableId(null)
						},
						{
							text: "Ouvrir quand même",
							style: "destructive",
							onPress: () => {
								// Continuer le flow normal
								setSelectedWaiter(servers.length === 0 ? currentUser : null);
								setServerPickerTableId(tableId);
							}
						}
					]
				);
				return;
			}
			
			// Pas de réservation à venir → picker de serveur
			setSelectedWaiter(servers.length === 0 ? currentUser : null);
			setServerPickerTableId(tableId);
		} else {
			// Table occupée → directement le détail
			console.log("[TABLE OUVERTE - déjà occupée]", { tableId, session });
			
			// 🔍 CONSOLE LOG : Contenu détaillé de la table ouverte
			console.log("\n📋 [TABLE OUVERTE] Détails complets de la session:", JSON.stringify(session, null, 2));
			console.log("🔑 [TABLE] Info table:", {
				tableId,
				sessionId: session?._id,
				waiter: session?.serverId?.name || 'N/A',
				statut: session?.billStatus,
				nbItems: session?.itemsCount || 0,
				total: session?.totalAmount || 0
			});
			
			// 🛒 CONSOLE LOG : Détail des items commandés (si présents)
			if (session?.orders && session.orders.length > 0) {
				console.log("\n🛒 [TABLE] Items commandés:", JSON.stringify(session.orders, null, 2));
				console.log("📦 [TABLE] Résumé items:", session.orders.map(order => ({
					nom: order.name || order.productName,
					quantité: order.quantity,
					prix: order.price,
					total: (order.quantity || 0) * (order.price || 0)
				})));
			} else if (session?.items && session.items.length > 0) {
				console.log("\n🛒 [TABLE] Items commandés:", JSON.stringify(session.items, null, 2));
				console.log("📦 [TABLE] Résumé items:", session.items.map(item => ({
					nom: item.name || item.productName,
					quantité: item.quantity,
					prix: item.price,
					total: (item.quantity || 0) * (item.price || 0)
				})));
			} else {
				console.log("📭 [TABLE] Aucun item commandé pour le moment");
			}
			
			setShowTableDetail(true);
		}
	}, [activeSessions, servers, currentUser, checkUpcomingReservation, hasActiveShift, promptOpenShift]);

	// Vérification du shift actif
	const checkActiveShift = useCallback(async () => {
		if (!restaurantId) return;
		try {
			const response = await cashShiftService.getActiveShift();
			setHasActiveShift(!!response?.shift);
		} catch (err) {
			console.warn("[ActivityFloor] checkActiveShift échoué:", err);
			setHasActiveShift(false);
		}
	}, [restaurantId]);

	// Popup pour ouvrir la caisse
	const promptOpenShift = useCallback((tableId) => {
		Alert.alert(
			"💰 Caisse fermée",
			"Vous devez ouvrir la caisse avant de pouvoir ouvrir une table.\n\nVoulez-vous ouvrir la caisse maintenant ?",
			[
				{
					text: "Annuler",
					style: "cancel",
					onPress: () => setSelectedTableId(null)
				},
				{
					text: "Ouvrir la caisse",
					onPress: () => {
						// Demander le fond de caisse
						Alert.prompt(
							"💰 Fond de caisse",
							"Quel est le fond de caisse (en €) ?",
							async (value) => {
								const amount = parseFloat(value?.replace(',', '.') || '0');
								if (isNaN(amount) || amount < 0) {
									Alert.alert("Erreur", "Montant invalide");
									return;
								}
								try {
									const openingFloatCents = Math.round(amount * 100);
									const response = await cashShiftService.openShift({
										openingFloatCents,
										deviceId: null,
										notes: ""
									});
									if (response?.shift) {
										setHasActiveShift(true);
										Alert.alert("✅ Caisse ouverte", "Vous pouvez maintenant ouvrir des tables.", [
											{
												text: "OK",
												onPress: () => {
													// Relancer le flow d'ouverture de table
													setSelectedWaiter(servers.length === 0 ? currentUser : null);
													setServerPickerTableId(tableId);
												}
											}
										]);
									} else {
										Alert.alert("Erreur", "Impossible d'ouvrir la caisse");
									}
								} catch (err) {
									console.error("[ActivityFloor] openShift échoué:", err);
									Alert.alert("Erreur", err.message || "Impossible d'ouvrir la caisse");
								}
							},
							"plain-text",
							"250.00"
						);
					}
				}
			]
		);
	}, [restaurantId, servers, currentUser]);

	// Confirmation du serveur → ouvre la session puis la modale
	const handleConfirmWaiter = useCallback(async () => {
		if (!serverPickerTableId || !restaurantId) return;
		// Utiliser le waiter sélectionné ou l'utilisateur actuel comme fallback
		const waiter = selectedWaiter ?? currentUser;
		
		try {
			const session = await counterService.openSession(
				restaurantId,
				serverPickerTableId,
				waiter?.name ?? null,
				waiter?._id ?? null,
			);
			// Injecter la session dans le store immédiatement
			if (session) {
				useCounterTableStore.getState().openSession(restaurantId, serverPickerTableId, session);
			}
			// Ouvrir la modale
			console.log("[TABLE OUVERTE - nouvelle session]", { tableId: serverPickerTableId, session });
			
			// 🔍 CONSOLE LOG : Contenu de la nouvelle session créée
			console.log("\n✨ [NOUVELLE SESSION] Détails:", JSON.stringify(session, null, 2));
			console.log("🆕 [TABLE] Info session:", {
				tableId: serverPickerTableId,
				sessionId: session?._id,
				waiter: session?.serverId?.name || waiter?.name,
				statut: session?.billStatus,
				dateOuverture: session?.openedAt || session?.createdAt
			});
			
			setServerPickerTableId(null);
			setSelectedWaiter(null);
			setShowTableDetail(true);
		} catch (err) {
			console.warn("[ActivityFloor] openSession échoué:", err);
			
			// ✅ Si réservation présente détectée → proposer d'ouvrir la réservation
			if (err.message?.includes("TABLE_HAS_PENDING_RESERVATION")) {
				const [_, reservationId, clientName] = err.message.split(":");
				
				Alert.alert(
					"Réservation présente",
					`Une réservation pour "${clientName}" est marquée présente pour cette table.\n\nPour ouvrir cette table, vous devez d'abord ouvrir la réservation dans l'onglet Dashboard.`,
					[
						{ text: "Annuler", style: "cancel" },
						{ 
							text: "Aller au Dashboard", 
							onPress: () => {
								// TODO: Navigation vers Dashboard avec focus sur cette réservation
							}
						}
					]
				);
				
				setServerPickerTableId(null);
				setSelectedWaiter(null);
				return;
			}
			
			// ✅ Si HTTP 409 (table déjà occupée) → recharger l'état et ouvrir le détail
			if (err.message?.includes("409")) {
				Alert.alert(
					"Table déjà occupée",
					"Cette table a déjà une session active. Rechargement...",
					[{ text: "OK", onPress: async () => {
						// Recharger l'état des tables depuis le serveur
						try {
							const tablesState = await counterService.getTablesState(restaurantId);
							if (tablesState && tablesState.length > 0) {
								setTables(tablesState);
								hydrateSessionsFromTables(restaurantId, tablesState);
								
								// Ouvrir automatiquement le détail de la table (maintenant marquée comme occupée)
								setShowTableDetail(true);
							}
						} catch (refreshErr) {
							console.error("[ActivityFloor] Erreur rechargement après 409:", refreshErr);
						}
					}}]
				);
			}
			
			// Fermer les modales de sélection serveur
			setServerPickerTableId(null);
			setSelectedWaiter(null);
		}
	}, [serverPickerTableId, restaurantId, selectedWaiter, currentUser]);

	// Sauvegarder la position d'une table après drag
	const saveTablePosition = useCallback(
		async (tableId, position) => {
			try {
				await authFetch(`/tables/${tableId}`, {
					method: "PUT",
					body: { position },
				});
				setTables((prev) =>
					prev.map((t) =>
						t._id === tableId ? { ...t, position } : t,
					),
				);
			} catch (err) {
				console.warn("[ActivityFloor] Erreur save position:", err);
			}

			// Détection overlap → propose le swap
			const CARD_H = 168;
			const refA = panRefsMap.current[tableId];
			const cardWA = refA?.cardW ?? 168;
			for (const other of tablesRef.current) {
				if (other._id.toString() === tableId.toString()) continue;
				const refB = panRefsMap.current[other._id];
				const xB = refB ? refB.pan.x._value : (other.position?.x ?? 0);
				const yB = refB ? refB.pan.y._value : (other.position?.y ?? 0);
				const cardWB = refB?.cardW ?? 168;
				const overlaps =
					position.x < xB + cardWB &&
					position.x + cardWA > xB &&
					position.y < yB + CARD_H &&
					position.y + CARD_H > yB;
				if (overlaps) {
					setSwapCandidates({ idA: tableId.toString(), idB: other._id.toString() });
					return;
				}
			}
			setSwapCandidates(null);
		},
		[authFetch],
	);

	// Sauvegarder les modifications d'une table (numéro + capacité)
	// Échanger les numéros de deux tables
	const handleSwapTables = useCallback(async (idA, idB) => {
		try {
			const result = await authFetch('/tables/swap', {
				method: 'POST',
				body: { idA, idB },
			});
			if (result?.tableA && result?.tableB) {
				setTables(prev => prev.map(t => {
					if (t._id.toString() === idA) return { ...t, number: result.tableA.number };
					if (t._id.toString() === idB) return { ...t, number: result.tableB.number };
					return t;
				}));
			}
			setSwapCandidates(null);
		} catch (err) {
			console.error('[ActivityFloor] handleSwapTables:', err);
			Alert.alert('Erreur', "Impossible d'échanger les tables");
		}
	}, [authFetch]);

	const saveTableEdit = useCallback(
		async (number, capacity) => {
			if (!editModalTable) return;
			const { tableId } = editModalTable;
			try {
				const updated = await authFetch(`/tables/${tableId}`, {
					method: "PUT",
					body: { number, capacity },
				});
				setTables((prev) =>
					prev.map((t) => {
						if (t._id !== tableId) return t;
						return updated?._id ? updated : { ...t, number, capacity };
					}),
				);
				setEditModalTable(null);
			} catch (err) {
				console.warn("[ActivityFloor] Erreur save edit:", err);
				Alert.alert("Erreur", "Impossible de modifier la table");
			}
		},
		[authFetch, editModalTable],
	);

	// Auto-aligner les tables en grille
	const handleAutoAlign = useCallback(() => {
		const CARD_W = 168;
		const CARD_H = 168;
		const MIN_GAP = 16;
		// Largeur réelle du canvas : écran - paddingH canvasWrapper (×2) - padding gridPanel (×2)
		const CANVAS_W = SCREEN_W - 2 * CANVAS_PADDING - 2 * 12;
		// Nb de colonnes max qui tiennent dans le canvas (avec gap min), plafonné à 5
		const maxCols = Math.max(1, Math.floor((CANVAS_W + MIN_GAP) / (CARD_W + MIN_GAP)));
		const COLS = Math.min(5, maxCols);
		// Gap égal pour remplir exactement la largeur (table 1 à gauche, dernière à droite)
		const GAP = COLS > 1 ? Math.floor((CANVAS_W - COLS * CARD_W) / (COLS - 1)) : 0;
		const sorted = [...tables].sort((a, b) =>
			String(a.number ?? "").localeCompare(
				String(b.number ?? ""),
				undefined,
				{ numeric: true, sensitivity: "base" },
			),
		);
		const updates = sorted.map((t, i) => ({
			tableId: t._id,
			position: {
				x: (i % COLS) * (CARD_W + GAP),
				y: 8 + Math.floor(i / COLS) * (CARD_H + GAP),
			},
		}));
		setTables((prev) =>
			prev.map((t) => {
				const upd = updates.find((u) => u.tableId === t._id);
				return upd ? { ...t, position: upd.position } : t;
			}),
		);
		setLayoutKey((k) => k + 1);
		updates.forEach(({ tableId, position }) => saveTablePosition(tableId, position));
	}, [tables, saveTablePosition]);

	// Retourner "Chargement..." si pas de restaurantId
	if (!restaurantId) {
		return (
			<View style={dynamicStyles.container}>
				<ActivityIndicator
					size="large"
					color={THEME.colors.primary.amber}
				/>
			</View>
		);
	}

	return (
		<View style={dynamicStyles.container}>
			{/* Header */}
			<View style={dynamicStyles.header}>
				<View style={dynamicStyles.headerLeft}>
					<Ionicons
						name="grid-outline"
						size={15}
						color={THEME.colors.text.muted}
						style={{ marginRight: 6 }}
					/>
					<View>
						<Text style={dynamicStyles.headerTitle}>
							Activity —
						</Text>
						<Text style={dynamicStyles.headerSubTitle}>
							Comptoir
						</Text>
					</View>
				</View>
				<TouchableOpacity
					style={dynamicStyles.roomDropdown}
					onPress={() =>
						setSelectedRoomIndex((r) => {
							if (rooms.length === 0) return r;
							// Cycle : -1 (toutes) → 0 → 1 → ... → rooms.length-1 → -1
							if (r >= rooms.length - 1) return -1;
							return r + 1;
						})
					}
				>
					<Text style={dynamicStyles.roomDropdownText}>
						{selectedRoomIndex === -1
							? "Toutes"
							: rooms[selectedRoomIndex]?.name ?? `Salle ${selectedRoomIndex + 1}`}
					</Text>
					<Ionicons
						name="chevron-down"
						size={14}
						color={THEME.colors.text.secondary}
					/>
				</TouchableOpacity>
				<TouchableOpacity
					style={dynamicStyles.menuButton}
					onPress={() => setShowDebugPanel(true)}
				>
					<Ionicons
						name="settings-outline"
						size={20}
						color={THEME.colors.text.secondary}
					/>
				</TouchableOpacity>

			</View>

			{/* Filtres */}
			<View style={dynamicStyles.filterBar}>
				{["Toutes", "Libres", "Occupées", "À encaisser"].map(
					(label) => (
						<TouchableOpacity
							key={label}
							onPress={() => setActiveFilter(label)}
							style={[
								dynamicStyles.filterButton,
								activeFilter === label &&
									dynamicStyles.filterButtonActive,
							]}
						>
							<Text
								style={[
									dynamicStyles.filterButtonText,
									activeFilter === label &&
										dynamicStyles.filterButtonActiveText,
								]}
							>
								{label}
							</Text>
						</TouchableOpacity>
					),
				)}
				<View style={{ flex: 1 }} />
				<TouchableOpacity
					onPress={handleAutoAlign}
					style={dynamicStyles.alignBtn}
				>
					<Ionicons name="grid-outline" size={15} color={THEME.colors.text.secondary} />
				</TouchableOpacity>
			</View>
				{/* Légende */}
			<View style={dynamicStyles.legend}>
				<View style={dynamicStyles.legendItem}>
					<View
						style={[
							dynamicStyles.legendDot,
							dynamicStyles.legendDotFree,
						]}
					/>
					<Text style={dynamicStyles.legendText}>Libre</Text>
				</View>
				<View style={dynamicStyles.legendItem}>
					<View
						style={[
							dynamicStyles.legendDot,
							dynamicStyles.legendDotOccupied,
						]}
					/>
					<Text style={dynamicStyles.legendText}>
						En service
					</Text>
				</View>
				<View style={dynamicStyles.legendItem}>
					<View
						style={[
							dynamicStyles.legendDot,
							dynamicStyles.legendDotBill,
						]}
					/>
					<Text style={dynamicStyles.legendText}>
						À encaisser
					</Text>
				</View>
			</View>

			{/* Canvas plan de salle */}
			<View style={dynamicStyles.canvasWrapper}>
				<View style={dynamicStyles.gridPanel}>
					{isLoadingTables ? (
						<View style={dynamicStyles.emptyState}>
							<ActivityIndicator
								size="large"
								color={THEME.colors.primary.amber}
							/>
							<Text style={dynamicStyles.emptyStateText}>
								Chargement des tables…
							</Text>
						</View>
					) : tables.length === 0 ? (
						<View style={dynamicStyles.emptyState}>
							<Text style={dynamicStyles.emptyStateIcon}>
								🪑
							</Text>
							<Text style={dynamicStyles.emptyStateText}>
								Aucune table configurée
							</Text>
							<Text style={dynamicStyles.emptyStateHint}>
								Créez des tables dans les réglages
							</Text>
							<TouchableOpacity
								onPress={handleRefresh}
								style={dynamicStyles.emptyStateButton}
							>
								<Text
									style={
										dynamicStyles.emptyStateButtonText
									}
								>
									↻ Rafraîchir
								</Text>
							</TouchableOpacity>
						</View>
					) : filteredTableIds.length === 0 ? (
						<View style={dynamicStyles.emptyState}>
							<Text style={dynamicStyles.emptyStateText}>
								Aucune table dans ce filtre
							</Text>
						</View>
					) : (
						<View style={dynamicStyles.canvas}>
							{filteredTableIds.map((tableId, index) => {
								const session = getTableSession(tableId);
								const table = tables.find(
									(t) => t._id.toString() === tableId,
								);
								return (
									<DraggableTableCard
										key={`${tableId}-${layoutKey}`}
										table={table}
										session={session}
										tableIndex={index}
										upcomingReservations={upcomingReservations}
										onPress={() => handleTableTap(tableId)}
										onPositionSave={saveTablePosition}
										onRegisterPan={(id, panRef, w) => {
											panRefsMap.current[id] = { pan: panRef, cardW: w };
										}}
									/>
								);
							})}
							{swapButtonEl}
						</View>
					)}
				</View>
			</View>

			{/* Footer Stats */}
			<View style={dynamicStyles.footer}>
				<View style={dynamicStyles.footerItem}>
					<Ionicons
						name="grid-outline"
						size={13}
						color={THEME.colors.text.muted}
					/>
					<Text style={dynamicStyles.footerText}>
						{stats.open} occupées
					</Text>
				</View>
				<View style={dynamicStyles.footerSep} />
				<View style={dynamicStyles.footerItem}>
					<Text style={dynamicStyles.footerEuroIcon}>€</Text>
					<Text style={dynamicStyles.footerText}>
						{stats.billRequested} à encaisser
					</Text>
				</View>
				<View style={dynamicStyles.footerSep} />
				<View style={dynamicStyles.footerItem}>
					<Ionicons
						name="bar-chart-outline"
						size={13}
						color={THEME.colors.text.muted}
					/>
					<Text style={dynamicStyles.footerText}>
						CA en cours : {stats.totalAmount.toFixed(2)} €
					</Text>
				</View>
			</View>

			{/* Modales */}
			<EditTableModal
				visible={!!editModalTable}
				table={editModalTable?.table}
				onClose={() => setEditModalTable(null)}
				onSave={saveTableEdit}
			/>
			{/* 🔧 Debug Panel */}
			<Modal
				visible={showDebugPanel}
				transparent
				animationType="fade"
				onRequestClose={() => setShowDebugPanel(false)}
			>
				<Pressable
					style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.70)", justifyContent: "center", alignItems: "center", paddingHorizontal: 16 }}
					onPress={() => setShowDebugPanel(false)}
				>
					<Pressable
						onPress={() => {}}
						style={{ backgroundColor: "#1E293B", borderRadius: 20, width: "100%", maxWidth: 420, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", overflow: "hidden" }}
					>
						{/* Header */}
						<View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 20, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.07)" }}>
							<View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
								<Ionicons name="settings" size={20} color="#f59e0b" />
								<Text style={{ color: "#F8FAFC", fontSize: 18, fontWeight: "700" }}>Debug / Outils</Text>
							</View>
							<TouchableOpacity
								onPress={() => setShowDebugPanel(false)}
								style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.07)", alignItems: "center", justifyContent: "center" }}
							>
								<Ionicons name="close" size={20} color="#94A3B8" />
							</TouchableOpacity>
						</View>
						{/* Content */}
						<View style={{ padding: 20, gap: 10 }}>
							<Text style={{ color: "#64748B", fontSize: 12, marginBottom: 6 }}>
								Outils réservés au restaurateur. Actions irréversibles marquées en rouge.
							</Text>
							<TouchableOpacity
								onPress={() => { setShowDebugPanel(false); handleRefresh(); }}
								style={{ flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 10, borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", padding: 14, gap: 10 }}
							>
								<Ionicons name="refresh" size={18} color="#60a5fa" />
								<Text style={{ color: "#60a5fa", fontWeight: "600", fontSize: 14 }}>Forcer un refresh des tables</Text>
							</TouchableOpacity>
							<TouchableOpacity
								onPress={() => { setShowDebugPanel(false); setShowForceQuit(true); }}
								style={{ flexDirection: "row", alignItems: "center", backgroundColor: "rgba(239,68,68,0.08)", borderRadius: 10, borderWidth: 1, borderColor: "rgba(239,68,68,0.3)", padding: 14, gap: 10 }}
							>
								<Ionicons name="power" size={18} color="#EF4444" />
								<View style={{ flex: 1 }}>
									<Text style={{ color: "#EF4444", fontWeight: "600", fontSize: 14 }}>Forcer à quitter</Text>
									<Text style={{ color: "#94A3B8", fontSize: 11, marginTop: 2 }}>Ferme une session de force (irréversible)</Text>
								</View>
							</TouchableOpacity>
						</View>
					</Pressable>
				</Pressable>
			</Modal>

			{/* 🔴 Force Quit — fermeture forcée de session */}
			<Modal
				visible={showForceQuit}
				transparent
				animationType="fade"
				onRequestClose={() => setShowForceQuit(false)}
			>
				<Pressable
					style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.70)", justifyContent: "center", alignItems: "center", paddingHorizontal: 16 }}
					onPress={() => setShowForceQuit(false)}
				>
					<Pressable
						onPress={() => {}}
						style={{ backgroundColor: "#1E293B", borderRadius: 20, width: "100%", maxWidth: 420, borderWidth: 1, borderColor: "rgba(239,68,68,0.25)", overflow: "hidden", maxHeight: "80%" }}
					>
						{/* Header */}
						<View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 20, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.07)" }}>
							<View style={{ flex: 1 }}>
								<View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 3 }}>
									<Ionicons name="power" size={18} color="#EF4444" />
									<Text style={{ color: "#F8FAFC", fontSize: 18, fontWeight: "700" }}>Forcer à quitter</Text>
								</View>
								<Text style={{ color: "#64748B", fontSize: 12 }}>Sélectionne une table ouverte pour forcer la fermeture</Text>
							</View>
							<TouchableOpacity
								onPress={() => setShowForceQuit(false)}
								style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.07)", alignItems: "center", justifyContent: "center", marginLeft: 12 }}
							>
								<Ionicons name="close" size={20} color="#94A3B8" />
							</TouchableOpacity>
						</View>

						{/* Liste des tables ouvertes */}
						{(() => {
							const openTables = tables.filter((t) => {
								const session = activeSessions.find((s) => s.tableId === t._id || s.tableId === t._id?.toString());
								return session && (session.billStatus === "open" || session.billStatus === "bill_requested");
							});

							if (openTables.length === 0) {
								return (
									<View style={{ padding: 32, alignItems: "center" }}>
										<Ionicons name="checkmark-circle-outline" size={40} color="#4ADE80" style={{ marginBottom: 12 }} />
										<Text style={{ color: "#94A3B8", fontSize: 14, textAlign: "center" }}>Aucune table ouverte en ce moment.</Text>
									</View>
								);
							}

							return (
								<View style={{ padding: 16, gap: 8 }}>
									{openTables.map((t) => {
										const session = activeSessions.find((s) => s.tableId === t._id || s.tableId === t._id?.toString());
										const isBill = session?.billStatus === "bill_requested";
										const isLoading = forceQuitLoading === session?._id;
										return (
											<TouchableOpacity
												key={t._id}
												disabled={isLoading}
												onPress={() => {
													Alert.alert(
														`Fermer Table ${t.number} ?`,
														"La session sera fermée de force (paiement en espèces enregistré). Cette action est irréversible.",
														[
															{ text: "Annuler", style: "cancel" },
															{
																text: "Forcer la fermeture",
																style: "destructive",
																onPress: () => requirePin(async () => {
																	setForceQuitLoading(session._id);
																	try {
																		await counterService.closeSession(session._id, "cash", [], true);
																		await handleRefresh();
																		// Si plus de tables ouvertes, fermer la modale
																		const remaining = tables.filter((tb) => {
																			const s = activeSessions.find((s) => s.tableId === tb._id || s.tableId === tb._id?.toString());
																			return s && (s.billStatus === "open" || s.billStatus === "bill_requested") && s._id !== session._id;
																		});
																		if (remaining.length === 0) setShowForceQuit(false);
																	} catch (err) {
																		Alert.alert("Erreur", err.message || "Impossible de fermer la session.");
																	} finally {
																		setForceQuitLoading(null);
																	}
																}),
															},
														],
													);
												}}
												style={{ flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 10, borderWidth: 1, borderColor: isBill ? "rgba(245,158,11,0.3)" : "rgba(255,255,255,0.10)", padding: 14, gap: 12 }}
											>
												<View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: isBill ? "rgba(245,158,11,0.15)" : "rgba(74,222,128,0.12)", alignItems: "center", justifyContent: "center" }}>
													<Text style={{ color: isBill ? "#FBBF24" : "#4ADE80", fontWeight: "700", fontSize: 13 }}>
														{t.number?.replace("Tab", "") ?? "?"}
													</Text>
												</View>
												<View style={{ flex: 1 }}>
													<Text style={{ color: "#F8FAFC", fontWeight: "600", fontSize: 14 }}>Table {t.number}</Text>
													<Text style={{ color: isBill ? "#FBBF24" : "#4ADE80", fontSize: 12, marginTop: 1 }}>
														{isBill ? "⚠ À encaisser" : "● En service"}
														{session?.totalAmount ? ` · ${session.totalAmount.toFixed(2)} €` : ""}
													</Text>
												</View>
												{isLoading ? (
													<ActivityIndicator size="small" color="#EF4444" />
												) : (
													<Ionicons name="power" size={20} color="#EF4444" />
												)}
											</TouchableOpacity>
										);
									})}
								</View>
							);
						})()}
					</Pressable>
				</Pressable>
			</Modal>

			{showFloorPlan && (
				<FloorPlanModal
					visible={showFloorPlan}
					onClose={() => setShowFloorPlan(false)}
					restaurantId={restaurantId}
					roomNumber={selectedRoom}
					focusTableId={selectedTableId}
				/>
			)}
			{showTableDetail && selectedTableId && (
				<TableDetailModal
					visible={showTableDetail}
					onClose={() => setShowTableDetail(false)}
					restaurantId={restaurantId}
					tableId={selectedTableId}
					table={tables.find((t) => t._id.toString() === selectedTableId)}
				/>
			)}
			<ServerPickerModal
				visible={!!serverPickerTableId}
				onClose={() => { setServerPickerTableId(null); setSelectedWaiter(null); }}
				onConfirm={handleConfirmWaiter}
				servers={servers}
				selectedWaiter={selectedWaiter}
				onSelectWaiter={setSelectedWaiter}
				currentUser={currentUser}
			/>
			<PinModal />
		</View>
	);
};

const createStyles = (THEME) =>
	StyleSheet.create({
		container: {
			flex: 1,
			backgroundColor: THEME.colors.background.dark,
		},

		// ─── Header ────────────────────────────────────────────
		header: {
			flexDirection: "row",
			alignItems: "center",
			paddingHorizontal: 16,
			paddingVertical: 12,
			gap: 10,
			borderBottomWidth: 1,
			borderBottomColor: THEME.colors.border.subtle,
		},
		headerLeft: {
			flexDirection: "row",
			alignItems: "center",
		},
		headerTitle: {
			fontSize: 13,
			fontWeight: "700",
			color: THEME.colors.text.primary,
			lineHeight: 17,
		},
		headerSubTitle: {
			fontSize: 13,
			fontWeight: "700",
			color: THEME.colors.text.primary,
			lineHeight: 17,
		},
		roomDropdown: {
			flex: 1,
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "space-between",
			paddingHorizontal: 12,
			paddingVertical: 9,
			borderRadius: 8,
			borderWidth: 1,
			borderColor: THEME.colors.border.subtle,
			backgroundColor: THEME.colors.background.elevated,
		},
		roomDropdownText: {
			fontSize: 14,
			fontWeight: "600",
			color: THEME.colors.text.primary,
		},
		menuButton: {
			padding: 6,
		},
		// ─── Filters ───────────────────────────────────────────
		filterBar: {
			flexDirection: "row",
			alignItems: "center",
			paddingVertical: 10,
			paddingHorizontal: 12,
			gap: 8,
			flexGrow: 0,
		},
		filterButton: {
			paddingVertical: 7,
			paddingHorizontal: 16,
			borderRadius: 20,
			borderWidth: 1,
			borderColor: THEME.colors.border.subtle,
			backgroundColor: "transparent",
		},
		filterButtonActive: {
			backgroundColor: THEME.colors.text.primary,
			borderColor: THEME.colors.text.primary,
		},
		filterButtonText: {
			fontSize: 13,
			fontWeight: "500",
			color: THEME.colors.text.secondary,
		},
		filterButtonActiveText: {
			color: THEME.colors.background.dark,
			fontWeight: "700",
		},
		alignBtn: {
			padding: 7,
			borderRadius: 8,
			borderWidth: 1,
			borderColor: THEME.colors.border.subtle,
		},

		// ─── Legend ────────────────────────────────────────────
		legend: {
			flexDirection: "row",
			alignItems: "center",
			paddingHorizontal: 16,
			paddingBottom: 8,
			gap: 16,
		},
		legendItem: {
			flexDirection: "row",
			alignItems: "center",
			gap: 6,
		},
		legendDot: {
			width: 10,
			height: 10,
			borderRadius: 5,
		},
		legendDotFree: {
			backgroundColor: "#60A5FA",
		},
		legendDotOccupied: {
			backgroundColor: "#4ADE80",
		},
		legendDotBill: {
			backgroundColor: "#F87171",
		},
		legendText: {
			fontSize: 11,
			color: THEME.colors.text.muted,
			fontWeight: "500",
		},

		// ─── Grid ──────────────────────────────────────────────
		canvasWrapper: {
			flex: 1,
			paddingHorizontal: 12,
			paddingTop: 4,
			paddingBottom: 4,
		},
		gridPanel: {
			flex: 1,
			backgroundColor: "rgba(255,255,255,0.04)",
			borderRadius: 16,
			borderWidth: 1,
			borderColor: THEME.colors.border.subtle,
			padding: 12,
			minHeight: 200,
		},
		canvas: {
			position: "relative",
			width: "100%",
			minHeight: 280,
		},

		// ─── Empty states ──────────────────────────────────────
		emptyState: {
			alignItems: "center",
			justifyContent: "center",
			paddingVertical: 48,
			gap: 8,
		},
		emptyStateIcon: {
			fontSize: 36,
			marginBottom: 4,
		},
		emptyStateText: {
			fontSize: 15,
			fontWeight: "600",
			color: THEME.colors.text.secondary,
			textAlign: "center",
		},
		emptyStateHint: {
			fontSize: 12,
			color: THEME.colors.text.muted,
			textAlign: "center",
		},
		emptyStateButton: {
			backgroundColor: THEME.colors.primary.amber,
			paddingHorizontal: 20,
			paddingVertical: 10,
			borderRadius: 8,
			marginTop: 8,
		},
		emptyStateButtonText: {
			color: THEME.colors.background.dark,
			fontWeight: "700",
			fontSize: 13,
		},

		// ─── Footer ────────────────────────────────────────────
		footer: {
			flexDirection: "row",
			alignItems: "center",
			paddingHorizontal: 16,
			paddingVertical: 12,
			borderTopWidth: 1,
			borderTopColor: THEME.colors.border.subtle,
			backgroundColor: THEME.colors.background.card,
			gap: 10,
		},
		footerItem: {
			flexDirection: "row",
			alignItems: "center",
			gap: 5,
		},
		footerSep: {
			width: 1,
			height: 14,
			backgroundColor: THEME.colors.border.subtle,
		},
		footerEuroIcon: {
			fontSize: 12,
			fontWeight: "700",
			color: THEME.colors.text.muted,
		},
		footerText: {
			fontSize: 12,
			color: THEME.colors.text.secondary,
			fontWeight: "500",
		},
	});

export default ActivityFloor;

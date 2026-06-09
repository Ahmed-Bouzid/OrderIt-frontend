/**
 * 🏗️ FloorPlanModal - Plan de salle interactif
 * Vue du ciel avec tables draggables librement
 */
import React, {
	useState,
	useEffect,
	useCallback,
	useMemo,
	useRef,
} from "react";
import {
	View,
	Text,
	Modal,
	StyleSheet,
	TouchableOpacity,
	Platform,
	Alert,
	TextInput,
	Animated,
	PanResponder,
	ScrollView,
} from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { useAuthFetch } from "../../hooks/useAuthFetch";
import useSocket from "../../hooks/useSocket";
import { useTheme } from "../../hooks/useTheme";

export default function FloorPlanModal({
	visible,
	onClose,
	restaurantId,
	roomNumber = 1,
	focusTableId = null,
	upcomingReservations = [],
}) {
	const authFetch = useAuthFetch();
	const THEME = useTheme();
			const styles = useMemo(() => createStyles(THEME), [THEME]);

	// ─── Salles réelles depuis l'API ───────────────────────────────────────────
	const [rooms, setRooms] = useState([]);
	const [currentRoomIndex, setCurrentRoomIndex] = useState(-1); // -1 = toutes les tables
	const [isLoadingRooms, setIsLoadingRooms] = useState(false);
	const [showRoomManager, setShowRoomManager] = useState(false);
	const [newRoomName, setNewRoomName] = useState("");

	// La salle actuellement affichée (null = toutes les tables)
	const currentRoom = currentRoomIndex >= 0 ? (rooms[currentRoomIndex] ?? null) : null;

	// Charger les salles
	const fetchRooms = useCallback(async () => {
		if (!restaurantId) return;
		try {
			setIsLoadingRooms(true);
			const data = await authFetch(`/rooms/restaurant/${restaurantId}`, { method: "GET" });
			if (Array.isArray(data)) setRooms(data);
		} catch (e) {
			console.error("[FloorPlan] fetchRooms error:", e);
		} finally {
			setIsLoadingRooms(false);
		}
	}, [restaurantId, authFetch]);

	useEffect(() => {
		if (visible) fetchRooms();
	}, [visible, fetchRooms]);

	// Créer une salle
	const handleCreateRoom = async () => {
		const name = newRoomName.trim();
		if (!name) return;
		try {
			const created = await authFetch("/rooms", {
				method: "POST",
				body: { restaurantId, name, order: rooms.length },
			});
			if (created && created._id) {
				setRooms((prev) => [...prev, created]);
				setCurrentRoomIndex(rooms.length); // naviguer vers la nouvelle salle
			}
			setNewRoomName("");
			setShowRoomManager(false);
		} catch (e) {
			console.error("[FloorPlan] handleCreateRoom error:", e);
			Alert.alert("Erreur", "Impossible de créer la salle");
		}
	};

	// Supprimer une salle
	const handleDeleteRoom = async (roomId) => {
		Alert.alert("Supprimer cette salle ?", "Les tables ne seront pas supprimées.", [
			{ text: "Annuler", style: "cancel" },
			{
				text: "Supprimer",
				style: "destructive",
				onPress: async () => {
					try {
						await authFetch(`/rooms/${roomId}`, { method: "DELETE" });
						setRooms((prev) => prev.filter((r) => r._id !== roomId));
						setCurrentRoomIndex(0);
					} catch (e) {
						Alert.alert("Erreur", "Impossible de supprimer la salle");
					}
				},
			},
		]);
	};

	// États (déclarés avant les useMemo qui en dépendent)
	const [tables, setTables] = useState([]);
	const [reservations, setReservations] = useState([]);

	// Tables filtrées selon la salle sélectionnée
	const filteredTables = useMemo(() => {
		if (!currentRoom) return tables; // pas de salle → toutes les tables
		const ids = new Set(
			(currentRoom.tableIds || []).map((t) =>
				(t._id ?? t).toString()
			)
		);
		return tables.filter((t) => ids.has(t._id.toString()));
	}, [tables, currentRoom]);

	// Mode simulation désactivé (plus de salles fictives)
	const isSimulation = false;
	const [modifiedTableIds, setModifiedTableIds] = useState(new Set());
	const [dragEnabled, setDragEnabled] = useState(false);
	const [resizeEnabled, setResizeEnabled] = useState(false);
	const [snapToGrid, setSnapToGrid] = useState(false);
	const [headerHeight, setHeaderHeight] = useState(68);
	const [history, setHistory] = useState([]);
	const [historyIndex, setHistoryIndex] = useState(-1);

	// Swap — deux tables qui se touchent en mode Drag
	const [swapCandidates, setSwapCandidates] = useState(null); // { idA, idB }

	// Feature 5 — Alignment toolbar
	const [selectedTableId, setSelectedTableId] = useState(null);

	// Mode Resa (déclaré tôt car utilisé dans des useEffect)
	const [resaMode, setResaMode] = useState(true);

	// Feature 6 — Independent grid visibility
	const [showGrid, setShowGrid] = useState(false);

	// Feature 4 — Right properties panel animation
	const [panelAnim] = useState(new Animated.Value(-260));

	// Focus table (click-to-focus depuis la sidebar réservations)
	const [focusedTableId, setFocusedTableId] = useState(null);
	useEffect(() => {
		if (focusTableId) setFocusedTableId(focusTableId);
	}, [focusTableId]);
	// Auto-effacer le focus après 1.2s (temps de l'animation + léger délai)
	useEffect(() => {
		if (!focusedTableId) return;
		const t = setTimeout(() => setFocusedTableId(null), 1200);
		return () => clearTimeout(t);
	}, [focusedTableId]);

	// Refs pour les PanResponders (capturent les valeurs actuelles)
	const dragEnabledRef = useRef(dragEnabled);
	const resizeEnabledRef = useRef(resizeEnabled);
	const snapToGridRef = useRef(snapToGrid);

	// Feature 5 — canvas dimensions + pan refs map
	const canvasRef = useRef({ width: 0, height: 0 });
	const panRefsMap = useRef({});

	// Sync refs avec états
	useEffect(() => {
		dragEnabledRef.current = dragEnabled;
	}, [dragEnabled]);

	useEffect(() => {
		resizeEnabledRef.current = resizeEnabled;
	}, [resizeEnabled]);

	useEffect(() => {
		snapToGridRef.current = snapToGrid;
	}, [snapToGrid]);

	// Feature 4 — Animate properties panel in/out
	useEffect(() => {
		if (selectedTableId && !resaMode) {
			Animated.timing(panelAnim, { toValue: 0, duration: 220, useNativeDriver: false }).start();
		} else {
			Animated.timing(panelAnim, { toValue: -260, duration: 220, useNativeDriver: false }).start();
		}
	}, [selectedTableId, resaMode, panelAnim]);

	// Clear selection when resaMode activates
	useEffect(() => {
		if (resaMode) setSelectedTableId(null);
	}, [resaMode]);

	// Swap — effacer les candidats quand drag désactivé
	useEffect(() => {
		if (!dragEnabled) setSwapCandidates(null);
	}, [dragEnabled]);

	// Ref live des tables pour la détection d'overlap dans handlePositionChange
	const tablesRef = useRef(tables);
	useEffect(() => {
		tablesRef.current = tables;
	}, [tables]);

	// Tables fictives pour simulation (Salles 2 et 3) — Désactivé
	const mockTables = useMemo(() => [], []);

	const { on, off } = useSocket();

	// ⭐ Écouter directement le socket pour les suppressions/créations en temps réel
	useEffect(() => {
		if (isSimulation) return;

		const handleTableEvent = (event) => {
			const { type, data } = event;
			if (type === "deleted") {
				setTables((prev) => prev.filter((t) => t._id !== data._id));
				setModifiedTableIds((prev) => {
					const next = new Set(prev);
					next.delete(data._id);
					return next;
				});
			} else if (type === "created") {
				setTables((prev) => {
					if (prev.some((t) => t._id === data._id)) return prev;
					return [...prev, data];
				});
			}
		};

		on("table", handleTableEvent);
		return () => off("table", handleTableEvent);
	}, [isSimulation, on, off]);

	// Choisir les tables à afficher : filtrées par salle si une salle est sélectionnée
	const displayTables = useMemo(() => {
		const source = filteredTables;
		const seen = new Set();
		return source.filter((t) => {
			if (seen.has(t._id)) return false;
			seen.add(t._id);
			return true;
		});
	}, [filteredTables]);

	// États édition
	const [editingTable, setEditingTable] = useState(null);
	const [editMode, setEditMode] = useState(null); // "number" | "capacity"
	const [editValue, setEditValue] = useState("");

	// Mode Resa — selectedResaTable
	const [selectedResaTable, setSelectedResaTable] = useState(null); // { table, resaInfo }

	// Résolveur de réservation par table — retourne { resa, type: "en_cours"|"futur" } ou null
	const getTableResa = useCallback(
		(table) => {
			const now = new Date();
			// tableId peut être populé (objet) ou brut (ObjectId/string)
			const toId = (v) => (v?._id ?? v)?.toString();
			const tableIdStr = table._id?.toString();
			const matches = reservations.filter(
				(r) =>
					toId(r.tableId) === tableIdStr &&
					r.status !== "completed" &&
					r.status !== "cancelled",
			);
			// En cours : SEULEMENT statut "confirmed" (service actif)
			const enCours = matches.find((r) => r.status === "confirmed") || null;
			if (enCours) return { resa: enCours, type: "en_cours" };
			// Futur : toute resa "pending" (peu importe la date)
			const futur =
				matches
					.filter((r) => r.status === "pending")
					.sort(
						(a, b) => new Date(a.reservationDate) - new Date(b.reservationDate),
					)[0] || null;
			if (futur) return { resa: futur, type: "futur" };
			return null;
		},
		[reservations],
	);

	// Charger les tables
	const fetchTables = useCallback(async () => {
		if (isSimulation) return; // Pas de fetch pour les salles simulées
		if (!restaurantId) {
			return;
		}

		try {
			const data = await authFetch(`/tables/restaurant/${restaurantId}`, {
				method: "GET",
			});

			if (Array.isArray(data)) {
				setTables(data);
			}
		} catch (error) {
			console.error("❌ Erreur chargement tables:", error);
		}
	}, [restaurantId, authFetch, isSimulation]);

	// Charger les réservations
	const fetchReservations = useCallback(async () => {
		if (isSimulation) return; // Pas de fetch pour les salles simulées
		if (!restaurantId) return;

		try {
			const today = new Date();
			today.setHours(0, 0, 0, 0);
			const data = await authFetch(
				`/reservations?restaurantId=${restaurantId}&startDate=${today.toISOString()}`,
				{ method: "GET" },
			);

			if (Array.isArray(data)) {
				const todayStart = new Date();
				todayStart.setHours(0, 0, 0, 0);
				const todayEnd = new Date();
				todayEnd.setHours(23, 59, 59, 999);
				const active = data.filter(
					(r) =>
						r.status !== "completed" &&
						r.status !== "cancelled" &&
						r.restaurantId?.toString() === restaurantId?.toString() &&
						new Date(r.reservationDate) >= todayStart &&
						new Date(r.reservationDate) <= todayEnd,
				);
				setReservations(active);
			}
		} catch (error) {
			console.error("❌ Erreur chargement réservations:", error);
		}
	}, [restaurantId, authFetch, isSimulation]);

	useEffect(() => {
		if (visible) {
			// Réinitialiser les modes à chaque ouverture
			setResaMode(true);
			setDragEnabled(false);
			setResizeEnabled(false);
			setSnapToGrid(false);
			setSelectedResaTable(null);
		}
	}, [visible]);

	useEffect(() => {
		if (visible && restaurantId) {
			fetchTables();
			fetchReservations();
		}
	}, [visible, restaurantId, fetchTables, fetchReservations]);

	// 👆 Touch simple : Changer le numéro
	const handleSimpleTouch = (table) => {
		setEditingTable(table);
		setEditMode("number");
		setEditValue(String(table.number));
	};

	// 💪 Force touch : Changer la capacité
	const handleForceTouch = (table) => {
		setEditingTable(table);
		setEditMode("capacity");
		setEditValue(String(table.capacity));
	};

	// 💾 Sauvegarder les modifications
	const handleSave = async () => {
		if (isSimulation) {
			// Mode simulation : pas de sauvegarde
			setEditingTable(null);
			setEditMode(null);
			setEditValue("");
			return;
		}

		if (!editingTable || !editValue.trim()) {
			Alert.alert("Erreur", "Veuillez entrer une valeur");
			return;
		}

		try {
			const updateData = {};
			if (editMode === "number") {
				updateData.number = editValue.trim();
			} else if (editMode === "capacity") {
				const capacity = parseInt(editValue.trim());
				if (isNaN(capacity) || capacity < 1 || capacity > 50) {
					Alert.alert("Erreur", "La capacité doit être entre 1 et 50");
					return;
				}
				updateData.capacity = capacity;
			}

			const updatedTable = await authFetch(`/tables/${editingTable._id}`, {
				method: "PUT",
				body: updateData, // ✅ authFetch gère JSON.stringify automatiquement
			});

			if (updatedTable) {
				setTables((prev) =>
					prev.map((t) => (t._id === editingTable._id ? updatedTable : t)),
				);
				setEditingTable(null);
				setEditMode(null);
				setEditValue("");
			} else {
				console.error("❌ [FLOOR] Pas de réponse valide");
				Alert.alert("Erreur", "Modification impossible");
			}
		} catch (error) {
			console.error("❌ [FLOOR] Erreur sauvegarde:", error);
			Alert.alert("Erreur", "Impossible de sauvegarder");
		}
	};

	// ➕ Créer une nouvelle table (seulement salle 1)
	const handleCreateTable = async () => {
		if (isSimulation) return;

		try {
			// Générer un numéro unique non utilisé
			const existingNumbers = new Set(tables.map((t) => t.number));
			let n = tables.length + 1;
			while (existingNumbers.has(`T${n}`)) {
				n++;
			}

			const newTable = {
				restaurantId,
				number: `T${n}`,
				capacity: 4,
				status: "available",
			};

			// authFetch retourne directement les données parsées (pas un objet Response)
			const createdTable = await authFetch("/tables", {
				method: "POST",
				body: newTable, // authFetch gère JSON.stringify automatiquement
			});

			if (createdTable && createdTable._id) {
				setTables((prev) => [...prev, createdTable]);
			} else {
				console.error("❌ [FLOOR] Réponse invalide:", createdTable);
				Alert.alert("Erreur", "Impossible de créer la table");
			}
		} catch (error) {
			console.error("Erreur création table:", error);
			Alert.alert("Erreur", "Impossible de créer la table");
		}
	};

	// ➖ Supprimer une table (seulement salle 1)
	const handleDeleteTable = async (tableId) => {
		if (isSimulation) return;

		Alert.alert("Supprimer cette table ?", "Cette action est irréversible", [
			{ text: "Annuler", style: "cancel" },
			{
				text: "Supprimer",
				style: "destructive",
				onPress: async () => {
					try {
						// authFetch retourne [] en cas d'erreur, ou les données en cas de succès
						await authFetch(`/tables/${tableId}`, { method: "DELETE" });
						// Retrait immédiat du state local (le WS confirmera aussi)
						setTables((prev) => prev.filter((t) => t._id !== tableId));
						setModifiedTableIds((prev) => {
							const next = new Set(prev);
							next.delete(tableId);
							return next;
						});
					} catch (error) {
						console.error("❌ [FLOOR] Erreur suppression table:", error);
						Alert.alert("Erreur", "Impossible de supprimer la table");
					}
				},
			},
		]);
	};

	// � Mettre à jour la position d'une table
	const handlePositionChange = useCallback((tableId, newPosition) => {
		setTables((prev) =>
			prev.map((t) =>
				t._id === tableId ? { ...t, position: newPosition } : t,
			),
		);
		setModifiedTableIds((prev) => new Set(prev).add(tableId));

		// Détection overlap — au moment du drop, données les plus fraîches
		if (!dragEnabledRef.current) {
			return;
		}
		const allTables = tablesRef.current;
		const moved = allTables.find(t => t._id === tableId);
		const wA = (moved?.sizeW || moved?.size || 1) * 100;
		const hA = (moved?.sizeH || moved?.size || 1) * 100;
		for (const other of allTables) {
			if (other._id === tableId) continue;
			const panB = panRefsMap.current[other._id];
			const xB = panB ? panB.x._value : (other.position?.x ?? 0);
			const yB = panB ? panB.y._value : (other.position?.y ?? 0);
			const wB = (other.sizeW || other.size || 1) * 100;
			const hB = (other.sizeH || other.size || 1) * 100;
			const overlap = newPosition.x < xB + wB && newPosition.x + wA > xB &&
				newPosition.y < yB + hB && newPosition.y + hA > yB;
			if (overlap) {
				setSwapCandidates({ idA: tableId, idB: other._id });
				return;
			}
		}
		setSwapCandidates(null);
	}, []);

	// � Gérer le changement de taille
	const handleSizeChange = useCallback((tableId, newSize) => {
		setTables((prev) =>
			prev.map((t) =>
				t._id === tableId ? { ...t, sizeW: newSize.w, sizeH: newSize.h } : t,
			),
		);
		setModifiedTableIds((prev) => new Set(prev).add(tableId));
	}, []);

	// Feature 5 — Align selected table
	const alignTable = useCallback((direction) => {
		if (!selectedTableId) return;
		const panRef = panRefsMap.current[selectedTableId];
		if (!panRef) return;
		const table = displayTables.find(t => t._id === selectedTableId);
		if (!table) return;
		const W = canvasRef.current.width;
		const H = canvasRef.current.height;
		const tw = (table.sizeW || table.size || 1) * 100;
		const th = (table.sizeH || table.size || 1) * 100;
		let x = panRef.x._value;
		let y = panRef.y._value;
		if (direction === 'left') x = 0;
		if (direction === 'right') x = W - tw;
		if (direction === 'centerH') x = (W - tw) / 2;
		if (direction === 'top') y = 0;
		if (direction === 'bottom') y = H - th;
		if (direction === 'centerV') y = (H - th) / 2;
		Animated.spring(panRef, { toValue: { x, y }, tension: 120, friction: 8, useNativeDriver: false }).start();
		handlePositionChange(selectedTableId, { x, y });
	}, [selectedTableId, displayTables, handlePositionChange]);

	// �💾 Sauvegarder le plan (positions)
	// Swap — inverser les numéros de deux tables
	const handleSwapTables = useCallback(async (idA, idB) => {
		if (isSimulation) return;
		const tA = displayTables.find(t => t._id === idA);
		const tB = displayTables.find(t => t._id === idB);
		if (!tA || !tB) return;
		try {
			const [updA, updB] = await Promise.all([
				authFetch(`/tables/${idA}`, { method: 'PUT', body: { number: tB.number } }),
				authFetch(`/tables/${idB}`, { method: 'PUT', body: { number: tA.number } }),
			]);
			if (updA?._id && updB?._id) {
				setTables(prev => prev.map(t => {
					if (t._id === idA) return { ...t, number: tB.number };
					if (t._id === idB) return { ...t, number: tA.number };
					return t;
				}));
				setSwapCandidates(null);
			}
		} catch (err) {
			console.error('❌ [FLOOR] Swap tables:', err);
			Alert.alert('Erreur', "Impossible d'échanger les tables");
		}
	}, [isSimulation, displayTables, authFetch]);

	const handleSavePlan = async () => {
		if (isSimulation) return;

		try {
			// ⭐ Ne sauvegarder QUE les tables modifiées
			const modifiedIds = Array.from(modifiedTableIds);

			if (modifiedIds.length === 0) {
				Alert.alert("Info", "Aucune modification à sauvegarder");
				return;
			}

			// ⭐ Filtrer uniquement les tables encore présentes (non supprimées entre-temps)
			const currentIds = new Set(tables.map((t) => t._id));
			const updates = displayTables
				.filter(
					(table) =>
						modifiedIds.includes(table._id) && currentIds.has(table._id),
				)
				.map((table) => ({
					id: table._id,
					position: table.position,
					sizeW: table.sizeW || table.size || 1,
					sizeH: table.sizeH || table.size || 1,
				}));

			if (updates.length === 0) {
				Alert.alert("Info", "Aucune modification à sauvegarder");
				return;
			}

			// Appel API pour sauvegarder toutes les positions et tailles
			let savedCount = 0;
			for (const update of updates) {
				try {
					const updatedTable = await authFetch(`/tables/${update.id}`, {
						method: "PUT",
						body: {
							position: update.position,
							sizeW: update.sizeW,
							sizeH: update.sizeH,
						},
					});

					// ⭐ Mettre à jour le state local avec la table sauvegardée
					if (updatedTable && updatedTable._id) {
						setTables((prev) =>
							prev.map((t) =>
								t._id === update.id
									? {
											...updatedTable,
											// Préserver sizeW/sizeH si le serveur ne les retourne pas
											sizeW: updatedTable.sizeW ?? update.sizeW,
											sizeH: updatedTable.sizeH ?? update.sizeH,
										}
									: t,
							),
						);
						savedCount++;
					} else {
						// Table introuvable (supprimée entre-temps) - on nettoie
						console.warn(`⚠️ [FLOOR] Table ${update.id} introuvable, skip`);
						setModifiedTableIds((prev) => {
							const next = new Set(prev);
							next.delete(update.id);
							return next;
						});
					}
				} catch (updateError) {
					console.warn(
						`⚠️ [FLOOR] Erreur save table ${update.id}:`,
						updateError,
					);
				}
			}

			if (savedCount > 0) {
				Alert.alert("Succès", `${savedCount} position(s) sauvegardée(s)`);
			} else {
				Alert.alert(
					"Info",
					"Aucune table à sauvegarder (supprimées entre-temps)",
				);
			}
			setModifiedTableIds(new Set()); // Réinitialiser après sauvegarde
		} catch (error) {
			console.error("Erreur sauvegarde plan:", error);
			Alert.alert("Erreur", "Impossible de sauvegarder le plan");
		}
	};

	// Feature 4 — Derived selected table data
	const selectedTable = selectedTableId ? displayTables.find(t => t._id === selectedTableId) : null;
	const selectedTableResa = selectedTable ? getTableResa(selectedTable) : null;
	// leftPanelTable : table visible dans le panel gauche, quelque soit le mode
	const leftPanelTable = selectedTable ?? (resaMode && selectedResaTable ? selectedResaTable.table : null);
	const panelResa = leftPanelTable ? getTableResa(leftPanelTable) : null;

	return (
		<Modal
			visible={visible}
			animationType="fade"
			transparent
			onRequestClose={onClose}
		>
			<BlurView intensity={40} style={StyleSheet.absoluteFill}>
				<TouchableOpacity
					style={styles.overlay}
					activeOpacity={1}
					onPress={onClose}
				>
					{/* LEFT PANEL — in the 0-281px blurred zone */}
					<TouchableOpacity activeOpacity={1} style={styles.leftPanel} onPress={(e) => e.stopPropagation()}>
						{/* Header — same paddingVertical as main header for alignment */}
						<View style={[styles.leftPanelHeader, { height: headerHeight }]}>
							<Text style={styles.leftPanelTitle}>
								{leftPanelTable ? `Table #${leftPanelTable.number}` : `Salle ${roomNumber}`}
							</Text>
							{!isSimulation && (
								<TouchableOpacity onPress={handleCreateTable} style={styles.leftPanelAddBtn}>
									<Ionicons name="add" size={18} color={"#F59E0B"} />
								</TouchableOpacity>
							)}
						</View>

						{/* Properties — fixed, no scroll */}
						{!isSimulation && selectedTable && !resaMode && (
							<View style={{ paddingHorizontal: 14, paddingTop: 12, gap: 10 }}>
								{/* N° de table stepper */}
								<Text style={styles.propsSectionLabel}>N° de table</Text>
								{(() => {
									const taken = new Set(tables.filter(t => t._id !== selectedTable._id).map(t => String(t.number)));
									const avail = [];
									for (let i = 1; i <= 99; i++) { if (!taken.has(String(i))) avail.push(String(i)); }
									const cur = String(selectedTable.number);
									if (!avail.includes(cur)) avail.unshift(cur);
									avail.sort((a, b) => Number(a) - Number(b));
									const curIdx = avail.indexOf(cur);
									const prevNum = avail[curIdx > 0 ? curIdx - 1 : avail.length - 1];
									const nextNum = avail[curIdx < avail.length - 1 ? curIdx + 1 : 0];
									const updateNumber = async (n) => {
										const updated = await authFetch(`/tables/${selectedTable._id}`, { method: 'PUT', body: { number: n } });
										if (updated?._id) setTables(prev => prev.map(t => t._id === selectedTable._id ? { ...t, number: n } : t));
									};
									return (
										<View style={styles.propsStepperRow}>
											<TouchableOpacity style={styles.propsStepperBtn} onPress={() => updateNumber(prevNum)}>
												<Text style={styles.propsStepperBtnText}>−</Text>
											</TouchableOpacity>
											<Text style={styles.propsStepperValue}>{cur}</Text>
											<TouchableOpacity style={styles.propsStepperBtn} onPress={() => updateNumber(nextNum)}>
												<Text style={styles.propsStepperBtnText}>+</Text>
											</TouchableOpacity>
										</View>
									);
								})()}

								{/* Capacité stepper */}
								<Text style={styles.propsSectionLabel}>Capacité</Text>
								<View style={styles.propsStepperRow}>
									<TouchableOpacity style={styles.propsStepperBtn} onPress={async () => {
										const newCap = Math.max(1, (selectedTable.capacity || 1) - 1);
										const updated = await authFetch(`/tables/${selectedTable._id}`, { method: 'PUT', body: { capacity: newCap } });
										if (updated?._id) setTables(prev => prev.map(t => t._id === selectedTable._id ? { ...t, capacity: newCap } : t));
									}}>
										<Text style={styles.propsStepperBtnText}>−</Text>
									</TouchableOpacity>
									<Text style={styles.propsStepperValue}>{selectedTable.capacity || 1}</Text>
									<TouchableOpacity style={styles.propsStepperBtn} onPress={async () => {
										const newCap = Math.min(50, (selectedTable.capacity || 1) + 1);
										const updated = await authFetch(`/tables/${selectedTable._id}`, { method: 'PUT', body: { capacity: newCap } });
										if (updated?._id) setTables(prev => prev.map(t => t._id === selectedTable._id ? { ...t, capacity: newCap } : t));
									}}>
										<Text style={styles.propsStepperBtnText}>+</Text>
									</TouchableOpacity>
								</View>

								{/* Places rapides */}
								<Text style={styles.propsSectionLabel}>Places rapides</Text>
								<View style={styles.propsQuickSeatsRow}>
									{[2, 3, 4, 6, 8, 10, 12].map(n => (
										<TouchableOpacity key={n} style={[styles.propsQuickSeatBtn, selectedTable.capacity === n && styles.propsQuickSeatBtnActive]} onPress={async () => {
											const updated = await authFetch(`/tables/${selectedTable._id}`, { method: 'PUT', body: { capacity: n } });
											if (updated?._id) setTables(prev => prev.map(t => t._id === selectedTable._id ? { ...t, capacity: n } : t));
										}}>
											<Text style={[styles.propsQuickSeatText, selectedTable.capacity === n && styles.propsQuickSeatTextActive]}>{n}</Text>
										</TouchableOpacity>
									))}
								</View>

								{/* Statut */}
								<Text style={styles.propsSectionLabel}>Statut</Text>
								{[
									{ key: 'available', label: 'Disponible', color: '#10B981' },
									{ key: 'occupied', label: 'Occupée', color: '#EF4444' },
									{ key: 'unavailable', label: 'Indisponible', color: '#9E9E9E' },
								].map(({ key, label, color }) => (
									<TouchableOpacity key={key} style={[styles.propsStatusBtn, selectedTable.status === key && { borderColor: color, backgroundColor: color + '22' }]} onPress={async () => {
										const updated = await authFetch(`/tables/${selectedTable._id}`, { method: 'PUT', body: { status: key } });
										if (updated?._id) setTables(prev => prev.map(t => t._id === selectedTable._id ? { ...t, status: key } : t));
									}}>
										<View style={[styles.propsStatusDot, { backgroundColor: color }]} />
										<Text style={[styles.propsStatusLabel, selectedTable.status === key && { color }]}>{label}</Text>
									</TouchableOpacity>
								))}

								{/* Forme */}
								<Text style={styles.propsSectionLabel}>Forme</Text>
								<View style={styles.propsShapeRow}>
									{[{ key: 'rect', label: '▬ Rect.' }, { key: 'round', label: '⬤ Ronde' }].map(({ key, label }) => (
										<TouchableOpacity key={key} style={[styles.propsShapeBtn, (selectedTable.shape || 'rect') === key && styles.propsShapeBtnActive]} onPress={async () => {
											const updated = await authFetch(`/tables/${selectedTable._id}`, { method: 'PUT', body: { shape: key } });
											if (updated?._id) setTables(prev => prev.map(t => t._id === selectedTable._id ? { ...t, shape: key } : t));
										}}>
											<Text style={[(selectedTable.shape || 'rect') === key ? styles.propsShapeTextActive : styles.propsShapeText]}>{label}</Text>
										</TouchableOpacity>
									))}
								</View>

								{/* Supprimer */}
								<TouchableOpacity style={styles.propsDeleteBtn} onPress={() => { handleDeleteTable(selectedTable._id); setSelectedTableId(null); }}>
									<Ionicons name="trash-outline" size={16} color="#EF4444" />
									<Text style={styles.propsDeleteText}>Supprimer</Text>
								</TouchableOpacity>

								{/* Assigner à la salle courante */}
								{currentRoom && (
									<TouchableOpacity
										style={{ flexDirection: "row", alignItems: "center", gap: 6, padding: 8, borderRadius: 8, backgroundColor: THEME.colors.primary + "22", marginTop: 8 }}
										onPress={async () => {
											try {
												const updated = await authFetch(`/rooms/${currentRoom._id}/tables`, {
													method: "POST",
													body: { tableIds: [selectedTable._id] },
												});
												if (updated && updated._id) {
													setRooms((prev) => prev.map((r) => r._id === currentRoom._id ? updated : r));
													Alert.alert("✅", `Table ajoutée à « ${currentRoom.name} »`);
												}
											} catch (e) {
												Alert.alert("Erreur", "Impossible d'assigner la table");
											}
										}}
									>
										<Ionicons name="home-outline" size={14} color={THEME.colors.primary} />
										<Text style={{ color: THEME.colors.primary, fontSize: 12, fontWeight: "600" }}>
											Ajouter à « {currentRoom.name} »
										</Text>
									</TouchableOpacity>
								)}
							</View>
						)}

						{/* Resa liée — visible en resaMode ET en mode édition */}
						{panelResa && (
							<View style={{ paddingHorizontal: 14, paddingTop: selectedTable ? 10 : 12 }}>
								<View style={styles.leftResaCard}>
									<Text style={styles.leftResaName}>{panelResa.resa.clientName || '—'}</Text>
									<Text style={styles.leftResaDetail}>
										{panelResa.resa.reservationTime || (panelResa.resa.reservationDate ? new Date(panelResa.resa.reservationDate).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '')}
										{panelResa.resa.nbPersonnes ? ` · ${panelResa.resa.nbPersonnes} pers.` : ''}
									</Text>
									<View style={[styles.leftResaStatus, { backgroundColor: panelResa.type === 'en_cours' ? '#EF4444' : '#3B82F6' }]}>
										<Text style={styles.leftResaStatusText}>{panelResa.type === 'en_cours' ? 'En cours' : 'À venir'}</Text>
									</View>
								</View>
							</View>
						)}

						{/* Divider + Réservations du jour — ScrollView seulement ici */}
						<View style={styles.leftPanelDivider} />
						<Text style={styles.leftPanelSectionTitle}>Réservations du jour</Text>
						<ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 20 }}>
							{reservations.length === 0 ? (
								<Text style={styles.leftResaEmpty}>Aucune réservation</Text>
							) : (
								reservations
									.slice()
									.sort((a, b) => new Date(a.reservationDate) - new Date(b.reservationDate))
									.map(r => {
										const toId = v => (v?._id ?? v)?.toString();
										const isLinked = selectedTable && toId(r.tableId) === selectedTable._id?.toString();
										const time = r.reservationTime || (r.reservationDate ? new Date(r.reservationDate).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '');
										return (
											<TouchableOpacity
												key={r._id}
												style={[styles.leftResaRow, isLinked && styles.leftResaRowActive]}
												onPress={() => {
													const tid = toId(r.tableId);
													if (tid) setSelectedTableId(tid);
												}}
												activeOpacity={0.7}
											>
												<View style={[styles.leftResaRowDot, { backgroundColor: r.status === 'confirmed' ? '#EF4444' : '#3B82F6' }]} />
												<View style={{ flex: 1 }}>
													<Text style={[styles.leftResaRowName, !isLinked && styles.leftResaRowNameMuted]} numberOfLines={1}>
														{r.clientName || '—'}
													</Text>
													<Text style={styles.leftResaRowDetail}>{time}{r.nbPersonnes ? ` · ${r.nbPersonnes}p` : ''}</Text>
												</View>
												{r.tableId && (
													<Text style={styles.leftResaRowTable}>T{toId(r.tableId)?.slice(-2)}</Text>
												)}
											</TouchableOpacity>
										);
									})
							)}
						</ScrollView>
					</TouchableOpacity>

					<TouchableOpacity
						activeOpacity={1}
						style={styles.container}
						onPress={(e) => e.stopPropagation()}
					>
						{/* Header */}
						<View style={styles.header} onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height)}>
							<Text style={styles.title}>
								{currentRoom ? currentRoom.name : "Toutes les tables"}{isSimulation && " - Simulation"}
							</Text>

							{/* Toggles Resa / Drag / Resize / Grid */}
							<View style={styles.toggleContainer}>
								{/* Bouton Resa */}
								<TouchableOpacity
									onPress={() => {
										const next = !resaMode;
										setResaMode(next);
										setSelectedResaTable(null);
										if (next) {
											// Resa activé → désactiver les autres modes
											setDragEnabled(false);
											setResizeEnabled(false);
											setSnapToGrid(false);
					setSelectedTableId(null);
										}
									}}
									style={[
										styles.toggleButton,
										resaMode && styles.toggleButtonResaActive,
									]}
								>
									<Ionicons
										name="calendar-outline"
										size={20}
										color={resaMode ? "#fff" : "#64748B"}
									/>
									<Text
										style={[
											styles.toggleButtonText,
											resaMode && styles.toggleButtonTextActive,
										]}
									>
										Resa
									</Text>
								</TouchableOpacity>
								<TouchableOpacity
									onPress={() => {
										setDragEnabled(!dragEnabled);
										setResizeEnabled(false);
									}}
									disabled={resaMode}
									style={[
										styles.toggleButton,
										dragEnabled && styles.toggleButtonActive,
										resaMode && styles.toggleButtonDisabled,
									]}
								>
									<Ionicons
										name="move"
										size={20}
										color={
											resaMode
												? "#64748B" + "40"
												: dragEnabled
													? "#fff"
													: "#64748B"
										}
									/>
									<Text
										style={[
											styles.toggleButtonText,
											dragEnabled && styles.toggleButtonTextActive,
											resaMode && styles.toggleButtonTextDisabled,
										]}
									>
										Drag
									</Text>
								</TouchableOpacity>

								<TouchableOpacity
									onPress={() => {
										setResizeEnabled(!resizeEnabled);
										setDragEnabled(false);
									}}
									disabled={resaMode}
									style={[
										styles.toggleButton,
										resizeEnabled && styles.toggleButtonActive,
										resaMode && styles.toggleButtonDisabled,
									]}
								>
									<Ionicons
										name="resize"
										size={20}
										color={
											resaMode
												? "#64748B" + "40"
												: resizeEnabled
													? "#fff"
													: "#64748B"
										}
									/>
									<Text
										style={[
											styles.toggleButtonText,
											resizeEnabled && styles.toggleButtonTextActive,
											resaMode && styles.toggleButtonTextDisabled,
										]}
									>
										Resize
									</Text>
								</TouchableOpacity>

								<TouchableOpacity
									onPress={() => setSnapToGrid(!snapToGrid)}
									disabled={resaMode}
									style={[
										styles.toggleButton,
										snapToGrid && styles.toggleButtonActive,
										resaMode && styles.toggleButtonDisabled,
									]}
								>
									<Ionicons
										name="grid"
										size={20}
										color={
											resaMode
												? "#64748B" + "40"
												: snapToGrid
													? "#fff"
													: "#64748B"
										}
									/>
									<Text
										style={[
											styles.toggleButtonText,
											snapToGrid && styles.toggleButtonTextActive,
											resaMode && styles.toggleButtonTextDisabled,
										]}
									>
										Snap
									</Text>
								</TouchableOpacity>
								<TouchableOpacity
									onPress={() => setShowGrid(!showGrid)}
									disabled={resaMode}
									style={[
										styles.toggleButton,
										showGrid && styles.toggleButtonActive,
										resaMode && styles.toggleButtonDisabled,
									]}
								>
									<Ionicons
										name="grid-outline"
										size={20}
										color={
											resaMode
												? "#64748B" + "40"
												: showGrid
													? "#fff"
													: "#64748B"
										}
									/>
									<Text
										style={[
											styles.toggleButtonText,
											showGrid && styles.toggleButtonTextActive,
											resaMode && styles.toggleButtonTextDisabled,
										]}
									>
										Grille
									</Text>
								</TouchableOpacity>
							</View>

							<TouchableOpacity onPress={onClose} style={styles.closeButton}>
								<Ionicons
									name="close"
									size={24}
									color={"#F1F5F9"}
								/>
							</TouchableOpacity>
						</View>

						{/* Navigation Salles */}
						<View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 6, backgroundColor: THEME.colors.background.secondary, borderBottomWidth: 1, borderBottomColor: THEME.colors.border }}>
							<TouchableOpacity
								onPress={() => setCurrentRoomIndex(-1)}
								style={[{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginRight: 6 }, currentRoomIndex === -1 && { backgroundColor: THEME.colors.primary }]}
							>
								<Text style={{ color: currentRoomIndex === -1 ? "#fff" : THEME.colors.text.secondary, fontSize: 12, fontWeight: "600" }}>
									Toutes
								</Text>
							</TouchableOpacity>
							{rooms.map((room, idx) => (
								<TouchableOpacity
									key={room._id}
									onPress={() => setCurrentRoomIndex(idx)}
									style={[{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginRight: 6 }, currentRoomIndex === idx && { backgroundColor: THEME.colors.primary }]}
									onLongPress={() => handleDeleteRoom(room._id)}
								>
									<Text style={{ color: currentRoomIndex === idx ? "#fff" : THEME.colors.text.secondary, fontSize: 12, fontWeight: "600" }}>
										{room.name}
									</Text>
								</TouchableOpacity>
							))}
							<TouchableOpacity
								onPress={() => setShowRoomManager(true)}
								style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: THEME.colors.primary + "33", alignItems: "center", justifyContent: "center", marginLeft: 4 }}
							>
								<Ionicons name="add" size={16} color={THEME.colors.primary} />
							</TouchableOpacity>
						</View>

						{/* Modal création salle */}
						{showRoomManager && (
							<View style={{ position: "absolute", top: 80, left: 16, right: 16, backgroundColor: THEME.colors.background.primary, borderRadius: 12, padding: 16, zIndex: 1000, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 10 }}>
								<Text style={{ color: THEME.colors.text.primary, fontWeight: "700", fontSize: 15, marginBottom: 12 }}>Nouvelle salle</Text>
								<TextInput
									style={{ borderWidth: 1, borderColor: THEME.colors.border, borderRadius: 8, padding: 10, color: THEME.colors.text.primary, backgroundColor: THEME.colors.background.secondary, marginBottom: 12, fontSize: 14 }}
									placeholder="Nom de la salle (ex: Terrasse)"
									placeholderTextColor={THEME.colors.text.secondary}
									value={newRoomName}
									onChangeText={setNewRoomName}
									autoFocus
								/>
								<View style={{ flexDirection: "row", gap: 8 }}>
									<TouchableOpacity onPress={() => { setShowRoomManager(false); setNewRoomName(""); }} style={{ flex: 1, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: THEME.colors.border, alignItems: "center" }}>
										<Text style={{ color: THEME.colors.text.secondary }}>Annuler</Text>
									</TouchableOpacity>
									<TouchableOpacity onPress={handleCreateRoom} style={{ flex: 1, padding: 10, borderRadius: 8, backgroundColor: THEME.colors.primary, alignItems: "center" }}>
										<Text style={{ color: "#fff", fontWeight: "700" }}>Créer</Text>
									</TouchableOpacity>
								</View>
							</View>
						)}

						{/* Feature 5 — Alignment Toolbar */}
						{dragEnabled && (
							<View style={styles.alignToolbar}>
								{[
									{ dir: 'left', icon: 'arrow-back', label: 'G' },
									{ dir: 'centerH', icon: 'contract', label: 'CH' },
									{ dir: 'right', icon: 'arrow-forward', label: 'D' },
									{ dir: 'top', icon: 'arrow-up', label: 'H' },
									{ dir: 'centerV', icon: 'contract', label: 'CV' },
									{ dir: 'bottom', icon: 'arrow-down', label: 'B' },
								].map(({ dir, icon, label }) => (
									<TouchableOpacity key={dir} style={[styles.alignBtn, !selectedTableId && styles.alignBtnDisabled]} onPress={() => alignTable(dir)} disabled={!selectedTableId}>
										<Ionicons name={icon} size={14} color={selectedTableId ? "#F59E0B" : "#64748B"} />
										<Text style={[styles.alignBtnText, selectedTableId && styles.alignBtnTextActive]}>{label}</Text>
									</TouchableOpacity>
								))}
								<Text style={styles.alignHint}>{selectedTableId ? `Table sélectionnée` : 'Tap une table pour aligner'}</Text>
								{/* DEBUG SWAP — à retirer après fix */}
								<Text style={{ fontSize: 9, color: swapCandidates ? '#22c55e' : '#ef4444', marginLeft: 4 }}>
									{swapCandidates ? `SWAP:${String(swapCandidates.idA).slice(-4)}↔${String(swapCandidates.idB).slice(-4)}` : 'no swap'}
								</Text>
							</View>
						)}

						{/* Zone de plan (toutes les tables visibles) */}
						<View style={styles.planContainer} onLayout={(e) => { canvasRef.current = { width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height }; }}>
							{/* Grille visuelle — affichée quand Grid est actif */}
							{showGrid && (
								<View style={StyleSheet.absoluteFill} pointerEvents="none">
									{Array.from({ length: 60 }).map((_, i) => (
										<View
											key={`h${i}`}
											style={{
												position: "absolute",
												top: i * 30,
												left: 0,
												right: 0,
												height: 1,
												backgroundColor: "rgba(255,255,255,0.07)",
											}}
										/>
									))}
									{Array.from({ length: 80 }).map((_, i) => (
										<View
											key={`v${i}`}
											style={{
												position: "absolute",
												left: i * 30,
												top: 0,
												bottom: 0,
												width: 1,
												backgroundColor: "rgba(255,255,255,0.07)",
											}}
										/>
									))}
								</View>
							)}
							{/* Bande info resa — flottante, sans déplacer le plan */}
							{resaMode && selectedResaTable && (
								<View style={styles.resaInfoBand}>
									<View
										style={[
											styles.resaInfoBandDot,
											{
												backgroundColor:
													selectedResaTable.resaInfo.type === "en_cours"
														? "#EF4444"
														: "#3B82F6",
											},
										]}
									/>
									<Text style={styles.resaInfoBandText} numberOfLines={1}>
										<Text style={styles.resaInfoBandBold}>
											Table {selectedResaTable.table.number}
										</Text>
										{"  "}
										{selectedResaTable.resaInfo.resa.clientName || "—"}
										{"  ·  "}
										{selectedResaTable.resaInfo.resa.reservationTime ||
											(selectedResaTable.resaInfo.resa.reservationDate
												? new Date(
														selectedResaTable.resaInfo.resa.reservationDate,
													).toLocaleTimeString("fr-FR", {
														hour: "2-digit",
														minute: "2-digit",
													})
												: "")}
										{selectedResaTable.resaInfo.resa.nbPersonnes
											? `  · ${selectedResaTable.resaInfo.resa.nbPersonnes} pers.`
											: ""}
										{"  · "}
										{selectedResaTable.resaInfo.type === "en_cours"
											? "En cours"
											: "À venir"}
									</Text>
									<TouchableOpacity onPress={() => setSelectedResaTable(null)}>
										<Ionicons
											name="close"
											size={16}
											color={"#64748B"}
										/>
									</TouchableOpacity>
								</View>
							)}
							{tables.length === 0 ? (
								<View style={styles.emptyState}>
									<Ionicons
										name="restaurant-outline"
										size={64}
										color={"#64748B"}
									/>
									<Text style={styles.emptyStateTitle}>Aucune table</Text>
									<Text style={styles.emptyStateText}>
										Créez vos tables depuis la section Tables
									</Text>
								</View>
							) : (
								<View style={styles.tablesContainer}>
									{displayTables.map((table, index) => {
										const _toId = (v) => (v?._id ?? v)?.toString();

										
										// Prochaine réservation à venir pour cette table
										const nextReservation = upcomingReservations
											.filter((r) => {
												const tableId = _toId(r.tableId);
												const tableIds = r.tableIds || [];
												const match = tableId === table._id?.toString() ||
													tableIds.some((tid) => _toId(tid) === table._id?.toString());
												
												// 🐛 DEBUG: Log pour Tab3
												if (table.number === "Tab3" || table.number === 3) {
												}
												
												return match;
											})
											.sort(
												(a, b) =>
													new Date(a.reservationDate) -
													new Date(b.reservationDate),
											)[0];
										
										// 🐛 DEBUG: Log global pour Tab3
										if (table.number === "Tab3" || table.number === 3) {
										}

										const resaInfo = resaMode ? getTableResa(table) : null;
										const hasReservation = !!getTableResa(table);

										return (
											<TableCard
												key={table._id}
												table={table}
												theme={THEME}
												index={index}
												nextReservation={nextReservation}
												resaMode={resaMode}
												resaInfo={resaInfo}
												hasReservation={hasReservation}
												isFocused={focusedTableId === table._id?.toString()}
												onResaSelect={() => {
													if (resaInfo) {
														setSelectedResaTable({ table, resaInfo });
													} else {
														setSelectedResaTable(null);
													}
												}}
												onSimpleTouch={() => setSelectedTableId(table._id)}
												onPositionChange={handlePositionChange}
												onSizeChange={handleSizeChange}
												isModified={modifiedTableIds.has(table._id)}
												dragEnabled={dragEnabled}
												resizeEnabled={resizeEnabled}
												snapToGrid={snapToGrid}
												isSelected={selectedTableId === table._id}
											onRegisterPan={(id, panRef) => { panRefsMap.current[id] = panRef; }}
											/>
										);
									})}
								</View>
							)}
							{/* Bouton swap — positionné dans planContainer pour garantir visibilité */}
							{swapCandidates && dragEnabled && (() => {
								const tA = displayTables.find(t => t._id === swapCandidates.idA);
								const tB = displayTables.find(t => t._id === swapCandidates.idB);
								if (!tA || !tB) return null;
								const xA = tA.position?.x ?? 0;
								const yA = tA.position?.y ?? 0;
								const wA = (tA.sizeW || tA.size || 1) * 100;
								const hA = (tA.sizeH || tA.size || 1) * 100;
								const xB = tB.position?.x ?? 0;
								const yB = tB.position?.y ?? 0;
								const wB = (tB.sizeW || tB.size || 1) * 100;
								const hB = (tB.sizeH || tB.size || 1) * 100;
								const midX = (xA + wA / 2 + xB + wB / 2) / 2 - 24;
								const midY = (yA + hA / 2 + yB + hB / 2) / 2 - 24;
								return (
									<TouchableOpacity
										key="swap-btn"
										style={{
											position: 'absolute',
											left: midX,
											top: midY,
											width: 48,
											height: 48,
											borderRadius: 24,
											backgroundColor: THEME.colors.primary?.amber ?? '#F59E0B',
											alignItems: 'center',
											justifyContent: 'center',
											zIndex: 9999,
											elevation: 12,
											shadowColor: '#000',
											shadowOffset: { width: 0, height: 4 },
											shadowOpacity: 0.4,
											shadowRadius: 8,
										}}
										onPress={() => handleSwapTables(swapCandidates.idA, swapCandidates.idB)}
										activeOpacity={0.85}
									>
										<Ionicons name="sync" size={22} color="#1A1A1A" />
									</TouchableOpacity>
								);
							})()}
						</View>
						{/* Footer */}
						<View style={styles.footer}>
							<View style={styles.footerInfo}>
								<Text style={styles.footerText}>
									{displayTables.length} table
									{displayTables.length > 1 ? "s" : ""}
									{isSimulation && " (simulation)"}
								</Text>
								<Text style={styles.footerHint}>
									{resaMode
										? "Appuyez sur une table pour voir sa réservation"
										: `Tap une table pour voir ses propriétés${!isSimulation ? "  •  × pour supprimer" : ""}`}
								</Text>
							</View>

							{!isSimulation && (
								<TouchableOpacity
									style={styles.savePlanButton}
									onPress={handleSavePlan}
								>
									<Ionicons name="save-outline" size={18} color="#fff" />
									<Text style={styles.savePlanText}>Sauvegarder</Text>
								</TouchableOpacity>
							)}
						</View>
					</TouchableOpacity>

				</TouchableOpacity>
			</BlurView>
		</Modal>
	);
}

// 🎴 Composant TableCard (simple touch + force touch simulé par longPress)
const TableCard = ({
	table,
	theme,
	index,
	nextReservation,
	resaMode,
	resaInfo,
	hasReservation,
	isFocused,
	onResaSelect,
	onSimpleTouch,
	onPositionChange,
	onSizeChange,
	isModified,
	dragEnabled,
	resizeEnabled,
	snapToGrid,
	isSelected,
	onRegisterPan,
}) => {
	const tableSizeW = table.sizeW || table.size || 1;
	const tableSizeH = table.sizeH || table.size || 1;
	const baseSize = 100;

	// Dimensions locales pour le resize en temps réel (largeur et hauteur indépendantes)
	const [currentWidth, setCurrentWidth] = useState(tableSizeW);
	const [currentHeight, setCurrentHeight] = useState(tableSizeH);
	const actualWidth = baseSize * currentWidth;
	const actualHeight = baseSize * currentHeight;
	// Refs pour éviter les closures stales dans PanResponder
	const currentWidthRef = useRef(tableSizeW);
	const currentHeightRef = useRef(tableSizeH);
	// Flag pour empêcher le useEffect de re-sync de casser un resize en cours
	const isResizingRef = useRef(false);

	// Refs pour les modes drag et resize (pour que PanResponders aient les valeurs à jour)
	const dragEnabledRef = useRef(dragEnabled);
	const resizeEnabledRef = useRef(resizeEnabled);
	const snapToGridRef = useRef(snapToGrid);

	useEffect(() => {
		dragEnabledRef.current = dragEnabled;
		resizeEnabledRef.current = resizeEnabled;
		snapToGridRef.current = snapToGrid;
	}, [dragEnabled, resizeEnabled, snapToGrid]);

	// Synchroniser les dimensions avec les valeurs de la table (depuis le serveur uniquement)
	useEffect(() => {
		// Ne pas écraser les dimensions si un resize est en cours
		if (isResizingRef.current) return;
		setCurrentWidth(tableSizeW);
		setCurrentHeight(tableSizeH);
		currentWidthRef.current = tableSizeW;
		currentHeightRef.current = tableSizeH;
	}, [tableSizeW, tableSizeH]);

	// Disposition espacée (4 colonnes au lieu de 3)
	const columnIndex = index % 4;
	const rowIndex = Math.floor(index / 4);
	const initialX = table.position?.x ?? columnIndex * 140 + 30;
	const initialY = table.position?.y ?? rowIndex * 160 + 30;

	// Animation pour le drag
	const pan = useRef(
		new Animated.ValueXY({ x: initialX, y: initialY }),
	).current;
	const [isDragging, setIsDragging] = useState(false);

	// Pulse animation (focus depuis sidebar)
	const pulseAnim = useRef(new Animated.Value(1)).current;
	useEffect(() => {
		if (!isFocused) return;
		Animated.sequence([
			Animated.timing(pulseAnim, { toValue: 1.08, duration: 200, useNativeDriver: true }),
			Animated.timing(pulseAnim, { toValue: 1.0, duration: 200, useNativeDriver: true }),
			Animated.timing(pulseAnim, { toValue: 1.08, duration: 200, useNativeDriver: true }),
			Animated.timing(pulseAnim, { toValue: 1.0, duration: 200, useNativeDriver: true }),
		]).start();
	}, [isFocused, pulseAnim]);

	// Register pan ref with parent for alignment
	useEffect(() => {
		if (onRegisterPan) onRegisterPan(table._id, pan);
	}, []);

	// PanResponder pour le drag
	const panResponder = useRef(
		PanResponder.create({
			onStartShouldSetPanResponder: (evt) => {
				if (!dragEnabledRef.current) return false;
				// Ne pas capturer si on touche le grip de resize
				const touch = evt.nativeEvent;
				const isInGrip =
					touch.locationX > actualWidth - 30 &&
					touch.locationY > actualHeight - 30;
				return !isInGrip;
			},
			onMoveShouldSetPanResponder: (evt, gestureState) => {
				if (!dragEnabledRef.current) return false;
				// Ne pas capturer si on touche le grip de resize
				const touch = evt.nativeEvent;
				const isInGrip =
					touch.locationX > actualWidth - 30 &&
					touch.locationY > actualHeight - 30;
				if (isInGrip) return false;
				// Commence le drag si mouvement > 10px
				return Math.abs(gestureState.dx) > 10 || Math.abs(gestureState.dy) > 10;
			},
			onPanResponderGrant: () => {
				setIsDragging(true);
				pan.setOffset({
					x: pan.x._value,
					y: pan.y._value,
				});
				pan.setValue({ x: 0, y: 0 });
			},
			onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
				useNativeDriver: false,
			}),
			onPanResponderRelease: () => {
				setIsDragging(false);
				pan.flattenOffset();

				// Snap to grid si activé (grille 30x30px)
				const GRID_SIZE = 30;
				let x = Math.round(pan.x._value);
				let y = Math.round(pan.y._value);

				if (snapToGridRef.current) {
					x = Math.round(x / GRID_SIZE) * GRID_SIZE;
					y = Math.round(y / GRID_SIZE) * GRID_SIZE;
					// Mettre à jour l'animation pour refléter le snap
					pan.setValue({ x, y });
				}

				const newPosition = { x, y };
				if (onPositionChange) {
					onPositionChange(table._id, newPosition);
				}
			},
		}),
	).current;

	// PanResponder pour le resize depuis le grip (dx → largeur, dy → hauteur)
	const startSizeW = useRef(tableSizeW);
	const startSizeH = useRef(tableSizeH);
	const resizePanResponder = useRef(
		PanResponder.create({
			onStartShouldSetPanResponder: () => resizeEnabledRef.current,
			onPanResponderGrant: () => {
				isResizingRef.current = true;
				startSizeW.current = currentWidthRef.current;
				startSizeH.current = currentHeightRef.current;
			},
			onPanResponderMove: (_, gestureState) => {
				// dx → largeur, dy → hauteur indépendamment
				const newW = Math.max(
					0.5,
					Math.min(3, startSizeW.current + gestureState.dx / baseSize),
				);
				const newH = Math.max(
					0.5,
					Math.min(3, startSizeH.current + gestureState.dy / baseSize),
				);
				currentWidthRef.current = newW;
				currentHeightRef.current = newH;
				setCurrentWidth(newW);
				setCurrentHeight(newH);
			},
			onPanResponderRelease: () => {
				// Utiliser les refs (pas les states) pour éviter la closure stale
				if (onSizeChange) {
					onSizeChange(table._id, {
						w: currentWidthRef.current,
						h: currentHeightRef.current,
					});
				}
				// Désactiver le flag APRÈS le release (léger délai pour laisser le re-render passer)
				setTimeout(() => {
					isResizingRef.current = false;
				}, 100);
			},
		}),
	).current;

	// Couleur selon statut
	const getStatusStyle = () => {
		if (table.status === "occupied") return tableCardStyles(theme).occupied;
		if (table.status === "unavailable")
			return tableCardStyles(theme).unavailable;
		return tableCardStyles(theme).available;
	};

	// Formater l'heure de réservation
	const formatTime = (dateString) => {
		const date = new Date(dateString);
		return date.toLocaleTimeString("fr-FR", {
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	// 📅 Calculer le temps restant jusqu'à une réservation
	const formatTimeRemaining = (dateString) => {
		const now = new Date();
		const resaDate = new Date(dateString);
		const diffMs = resaDate - now;

		if (diffMs < 0) return "en retard";

		const diffMin = Math.floor(diffMs / (1000 * 60));
		const hours = Math.floor(diffMin / 60);
		const minutes = diffMin % 60;

		if (hours > 0) {
			return `${hours}h${minutes > 0 ? `${minutes}min` : ""}`;
		}
		return `${minutes}min`;
	};

	// Bordure resa dynamique
	const resaBorderStyle =
		resaMode && resaInfo
			? {
					borderWidth: 3,
					borderColor: resaInfo.type === "en_cours" ? "#EF4444" : "#3B82F6",
				}
			: {};

	return (
		<Animated.View
			{...panResponder.panHandlers}
			style={[
				tableCardStyles(theme).card,
				{
					transform: [{ translateX: pan.x }, { translateY: pan.y }, { scale: pulseAnim }],
					width: actualWidth,
					height: actualHeight,
					borderRadius: table.shape === 'round' ? actualWidth / 2 : 12,
				},
				isDragging && tableCardStyles(theme).dragging,
				getStatusStyle(),
				isModified && tableCardStyles(theme).modified,
				resaBorderStyle,
				isFocused && { borderColor: "#C9A84C", borderWidth: 3 },
				isSelected && dragEnabled && { borderColor: "#C9A84C", borderWidth: 2, borderStyle: "dashed" },
			]}
		>
			{/* Grip resize en bas à droite — zone de touch + triangle hors de la carte */}
			<View
				style={tableCardStyles(theme).resizeGripContainer}
				{...resizePanResponder.panHandlers}
			>
				{/* Triangle ◢ indicateur — en dehors du coin de la carte */}
				{resizeEnabled && (
					<View
						style={{
							position: "absolute",
							bottom: -2,
							right: -2,
							width: 0,
							height: 0,
							borderStyle: "solid",
							borderTopWidth: 7,
							borderLeftWidth: 7,
							borderTopColor: "transparent",
							borderLeftColor: "transparent",
							borderBottomWidth: 7,
							borderRightWidth: 7,
							borderBottomColor: "rgba(255,255,255,0.5)",
							borderRightColor: "rgba(255,255,255,0.5)",
						}}
					/>
				)}
			</View>


			<TouchableOpacity
				onPress={isDragging ? null : resaMode ? onResaSelect : onSimpleTouch}
				style={tableCardStyles(theme).touchArea}
				activeOpacity={0.8}
				disabled={isDragging}
			>
				<View style={tableCardStyles(theme).numberContainer}>
					<Text style={tableCardStyles(theme).number}>#{table.number}</Text>
				</View>
				<Text style={tableCardStyles(theme).capacity}>{table.capacity}</Text>
				<Ionicons
					name="people-outline"
					size={16}
					color={theme.colors.text.muted}
					style={tableCardStyles(theme).icon}
				/>

				{/* Prochaine réservation à venir */}
				{nextReservation && (
					<View style={tableCardStyles(theme).reservationBadge}>
						<Ionicons name="calendar-outline" size={10} color="#fff" />
						<Text style={tableCardStyles(theme).reservationText} numberOfLines={1}>
							{nextReservation.clientName
								? `${nextReservation.clientName.slice(0, 12)}${nextReservation.clientName.length > 12 ? "…" : ""} - `
								: ""}
							{formatTimeRemaining(nextReservation.reservationDate)}
						</Text>
					</View>
				)}
			</TouchableOpacity>
		</Animated.View>
	);
};

const tableCardStyles = (theme) =>
	StyleSheet.create({
		card: {
			position: "absolute",
			width: 110,
			height: 120,
			backgroundColor: theme.colors.background.card,
			borderRadius: 12,
			borderWidth: 2,
			borderColor: theme.colors.primary.amber + "40",
			alignItems: "center",
			justifyContent: "center",
			...Platform.select({
				ios: {
					shadowColor: theme.colors.primary.amber,
					shadowOffset: { width: 0, height: 2 },
					shadowOpacity: 0.2,
					shadowRadius: 4,
				},
				android: {
					elevation: 4,
				},
			}),
		},
		dragging: {
			borderColor: theme.colors.primary.amber,
			borderWidth: 3,
			...Platform.select({
				ios: {
					shadowOpacity: 0.4,
					shadowRadius: 8,
				},
				android: {
					elevation: 8,
				},
			}),
		},
		modified: {
			borderWidth: 3,
			borderColor: theme.colors.primary.amber,
			borderStyle: "dashed",
		},
		touchArea: {
			width: "100%",
			height: "100%",
			alignItems: "center",
			justifyContent: "center",
		},
		available: {
			borderColor: "#4CAF50",
			backgroundColor: "#4CAF50" + "15",
		},
		occupied: {
			borderColor: theme.colors.status.error,
			backgroundColor: theme.colors.status.error + "20",
		},
		unavailable: {
			borderColor: "#9E9E9E",
			backgroundColor: "#9E9E9E" + "15",
		},
		numberContainer: {
			position: "absolute",
			top: 4,
			right: 4,
		},
		number: {
			fontSize: theme.typography.sizes.xs,
			fontWeight: "600",
			color: theme.colors.text.muted,
		},
		capacity: {
			fontSize: theme.typography.sizes.xxl || 28,
			fontWeight: "700",
			color: theme.colors.text.primary,
		},
		icon: {
			marginTop: 4,
		},
		reservationBadge: {
			position: "absolute",
			bottom: 4,
			flexDirection: "row",
			alignItems: "center",
			backgroundColor: theme.colors.primary.amber,
			paddingHorizontal: 6,
			paddingVertical: 2,
			borderRadius: 8,
			gap: 3,
		},
		reservationText: {
			fontSize: 9,
			fontWeight: "700",
			color: "#fff",
		},
		resizeGripContainer: {
			position: "absolute",
			bottom: -6,
			right: -6,
			width: 36,
			height: 36,
			zIndex: 20,
		},
		resaBanner: {
			position: "absolute",
			top: 0,
			left: 0,
			right: 0,
			backgroundColor: "#4F46E5",
			paddingHorizontal: 6,
			paddingVertical: 4,
			borderTopLeftRadius: 10,
			borderTopRightRadius: 10,
			alignItems: "center",
			zIndex: 15,
		},
		resaBannerName: {
			fontSize: 9,
			fontWeight: "700",
			color: "#fff",
			width: "100%",
			textAlign: "center",
		},
		resaBannerDetail: {
			fontSize: 8,
			color: "rgba(255,255,255,0.85)",
			textAlign: "center",
		},
		deleteButton: {
			position: "absolute",
			top: -8,
			left: -8,
			zIndex: 10,
			backgroundColor: theme.colors.status.error,
			borderRadius: 12,
			width: 24,
			height: 24,
			alignItems: "center",
			justifyContent: "center",
			...Platform.select({
				ios: {
					shadowColor: "#000",
					shadowOffset: { width: 0, height: 2 },
					shadowOpacity: 0.3,
					shadowRadius: 3,
				},
				android: {
					elevation: 5,
				},
			}),
		},
	});

const createStyles = (THEME) =>
	StyleSheet.create({
		overlay: {
			flex: 1,
			backgroundColor: "rgba(0,0,0,0.70)",
			justifyContent: "flex-start",
			alignItems: "flex-start",
		},
		container: {
			position: "absolute",
			left: 281,
			top: 120,
			right: 0,
			bottom: 0,
			backgroundColor: "#0F172A",
			borderRadius: 0,
			borderWidth: 0,
			overflow: "hidden",
			...Platform.select({
				ios: {
					shadowColor: "#000",
					shadowOffset: { width: 0, height: 4 },
					shadowOpacity: 0.3,
					shadowRadius: 10,
				},
				android: {
					elevation: 10,
				},
			}),
		},
		header: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "space-between",
			paddingHorizontal: 20,
			paddingVertical: 16,
			borderBottomWidth: 1,
			borderBottomColor: THEME.colors.border.default,
		},
		title: {
			fontSize: THEME.typography.sizes.xl,
			fontWeight: "700",
			color: "#F1F5F9",
		},
		subtitle: {
			fontSize: THEME.typography.sizes.sm,
			color: "#64748B",
			marginLeft: -40,
		},
		headerActions: {
			flexDirection: "row",
			gap: 8,
		},
		actionButton: {
			width: 36,
			height: 36,
			alignItems: "center",
			justifyContent: "center",
		},
		closeButton: {
			width: 36,
			height: 36,
			borderRadius: 18,
			backgroundColor: "#1E293B",
			alignItems: "center",
			justifyContent: "center",
		},
		toggleContainer: {
			flexDirection: "row",
			gap: 12,
			marginLeft: "auto",
			marginRight: 12,
		},
		toggleButton: {
			flexDirection: "row",
			alignItems: "center",
			gap: 6,
			paddingHorizontal: 12,
			paddingVertical: 8,
			borderRadius: 8,
			backgroundColor: "#1E293B",
			borderWidth: 1,
			borderColor: THEME.colors.border.default,
		},
		toggleButtonActive: {
			backgroundColor: "#F59E0B",
			borderColor: "#F59E0B",
		},
		toggleButtonDisabled: {
			opacity: 0.35,
		},
		toggleButtonResaActive: {
			backgroundColor: "#4F46E5",
			borderColor: "#4F46E5",
		},
		resaInfoBand: {
			position: "absolute",
			top: 0,
			left: 0,
			right: 0,
			zIndex: 100,
			flexDirection: "row",
			alignItems: "center",
			paddingHorizontal: 16,
			paddingVertical: 10,
			backgroundColor: "#1E293B",
			borderBottomWidth: 1,
			borderBottomColor: THEME.colors.border.default,
			gap: 10,
		},
		resaInfoBandDot: {
			width: 10,
			height: 10,
			borderRadius: 5,
			flexShrink: 0,
		},
		resaInfoBandText: {
			flex: 1,
			fontSize: THEME.typography.sizes.sm,
			color: "#94A3B8",
		},
		resaInfoBandBold: {
			fontWeight: "700",
			color: "#F1F5F9",
		},
		toggleButtonText: {
			fontSize: THEME.typography.sizes.sm,
			fontWeight: "600",
			color: "#64748B",
		},
		toggleButtonTextActive: {
			color: "#fff",
		},
		toggleButtonTextDisabled: {
			color: "#64748B",
		},
		planContainer: {
			flex: 1,
			position: "relative",
		},
		emptyState: {
			flex: 1,
			alignItems: "center",
			justifyContent: "center",
			paddingVertical: 100,
		},
		emptyStateTitle: {
			fontSize: THEME.typography.sizes.xl,
			fontWeight: "700",
			color: "#F1F5F9",
			marginTop: 20,
			marginBottom: 8,
		},
		emptyStateText: {
			fontSize: THEME.typography.sizes.md,
			color: "#64748B",
			textAlign: "center",
		},
		tablesContainer: {
			position: "relative",
			width: "100%",
			height: "100%",
		},
		footer: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "space-between",
			paddingHorizontal: 20,
			paddingVertical: 12,
			borderTopWidth: 1,
			borderTopColor: THEME.colors.border.default,
		},
		footerInfo: {
			flex: 1,
		},
		footerText: {
			fontSize: THEME.typography.sizes.sm,
			color: "#64748B",
			fontWeight: "600",
		},
		footerHint: {
			fontSize: THEME.typography.sizes.xs,
			color: "#64748B",
			marginTop: 4,
		},
		savePlanButton: {
			flexDirection: "row",
			alignItems: "center",
			gap: 6,
			paddingHorizontal: 16,
			paddingVertical: 10,
			backgroundColor: "#F59E0B",
			borderRadius: 10,
		},
		savePlanText: {
			fontSize: THEME.typography.sizes.sm,
			fontWeight: "700",
			color: "#fff",
		},
		// Modale d'édition
		editModal: {
			...StyleSheet.absoluteFillObject,
			backgroundColor: "rgba(0,0,0,0.70)",
			justifyContent: "center",
			alignItems: "center",
			zIndex: 9999,
		},
		editContainer: {
			width: "85%",
			maxWidth: 400,
			backgroundColor: "#0F172A",
			borderRadius: 20,
			padding: 24,
			...Platform.select({
				ios: {
					shadowColor: "#000",
					shadowOffset: { width: 0, height: 4 },
					shadowOpacity: 0.3,
					shadowRadius: 10,
				},
				android: {
					elevation: 10,
				},
			}),
		},
		editTitle: {
			fontSize: THEME.typography.sizes.xl,
			fontWeight: "700",
			color: "#F1F5F9",
			marginBottom: 20,
			textAlign: "center",
		},
		editInput: {
			paddingHorizontal: 20,
			paddingVertical: 16,
			backgroundColor: "#1E293B",
			borderRadius: 12,
			borderWidth: 2,
			borderColor: "#F59E0B",
			fontSize: THEME.typography.sizes.xxl || 24,
			fontWeight: "600",
			color: "#F1F5F9",
			textAlign: "center",
			marginBottom: 24,
		},
		editActions: {
			flexDirection: "row",
			gap: 12,
		},
		editButton: {
			flex: 1,
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "center",
			paddingVertical: 14,
			borderRadius: 12,
			gap: 6,
		},
		editButtonSave: {
			backgroundColor: "#F59E0B",
		},
		editButtonCancel: {
			backgroundColor: "#64748B" + "40",
		},
		editButtonText: {
			fontSize: THEME.typography.sizes.md,
			fontWeight: "600",
			color: "#fff",
		},
		// Number stepper (modal)
		numberStepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 24 },
		numberStepperBtn: { width: 48, height: 48, borderRadius: 12, backgroundColor: "#243447", borderWidth: 1, borderColor: THEME.colors.border.default, alignItems: 'center', justifyContent: 'center' },
		numberStepperBtnText: { fontSize: 28, fontWeight: '300', color: "#F59E0B", lineHeight: 34 },
		numberStepperValue: { alignItems: 'center', minWidth: 80 },
		numberStepperNum: { fontSize: 40, fontWeight: '700', color: "#F1F5F9" },
		numberStepperSub: { fontSize: 10, color: "#64748B", marginTop: 2 },
		// Feature 5 — Alignment toolbar
		alignToolbar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, backgroundColor: "#243447", borderBottomWidth: 1, borderBottomColor: THEME.colors.border.default, gap: 6 },
		alignBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 6, backgroundColor: "#1E293B", borderWidth: 1, borderColor: THEME.colors.border.default },
		alignBtnDisabled: { opacity: 0.35 },
		alignBtnText: { fontSize: 9, fontWeight: '700', color: "#64748B" },
		alignBtnTextActive: { color: "#F59E0B" },
		alignHint: { flex: 1, fontSize: 9, color: "#64748B", textAlign: 'right' },
		// Feature 4 — Properties panel
		propertiesPanel: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 260, backgroundColor: "#1E293B" + 'F2', borderRightWidth: 1, borderRightColor: THEME.colors.border.default, zIndex: 200 },
		propsPanelHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderBottomWidth: 1, borderBottomColor: THEME.colors.border.default },
		propsPanelTitle: { fontSize: 15, fontWeight: '700', color: "#F59E0B" },
		propsPanelClose: { width: 28, height: 28, borderRadius: 14, backgroundColor: "#243447", alignItems: 'center', justifyContent: 'center' },
		propsSectionLabel: { fontSize: 10, fontWeight: '700', color: "#64748B", textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 },
		propsStepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16 },
		propsStepperBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: "#243447", borderWidth: 1, borderColor: THEME.colors.border.default, alignItems: 'center', justifyContent: 'center' },
		propsStepperBtnText: { fontSize: 18, fontWeight: '700', color: "#F1F5F9" },
		propsStepperValue: { fontSize: 24, fontWeight: '700', color: "#F1F5F9", minWidth: 40, textAlign: 'center' },
		propsQuickSeatsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
		propsQuickSeatBtn: { width: 32, height: 32, borderRadius: 6, borderWidth: 1, borderColor: THEME.colors.border.default, backgroundColor: "#243447", alignItems: 'center', justifyContent: 'center' },
		propsQuickSeatBtnActive: { backgroundColor: "#F59E0B", borderColor: "#F59E0B" },
		propsQuickSeatText: { fontSize: 12, fontWeight: '600', color: "#64748B" },
		propsQuickSeatTextActive: { color: '#000' },
		propsStatusBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, borderColor: THEME.colors.border.default, backgroundColor: "#243447", marginBottom: 6, gap: 8 },
		propsStatusDot: { width: 8, height: 8, borderRadius: 4 },
		propsStatusLabel: { fontSize: 13, fontWeight: '500', color: "#94A3B8" },
		propsShapeRow: { flexDirection: 'row', gap: 8 },
		propsShapeBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: THEME.colors.border.default, backgroundColor: "#243447", alignItems: 'center' },
		propsShapeBtnActive: { backgroundColor: "#F59E0B" + '22', borderColor: "#F59E0B" },
		propsShapeText: { fontSize: 12, color: "#64748B" },
		propsShapeTextActive: { fontSize: 12, color: "#F59E0B", fontWeight: '700' },
		propsResaCard: { backgroundColor: '#C9A84C11', borderWidth: 1, borderColor: '#C9A84C44', borderRadius: 10, padding: 12 },
		propsResaName: { fontSize: 13, fontWeight: '700', color: '#C9A84C' },
		propsResaDetail: { fontSize: 11, color: "#64748B", marginTop: 4 },
		propsDeleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 10, backgroundColor: '#EF444422', borderWidth: 1, borderColor: '#EF444444', marginTop: 8 },
		propsDeleteText: { fontSize: 13, fontWeight: '600', color: '#EF4444' },
		propsAddBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, margin: 12, marginBottom: 0, paddingVertical: 10, borderRadius: 10, backgroundColor: "#F59E0B" + '22', borderWidth: 1, borderColor: "#F59E0B" + '66', justifyContent: 'center' },
		propsAddBtnText: { fontSize: 13, fontWeight: '700', color: "#F59E0B" },
		propsResaMiniCard: { paddingVertical: 7, paddingHorizontal: 10, borderRadius: 8, backgroundColor: "#243447", borderWidth: 1, borderColor: THEME.colors.border.subtle, marginBottom: 5 },
		propsResaMiniCardLinked: { backgroundColor: '#C9A84C11', borderColor: '#C9A84C44' },
		propsResaMiniName: { fontSize: 12, fontWeight: '700', color: "#F1F5F9" },
		propsResaMiniDetail: { fontSize: 10, color: "#64748B", marginTop: 2 },
		leftPanel: { position: 'absolute', left: 0, top: 120, bottom: 0, width: 281, backgroundColor: "#1E293B", borderRightWidth: 1, borderRightColor: THEME.colors.border.default, zIndex: 10 },
		leftPanelHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: THEME.colors.border.default },
		leftPanelTitle: { fontSize: 14, fontWeight: '700', color: "#F59E0B" },
		leftPanelAddBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: "#243447", borderWidth: 1, borderColor: "#F59E0B" + '60', alignItems: 'center', justifyContent: 'center' },
		leftPanelDivider: { height: 1, backgroundColor: THEME.colors.border.default, marginVertical: 12 },
		leftPanelSectionTitle: { fontSize: 10, fontWeight: '700', color: "#64748B", textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8, paddingHorizontal: 14 },
		leftResaCard: { backgroundColor: '#C9A84C11', borderWidth: 1, borderColor: '#C9A84C44', borderRadius: 10, padding: 12, marginBottom: 8 },
		leftResaName: { fontSize: 13, fontWeight: '700', color: '#C9A84C' },
		leftResaDetail: { fontSize: 11, color: "#64748B", marginTop: 3 },
		leftResaStatus: { marginTop: 6, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
		leftResaStatusText: { fontSize: 10, fontWeight: '700', color: '#fff' },
		leftResaEmpty: { fontSize: 12, color: "#64748B", textAlign: 'center', paddingVertical: 16 },
		leftResaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8, marginHorizontal: 8, marginBottom: 2 },
		leftResaRowActive: { backgroundColor: "#F59E0B" + '18', borderWidth: 1, borderColor: "#F59E0B" + '40' },
		leftResaRowDot: { width: 7, height: 7, borderRadius: 4, flexShrink: 0 },
		leftResaRowName: { fontSize: 12, fontWeight: '600', color: "#F1F5F9" },
		leftResaRowNameMuted: { color: "#64748B" },
		leftResaRowDetail: { fontSize: 10, color: "#64748B", marginTop: 1 },
		leftResaRowTable: { fontSize: 10, fontWeight: '700', color: "#64748B" },
	});

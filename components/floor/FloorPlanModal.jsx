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
} from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../hooks/useTheme";
import { useAuthFetch } from "../../hooks/useAuthFetch";
import useSocket from "../../hooks/useSocket";

export default function FloorPlanModal({
	visible,
	onClose,
	restaurantId,
	roomNumber = 1,
}) {
	const THEME = useTheme();
	const authFetch = useAuthFetch();
	const styles = useMemo(() => createStyles(THEME), [THEME]);

	// Mode simulation pour salles 2 et 3
	const isSimulation = roomNumber > 1;

	// États
	const [tables, setTables] = useState([]);
	const [reservations, setReservations] = useState([]);
	const [modifiedTableIds, setModifiedTableIds] = useState(new Set());
	const [dragEnabled, setDragEnabled] = useState(false);
	const [resizeEnabled, setResizeEnabled] = useState(false);
	const [snapToGrid, setSnapToGrid] = useState(false);
	const [history, setHistory] = useState([]);
	const [historyIndex, setHistoryIndex] = useState(-1);

	// Refs pour les PanResponders (capturent les valeurs actuelles)
	const dragEnabledRef = useRef(dragEnabled);
	const resizeEnabledRef = useRef(resizeEnabled);
	const snapToGridRef = useRef(snapToGrid);

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

	// Tables fictives pour simulation (Salles 2 et 3)
	const mockTables = useMemo(() => {
		if (!isSimulation) return [];
		return Array.from({ length: 10 }, (_, i) => ({
			_id: `mock-${roomNumber}-${i}`,
			number: `S${roomNumber}-T${i + 1}`,
			capacity: 4,
			size: 1,
			status:
				i % 3 === 0 ? "occupied" : i % 2 === 0 ? "available" : "unavailable",
			restaurantId: "mock",
			isAvailable: i % 2 === 0,
			guests: [],
		}));
	}, [isSimulation, roomNumber]);

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

	// Choisir les tables à afficher : mock en simulation, vraies sinon (déduplication par _id)
	const displayTables = useMemo(() => {
		const source = isSimulation ? mockTables : tables;
		const seen = new Set();
		return source.filter((t) => {
			if (seen.has(t._id)) return false;
			seen.add(t._id);
			return true;
		});
	}, [isSimulation, mockTables, tables]);

	// États édition
	const [editingTable, setEditingTable] = useState(null);
	const [editMode, setEditMode] = useState(null); // "number" | "capacity"
	const [editValue, setEditValue] = useState("");

	// Mode Resa (activé par défaut à l'ouverture)
	const [resaMode, setResaMode] = useState(true);
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
					r.status !== "terminée" &&
					r.status !== "annulée",
			);
			// En cours : SEULEMENT statut "ouverte" (service actif)
			const enCours = matches.find((r) => r.status === "ouverte") || null;
			if (enCours) return { resa: enCours, type: "en_cours" };
			// Futur : toute resa "en attente" (peu importe la date)
			const futur =
				matches
					.filter((r) => r.status === "en attente")
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
				const active = data.filter(
					(r) => r.status !== "terminée" && r.status !== "annulée",
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

	// �💾 Sauvegarder le plan (positions)
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
					<TouchableOpacity
						activeOpacity={1}
						style={styles.container}
						onPress={(e) => e.stopPropagation()}
					>
						{/* Header */}
						<View style={styles.header}>
							<Text style={styles.title}>
								Salle {roomNumber} {isSimulation && "- Simulation"}
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
										color={resaMode ? "#fff" : THEME.colors.text.muted}
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
												? THEME.colors.text.muted + "40"
												: dragEnabled
													? "#fff"
													: THEME.colors.text.muted
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
												? THEME.colors.text.muted + "40"
												: resizeEnabled
													? "#fff"
													: THEME.colors.text.muted
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
												? THEME.colors.text.muted + "40"
												: snapToGrid
													? "#fff"
													: THEME.colors.text.muted
										}
									/>
									<Text
										style={[
											styles.toggleButtonText,
											snapToGrid && styles.toggleButtonTextActive,
											resaMode && styles.toggleButtonTextDisabled,
										]}
									>
										Grid
									</Text>
								</TouchableOpacity>
							</View>
							{/* Boutons + et - (seulement salle 1) */}
							{!isSimulation && (
								<View style={styles.headerActions}>
									<TouchableOpacity
										onPress={handleCreateTable}
										style={styles.actionButton}
									>
										<Ionicons
											name="add-circle"
											size={28}
											color={THEME.colors.primary.amber}
										/>
									</TouchableOpacity>
								</View>
							)}

							<TouchableOpacity onPress={onClose} style={styles.closeButton}>
								<Ionicons
									name="close"
									size={24}
									color={THEME.colors.text.primary}
								/>
							</TouchableOpacity>
						</View>

						{/* Zone de plan (toutes les tables visibles) */}
						<View style={styles.planContainer}>
							{/* Grille visuelle — affichée quand Grid est actif */}
							{snapToGrid && (
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
											color={THEME.colors.text.muted}
										/>
									</TouchableOpacity>
								</View>
							)}
							{tables.length === 0 ? (
								<View style={styles.emptyState}>
									<Ionicons
										name="restaurant-outline"
										size={64}
										color={THEME.colors.text.muted}
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
										const nextReservation = reservations
											.filter((r) => _toId(r.tableId) === table._id?.toString())
											.sort(
												(a, b) =>
													new Date(a.reservationDate) -
													new Date(b.reservationDate),
											)[0];

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
												onResaSelect={() => {
													if (resaInfo) {
														setSelectedResaTable({ table, resaInfo });
													} else {
														setSelectedResaTable(null);
													}
												}}
												onSimpleTouch={() => handleSimpleTouch(table)}
												onForceTouch={() => handleForceTouch(table)}
												onPositionChange={handlePositionChange}
												onSizeChange={handleSizeChange}
												isModified={modifiedTableIds.has(table._id)}
												dragEnabled={dragEnabled}
												resizeEnabled={resizeEnabled}
												snapToGrid={snapToGrid}
												onDelete={
													!isSimulation
														? () => handleDeleteTable(table._id)
														: null
												}
											/>
										);
									})}
								</View>
							)}
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
										: `Appui : Changer n°  •  Appui long : Changer capacité${!isSimulation ? "  •  × pour supprimer" : ""}`}
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

					{/* Modale d'édition */}
					{editingTable && (
						<TouchableOpacity
							style={styles.editModal}
							activeOpacity={1}
							onPress={() => {
								setEditingTable(null);
								setEditMode(null);
								setEditValue("");
							}}
						>
							<TouchableOpacity
								activeOpacity={1}
								style={styles.editContainer}
								onPress={(e) => e.stopPropagation()}
							>
								<Text style={styles.editTitle}>
									{editMode === "number" ? "Numéro de table" : "Capacité"}
								</Text>

								<TextInput
									style={styles.editInput}
									value={editValue}
									onChangeText={setEditValue}
									keyboardType="number-pad"
									autoFocus
									selectTextOnFocus
									placeholder={editMode === "number" ? "Ex: 46" : "Ex: 8"}
									placeholderTextColor={THEME.colors.text.muted}
								/>

								<View style={styles.editActions}>
									<TouchableOpacity
										style={[styles.editButton, styles.editButtonCancel]}
										onPress={() => {
											setEditingTable(null);
											setEditMode(null);
											setEditValue("");
										}}
									>
										<Text style={styles.editButtonText}>Annuler</Text>
									</TouchableOpacity>

									<TouchableOpacity
										style={[styles.editButton, styles.editButtonSave]}
										onPress={handleSave}
									>
										<Ionicons name="checkmark" size={20} color="#fff" />
										<Text style={styles.editButtonText}>Enregistrer</Text>
									</TouchableOpacity>
								</View>
							</TouchableOpacity>
						</TouchableOpacity>
					)}
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
	onResaSelect,
	onSimpleTouch,
	onForceTouch,
	onDelete,
	onPositionChange,
	onSizeChange,
	isModified,
	dragEnabled,
	resizeEnabled,
	snapToGrid,
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
					transform: [{ translateX: pan.x }, { translateY: pan.y }],
					width: actualWidth,
					height: actualHeight,
				},
				isDragging && tableCardStyles(theme).dragging,
				getStatusStyle(),
				isModified && tableCardStyles(theme).modified,
				resaBorderStyle,
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

			{/* Bouton supprimer — masqué en mode Resa et pour les tables avec réservation */}
			{onDelete && !resaMode && !hasReservation && (
				<TouchableOpacity
					style={tableCardStyles(theme).deleteButton}
					onPress={onDelete}
				>
					<Ionicons name="close-circle" size={20} color="#fff" />
				</TouchableOpacity>
			)}

			<TouchableOpacity
				onPress={isDragging ? null : resaMode ? onResaSelect : onSimpleTouch}
				onLongPress={isDragging || resaMode ? null : onForceTouch}
				delayLongPress={500}
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

				{/* Prochaine réservation */}
				{nextReservation && (
					<View style={tableCardStyles(theme).reservationBadge}>
						<Ionicons name="time-outline" size={10} color="#fff" />
						<Text style={tableCardStyles(theme).reservationText}>
							{formatTime(nextReservation.reservationDate)}
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
			backgroundColor: "rgba(0, 0, 0, 0.5)",
			justifyContent: "flex-start",
			alignItems: "flex-start",
		},
		container: {
			position: "absolute",
			left: 381,
			top: 120,
			right: 0,
			bottom: 0,
			backgroundColor: THEME.colors.background.dark,
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
			color: THEME.colors.text.primary,
		},
		subtitle: {
			fontSize: THEME.typography.sizes.sm,
			color: THEME.colors.text.muted,
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
			backgroundColor: THEME.colors.background.card,
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
			backgroundColor: THEME.colors.background.card,
			borderWidth: 1,
			borderColor: THEME.colors.border.default,
		},
		toggleButtonActive: {
			backgroundColor: THEME.colors.primary.amber,
			borderColor: THEME.colors.primary.amber,
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
			backgroundColor: THEME.colors.background.card,
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
			color: THEME.colors.text.secondary,
		},
		resaInfoBandBold: {
			fontWeight: "700",
			color: THEME.colors.text.primary,
		},
		toggleButtonText: {
			fontSize: THEME.typography.sizes.sm,
			fontWeight: "600",
			color: THEME.colors.text.muted,
		},
		toggleButtonTextActive: {
			color: "#fff",
		},
		toggleButtonTextDisabled: {
			color: THEME.colors.text.muted,
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
			color: THEME.colors.text.primary,
			marginTop: 20,
			marginBottom: 8,
		},
		emptyStateText: {
			fontSize: THEME.typography.sizes.md,
			color: THEME.colors.text.muted,
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
			color: THEME.colors.text.muted,
			fontWeight: "600",
		},
		footerHint: {
			fontSize: THEME.typography.sizes.xs,
			color: THEME.colors.text.muted,
			marginTop: 4,
		},
		savePlanButton: {
			flexDirection: "row",
			alignItems: "center",
			gap: 6,
			paddingHorizontal: 16,
			paddingVertical: 10,
			backgroundColor: THEME.colors.primary.amber,
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
			backgroundColor: "rgba(0, 0, 0, 0.7)",
			justifyContent: "center",
			alignItems: "center",
			zIndex: 9999,
		},
		editContainer: {
			width: "85%",
			maxWidth: 400,
			backgroundColor: THEME.colors.background.primary,
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
			color: THEME.colors.text.primary,
			marginBottom: 20,
			textAlign: "center",
		},
		editInput: {
			paddingHorizontal: 20,
			paddingVertical: 16,
			backgroundColor: THEME.colors.background.card,
			borderRadius: 12,
			borderWidth: 2,
			borderColor: THEME.colors.primary.amber,
			fontSize: THEME.typography.sizes.xxl || 24,
			fontWeight: "600",
			color: THEME.colors.text.primary,
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
			backgroundColor: THEME.colors.primary.amber,
		},
		editButtonCancel: {
			backgroundColor: THEME.colors.text.muted + "40",
		},
		editButtonText: {
			fontSize: THEME.typography.sizes.md,
			fontWeight: "600",
			color: "#fff",
		},
	});

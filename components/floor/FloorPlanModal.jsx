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

	// Choisir les tables à afficher : mock en simulation, vraies sinon
	const displayTables = isSimulation ? mockTables : tables;

	// États édition
	const [editingTable, setEditingTable] = useState(null);
	const [editMode, setEditMode] = useState(null); // "number" | "capacity"
	const [editValue, setEditValue] = useState("");

	// Charger les tables
	const fetchTables = useCallback(async () => {
		if (isSimulation) return; // Pas de fetch pour les salles simulées
		if (!restaurantId) {
			console.log("⚠️ Pas de restaurantId, skip fetchTables");
			return;
		}

		try {
			console.log("🔄 Chargement tables pour restaurant:", restaurantId);
			const data = await authFetch(`/tables/restaurant/${restaurantId}`, {
				method: "GET",
			});

			console.log("📊 Tables chargées:", data?.length || 0);
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
				{ method: "GET" }
			);

			if (Array.isArray(data)) {
				setReservations(data.filter((r) => r.status === "confirmed"));
			}
		} catch (error) {
			console.error("❌ Erreur chargement réservations:", error);
		}
	}, [restaurantId, authFetch, isSimulation]);

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

			console.log("💾 [FLOOR] Sauvegarde table:", {
				tableId: editingTable._id,
				editMode,
				updateData,
			});

			const updatedTable = await authFetch(`/tables/${editingTable._id}`, {
				method: "PUT",
				body: updateData, // ✅ authFetch gère JSON.stringify automatiquement
			});

			if (updatedTable) {
				console.log("✅ [FLOOR] Table mise à jour:", updatedTable);
				setTables((prev) =>
					prev.map((t) => (t._id === editingTable._id ? updatedTable : t))
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
			const newTable = {
				restaurantId,
				number: `T${tables.length + 1}`,
				capacity: 4,
				status: "available",
			};

			const response = await authFetch("/tables", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(newTable),
			});

			if (response.ok) {
				const createdTable = await response.json();
				setTables((prev) => [...prev, createdTable]);
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
						const response = await authFetch(`/tables/${tableId}`, {
							method: "DELETE",
						});

						if (response.ok) {
							setTables((prev) => prev.filter((t) => t._id !== tableId));
						}
					} catch (error) {
						console.error("Erreur suppression:", error);
						Alert.alert("Erreur", "Impossible de supprimer");
					}
				},
			},
		]);
	};

	// � Mettre à jour la position d'une table
	const handlePositionChange = useCallback((tableId, newPosition) => {
		setTables((prev) =>
			prev.map((t) => (t._id === tableId ? { ...t, position: newPosition } : t))
		);
		setModifiedTableIds((prev) => new Set(prev).add(tableId));
	}, []);

	// � Gérer le changement de taille
	const handleSizeChange = useCallback((tableId, newSize) => {
		setTables((prev) =>
			prev.map((t) => (t._id === tableId ? { ...t, size: newSize } : t))
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

			const updates = displayTables
				.filter((table) => modifiedIds.includes(table._id))
				.map((table) => ({
					id: table._id,
					position: table.position,
					size: table.size || 1,
				}));

			console.log("💾 Sauvegarde des positions:", updates);

			// Appel API pour sauvegarder toutes les positions et tailles
			for (const update of updates) {
				const updatedTable = await authFetch(`/tables/${update.id}`, {
					method: "PUT",
					body: { position: update.position, size: update.size },
				});

				// ⭐ Mettre à jour le state local avec la table sauvegardée
				if (updatedTable) {
					setTables((prev) =>
						prev.map((t) => (t._id === update.id ? updatedTable : t))
					);
				}
			}

			Alert.alert("Succès", `${updates.length} position(s) sauvegardée(s)`);
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
							<Text style={styles.subtitle}>Vue du ciel</Text>
							{/* Toggles Drag / Resize */}
							<View style={styles.toggleContainer}>
								<TouchableOpacity
									onPress={() => {
										if (!dragEnabled) {
											setDragEnabled(true);
											setResizeEnabled(false);
										} else {
											setDragEnabled(false);
										}
									}}
									style={[
										styles.toggleButton,
										dragEnabled && styles.toggleButtonActive,
									]}
								>
									<Ionicons
										name="move"
										size={20}
										color={dragEnabled ? "#fff" : THEME.colors.text.muted}
									/>
									<Text
										style={[
											styles.toggleButtonText,
											dragEnabled && styles.toggleButtonTextActive,
										]}
									>
										Drag
									</Text>
								</TouchableOpacity>

								<TouchableOpacity
									onPress={() => {
										if (!resizeEnabled) {
											setResizeEnabled(true);
											setDragEnabled(false);
										} else {
											setResizeEnabled(false);
										}
									}}
									style={[
										styles.toggleButton,
										resizeEnabled && styles.toggleButtonActive,
									]}
								>
									<Ionicons
										name="resize"
										size={20}
										color={resizeEnabled ? "#fff" : THEME.colors.text.muted}
									/>
									<Text
										style={[
											styles.toggleButtonText,
											resizeEnabled && styles.toggleButtonTextActive,
										]}
									>
										Resize
									</Text>
								</TouchableOpacity>

								<TouchableOpacity
									onPress={() => setSnapToGrid(!snapToGrid)}
									style={[
										styles.toggleButton,
										snapToGrid && styles.toggleButtonActive,
									]}
								>
									<Ionicons
										name="grid"
										size={20}
										color={snapToGrid ? "#fff" : THEME.colors.text.muted}
									/>
									<Text
										style={[
											styles.toggleButtonText,
											snapToGrid && styles.toggleButtonTextActive,
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
										const nextReservation = reservations
											.filter((r) => r.tableNumber === table.number)
											.sort(
												(a, b) =>
													new Date(a.reservationDate) -
													new Date(b.reservationDate)
											)[0];

										return (
											<TableCard
												key={table._id}
												table={table}
												theme={THEME}
												index={index}
												nextReservation={nextReservation}
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
									Touch : Changer n° • Force touch : Changer capacité
									{!isSimulation && " • Appui long sur - pour supprimer"}
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
						<View style={styles.editModal}>
							<View style={styles.editContainer}>
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
							</View>
						</View>
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
	const tableSize = table.size || 1;
	const baseSize = 100;

	// Taille locale pour le resize en temps réel
	const [currentSize, setCurrentSize] = useState(tableSize);
	const actualSize = baseSize * currentSize;

	// Refs pour les modes drag et resize (pour que PanResponders aient les valeurs à jour)
	const dragEnabledRef = useRef(dragEnabled);
	const resizeEnabledRef = useRef(resizeEnabled);
	const snapToGridRef = useRef(snapToGrid);

	useEffect(() => {
		dragEnabledRef.current = dragEnabled;
		resizeEnabledRef.current = resizeEnabled;
		snapToGridRef.current = snapToGrid;
	}, [dragEnabled, resizeEnabled, snapToGrid]);

	// Synchroniser currentSize avec tableSize
	useEffect(() => {
		setCurrentSize(tableSize);
	}, [tableSize]);

	// Disposition espacée (4 colonnes au lieu de 3)
	const columnIndex = index % 4;
	const rowIndex = Math.floor(index / 4);
	const initialX = table.position?.x ?? columnIndex * 140 + 30;
	const initialY = table.position?.y ?? rowIndex * 160 + 30;

	// Animation pour le drag
	const pan = useRef(
		new Animated.ValueXY({ x: initialX, y: initialY })
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
					touch.locationX > actualSize - 30 &&
					touch.locationY > actualSize - 30;
				return !isInGrip;
			},
			onMoveShouldSetPanResponder: (evt, gestureState) => {
				if (!dragEnabledRef.current) return false;
				// Ne pas capturer si on touche le grip de resize
				const touch = evt.nativeEvent;
				const isInGrip =
					touch.locationX > actualSize - 30 &&
					touch.locationY > actualSize - 30;
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

				// Snap to grid si activé (grille 20x20px)
				const GRID_SIZE = 20;
				let x = Math.round(pan.x._value);
				let y = Math.round(pan.y._value);

				if (snapToGridRef.current) {
					x = Math.round(x / GRID_SIZE) * GRID_SIZE;
					y = Math.round(y / GRID_SIZE) * GRID_SIZE;
					// Mettre à jour l'animation pour refléter le snap
					pan.setValue({ x, y });
				}

				const newPosition = { x, y };
				console.log(
					"🎯 Table déplacée:",
					table.number,
					"Position:",
					newPosition
				);
				if (onPositionChange) {
					onPositionChange(table._id, newPosition);
				}
			},
		})
	).current;

	// PanResponder pour le resize depuis le grip
	const startSize = useRef(tableSize);
	const resizePanResponder = useRef(
		PanResponder.create({
			onStartShouldSetPanResponder: () => resizeEnabledRef.current,
			onPanResponderGrant: () => {
				startSize.current = currentSize;
			},
			onPanResponderMove: (_, gestureState) => {
				// Calculer la nouvelle taille basée sur le déplacement diagonal
				const delta = (gestureState.dx + gestureState.dy) / 2;
				const sizeChange = delta / baseSize;
				const newSize = Math.max(
					0.5,
					Math.min(2.5, startSize.current + sizeChange)
				);
				setCurrentSize(newSize);
			},
			onPanResponderRelease: () => {
				// Sauvegarder la taille finale
				if (onSizeChange) {
					onSizeChange(table._id, currentSize);
				}
			},
		})
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

	return (
		<Animated.View
			{...panResponder.panHandlers}
			style={[
				tableCardStyles(theme).card,
				{
					transform: [{ translateX: pan.x }, { translateY: pan.y }],
					width: actualSize,
					height: actualSize,
				},
				isDragging && tableCardStyles(theme).dragging,
				getStatusStyle(),
				isModified && tableCardStyles(theme).modified,
			]}
		>
			{/* Grip resize en bas à droite */}
			<View
				style={tableCardStyles(theme).resizeGripContainer}
				{...resizePanResponder.panHandlers}
			/>

			{/* Bouton supprimer (seulement salle 1) */}
			{onDelete && (
				<TouchableOpacity
					style={tableCardStyles(theme).deleteButton}
					onPress={onDelete}
				>
					<Ionicons name="close-circle" size={20} color="#fff" />
				</TouchableOpacity>
			)}

			<TouchableOpacity
				onPress={isDragging ? null : onSimpleTouch}
				onLongPress={isDragging ? null : onForceTouch}
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
			bottom: 0,
			right: 0,
			width: 30,
			height: 30,
			zIndex: 20,
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
		toggleButtonText: {
			fontSize: THEME.typography.sizes.sm,
			fontWeight: "600",
			color: THEME.colors.text.muted,
		},
		toggleButtonTextActive: {
			color: "#fff",
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

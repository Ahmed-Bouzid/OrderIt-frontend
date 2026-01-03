/**
 * 🏗️ FloorPlanModal - Plan de salle interactif
 * Modale indépendante avec grille 6x6, drag & drop, fusion, zoom
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
	ScrollView,
	Platform,
	Animated,
	PanResponder,
	Alert,
	TextInput,
} from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../hooks/useTheme";
import { useAuthFetch } from "../../hooks/useAuthFetch";
import AsyncStorage from "@react-native-async-storage/async-storage";

const GRID_SIZE = 6; // Grille 6x6
const MIN_ZOOM = 0.7; // Zoom minimum (voir plus de tables)
const MAX_ZOOM = 1.2; // Zoom maximum (détails)

export default function FloorPlanModal({ visible, onClose }) {
	const THEME = useTheme();
	const authFetch = useAuthFetch();

	// États
	const [tables, setTables] = useState([]);
	const [restaurantId, setRestaurantId] = useState(null);
	const [zoom, setZoom] = useState(1.0);

	// États drag & drop
	const [draggingTable, setDraggingTable] = useState(null);

	// États fusion
	const [highlightedCell, setHighlightedCell] = useState(null);

	// États édition
	const [editingTable, setEditingTable] = useState(null);
	const [editNumber, setEditNumber] = useState("");

	// Refs
	const scrollViewRef = useRef(null);

	// Charger restaurantId
	useEffect(() => {
		const loadRestaurantId = async () => {
			try {
				const id = await AsyncStorage.getItem("restaurantId");
				console.log("🏢 RestaurantId chargé:", id);
				if (id) setRestaurantId(id);
			} catch (error) {
				console.error("Erreur chargement restaurantId:", error);
			}
		};
		loadRestaurantId();
	}, []);

	// Charger les tables
	const fetchTables = useCallback(async () => {
		if (!restaurantId) {
			console.log("⚠️ Pas de restaurantId, skip fetchTables");
			return;
		}

		try {
			console.log("🔄 Chargement tables pour restaurant:", restaurantId);
			const response = await authFetch(`/tables/restaurant/${restaurantId}`, {
				method: "GET",
			});

			if (response.ok) {
				const data = await response.json();
				console.log("📊 Tables chargées:", data.length);
				setTables(data);
			}
		} catch (error) {
			console.error("Erreur chargement tables:", error);
		}
	}, [restaurantId, authFetch]);

	useEffect(() => {
		if (visible && restaurantId) {
			fetchTables();
		}
	}, [visible, restaurantId, fetchTables]);

	// Créer une grille vide
	const grid = useMemo(() => {
		const emptyGrid = Array(GRID_SIZE)
			.fill(null)
			.map(() => Array(GRID_SIZE).fill(null));

		// Placer les tables existantes
		tables.forEach((table) => {
			if (table.position?.x !== undefined && table.position?.y !== undefined) {
				const { x, y } = table.position;
				if (x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE) {
					emptyGrid[y][x] = table;
				}
			}
		});

		return emptyGrid;
	}, [tables]);
	
	// Compter les tables avec et sans position
	const tablesWithPosition = useMemo(() => {
		return tables.filter(t => t.position?.x !== undefined && t.position?.y !== undefined).length;
	}, [tables]);
	
	const tablesWithoutPosition = tables.length - tablesWithPosition;

	// Gestion du zoom
	const handleZoomIn = () => {
		setZoom((prev) => Math.min(prev + 0.1, MAX_ZOOM));
	};

	const handleZoomOut = () => {
		setZoom((prev) => Math.max(prev - 0.1, MIN_ZOOM));
	};

	const handleZoomReset = () => {
		setZoom(1.0);
	};

	// 🔄 Mise à jour position d'une table
	const updateTablePosition = async (tableId, newX, newY) => {
		try {
			const response = await authFetch(`/tables/${tableId}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					position: { x: newX, y: newY },
				}),
			});

			if (response.ok) {
				const updatedTable = await response.json();
				setTables((prev) =>
					prev.map((t) => (t._id === tableId ? updatedTable : t))
				);
				return true;
			} else {
				Alert.alert("Erreur", "Position déjà occupée");
				return false;
			}
		} catch (error) {
			console.error("Erreur mise à jour position:", error);
			Alert.alert("Erreur", "Impossible de déplacer la table");
			return false;
		}
	};

	// 🔗 Fusion de deux tables
	const mergeTables = async (sourceId, targetId) => {
		try {
			const response = await authFetch("/tables/fusion", {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ sourceId, targetId }),
			});

			if (response.ok) {
				const result = await response.json();
				// Recharger les tables après fusion
				await fetchTables();
				Alert.alert("✅ Fusion réussie", result.message || "Tables fusionnées");
				return true;
			} else {
				Alert.alert("Erreur", "Impossible de fusionner");
				return false;
			}
		} catch (error) {
			console.error("Erreur fusion:", error);
			Alert.alert("Erreur", "Impossible de fusionner les tables");
			return false;
		}
	};

	// ✏️ Édition du numéro de table
	const handleEditTable = (table) => {
		setEditingTable(table);
		setEditNumber(String(table.number));
	};

	const handleSaveEdit = async () => {
		if (!editingTable || !editNumber.trim()) return;

		try {
			const response = await authFetch(`/tables/${editingTable._id}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ number: parseInt(editNumber) }),
			});

			if (response.ok) {
				const updatedTable = await response.json();
				setTables((prev) =>
					prev.map((t) => (t._id === editingTable._id ? updatedTable : t))
				);
				setEditingTable(null);
				setEditNumber("");
			} else {
				Alert.alert("Erreur", "Numéro déjà utilisé");
			}
		} catch (error) {
			console.error("Erreur édition:", error);
			Alert.alert("Erreur", "Impossible de modifier la table");
		}
	};

	// ➕ Création d'une nouvelle table
	const handleCreateTable = async (x, y) => {
		try {
			// Trouver le prochain numéro disponible (number doit être string)
			const maxNumber = tables.reduce(
				(max, t) => Math.max(max, parseInt(t.number) || 0),
				0
			);

			const response = await authFetch("/tables", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					restaurantId,
					number: String(maxNumber + 1),
					capacity: 4,
					position: { x, y },
				}),
			});

			if (response.ok) {
				const newTable = await response.json();
				setTables((prev) => [...prev, newTable]);
			} else {
				Alert.alert("Erreur", "Impossible de créer la table");
			}
		} catch (error) {
			console.error("Erreur création:", error);
			Alert.alert("Erreur", "Impossible de créer la table");
		}
	};

	// ❌ Suppression d'une table
	const handleDeleteTable = async (table) => {
		if (table.status === "occupied") {
			Alert.alert("Impossible", "Cette table est occupée");
			return;
		}

		Alert.alert(
			"Supprimer la table",
			`Voulez-vous vraiment supprimer la table #${table.number} ?`,
			[
				{ text: "Annuler", style: "cancel" },
				{
					text: "Supprimer",
					style: "destructive",
					onPress: async () => {
						try {
							const response = await authFetch(`/tables/${table._id}`, {
								method: "DELETE",
							});

							if (response.ok) {
								setTables((prev) => prev.filter((t) => t._id !== table._id));
							} else {
								Alert.alert("Erreur", "Impossible de supprimer");
							}
						} catch (error) {
							console.error("Erreur suppression:", error);
							Alert.alert("Erreur", "Impossible de supprimer la table");
						}
					},
				},
			]
		);
	};

	// Styles dynamiques
	const styles = useMemo(() => createStyles(THEME, zoom), [THEME, zoom]);

	return (
		<Modal
			visible={visible}
			animationType="fade"
			transparent
			onRequestClose={onClose}
		>
			<BlurView intensity={40} style={StyleSheet.absoluteFill}>
				<View style={styles.overlay}>
					<View style={styles.container}>
						{/* Header */}
						<View style={styles.header}>
							<Text style={styles.title}>Plan de Salle</Text>

							{/* Contrôles zoom */}
							<View style={styles.zoomControls}>
								<TouchableOpacity
									onPress={handleZoomOut}
									style={styles.zoomButton}
								>
									<Ionicons
										name="remove"
										size={20}
										color={THEME.colors.text.primary}
									/>
								</TouchableOpacity>

								<TouchableOpacity
									onPress={handleZoomReset}
									style={styles.zoomButton}
								>
									<Text style={styles.zoomText}>{Math.round(zoom * 100)}%</Text>
								</TouchableOpacity>

								<TouchableOpacity
									onPress={handleZoomIn}
									style={styles.zoomButton}
								>
									<Ionicons
										name="add"
										size={20}
										color={THEME.colors.text.primary}
									/>
								</TouchableOpacity>
							</View>

							<TouchableOpacity onPress={onClose} style={styles.closeButton}>
								<Ionicons
									name="close"
									size={24}
									color={THEME.colors.text.primary}
								/>
							</TouchableOpacity>
						</View>

						{/* Grille */}
						<ScrollView
							ref={scrollViewRef}
							style={styles.scrollContainer}
							contentContainerStyle={styles.scrollContent}
							showsVerticalScrollIndicator={true}
							showsHorizontalScrollIndicator={true}
							bounces={false}
							scrollEnabled={!draggingTable}
						>
							{tables.length === 0 && (
								<View style={styles.emptyState}>
									<Ionicons
										name="grid-outline"
										size={64}
										color={THEME.colors.text.muted}
									/>
									<Text style={styles.emptyStateTitle}>Aucune table</Text>
									<Text style={styles.emptyStateText}>
										Cliquez sur une cellule vide pour créer votre première table
									</Text>
								</View>
							)}

							<View style={styles.gridContainer}>
								{grid.map((row, y) => (
									<View key={`row-${y}`} style={styles.gridRow}>
										{row.map((table, x) => (
											<View
												key={`cell-${y}-${x}`}
												style={[
													styles.gridCell,
													highlightedCell?.x === x &&
														highlightedCell?.y === y &&
														styles.highlightedCell,
												]}
											>
												{table ? (
													<TableCard
														table={table}
														theme={THEME}
														onLongPress={handleEditTable}
														onDragStart={(draggedTable) => {
															setDraggingTable(draggedTable);
															setHighlightedCell(null);
														}}
														onDragMove={(dx, dy) => {
															// Calculer la cellule sous le doigt
															const cellSize = 80 * zoom;
															const newX = Math.max(
																0,
																Math.min(
																	GRID_SIZE - 1,
																	Math.round(table.position.x + dx / cellSize)
																)
															);
															const newY = Math.max(
																0,
																Math.min(
																	GRID_SIZE - 1,
																	Math.round(table.position.y + dy / cellSize)
																)
															);

															// Vérifier si collision avec une autre table
															if (
																grid[newY][newX] &&
																grid[newY][newX]._id !== table._id
															) {
																setHighlightedCell({ x: newX, y: newY });
															} else {
																setHighlightedCell(null);
															}
														}}
														onDragEnd={async (dx, dy) => {
															const cellSize = 80 * zoom;
															const newX = Math.max(
																0,
																Math.min(
																	GRID_SIZE - 1,
																	Math.round(table.position.x + dx / cellSize)
																)
															);
															const newY = Math.max(
																0,
																Math.min(
																	GRID_SIZE - 1,
																	Math.round(table.position.y + dy / cellSize)
																)
															);

															// Vérifier si collision (fusion)
															const targetTable = grid[newY][newX];
															if (
																targetTable &&
																targetTable._id !== table._id
															) {
																Alert.alert(
																	"Fusionner les tables",
																	`Table #${table.number} (${
																		table.capacity
																	}p) + Table #${targetTable.number} (${
																		targetTable.capacity
																	}p) = ${
																		table.capacity + targetTable.capacity
																	}p`,
																	[
																		{ text: "Annuler", style: "cancel" },
																		{
																			text: "Fusionner",
																			onPress: () =>
																				mergeTables(table._id, targetTable._id),
																		},
																	]
																);
															} else if (
																newX !== table.position.x ||
																newY !== table.position.y
															) {
																// Déplacement simple
																await updateTablePosition(
																	table._id,
																	newX,
																	newY
																);
															}

															setDraggingTable(null);
															setHighlightedCell(null);
														}}
														isDragging={draggingTable?._id === table._id}
														isHighlighted={
															highlightedCell?.x === x &&
															highlightedCell?.y === y
														}
													/>
												) : (
													<TouchableOpacity
														style={styles.emptyCell}
														onPress={() => handleCreateTable(x, y)}
													>
														<Ionicons
															name="add"
															size={24}
															color={THEME.colors.border.subtle}
														/>
													</TouchableOpacity>
												)}
											</View>
										))}
									</View>
								))}
							</View>
						</ScrollView>

						{/* Info + Actions */}
						<View style={styles.footer}>
							<Text style={styles.footerText}>
								{tablesWithPosition}/{tables.length} table{tables.length > 1 ? "s" : ""} sur la grille • 6×6
							</Text>
							{tablesWithoutPosition > 0 && (
								<Text style={styles.footerWarning}>
									⚠️ {tablesWithoutPosition} table{tablesWithoutPosition > 1 ? "s" : ""} sans position
								</Text>
							)}
							<Text style={styles.footerHint}>
								Glisser pour déplacer • Longue pression pour éditer
							</Text>
						</View>
					</View>

					{/* Modale d'édition */}
					{editingTable && (
						<View style={styles.editModal}>
							<View style={styles.editContainer}>
								<Text style={styles.editTitle}>Modifier la table</Text>

								<View style={styles.editRow}>
									<Text style={styles.editLabel}>Numéro :</Text>
									<TextInput
										style={styles.editInput}
										value={editNumber}
										onChangeText={setEditNumber}
										keyboardType="number-pad"
										autoFocus
										selectTextOnFocus
									/>
								</View>

								<View style={styles.editRow}>
									<Text style={styles.editLabel}>Position :</Text>
									<Text style={styles.editValue}>
										({editingTable.position.x}, {editingTable.position.y})
									</Text>
								</View>

								<View style={styles.editRow}>
									<Text style={styles.editLabel}>Capacité :</Text>
									<Text style={styles.editValue}>
										{editingTable.capacity} pers.
									</Text>
								</View>

								<View style={styles.editActions}>
									<TouchableOpacity
										style={[styles.editButton, styles.editButtonDelete]}
										onPress={() => {
											setEditingTable(null);
											handleDeleteTable(editingTable);
										}}
									>
										<Ionicons name="trash-outline" size={20} color="#fff" />
										<Text style={styles.editButtonText}>Supprimer</Text>
									</TouchableOpacity>

									<TouchableOpacity
										style={[styles.editButton, styles.editButtonCancel]}
										onPress={() => {
											setEditingTable(null);
											setEditNumber("");
										}}
									>
										<Text style={styles.editButtonText}>Annuler</Text>
									</TouchableOpacity>

									<TouchableOpacity
										style={[styles.editButton, styles.editButtonSave]}
										onPress={handleSaveEdit}
									>
										<Ionicons name="checkmark" size={20} color="#fff" />
										<Text style={styles.editButtonText}>Enregistrer</Text>
									</TouchableOpacity>
								</View>
							</View>
						</View>
					)}
				</View>
			</BlurView>
		</Modal>
	);
}

// 🎴 Composant TableCard draggable
const TableCard = ({
	table,
	theme,
	onLongPress,
	onDragStart,
	onDragMove,
	onDragEnd,
	isDragging,
	isHighlighted,
}) => {
	const pan = useRef(new Animated.ValueXY()).current;
	const scale = useRef(new Animated.Value(1)).current;

	const panResponder = useMemo(
		() =>
			PanResponder.create({
				onStartShouldSetPanResponder: () => false,
				onMoveShouldSetPanResponder: (_, gestureState) => {
					// Démarrer le drag si mouvement > 5px
					return Math.abs(gestureState.dx) > 5 || Math.abs(gestureState.dy) > 5;
				},
				onPanResponderGrant: () => {
					onDragStart && onDragStart(table);
					// Animation scale up
					Animated.spring(scale, {
						toValue: 1.2,
						useNativeDriver: true,
					}).start();
				},
				onPanResponderMove: (_, gestureState) => {
					pan.setValue({ x: gestureState.dx, y: gestureState.dy });
					onDragMove && onDragMove(gestureState.dx, gestureState.dy);
				},
				onPanResponderRelease: (_, gestureState) => {
					// Animation scale down
					Animated.spring(scale, {
						toValue: 1,
						useNativeDriver: true,
					}).start();

					// Reset position
					Animated.spring(pan, {
						toValue: { x: 0, y: 0 },
						useNativeDriver: true,
					}).start();

					onDragEnd && onDragEnd(gestureState.dx, gestureState.dy);
				},
			}),
		[table, onDragStart, onDragMove, onDragEnd, pan, scale]
	);

	return (
		<Animated.View
			{...panResponder.panHandlers}
			style={[
				{
					width: "100%",
					height: "100%",
					transform: [{ translateX: pan.x }, { translateY: pan.y }, { scale }],
				},
				isDragging && { zIndex: 1000 },
			]}
		>
			<TouchableOpacity
				onLongPress={() => onLongPress && onLongPress(table)}
				delayLongPress={500}
				style={[
					tableCardStyles(theme).card,
					table.status === "occupied" && tableCardStyles(theme).occupied,
					isHighlighted && tableCardStyles(theme).highlighted,
					isDragging && tableCardStyles(theme).dragging,
				]}
				activeOpacity={0.8}
			>
				<View style={tableCardStyles(theme).numberContainer}>
					<Text style={tableCardStyles(theme).number}>#{table.number}</Text>
				</View>
				<Text style={tableCardStyles(theme).capacity}>{table.capacity}</Text>
				<Ionicons
					name="people-outline"
					size={14}
					color={theme.colors.text.muted}
					style={tableCardStyles(theme).icon}
				/>
			</TouchableOpacity>
		</Animated.View>
	);
};

const tableCardStyles = (theme) =>
	StyleSheet.create({
		card: {
			width: "100%",
			height: "100%",
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
		occupied: {
			borderColor: theme.colors.status.error,
			backgroundColor: theme.colors.status.error + "20",
		},
		highlighted: {
			borderColor: theme.colors.primary.sky,
			borderWidth: 3,
			backgroundColor: theme.colors.primary.sky + "30",
		},
		dragging: {
			opacity: 0.8,
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
			fontSize: theme.typography.sizes.xl,
			fontWeight: "700",
			color: theme.colors.text.primary,
		},
		icon: {
			marginTop: 2,
		},
	});

const createStyles = (THEME, zoom) =>
	StyleSheet.create({
		overlay: {
			flex: 1,
			backgroundColor: "rgba(0, 0, 0, 0.8)",
			justifyContent: "center",
			alignItems: "center",
			padding: 20,
		},
		container: {
			width: "95%",
			maxWidth: 900,
			height: "90%",
			backgroundColor: THEME.colors.background.primary + "F8",
			borderRadius: 20,
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
		zoomControls: {
			flexDirection: "row",
			alignItems: "center",
			gap: 8,
		},
		zoomButton: {
			width: 36,
			height: 36,
			borderRadius: 18,
			backgroundColor: THEME.colors.background.card,
			alignItems: "center",
			justifyContent: "center",
		},
		zoomText: {
			fontSize: THEME.typography.sizes.sm,
			fontWeight: "600",
			color: THEME.colors.text.primary,
		},
		closeButton: {
			width: 36,
			height: 36,
			borderRadius: 18,
			backgroundColor: THEME.colors.background.card,
			alignItems: "center",
			justifyContent: "center",
		},
		scrollContainer: {
			flex: 1,
		},
		scrollContent: {
			padding: 20,
			alignItems: "center",
		},
		emptyState: {
			alignItems: "center",
			justifyContent: "center",
			paddingVertical: 60,
			paddingHorizontal: 40,
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
			lineHeight: 24,
		},
		gridContainer: {
			transform: [{ scale: zoom }],
		},
		gridRow: {
			flexDirection: "row",
		},
		gridCell: {
			width: 80,
			height: 80,
			padding: 4,
		},
		highlightedCell: {
			backgroundColor: THEME.colors.primary.sky + "20",
			borderRadius: 8,
		},
		emptyCell: {
			width: "100%",
			height: "100%",
			borderRadius: 8,
			borderWidth: 1,
			borderColor: THEME.colors.border.subtle + "40",
			borderStyle: "dashed",
			alignItems: "center",
			justifyContent: "center",
		},
		footer: {
			paddingHorizontal: 20,
			paddingVertical: 12,
			borderTopWidth: 1,
			borderTopColor: THEME.colors.border.default,
			alignItems: "center",
		},
		footerText: {
			fontSize: THEME.typography.sizes.sm,
			color: THEME.colors.text.muted,
			fontWeight: "600",
		},
		footerWarning: {
			fontSize: THEME.typography.sizes.xs,
			color: THEME.colors.status.warning,
			marginTop: 4,
			fontWeight: "600",
		},
		footerHint: {
			fontSize: THEME.typography.sizes.xs,
			color: THEME.colors.text.muted,
			marginTop: 4,
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
		editRow: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "space-between",
			marginBottom: 16,
		},
		editLabel: {
			fontSize: THEME.typography.sizes.md,
			fontWeight: "600",
			color: THEME.colors.text.primary,
		},
		editInput: {
			flex: 1,
			marginLeft: 16,
			paddingHorizontal: 16,
			paddingVertical: 12,
			backgroundColor: THEME.colors.background.card,
			borderRadius: 12,
			borderWidth: 2,
			borderColor: THEME.colors.primary.amber,
			fontSize: THEME.typography.sizes.lg,
			fontWeight: "600",
			color: THEME.colors.text.primary,
			textAlign: "center",
		},
		editValue: {
			fontSize: THEME.typography.sizes.md,
			color: THEME.colors.text.muted,
			fontWeight: "500",
		},
		editActions: {
			flexDirection: "row",
			marginTop: 24,
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
		editButtonDelete: {
			backgroundColor: THEME.colors.status.error,
		},
		editButtonText: {
			fontSize: THEME.typography.sizes.md,
			fontWeight: "600",
			color: "#fff",
		},
	});

// components/screens/manager/TableManagement.jsx
import React, { useState, useEffect, useCallback } from "react";
import {
	View,
	Text,
	TouchableOpacity,
	TextInput,
	FlatList,
	Alert,
	ActivityIndicator,
	StyleSheet,
	Modal,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuthFetch } from "../../../hooks/useAuthFetch";
import useThemeStore from "../../../src/stores/useThemeStore";

// Statuts disponibles pour une table
const TABLE_STATUSES = [
	{ value: "available", label: "Disponible", emoji: "🟢", color: "#4CAF50" },
	{ value: "occupied", label: "Occupée", emoji: "🟠", color: "#FF9800" },
	{
		value: "unavailable",
		label: "Indisponible",
		emoji: "🔴",
		color: "#F44336",
	},
];

export default function TableManagement() {
	const { theme, isDarkMode } = useThemeStore();
	const authFetch = useAuthFetch();

	const [tables, setTables] = useState([]);
	const [loading, setLoading] = useState(true);
	const [modalVisible, setModalVisible] = useState(false);
	const [editingTable, setEditingTable] = useState(null);
	const [restaurantId, setRestaurantId] = useState(null);

	// Formulaire
	const [formData, setFormData] = useState({
		number: "",
		capacity: "4",
		status: "available",
		qrCodeUrl: "",
	});

	// Récupérer le restaurantId au montage
	useEffect(() => {
		const loadRestaurantId = async () => {
			const id = await AsyncStorage.getItem("restaurantId");
			setRestaurantId(id);
		};
		loadRestaurantId();
	}, []);

	// Charger les tables
	const fetchTables = useCallback(async () => {
		if (!restaurantId) return;

		setLoading(true);
		try {
			const data = await authFetch(`/tables/restaurant/${restaurantId}`, {
				method: "GET",
			});
			setTables(Array.isArray(data) ? data : []);
		} catch (error) {
			console.error("❌ Erreur chargement tables:", error);
			Alert.alert("Erreur", "Impossible de charger les tables");
		} finally {
			setLoading(false);
		}
	}, [authFetch, restaurantId]);

	useEffect(() => {
		if (restaurantId) {
			fetchTables();
		}
	}, [fetchTables, restaurantId]);

	// Ouvrir modal création
	const handleCreate = () => {
		setEditingTable(null);
		setFormData({
			number: "",
			capacity: "4",
			status: "available",
			qrCodeUrl: "",
		});
		setModalVisible(true);
	};

	// Ouvrir modal édition
	const handleEdit = (table) => {
		setEditingTable(table);
		setFormData({
			number: table.number || "",
			capacity: String(table.capacity || 4),
			status: table.status || "available",
			qrCodeUrl: table.qrCodeUrl || "",
		});
		setModalVisible(true);
	};

	// Supprimer une table
	const handleDelete = (table) => {
		// Vérifier si la table est occupée
		if (table.status === "occupied") {
			Alert.alert(
				"Action impossible",
				"Impossible de supprimer une table occupée. Veuillez d'abord libérer la table.",
				[{ text: "OK" }]
			);
			return;
		}

		Alert.alert(
			"Supprimer la table",
			`Êtes-vous sûr de vouloir supprimer la table ${table.number} ?`,
			[
				{ text: "Annuler", style: "cancel" },
				{
					text: "Supprimer",
					style: "destructive",
					onPress: async () => {
						try {
							await authFetch(`/tables/${table._id}`, { method: "DELETE" });
							Alert.alert("Succès", "Table supprimée");
							fetchTables();
						} catch (error) {
							console.error("❌ Erreur suppression:", error);
							Alert.alert(
								"Erreur",
								error.message || "Impossible de supprimer la table"
							);
						}
					},
				},
			]
		);
	};

	// Changer rapidement le statut d'une table
	const handleToggleStatus = async (table) => {
		// Cycle des statuts : available -> occupied -> unavailable -> available
		const statusCycle = ["available", "occupied", "unavailable"];
		const currentIndex = statusCycle.indexOf(table.status);
		const nextStatus = statusCycle[(currentIndex + 1) % statusCycle.length];

		try {
			await authFetch(`/tables/${table._id}`, {
				method: "PUT",
				body: JSON.stringify({ status: nextStatus }),
			});
			fetchTables();
		} catch (error) {
			console.error("❌ Erreur changement statut:", error);
			Alert.alert("Erreur", "Impossible de changer le statut");
		}
	};

	// Sauvegarder (créer ou modifier)
	const handleSave = async () => {
		if (!formData.number.trim()) {
			Alert.alert("Erreur", "Le numéro de table est requis");
			return;
		}

		const capacity = parseInt(formData.capacity);
		if (isNaN(capacity) || capacity < 1 || capacity > 50) {
			Alert.alert("Erreur", "La capacité doit être entre 1 et 50");
			return;
		}

		try {
			const tableData = {
				number: formData.number.trim(),
				capacity: capacity,
				status: formData.status,
				qrCodeUrl: formData.qrCodeUrl.trim(),
			};

			if (editingTable) {
				// Modification
				await authFetch(`/tables/${editingTable._id}`, {
					method: "PUT",
					body: JSON.stringify(tableData),
				});
				Alert.alert("Succès", "Table modifiée");
			} else {
				// Création - inclure restaurantId
				await authFetch("/tables", {
					method: "POST",
					body: JSON.stringify({
						...tableData,
						restaurantId: restaurantId,
					}),
				});
				Alert.alert("Succès", "Table créée");
			}

			setModalVisible(false);
			fetchTables();
		} catch (error) {
			console.error("❌ Erreur sauvegarde:", error);
			Alert.alert("Erreur", error.message || "Impossible de sauvegarder");
		}
	};

	// Obtenir les infos du statut
	const getStatusInfo = (status) => {
		return TABLE_STATUSES.find((s) => s.value === status) || TABLE_STATUSES[0];
	};

	// Rendu d'une table
	const renderTable = ({ item }) => {
		const statusInfo = getStatusInfo(item.status);

		return (
			<View
				style={[styles.tableCard, { backgroundColor: theme.cardBackground }]}
			>
				<TouchableOpacity
					style={styles.tableInfo}
					onPress={() => handleToggleStatus(item)}
					activeOpacity={0.7}
				>
					<View style={styles.tableHeader}>
						<Text style={[styles.tableNumber, { color: theme.textColor }]}>
							🪑 Table {item.number}
						</Text>
						<View
							style={[
								styles.statusBadge,
								{ backgroundColor: statusInfo.color + "20" },
							]}
						>
							<Text
								style={[styles.statusBadgeText, { color: statusInfo.color }]}
							>
								{statusInfo.emoji} {statusInfo.label}
							</Text>
						</View>
					</View>
					<Text
						style={[
							styles.tableCapacity,
							{ color: theme.textColor, opacity: 0.7 },
						]}
					>
						👥 {item.capacity} places
					</Text>
					{item.qrCodeUrl && (
						<Text
							style={[styles.tableQR, { color: theme.textColor, opacity: 0.5 }]}
							numberOfLines={1}
						>
							📱 QR configuré
						</Text>
					)}
				</TouchableOpacity>
				<View style={styles.tableActions}>
					<TouchableOpacity
						style={[styles.actionButton, styles.editButton]}
						onPress={() => handleEdit(item)}
					>
						<Text style={styles.actionButtonText}>✏️</Text>
					</TouchableOpacity>
					<TouchableOpacity
						style={[
							styles.actionButton,
							styles.deleteButton,
							item.status === "occupied" && styles.disabledButton,
						]}
						onPress={() => handleDelete(item)}
						disabled={item.status === "occupied"}
					>
						<Text style={styles.actionButtonText}>🗑️</Text>
					</TouchableOpacity>
				</View>
			</View>
		);
	};

	// Stats rapides
	const getStats = () => {
		const available = tables.filter((t) => t.status === "available").length;
		const occupied = tables.filter((t) => t.status === "occupied").length;
		const unavailable = tables.filter((t) => t.status === "unavailable").length;
		const totalCapacity = tables.reduce((sum, t) => sum + (t.capacity || 0), 0);
		return {
			available,
			occupied,
			unavailable,
			total: tables.length,
			totalCapacity,
		};
	};

	if (loading) {
		return (
			<View style={styles.loadingContainer}>
				<ActivityIndicator size="large" color="#007AFF" />
				<Text style={{ color: theme.textColor, marginTop: 10 }}>
					Chargement des tables...
				</Text>
			</View>
		);
	}

	const stats = getStats();

	return (
		<View style={styles.container}>
			{/* Header */}
			<View style={styles.header}>
				<Text style={[styles.title, { color: theme.textColor }]}>
					🪑 Gestion des Tables
				</Text>
				<TouchableOpacity style={styles.addButton} onPress={handleCreate}>
					<Text style={styles.addButtonText}>+ Ajouter</Text>
				</TouchableOpacity>
			</View>

			{/* Stats rapides */}
			{tables.length > 0 && (
				<View
					style={[
						styles.statsContainer,
						{ backgroundColor: theme.cardBackground },
					]}
				>
					<View style={styles.statItem}>
						<Text style={[styles.statValue, { color: "#4CAF50" }]}>
							{stats.available}
						</Text>
						<Text style={[styles.statLabel, { color: theme.textColor }]}>
							Libres
						</Text>
					</View>
					<View style={styles.statDivider} />
					<View style={styles.statItem}>
						<Text style={[styles.statValue, { color: "#FF9800" }]}>
							{stats.occupied}
						</Text>
						<Text style={[styles.statLabel, { color: theme.textColor }]}>
							Occupées
						</Text>
					</View>
					<View style={styles.statDivider} />
					<View style={styles.statItem}>
						<Text style={[styles.statValue, { color: "#F44336" }]}>
							{stats.unavailable}
						</Text>
						<Text style={[styles.statLabel, { color: theme.textColor }]}>
							Indispo.
						</Text>
					</View>
					<View style={styles.statDivider} />
					<View style={styles.statItem}>
						<Text style={[styles.statValue, { color: theme.textColor }]}>
							{stats.totalCapacity}
						</Text>
						<Text style={[styles.statLabel, { color: theme.textColor }]}>
							Places
						</Text>
					</View>
				</View>
			)}

			{/* Liste des tables */}
			{tables.length === 0 ? (
				<View style={styles.emptyContainer}>
					<Text style={[styles.emptyText, { color: theme.textColor }]}>
						Aucune table enregistrée
					</Text>
					<Text
						style={[
							styles.emptySubtext,
							{ color: theme.textColor, opacity: 0.6 },
						]}
					>
						{`Cliquez sur "+ Ajouter" pour créer une table`}
					</Text>
				</View>
			) : (
				<FlatList
					data={tables}
					keyExtractor={(item) => item._id}
					renderItem={renderTable}
					contentContainerStyle={styles.listContainer}
				/>
			)}

			{/* Modal création/édition */}
			<Modal
				visible={modalVisible}
				transparent
				animationType="fade"
				onRequestClose={() => setModalVisible(false)}
			>
				<View style={styles.modalOverlay}>
					<View
						style={[
							styles.modalContent,
							{ backgroundColor: isDarkMode ? "#1C1C1E" : "#FFFFFF" },
						]}
					>
						<Text style={[styles.modalTitle, { color: theme.textColor }]}>
							{editingTable ? "✏️ Modifier la table" : "➕ Nouvelle table"}
						</Text>

						<TextInput
							style={[
								styles.input,
								{ color: theme.textColor, borderColor: theme.separatorColor },
							]}
							placeholder="Numéro de table *"
							placeholderTextColor={theme.textColor + "80"}
							value={formData.number}
							onChangeText={(text) =>
								setFormData({ ...formData, number: text })
							}
						/>

						<TextInput
							style={[
								styles.input,
								{ color: theme.textColor, borderColor: theme.separatorColor },
							]}
							placeholder="Capacité (nombre de places)"
							placeholderTextColor={theme.textColor + "80"}
							value={formData.capacity}
							onChangeText={(text) =>
								setFormData({
									...formData,
									capacity: text.replace(/[^0-9]/g, ""),
								})
							}
							keyboardType="numeric"
						/>

						<TextInput
							style={[
								styles.input,
								{ color: theme.textColor, borderColor: theme.separatorColor },
							]}
							placeholder="URL du QR Code (optionnel)"
							placeholderTextColor={theme.textColor + "80"}
							value={formData.qrCodeUrl}
							onChangeText={(text) =>
								setFormData({ ...formData, qrCodeUrl: text })
							}
							autoCapitalize="none"
						/>

						{/* Sélection du statut */}
						<Text style={[styles.label, { color: theme.textColor }]}>
							Statut:
						</Text>
						<View style={styles.statusContainer}>
							{TABLE_STATUSES.map((status) => (
								<TouchableOpacity
									key={status.value}
									style={[
										styles.statusButton,
										formData.status === status.value && {
											backgroundColor: status.color,
										},
									]}
									onPress={() =>
										setFormData({ ...formData, status: status.value })
									}
								>
									<Text
										style={[
											styles.statusButtonText,
											formData.status === status.value &&
												styles.statusButtonTextActive,
										]}
									>
										{status.emoji} {status.label}
									</Text>
								</TouchableOpacity>
							))}
						</View>

						<View style={styles.modalButtons}>
							<TouchableOpacity
								style={[styles.modalButton, styles.cancelButton]}
								onPress={() => setModalVisible(false)}
							>
								<Text style={styles.cancelButtonText}>Annuler</Text>
							</TouchableOpacity>
							<TouchableOpacity
								style={[styles.modalButton, styles.saveButton]}
								onPress={handleSave}
							>
								<Text style={styles.saveButtonText}>
									{editingTable ? "Modifier" : "Créer"}
								</Text>
							</TouchableOpacity>
						</View>
					</View>
				</View>
			</Modal>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	loadingContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
	},
	header: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 15,
	},
	title: {
		fontSize: 20,
		fontWeight: "bold",
	},
	addButton: {
		backgroundColor: "#4CAF50",
		paddingHorizontal: 15,
		paddingVertical: 8,
		borderRadius: 8,
	},
	addButtonText: {
		color: "#fff",
		fontWeight: "600",
	},
	// Stats
	statsContainer: {
		flexDirection: "row",
		justifyContent: "space-around",
		alignItems: "center",
		padding: 15,
		borderRadius: 12,
		marginBottom: 15,
	},
	statItem: {
		alignItems: "center",
	},
	statValue: {
		fontSize: 22,
		fontWeight: "bold",
	},
	statLabel: {
		fontSize: 12,
		marginTop: 2,
		opacity: 0.7,
	},
	statDivider: {
		width: 1,
		height: 30,
		backgroundColor: "#E0E0E0",
	},
	// Liste
	listContainer: {
		paddingBottom: 20,
	},
	tableCard: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		padding: 15,
		borderRadius: 10,
		marginBottom: 10,
		elevation: 2,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.1,
		shadowRadius: 2,
	},
	tableInfo: {
		flex: 1,
	},
	tableHeader: {
		flexDirection: "row",
		alignItems: "center",
		gap: 10,
		marginBottom: 4,
	},
	tableNumber: {
		fontSize: 16,
		fontWeight: "600",
	},
	tableCapacity: {
		fontSize: 14,
		marginBottom: 2,
	},
	tableQR: {
		fontSize: 12,
	},
	tableActions: {
		flexDirection: "row",
		gap: 10,
	},
	actionButton: {
		width: 40,
		height: 40,
		borderRadius: 8,
		justifyContent: "center",
		alignItems: "center",
	},
	editButton: {
		backgroundColor: "#FFA726",
	},
	deleteButton: {
		backgroundColor: "#EF5350",
	},
	disabledButton: {
		backgroundColor: "#BDBDBD",
		opacity: 0.6,
	},
	actionButtonText: {
		fontSize: 18,
	},
	// Status badge
	statusBadge: {
		paddingHorizontal: 10,
		paddingVertical: 4,
		borderRadius: 12,
	},
	statusBadgeText: {
		fontSize: 12,
		fontWeight: "600",
	},
	// Empty state
	emptyContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
	},
	emptyText: {
		fontSize: 18,
		fontWeight: "500",
		marginBottom: 8,
	},
	emptySubtext: {
		fontSize: 14,
	},
	// Modal
	modalOverlay: {
		flex: 1,
		backgroundColor: "rgba(0,0,0,0.5)",
		justifyContent: "center",
		alignItems: "center",
	},
	modalContent: {
		width: "90%",
		maxWidth: 400,
		padding: 20,
		borderRadius: 15,
	},
	modalTitle: {
		fontSize: 20,
		fontWeight: "bold",
		marginBottom: 20,
		textAlign: "center",
	},
	input: {
		borderWidth: 1,
		borderRadius: 8,
		padding: 12,
		marginBottom: 15,
		fontSize: 16,
	},
	label: {
		fontSize: 14,
		fontWeight: "500",
		marginBottom: 8,
	},
	statusContainer: {
		flexDirection: "row",
		gap: 8,
		marginBottom: 20,
		flexWrap: "wrap",
	},
	statusButton: {
		flex: 1,
		minWidth: 90,
		paddingVertical: 10,
		paddingHorizontal: 12,
		borderRadius: 10,
		backgroundColor: "#E0E0E0",
		alignItems: "center",
	},
	statusButtonText: {
		fontSize: 12,
		fontWeight: "500",
		color: "#666",
	},
	statusButtonTextActive: {
		color: "#fff",
	},
	modalButtons: {
		flexDirection: "row",
		justifyContent: "space-between",
		marginTop: 10,
	},
	modalButton: {
		flex: 1,
		padding: 12,
		borderRadius: 8,
		alignItems: "center",
	},
	cancelButton: {
		backgroundColor: "#9E9E9E",
		marginRight: 10,
	},
	saveButton: {
		backgroundColor: "#4CAF50",
		marginLeft: 10,
	},
	cancelButtonText: {
		color: "#fff",
		fontWeight: "600",
	},
	saveButtonText: {
		color: "#fff",
		fontWeight: "600",
	},
});

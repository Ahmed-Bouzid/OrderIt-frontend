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
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuthFetch } from "../../../hooks/useAuthFetch";
import useThemeStore from "../../../src/stores/useThemeStore";
import { getTheme } from "../../../utils/themeUtils";

// Statuts disponibles pour une table
const getTableStatuses = (THEME) => [
	{
		value: "available",
		label: "Disponible",
		icon: "checkmark-circle",
		color: THEME.colors.status.success,
		bgColor: "rgba(16, 185, 129, 0.15)",
	},
	{
		value: "occupied",
		label: "Occupée",
		icon: "people",
		color: THEME.colors.status.warning,
		bgColor: "rgba(245, 158, 11, 0.15)",
	},
	{
		value: "unavailable",
		label: "Indisponible",
		icon: "close-circle",
		color: THEME.colors.status.error,
		bgColor: "rgba(239, 68, 68, 0.15)",
	},
];

export default function TableManagement() {
	const { themeMode } = useThemeStore();
	const THEME = React.useMemo(() => getTheme(themeMode), [themeMode]);
	const TABLE_STATUSES = React.useMemo(() => getTableStatuses(THEME), [THEME]);
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
			<View style={styles.tableCard}>
				<TouchableOpacity
					style={styles.tableInfo}
					onPress={() => handleToggleStatus(item)}
					activeOpacity={0.7}
				>
					<View style={styles.tableHeader}>
						<Ionicons
							name="restaurant"
							size={20}
							color={THEME.colors.primary.amber}
						/>
						<Text style={styles.tableNumber}>Table {item.number}</Text>
						<View
							style={[
								styles.statusBadge,
								{ backgroundColor: statusInfo.bgColor },
							]}
						>
							<Ionicons
								name={statusInfo.icon}
								size={14}
								color={statusInfo.color}
							/>
							<Text
								style={[styles.statusBadgeText, { color: statusInfo.color }]}
							>
								{statusInfo.label}
							</Text>
						</View>
					</View>
					<View style={styles.tableDetails}>
						<View style={styles.detailItem}>
							<Ionicons
								name="people-outline"
								size={16}
								color={THEME.colors.text.muted}
							/>
							<Text style={styles.tableCapacity}>{item.capacity} places</Text>
						</View>
						{item.qrCodeUrl && (
							<View style={styles.detailItem}>
								<Ionicons
									name="qr-code-outline"
									size={16}
									color={THEME.colors.status.success}
								/>
								<Text style={styles.tableQR}>QR configuré</Text>
							</View>
						)}
					</View>
				</TouchableOpacity>
				<View style={styles.tableActions}>
					<TouchableOpacity
						style={[styles.actionButton, styles.editButton]}
						onPress={() => handleEdit(item)}
					>
						<Ionicons name="pencil" size={18} color="#FFFFFF" />
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
						<Ionicons name="trash" size={18} color="#FFFFFF" />
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

	const styles = React.useMemo(() => createStyles(THEME), [THEME]);

	if (loading) {
		return (
			<View style={styles.loadingContainer}>
				<ActivityIndicator size="large" color={THEME.colors.primary.amber} />
				<Text style={styles.loadingText}>Chargement des tables...</Text>
			</View>
		);
	}

	const stats = getStats();

	return (
		<View style={styles.container}>
			{/* Header */}
			<View style={styles.header}>
				<View style={styles.headerLeft}>
					<Ionicons name="grid" size={24} color={THEME.colors.primary.amber} />
					<Text style={styles.title}>Gestion des Tables</Text>
				</View>
				<TouchableOpacity style={styles.addButton} onPress={handleCreate}>
					<LinearGradient
						colors={[
							THEME.colors.primary.amber,
							THEME.colors.primary.amberDark,
						]}
						style={styles.addButtonGradient}
					>
						<Ionicons name="add" size={20} color="#FFFFFF" />
						<Text style={styles.addButtonText}>Ajouter</Text>
					</LinearGradient>
				</TouchableOpacity>
			</View>

			{/* Stats rapides */}
			{tables.length > 0 && (
				<View style={styles.statsContainer}>
					<View style={styles.statItem}>
						<Ionicons
							name="checkmark-circle"
							size={20}
							color={THEME.colors.status.success}
						/>
						<Text
							style={[styles.statValue, { color: THEME.colors.status.success }]}
						>
							{stats.available}
						</Text>
						<Text style={styles.statLabel}>Libres</Text>
					</View>
					<View style={styles.statDivider} />
					<View style={styles.statItem}>
						<Ionicons
							name="people"
							size={20}
							color={THEME.colors.status.warning}
						/>
						<Text
							style={[styles.statValue, { color: THEME.colors.status.warning }]}
						>
							{stats.occupied}
						</Text>
						<Text style={styles.statLabel}>Occupées</Text>
					</View>
					<View style={styles.statDivider} />
					<View style={styles.statItem}>
						<Ionicons
							name="close-circle"
							size={20}
							color={THEME.colors.status.error}
						/>
						<Text
							style={[styles.statValue, { color: THEME.colors.status.error }]}
						>
							{stats.unavailable}
						</Text>
						<Text style={styles.statLabel}>Indispo.</Text>
					</View>
					<View style={styles.statDivider} />
					<View style={styles.statItem}>
						<Ionicons
							name="people-outline"
							size={20}
							color={THEME.colors.text.secondary}
						/>
						<Text
							style={[styles.statValue, { color: THEME.colors.text.primary }]}
						>
							{stats.totalCapacity}
						</Text>
						<Text style={styles.statLabel}>Places</Text>
					</View>
				</View>
			)}

			{/* Liste des tables */}
			{tables.length === 0 ? (
				<View style={styles.emptyContainer}>
					<Ionicons
						name="grid-outline"
						size={64}
						color={THEME.colors.text.muted}
					/>
					<Text style={styles.emptyText}>Aucune table enregistrée</Text>
					<Text style={styles.emptySubtext}>
						Cliquez sur "Ajouter" pour créer une table
					</Text>
				</View>
			) : (
				<FlatList
					data={tables}
					keyExtractor={(item) => item._id}
					renderItem={renderTable}
					contentContainerStyle={styles.listContainer}
					showsVerticalScrollIndicator={false}
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
					<View style={styles.modalContent}>
						{/* Header Modal */}
						<View style={styles.modalHeader}>
							<Ionicons
								name={editingTable ? "pencil" : "add-circle"}
								size={24}
								color={THEME.colors.primary.amber}
							/>
							<Text style={styles.modalTitle}>
								{editingTable ? "Modifier la table" : "Nouvelle table"}
							</Text>
						</View>

						{/* Formulaire */}
						<View style={styles.inputGroup}>
							<Text style={styles.inputLabel}>Numéro de table *</Text>
							<View style={styles.inputWrapper}>
								<Ionicons
									name="restaurant-outline"
									size={18}
									color={THEME.colors.text.muted}
								/>
								<TextInput
									style={styles.input}
									placeholder="Ex: 1, A1, Terrasse 1..."
									placeholderTextColor={THEME.colors.text.muted}
									value={formData.number}
									onChangeText={(text) =>
										setFormData({ ...formData, number: text })
									}
								/>
							</View>
						</View>

						<View style={styles.inputGroup}>
							<Text style={styles.inputLabel}>Capacité (nombre de places)</Text>
							<View style={styles.inputWrapper}>
								<Ionicons
									name="people-outline"
									size={18}
									color={THEME.colors.text.muted}
								/>
								<TextInput
									style={styles.input}
									placeholder="4"
									placeholderTextColor={THEME.colors.text.muted}
									value={formData.capacity}
									onChangeText={(text) =>
										setFormData({
											...formData,
											capacity: text.replace(/[^0-9]/g, ""),
										})
									}
									keyboardType="numeric"
								/>
							</View>
						</View>

						<View style={styles.inputGroup}>
							<Text style={styles.inputLabel}>URL du QR Code (optionnel)</Text>
							<View style={styles.inputWrapper}>
								<Ionicons
									name="qr-code-outline"
									size={18}
									color={THEME.colors.text.muted}
								/>
								<TextInput
									style={styles.input}
									placeholder="https://..."
									placeholderTextColor={THEME.colors.text.muted}
									value={formData.qrCodeUrl}
									onChangeText={(text) =>
										setFormData({ ...formData, qrCodeUrl: text })
									}
									autoCapitalize="none"
								/>
							</View>
						</View>

						{/* Sélection du statut */}
						<View style={styles.inputGroup}>
							<Text style={styles.inputLabel}>Statut</Text>
							<View style={styles.statusContainer}>
								{TABLE_STATUSES.map((status) => {
									const isSelected = formData.status === status.value;
									return (
										<TouchableOpacity
											key={status.value}
											style={[
												styles.statusButton,
												isSelected && {
													backgroundColor: status.bgColor,
													borderColor: status.color,
												},
											]}
											onPress={() =>
												setFormData({ ...formData, status: status.value })
											}
										>
											<Ionicons
												name={status.icon}
												size={18}
												color={
													isSelected ? status.color : THEME.colors.text.muted
												}
											/>
											<Text
												style={[
													styles.statusButtonText,
													isSelected && { color: status.color },
												]}
											>
												{status.label}
											</Text>
										</TouchableOpacity>
									);
								})}
							</View>
						</View>

						{/* Boutons */}
						<View style={styles.modalButtons}>
							<TouchableOpacity
								style={styles.cancelButton}
								onPress={() => setModalVisible(false)}
							>
								<Text style={styles.cancelButtonText}>Annuler</Text>
							</TouchableOpacity>
							<TouchableOpacity style={styles.saveButton} onPress={handleSave}>
								<LinearGradient
									colors={[
										THEME.colors.primary.amber,
										THEME.colors.primary.amberDark,
									]}
									style={styles.saveButtonGradient}
								>
									<Text style={styles.saveButtonText}>
										{editingTable ? "Modifier" : "Créer"}
									</Text>
								</LinearGradient>
							</TouchableOpacity>
						</View>
					</View>
				</View>
			</Modal>
		</View>
	);
}

// ═══════════════════════════════════════════════════════════════════════
// 🎨 Premium Dark Styles
// ═══════════════════════════════════════════════════════════════════════
const createStyles = (THEME) =>
	StyleSheet.create({
		container: {
			flex: 1,
		},
		loadingContainer: {
			flex: 1,
			justifyContent: "center",
			alignItems: "center",
		},
		loadingText: {
			color: THEME.colors.text.secondary,
			marginTop: THEME.spacing.md,
			fontSize: 14,
		},
		header: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
			marginBottom: THEME.spacing.lg,
		},
		headerLeft: {
			flexDirection: "row",
			alignItems: "center",
			gap: THEME.spacing.sm,
		},
		title: {
			fontSize: 20,
			fontWeight: "700",
			color: THEME.colors.text.primary,
		},
		addButton: {
			borderRadius: THEME.radius.md,
			overflow: "hidden",
		},
		addButtonGradient: {
			flexDirection: "row",
			alignItems: "center",
			paddingHorizontal: THEME.spacing.lg,
			paddingVertical: THEME.spacing.sm + 2,
			gap: THEME.spacing.xs,
		},
		addButtonText: {
			color: "#FFFFFF",
			fontWeight: "600",
			fontSize: 14,
		},
		// Stats
		statsContainer: {
			flexDirection: "row",
			justifyContent: "space-around",
			alignItems: "center",
			padding: THEME.spacing.lg,
			backgroundColor: THEME.colors.background.card,
			borderRadius: THEME.radius.lg,
			borderWidth: 1,
			borderColor: THEME.colors.border.default,
			marginBottom: THEME.spacing.lg,
		},
		statItem: {
			alignItems: "center",
			gap: THEME.spacing.xs,
		},
		statValue: {
			fontSize: 20,
			fontWeight: "700",
		},
		statLabel: {
			fontSize: 11,
			color: THEME.colors.text.muted,
			fontWeight: "500",
		},
		statDivider: {
			width: 1,
			height: 40,
			backgroundColor: THEME.colors.border.default,
		},
		// Liste
		listContainer: {
			paddingBottom: THEME.spacing.xl,
		},
		tableCard: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
			padding: THEME.spacing.lg,
			backgroundColor: THEME.colors.background.card,
			borderRadius: THEME.radius.lg,
			borderWidth: 1,
			borderColor: THEME.colors.border.default,
			marginBottom: THEME.spacing.md,
		},
		tableInfo: {
			flex: 1,
		},
		tableHeader: {
			flexDirection: "row",
			alignItems: "center",
			gap: THEME.spacing.sm,
			marginBottom: THEME.spacing.sm,
		},
		tableNumber: {
			fontSize: 16,
			fontWeight: "600",
			color: THEME.colors.text.primary,
			flex: 1,
		},
		tableDetails: {
			flexDirection: "row",
			alignItems: "center",
			gap: THEME.spacing.lg,
			marginLeft: 28,
		},
		detailItem: {
			flexDirection: "row",
			alignItems: "center",
			gap: THEME.spacing.xs,
		},
		tableCapacity: {
			fontSize: 14,
			color: THEME.colors.text.secondary,
		},
		tableQR: {
			fontSize: 12,
			color: THEME.colors.status.success,
		},
		tableActions: {
			flexDirection: "row",
			gap: THEME.spacing.sm,
		},
		actionButton: {
			width: 40,
			height: 40,
			borderRadius: THEME.radius.md,
			justifyContent: "center",
			alignItems: "center",
		},
		editButton: {
			backgroundColor: THEME.colors.status.warning,
		},
		deleteButton: {
			backgroundColor: THEME.colors.status.error,
		},
		disabledButton: {
			backgroundColor: THEME.colors.text.muted,
			opacity: 0.5,
		},
		// Status badge
		statusBadge: {
			flexDirection: "row",
			alignItems: "center",
			gap: THEME.spacing.xs,
			paddingHorizontal: THEME.spacing.sm,
			paddingVertical: THEME.spacing.xs,
			borderRadius: THEME.radius.sm,
		},
		statusBadgeText: {
			fontSize: 11,
			fontWeight: "600",
		},
		// Empty state
		emptyContainer: {
			flex: 1,
			justifyContent: "center",
			alignItems: "center",
			paddingHorizontal: THEME.spacing.xl,
		},
		emptyText: {
			fontSize: 18,
			fontWeight: "600",
			color: THEME.colors.text.primary,
			marginTop: THEME.spacing.lg,
			marginBottom: THEME.spacing.sm,
		},
		emptySubtext: {
			fontSize: 14,
			color: THEME.colors.text.muted,
			textAlign: "center",
		},
		// Modal
		modalOverlay: {
			flex: 1,
			backgroundColor: "rgba(0, 0, 0, 0.7)",
			justifyContent: "center",
			alignItems: "center",
		},
		modalContent: {
			width: "90%",
			maxWidth: 420,
			backgroundColor: THEME.colors.background.card,
			borderRadius: THEME.radius.xl,
			padding: THEME.spacing.xl,
			borderWidth: 1,
			borderColor: THEME.colors.border.default,
		},
		modalHeader: {
			flexDirection: "row",
			alignItems: "center",
			gap: THEME.spacing.md,
			marginBottom: THEME.spacing.xl,
		},
		modalTitle: {
			fontSize: 20,
			fontWeight: "700",
			color: THEME.colors.text.primary,
		},
		inputGroup: {
			marginBottom: THEME.spacing.lg,
		},
		inputLabel: {
			fontSize: 13,
			fontWeight: "600",
			color: THEME.colors.text.secondary,
			marginBottom: THEME.spacing.sm,
		},
		inputWrapper: {
			flexDirection: "row",
			alignItems: "center",
			backgroundColor: THEME.colors.background.elevated,
			borderRadius: THEME.radius.md,
			borderWidth: 1,
			borderColor: THEME.colors.border.default,
			paddingHorizontal: THEME.spacing.md,
		},
		input: {
			flex: 1,
			paddingVertical: THEME.spacing.md,
			paddingHorizontal: THEME.spacing.sm,
			fontSize: 15,
			color: THEME.colors.text.primary,
		},
		statusContainer: {
			flexDirection: "row",
			gap: THEME.spacing.sm,
			flexWrap: "wrap",
		},
		statusButton: {
			flex: 1,
			minWidth: 100,
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "center",
			paddingVertical: THEME.spacing.md,
			borderRadius: THEME.radius.md,
			backgroundColor: THEME.colors.background.elevated,
			borderWidth: 1.5,
			borderColor: THEME.colors.border.default,
			gap: THEME.spacing.xs,
		},
		statusButtonText: {
			fontSize: 12,
			fontWeight: "600",
			color: THEME.colors.text.muted,
		},
		modalButtons: {
			flexDirection: "row",
			gap: THEME.spacing.md,
			marginTop: THEME.spacing.lg,
		},
		cancelButton: {
			flex: 1,
			paddingVertical: THEME.spacing.md,
			borderRadius: THEME.radius.md,
			backgroundColor: THEME.colors.background.elevated,
			alignItems: "center",
			borderWidth: 1,
			borderColor: THEME.colors.border.default,
		},
		cancelButtonText: {
			color: THEME.colors.text.secondary,
			fontWeight: "600",
			fontSize: 15,
		},
		saveButton: {
			flex: 1,
			borderRadius: THEME.radius.md,
			overflow: "hidden",
		},
		saveButtonGradient: {
			paddingVertical: THEME.spacing.md,
			alignItems: "center",
		},
		saveButtonText: {
			color: "#FFFFFF",
			fontWeight: "700",
			fontSize: 15,
		},
	});

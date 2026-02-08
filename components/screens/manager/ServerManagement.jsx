import React, { useState, useEffect, useCallback } from "react";
import {
	View,
	Text,
	FlatList,
	TouchableOpacity,
	TextInput,
	Modal,
	Alert,
	ActivityIndicator,
	StyleSheet,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getItem as getSecureItem } from "../../../utils/secureStorage";
import useThemeStore from "../../../src/stores/useThemeStore";
import { getTheme } from "../../../utils/themeUtils";
import { useServerStore } from "../../../src/stores/useRestaurantStaffStore";

// API Base URL
const API_URL =
	process.env.EXPO_PUBLIC_API_URL ||
	"https://orderit-backend-6y1m.onrender.com";

export default function ServerManagement({ theme: parentTheme }) {
	// États
	const [servers, setServers] = useState([]);
	const [loading, setLoading] = useState(true);
	const [modalVisible, setModalVisible] = useState(false);
	const [editingServer, setEditingServer] = useState(null);
	const [restaurantId, setRestaurantId] = useState(null);
	const [formData, setFormData] = useState({
		name: "",
		email: "",
		password: "",
		role: "server",
	});
	const { fetchServers: refreshServersStore } = useServerStore();
	const { themeMode } = useThemeStore();
	const THEME = React.useMemo(() => getTheme(themeMode), [themeMode]);

	// Récupérer le restaurantId au montage
	useEffect(() => {
		const loadRestaurantId = async () => {
			try {
				const storedId = await AsyncStorage.getItem("restaurantId");
				if (storedId) {
					setRestaurantId(storedId);
				}
			} catch (error) {
				console.error("Erreur récupération restaurantId:", error);
			}
		};
		loadRestaurantId();
	}, []);

	// Récupérer la liste des serveurs
	const fetchServers = useCallback(async () => {
		if (!restaurantId) {
			console.log("⚠️ fetchServers: restaurantId manquant");
			return;
		}

		try {
			setLoading(true);
			const token = await getSecureItem("@access_token");
			console.log(
				"🔑 Token récupéré:",
				token ? `${token.substring(0, 20)}...` : "NULL"
			);
			const url = `${API_URL}/restaurants/${restaurantId}/servers`;
			const response = await fetch(url, {
				headers: {
					Authorization: `Bearer ${token}`,
					"Content-Type": "application/json",
				},
			});

			console.log("📊 Response status:", response.status);

			if (!response.ok) {
				const errorText = await response.text();
				console.error("❌ Erreur API:", response.status, errorText);
				throw new Error(`Erreur serveur (${response.status}): ${errorText}`);
			}

			const data = await response.json();
			console.log("✅ Serveurs récupérés:", data?.length || 0);
			setServers(data || []);
		} catch (error) {
			console.error("Erreur récupération serveurs:", error);
			Alert.alert("Erreur", "Impossible de charger les serveurs");
		} finally {
			setLoading(false);
		}
	}, [restaurantId]);

	useEffect(() => {
		if (restaurantId) {
			fetchServers();
		}
	}, [restaurantId, fetchServers]);

	// Ouvrir le modal pour ajouter/modifier
	const openModal = useCallback((server = null) => {
		if (server) {
			setEditingServer(server);
			setFormData({
				name: server.name || "",
				email: server.email || "",
				password: "",
				role: server.role || "server",
			});
		} else {
			setEditingServer(null);
			setFormData({ name: "", email: "", password: "", role: "server" });
		}
		setModalVisible(true);
	}, []);

	// Sauvegarder (créer ou modifier)
	const handleSave = useCallback(async () => {
		const { name, email, password, role } = formData;

		if (!name.trim() || !email.trim()) {
			Alert.alert("Erreur", "Le nom et l'email sont obligatoires");
			return;
		}

		if (!editingServer && !password.trim()) {
			Alert.alert(
				"Erreur",
				"Le mot de passe est obligatoire pour un nouveau serveur"
			);
			return;
		}

		try {
			const token = await AsyncStorage.getItem("token");

			if (editingServer) {
				const updateData = { name, email, role };
				if (password.trim()) {
					updateData.password = password;
				}
				const response = await fetch(
					`${API_URL}/servers/${editingServer._id}`,
					{
						method: "PUT",
						headers: {
							Authorization: `Bearer ${token}`,
							"Content-Type": "application/json",
						},
						body: JSON.stringify(updateData),
					}
				);

				if (!response.ok) {
					const errorData = await response.json();
					throw new Error(errorData.message || "Erreur de mise à jour");
				}
				Alert.alert("Succès", "Serveur mis à jour avec succès");
			} else {
				const response = await fetch(`${API_URL}/servers`, {
					method: "POST",
					headers: {
						Authorization: `Bearer ${token}`,
						"Content-Type": "application/json",
					},
					body: JSON.stringify({ name, email, password, role, restaurantId }),
				});

				if (!response.ok) {
					const errorData = await response.json();
					throw new Error(errorData.message || "Erreur de création");
				}
				Alert.alert("Succès", "Serveur créé avec succès");
			}
			setModalVisible(false);
			fetchServers();
			refreshServersStore?.();
		} catch (error) {
			console.error("Erreur sauvegarde:", error);
			Alert.alert("Erreur", error.message || "Impossible de sauvegarder");
		}
	}, [
		formData,
		editingServer,
		fetchServers,
		refreshServersStore,
		restaurantId,
	]);

	// Supprimer un serveur
	const handleDelete = useCallback(
		(server) => {
			Alert.alert(
				"Confirmation",
				`Êtes-vous sûr de vouloir supprimer ${server.name} ?`,
				[
					{ text: "Annuler", style: "cancel" },
					{
						text: "Supprimer",
						style: "destructive",
						onPress: async () => {
							try {
								const token = await AsyncStorage.getItem("token");
								const response = await fetch(
									`${API_URL}/servers/${server._id}`,
									{
										method: "DELETE",
										headers: {
											Authorization: `Bearer ${token}`,
											"Content-Type": "application/json",
										},
									}
								);

								if (!response.ok) {
									throw new Error("Erreur de suppression");
								}
								Alert.alert("Succès", "Serveur supprimé");
								fetchServers();
								refreshServersStore?.();
							} catch (error) {
								console.error("Erreur suppression:", error);
								Alert.alert("Erreur", "Impossible de supprimer le serveur");
							}
						},
					},
				]
			);
		},
		[fetchServers, refreshServersStore]
	);

	// Rendu d'un serveur
	const renderServer = useCallback(
		({ item }) => {
			const isManager = item.role === "manager";
			const roleColor = isManager
				? THEME.colors.role.manager
				: THEME.colors.role.server;
			const roleLabel = isManager ? "Manager" : "Serveur";

			return (
				<View style={styles.serverCard}>
					<View style={styles.serverInfo}>
						<View style={styles.serverHeader}>
							<Text style={styles.serverName}>{item.name}</Text>
							<View
								style={[
									styles.roleBadge,
									{ backgroundColor: `${roleColor}20` },
								]}
							>
								<Ionicons
									name={isManager ? "shield-checkmark" : "person"}
									size={12}
									color={THEME.colors.text.secondary}
								/>
								<Text style={[styles.roleText, { color: roleColor }]}>
									{roleLabel}
								</Text>
							</View>
						</View>
						<Text style={styles.serverEmail}>{item.email}</Text>
					</View>
					<View style={styles.serverActions}>
						<TouchableOpacity
							style={styles.actionButton}
							onPress={() => openModal(item)}
						>
							<Ionicons
								name="pencil"
								size={18}
								color={THEME.colors.primary.amber}
							/>
						</TouchableOpacity>
						<TouchableOpacity
							style={[styles.actionButton, styles.deleteButton]}
							onPress={() => handleDelete(item)}
						>
							<Ionicons
								name="trash"
								size={18}
								color={THEME.colors.status.error}
							/>
						</TouchableOpacity>
					</View>
				</View>
			);
		},
		[openModal, handleDelete]
	);

	// État vide
	const renderEmpty = useCallback(
		() => (
			<View style={styles.emptyContainer}>
				<LinearGradient
					colors={["rgba(245, 158, 11, 0.08)", "rgba(30, 36, 51, 0.5)"]}
					style={styles.emptyGradient}
				>
					<Ionicons
						name="people-outline"
						size={64}
						color={THEME.colors.text.muted}
					/>
					<Text style={styles.emptyText}>Aucun serveur</Text>
					<Text style={styles.emptySubtext}>
						Cliquez sur `+ Ajouter` pour créer un serveur
					</Text>
				</LinearGradient>
			</View>
		),
		[]
	);

	const styles = React.useMemo(() => createStyles(THEME), [THEME]);

	// Chargement
	if (loading) {
		return (
			<View style={styles.loadingContainer}>
				<ActivityIndicator size="large" color={THEME.colors.primary.amber} />
				<Text style={styles.loadingText}>Chargement des serveurs...</Text>
			</View>
		);
	}

	return (
		<View style={styles.container}>
			{/* Header */}
			<View style={styles.header}>
				<View>
					<Text style={styles.title}>Équipe</Text>
					<Text style={styles.subtitle}>{servers.length} membre(s)</Text>
				</View>
				<TouchableOpacity
					onPress={() => openModal()}
					style={styles.addButtonContainer}
				>
					<LinearGradient
						colors={
							(THEME.gradients && THEME.gradients.primary) || [
								"#F59E0B",
								"#FBBF24",
							]
						}
						style={styles.addButton}
						start={{ x: 0, y: 0 }}
						end={{ x: 1, y: 0 }}
					>
						<Ionicons name="add" size={20} color="#FFFFFF" />
						<Text style={styles.addButtonText}>Ajouter</Text>
					</LinearGradient>
				</TouchableOpacity>
			</View>

			{/* Liste des serveurs */}
			{servers.length === 0 ? (
				renderEmpty()
			) : (
				<FlatList
					data={servers}
					keyExtractor={(item) => item._id}
					renderItem={renderServer}
					showsVerticalScrollIndicator={false}
					contentContainerStyle={styles.listContent}
				/>
			)}

			{/* Modal Ajout/Modification */}
			<Modal
				visible={modalVisible}
				transparent
				animationType="fade"
				onRequestClose={() => setModalVisible(false)}
			>
				<View style={styles.modalOverlay}>
					<View style={styles.modalContent}>
						<View style={styles.modalHeader}>
							<Text style={styles.modalTitle}>
								{editingServer ? "Modifier le serveur" : "Nouveau serveur"}
							</Text>
							<TouchableOpacity
								onPress={() => setModalVisible(false)}
								style={styles.closeButton}
							>
								<Ionicons
									name="close"
									size={24}
									color={THEME.colors.text.secondary}
								/>
							</TouchableOpacity>
						</View>

						<View style={styles.formGroup}>
							<Text style={styles.label}>Nom</Text>
							<TextInput
								style={styles.input}
								value={formData.name}
								onChangeText={(text) =>
									setFormData({ ...formData, name: text })
								}
								placeholder="Nom du serveur"
								placeholderTextColor={THEME.colors.text.muted}
							/>
						</View>

						<View style={styles.formGroup}>
							<Text style={styles.label}>Email</Text>
							<TextInput
								style={styles.input}
								value={formData.email}
								onChangeText={(text) =>
									setFormData({ ...formData, email: text })
								}
								placeholder="email@exemple.com"
								placeholderTextColor={THEME.colors.text.muted}
								keyboardType="email-address"
								autoCapitalize="none"
							/>
						</View>

						<View style={styles.formGroup}>
							<Text style={styles.label}>
								Mot de passe{" "}
								{editingServer && "(laisser vide pour ne pas changer)"}
							</Text>
							<TextInput
								style={styles.input}
								value={formData.password}
								onChangeText={(text) =>
									setFormData({ ...formData, password: text })
								}
								placeholder="••••••••"
								placeholderTextColor={THEME.colors.text.muted}
								secureTextEntry
							/>
						</View>

						<View style={styles.formGroup}>
							<Text style={styles.label}>Rôle</Text>
							<View style={styles.roleSelector}>
								<TouchableOpacity
									style={[
										styles.roleOption,
										formData.role === "server" && styles.roleOptionSelected,
									]}
									onPress={() => setFormData({ ...formData, role: "server" })}
								>
									<Ionicons
										name="person"
										size={18}
										color={
											formData.role === "server"
												? "#FFFFFF"
												: THEME.colors.text.secondary
										}
									/>
									<Text
										style={[
											styles.roleOptionText,
											formData.role === "server" &&
												styles.roleOptionTextSelected,
										]}
									>
										Serveur
									</Text>
								</TouchableOpacity>
								<TouchableOpacity
									style={[
										styles.roleOption,
										formData.role === "manager" &&
											styles.roleOptionSelectedManager,
									]}
									onPress={() => setFormData({ ...formData, role: "manager" })}
								>
									<Ionicons
										name="shield-checkmark"
										size={18}
										color={
											formData.role === "manager"
												? "#FFFFFF"
												: THEME.colors.text.secondary
										}
									/>
									<Text
										style={[
											styles.roleOptionText,
											formData.role === "manager" &&
												styles.roleOptionTextSelected,
										]}
									>
										Manager
									</Text>
								</TouchableOpacity>
							</View>
						</View>

						<View style={styles.modalActions}>
							<TouchableOpacity
								style={styles.cancelButton}
								onPress={() => setModalVisible(false)}
							>
								<Text style={styles.cancelButtonText}>Annuler</Text>
							</TouchableOpacity>
							<TouchableOpacity
								onPress={handleSave}
								style={styles.saveButtonContainer}
							>
								<LinearGradient
									colors={
										(THEME.gradients && THEME.gradients.primary) || [
											"#F59E0B",
											"#FBBF24",
										]
									}
									style={styles.saveButton}
									start={{ x: 0, y: 0 }}
									end={{ x: 1, y: 0 }}
								>
									<Text style={styles.saveButtonText}>
										{editingServer ? "Modifier" : "Créer"}
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
// 🎨 STYLES PREMIUM DARK
// ═══════════════════════════════════════════════════════════════════════
const createStyles = (THEME) =>
	StyleSheet.create({
		container: {
			flex: 1,
			backgroundColor: THEME.colors.background.dark,
			padding: THEME.spacing.lg,
		},
		loadingContainer: {
			flex: 1,
			justifyContent: "center",
			alignItems: "center",
			backgroundColor: THEME.colors.background.dark,
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
			marginBottom: THEME.spacing.xl,
		},
		title: {
			fontSize: 24,
			fontWeight: "700",
			color: THEME.colors.text.primary,
		},
		subtitle: {
			fontSize: 14,
			color: THEME.colors.text.secondary,
			marginTop: 2,
		},
		addButtonContainer: {
			borderRadius: THEME.radius.lg,
			overflow: "hidden",
		},
		addButton: {
			flexDirection: "row",
			alignItems: "center",
			paddingVertical: THEME.spacing.md,
			paddingHorizontal: THEME.spacing.lg,
			gap: THEME.spacing.sm,
		},
		addButtonText: {
			color: "#FFFFFF",
			fontWeight: "600",
			fontSize: 14,
		},
		listContent: {
			paddingBottom: THEME.spacing.xl,
		},
		serverCard: {
			backgroundColor: THEME.colors.background.card,
			borderRadius: THEME.radius.lg,
			borderWidth: 1,
			borderColor: THEME.colors.border.default,
			padding: THEME.spacing.lg,
			marginBottom: THEME.spacing.md,
			flexDirection: "row",
			alignItems: "center",
		},
		serverInfo: {
			flex: 1,
		},
		serverHeader: {
			flexDirection: "row",
			alignItems: "center",
			gap: THEME.spacing.sm,
			marginBottom: THEME.spacing.xs,
		},
		serverName: {
			fontSize: 16,
			fontWeight: "600",
			color: THEME.colors.text.primary,
		},
		roleBadge: {
			flexDirection: "row",
			alignItems: "center",
			paddingHorizontal: THEME.spacing.sm,
			paddingVertical: THEME.spacing.xs,
			borderRadius: THEME.radius.sm,
			gap: 4,
		},
		roleText: {
			fontSize: 11,
			fontWeight: "600",
			color: THEME.colors.text.secondary,
		},
		serverEmail: {
			fontSize: 13,
			color: THEME.colors.text.secondary,
		},
		serverActions: {
			flexDirection: "row",
			gap: THEME.spacing.sm,
		},
		actionButton: {
			width: 40,
			height: 40,
			borderRadius: THEME.radius.md,
			backgroundColor: THEME.colors.background.elevated,
			alignItems: "center",
			justifyContent: "center",
			borderWidth: 1,
			borderColor: THEME.colors.border.default,
		},
		deleteButton: {
			borderColor: "rgba(239, 68, 68, 0.2)",
		},
		emptyContainer: {
			flex: 1,
			justifyContent: "center",
			alignItems: "center",
			paddingHorizontal: THEME.spacing.xl,
		},
		emptyGradient: {
			padding: THEME.spacing.xl * 2,
			borderRadius: THEME.radius.xl,
			alignItems: "center",
			width: "100%",
			maxWidth: 400,
		},
		emptyText: {
			fontSize: 18,
			fontWeight: "600",
			color: THEME.colors.text.primary,
			marginTop: THEME.spacing.lg,
		},
		emptySubtext: {
			fontSize: 14,
			color: THEME.colors.text.secondary,
			textAlign: "center",
			marginTop: THEME.spacing.sm,
		},
		// Modal styles
		modalOverlay: {
			flex: 1,
			backgroundColor: "rgba(0, 0, 0, 0.7)",
			justifyContent: "center",
			alignItems: "center",
			padding: THEME.spacing.xl,
		},
		modalContent: {
			backgroundColor: THEME.colors.background.card,
			borderRadius: THEME.radius.xl,
			width: "100%",
			maxWidth: 400,
			padding: THEME.spacing.xl,
			borderWidth: 1,
			borderColor: THEME.colors.border.default,
		},
		modalHeader: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
			marginBottom: THEME.spacing.xl,
		},
		modalTitle: {
			fontSize: 20,
			fontWeight: "700",
			color: THEME.colors.text.primary,
		},
		closeButton: {
			padding: THEME.spacing.xs,
		},
		formGroup: {
			marginBottom: THEME.spacing.lg,
		},
		label: {
			fontSize: 13,
			fontWeight: "600",
			color: THEME.colors.text.secondary,
			marginBottom: THEME.spacing.sm,
		},
		input: {
			backgroundColor: THEME.colors.background.input,
			borderRadius: THEME.radius.md,
			borderWidth: 1,
			borderColor: THEME.colors.border.default,
			paddingHorizontal: THEME.spacing.lg,
			paddingVertical: THEME.spacing.md,
			fontSize: 15,
			color: THEME.colors.text.primary,
		},
		roleSelector: {
			flexDirection: "row",
			gap: THEME.spacing.md,
		},
		roleOption: {
			flex: 1,
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "center",
			paddingVertical: THEME.spacing.md,
			borderRadius: THEME.radius.md,
			borderWidth: 1,
			borderColor: THEME.colors.border.default,
			backgroundColor: THEME.colors.background.elevated,
			gap: THEME.spacing.sm,
		},
		roleOptionSelected: {
			backgroundColor: THEME.colors.role.server,
			borderColor: THEME.colors.role.server,
		},
		roleOptionSelectedManager: {
			backgroundColor: THEME.colors.role.manager,
			borderColor: THEME.colors.role.manager,
		},
		roleOptionText: {
			fontSize: 14,
			color: THEME.colors.text.secondary,
			fontWeight: "500",
		},
		roleOptionTextSelected: {
			color: "#FFFFFF",
			fontWeight: "600",
		},
		modalActions: {
			flexDirection: "row",
			gap: THEME.spacing.md,
			marginTop: THEME.spacing.lg,
		},
		cancelButton: {
			flex: 1,
			paddingVertical: THEME.spacing.md,
			borderRadius: THEME.radius.md,
			borderWidth: 1,
			borderColor: THEME.colors.border.default,
			alignItems: "center",
		},
		cancelButtonText: {
			color: THEME.colors.text.secondary,
			fontWeight: "600",
			fontSize: 14,
		},
		saveButtonContainer: {
			flex: 1,
			borderRadius: THEME.radius.md,
			overflow: "hidden",
		},
		saveButton: {
			paddingVertical: THEME.spacing.md,
			alignItems: "center",
		},
		saveButtonText: {
			color: "#FFFFFF",
			fontWeight: "600",
			fontSize: 14,
		},
	});

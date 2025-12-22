// components/screens/manager/ServerManagement.jsx
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

export default function ServerManagement() {
	const { theme, isDarkMode } = useThemeStore();
	const authFetch = useAuthFetch();

	// Rôles disponibles
	const roles = [
		{ value: "server", label: "Serveur" },
		{ value: "manager", label: "Manager" },
	];

	const [servers, setServers] = useState([]);
	const [loading, setLoading] = useState(true);
	const [modalVisible, setModalVisible] = useState(false);
	const [editingServer, setEditingServer] = useState(null);
	const [restaurantId, setRestaurantId] = useState(null);

	// Formulaire
	const [formData, setFormData] = useState({
		name: "",
		email: "",
		password: "",
		role: "server",
	});

	// Récupérer le restaurantId au montage
	useEffect(() => {
		const loadRestaurantId = async () => {
			const id = await AsyncStorage.getItem("restaurantId");
			setRestaurantId(id);
		};
		loadRestaurantId();
	}, []);

	// Charger les serveurs
	const fetchServers = useCallback(async () => {
		if (!restaurantId) return;

		setLoading(true);
		try {
			const data = await authFetch(`/servers/${restaurantId}`, {
				method: "GET",
			});
			setServers(Array.isArray(data) ? data : []);
		} catch (error) {
			console.error("❌ Erreur chargement serveurs:", error);
			Alert.alert("Erreur", "Impossible de charger les serveurs");
		} finally {
			setLoading(false);
		}
	}, [authFetch, restaurantId]);

	useEffect(() => {
		if (restaurantId) {
			fetchServers();
		}
	}, [fetchServers, restaurantId]);

	// Ouvrir modal création
	const handleCreate = () => {
		setEditingServer(null);
		setFormData({ name: "", email: "", password: "", role: "server" });
		setModalVisible(true);
	};

	// Ouvrir modal édition
	const handleEdit = (server) => {
		setEditingServer(server);
		setFormData({
			name: server.name || "",
			email: server.email || "",
			password: "", // Ne pas pré-remplir le mot de passe
			role: server.role || "server",
		});
		setModalVisible(true);
	};

	// Supprimer un serveur
	const handleDelete = (server) => {
		Alert.alert(
			"Supprimer le serveur",
			`Êtes-vous sûr de vouloir supprimer ${server.name || server.email} ?`,
			[
				{ text: "Annuler", style: "cancel" },
				{
					text: "Supprimer",
					style: "destructive",
					onPress: async () => {
						try {
							await authFetch(`/servers/${server._id}`, { method: "DELETE" });
							Alert.alert("Succès", "Serveur supprimé");
							fetchServers();
						} catch (error) {
							console.error("❌ Erreur suppression:", error);
							Alert.alert("Erreur", "Impossible de supprimer le serveur");
						}
					},
				},
			]
		);
	};

	// Sauvegarder (créer ou modifier)
	const handleSave = async () => {
		if (!formData.email) {
			Alert.alert("Erreur", "L'email est requis");
			return;
		}

		if (!editingServer && !formData.password) {
			Alert.alert(
				"Erreur",
				"Le mot de passe est requis pour un nouveau serveur"
			);
			return;
		}

		try {
			if (editingServer) {
				// Modification
				const updateData = {
					name: formData.name,
					email: formData.email,
					role: formData.role,
				};
				// Ajouter le mot de passe seulement s'il est fourni
				if (formData.password) {
					updateData.password = formData.password;
				}

				await authFetch(`/servers/${editingServer._id}`, {
					method: "PUT",
					body: JSON.stringify(updateData),
				});
				Alert.alert("Succès", "Serveur modifié");
			} else {
				// Création - inclure restaurantId et générer serverId
				const serverId = `SRV${Date.now().toString().slice(-6)}`;
				await authFetch("/servers", {
					method: "POST",
					body: JSON.stringify({
						name: formData.name,
						email: formData.email,
						password: formData.password,
						restaurantId: restaurantId,
						serverId: serverId,
						role: formData.role,
					}),
				});
				Alert.alert("Succès", "Serveur créé");
			}

			setModalVisible(false);
			fetchServers();
		} catch (error) {
			console.error("❌ Erreur sauvegarde:", error);
			Alert.alert("Erreur", error.message || "Impossible de sauvegarder");
		}
	};

	// Rendu d'un serveur
	const renderServer = ({ item }) => (
		<View
			style={[styles.serverCard, { backgroundColor: theme.cardBackground }]}
		>
			<View style={styles.serverInfo}>
				<View style={styles.serverHeader}>
					<Text style={[styles.serverName, { color: theme.textColor }]}>
						👤 {item.name || "Sans nom"}
					</Text>
					<View
						style={[
							styles.roleBadge,
							item.role === "manager"
								? styles.managerBadge
								: styles.serverBadge,
						]}
					>
						<Text style={styles.roleBadgeText}>
							{item.role === "manager" ? "Manager" : "Serveur"}
						</Text>
					</View>
				</View>
				<Text
					style={[styles.serverEmail, { color: theme.textColor, opacity: 0.7 }]}
				>
					{item.email}
				</Text>
			</View>
			<View style={styles.serverActions}>
				<TouchableOpacity
					style={[styles.actionButton, styles.editButton]}
					onPress={() => handleEdit(item)}
				>
					<Text style={styles.actionButtonText}>✏️</Text>
				</TouchableOpacity>
				<TouchableOpacity
					style={[styles.actionButton, styles.deleteButton]}
					onPress={() => handleDelete(item)}
				>
					<Text style={styles.actionButtonText}>🗑️</Text>
				</TouchableOpacity>
			</View>
		</View>
	);

	if (loading) {
		return (
			<View style={styles.loadingContainer}>
				<ActivityIndicator size="large" color="#007AFF" />
				<Text style={{ color: theme.textColor, marginTop: 10 }}>
					Chargement des serveurs...
				</Text>
			</View>
		);
	}

	return (
		<View style={styles.container}>
			{/* Header */}
			<View style={styles.header}>
				<Text style={[styles.title, { color: theme.textColor }]}>
					👥 Gestion des Serveurs
				</Text>
				<TouchableOpacity style={styles.addButton} onPress={handleCreate}>
					<Text style={styles.addButtonText}>+ Ajouter</Text>
				</TouchableOpacity>
			</View>

			{/* Liste des serveurs */}
			{servers.length === 0 ? (
				<View style={styles.emptyContainer}>
					<Text style={[styles.emptyText, { color: theme.textColor }]}>
						Aucun serveur enregistré
					</Text>
					<Text
						style={[
							styles.emptySubtext,
							{ color: theme.textColor, opacity: 0.6 },
						]}
					>
						{`Cliquez sur "+ Ajouter" pour créer un serveur`}
					</Text>
				</View>
			) : (
				<FlatList
					data={servers}
					keyExtractor={(item) => item._id}
					renderItem={renderServer}
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
							{editingServer ? "✏️ Modifier le serveur" : "➕ Nouveau serveur"}
						</Text>

						<TextInput
							style={[
								styles.input,
								{ color: theme.textColor, borderColor: theme.separatorColor },
							]}
							placeholder="Nom"
							placeholderTextColor={theme.textColor + "80"}
							value={formData.name}
							onChangeText={(text) => setFormData({ ...formData, name: text })}
						/>

						<TextInput
							style={[
								styles.input,
								{ color: theme.textColor, borderColor: theme.separatorColor },
							]}
							placeholder="Email *"
							placeholderTextColor={theme.textColor + "80"}
							value={formData.email}
							onChangeText={(text) => setFormData({ ...formData, email: text })}
							keyboardType="email-address"
							autoCapitalize="none"
						/>

						<TextInput
							style={[
								styles.input,
								{ color: theme.textColor, borderColor: theme.separatorColor },
							]}
							placeholder={
								editingServer
									? "Nouveau mot de passe (optionnel)"
									: "Mot de passe *"
							}
							placeholderTextColor={theme.textColor + "80"}
							value={formData.password}
							onChangeText={(text) =>
								setFormData({ ...formData, password: text })
							}
							secureTextEntry
						/>

						{/* Sélection du rôle */}
						<Text style={[styles.label, { color: theme.textColor }]}>
							Rôle:
						</Text>
						<View style={styles.roleContainer}>
							{roles.map((role) => (
								<TouchableOpacity
									key={role.value}
									style={[
										styles.roleButton,
										formData.role === role.value && styles.roleButtonActive,
										formData.role === role.value &&
											role.value === "manager" &&
											styles.roleButtonManager,
									]}
									onPress={() => setFormData({ ...formData, role: role.value })}
								>
									<Text
										style={[
											styles.roleButtonText,
											formData.role === role.value &&
												styles.roleButtonTextActive,
										]}
									>
										{role.value === "server" ? "👤" : "👔"} {role.label}
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
									{editingServer ? "Modifier" : "Créer"}
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
		marginBottom: 20,
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
	listContainer: {
		paddingBottom: 20,
	},
	serverCard: {
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
	serverInfo: {
		flex: 1,
	},
	serverName: {
		fontSize: 16,
		fontWeight: "600",
		marginBottom: 4,
	},
	serverEmail: {
		fontSize: 14,
	},
	serverActions: {
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
	actionButtonText: {
		fontSize: 18,
	},
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
	// Styles pour le rôle
	serverHeader: {
		flexDirection: "row",
		alignItems: "center",
		gap: 10,
		marginBottom: 4,
	},
	roleBadge: {
		paddingHorizontal: 8,
		paddingVertical: 3,
		borderRadius: 10,
	},
	serverBadge: {
		backgroundColor: "#E3F2FD",
	},
	managerBadge: {
		backgroundColor: "#FFF3E0",
	},
	roleBadgeText: {
		fontSize: 11,
		fontWeight: "600",
		color: "#333",
	},
	label: {
		fontSize: 14,
		fontWeight: "500",
		marginBottom: 8,
	},
	roleContainer: {
		flexDirection: "row",
		gap: 10,
		marginBottom: 20,
	},
	roleButton: {
		flex: 1,
		paddingVertical: 12,
		paddingHorizontal: 15,
		borderRadius: 10,
		backgroundColor: "#E0E0E0",
		alignItems: "center",
	},
	roleButtonActive: {
		backgroundColor: "#2196F3",
	},
	roleButtonManager: {
		backgroundColor: "#FF9800",
	},
	roleButtonText: {
		fontSize: 14,
		fontWeight: "500",
		color: "#666",
	},
	roleButtonTextActive: {
		color: "#fff",
	},
});

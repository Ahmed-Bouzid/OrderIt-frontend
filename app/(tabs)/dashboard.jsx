import React, { useEffect, useState } from "react";
import {
	View,
	Text,
	StyleSheet,
	ScrollView,
	TouchableOpacity,
	Modal,
	TextInput,
	Alert,
} from "react-native";
import { useRouter } from "expo-router";
import useDeveloperStore from "../../src/stores/useDeveloperStore";
import { fetchWithAuth } from "../../utils/tokenManager";
import { getItem as getSecureItem } from "../../utils/secureStorage";

export default function Dashboard() {
	const router = useRouter();
	const { selectedRestaurant } = useDeveloperStore();
	const [restaurantInfo, setRestaurantInfo] = useState(null);
	const [isEditing, setIsEditing] = useState(false);
	const [editValue, setEditValue] = useState("");

	// Ajout de la fonctionnalité de création de tables
	const [isCreatingTable, setIsCreatingTable] = useState(false);
	const [tableName, setTableName] = useState("");
	const [tableQuantity, setTableQuantity] = useState(1);

	useEffect(() => {
		if (selectedRestaurant) {
			setRestaurantInfo({
				id: selectedRestaurant._id,
				name: selectedRestaurant.name,
				description:
					"Un restaurant chaleureux offrant une cuisine authentique et des plats faits maison.", // Descriptif fictif
				createdAt: new Date(selectedRestaurant.createdAt).toLocaleDateString(
					"fr-FR",
				),
				address: selectedRestaurant.address,
				email: selectedRestaurant.email,
				phone: selectedRestaurant.phone,
				status: selectedRestaurant.active ? "Actif" : "Inactif",
				tables: selectedRestaurant.stats?.tables || "Non spécifié",
				servers: selectedRestaurant.stats?.servers || "Non spécifié",
				menuItems: selectedRestaurant.stats?.products || "Non spécifié",
				subscriptionPlan: selectedRestaurant.subscriptionPlan || "Non spécifié",
				memberSince: new Date(selectedRestaurant.createdAt).toLocaleDateString(
					"fr-FR",
				),
				notes:
					"Notes personnelles : Relation de confiance avec le restaurateur.", // Fake data
			});
		}
	}, [selectedRestaurant]);

	const saveEdit = async () => {
		try {
			const response = await fetchWithAuth(
				`/restaurants/${selectedRestaurant._id}`,
				{
					method: "PUT",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ editValue }), // Utilisation directe de editValue
				},
			);

			if (!response.ok) {
				throw new Error("Erreur lors de la mise à jour");
			}

			const updatedRestaurant = await response.json();
			setIsEditing(false);
		} catch (error) {
			console.error("Erreur lors de la mise à jour :", error);
			alert("Une erreur est survenue lors de la mise à jour.");
		}
	};

	// Ajout de la fonction de création de tables
	const createTables = async () => {
		// Validation du nom de la table
		if (!tableName || tableName.trim().length < 2) {
			Alert.alert(
				"Erreur",
				"Le nom de la table doit contenir au moins 2 caractères.",
			);
			return;
		}

		Alert.alert(
			"Créer des tables",
			`Créer ${tableQuantity} table(s) pour ${restaurantInfo.name} ?`,
			[
				{ text: "Annuler", style: "cancel" },
				{
					text: "Créer",
					style: "default",
					onPress: async () => {
						try {
							// Modification pour gérer la création de plusieurs tables
							for (let i = 0; i < tableQuantity; i++) {
								const tableData = {
									restaurantId: restaurantInfo.id,
									number: tableName ? `${tableName}${i + 1}` : `T${i + 1}`,
									capacity: 4, // Capacité par défaut
									status: "available", // Statut par défaut (en minuscules)
								};
								const API_URL = process.env.EXPO_PUBLIC_API_URL;

								// Log du token utilisé (via cache)
								const token = await getSecureItem("access_token");

								const response = await fetchWithAuth(`${API_URL}/tables`, {
									method: "POST",
									headers: { "Content-Type": "application/json" },
									body: JSON.stringify(tableData),
								});

								const responseText = await response.text();

								if (!response.ok) {
									const data = JSON.parse(responseText);
									Alert.alert(
										"❌ Erreur",
										`Erreur lors de la création de la table ${tableData.number}: ${data.message}`,
									);
									return;
								}
							}

							Alert.alert(
								"✅ Succès",
								`${tableQuantity} table(s) créées avec succès.`,
							);
							// Mettre à jour les informations du restaurant
							setRestaurantInfo((prev) => ({
								...prev,
								tables: prev.tables + tableQuantity,
							}));
						} catch (error) {
							console.error("❌ Erreur création tables:", error);
							Alert.alert("Erreur", "Impossible de créer les tables");
						}
					},
				},
			],
		);
	};

	const handleDeleteTables = async () => {
		Alert.alert(
			"⚠️ Supprimer les tables",
			`Supprimer toutes les tables de ${restaurantInfo.name} ?\n\n${restaurantInfo.tables || 0} table(s) seront supprimée(s).`,
			[
				{ text: "Annuler", style: "cancel" },
				{
					text: "Supprimer",
					style: "destructive",
					onPress: async () => {
						try {
							const API_URL = process.env.EXPO_PUBLIC_API_URL;
							const response = await fetchWithAuth(
								`${API_URL}/developer/restaurants/${restaurantInfo.id}/tables`,
								{ method: "DELETE" },
							);

							const data = await response.json();

							if (response.ok) {
								Alert.alert("✅ Succès", data.message);
								// Mettre à jour les informations du restaurant
								setRestaurantInfo((prev) => ({
									...prev,
									tables: 0, // Toutes les tables ont été supprimées
								}));
							} else {
								Alert.alert("❌ Erreur", data.message);
							}
						} catch (error) {
							console.error("❌ Erreur suppression tables:", error);
							Alert.alert("Erreur", "Impossible de supprimer les tables");
						}
					},
				},
			],
		);
	};

	if (!restaurantInfo) {
		return (
			<View style={styles.container}>
				<Text style={styles.text}>Aucun restaurant sélectionné</Text>
			</View>
		);
	}

	return (
		<ScrollView contentContainerStyle={styles.container}>
			<TouchableOpacity
				style={styles.backButton}
				onPress={() => router.replace("/developer-selector")}
			>
				<Text style={styles.backButtonText}>← Retour</Text>
			</TouchableOpacity>
			<Text style={styles.title}>Informations du Restaurant</Text>
			<View style={styles.cardContainer}>
				<View style={styles.card}>
					<Text style={styles.cardTitle}>{restaurantInfo.name}</Text>
					<Text style={styles.cardDescription}>
						{restaurantInfo.description}
					</Text>
				</View>
				<View style={styles.card}>
					<Text style={styles.cardTitle}>Détails</Text>
					<Text style={styles.infoLabel}>Adresse :</Text>
					<Text style={styles.infoValue}>{restaurantInfo.address}</Text>
					<Text style={styles.infoLabel}>Email :</Text>
					<Text style={styles.infoValue}>{restaurantInfo.email}</Text>
					<Text style={styles.infoLabel}>Téléphone :</Text>
					<Text style={styles.infoValue}>{restaurantInfo.phone}</Text>
					<Text style={styles.infoLabel}>Abonnement :</Text>
					<Text style={styles.infoValue}>
						{restaurantInfo.subscriptionPlan}
					</Text>
					<Text style={styles.infoLabel}>Membre depuis :</Text>
					<Text style={styles.infoValue}>{restaurantInfo.memberSince}</Text>
				</View>
				<View style={styles.card}>
					<Text style={styles.cardTitle}>Statistiques</Text>
					<Text style={styles.infoLabel}>Tables :</Text>
					<Text style={styles.infoValue}>{restaurantInfo.tables}</Text>
					<Text style={styles.infoLabel}>Employés :</Text>
					<Text style={styles.infoValue}>{restaurantInfo.servers}</Text>
					<Text style={styles.infoLabel}>Produits :</Text>
					<Text style={styles.infoValue}>{restaurantInfo.menuItems}</Text>
				</View>
				<View style={styles.card}>
					<Text style={styles.cardTitle}>Notes personnelles</Text>
					<Text style={styles.infoValue}>{restaurantInfo.notes}</Text>
				</View>
			</View>

			{isEditing && (
				<Modal
					transparent={true}
					animationType="slide"
					visible={isEditing}
					onRequestClose={() => setIsEditing(false)}
				>
					<View style={styles.modalContainer}>
						<View style={styles.modalContent}>
							<Text style={styles.modalTitle}>Modifier</Text>
							<TextInput
								style={styles.input}
								value={editValue}
								onChangeText={setEditValue}
							/>
							<TouchableOpacity style={styles.saveButton} onPress={saveEdit}>
								<Text style={styles.saveButtonText}>Enregistrer</Text>
							</TouchableOpacity>
							<TouchableOpacity
								style={styles.cancelButton}
								onPress={() => setIsEditing(false)}
							>
								<Text style={styles.cancelButtonText}>Annuler</Text>
							</TouchableOpacity>
						</View>
					</View>
				</Modal>
			)}

			<TouchableOpacity
				style={styles.createButton}
				onPress={() => setIsCreatingTable(true)}
			>
				<Text style={styles.createButtonText}>Créer des tables</Text>
			</TouchableOpacity>

			{isCreatingTable && (
				<Modal
					transparent={true}
					animationType="slide"
					visible={isCreatingTable}
					onRequestClose={() => setIsCreatingTable(false)}
				>
					<View style={styles.modalContainer}>
						<View style={styles.modalContent}>
							<Text style={styles.modalTitle}>Créer des tables</Text>
							<TextInput
								style={styles.input}
								placeholder="Nom de la table (optionnel)"
								placeholderTextColor="#999" // Placeholder plus foncé pour être visible
								value={tableName}
								onChangeText={setTableName}
							/>
							<TextInput
								style={styles.input}
								placeholder="Quantité"
								placeholderTextColor="#999" // Placeholder plus foncé pour être visible
								keyboardType="numeric"
								value={String(tableQuantity)}
								onChangeText={(text) => setTableQuantity(Number(text))}
							/>
							<TouchableOpacity
								style={styles.saveButton}
								onPress={createTables}
							>
								<Text style={styles.saveButtonText}>Créer</Text>
							</TouchableOpacity>
							<TouchableOpacity
								style={styles.cancelButton}
								onPress={() => setIsCreatingTable(false)}
							>
								<Text style={styles.cancelButtonText}>Annuler</Text>
							</TouchableOpacity>
						</View>
					</View>
				</Modal>
			)}

			<TouchableOpacity
				style={styles.deleteButton}
				onPress={handleDeleteTables}
			>
				<Text style={styles.deleteButtonText}>Supprimer toutes les tables</Text>
			</TouchableOpacity>
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	container: {
		flexGrow: 1,
		backgroundColor: "#f9f9f9",
		padding: 20,
	},
	backButton: {
		marginBottom: 20,
		padding: 10,
		backgroundColor: "#007BFF",
		borderRadius: 5,
		alignSelf: "flex-start",
	},
	backButtonText: {
		color: "#fff",
		fontSize: 16,
		fontWeight: "bold",
	},
	title: {
		fontSize: 28,
		fontWeight: "bold",
		color: "#333",
		textAlign: "center",
		marginBottom: 20,
	},
	cardContainer: {
		flexDirection: "row",
		flexWrap: "wrap",
		justifyContent: "space-between",
	},
	card: {
		backgroundColor: "#ffffff", // Fond blanc pour un design sobre
		borderRadius: 10,
		padding: 15,
		marginBottom: 15,
		width: "48%", // Taille carte bleue
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
		elevation: 3,
		borderWidth: 1,
		borderColor: "#e0e0e0", // Bordure grise claire
	},
	cardTitle: {
		fontSize: 18,
		fontWeight: "bold",
		color: "#333", // Texte sombre pour un bon contraste
		marginBottom: 10,
	},
	cardDescription: {
		fontSize: 14,
		color: "#555", // Texte gris pour un look professionnel
	},
	infoLabel: {
		fontSize: 14,
		fontWeight: "600",
		color: "#666", // Couleur légèrement plus claire pour les étiquettes
	},
	infoValue: {
		fontSize: 14,
		color: "#333", // Texte principal sombre
		marginTop: 5,
	},
	modalContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		backgroundColor: "rgba(0, 0, 0, 0.5)",
	},
	modalContent: {
		backgroundColor: "#fff",
		padding: 20,
		borderRadius: 10,
		width: "90%", // Réduction de la largeur de la popup
		maxWidth: 400, // Limite maximale pour les grands écrans
		alignItems: "center",
	},
	modalTitle: {
		fontSize: 20,
		fontWeight: "bold",
		marginBottom: 10,
	},
	input: {
		borderWidth: 1,
		borderColor: "#ccc",
		borderRadius: 5,
		padding: 10,
		width: "100%",
		marginBottom: 15,
		color: "#333", // Texte principal sombre
	},
	editButton: {
		backgroundColor: "#FFA500",
		paddingVertical: 8,
		paddingHorizontal: 12,
		borderRadius: 5,
		marginTop: 10,
		alignSelf: "flex-start",
	},
	editButtonText: {
		color: "#fff",
		fontSize: 14,
		fontWeight: "bold",
	},
	saveButton: {
		backgroundColor: "#28a745",
		paddingVertical: 10,
		paddingHorizontal: 20,
		borderRadius: 5,
		marginTop: 10,
	},
	saveButtonText: {
		color: "#fff",
		fontSize: 16,
		fontWeight: "bold",
	},
	cancelButton: {
		backgroundColor: "#dc3545",
		paddingVertical: 10,
		paddingHorizontal: 20,
		borderRadius: 5,
		marginTop: 10,
	},
	cancelButtonText: {
		color: "#fff",
		fontSize: 16,
		fontWeight: "bold",
	},
	createButton: {
		backgroundColor: "#28a745",
		paddingVertical: 10,
		paddingHorizontal: 20,
		borderRadius: 5,
		marginTop: 20,
		alignSelf: "center",
	},
	createButtonText: {
		color: "#fff",
		fontSize: 16,
		fontWeight: "bold",
	},
	deleteButton: {
		backgroundColor: "#dc3545",
		paddingVertical: 10,
		paddingHorizontal: 20,
		borderRadius: 5,
		marginTop: 20,
		alignSelf: "center",
	},
	deleteButtonText: {
		color: "#fff",
		fontSize: 16,
		fontWeight: "bold",
	},
});

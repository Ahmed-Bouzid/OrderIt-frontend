import React, { useState, useEffect } from "react";
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	ScrollView,
	ActivityIndicator,
	Alert,
	Platform,
	TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useTheme } from "../../hooks/useTheme";
import useDeveloperStore from "../../src/stores/useDeveloperStore";
import { Picker } from "@react-native-picker/picker";
import { getValidToken } from "../../utils/tokenManager";

export default function DeveloperMenuImport() {
	const router = useRouter();
	const { colors, isDarkMode } = useTheme();
	const { isDeveloper, restaurants } = useDeveloperStore();

	const [selectedRestaurant, setSelectedRestaurant] = useState(null);
	const [jsonInput, setJsonInput] = useState("");
	const [menuJson, setMenuJson] = useState(null);
	const [isImporting, setIsImporting] = useState(false);

	useEffect(() => {
		// Vérifier l'accès développeur
		if (!isDeveloper) {
			Alert.alert(
				"Accès refusé",
				"Cette fonctionnalité est réservée aux développeurs."
			);
			router.replace("/dashboard");
		}
	}, [isDeveloper, router]);

	// Valider et parser le JSON
	const validateAndParseJson = () => {
		if (!jsonInput.trim()) {
			Alert.alert("JSON vide", "Veuillez coller votre JSON de menu.");
			return;
		}

		try {
			// Nettoyer l'input (enlever BOM, quotes bizarres, etc.)
			const cleanedInput = jsonInput
				.trim()
				.replace(/^\uFEFF/, "") // BOM
				.replace(/['']/g, "'") // Normaliser apostrophes
				.replace(/[""]/g, '"'); // Normaliser guillemets

			const parsed = JSON.parse(cleanedInput);

			// Validation basique de la structure
			if (!Array.isArray(parsed)) {
				throw new Error("Le JSON doit être un tableau de catégories.");
			}

			// Vérifier que chaque catégorie a le bon format
			for (const category of parsed) {
				if (!category.category || !Array.isArray(category.items)) {
					throw new Error(
						"Chaque catégorie doit avoir un 'category' (string) et 'items' (array)."
					);
				}

				// Vérifier chaque item
				for (const item of category.items) {
					if (!item.name || typeof item.price !== "number") {
						throw new Error(
							"Chaque item doit avoir 'name' (string) et 'price' (number)."
						);
					}
				}
			}

			setMenuJson(parsed);

			const totalItems = parsed.reduce((sum, cat) => sum + cat.items.length, 0);

			Alert.alert(
				"✅ JSON valide",
				`${totalItems} items trouvés dans ${parsed.length} catégories.`
			);
		} catch (error) {
			console.error("❌ Erreur validation JSON:", error);

			// Message d'erreur plus clair
			let errorMessage = "Votre JSON contient des erreurs.\n\n";

			if (error.message.includes("Unexpected")) {
				errorMessage += "Vérifiez que :\n";
				errorMessage +=
					"• Les guillemets sont bien doubles (\") et non simples (')\n";
				errorMessage += "• Il n'y a pas de virgule en trop\n";
				errorMessage +=
					"• Toutes les accolades {} et crochets [] sont fermés\n\n";
			}

			errorMessage += `Détails : ${error.message}`;

			Alert.alert("JSON invalide", errorMessage);
		}
	};

	// Import du menu en base
	const importMenu = async () => {
		if (!selectedRestaurant) {
			Alert.alert("Aucun restaurant", "Veuillez sélectionner un restaurant.");
			return;
		}

		if (!menuJson || menuJson.length === 0) {
			Alert.alert("Aucun menu", "Veuillez d'abord valider le JSON du menu.");
			return;
		}

		Alert.alert(
			"Confirmation",
			`Importer ce menu pour ${selectedRestaurant.name} ?\n\nCela archivera l'ancien menu et le remplacera.`,
			[
				{ text: "Annuler", style: "cancel" },
				{
					text: "Importer",
					style: "destructive",
					onPress: async () => {
						setIsImporting(true);

						try {
							const API_URL = process.env.EXPO_PUBLIC_API_URL;
							const token = await getValidToken();

							const response = await fetch(`${API_URL}/developer/import-menu`, {
								method: "POST",
								headers: {
									"Content-Type": "application/json",
									Authorization: `Bearer ${token}`,
								},
								body: JSON.stringify({
									restaurant_id: selectedRestaurant._id,
									menu: menuJson,
								}),
							});

							const data = await response.json();

							if (response.ok && data.status === "success") {
								Alert.alert(
									"✅ Succès",
									`Menu importé avec succès pour ${data.restaurant_name}.\n\n${data.items_imported} produits importés.\n${data.items_archived} produits archivés.\n${data.categories_created || 0} catégories créées.`
								);

								// Reset
								setJsonInput("");
								setMenuJson(null);
								setSelectedRestaurant(null);
							} else {
								Alert.alert(
									"Erreur",
									data.message || "Erreur lors de l'import."
								);
							}
						} catch (error) {
							console.error("❌ Erreur import:", error);
							Alert.alert("Erreur", "Impossible d'importer le menu.");
						} finally {
							setIsImporting(false);
						}
					},
				},
			]
		);
	};

	const styles = StyleSheet.create({
		container: {
			flex: 1,
			backgroundColor: colors.background,
		},
		header: {
			padding: 20,
			paddingTop: Platform.OS === "ios" ? 60 : 40,
		},
		backButton: {
			flexDirection: "row",
			alignItems: "center",
			marginBottom: 20,
		},
		backText: {
			color: colors.text,
			fontSize: 16,
			marginLeft: 8,
		},
		title: {
			fontSize: 28,
			fontWeight: "bold",
			color: colors.text,
			marginBottom: 8,
		},
		subtitle: {
			fontSize: 14,
			color: colors.textSecondary,
		},
		content: {
			flex: 1,
			padding: 20,
		},
		card: {
			backgroundColor: isDarkMode
				? "rgba(255,255,255,0.05)"
				: "rgba(255,255,255,0.9)",
			borderRadius: 16,
			padding: 20,
			marginBottom: 16,
			borderWidth: 1,
			borderColor: isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
		},
		sectionTitle: {
			fontSize: 18,
			fontWeight: "600",
			color: colors.text,
			marginBottom: 12,
		},
		pickerContainer: {
			backgroundColor: isDarkMode ? "rgba(255,255,255,0.05)" : "#cbd5e1",
			borderRadius: 12,
			overflow: "hidden",
			marginBottom: 16,
		},
		picker: {
			color: isDarkMode ? colors.text : "#0f172a",
		},
		textInput: {
			backgroundColor: isDarkMode ? "rgba(255,255,255,0.05)" : "#fff",
			borderRadius: 12,
			padding: 16,
			color: isDarkMode ? colors.text : "#0f172a",
			fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
			fontSize: 12,
			height: 300,
			textAlignVertical: "top",
			borderWidth: 1,
			borderColor: isDarkMode ? "rgba(255,255,255,0.1)" : "#cbd5e1",
		},
		button: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "center",
			padding: 16,
			borderRadius: 12,
		},
		buttonPrimary: {
			backgroundColor: "#0ea5e9",
		},
		buttonSuccess: {
			backgroundColor: "#10b981",
		},
		buttonText: {
			color: "#fff",
			fontSize: 14,
			fontWeight: "600",
			marginLeft: 8,
		},
		doubleView: {
			flexDirection: "row",
			height: 400,
		},
		panel: {
			flex: 1,
			marginHorizontal: 4,
			backgroundColor: isDarkMode ? "rgba(255,255,255,0.05)" : "#f1f5f9",
			borderRadius: 12,
			padding: 12,
			borderWidth: 1,
			borderColor: isDarkMode ? "rgba(255,255,255,0.1)" : "#cbd5e1",
		},
		panelTitle: {
			fontSize: 14,
			fontWeight: "600",
			color: isDarkMode ? colors.textSecondary : "#1e293b",
			marginBottom: 8,
		},
		jsonText: {
			fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
			fontSize: 12,
			color: isDarkMode ? colors.text : "#0f172a",
		},
		previewItem: {
			flexDirection: "row",
			justifyContent: "space-between",
			padding: 12,
			marginBottom: 8,
			backgroundColor: isDarkMode ? "rgba(255,255,255,0.05)" : "#fff",
			borderRadius: 8,
		},
		itemName: {
			fontSize: 14,
			fontWeight: "600",
			color: colors.text,
			flex: 1,
		},
		itemPrice: {
			fontSize: 14,
			fontWeight: "bold",
			color: "#0ea5e9",
		},
		itemDescription: {
			fontSize: 12,
			color: colors.textSecondary,
			marginTop: 4,
		},
		categoryTitle: {
			fontSize: 16,
			fontWeight: "bold",
			color: colors.text,
			marginTop: 12,
			marginBottom: 8,
		},
	});

	return (
		<LinearGradient
			colors={
				isDarkMode
					? ["#0f172a", "#1e293b", "#334155"]
					: ["#e0f2fe", "#bae6fd", "#7dd3fc"]
			}
			style={styles.container}
		>
			<View style={styles.header}>
				<TouchableOpacity
					style={styles.backButton}
					onPress={() => router.back()}
				>
					<Ionicons name="arrow-back" size={24} color={colors.text} />
					<Text style={styles.backText}>Retour</Text>
				</TouchableOpacity>
				<Text style={styles.title}>📋 Import Menu JSON</Text>
				<Text style={styles.subtitle}>
					Collez votre JSON de menu et importez-le automatiquement dans un
					restaurant
				</Text>
			</View>

			<ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
				{/* Sélection du restaurant */}
				<View style={styles.card}>
					<Text style={styles.sectionTitle}>🏪 Restaurant cible</Text>
					<View style={styles.pickerContainer}>
						<Picker
							selectedValue={selectedRestaurant?._id}
							onValueChange={(value) => {
								const resto = restaurants.find((r) => r._id === value);
								setSelectedRestaurant(resto);
							}}
							style={styles.picker}
						>
							<Picker.Item label="Sélectionnez un restaurant..." value={null} />
							{restaurants.map((resto) => (
								<Picker.Item
									key={resto._id}
									label={resto.name}
									value={resto._id}
								/>
							))}
						</Picker>
					</View>
				</View>

				{/* Input JSON */}
				<View style={styles.card}>
					<Text style={styles.sectionTitle}>📝 JSON du menu</Text>
					<TextInput
						style={styles.textInput}
						multiline
						placeholder='[{"category": "Les Entrées", "items": [{"name": "...", "price": 12, "description": "..."}]}]'
						placeholderTextColor={colors.textSecondary}
						value={jsonInput}
						onChangeText={setJsonInput}
					/>
					<TouchableOpacity
						style={[styles.button, styles.buttonPrimary, { marginTop: 16 }]}
						onPress={validateAndParseJson}
					>
						<Ionicons name="checkmark-circle" size={20} color="#fff" />
						<Text style={styles.buttonText}>Valider JSON</Text>
					</TouchableOpacity>
				</View>

				{/* Double vue JSON + Preview */}
				{menuJson && (
					<View style={styles.card}>
						<Text style={styles.sectionTitle}>📋 Résultat</Text>
						<View style={styles.doubleView}>
							{/* Panel JSON */}
							<ScrollView style={styles.panel}>
								<Text style={styles.panelTitle}>JSON</Text>
								<Text style={styles.jsonText}>
									{JSON.stringify(menuJson, null, 2)}
								</Text>
							</ScrollView>

							{/* Panel Preview */}
							<ScrollView style={styles.panel}>
								<Text style={styles.panelTitle}>Aperçu</Text>
								{menuJson.map((category, idx) => (
									<View key={idx}>
										<Text style={styles.categoryTitle}>
											{category.category}
										</Text>
										{category.items.map((item, itemIdx) => (
											<View key={itemIdx} style={styles.previewItem}>
												<View style={{ flex: 1 }}>
													<Text style={styles.itemName}>{item.name}</Text>
													{item.description && (
														<Text style={styles.itemDescription}>
															{item.description}
														</Text>
													)}
												</View>
												<Text style={styles.itemPrice}>
													{item.price.toFixed(2)}€
												</Text>
											</View>
										))}
									</View>
								))}
							</ScrollView>
						</View>

						{/* Bouton d'import */}
						<TouchableOpacity
							style={[styles.button, styles.buttonSuccess, { marginTop: 16 }]}
							onPress={importMenu}
							disabled={isImporting || !selectedRestaurant}
						>
							{isImporting ? (
								<ActivityIndicator color="#fff" />
							) : (
								<>
									<Ionicons name="cloud-upload" size={20} color="#fff" />
									<Text style={styles.buttonText}>
										Importer dans le restaurant
									</Text>
								</>
							)}
						</TouchableOpacity>
					</View>
				)}
			</ScrollView>
		</LinearGradient>
	);
}

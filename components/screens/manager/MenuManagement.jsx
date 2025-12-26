import React, { useState, useEffect, useRef } from "react";
import {
	View,
	Text,
	TouchableOpacity,
	TextInput,
	FlatList,
	Animated,
	Alert,
	ActivityIndicator,
	StyleSheet,
	Modal,
	Switch,
	Image,
	ScrollView,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useAuthFetch } from "../../../hooks/useAuthFetch";
import useThemeStore from "../../../src/stores/useThemeStore";

export default function MenuManagement() {
	const { theme, isDarkMode } = useThemeStore();
	const authFetch = useAuthFetch();

	const [products, setProducts] = useState([]);
	const [loading, setLoading] = useState(true);

	// Catégories disponibles (à adapter selon votre menu)
	const categories = ["Entrée", "Plat", "Dessert", "Boisssson", "Autre"];

	// Fonction pour charger les produits depuis l'API
	const fetchProducts = React.useCallback(async () => {
		setLoading(true);
		try {
			const res = await authFetch("/products", { method: "GET" });
			const data = await res.json();
			setProducts(Array.isArray(data) ? data : []);
		} catch (error) {
			console.error("❌ Erreur chargement produits:", error);
			setProducts([]);
		} finally {
			setLoading(false);
		}
	}, [authFetch]);

	// Charger les produits au montage
	useEffect(() => {
		fetchProducts();
	}, [fetchProducts]);
	const [modalVisible, setModalVisible] = useState(false);
	const [editingProduct, setEditingProduct] = useState(null);
	// Handler pour éditer un produit (ouvre la modale et remplit le formulaire)
	const handleEdit = (product) => {
		setEditingProduct(product);
		setFormData({
			name: product.name || "",
			price: product.price?.toString() || "",
			category: product.category || "",
			description: product.description || "",
			available: product.available !== false,
			image: product.image || "",
		});
		setModalVisible(true);
	};

	// Handler pour toggle la disponibilité
	const handleToggleAvailability = async (product) => {
		try {
			await authFetch(`/products/${product._id}`, {
				method: "PUT",
				body: JSON.stringify({
					available: !product.available,
				}),
			});
			fetchProducts();
		} catch (error) {
			console.error("❌ Erreur toggle disponibilité:", error);
			Alert.alert("Erreur", "Impossible de modifier la disponibilité");
		}
	};

	// Handler pour choisir une image
	const handlePickImage = async () => {
		const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
		if (status !== "granted") {
			Alert.alert(
				"Permission requise",
				"Nous avons besoin d'accéder à vos photos pour ajouter une image."
			);
			return;
		}
		const result = await ImagePicker.launchImageLibraryAsync({
			mediaTypes: ImagePicker.MediaTypeOptions.Images,
			allowsEditing: true,
			aspect: [4, 3],
			quality: 0.8,
			base64: true,
		});
		if (!result.canceled && result.assets[0]) {
			const asset = result.assets[0];
			const base64Image = `data:image/jpeg;base64,${asset.base64}`;
			setFormData({ ...formData, image: base64Image });
		}
	};

	// Handler pour supprimer l'image
	const handleRemoveImage = () => {
		Alert.alert(
			"Supprimer l'image",
			"Voulez-vous vraiment supprimer cette image ?",
			[
				{ text: "Annuler", style: "cancel" },
				{
					text: "Supprimer",
					style: "destructive",
					onPress: () => setFormData({ ...formData, image: "" }),
				},
			]
		);
	};
	const [searchQuery, setSearchQuery] = useState("");

	// Formulaire
	const [formData, setFormData] = useState({
		name: "",
		price: "",
		category: "",
		description: "",
		available: true,
		image: "",
	});

	// Composant carte produit animé (doit être défini en dehors du state !)
	function ProductCard({ item, index }) {
		const anim = useRef(new Animated.Value(0)).current;
		useEffect(() => {
			Animated.timing(anim, {
				toValue: 1,
				duration: 500,
				delay: 80 * index,
				useNativeDriver: true,
			}).start();
		}, [anim, index]);
		const { theme } = useThemeStore();
		return (
			<Animated.View
				style={[
					styles.glassProductCard,
					{
						opacity: anim,
						transform: [
							{
								translateY: anim.interpolate({
									inputRange: [0, 1],
									outputRange: [30, 0],
								}),
							},
						],
						backgroundColor: !item.available
							? "rgba(200,200,200,0.18)"
							: "rgba(255,255,255,0.22)",
					},
				]}
			>
				<TouchableOpacity
					style={styles.productInfo}
					onPress={() => handleEdit(item)}
				>
					<View style={styles.productHeader}>
						<Text style={[styles.productName, { color: theme.textColor }]}>
							{item.name}
						</Text>
						<Text style={[styles.productPrice, { color: "#4CAF50" }]}>
							{item.price?.toFixed(2)}€
						</Text>
					</View>
					<Text
						style={[
							styles.productCategory,
							{ color: theme.textColor, opacity: 0.6 },
						]}
					>
						{item.category || "Sans catégorie"}
					</Text>
					{item.description && (
						<Text
							style={[
								styles.productDescription,
								{ color: theme.textColor, opacity: 0.5 },
							]}
							numberOfLines={1}
						>
							{item.description}
						</Text>
					)}
				</TouchableOpacity>
				<View style={styles.productActions}>
					<Switch
						value={item.available !== false}
						onValueChange={() => handleToggleAvailability(item)}
						trackColor={{ false: "#767577", true: "#81c784" }}
						thumbColor={item.available !== false ? "#4caf50" : "#f44336"}
					/>
					<Text style={[styles.availabilityText, { color: theme.textColor }]}>
						{item.available !== false ? "Dispo" : "Indispo"}
					</Text>
				</View>
			</Animated.View>
		);
	}
	// Filtrer les produits
	const filteredProducts = products.filter(
		(p) =>
			p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
			p.category?.toLowerCase().includes(searchQuery.toLowerCase())
	);

	// Sauvegarder les modifications
	const handleSave = async () => {
		if (!formData.name || !formData.price) {
			Alert.alert("Erreur", "Le nom et le prix sont requis");
			return;
		}

		const price = parseFloat(formData.price);
		if (isNaN(price) || price < 0) {
			Alert.alert("Erreur", "Le prix doit être un nombre valide");
			return;
		}

		try {
			await authFetch(`/products/${editingProduct._id}`, {
				method: "PUT",
				body: JSON.stringify({
					name: formData.name,
					price: price,
					category: formData.category,
					description: formData.description,
					available: formData.available,
					image: formData.image,
				}),
			});

			Alert.alert("Succès", "Produit modifié");
			setModalVisible(false);
			fetchProducts();
		} catch (error) {
			console.error("❌ Erreur sauvegarde:", error);
			Alert.alert("Erreur", error.message || "Impossible de sauvegarder");
		}
	};

	if (loading) {
		return (
			<View style={styles.loadingContainer}>
				<ActivityIndicator size="large" color="#007AFF" />
				<Text style={{ color: theme.textColor, marginTop: 10 }}>
					Chargement du menu...
				</Text>
			</View>
		);
	}

	return (
		<View style={styles.container}>
			{/* Header */}
			<View style={styles.header}>
				<Text style={[styles.title, { color: theme.textColor }]}>
					🍽️ Gestion du Menu
				</Text>
				<Text
					style={[styles.subtitle, { color: theme.textColor, opacity: 0.6 }]}
				>
					{products.length} produit{products.length > 1 ? "s" : ""}
				</Text>
			</View>

			{/* Barre de recherche */}
			<TextInput
				style={[
					styles.searchInput,
					{ color: theme.textColor, borderColor: theme.separatorColor },
				]}
				placeholder="🔍 Rechercher un produit..."
				placeholderTextColor={theme.textColor + "60"}
				value={searchQuery}
				onChangeText={setSearchQuery}
			/>

			{/* Liste des produits */}
			{filteredProducts.length === 0 ? (
				<View style={styles.emptyContainer}>
					<Text style={[styles.emptyText, { color: theme.textColor }]}>
						{searchQuery
							? "Aucun produit trouvé"
							: "Aucun produit dans le menu"}
					</Text>
				</View>
			) : (
				<FlatList
					data={filteredProducts}
					keyExtractor={(item) => item._id}
					renderItem={({ item, index }) => (
						<ProductCard
							item={item}
							index={index}
							theme={theme}
							handleEdit={handleEdit}
							handleToggleAvailability={handleToggleAvailability}
						/>
					)}
					contentContainerStyle={styles.listContainer}
				/>
			)}

			{/* Modal édition */}
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
							✏️ Modifier le produit
						</Text>

						<ScrollView showsVerticalScrollIndicator={false}>
							{/* Section Image */}
							<View style={styles.imageSection}>
								<Text style={[styles.label, { color: theme.textColor }]}>
									Photo du produit:
								</Text>
								{formData.image ? (
									<View style={styles.imagePreviewContainer}>
										<Image
											source={{ uri: formData.image }}
											style={styles.imagePreview}
											resizeMode="cover"
										/>
										<View style={styles.imageActions}>
											<TouchableOpacity
												style={styles.imageActionButton}
												onPress={handlePickImage}
											>
												<Text style={styles.imageActionText}>📷 Changer</Text>
											</TouchableOpacity>
											<TouchableOpacity
												style={[
													styles.imageActionButton,
													styles.removeImageButton,
												]}
												onPress={handleRemoveImage}
											>
												<Text style={styles.removeImageText}>🗑️ Supprimer</Text>
											</TouchableOpacity>
										</View>
									</View>
								) : (
									<TouchableOpacity
										style={[
											styles.addImageButton,
											{ borderColor: theme.separatorColor },
										]}
										onPress={handlePickImage}
									>
										<Text style={styles.addImageIcon}>📷</Text>
										<Text
											style={[styles.addImageText, { color: theme.textColor }]}
										>
											Ajouter une photo
										</Text>
									</TouchableOpacity>
								)}
							</View>

							<TextInput
								style={[
									styles.input,
									{ color: theme.textColor, borderColor: theme.separatorColor },
								]}
								placeholder="Nom du produit *"
								placeholderTextColor={theme.textColor + "80"}
								value={formData.name}
								onChangeText={(text) =>
									setFormData({ ...formData, name: text })
								}
							/>

							<TextInput
								style={[
									styles.input,
									{ color: theme.textColor, borderColor: theme.separatorColor },
								]}
								placeholder="Prix *"
								placeholderTextColor={theme.textColor + "80"}
								value={formData.price}
								onChangeText={(text) =>
									setFormData({ ...formData, price: text })
								}
								keyboardType="decimal-pad"
							/>

							{/* Sélection catégorie */}
							<Text style={[styles.label, { color: theme.textColor }]}>
								Catégorie:
							</Text>
							<View style={styles.categoryContainer}>
								{categories.map((cat) => (
									<TouchableOpacity
										key={cat}
										style={[
											styles.categoryButton,
											formData.category === cat && styles.categoryButtonActive,
										]}
										onPress={() => setFormData({ ...formData, category: cat })}
									>
										<Text
											style={[
												styles.categoryButtonText,
												formData.category === cat &&
													styles.categoryButtonTextActive,
											]}
										>
											{cat}
										</Text>
									</TouchableOpacity>
								))}
							</View>

							<TextInput
								style={[
									styles.input,
									styles.textArea,
									{ color: theme.textColor, borderColor: theme.separatorColor },
								]}
								placeholder="Description"
								placeholderTextColor={theme.textColor + "80"}
								value={formData.description}
								onChangeText={(text) =>
									setFormData({ ...formData, description: text })
								}
								multiline
								numberOfLines={3}
							/>

							{/* Toggle disponibilité */}
							<View style={styles.switchRow}>
								<Text style={[styles.label, { color: theme.textColor }]}>
									Disponible:
								</Text>
								<Switch
									value={formData.available}
									onValueChange={(value) =>
										setFormData({ ...formData, available: value })
									}
									trackColor={{ false: "#767577", true: "#81c784" }}
									thumbColor={formData.available ? "#4caf50" : "#f44336"}
								/>
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
									<Text style={styles.saveButtonText}>Enregistrer</Text>
								</TouchableOpacity>
							</View>
						</ScrollView>
					</View>
				</View>
			</Modal>
		</View>
	);
}

const styles = StyleSheet.create({
	// --- GLASSMORPHISM PRODUCT CARD ---
	glassProductCard: {
		marginVertical: 8,
		borderRadius: 22,
		borderWidth: 2,
		borderColor: "#00eaff",
		backgroundColor: "rgba(255,255,255,0.22)",
		shadowColor: "#00eaff",
		shadowOffset: { width: 0, height: 8 },
		shadowOpacity: 0.18,
		shadowRadius: 24,
		elevation: 8,
		padding: 18,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		minHeight: 90,
		// backdropFilter: "blur(8px)", // web only
		borderBottomWidth: 4,
		borderBottomColor: "#a259ff",
		position: "relative",
		overflow: "hidden",
	},
	// --- GLASSMORPHISM BAR ---
	glassBarContainer: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 18,
		paddingHorizontal: 6,
		paddingVertical: 8,
		backgroundColor: "rgba(255,255,255,0.18)",
		borderRadius: 22,
		borderWidth: 1.5,
		borderColor: "rgba(255,255,255,0.25)",
		shadowColor: "#00eaff",
		shadowOffset: { width: 0, height: 8 },
		shadowOpacity: 0.18,
		shadowRadius: 24,
		// backdropFilter: "blur(12px)", // web only, mais pour cohérence design
		elevation: 8,
	},
	glassButton: {
		flexDirection: "column",
		alignItems: "center",
		justifyContent: "center",
		marginHorizontal: 6,
		paddingVertical: 12,
		paddingHorizontal: 18,
		borderRadius: 16,
		borderWidth: 2.5,
		backgroundColor: "rgba(255,255,255,0.22)",
		shadowColor: "#00eaff",
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.18,
		shadowRadius: 12,
		elevation: 6,
		minWidth: 70,
		minHeight: 70,
		marginBottom: 2,
	},
	glassButtonActive: {
		backgroundColor: "rgba(0,234,255,0.18)",
		borderColor: "#00eaff",
		shadowColor: "#00eaff",
		shadowOpacity: 0.35,
		shadowRadius: 18,
		elevation: 10,
	},
	glassIcon: {
		fontSize: 28,
		marginBottom: 2,
		textShadowColor: "#00eaff",
		textShadowOffset: { width: 0, height: 0 },
		textShadowRadius: 8,
	},
	glassLabel: {
		fontSize: 14,
		fontWeight: "600",
		color: "#222",
		letterSpacing: 0.5,
		textShadowColor: "#fff",
		textShadowOffset: { width: 0, height: 0 },
		textShadowRadius: 2,
	},
	container: {
		flex: 1,
	},
	loadingContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
	},
	header: {
		marginBottom: 15,
	},
	title: {
		fontSize: 20,
		fontWeight: "bold",
	},
	subtitle: {
		fontSize: 14,
		marginTop: 4,
	},
	searchInput: {
		borderWidth: 1,
		borderRadius: 10,
		padding: 12,
		marginBottom: 15,
		fontSize: 16,
	},
	listContainer: {
		paddingBottom: 20,
	},
	productCard: {
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
	productUnavailable: {
		opacity: 0.6,
	},
	productInfo: {
		flex: 1,
		marginRight: 10,
	},
	productHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
	},
	productName: {
		fontSize: 16,
		fontWeight: "600",
		flex: 1,
	},
	productPrice: {
		fontSize: 16,
		fontWeight: "bold",
	},
	productCategory: {
		fontSize: 12,
		marginTop: 4,
		textTransform: "capitalize",
	},
	productDescription: {
		fontSize: 12,
		marginTop: 2,
	},
	productActions: {
		alignItems: "center",
	},
	availabilityText: {
		fontSize: 10,
		marginTop: 2,
	},
	emptyContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
	},
	emptyText: {
		fontSize: 16,
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
		maxHeight: "80%",
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
	textArea: {
		height: 80,
		textAlignVertical: "top",
	},
	label: {
		fontSize: 14,
		fontWeight: "500",
		marginBottom: 8,
	},
	categoryContainer: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: 8,
		marginBottom: 15,
	},
	categoryButton: {
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 15,
		backgroundColor: "#E0E0E0",
	},
	categoryButtonActive: {
		backgroundColor: "#4CAF50",
	},
	categoryButtonText: {
		fontSize: 12,
		color: "#666",
		textTransform: "capitalize",
	},
	categoryButtonTextActive: {
		color: "#fff",
	},
	switchRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 20,
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
	// Styles Image
	imageSection: {
		marginBottom: 15,
	},
	imagePreviewContainer: {
		alignItems: "center",
	},
	imagePreview: {
		width: "100%",
		height: 150,
		borderRadius: 10,
		marginBottom: 10,
	},
	imageActions: {
		flexDirection: "row",
		gap: 10,
	},
	imageActionButton: {
		paddingHorizontal: 15,
		paddingVertical: 8,
		borderRadius: 8,
		backgroundColor: "#007AFF",
	},
	imageActionText: {
		color: "#fff",
		fontSize: 14,
		fontWeight: "500",
	},
	removeImageButton: {
		backgroundColor: "#FF3B30",
	},
	removeImageText: {
		color: "#fff",
		fontSize: 14,
		fontWeight: "500",
	},
	addImageButton: {
		borderWidth: 2,
		borderStyle: "dashed",
		borderRadius: 10,
		paddingVertical: 25,
		alignItems: "center",
		justifyContent: "center",
	},
	addImageIcon: {
		fontSize: 32,
		marginBottom: 8,
	},
	addImageText: {
		fontSize: 14,
		fontWeight: "500",
	},
});

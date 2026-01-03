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
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import { useAuthFetch } from "../../../hooks/useAuthFetch";
import useThemeStore from "../../../src/stores/useThemeStore";
import { getTheme } from "../../../utils/themeUtils";
import { getRestaurantId } from "../../../utils/getRestaurantId";
import AllergenSelectionModal from "../../modals/AllergenSelectionModal";

export default function MenuManagement() {
	const { themeMode } = useThemeStore();
	const THEME = React.useMemo(() => getTheme(themeMode), [themeMode]);
	const authFetch = useAuthFetch();

	const [products, setProducts] = useState([]);
	const [loading, setLoading] = useState(true);

	// Catégories disponibles (à adapter selon votre menu)
	const categories = ["Entrée", "Plat", "Dessert", "Boisssson", "Autre"];

	// Fonction pour charger les produits depuis l'API
	const fetchProducts = React.useCallback(async () => {
		setLoading(true);
		try {
			const restaurantId = await getRestaurantId();
			if (!restaurantId) throw new Error("restaurantId manquant");
			const url = `/products/restaurant/${restaurantId}`;
			const res = await authFetch(url, { method: "GET" });
			// res peut être un tableau ou un objet { products: [...] }
			let data = Array.isArray(res)
				? res
				: Array.isArray(res?.products)
				? res.products
				: [];
			setProducts(data);
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
	const [showAllergens, setShowAllergens] = useState(false);
	const [productAllergensDisplay, setProductAllergensDisplay] = useState([]);
	const flipAnimation = useRef(new Animated.Value(0)).current;

	// Handler pour éditer un produit (ouvre la modale et remplit le formulaire)
	const handleEdit = async (product) => {
		setEditingProduct(product);
		setFormData({
			name: product.name || "",
			price: product.price?.toString() || "",
			category: product.category || "",
			description: product.description || "",
			available: product.available !== false,
			image: product.image || "",
			quantifiable: product.quantifiable || false,
			quantity:
				product.quantifiable && typeof product.quantity === "number"
					? product.quantity.toString()
					: "",
		});
		setShowAllergens(false);
		// Charger les allergènes du produit
		try {
			const allergens = await authFetch(`/products/${product._id}/allergens`);
			setProductAllergensDisplay(Array.isArray(allergens) ? allergens : []);
		} catch (error) {
			console.error("Erreur chargement allergènes:", error);
			setProductAllergensDisplay([]);
		}
		setModalVisible(true);
	};

	// Animation flip pour description/allergènes
	const flipToAllergens = () => {
		Animated.spring(flipAnimation, {
			toValue: 1,
			friction: 8,
			tension: 10,
			useNativeDriver: true,
		}).start();
		setShowAllergens(true);
	};

	const flipToDescription = () => {
		Animated.spring(flipAnimation, {
			toValue: 0,
			friction: 8,
			tension: 10,
			useNativeDriver: true,
		}).start();
		setShowAllergens(false);
	};

	// Interpolations pour l'effet flip
	const frontAnimatedStyle = {
		transform: [
			{
				rotateY: flipAnimation.interpolate({
					inputRange: [0, 1],
					outputRange: ["0deg", "180deg"],
				}),
			},
		],
		backfaceVisibility: "hidden",
	};

	const backAnimatedStyle = {
		transform: [
			{
				rotateY: flipAnimation.interpolate({
					inputRange: [0, 1],
					outputRange: ["180deg", "360deg"],
				}),
			},
		],
		backfaceVisibility: "hidden",
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

	// ⭐ Handlers pour gérer les options
	const handleOpenOptionsModal = async (product) => {
		setCurrentProductForOptions(product);
		setOptionsModalVisible(true);
		await fetchProductOptions(product._id);
	};

	const fetchProductOptions = async (productId) => {
		setLoadingOptions(true);
		try {
			const options = await authFetch(`/products/${productId}/options`, {
				method: "GET",
			});
			setProductOptions(Array.isArray(options) ? options : []);
		} catch (error) {
			console.error("❌ Erreur chargement options:", error);
			setProductOptions([]);
		} finally {
			setLoadingOptions(false);
		}
	};

	const handleAddOption = async () => {
		if (!newOptionName.trim()) {
			Alert.alert("Erreur", "Le nom de l'option est requis");
			return;
		}

		const price = newOptionPrice ? parseFloat(newOptionPrice) : 0;
		if (isNaN(price) || price < 0) {
			Alert.alert("Erreur", "Le prix doit être un nombre valide");
			return;
		}

		try {
			const newOption = await authFetch(
				`/products/${currentProductForOptions._id}/options`,
				{
					method: "POST",
					body: JSON.stringify({
						name: newOptionName.trim(),
						price: price,
					}),
				}
			);

			setProductOptions([...productOptions, newOption]);
			setNewOptionName("");
			setNewOptionPrice("");
		} catch (error) {
			console.error("❌ Erreur ajout option:", error);
			Alert.alert("Erreur", "Impossible d'ajouter l'option");
		}
	};

	const handleDeleteOption = async (optionId) => {
		Alert.alert(
			"Supprimer l'option",
			"Voulez-vous vraiment supprimer cette option ?",
			[
				{ text: "Annuler", style: "cancel" },
				{
					text: "Supprimer",
					style: "destructive",
					onPress: async () => {
						try {
							await authFetch(
								`/products/${currentProductForOptions._id}/options/${optionId}`,
								{ method: "DELETE" }
							);
							setProductOptions(
								productOptions.filter((opt) => opt._id !== optionId)
							);
						} catch (error) {
							console.error("❌ Erreur suppression option:", error);
							Alert.alert("Erreur", "Impossible de supprimer l'option");
						}
					},
				},
			]
		);
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

	// ⭐ État pour gérer les options
	const [optionsModalVisible, setOptionsModalVisible] = useState(false);
	const [currentProductForOptions, setCurrentProductForOptions] =
		useState(null);
	const [productOptions, setProductOptions] = useState([]);
	const [newOptionName, setNewOptionName] = useState("");
	const [newOptionPrice, setNewOptionPrice] = useState("");
	const [loadingOptions, setLoadingOptions] = useState(false);

	// ⭐ État pour gérer les allergènes
	const [allergensModalVisible, setAllergensModalVisible] = useState(false);
	const [currentProductForAllergens, setCurrentProductForAllergens] =
		useState(null);

	// ⭐ Handlers pour gérer les allergènes
	const handleOpenAllergensModal = (product) => {
		setCurrentProductForAllergens(product);
		setAllergensModalVisible(true);
	};

	const handleValidateAllergens = async (allergenIds) => {
		try {
			await authFetch(`/products/${currentProductForAllergens._id}/allergens`, {
				method: "PUT",
				body: JSON.stringify({ allergenIds }),
			});
			await fetchProducts();
			Alert.alert("Succès", "Allergènes mis à jour");
		} catch (error) {
			console.error("❌ Erreur sauvegarde allergènes:", error);
			throw error;
		}
	};

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

		const isAvailable = item.available !== false;

		return (
			<Animated.View
				style={[
					styles.productCard,
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
					},
					!isAvailable && styles.productUnavailable,
				]}
			>
				<TouchableOpacity
					style={styles.productInfo}
					onPress={() => handleEdit(item)}
				>
					<View style={styles.productHeader}>
						<Text style={styles.productName}>{item.name}</Text>
						<Text style={styles.productPrice}>{item.price?.toFixed(2)}€</Text>
					</View>
					<Text style={styles.productCategory}>
						{item.category || "Sans catégorie"}
					</Text>
					{item.description && (
						<Text style={styles.productDescription} numberOfLines={1}>
							{item.description}
						</Text>
					)}
				</TouchableOpacity>
				<View style={styles.productActions}>
					<View style={styles.productButtonsRow}>
						<TouchableOpacity
							style={styles.optionsButton}
							onPress={() => handleOpenOptionsModal(item)}
						>
							<Ionicons name="settings-outline" size={14} color="#FFFFFF" />
							<Text style={styles.optionsButtonText}>Options</Text>
						</TouchableOpacity>
						<TouchableOpacity
							style={[styles.optionsButton, styles.allergensButton]}
							onPress={() => handleOpenAllergensModal(item)}
						>
							<Ionicons name="warning-outline" size={14} color="#FFFFFF" />
							<Text style={styles.optionsButtonText}>Allergènes</Text>
						</TouchableOpacity>
					</View>
					<View style={styles.availabilityRow}>
						<Switch
							value={isAvailable}
							onValueChange={() => handleToggleAvailability(item)}
							trackColor={{
								false: THEME.colors.text.muted,
								true: "rgba(16, 185, 129, 0.4)",
							}}
							thumbColor={
								isAvailable
									? THEME.colors.status.success
									: THEME.colors.status.error
							}
						/>
						<Text
							style={[
								styles.availabilityText,
								{
									color: isAvailable
										? THEME.colors.status.success
										: THEME.colors.status.error,
								},
							]}
						>
							{isAvailable ? "Dispo" : "Indispo"}
						</Text>
					</View>
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
					quantifiable: !!formData.quantifiable,
					quantity:
						!!formData.quantifiable && formData.quantity !== ""
							? parseInt(formData.quantity, 10)
							: null,
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

	const styles = React.useMemo(() => createStyles(THEME), [THEME]);

	if (loading) {
		return (
			<View style={styles.loadingContainer}>
				<ActivityIndicator size="large" color={THEME.colors.primary} />
				<Text style={styles.loadingText}>Chargement du menu...</Text>
			</View>
		);
	}

	return (
		<View style={styles.container}>
			{/* Header */}
			<View style={styles.header}>
				<View style={styles.headerRow}>
					<View style={styles.headerIconContainer}>
						<Ionicons
							name="restaurant"
							size={24}
							color={THEME.colors.primary}
						/>
					</View>
					<View style={styles.headerTextContainer}>
						<Text style={styles.title}>Gestion du Menu</Text>
						<Text style={styles.subtitle}>
							{products.length} produit{products.length > 1 ? "s" : ""}
						</Text>
					</View>
				</View>
			</View>

			{/* Barre de recherche */}
			<View style={styles.searchContainer}>
				<Ionicons
					name="search-outline"
					size={20}
					color={THEME.colors.text.muted}
					style={styles.searchIcon}
				/>
				<TextInput
					style={styles.searchInput}
					placeholder="Rechercher un produit..."
					placeholderTextColor={THEME.colors.text.muted}
					value={searchQuery}
					onChangeText={setSearchQuery}
				/>
				{searchQuery.length > 0 && (
					<TouchableOpacity
						onPress={() => setSearchQuery("")}
						style={styles.clearSearch}
					>
						<Ionicons
							name="close-circle"
							size={20}
							color={THEME.colors.text.muted}
						/>
					</TouchableOpacity>
				)}
			</View>

			{/* Liste des produits */}
			{filteredProducts.length === 0 ? (
				<View style={styles.emptyContainer}>
					<Ionicons
						name="fast-food-outline"
						size={48}
						color={THEME.colors.text.muted}
					/>
					<Text style={styles.emptyText}>
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
							handleEdit={handleEdit}
							handleToggleAvailability={handleToggleAvailability}
						/>
					)}
					contentContainerStyle={styles.listContainer}
					showsVerticalScrollIndicator={false}
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
					<View style={styles.modalContent}>
						<View style={styles.modalHeader}>
							<View style={styles.modalTitleRow}>
								<Ionicons
									name="create-outline"
									size={24}
									color={THEME.colors.primary}
								/>
								<Text style={styles.modalTitle}>Modifier le produit</Text>
							</View>
							<TouchableOpacity
								style={styles.modalCloseButton}
								onPress={() => setModalVisible(false)}
							>
								<Ionicons
									name="close"
									size={24}
									color={THEME.colors.text.secondary}
								/>
							</TouchableOpacity>
						</View>

						<ScrollView showsVerticalScrollIndicator={false}>
							{/* Section Image */}
							<View style={styles.formSection}>
								<Text style={styles.formLabel}>Photo du produit</Text>
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
												<Ionicons
													name="camera-outline"
													size={16}
													color="#FFFFFF"
												/>
												<Text style={styles.imageActionText}>Changer</Text>
											</TouchableOpacity>
											<TouchableOpacity
												style={[
													styles.imageActionButton,
													styles.removeImageButton,
												]}
												onPress={handleRemoveImage}
											>
												<Ionicons
													name="trash-outline"
													size={16}
													color="#FFFFFF"
												/>
												<Text style={styles.imageActionText}>Supprimer</Text>
											</TouchableOpacity>
										</View>
									</View>
								) : (
									<TouchableOpacity
										style={styles.addImageButton}
										onPress={handlePickImage}
									>
										<Ionicons
											name="camera-outline"
											size={32}
											color={THEME.colors.text.muted}
										/>
										<Text style={styles.addImageText}>Ajouter une photo</Text>
									</TouchableOpacity>
								)}
							</View>

							<View style={styles.formSection}>
								<Text style={styles.formLabel}>Nom du produit *</Text>
								<View style={styles.inputWrapper}>
									<TextInput
										style={styles.input}
										placeholder="Entrez le nom"
										placeholderTextColor={THEME.colors.text.muted}
										value={formData.name}
										onChangeText={(text) =>
											setFormData({ ...formData, name: text })
										}
									/>
								</View>
							</View>

							<View style={styles.formSection}>
								<Text style={styles.formLabel}>Prix *</Text>
								<View style={styles.inputWrapper}>
									<TextInput
										style={styles.input}
										placeholder="0.00"
										placeholderTextColor={THEME.colors.text.muted}
										value={formData.price}
										onChangeText={(text) =>
											setFormData({ ...formData, price: text })
										}
										keyboardType="decimal-pad"
									/>
									<Text style={styles.inputSuffix}>€</Text>
								</View>
							</View>

							{/* Sélection catégorie */}
							<View style={styles.formSection}>
								<Text style={styles.formLabel}>Catégorie</Text>
								<View style={styles.categoryContainer}>
									{categories.map((cat) => (
										<TouchableOpacity
											key={cat}
											style={[
												styles.categoryButton,
												formData.category === cat &&
													styles.categoryButtonActive,
											]}
											onPress={() =>
												setFormData({ ...formData, category: cat })
											}
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
							</View>

							{/* Toggle quantifiable + quantité */}
							<View style={styles.formSection}>
								<View
									style={{
										flexDirection: "row",
										alignItems: "center",
										justifyContent: "space-between",
									}}
								>
									<Text style={styles.formLabel}>Produit quantifiable</Text>
									<Switch
										value={!!formData.quantifiable}
										onValueChange={(value) =>
											setFormData({ ...formData, quantifiable: value })
										}
										trackColor={{
											false: THEME.colors.text.muted,
											true: THEME.colors.primary,
										}}
										thumbColor={
											formData.quantifiable
												? THEME.colors.primary
												: THEME.colors.text.muted
										}
									/>
								</View>
								{formData.quantifiable && (
									<View style={{ marginTop: 10 }}>
										<Text style={styles.formLabel}>Quantité en stock</Text>
										<View style={styles.inputWrapper}>
											<TextInput
												style={styles.input}
												placeholder="Quantité"
												placeholderTextColor={THEME.colors.text.muted}
												value={formData.quantity?.toString() || ""}
												onChangeText={(text) =>
													setFormData({
														...formData,
														quantity: text.replace(/[^0-9]/g, ""),
													})
												}
												keyboardType="number-pad"
											/>
										</View>
										<Text style={styles.inputHint}>
											Décrémente automatiquement à chaque commande
										</Text>
									</View>
								)}
							</View>

							{/* Flip Card: Description ↔ Allergènes */}
							<View style={styles.flipCardContainer}>
								{/* Indicateur de flip */}
								<TouchableOpacity
									style={styles.flipIndicator}
									onPress={showAllergens ? flipToDescription : flipToAllergens}
									activeOpacity={0.7}
								>
									<View style={styles.flipIndicatorRow}>
										<Ionicons
											name={
												showAllergens
													? "document-text-outline"
													: "warning-outline"
											}
											size={18}
											color={THEME.colors.primary}
										/>
										<Text style={styles.flipIndicatorText}>
											{showAllergens ? "Description" : "Allergènes"}
											{!showAllergens && productAllergensDisplay.length > 0 && (
												<Text style={styles.allergenCountBadge}>
													({productAllergensDisplay.length})
												</Text>
											)}
										</Text>
									</View>
									<Text style={styles.flipHint}>Appuyer pour basculer</Text>
								</TouchableOpacity>

								{/* Carte flip */}
								<View style={styles.flipCard}>
									{/* Face avant: Description */}
									<Animated.View
										style={[
											styles.flipCardFace,
											styles.flipCardFront,
											frontAnimatedStyle,
										]}
										pointerEvents={showAllergens ? "none" : "auto"}
									>
										<TextInput
											style={styles.flipCardInput}
											placeholder="Description du produit..."
											placeholderTextColor={THEME.colors.text.muted}
											value={formData.description}
											onChangeText={(text) =>
												setFormData({ ...formData, description: text })
											}
											multiline
											numberOfLines={4}
											textAlignVertical="top"
										/>
									</Animated.View>

									{/* Face arrière: Allergènes */}
									<Animated.View
										style={[
											styles.flipCardFace,
											styles.flipCardBack,
											backAnimatedStyle,
										]}
										pointerEvents={showAllergens ? "auto" : "none"}
									>
										<ScrollView
											style={styles.allergenScrollView}
											showsVerticalScrollIndicator={false}
											nestedScrollEnabled={true}
										>
											{productAllergensDisplay.length > 0 ? (
												<View style={styles.allergenList}>
													{productAllergensDisplay.map((allergen, index) => (
														<View
															key={allergen._id || index}
															style={styles.allergenItem}
														>
															<Text style={styles.allergenItemIcon}>
																{allergen.icon || "⚠️"}
															</Text>
															<View style={styles.allergenItemContent}>
																<Text style={styles.allergenItemName}>
																	{allergen.name}
																</Text>
																{allergen.description && (
																	<Text style={styles.allergenItemDesc}>
																		{allergen.description}
																	</Text>
																)}
															</View>
														</View>
													))}
												</View>
											) : (
												<View style={styles.noAllergenContainer}>
													<Ionicons
														name="checkmark-circle"
														size={32}
														color={THEME.colors.status.success}
													/>
													<Text style={styles.noAllergenText}>
														Aucun allergène déclaré
													</Text>
												</View>
											)}
										</ScrollView>
									</Animated.View>
								</View>
							</View>

							{/* Toggle disponibilité */}
							<View style={styles.switchRow}>
								<Text style={styles.formLabel}>Disponible</Text>
								<Switch
									value={formData.available}
									onValueChange={(value) =>
										setFormData({ ...formData, available: value })
									}
									trackColor={{
										false: THEME.colors.text.muted,
										true: "rgba(16, 185, 129, 0.4)",
									}}
									thumbColor={
										formData.available
											? THEME.colors.status.success
											: THEME.colors.status.error
									}
								/>
							</View>

							<View style={styles.modalButtons}>
								<TouchableOpacity
									style={styles.cancelButton}
									onPress={() => setModalVisible(false)}
								>
									<Text style={styles.cancelButtonText}>Annuler</Text>
								</TouchableOpacity>
								<TouchableOpacity onPress={handleSave}>
									<LinearGradient
										colors={["#F59E0B", "#D97706"]}
										start={{ x: 0, y: 0 }}
										end={{ x: 1, y: 0 }}
										style={styles.saveButton}
									>
										<Ionicons name="checkmark" size={20} color="#FFFFFF" />
										<Text style={styles.saveButtonText}>Enregistrer</Text>
									</LinearGradient>
								</TouchableOpacity>
							</View>
						</ScrollView>
					</View>
				</View>
			</Modal>

			{/* ⭐ Modal Options */}
			<Modal
				visible={optionsModalVisible}
				transparent
				animationType="slide"
				statusBarTranslucent={false}
				onRequestClose={() => setOptionsModalVisible(false)}
			>
				<View style={styles.modalOverlay}>
					<View style={styles.optionsModalContent}>
						<View style={styles.modalHeader}>
							<View style={styles.modalTitleRow}>
								<Ionicons
									name="settings-outline"
									size={24}
									color={THEME.colors.primary}
								/>
								<Text style={styles.modalTitle}>
									Options pour {currentProductForOptions?.name}
								</Text>
							</View>
							<TouchableOpacity
								style={styles.modalCloseButton}
								onPress={() => setOptionsModalVisible(false)}
							>
								<Ionicons
									name="close"
									size={24}
									color={THEME.colors.text.secondary}
								/>
							</TouchableOpacity>
						</View>

						<ScrollView
							showsVerticalScrollIndicator={false}
							style={styles.optionsScrollView}
							contentContainerStyle={{ paddingBottom: 10 }}
						>
							{/* Liste des options existantes */}
							{loadingOptions ? (
								<ActivityIndicator size="small" color={THEME.colors.primary} />
							) : productOptions.length === 0 ? (
								<View style={styles.emptyOptionsContainer}>
									<Ionicons
										name="list-outline"
										size={32}
										color={THEME.colors.text.muted}
									/>
									<Text style={styles.emptyOptionsText}>
										Aucune option pour ce plat
									</Text>
								</View>
							) : (
								productOptions.map((option) => (
									<View key={option._id} style={styles.optionItem}>
										<View style={styles.optionInfo}>
											<Text style={styles.optionName}>{option.name}</Text>
											{option.price > 0 && (
												<Text style={styles.optionPrice}>
													+{option.price.toFixed(2)}€
												</Text>
											)}
										</View>
										<TouchableOpacity
											onPress={() => handleDeleteOption(option._id)}
											style={styles.deleteOptionButton}
										>
											<Ionicons
												name="trash-outline"
												size={18}
												color={THEME.colors.status.error}
											/>
										</TouchableOpacity>
									</View>
								))
							)}

							{/* Formulaire ajout option */}
							<View style={styles.addOptionForm}>
								<Text style={styles.formLabel}>Ajouter une option</Text>
								<View style={styles.inputWrapper}>
									<TextInput
										style={styles.input}
										placeholder="Nom de l'option (ex: coulis de fraise)"
										placeholderTextColor={THEME.colors.text.muted}
										value={newOptionName}
										onChangeText={setNewOptionName}
									/>
								</View>
								<View style={styles.inputWrapper}>
									<TextInput
										style={styles.input}
										placeholder="Prix supplémentaire (optionnel)"
										placeholderTextColor={THEME.colors.text.muted}
										value={newOptionPrice}
										onChangeText={setNewOptionPrice}
										keyboardType="decimal-pad"
									/>
									<Text style={styles.inputSuffix}>€</Text>
								</View>
								<TouchableOpacity onPress={handleAddOption}>
									<LinearGradient
										colors={["#F59E0B", "#D97706"]}
										start={{ x: 0, y: 0 }}
										end={{ x: 1, y: 0 }}
										style={styles.addOptionButton}
									>
										<Ionicons name="add" size={20} color="#FFFFFF" />
										<Text style={styles.addOptionButtonText}>
											Ajouter l&apos;option
										</Text>
									</LinearGradient>
								</TouchableOpacity>
							</View>
						</ScrollView>

						{/* Bouton Fermer en zone fixe */}
						<View style={styles.optionsModalFooter}>
							<TouchableOpacity
								style={styles.closeOptionsButton}
								onPress={() => setOptionsModalVisible(false)}
							>
								<Text style={styles.closeOptionsButtonText}>Fermer</Text>
							</TouchableOpacity>
						</View>
					</View>
				</View>
			</Modal>

			{/* Modale Allergènes */}
			<AllergenSelectionModal
				visible={allergensModalVisible}
				onClose={() => setAllergensModalVisible(false)}
				onValidate={handleValidateAllergens}
				productId={currentProductForAllergens?._id}
				authFetch={authFetch}
			/>
		</View>
	);
}

const createStyles = (THEME) =>
	StyleSheet.create({
		container: {
			flex: 1,
		},
		loadingContainer: {
			flex: 1,
			justifyContent: "center",
			alignItems: "center",
			backgroundColor: THEME.colors.background,
		},
		loadingText: {
			color: THEME.colors.text.secondary,
			marginTop: THEME.spacing.md,
			fontSize: 14,
		},
		// Header
		header: {
			marginBottom: THEME.spacing.lg,
		},
		headerRow: {
			flexDirection: "row",
			alignItems: "center",
		},
		headerIconContainer: {
			width: 44,
			height: 44,
			borderRadius: THEME.radius.md,
			backgroundColor: "rgba(245, 158, 11, 0.15)",
			justifyContent: "center",
			alignItems: "center",
			marginRight: THEME.spacing.md,
		},
		headerTextContainer: {
			flex: 1,
		},
		title: {
			fontSize: 20,
			fontWeight: "700",
			color: THEME.colors.text.primary,
		},
		subtitle: {
			fontSize: 14,
			color: THEME.colors.text.secondary,
			marginTop: 2,
		},
		// Search
		searchContainer: {
			flexDirection: "row",
			alignItems: "center",
			backgroundColor: THEME.colors.card,
			borderRadius: THEME.radius.md,
			borderWidth: 1,
			borderColor: THEME.colors.border,
			paddingHorizontal: THEME.spacing.md,
			marginBottom: THEME.spacing.lg,
		},
		searchIcon: {
			marginRight: THEME.spacing.sm,
		},
		searchInput: {
			flex: 1,
			paddingVertical: THEME.spacing.md,
			fontSize: 16,
			color: THEME.colors.text.primary,
		},
		clearSearch: {
			padding: THEME.spacing.xs,
		},
		// Product List
		listContainer: {
			paddingBottom: THEME.spacing.xl,
		},
		productCard: {
			backgroundColor: THEME.colors.card,
			borderRadius: THEME.radius.lg,
			borderWidth: 1,
			borderColor: THEME.colors.border,
			padding: THEME.spacing.md,
			marginBottom: THEME.spacing.md,
		},
		productUnavailable: {
			opacity: 0.5,
		},
		productInfo: {
			marginBottom: THEME.spacing.md,
		},
		productHeader: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
		},
		productName: {
			fontSize: 16,
			fontWeight: "600",
			color: THEME.colors.text.primary,
			flex: 1,
		},
		productPrice: {
			fontSize: 16,
			fontWeight: "700",
			color: THEME.colors.status.success,
		},
		productCategory: {
			fontSize: 12,
			color: THEME.colors.text.secondary,
			marginTop: 4,
			textTransform: "capitalize",
		},
		productDescription: {
			fontSize: 12,
			color: THEME.colors.text.muted,
			marginTop: 4,
		},
		productActions: {
			borderTopWidth: 1,
			borderTopColor: THEME.colors.border,
			paddingTop: THEME.spacing.md,
		},
		productButtonsRow: {
			flexDirection: "row",
			gap: THEME.spacing.sm,
			marginBottom: THEME.spacing.md,
		},
		optionsButton: {
			flex: 1,
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "center",
			gap: 6,
			backgroundColor: "rgba(59, 130, 246, 0.15)",
			paddingVertical: 8,
			paddingHorizontal: 12,
			borderRadius: THEME.radius.sm,
			borderWidth: 1,
			borderColor: "rgba(59, 130, 246, 0.3)",
		},
		allergensButton: {
			backgroundColor: "rgba(245, 158, 11, 0.15)",
			borderColor: "rgba(245, 158, 11, 0.3)",
		},
		optionsButtonText: {
			color: "#FFFFFF",
			fontSize: 12,
			fontWeight: "600",
		},
		availabilityRow: {
			flexDirection: "row",
			alignItems: "center",
			gap: THEME.spacing.sm,
		},
		availabilityText: {
			fontSize: 12,
			fontWeight: "600",
		},
		// Empty State
		emptyContainer: {
			flex: 1,
			justifyContent: "center",
			alignItems: "center",
			paddingVertical: 60,
		},
		emptyText: {
			fontSize: 16,
			color: THEME.colors.text.secondary,
			marginTop: THEME.spacing.md,
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
			maxWidth: 400,
			maxHeight: "85%",
			backgroundColor: THEME.colors.card,
			borderRadius: THEME.radius.xl,
			borderWidth: 1,
			borderColor: THEME.colors.border,
			overflow: "hidden",
		},
		modalHeader: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
			paddingHorizontal: THEME.spacing.lg,
			paddingVertical: THEME.spacing.md,
			borderBottomWidth: 1,
			borderBottomColor: THEME.colors.border,
		},
		modalTitleRow: {
			flexDirection: "row",
			alignItems: "center",
			gap: THEME.spacing.sm,
		},
		modalTitle: {
			fontSize: 18,
			fontWeight: "700",
			color: THEME.colors.text.primary,
		},
		modalCloseButton: {
			padding: THEME.spacing.xs,
		},
		// Form Elements
		formSection: {
			paddingHorizontal: THEME.spacing.lg,
			paddingTop: THEME.spacing.md,
		},
		formLabel: {
			fontSize: 14,
			fontWeight: "600",
			color: THEME.colors.text.secondary,
			marginBottom: THEME.spacing.sm,
		},
		inputWrapper: {
			flexDirection: "row",
			alignItems: "center",
			backgroundColor: THEME.colors.inputBg,
			borderRadius: THEME.radius.md,
			borderWidth: 1,
			borderColor: THEME.colors.border,
			marginBottom: THEME.spacing.md,
		},
		input: {
			flex: 1,
			padding: THEME.spacing.md,
			fontSize: 16,
			color: THEME.colors.text.primary,
		},
		inputSuffix: {
			paddingRight: THEME.spacing.md,
			fontSize: 16,
			color: THEME.colors.text.secondary,
			fontWeight: "600",
		},
		// Image Section
		imagePreviewContainer: {
			alignItems: "center",
		},
		imagePreview: {
			width: "100%",
			height: 150,
			borderRadius: THEME.radius.md,
			marginBottom: THEME.spacing.md,
		},
		imageActions: {
			flexDirection: "row",
			gap: THEME.spacing.sm,
		},
		imageActionButton: {
			flexDirection: "row",
			alignItems: "center",
			gap: 6,
			paddingHorizontal: THEME.spacing.md,
			paddingVertical: THEME.spacing.sm,
			borderRadius: THEME.radius.sm,
			backgroundColor: "rgba(59, 130, 246, 0.8)",
		},
		imageActionText: {
			color: "#FFFFFF",
			fontSize: 14,
			fontWeight: "500",
		},
		removeImageButton: {
			backgroundColor: "rgba(239, 68, 68, 0.8)",
		},
		addImageButton: {
			borderWidth: 2,
			borderStyle: "dashed",
			borderColor: THEME.colors.border,
			borderRadius: THEME.radius.md,
			paddingVertical: 30,
			alignItems: "center",
			justifyContent: "center",
		},
		addImageText: {
			fontSize: 14,
			fontWeight: "500",
			color: THEME.colors.text.muted,
			marginTop: THEME.spacing.sm,
		},
		// Categories
		categoryContainer: {
			flexDirection: "row",
			flexWrap: "wrap",
			gap: THEME.spacing.sm,
			marginBottom: THEME.spacing.md,
		},
		categoryButton: {
			paddingHorizontal: THEME.spacing.md,
			paddingVertical: THEME.spacing.sm,
			borderRadius: THEME.radius.pill,
			backgroundColor: THEME.colors.inputBg,
			borderWidth: 1,
			borderColor: THEME.colors.border,
		},
		categoryButtonActive: {
			backgroundColor: THEME.colors.primary,
			borderColor: THEME.colors.primary,
		},
		categoryButtonText: {
			fontSize: 12,
			color: THEME.colors.text.secondary,
			textTransform: "capitalize",
		},
		categoryButtonTextActive: {
			color: "#FFFFFF",
			fontWeight: "600",
		},
		// Switch Row
		switchRow: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
			paddingHorizontal: THEME.spacing.lg,
			paddingVertical: THEME.spacing.md,
			borderTopWidth: 1,
			borderTopColor: THEME.colors.border,
		},
		// Modal Buttons
		modalButtons: {
			flexDirection: "row",
			justifyContent: "space-between",
			paddingHorizontal: THEME.spacing.lg,
			paddingVertical: THEME.spacing.lg,
			gap: THEME.spacing.md,
		},
		cancelButton: {
			flex: 1,
			paddingVertical: THEME.spacing.md,
			borderRadius: THEME.radius.md,
			backgroundColor: THEME.colors.inputBg,
			borderWidth: 1,
			borderColor: THEME.colors.border,
			alignItems: "center",
		},
		cancelButtonText: {
			color: THEME.colors.text.secondary,
			fontWeight: "600",
			fontSize: 16,
		},
		saveButton: {
			flex: 1,
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "center",
			gap: THEME.spacing.sm,
			paddingVertical: THEME.spacing.md,
			borderRadius: THEME.radius.md,
		},
		saveButtonText: {
			color: "#FFFFFF",
			fontWeight: "700",
			fontSize: 16,
		},
		// Flip Card
		flipCardContainer: {
			paddingHorizontal: THEME.spacing.lg,
			marginTop: THEME.spacing.md,
			marginBottom: THEME.spacing.md,
		},
		flipIndicator: {
			paddingVertical: THEME.spacing.sm,
			paddingHorizontal: THEME.spacing.md,
			backgroundColor: "rgba(245, 158, 11, 0.1)",
			borderRadius: THEME.radius.md,
			marginBottom: THEME.spacing.sm,
			borderWidth: 1,
			borderColor: "rgba(245, 158, 11, 0.2)",
		},
		flipIndicatorRow: {
			flexDirection: "row",
			alignItems: "center",
			gap: THEME.spacing.sm,
		},
		flipIndicatorText: {
			fontSize: 15,
			fontWeight: "600",
			color: THEME.colors.primary,
		},
		allergenCountBadge: {
			fontSize: 13,
			fontWeight: "700",
			color: THEME.colors.primary,
		},
		flipHint: {
			fontSize: 11,
			color: THEME.colors.text.muted,
			marginTop: 2,
		},
		flipCard: {
			height: 140,
			position: "relative",
		},
		flipCardFace: {
			position: "absolute",
			width: "100%",
			height: "100%",
			borderRadius: THEME.radius.md,
			borderWidth: 1,
			overflow: "hidden",
		},
		flipCardFront: {
			backgroundColor: THEME.colors.inputBg,
			borderColor: THEME.colors.border,
			zIndex: 2,
		},
		flipCardBack: {
			backgroundColor: "rgba(245, 158, 11, 0.1)",
			borderColor: "rgba(245, 158, 11, 0.3)",
			zIndex: 1,
		},
		flipCardInput: {
			flex: 1,
			padding: THEME.spacing.md,
			fontSize: 15,
			lineHeight: 22,
			color: THEME.colors.text.primary,
		},
		allergenScrollView: {
			flex: 1,
			padding: THEME.spacing.sm,
		},
		allergenList: {
			gap: THEME.spacing.sm,
		},
		allergenItem: {
			flexDirection: "row",
			alignItems: "flex-start",
			padding: THEME.spacing.sm,
			backgroundColor: "rgba(245, 158, 11, 0.1)",
			borderRadius: THEME.radius.sm,
			borderLeftWidth: 3,
			borderLeftColor: THEME.colors.primary,
		},
		allergenItemIcon: {
			fontSize: 20,
			marginRight: THEME.spacing.sm,
		},
		allergenItemContent: {
			flex: 1,
		},
		allergenItemName: {
			fontSize: 14,
			fontWeight: "600",
			color: THEME.colors.text.primary,
			marginBottom: 2,
		},
		allergenItemDesc: {
			fontSize: 12,
			color: THEME.colors.text.secondary,
		},
		noAllergenContainer: {
			flex: 1,
			justifyContent: "center",
			alignItems: "center",
			paddingVertical: 30,
		},
		noAllergenText: {
			fontSize: 14,
			color: THEME.colors.text.secondary,
			marginTop: THEME.spacing.sm,
		},
		// Options Modal
		optionsModalContent: {
			width: "90%",
			maxWidth: 450,
			maxHeight: "80%",
			backgroundColor: THEME.colors.card,
			borderRadius: THEME.radius.xl,
			borderWidth: 1,
			borderColor: THEME.colors.border,
			overflow: "hidden",
		},
		optionsScrollView: {
			paddingHorizontal: THEME.spacing.lg,
			paddingVertical: THEME.spacing.md,
		},
		emptyOptionsContainer: {
			alignItems: "center",
			paddingVertical: 30,
		},
		emptyOptionsText: {
			textAlign: "center",
			fontSize: 14,
			color: THEME.colors.text.muted,
			marginTop: THEME.spacing.sm,
		},
		optionItem: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
			paddingVertical: THEME.spacing.md,
			paddingHorizontal: THEME.spacing.sm,
			borderBottomWidth: 1,
			borderBottomColor: THEME.colors.border,
		},
		optionInfo: {
			flex: 1,
		},
		optionName: {
			fontSize: 16,
			fontWeight: "500",
			color: THEME.colors.text.primary,
		},
		optionPrice: {
			fontSize: 14,
			color: THEME.colors.status.success,
			marginTop: 2,
		},
		deleteOptionButton: {
			padding: THEME.spacing.sm,
		},
		addOptionForm: {
			marginTop: THEME.spacing.lg,
			paddingTop: THEME.spacing.lg,
			borderTopWidth: 1,
			borderTopColor: THEME.colors.border,
		},
		addOptionButton: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "center",
			gap: THEME.spacing.sm,
			paddingVertical: THEME.spacing.md,
			borderRadius: THEME.radius.md,
			marginTop: THEME.spacing.sm,
		},
		addOptionButtonText: {
			color: "#FFFFFF",
			fontWeight: "700",
			fontSize: 16,
		},
		optionsModalFooter: {
			paddingHorizontal: THEME.spacing.lg,
			paddingVertical: THEME.spacing.md,
			borderTopWidth: 1,
			borderTopColor: THEME.colors.border,
		},
		closeOptionsButton: {
			backgroundColor: THEME.colors.inputBg,
			paddingVertical: THEME.spacing.md,
			borderRadius: THEME.radius.md,
			alignItems: "center",
			borderWidth: 1,
			borderColor: THEME.colors.border,
		},
		closeOptionsButtonText: {
			color: THEME.colors.text.secondary,
			fontWeight: "600",
			fontSize: 16,
		},
	});

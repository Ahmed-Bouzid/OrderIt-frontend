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
	Platform,
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
	const [restaurant, setRestaurant] = useState(null);

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

	// Charger les add-ons disponibles au montage
	useEffect(() => {
		const fetchAvailableAddOns = async () => {
			try {
				setLoadingAddOns(true);
				const restaurantId = await getRestaurantId();
				if (!restaurantId) {
					setAvailableAddOns([]);
					return;
				}
				const addOns = await authFetch(`/products/addons/${restaurantId}`);
				setAvailableAddOns(Array.isArray(addOns) ? addOns : []);
			} catch (error) {
				console.error("Erreur chargement add-ons:", error);
				setAvailableAddOns([]);
			} finally {
				setLoadingAddOns(false);
			}
		};

		fetchAvailableAddOns();
	}, [authFetch]);

	// Charger le restaurant courant (pour feature overrides)
	useEffect(() => {
		const fetchRestaurant = async () => {
			try {
				const restaurantId = await getRestaurantId();
				if (!restaurantId) return;
				const res = await authFetch(`/restaurants/${restaurantId}`);
				setRestaurant(res);
			} catch (error) {
				console.error("Erreur chargement restaurant:", error);
			}
		};

		fetchRestaurant();
	}, [authFetch]);

	const [modalVisible, setModalVisible] = useState(false);
	const [editingProduct, setEditingProduct] = useState(null);
	const [isCreating, setIsCreating] = useState(false);
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
			baseQuantity:
				product.quantifiable && typeof product.baseQuantity === "number"
					? product.baseQuantity.toString()
					: "",
			addOns: product.addOns || false,
			hasAddOns: product.hasAddOns || false,
			allowedAddOns: Array.isArray(product.allowedAddOns)
				? product.allowedAddOns.map((a) => (typeof a === "string" ? a : a._id))
				: [],
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

	// Ouvrir la modale en mode création
	const handleOpenCreate = () => {
		setEditingProduct(null);
		setIsCreating(true);
		setFormData({
			name: "",
			price: "",
			category: categories[0] || "",
			description: "",
			available: true,
			image: "",
			quantifiable: false,
			baseQuantity: "",
			addOns: false,
			hasAddOns: false,
			allowedAddOns: [],
		});
		setShowAllergens(false);
		setProductAllergensDisplay([]);
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
		addOns: false,
		hasAddOns: false,
		allowedAddOns: [],
	});

	// ⭐ État pour add-ons disponibles
	const [availableAddOns, setAvailableAddOns] = useState([]);
	const [loadingAddOns, setLoadingAddOns] = useState(false);

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
						{/* Bouton Allergènes - visible seulement si allergen_management = true */}
						{(() => {
							const allergenEnabled =
								restaurant?.featureOverrides?.allergen_management !== false;
							return (
								allergenEnabled && (
									<TouchableOpacity
										style={[styles.optionsButton, styles.allergensButton]}
										onPress={() => handleOpenAllergensModal(item)}
									>
										<Ionicons name="warning-outline" size={14} color="#FFFFFF" />
										<Text style={styles.optionsButtonText}>Allergènes</Text>
									</TouchableOpacity>
								)
							);
						})()}
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

	// Sauvegarder (création ou modification)
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
		const payload = {
			name: formData.name,
			price: price,
			category: formData.category,
			description: formData.description,
			available: formData.available,
			image: formData.image,
			quantifiable: !!formData.quantifiable,
			baseQuantity:
				!!formData.quantifiable && formData.baseQuantity !== ""
					? parseInt(formData.baseQuantity, 10)
					: null,
			addOns: formData.addOns,
			hasAddOns: formData.hasAddOns,
			allowedAddOns: formData.allowedAddOns,
		};
		try {
			if (isCreating) {
				await authFetch("/products", {
					method: "POST",
					body: JSON.stringify(payload),
				});
				Alert.alert("Succès", "Produit créé");
			} else {
				await authFetch(`/products/${editingProduct._id}`, {
					method: "PUT",
					body: JSON.stringify(payload),
				});
				Alert.alert("Succès", "Produit modifié");
			}
			setModalVisible(false);
			setIsCreating(false);
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
					<TouchableOpacity style={styles.createBtn} onPress={handleOpenCreate} activeOpacity={0.85}>
						<LinearGradient
							colors={["#F59E0B", "#D97706"]}
							start={{ x: 0, y: 0 }}
							end={{ x: 1, y: 0 }}
							style={styles.createBtnGradient}
						>
							<Ionicons name="add" size={20} color="#fff" />
							<Text style={styles.createBtnText}>Nouveau</Text>
						</LinearGradient>
					</TouchableOpacity>
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
				onRequestClose={() => { setModalVisible(false); setIsCreating(false); }}
			>
				<View style={styles.modalOverlay}>
					<View style={styles.modalContent}>
						<View style={styles.modalHeader}>
							<View style={styles.modalTitleRow}>
								<View style={styles.modalIconBox}>
									<Ionicons
										name="create-outline"
										size={22}
										color="#F59E0B"
									/>
								</View>
								<View style={{ flex: 1 }}>
									<Text style={styles.modalTitle}>{isCreating ? "Nouveau produit" : "Modifier le produit"}</Text>
									{!isCreating && editingProduct?.name ? (
										<Text style={styles.modalSubTitle} numberOfLines={1}>{editingProduct.name}</Text>
									) : null}
								</View>
							</View>
							<TouchableOpacity
								style={styles.modalCloseButton}
								onPress={() => { setModalVisible(false); setIsCreating(false); }}
							>
								<Ionicons
									name="close"
									size={20}
									color="#94A3B8"
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
										<Text style={styles.formLabel}>Quantité de base</Text>
										<View style={styles.inputWrapper}>
											<TextInput
												style={styles.input}
												placeholder="Ex: 15"
												placeholderTextColor={THEME.colors.text.muted}
												value={formData.baseQuantity?.toString() || ""}
												onChangeText={(text) =>
													setFormData({
														...formData,
														baseQuantity: text.replace(/[^0-9]/g, ""),
													})
												}
												keyboardType="number-pad"
											/>
										</View>
										<Text style={styles.inputHint}>
											Référence fixe — utilisée chaque matin dans la section Stocks
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

							{/* Toggle cet article est un add-on */}
							<View style={styles.switchRow}>
								<Text style={styles.formLabel}>Cet article est un add-on</Text>
								<Switch
									value={formData.addOns}
									onValueChange={(value) =>
										setFormData({ ...formData, addOns: value })
									}
									trackColor={{
										false: THEME.colors.text.muted,
										true: "rgba(14, 165, 233, 0.4)",
									}}
									thumbColor={
										formData.addOns
											? THEME.colors.text.accent
											: THEME.colors.status.error
									}
								/>
							</View>

							{/* Toggle cet article accepte les add-ons */}
							<View style={styles.switchRow}>
								<Text style={styles.formLabel}>Accepte des add-ons</Text>
								<Switch
									value={formData.hasAddOns}
									onValueChange={(value) =>
										setFormData({
											...formData,
											hasAddOns: value,
											allowedAddOns: value ? formData.allowedAddOns : [],
										})
									}
									trackColor={{
										false: THEME.colors.text.muted,
										true: "rgba(168, 85, 247, 0.4)",
									}}
									thumbColor={
										formData.hasAddOns
											? THEME.colors.success
											: THEME.colors.status.error
									}
								/>
							</View>

							{/* Multi-select add-ons autorisés */}
							{formData.hasAddOns && (
								<View style={styles.addOnsContainer}>
									<Text style={styles.formLabel}>Add-ons autorisés</Text>
									{loadingAddOns ? (
										<Text
											style={{
												color: THEME.colors.text.muted,
												fontSize: 14,
												marginVertical: 10,
											}}
										>
											Chargement...
										</Text>
									) : availableAddOns.length === 0 ? (
										<Text
											style={{
												color: THEME.colors.text.muted,
												fontSize: 14,
												marginVertical: 10,
											}}
										>
											Aucun add-on disponible. Créez d'abord un article marqué
											"Cet article est un add-on".
										</Text>
									) : (
										<View style={styles.addOnsChecklist}>
											{availableAddOns.map((addOn) => (
												<TouchableOpacity
													key={addOn._id}
													style={styles.addOnCheckboxRow}
													onPress={() => {
														const isSelected = formData.allowedAddOns.includes(
															addOn._id,
														);
														setFormData({
															...formData,
															allowedAddOns: isSelected
																? formData.allowedAddOns.filter(
																		(id) => id !== addOn._id,
																	)
																: [...formData.allowedAddOns, addOn._id],
														});
													}}
												>
													<View
														style={[
															styles.checkbox,
															formData.allowedAddOns.includes(addOn._id) &&
																styles.checkboxChecked,
														]}
													>
														{formData.allowedAddOns.includes(addOn._id) && (
															<Ionicons
																name="checkmark"
																size={14}
																color="white"
															/>
														)}
													</View>
													<View style={{ flex: 1 }}>
														<Text style={styles.addOnName}>{addOn.name}</Text>
														<Text style={styles.addOnPrice}>
															{addOn.price ? `+${addOn.price.toFixed(2)}€` : "Gratuit"}
														</Text>
													</View>
												</TouchableOpacity>
											))}
										</View>
									)}
								</View>
							)}

							<View style={styles.modalButtons}>
								<TouchableOpacity
									style={styles.cancelButton}
									onPress={() => { setModalVisible(false); setIsCreating(false); }}
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

			{/* ⭐ Modal Options — style TableDetailModal (Comptoir) */}
			<Modal
				visible={optionsModalVisible}
				transparent
				animationType="fade"
				onRequestClose={() => setOptionsModalVisible(false)}
			>
				<View style={styles.optionsOverlay}>
					<View style={styles.optionsSheet}>
						{/* ── HEADER ─────────────────────────── */}
						<View style={styles.optionsHeader}>
							<View style={styles.optionsHeaderLeft}>
								<View style={styles.optionsIconBox}>
									<Ionicons name="settings-outline" size={20} color="#FBBF24" />
								</View>
								<View style={{ flex: 1 }}>
									<Text style={styles.optionsHeaderTitle}>Options du plat</Text>
									<Text style={styles.optionsHeaderSub} numberOfLines={1}>
										{currentProductForOptions?.name}
									</Text>
								</View>
							</View>
							<TouchableOpacity
								onPress={() => setOptionsModalVisible(false)}
								style={styles.optionsCloseBtn}
							>
								<Ionicons name="close" size={20} color="#94A3B8" />
							</TouchableOpacity>
						</View>

						{/* ── LISTE + FORMULAIRE ─────────────── */}
						<ScrollView
							showsVerticalScrollIndicator={false}
							style={styles.optionsScroll}
							contentContainerStyle={styles.optionsScrollContent}
							keyboardShouldPersistTaps="handled"
						>
							{loadingOptions ? (
								<ActivityIndicator size="small" color="#FBBF24" style={{ marginVertical: 20 }} />
							) : productOptions.length === 0 ? (
								<View style={styles.emptyOptionsContainer}>
									<Ionicons name="list-outline" size={32} color="#475569" />
									<Text style={styles.emptyOptionsText}>Aucune option pour ce plat</Text>
								</View>
							) : (
								productOptions.map((option) => (
									<View key={option._id} style={styles.optionItem}>
										<View style={styles.optionInfo}>
											<Text style={styles.optionName}>{option.name}</Text>
											{option.price > 0 && (
												<Text style={styles.optionPrice}>+{option.price.toFixed(2)}€</Text>
											)}
										</View>
										<TouchableOpacity
											onPress={() => handleDeleteOption(option._id)}
											style={styles.deleteOptionButton}
										>
											<Ionicons name="trash-outline" size={18} color="#EF4444" />
										</TouchableOpacity>
									</View>
								))
							)}

							<View style={styles.addOptionForm}>
								<Text style={styles.addOptionFormLabel}>Ajouter une option</Text>
								<View style={styles.optionsInputWrapper}>
									<TextInput
										style={styles.optionsInput}
										placeholder="Nom de l'option (ex: coulis de fraise)"
										placeholderTextColor="#475569"
										value={newOptionName}
										onChangeText={setNewOptionName}
										returnKeyType="next"
									/>
								</View>
								<View style={styles.optionsInputWrapper}>
									<TextInput
										style={styles.optionsInput}
										placeholder="Prix supplémentaire (optionnel)"
										placeholderTextColor="#475569"
										value={newOptionPrice}
										onChangeText={setNewOptionPrice}
										keyboardType="decimal-pad"
										returnKeyType="done"
									/>
									<Text style={styles.optionsInputSuffix}>€</Text>
								</View>
								<TouchableOpacity
									onPress={handleAddOption}
									aktiveOpacity={0.85}
									style={styles.addOptionBtnWrap}
								>
									<LinearGradient
										colors={["#F59E0B", "#D97706"]}
										start={{ x: 0, y: 0 }}
										end={{ x: 1, y: 0 }}
										style={styles.addOptionButton}
									>
										<Ionicons name="add" size={20} color="#FFFFFF" />
										<Text style={styles.addOptionButtonText}>Ajouter l&apos;option</Text>
									</LinearGradient>
								</TouchableOpacity>
							</View>
						</ScrollView>

						{/* ── FOOTER ─────────────────────────── */}
						<View style={styles.optionsFooter}>
							<TouchableOpacity
								style={styles.optionsCloseFullBtn}
								onPress={() => setOptionsModalVisible(false)}
								activeOpacity={0.85}
							>
								<Text style={styles.optionsCloseFullBtnText}>Fermer</Text>
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
				productName={currentProductForAllergens?.name}
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
		createBtn: {
			height: 40,
			borderRadius: 10,
			overflow: "hidden",
		},
		createBtnGradient: {
			flexDirection: "row",
			alignItems: "center",
			paddingHorizontal: 14,
			height: 40,
			gap: 6,
		},
		createBtnText: {
			fontSize: 14,
			fontWeight: "700",
			color: "#fff",
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
			backgroundColor: "rgba(0,0,0,0.70)",
			justifyContent: "center",
			alignItems: "center",
			paddingHorizontal: 16,
			paddingVertical: 12,
		},
		modalContent: {
			backgroundColor: "#1E293B",
			borderRadius: 20,
			width: "100%",
			maxWidth: 520,
			flexShrink: 1,
			minHeight: "78%",
			borderWidth: 1,
			borderColor: "rgba(255,255,255,0.08)",
			overflow: "hidden",
		},
		modalHeader: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
			paddingHorizontal: 20,
			paddingVertical: 16,
			borderBottomWidth: 1,
			borderBottomColor: "rgba(255,255,255,0.07)",
		},
		modalTitleRow: {
			flexDirection: "row",
			alignItems: "center",
			gap: 12,
			flex: 1,
		},
		modalIconBox: {
			width: 40,
			height: 40,
			borderRadius: 10,
			backgroundColor: "rgba(245,158,11,0.15)",
			alignItems: "center",
			justifyContent: "center",
		},
		modalTitle: {
			fontSize: 17,
			fontWeight: "700",
			color: "#F1F5F9",
		},
		modalSubTitle: {
			fontSize: 13,
			color: "#64748B",
			marginTop: 1,
		},
		modalCloseButton: {
			width: 36,
			height: 36,
			borderRadius: 18,
			backgroundColor: "rgba(255,255,255,0.06)",
			alignItems: "center",
			justifyContent: "center",
			marginLeft: 8,
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
		// Add-ons Container
		addOnsContainer: {
			paddingHorizontal: THEME.spacing.lg,
			paddingVertical: THEME.spacing.md,
			borderTopWidth: 1,
			borderTopColor: THEME.colors.border,
		},
		addOnsChecklist: {
			marginTop: THEME.spacing.md,
			borderRadius: THEME.radius.md,
			overflow: "hidden",
			backgroundColor: THEME.colors.inputBg,
			borderWidth: 1,
			borderColor: THEME.colors.border,
		},
		addOnCheckboxRow: {
			flexDirection: "row",
			alignItems: "center",
			paddingHorizontal: THEME.spacing.md,
			paddingVertical: THEME.spacing.md,
			borderBottomWidth: 1,
			borderBottomColor: THEME.colors.border,
		},
		checkbox: {
			width: 20,
			height: 20,
			borderRadius: 4,
			borderWidth: 2,
			borderColor: THEME.colors.border,
			marginRight: THEME.spacing.md,
			justifyContent: "center",
			alignItems: "center",
		},
		checkboxChecked: {
			backgroundColor: THEME.colors.primary,
			borderColor: THEME.colors.primary,
		},
		addOnName: {
			fontSize: 14,
			fontWeight: "600",
			color: THEME.colors.text.primary,
		},
		addOnPrice: {
			fontSize: 12,
			color: THEME.colors.text.secondary,
			marginTop: 2,
		},
		// Modal Buttons
		modalButtons: {
			flexDirection: "row",
			paddingHorizontal: 16,
			paddingTop: 12,
			paddingBottom: Platform.OS === "ios" ? 32 : 20,
			gap: 12,
			borderTopWidth: 1,
			borderTopColor: "rgba(255,255,255,0.07)",
			backgroundColor: "#1E293B",
		},
		cancelButton: {
			flex: 1,
			height: 48,
			borderRadius: 12,
			backgroundColor: "rgba(255,255,255,0.07)",
			alignItems: "center",
			justifyContent: "center",
		},
		cancelButtonText: {
			color: "#94A3B8",
			fontWeight: "600",
			fontSize: 15,
		},
		saveButtonWrap: {
			flex: 1,
			height: 48,
			borderRadius: 12,
			overflow: "hidden",
		},
		saveButton: {
			flex: 1,
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "center",
			gap: 8,
		},
		saveButtonText: {
			color: "#FFFFFF",
			fontWeight: "700",
			fontSize: 15,
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
		// Options Modal — style TableDetailModal (Comptoir)
		optionsOverlay: {
			flex: 1,
			backgroundColor: "rgba(0,0,0,0.70)",
			justifyContent: "center",
			alignItems: "center",
			paddingHorizontal: 16,
			paddingVertical: 12,
		},
		optionsSheet: {
			backgroundColor: "#1E293B",
			borderRadius: 20,
			width: "100%",
			maxWidth: 520,
			flexShrink: 1,
			minHeight: "78%",
			borderWidth: 1,
			borderColor: "rgba(255,255,255,0.08)",
			overflow: "hidden",
		},
		optionsHeader: {
			flexDirection: "row",
			alignItems: "flex-start",
			paddingHorizontal: 20,
			paddingTop: 20,
			paddingBottom: 14,
			borderBottomWidth: 1,
			borderBottomColor: "rgba(255,255,255,0.07)",
		},
		optionsHeaderLeft: {
			flex: 1,
			flexDirection: "row",
			alignItems: "center",
			gap: 12,
		},
		optionsIconBox: {
			width: 38,
			height: 38,
			backgroundColor: "rgba(251,191,36,0.12)",
			borderRadius: 12,
			justifyContent: "center",
			alignItems: "center",
		},
		optionsHeaderTitle: {
			fontSize: 20,
			fontWeight: "700",
			color: "#F8FAFC",
			marginBottom: 3,
		},
		optionsHeaderSub: {
			fontSize: 13,
			color: "#64748B",
		},
		optionsCloseBtn: {
			width: 32,
			height: 32,
			borderRadius: 16,
			backgroundColor: "rgba(255,255,255,0.07)",
			alignItems: "center",
			justifyContent: "center",
			marginLeft: 12,
		},
		optionsScroll: {
			flex: 1,
		},
		optionsScrollContent: {
			paddingHorizontal: 20,
			paddingTop: 16,
			paddingBottom: 16,
		},
		emptyOptionsContainer: {
			alignItems: "center",
			paddingVertical: 30,
		},
		emptyOptionsText: {
			textAlign: "center",
			fontSize: 14,
			color: "#64748B",
			marginTop: 8,
		},
		optionItem: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
			paddingVertical: 14,
			paddingHorizontal: 4,
			borderBottomWidth: 1,
			borderBottomColor: "rgba(255,255,255,0.07)",
		},
		optionInfo: {
			flex: 1,
		},
		optionName: {
			fontSize: 16,
			fontWeight: "500",
			color: "#F8FAFC",
		},
		optionPrice: {
			fontSize: 14,
			color: "#22C55E",
			marginTop: 2,
		},
		deleteOptionButton: {
			padding: 8,
		},
		addOptionForm: {
			marginTop: 20,
			paddingTop: 20,
			borderTopWidth: 1,
			borderTopColor: "rgba(255,255,255,0.07)",
		},
		addOptionFormLabel: {
			fontSize: 13,
			fontWeight: "600",
			color: "#94A3B8",
			marginBottom: 12,
			textTransform: "uppercase",
			letterSpacing: 0.5,
		},
		optionsInputWrapper: {
			flexDirection: "row",
			alignItems: "center",
			backgroundColor: "rgba(255,255,255,0.06)",
			borderRadius: 12,
			borderWidth: 1,
			borderColor: "rgba(255,255,255,0.10)",
			marginBottom: 12,
			height: 48,
		},
		optionsInput: {
			flex: 1,
			paddingHorizontal: 16,
			fontSize: 15,
			color: "#F8FAFC",
			height: "100%",
		},
		optionsInputSuffix: {
			paddingRight: 16,
			fontSize: 16,
			color: "#94A3B8",
			fontWeight: "600",
		},
		addOptionBtnWrap: {
			borderRadius: 12,
			overflow: "hidden",
			marginTop: 8,
		},
		addOptionButton: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "center",
			gap: 8,
			height: 48,
			borderRadius: 12,
		},
		addOptionButtonText: {
			color: "#FFFFFF",
			fontWeight: "700",
			fontSize: 16,
		},
		optionsFooter: {
			paddingHorizontal: 20,
			paddingTop: 16,
			paddingBottom: Platform.OS === "ios" ? 32 : 20,
			borderTopWidth: 1,
			borderTopColor: "rgba(255,255,255,0.07)",
		},
		optionsCloseFullBtn: {
			backgroundColor: "#F9FAFB",
			height: 48,
			borderRadius: 12,
			alignItems: "center",
			justifyContent: "center",
		},
		optionsCloseFullBtnText: {
			color: "#111827",
			fontWeight: "600",
			fontSize: 15,
		},
	});

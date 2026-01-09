import React, {
	useCallback,
	useMemo,
	useState,
	useRef,
	useEffect,
} from "react";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import {
	View,
	Text,
	TouchableOpacity,
	FlatList,
	TextInput,
	StyleSheet,
	Animated,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getItem as getSecureItem } from "../../../utils/secureStorage";
import { ProductOptionsModal } from "../modals/ProductOptionsModal";
import useThemeStore from "../../../src/stores/useThemeStore";
import { getTheme } from "../../../utils/themeUtils";

// ═══════════════════════════════════════════════════════════════════════
// 🔍 Barre de recherche premium dark
// ═══════════════════════════════════════════════════════════════════════
const PremiumSearchBar = ({ value, onChangeText, onClear }) => {
	const { themeMode } = useThemeStore();
	const THEME = useMemo(() => getTheme(themeMode), [themeMode]);
	const searchStyles = useMemo(() => createSearchStyles(THEME), [THEME]);

	const [isFocused, setIsFocused] = useState(false);
	return (
		<View
			style={[
				searchStyles.container,
				isFocused && searchStyles.containerFocused,
			]}
		>
			<Ionicons
				name="search"
				size={20}
				color={isFocused ? THEME.colors.primary.amber : THEME.colors.text.muted}
				style={searchStyles.icon}
			/>
			<TextInput
				style={searchStyles.input}
				placeholder="Rechercher un produit..."
				placeholderTextColor={THEME.colors.text.muted}
				value={value}
				onChangeText={onChangeText}
				onFocus={() => setIsFocused(true)}
				onBlur={() => setIsFocused(false)}
				returnKeyType="search"
			/>
			{value.length > 0 && (
				<TouchableOpacity onPress={onClear} style={searchStyles.clearButton}>
					<View style={searchStyles.clearIcon}>
						<Ionicons name="close" size={14} color="#FFFFFF" />
					</View>
				</TouchableOpacity>
			)}
		</View>
	);
};

// ═══════════════════════════════════════════════════════════════════════
// 🎯 Composant CategoryButton simple (avec support onLayout pour sliding)
// ═══════════════════════════════════════════════════════════════════════
const CategoryButton = React.memo(
	({ cat, isSelected, onPress, onLayout, THEME, mainStyles }) => {
		return (
			<TouchableOpacity
				onPress={onPress}
				activeOpacity={0.8}
				onLayout={onLayout}
				style={[
					mainStyles.categoryButton,
					{
						backgroundColor: "transparent",
						borderColor: "transparent",
					},
				]}
			>
				<Text style={mainStyles.categoryEmoji}>{cat.emoji}</Text>
				<Text
					style={[
						mainStyles.categoryLabel,
						{
							color: isSelected ? cat.color : THEME.colors.text.secondary,
							fontWeight: isSelected ? "700" : "600",
						},
					]}
				>
					{cat.label}
				</Text>
			</TouchableOpacity>
		);
	}
);

CategoryButton.displayName = "CategoryButton";

const createSearchStyles = (THEME) =>
	StyleSheet.create({
		container: {
			marginBottom: THEME.spacing.lg,
			borderRadius: THEME.radius.lg,
			borderWidth: 1,
			borderColor: THEME.colors.border.default,
			backgroundColor: THEME.colors.background.card,
			flexDirection: "row",
			alignItems: "center",
			paddingHorizontal: THEME.spacing.lg,
		},
		containerFocused: {
			borderColor: THEME.colors.primary.amber,
			backgroundColor: THEME.colors.background.elevated,
		},
		icon: {
			marginRight: THEME.spacing.md,
		},
		input: {
			flex: 1,
			paddingVertical: THEME.spacing.md + 2,
			fontSize: 15,
			color: THEME.colors.text.primary,
			fontWeight: "500",
		},
		clearButton: {
			padding: THEME.spacing.xs,
		},
		clearIcon: {
			backgroundColor: THEME.colors.primary.amber,
			borderRadius: 12,
			padding: 4,
		},
	});

const normalize = (str) =>
	(str || "")
		.toLowerCase()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "");

// ═══════════════════════════════════════════════════════════════════════
// 🏷️ Catégories avec couleurs premium dark
// ═══════════════════════════════════════════════════════════════════════
const categories = [
	{
		id: "boisson",
		label: "Boissons",
		emoji: "🥤",
		color: "#A855F7", // violet
		bgColor: "rgba(168, 85, 247, 0.15)",
	},
	{
		id: "Entrée",
		label: "Entrées",
		emoji: "🥗",
		color: "#10B981", // emerald
		bgColor: "rgba(16, 185, 129, 0.15)",
	},
	{
		id: "plat",
		label: "Plats",
		emoji: "🍝",
		color: "#F59E0B", // amber
		bgColor: "rgba(245, 158, 11, 0.15)",
	},
	{
		id: "dessert",
		label: "Desserts",
		emoji: "🍰",
		color: "#F43F5E", // rose
		bgColor: "rgba(244, 63, 94, 0.15)",
	},
];

export const ProductSelection = React.memo(
	({
		products,
		activeReservation,
		theme,
		editField,
		setSelectedProduct,
		setShowProductModal,
		step,
		setStep,
		clientAllergens = [], // ⭐ Allergènes du client
	}) => {
		const { themeMode } = useThemeStore();
		const THEME = useMemo(() => getTheme(themeMode), [themeMode]);
		const mainStyles = useMemo(() => createMainStyles(THEME), [THEME]);
		const productStyles = useMemo(() => createProductStyles(THEME), [THEME]);

		// Catégorie sélectionnée (par défaut la première)
		const [selectedCategory, setSelectedCategory] = useState(null);
		// ⭐ État pour la modale d'options
		const [optionsModalVisible, setOptionsModalVisible] = useState(false);
		const [productForOptions, setProductForOptions] = useState(null);

		// ═══════════════════════════════════════════════════════════════════════
		// 🎯 Sliding effect pour les catégories (comme Filters.jsx)
		// ═══════════════════════════════════════════════════════════════════════
		const [categoryLayouts, setCategoryLayouts] = useState({});
		const [isSliderReady, setIsSliderReady] = useState(false);
		const sliderTranslateX = useRef(new Animated.Value(0)).current;
		const sliderWidth = useRef(new Animated.Value(100)).current;

		// Couleur active pour le slider
		const getActiveCategoryColor = () => {
			const cat = categories.find((c) => c.id === selectedCategory);
			return cat ? cat.color : THEME.colors.primary.amber;
		};

		const handleCategoryLayout = useCallback((key, event) => {
			const { x, width: w } = event.nativeEvent.layout;
			setCategoryLayouts((prev) => {
				const newLayouts = { ...prev, [key]: { x, width: w } };
				return newLayouts;
			});
		}, []);

		// Activer le slider une fois tous les layouts capturés
		useEffect(() => {
			if (
				Object.keys(categoryLayouts).length === categories.length &&
				!isSliderReady
			) {
				setIsSliderReady(true);
				// Position initiale si catégorie sélectionnée
				if (selectedCategory && categoryLayouts[selectedCategory]) {
					const layout = categoryLayouts[selectedCategory];
					sliderTranslateX.setValue(layout.x);
					sliderWidth.setValue(layout.width);
				}
			}
		}, [categoryLayouts, isSliderReady, selectedCategory]);

		// Animation au changement de catégorie
		useEffect(() => {
			if (
				isSliderReady &&
				selectedCategory &&
				categoryLayouts[selectedCategory]
			) {
				const layout = categoryLayouts[selectedCategory];
				Animated.parallel([
					Animated.spring(sliderTranslateX, {
						toValue: layout.x,
						useNativeDriver: false,
						bounciness: 8,
					}),
					Animated.spring(sliderWidth, {
						toValue: layout.width,
						useNativeDriver: false,
						bounciness: 8,
					}),
				]).start();
			}
		}, [selectedCategory, categoryLayouts, isSliderReady]);

		// ⭐ Valeurs sécurisées (memoizées pour éviter les changements de référence)
		const safeProducts = useMemo(
			() => (Array.isArray(products) ? products : []),
			[products]
		);

		// Barre de recherche (état local)
		const [searchQuery, setSearchQuery] = useState("");

		// Produits filtrés par recherche
		const filteredProducts = useMemo(() => {
			if (searchQuery.trim()) {
				return safeProducts.filter(
					(p) =>
						(p.name &&
							p.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
						(p.description &&
							p.description.toLowerCase().includes(searchQuery.toLowerCase()))
				);
			}
			return safeProducts.filter(
				(p) => p && normalize(p.category) === normalize(selectedCategory)
			);
		}, [safeProducts, searchQuery, selectedCategory]);

		const safeOrderItems = useMemo(
			() =>
				Array.isArray(activeReservation?.orderItems)
					? activeReservation.orderItems
					: [],
			[activeReservation?.orderItems]
		);

		const handleProductPress = useCallback(
			(product) => {
				if (!product) return;
				setSelectedProduct?.(product);
				setShowProductModal?.(true);
			},
			[setSelectedProduct, setShowProductModal]
		);

		const handleDecrement = useCallback(
			(productId) => {
				if (!productId) return;
				editField?.("orderItems", (prev = []) => {
					const safePrev = Array.isArray(prev) ? prev : [];

					// Trouver le dernier item avec ce productId
					let lastIndex = -1;
					for (let i = safePrev.length - 1; i >= 0; i--) {
						if (safePrev[i]?.productId === productId) {
							lastIndex = i;
							break;
						}
					}

					if (lastIndex === -1) return safePrev;

					const newItems = [...safePrev];
					const item = newItems[lastIndex];

					if (item.quantity <= 1) {
						// Supprimer l'entrée si quantité = 0
						newItems.splice(lastIndex, 1);
					} else {
						// Décrémenter la quantité
						newItems[lastIndex] = { ...item, quantity: item.quantity - 1 };
					}

					return newItems;
				});
			},
			[editField]
		);
		const handleIncrement = useCallback(
			async (productId, product) => {
				if (!productId) return;

				// Vérifier si le produit a des options
				try {
				const token = await getSecureItem("@access_token");
					const url = `${
						process.env.EXPO_PUBLIC_API_URL ||
						"https://orderit-backend-6y1m.onrender.com"
					}/products/${productId}/options`;
					console.log(
						"🔍 Vérification options pour:",
						product?.name,
						"URL:",
						url
					);

					const response = await fetch(url, {
						headers: {
							Authorization: `Bearer ${token}`,
						},
					});
					console.log("📡 Response status:", response.status, response.ok);

					if (response.ok) {
						const options = await response.json();
						console.log("✅ Options reçues:", options);

						if (Array.isArray(options) && options.length > 0) {
							// Ouvrir la modale d'options
							console.log("🎯 Ouverture modale pour:", product?.name);
							setProductForOptions(
								product || safeProducts.find((p) => p._id === productId)
							);
							setOptionsModalVisible(true);
							return;
						} else {
							console.log("⚠️ Aucune option trouvée ou tableau vide");
						}
					} else {
						console.log("❌ Response non-ok:", response.status);
					}
				} catch (error) {
					console.log("❌ Erreur fetch options:", error.message);
				}

				// Pas d'options, ajouter directement
				console.log("➕ Ajout direct sans options");
				editField?.("orderItems", (prev = []) => {
					const safePrev = Array.isArray(prev) ? prev : [];
					const existing = safePrev.find((i) => i?.productId === productId);
					if (existing) {
						return safePrev.map((i) =>
							i?.productId === productId
								? { ...i, quantity: Math.min(99, (i.quantity || 0) + 1) }
								: i
						);
					} else {
						return [...safePrev, { productId, quantity: 1 }];
					}
				});
			},
			[editField, safeProducts]
		);

		const handleValidateOptions = useCallback(
			(selectedOptions) => {
				if (!productForOptions) return;

				const productId = productForOptions._id;
				const productName = productForOptions.name;

				// Construire le nom avec options entre parenthèses
				let finalName = productName;
				if (selectedOptions.length > 0) {
					const optionsNames = selectedOptions
						.map((opt) => opt.name)
						.join(", ");
					finalName = `${productName} (${optionsNames})`;
				}

				// Ajouter le produit avec le nom modifié
				editField?.("orderItems", (prev = []) => {
					const safePrev = Array.isArray(prev) ? prev : [];
					// Toujours créer une nouvelle entrée pour chaque ajout avec options
					return [
						...safePrev,
						{
							productId,
							quantity: 1,
							name: finalName,
							options: selectedOptions,
						},
					];
				});

				// Fermer la modale
				setOptionsModalVisible(false);
				setProductForOptions(null);
			},
			[editField, productForOptions]
		);

		// Fonction pour détecter les allergènes conflictuels d'un produit
		const getMatchingAllergens = useCallback(
			(product) => {
				if (!clientAllergens?.length || !product?.allergens?.length) return [];
				return clientAllergens.filter((allergen) => {
					const allergenId = allergen._id || allergen.id;
					return product.allergens.some(
						(prodAllergen) =>
							(prodAllergen._id || prodAllergen.id || prodAllergen) ===
							allergenId
					);
				});
			},
			[clientAllergens]
		);

		const renderProductItem = useCallback(
			({ item: product }) => {
				if (!product?._id) return null;

				// Compter TOUTES les entrées avec ce productId (y compris celles avec options)
				const quantity = safeOrderItems
					.filter((i) => i?.productId === product._id)
					.reduce((sum, i) => sum + (i.quantity || 0), 0);

				// Détecter les allergènes conflictuels
				const matchingAllergens = getMatchingAllergens(product);
				const hasAllergenConflict = matchingAllergens.length > 0;

				return (
					<View
						key={product._id}
						style={[
							productStyles.card,
							quantity > 0 && productStyles.cardSelected,
							hasAllergenConflict && productStyles.cardAllergenWarning,
						]}
					>
						{/* Badge d'alerte allergène */}
						{hasAllergenConflict && (
							<View style={productStyles.allergenWarningBadge}>
								<Text style={productStyles.allergenWarningIcon}>⚠️</Text>
								<Text style={productStyles.allergenWarningText}>
									{matchingAllergens.map((a) => a.icon || "⚠️").join(" ")}
								</Text>
							</View>
						)}
						<TouchableOpacity
							onPress={() => handleProductPress(product)}
							style={productStyles.info}
						>
							<Text style={productStyles.name}>
								{product.name || "Produit"}
							</Text>
							{product.price && (
								<Text style={productStyles.price}>
									{Number(product.price).toFixed(2)}€
								</Text>
							)}
						</TouchableOpacity>
						<View style={productStyles.controls}>
							<TouchableOpacity
								style={productStyles.counterButton}
								onPress={() => handleDecrement(product._id)}
							>
								<Ionicons
									name="remove"
									size={18}
									color={THEME.colors.text.primary}
								/>
							</TouchableOpacity>
							<Text style={productStyles.quantity}>{quantity}</Text>
							<TouchableOpacity
								style={[productStyles.counterButton, productStyles.addButton]}
								onPress={() => handleIncrement(product._id, product)}
							>
								<Ionicons name="add" size={18} color="#FFFFFF" />
							</TouchableOpacity>
						</View>
					</View>
				);
			},
			[
				safeOrderItems,
				handleProductPress,
				handleDecrement,
				handleIncrement,
				getMatchingAllergens,
			]
		);

		const hasSelectedItems = useMemo(
			() => safeOrderItems.some((i) => (i?.quantity || 0) > 0),
			[safeOrderItems]
		);

		const handleNext = useCallback(() => {
			console.log("🎯 handleNext appelé!", {
				hasSelectedItems,
				step,
				nextStep: hasSelectedItems ? (step || 1) + 1 : 3,
			});
			setStep?.(hasSelectedItems ? (step || 1) + 1 : 3);
		}, [hasSelectedItems, step, setStep]);

		// ⭐ Guard clause APRÈS tous les hooks
		if (!activeReservation) {
			return null;
		}

		return (
			<>
				{/* ⭐ Modale d'options */}
				<ProductOptionsModal
					visible={optionsModalVisible}
					onClose={() => {
						setOptionsModalVisible(false);
						setProductForOptions(null);
					}}
					product={productForOptions}
					onValidate={handleValidateOptions}
					theme={theme}
				/>
				<View style={mainStyles.container}>
					{/* Barre de recherche premium */}
					<PremiumSearchBar
						value={searchQuery}
						onChangeText={setSearchQuery}
						onClear={() => setSearchQuery("")}
					/>

					{/* Boutons catégories premium dark avec effet sliding */}
					<View style={mainStyles.categoriesRow}>
						{/* Slider animé (comme Filters.jsx) */}
						{isSliderReady && selectedCategory && (
							<Animated.View
								style={[
									mainStyles.categorySlider,
									{
										transform: [{ translateX: sliderTranslateX }],
										width: sliderWidth,
										backgroundColor: `${getActiveCategoryColor()}25`,
										borderColor: `${getActiveCategoryColor()}60`,
									},
								]}
							/>
						)}
						{categories.map((cat) => {
							const isSelected = selectedCategory === cat.id;
							return (
								<CategoryButton
									key={cat.id}
									cat={cat}
									isSelected={isSelected}
									onPress={() => setSelectedCategory(cat.id)}
									onLayout={(e) => handleCategoryLayout(cat.id, e)}
									THEME={THEME}
									mainStyles={mainStyles}
								/>
							);
						})}
					</View>

					{/* Liste des produits filtrés (recherche ou catégorie) */}
					{selectedCategory === null ? (
						<View style={mainStyles.emptyState}>
							<View style={mainStyles.emptyCard}>
								<View style={mainStyles.emptyIconRow}>
									{categories.map((cat, idx) => (
										<Text
											key={cat.id}
											style={[
												mainStyles.emptyIconItem,
												{ opacity: 0.6 + idx * 0.1 },
											]}
										>
											{cat.emoji}
										</Text>
									))}
								</View>
								<View style={mainStyles.emptyDivider} />
								<Text style={mainStyles.emptyTitle}>
									Sélectionnez une catégorie
								</Text>
								<Text style={mainStyles.emptySubtitle}>
									pour afficher les produits disponibles
								</Text>
							</View>
						</View>
					) : (
						<FlatList
							data={filteredProducts}
							renderItem={renderProductItem}
							keyExtractor={(item) => item?._id || Math.random().toString()}
							style={{
								flex: 1,
								marginBottom: 200,
								borderStyle: "solid",
								borderWidth: 0.5,
								borderColor: THEME.colors.border.default,
								borderRadius: THEME.radius.lg,
								padding: THEME.spacing.xs,
							}}
							ListEmptyComponent={
								<View style={mainStyles.emptyList}>
									<Ionicons
										name="restaurant-outline"
										size={48}
										color={THEME.colors.text.muted}
									/>
									<Text style={mainStyles.emptyListText}>
										Aucun produit dans cette catégorie
									</Text>
								</View>
							}
						/>
					)}

					{/* ⭐ Bouton Suivant en dehors du scroll, toujours en bas */}
					{hasSelectedItems && (
						<TouchableOpacity
							onPress={handleNext}
							style={mainStyles.nextButton}
							activeOpacity={0.8}
						>
							<LinearGradient
								colors={[
									THEME.colors.primary.amber,
									THEME.colors.primary.amberDark,
								]}
								style={mainStyles.nextButtonGradient}
							>
								<Text style={mainStyles.nextButtonText}>Suivant</Text>
								<Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
							</LinearGradient>
						</TouchableOpacity>
					)}
				</View>
			</>
		);
	}
);

ProductSelection.displayName = "ProductSelection";

// ═══════════════════════════════════════════════════════════════════════
// 🎨 Premium Dark Styles - Products
// ═══════════════════════════════════════════════════════════════════════
const createProductStyles = (THEME) =>
	StyleSheet.create({
		card: {
			backgroundColor: THEME.colors.background.card,
			borderRadius: THEME.radius.lg,
			borderWidth: 1,
			borderColor: THEME.colors.border.default,
			padding: THEME.spacing.lg,
			marginBottom: THEME.spacing.sm,
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "space-between",
		},
		cardSelected: {
			backgroundColor: "rgba(245, 158, 11, 0.1)",
			borderColor: THEME.colors.primary.amber,
		},
		cardAllergenWarning: {
			borderColor: "#EF4444",
			borderWidth: 2,
			backgroundColor: "rgba(239, 68, 68, 0.08)",
		},
		allergenWarningBadge: {
			position: "absolute",
			top: -8,
			right: 8,
			flexDirection: "row",
			alignItems: "center",
			backgroundColor: "#EF4444",
			paddingHorizontal: 8,
			paddingVertical: 3,
			borderRadius: 12,
			gap: 4,
			shadowColor: "#EF4444",
			shadowOffset: { width: 0, height: 2 },
			shadowOpacity: 0.3,
			shadowRadius: 4,
			elevation: 4,
			zIndex: 10,
		},
		allergenWarningIcon: {
			fontSize: 12,
		},
		allergenWarningText: {
			fontSize: 11,
			color: "#FFFFFF",
			fontWeight: "600",
		},
		info: {
			flex: 1,
		},
		name: {
			fontSize: 15,
			fontWeight: "600",
			color: THEME.colors.text.primary,
			marginBottom: 4,
		},
		price: {
			fontSize: 14,
			fontWeight: "700",
			color: THEME.colors.status.success,
		},
		controls: {
			flexDirection: "row",
			alignItems: "center",
			gap: THEME.spacing.sm,
		},
		counterButton: {
			width: 36,
			height: 36,
			borderRadius: 18,
			backgroundColor: THEME.colors.background.elevated,
			alignItems: "center",
			justifyContent: "center",
			borderWidth: 1,
			borderColor: THEME.colors.border.default,
		},
		addButton: {
			backgroundColor: THEME.colors.primary.amber,
			borderColor: THEME.colors.primary.amber,
		},
		quantity: {
			fontSize: 16,
			fontWeight: "700",
			color: THEME.colors.text.primary,
			minWidth: 30,
			textAlign: "center",
		},
	});

// ═══════════════════════════════════════════════════════════════════════
// 🎨 Premium Dark Styles - Main Container
// ═══════════════════════════════════════════════════════════════════════
const createMainStyles = (THEME) =>
	StyleSheet.create({
		container: {
			flex: 1,
			paddingLeft: THEME.spacing.md,
		},
		categoriesRow: {
			flexDirection: "row",
			marginBottom: THEME.spacing.sm,
			gap: THEME.spacing.xs,
			position: "relative",
			backgroundColor: THEME.colors.background.card,
			borderRadius: THEME.radius["2xl"],
			padding: THEME.spacing.xs,
			borderWidth: 1,
			borderColor: THEME.colors.border.default,
		},
		categorySlider: {
			position: "absolute",
			top: 0,
			bottom: 0,
			left: 0,
			borderRadius: THEME.radius.xl,
			borderWidth: 2,
			shadowColor: "#F59E0B",
			shadowOffset: { width: 0, height: 0 },
			shadowOpacity: 0.4,
			shadowRadius: 12,
			elevation: 6,
			zIndex: 0,
		},
		categoryButton: {
			flex: 1,
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "center",
			paddingVertical: THEME.spacing.md,
			paddingHorizontal: THEME.spacing.sm,
			borderRadius: THEME.radius.lg,
			borderWidth: 1.5,
			gap: THEME.spacing.xs,
			zIndex: 1,
		},
		categoryEmoji: {
			fontSize: 18,
		},
		categoryLabel: {
			fontSize: 13,
			fontWeight: "600",
		},
		emptyState: {
			justifyContent: "center",
			alignItems: "center",
			paddingHorizontal: THEME.spacing.lg,
			paddingVertical: THEME.spacing.xl,
		},
		emptyCard: {
			backgroundColor: THEME.colors.background.card,
			borderRadius: THEME.radius.lg,
			borderWidth: 1,
			borderColor: THEME.colors.border.default,
			paddingVertical: THEME.spacing.xl,
			paddingHorizontal: THEME.spacing.lg,
			alignItems: "center",
			width: "100%",
			maxWidth: 320,
		},
		emptyIconRow: {
			flexDirection: "row",
			justifyContent: "center",
			gap: THEME.spacing.md,
			marginBottom: THEME.spacing.md,
		},
		emptyIconItem: {
			fontSize: 28,
		},
		emptyDivider: {
			width: 40,
			height: 2,
			backgroundColor: THEME.colors.primary.amber,
			borderRadius: 1,
			marginBottom: THEME.spacing.md,
			opacity: 0.6,
		},
		emptyTitle: {
			fontSize: 15,
			fontWeight: "600",
			color: THEME.colors.text.primary,
			marginBottom: THEME.spacing.xs,
			textAlign: "center",
		},
		emptySubtitle: {
			fontSize: 13,
			color: THEME.colors.text.muted,
			textAlign: "center",
		},
		emptyList: {
			alignItems: "center",
			paddingVertical: THEME.spacing.xl * 2,
		},
		emptyListText: {
			color: THEME.colors.text.muted,
			textAlign: "center",
			marginTop: THEME.spacing.md,
			fontSize: 14,
		},
		nextButton: {
			position: "absolute",
			bottom: 138, // Au-dessus des miniatures
			left: THEME.spacing.md,
			right: THEME.spacing.md,
			borderRadius: THEME.radius.lg,
			overflow: "hidden",
			zIndex: 10,
		},
		nextButtonGradient: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "center",
			paddingVertical: THEME.spacing.lg,
			gap: THEME.spacing.sm,
		},
		nextButtonText: {
			fontSize: 16,
			fontWeight: "700",
			color: "#FFFFFF",
		},
	});

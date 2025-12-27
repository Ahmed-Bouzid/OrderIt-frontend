import React, { useCallback, useMemo, useState } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons } from "@expo/vector-icons";
import {
	View,
	Text,
	TouchableOpacity,
	FlatList,
	TextInput,
} from "react-native";
import styles from "../../styles";

// Barre de recherche premium (copiée de client-public)
const PremiumSearchBar = ({ value, onChangeText, onClear }) => {
	const [isFocused, setIsFocused] = useState(false);
	return (
		<View
			style={[
				{
					marginBottom: 20,
					borderRadius: 16,
					borderWidth: 2,
					overflow: "hidden",
					borderColor: isFocused
						? "rgba(102, 126, 234, 0.5)"
						: "rgba(0,0,0,0.08)",
				},
			]}
		>
			<LinearGradient
				colors={
					isFocused
						? ["rgba(102,126,234,0.1)", "rgba(118,75,162,0.05)"]
						: ["#fff", "#fff"]
				}
				style={{
					flexDirection: "row",
					alignItems: "center",
					paddingHorizontal: 16,
					paddingVertical: 4,
				}}
			>
				<MaterialIcons
					name="search"
					size={22}
					color={isFocused ? "#667eea" : "#999"}
					style={{ marginRight: 12 }}
				/>
				<TextInput
					style={{
						flex: 1,
						paddingVertical: 14,
						fontSize: 16,
						color: "#222",
						fontWeight: "500",
					}}
					placeholder="Rechercher un produit..."
					placeholderTextColor="#999"
					value={value}
					onChangeText={onChangeText}
					onFocus={() => setIsFocused(true)}
					onBlur={() => setIsFocused(false)}
					returnKeyType="search"
				/>
				{value.length > 0 && (
					<TouchableOpacity onPress={onClear} style={{ padding: 4 }}>
						<View
							style={{
								backgroundColor: "#667eea",
								borderRadius: 12,
								padding: 4,
							}}
						>
							<MaterialIcons name="close" size={16} color="#fff" />
						</View>
					</TouchableOpacity>
				)}
			</LinearGradient>
		</View>
	);
};

const normalize = (str) =>
	(str || "")
		.toLowerCase()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "");

const categories = [
	{
		id: "boisson",
		label: "Boissons",
		emoji: "🥤",
		color: ["#a955ff", "#ea51ff"],
	},
	{
		id: "Entrée",
		label: "Entrées",
		emoji: "🥗",
		color: ["#80FF72", "#7EE8FA"],
	},
	{ id: "plat", label: "Plats", emoji: "🍝", color: ["#FF9966", "#FF5E62"] },
	{
		id: "dessert",
		label: "Desserts",
		emoji: "🍰",
		color: ["#f7971e", "#ffd200"],
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
	}) => {
		// Catégorie sélectionnée (par défaut la première)
		const [selectedCategory, setSelectedCategory] = useState(null);
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
		const safeTheme = useMemo(
			() => theme || { textColor: "#000", backgroundColor: "#fff" },
			[theme]
		);
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
				editField?.("orderItems", (prev = []) =>
					(Array.isArray(prev) ? prev : []).map((i) =>
						i?.productId === productId
							? { ...i, quantity: Math.max(0, (i.quantity || 0) - 1) }
							: i
					)
				);
			},
			[editField]
		);

		const handleIncrement = useCallback(
			(productId) => {
				if (!productId) return;
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
			[editField]
		);

		const renderProductItem = useCallback(
			({ item: product }) => {
				if (!product?._id) return null;

				const item = safeOrderItems.find((i) => i?.productId === product._id);
				const quantity = item?.quantity ?? 0;

				return (
					<View
						key={product._id}
						style={[
							{
								backgroundColor: "rgba(255,255,255,0.22)",
								borderRadius: 22,
								borderWidth: 1.5,
								borderColor: "rgba(255,255,255,0.55)",
								shadowColor: "#b6b6e0",
								shadowOpacity: 0.13,
								shadowRadius: 18,
								shadowOffset: { width: 0, height: 8 },
								overflow: "hidden",
								backdropFilter: "blur(14px)", // Web only
								padding: 14,
								marginHorizontal: 2,
							},
							styles.productRow,
							quantity > 0 && {
								backgroundColor:
									safeTheme.backgroundColor === "#1a1a1a"
										? "#2a4a4a"
										: "#e0f7fa",
							},
						]}
					>
						<TouchableOpacity
							onPress={() => handleProductPress(product)}
							style={{ flex: 1 }}
						>
							<Text style={[styles.value, { color: safeTheme.textColor }]}>
								{product.name || "Produit"}
							</Text>
						</TouchableOpacity>
						<View style={{ flexDirection: "row", alignItems: "center" }}>
							<TouchableOpacity
								style={styles.counterButton}
								onPress={() => handleDecrement(product._id)}
							>
								<Text>-</Text>
							</TouchableOpacity>
							<Text
								style={[styles.quantityText, { color: safeTheme.textColor }]}
							>
								{quantity}
							</Text>
							<TouchableOpacity
								style={styles.counterButton}
								onPress={() => handleIncrement(product._id)}
							>
								<Text>+</Text>
							</TouchableOpacity>
						</View>
					</View>
				);
			},
			[
				safeOrderItems,
				safeTheme,
				handleProductPress,
				handleDecrement,
				handleIncrement,
			]
		);

		const hasSelectedItems = useMemo(
			() => safeOrderItems.some((i) => (i?.quantity || 0) > 0),
			[safeOrderItems]
		);

		const handleNext = useCallback(() => {
			setStep?.(hasSelectedItems ? (step || 1) + 1 : 3);
		}, [hasSelectedItems, step, setStep]);

		// ⭐ Guard clause APRÈS tous les hooks
		if (!activeReservation) {
			return null;
		}

		return (
			<View style={{ width: "50%", paddingLeft: 10, flex: 1 }}>
				{/* Barre de recherche premium au-dessus des catégories */}
				<PremiumSearchBar
					value={searchQuery}
					onChangeText={setSearchQuery}
					onClear={() => setSearchQuery("")}
				/>
				{/* Barre de boutons catégories glass/néon/emoji (sans animation) */}
				<View style={{ flexDirection: "row", marginBottom: 16 }}>
					{categories.map((cat, idx) => (
						<View
							key={cat.id}
							style={{ marginRight: idx !== categories.length - 1 ? 10 : 0 }}
						>
							<TouchableOpacity
								onPress={() => setSelectedCategory(cat.id)}
								activeOpacity={0.85}
								style={{
									flexDirection: "row",
									alignItems: "center",
									backgroundColor:
										selectedCategory === cat.id
											? "rgba(255,255,255,0.35)"
											: "rgba(255,255,255,0.18)",
									borderRadius: 18,
									borderWidth: selectedCategory === cat.id ? 2 : 1.5,
									borderColor:
										selectedCategory === cat.id ? cat.color[0] : cat.color[1],
									paddingHorizontal: 18,
									paddingVertical: 10,
									minWidth: 70,
									shadowColor: cat.color[0],
									shadowOpacity: selectedCategory === cat.id ? 0.35 : 0.12,
									shadowRadius: selectedCategory === cat.id ? 16 : 6,
									shadowOffset: { width: 0, height: 4 },
									overflow: "hidden",
								}}
							>
								<Text style={{ fontSize: 22, marginRight: 8 }}>
									{cat.emoji}
								</Text>
								<Text
									style={{
										color: selectedCategory === cat.id ? cat.color[0] : "#333",
										fontWeight: selectedCategory === cat.id ? "700" : "500",
										fontSize: 16,
									}}
								>
									{cat.label}
								</Text>
							</TouchableOpacity>
						</View>
					))}
				</View>
				{/* Liste des produits filtrés (recherche ou catégorie) */}
				{/* Affichage d'une illustration et d'un message si aucune catégorie n'est sélectionnée */}
				{selectedCategory === null ? (
					<View
						style={{
							flex: 1,
							justifyContent: "center",
							alignItems: "center",
							paddingHorizontal: 30,
							paddingBottom: 100,
						}}
					>
						<LinearGradient
							colors={["rgba(2, 25, 128, 0.1)", "rgba(120, 115, 125, 0.05)"]}
							style={{
								padding: 40,
								borderRadius: 24,
								alignItems: "center",
								width: "95%",
								height: "95%",
								maxWidth: 512,
								maxHeight: 512,
								justifyContent: "center",
							}}
						>
							<Text
								style={{
									fontSize: 60,
									textAlign: "center",
								}}
							>
								✨
							</Text>
							<Text
								style={{
									fontSize: 20,
									fontWeight: "700",
									color: "#1a1a2e",
									marginBottom: 80,
									textAlign: "center",
								}}
							>
								Choisissez une catégorie
							</Text>
							<Text
								style={{
									fontSize: 14,
									color: "#666",
									textAlign: "center",
									marginBottom: 20,
								}}
							>
								Explorez notre sélection de délices
							</Text>
						</LinearGradient>
					</View>
				) : (
					<FlatList
						data={filteredProducts}
						renderItem={renderProductItem}
						keyExtractor={(item) => item?._id || Math.random().toString()}
						style={{ flex: 1 }}
						contentContainerStyle={{ paddingBottom: 24 }}
						ListEmptyComponent={
							<Text
								style={{ color: "#888", textAlign: "center", marginTop: 24 }}
							>
								Aucun produit dans cette catégorie
							</Text>
						}
					/>
				)}
				<TouchableOpacity
					onPress={handleNext}
					style={[styles.nextButton, { marginTop: 20 }]}
				>
					<Text style={styles.buttonText}>
						{hasSelectedItems ? "➡️ Suivant" : "TOOOTAL"}
					</Text>
				</TouchableOpacity>
			</View>
		);
	}
);

ProductSelection.displayName = "ProductSelection";

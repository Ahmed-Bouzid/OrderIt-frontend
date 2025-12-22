// components/elements/ActivityComponents/ProductSelection.jsx
import React, { useCallback, useMemo } from "react";
import {
	View,
	Text,
	TouchableOpacity,
	ScrollView,
	FlatList,
} from "react-native";
import styles from "../../styles";

const normalize = (str) =>
	(str || "")
		.toLowerCase()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "");

const categories = ["boisson", "Entrée", "plat", "dessert"];

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
		// ⭐ Valeurs sécurisées (memoizées pour éviter les changements de référence)
		const safeProducts = useMemo(
			() => (Array.isArray(products) ? products : []),
			[products]
		);
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

		const renderCategory = useCallback(
			({ item: category }) => {
				if (!category) return null;

				const categoryProducts = safeProducts.filter(
					(p) => p && normalize(p.category) === normalize(category)
				);

				if (categoryProducts.length === 0) return null;

				return (
					<View key={category} style={{ marginBottom: 15 }}>
						<Text
							style={[styles.categoryTitle, { color: safeTheme.textColor }]}
						>
							{category.charAt(0).toUpperCase() + category.slice(1)}s
						</Text>
						<FlatList
							data={categoryProducts}
							renderItem={renderProductItem}
							keyExtractor={(item) => item?._id || Math.random().toString()}
							scrollEnabled={false}
						/>
					</View>
				);
			},
			[safeProducts, safeTheme, renderProductItem]
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
			<ScrollView style={{ width: "50%", paddingLeft: 10 }}>
				<FlatList
					data={categories}
					renderItem={renderCategory}
					keyExtractor={(item) => item}
					scrollEnabled={false}
				/>
				<TouchableOpacity
					onPress={handleNext}
					style={[styles.nextButton, { marginTop: 20 }]}
				>
					<Text style={styles.buttonText}>
						{hasSelectedItems ? "➡️ Suivant" : "TOTAL"}
					</Text>
				</TouchableOpacity>
			</ScrollView>
		);
	}
);

ProductSelection.displayName = "ProductSelection";

/**
 * 🏪 MenuPickerModal.jsx — Sélection plats (mode Comptoir)
 *
 * Modal pour ajouter des plats au panier
 * Réutilise la structure menu (catégories Plats/Boissons/Desserts)
 */

import React, { useState, useMemo, useEffect } from "react";
import {
	Modal,
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	ScrollView,
	Dimensions,
	ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../../hooks/useTheme";
import useCounterCartStore from "../../../src/stores/useCounterCartStore";
import counterService from "../../../services/counterService";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

const MenuPickerModal = ({ visible, onClose, tableId, restaurantId }) => {
	const THEME = useTheme();
	const [activeCategory, setActiveCategory] = useState(null);
	const [products, setProducts] = useState([]);
	const [isLoading, setIsLoading] = useState(false);

	const addItem = useCounterCartStore((state) => state.addItem);
	const setQty = useCounterCartStore((state) => state.setQty);
	const removeItem = useCounterCartStore((state) => state.removeItem);
	// Réactif : carts[tableId] se met à jour à chaque ajout
	// ✅ useMemo pour éviter nouvelle référence [] → boucle infinie
	const rawCart = useCounterCartStore((state) => state.carts[tableId]);
	const cart = useMemo(() => rawCart || [], [rawCart]);
	const cartTotal = useMemo(
		() => cart.reduce((sum, i) => sum + i.price * i.quantity, 0),
		[cart],
	);

	const dynamicStyles = useMemo(
		() => createStyles(THEME),
		[THEME],
	);

	// Charger les produits réels au montage
	useEffect(() => {
		if (!visible || !restaurantId) return;
		let cancelled = false;
		const load = async () => {
			setIsLoading(true);
			try {
				const data = await counterService.getProducts(restaurantId);
				if (!cancelled) {
					setProducts(data);
					// Sélectionner automatiquement la première catégorie
					if (data.length > 0) {
						const firstCat = data[0].category ?? "autre";
						setActiveCategory(firstCat);
					}
				}
			} finally {
				if (!cancelled) setIsLoading(false);
			}
		};
		load();
		return () => { cancelled = true; };
	}, [visible, restaurantId]);

	// Catégories dynamiques déduites des produits
	const categories = useMemo(() => {
		const seen = new Set();
		const cats = [];
		products.forEach((p) => {
			const cat = p.category ?? "autre";
			if (!seen.has(cat)) {
				seen.add(cat);
				cats.push({ id: cat, label: cat.charAt(0).toUpperCase() + cat.slice(1) });
			}
		});
		return cats;
	}, [products]);

	// Produits de la catégorie active
	const visibleProducts = useMemo(
		() => products.filter((p) => (p.category ?? "autre") === activeCategory),
		[products, activeCategory],
	);

	const handleAddItem = (item) => {
		addItem(tableId, {
			productId: item._id ?? item.id,
			name: item.name,
			price: item.price,
			category: item.category ?? "autre",
			quantity: 1,
		});
	};

	if (!visible) return null;

	return (
		<Modal
			visible={visible}
			transparent
			animationType="fade"
			onRequestClose={onClose}
		>
			<View style={dynamicStyles.overlay}>
				<View style={dynamicStyles.sheet}>
					{/* Header */}
					<View style={dynamicStyles.header}>
						<TouchableOpacity
							onPress={onClose}
							style={dynamicStyles.closeButton}
						>
							<Ionicons
								name="close"
								size={22}
								color="#94A3B8"
							/>
						</TouchableOpacity>
						<Text style={dynamicStyles.headerTitle}>
							Ajouter des plats
						</Text>
						<View style={dynamicStyles.cartBadge}>
							<Text style={dynamicStyles.cartBadgeText}>
								🛒 {cartTotal.toFixed(0)}€
							</Text>
						</View>
					</View>

					{/* Tabs catégories */}
					<View style={dynamicStyles.categoryTabs}>
						{categories.map((cat) => (
							<TouchableOpacity
								key={cat.id}
								onPress={() => setActiveCategory(cat.id)}
								style={[
									dynamicStyles.categoryTab,
									activeCategory === cat.id &&
										dynamicStyles.categoryTabActive,
								]}
							>
								<Text
									style={[
										dynamicStyles.categoryTabText,
										activeCategory === cat.id &&
											dynamicStyles.categoryTabTextActive,
									]}
								>
									{cat.label}
								</Text>
							</TouchableOpacity>
						))}
					</View>

					{/* Menu items */}
					<ScrollView style={dynamicStyles.content}>
						{isLoading ? (
							<ActivityIndicator
								size="large"
								color={THEME.colors.primary.amber}
								style={{ marginTop: 32 }}
							/>
						) : visibleProducts.length === 0 ? (
							<Text style={dynamicStyles.emptyText}>
								Aucun produit dans cette catégorie
							</Text>
						) : (
							visibleProducts.map((item) => (
								<TouchableOpacity
									key={item._id ?? item.id}
									onPress={() => handleAddItem(item)}
									style={dynamicStyles.menuItem}
								>
									<View style={dynamicStyles.menuItemContent}>
										<Text style={dynamicStyles.menuItemName}>
											{item.name}
										</Text>
										<Text style={dynamicStyles.menuItemPrice}>
											{item.price?.toFixed(2)}€
										</Text>
									</View>
									<View style={dynamicStyles.addButton}>
										<Ionicons
											name="add"
											size={24}
											color={THEME.colors.primary.amber}
										/>
									</View>
								</TouchableOpacity>
							))
						)}
					</ScrollView>

					{/* Cart summary */}
					{cart.length > 0 && (
						<View style={dynamicStyles.cartSummary}>
							<ScrollView
								style={dynamicStyles.cartScroll}
								showsVerticalScrollIndicator={false}
							>
								{cart.map((item) => (
									<View key={item.tempId} style={dynamicStyles.cartRow}>
										<Text
											style={dynamicStyles.cartItemName}
											numberOfLines={1}
											ellipsizeMode="tail"
										>
											{item.name}
										</Text>
										<View style={dynamicStyles.cartItemControls}>
											<TouchableOpacity
												onPress={() => setQty(tableId, item.tempId, item.quantity - 1)}
												style={dynamicStyles.qtyBtn}
											>
												<Ionicons name="remove" size={14} color="#94A3B8" />
											</TouchableOpacity>
											<Text style={dynamicStyles.qtyValue}>{item.quantity}</Text>
											<TouchableOpacity
												onPress={() => setQty(tableId, item.tempId, item.quantity + 1)}
												style={dynamicStyles.qtyBtn}
											>
												<Ionicons name="add" size={14} color="#94A3B8" />
											</TouchableOpacity>
										</View>
										<Text style={dynamicStyles.cartItemPrice}>
											{(item.price * item.quantity).toFixed(2)}€
										</Text>
										<TouchableOpacity
											onPress={() => removeItem(tableId, item.tempId)}
											style={dynamicStyles.deleteBtn}
										>
											<Ionicons name="trash-outline" size={14} color="#EF4444" />
										</TouchableOpacity>
									</View>
								))}
							</ScrollView>
							<View style={dynamicStyles.cartTotal}>
								<Text style={dynamicStyles.cartTotalLabel}>
									{cart.reduce((s, i) => s + i.quantity, 0)} article{cart.reduce((s, i) => s + i.quantity, 0) > 1 ? "s" : ""}
								</Text>
								<Text style={dynamicStyles.cartTotalAmount}>
									{cartTotal.toFixed(2)} €
								</Text>
							</View>
						</View>
					)}

					{/* Footer */}
					<View style={dynamicStyles.footer}>
						<TouchableOpacity
							onPress={onClose}
							style={[
								dynamicStyles.footerButton,
								cart.length === 0 && dynamicStyles.footerButtonDisabled,
							]}
							disabled={cart.length === 0}
						>
							<Text style={[
								dynamicStyles.footerButtonText,
								cart.length === 0 && dynamicStyles.footerButtonTextDisabled,
							]}>
								{cart.length === 0
									? "Aucun plat sélectionné"
									: `✓ Valider ${cart.reduce((s, i) => s + i.quantity, 0)} plat${cart.reduce((s, i) => s + i.quantity, 0) > 1 ? "s" : ""} — ${cartTotal.toFixed(2)} €`
								}
							</Text>
						</TouchableOpacity>
					</View>
				</View>
			</View>
		</Modal>
	);
};

const createStyles = (THEME) =>
	StyleSheet.create({
		// Overlay centré — identique TableDetailModal
		overlay: {
			flex: 1,
			backgroundColor: "rgba(0,0,0,0.70)",
			justifyContent: "center",
			alignItems: "center",
			paddingHorizontal: 16,
			paddingVertical: 12,
		},
		sheet: {
			backgroundColor: "#1E293B",
			borderRadius: 20,
			width: "100%",
			maxWidth: 520,
			flex: 0,
			flexShrink: 1,
			minHeight: "78%",
			borderWidth: 1,
			borderColor: "rgba(255,255,255,0.08)",
			overflow: "hidden",
		},

		header: {
			flexDirection: "row",
			alignItems: "center",
			paddingHorizontal: 16,
			paddingVertical: 14,
			borderBottomWidth: 1,
			borderBottomColor: "rgba(255,255,255,0.07)",
			gap: 12,
		},

		closeButton: {
			padding: 4,
		},

		headerTitle: {
			flex: 1,
			fontSize: 16,
			fontWeight: "700",
			color: "#F8FAFC",
		},

		cartBadge: {
			paddingHorizontal: 10,
			paddingVertical: 5,
			backgroundColor: THEME.colors.primary.amber,
			borderRadius: 6,
		},

		cartBadgeText: {
			fontSize: 12,
			fontWeight: "700",
			color: "#0F172A",
		},

		categoryTabs: {
			flexDirection: "row",
			paddingHorizontal: 16,
			paddingVertical: 10,
			gap: 8,
			borderBottomWidth: 1,
			borderBottomColor: "rgba(255,255,255,0.07)",
			flexWrap: "wrap",
		},

		categoryTab: {
			paddingVertical: 7,
			paddingHorizontal: 14,
			borderRadius: 6,
			backgroundColor: "rgba(255,255,255,0.05)",
			borderWidth: 1,
			borderColor: "rgba(255,255,255,0.1)",
		},

		categoryTabActive: {
			backgroundColor: THEME.colors.primary.amber,
			borderColor: THEME.colors.primary.amber,
		},

		categoryTabText: {
			fontSize: 12,
			fontWeight: "600",
			color: "#94A3B8",
			textAlign: "center",
		},

		categoryTabTextActive: {
			color: "#0F172A",
		},

		content: {
			flex: 1,
			paddingHorizontal: 16,
			paddingVertical: 12,
		},

		emptyText: {
			fontSize: 13,
			color: "#64748B",
			fontStyle: "italic",
			paddingVertical: 24,
			textAlign: "center",
		},

		menuItem: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
			paddingVertical: 12,
			paddingHorizontal: 12,
			marginBottom: 8,
			backgroundColor: "rgba(255,255,255,0.04)",
			borderRadius: 8,
			borderWidth: 1,
			borderColor: "rgba(255,255,255,0.07)",
		},

		menuItemContent: {
			flex: 1,
		},

		menuItemName: {
			fontSize: 14,
			fontWeight: "600",
			color: "#F8FAFC",
			marginBottom: 3,
		},

		menuItemPrice: {
			fontSize: 12,
			color: "#94A3B8",
		},

		addButton: {
			paddingHorizontal: 8,
		},

		footer: {
			paddingHorizontal: 16,
			paddingVertical: 14,
			borderTopWidth: 1,
			borderTopColor: "rgba(255,255,255,0.07)",
		},

		// Cart summary
		cartSummary: {
			borderTopWidth: 1,
			borderTopColor: "rgba(255,255,255,0.07)",
			backgroundColor: "rgba(0,0,0,0.25)",
			paddingHorizontal: 16,
			paddingTop: 10,
			paddingBottom: 0,
		},

		cartScroll: {
			maxHeight: SCREEN_HEIGHT * 0.18,
		},

		cartRow: {
			flexDirection: "row",
			alignItems: "center",
			gap: 8,
			paddingVertical: 6,
			borderBottomWidth: 1,
			borderBottomColor: "rgba(255,255,255,0.05)",
		},

		cartItemName: {
			flex: 1,
			fontSize: 13,
			fontWeight: "500",
			color: "#E2E8F0",
		},

		cartItemControls: {
			flexDirection: "row",
			alignItems: "center",
			gap: 4,
		},

		qtyBtn: {
			width: 24,
			height: 24,
			borderRadius: 4,
			backgroundColor: "rgba(255,255,255,0.07)",
			alignItems: "center",
			justifyContent: "center",
		},

		qtyValue: {
			fontSize: 13,
			fontWeight: "700",
			color: "#F8FAFC",
			minWidth: 22,
			textAlign: "center",
		},

		cartItemPrice: {
			fontSize: 13,
			fontWeight: "600",
			color: THEME.colors.primary.amber,
			minWidth: 52,
			textAlign: "right",
		},

		deleteBtn: {
			width: 24,
			height: 24,
			alignItems: "center",
			justifyContent: "center",
		},

		cartTotal: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
			paddingVertical: 10,
		},

		cartTotalLabel: {
			fontSize: 12,
			fontWeight: "600",
			color: "#64748B",
			textTransform: "uppercase",
			letterSpacing: 0.5,
		},

		cartTotalAmount: {
			fontSize: 16,
			fontWeight: "800",
			color: "#F8FAFC",
		},

		footerButton: {
			paddingVertical: 13,
			paddingHorizontal: 16,
			backgroundColor: THEME.colors.primary.amber,
			borderRadius: 10,
		},

		footerButtonDisabled: {
			backgroundColor: "rgba(255,255,255,0.06)",
		},

		footerButtonText: {
			fontSize: 14,
			fontWeight: "700",
			color: "#0F172A",
			textAlign: "center",
		},

		footerButtonTextDisabled: {
			color: "#475569",
		},
	});

export default MenuPickerModal;

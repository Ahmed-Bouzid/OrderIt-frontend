/**
 * 🏪 MenuPickerModal.jsx — Sélection plats (mode Comptoir)
 *
 * Modal pour ajouter des plats au panier
 * Réutilise la structure menu (catégories Plats/Boissons/Desserts)
 */

import React, { useState, useMemo } from "react";
import {
	Modal,
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	ScrollView,
	Dimensions,
} from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../../hooks/useTheme";
import useCounterCartStore from "../../../src/stores/useCounterCartStore";

const MenuPickerModal = ({ visible, onClose, tableId }) => {
	const THEME = useTheme();
	const [activeCategory, setActiveCategory] = useState("plat");

	const addItem = useCounterCartStore((state) => state.addItem);
	const cartTotal = useCounterCartStore((state) =>
		state.getCartTotal(tableId),
	);

	const dynamicStyles = useMemo(
		() => createStyles(THEME),
		[THEME],
	);

	// Fake menu items par catégorie (à remplacer par des vrais produits)
	const menuItems = {
		plat: [
			{
				id: "p1",
				name: "Burger Maison",
				price: 11,
				category: "plat",
			},
			{
				id: "p2",
				name: "Pizza 4 fromages",
				price: 14,
				category: "plat",
			},
			{
				id: "p3",
				name: "Salade César",
				price: 9.5,
				category: "plat",
			},
			{
				id: "p4",
				name: "Pâtes carbonara",
				price: 12,
				category: "plat",
			},
		],
		boisson: [
			{
				id: "b1",
				name: "Coca 33cl",
				price: 3,
				category: "boisson",
			},
			{
				id: "b2",
				name: "Eau plate 50cl",
				price: 2,
				category: "boisson",
			},
			{
				id: "b3",
				name: "Jus d'orange",
				price: 3.5,
				category: "boisson",
			},
		],
		dessert: [
			{
				id: "d1",
				name: "Tiramisu",
				price: 6,
				category: "dessert",
			},
			{
				id: "d2",
				name: "Chocolate cake",
				price: 5.5,
				category: "dessert",
			},
			{
				id: "d3",
				name: "Crème brûlée",
				price: 7,
				category: "dessert",
			},
		],
	};

	const categories = [
		{ id: "plat", label: "🍔 Plats", icon: "restaurant-outline" },
		{ id: "boisson", label: "🥤 Boissons", icon: "wine-outline" },
		{ id: "dessert", label: "🍰 Desserts", icon: "ice-cream-outline" },
	];

	const handleAddItem = (item) => {
		addItem(tableId, {
			productId: item.id,
			name: item.name,
			price: item.price,
			category: item.category,
			quantity: 1,
		});
	};

	if (!visible) return null;

	return (
		<Modal
			visible={visible}
			transparent
			animationType="slide"
			onRequestClose={onClose}
		>
			<BlurView intensity={90} style={dynamicStyles.blur}>
				<View style={dynamicStyles.container}>
					{/* Header */}
					<LinearGradient
						colors={[
							THEME.colors.background.elevated,
							THEME.colors.background.dark,
						]}
						start={{ x: 0, y: 0 }}
						end={{ x: 1, y: 1 }}
						style={dynamicStyles.header}
					>
						<TouchableOpacity
							onPress={onClose}
							style={dynamicStyles.closeButton}
						>
							<Ionicons
								name="chevron-back"
								size={28}
								color={THEME.colors.primary.amber}
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
					</LinearGradient>

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
						{menuItems[activeCategory].map((item) => (
							<TouchableOpacity
								key={item.id}
								onPress={() => handleAddItem(item)}
								style={dynamicStyles.menuItem}
							>
								<View style={dynamicStyles.menuItemContent}>
									<Text style={dynamicStyles.menuItemName}>
										{item.name}
									</Text>
									<Text style={dynamicStyles.menuItemPrice}>
										{item.price.toFixed(2)}€
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
						))}
					</ScrollView>

					{/* Footer */}
					<View style={dynamicStyles.footer}>
						<TouchableOpacity
							onPress={onClose}
							style={dynamicStyles.footerButton}
						>
							<Text style={dynamicStyles.footerButtonText}>
								✓ Valider et retour à la table
							</Text>
						</TouchableOpacity>
					</View>
				</View>
			</BlurView>
		</Modal>
	);
};

const createStyles = (THEME) =>
	StyleSheet.create({
		blur: {
			flex: 1,
			justifyContent: "flex-end",
		},

		container: {
			maxHeight: "85%",
			backgroundColor: THEME.colors.background.dark,
			borderTopLeftRadius: 20,
			borderTopRightRadius: 20,
			flexDirection: "column",
		},

		header: {
			flexDirection: "row",
			alignItems: "center",
			paddingHorizontal: 16,
			paddingVertical: 12,
			gap: 12,
		},

		closeButton: {
			padding: 8,
		},

		headerTitle: {
			flex: 1,
			fontSize: 16,
			fontWeight: "700",
			color: THEME.colors.text.primary,
		},

		cartBadge: {
			paddingHorizontal: 12,
			paddingVertical: 6,
			backgroundColor: THEME.colors.primary.amber,
			borderRadius: 6,
		},

		cartBadgeText: {
			fontSize: 12,
			fontWeight: "700",
			color: THEME.colors.background.dark,
		},

		categoryTabs: {
			flexDirection: "row",
			paddingHorizontal: 16,
			paddingVertical: 8,
			gap: 8,
			borderBottomWidth: 1,
			borderBottomColor: THEME.colors.border.subtle,
		},

		categoryTab: {
			flex: 1,
			paddingVertical: 8,
			paddingHorizontal: 12,
			borderRadius: 6,
			backgroundColor: "transparent",
			borderWidth: 1,
			borderColor: THEME.colors.border.subtle,
		},

		categoryTabActive: {
			backgroundColor: THEME.colors.primary.amber,
			borderColor: THEME.colors.primary.amber,
		},

		categoryTabText: {
			fontSize: 12,
			fontWeight: "600",
			color: THEME.colors.text.muted,
			textAlign: "center",
		},

		categoryTabTextActive: {
			color: THEME.colors.background.dark,
		},

		content: {
			flex: 1,
			paddingHorizontal: 16,
			paddingVertical: 12,
		},

		menuItem: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
			paddingVertical: 12,
			paddingHorizontal: 12,
			marginBottom: 8,
			backgroundColor: THEME.colors.background.card,
			borderRadius: 8,
			borderWidth: 1,
			borderColor: THEME.colors.border.subtle,
		},

		menuItemContent: {
			flex: 1,
		},

		menuItemName: {
			fontSize: 14,
			fontWeight: "600",
			color: THEME.colors.text.primary,
			marginBottom: 4,
		},

		menuItemPrice: {
			fontSize: 12,
			color: THEME.colors.text.muted,
		},

		addButton: {
			paddingHorizontal: 12,
		},

		footer: {
			paddingHorizontal: 16,
			paddingVertical: 12,
			borderTopWidth: 1,
			borderTopColor: THEME.colors.border.subtle,
		},

		footerButton: {
			paddingVertical: 12,
			paddingHorizontal: 16,
			backgroundColor: THEME.colors.primary.amber,
			borderRadius: 8,
		},

		footerButtonText: {
			fontSize: 13,
			fontWeight: "700",
			color: THEME.colors.background.dark,
			textAlign: "center",
		},
	});

export default MenuPickerModal;

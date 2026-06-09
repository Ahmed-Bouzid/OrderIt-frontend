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
	Pressable,
	TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import useCounterCartStore from "../../../src/stores/useCounterCartStore";
import counterService from "../../../services/counterService";
import { useTheme } from "../../../hooks/useTheme";
import { useAuthFetch } from "../../../hooks/useAuthFetch";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

const MenuPickerModal = ({ visible, onClose, tableId, restaurantId }) => {
	const THEME = useTheme();
	const [activeCategory, setActiveCategory] = useState(null);
	const [products, setProducts] = useState([]);
	const [isLoading, setIsLoading] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");

	const authFetch = useAuthFetch();
	const addItem = useCounterCartStore((state) => state.addItem);
	const setQty = useCounterCartStore((state) => state.setQty);
	const removeItem = useCounterCartStore((state) => state.removeItem);

	// Formule state
	const [formulePending, setFormulePending] = useState(null); // { item, steps }
	const [formuleStepIdx, setFormuleStepIdx] = useState(0);
	const [formuleChoices, setFormuleChoices] = useState([]); // [{ step, product }]
	const [formuleStepProducts, setFormuleStepProducts] = useState([]);
	const [formuleStepLoading, setFormuleStepLoading] = useState(false);
	const [formuleSelectedProduct, setFormuleSelectedProduct] = useState(null);

	// Options produit
	const [optionsPending, setOptionsPending] = useState(null);
	const [optionsList, setOptionsList] = useState([]);
	const [optionsLoading, setOptionsLoading] = useState(false);
	const [selectedOption, setSelectedOption] = useState(null);
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

	// Produits de la catégorie active (+ filtre recherche)
	const visibleProducts = useMemo(() => {
		const q = searchQuery.trim().toLowerCase();
		if (q) {
			// Recherche globale sur tous les produits
			return products.filter((p) => p.name?.toLowerCase().includes(q));
		}
		return products.filter((p) => (p.category ?? "autre") === activeCategory);
	}, [products, activeCategory, searchQuery]);

	// Quantité déjà dans le panier pour un produit donné
	const getCartQty = (productId) => {
		const pid = String(productId);
		return cart
			.filter((i) => String(i.productId) === pid)
			.reduce((sum, i) => sum + i.quantity, 0);
	};

	// Statut stock d'un produit : 'ok' | 'limit' | 'out'
	const getStockStatus = (item) => {
		if (!item.quantifiable) return 'ok';
		if (item.quantity === 0) return 'out';
		const inCart = getCartQty(item._id ?? item.id);
		if (inCart >= item.quantity) return 'limit';
		return 'ok';
	};

	const loadFormuleStep = async (item, stepIdx) => {
		setFormuleStepLoading(true);
		try {
			const data = await counterService.getProducts(restaurantId);
			const tag = item.formuleSteps[stepIdx].categoryTag?.toLowerCase();
			const filtered = data.filter((p) => (p.category || '').toLowerCase() === tag && p.available !== false);
			setFormuleStepProducts(filtered);
			setFormuleSelectedProduct(null);
		} finally {
			setFormuleStepLoading(false);
		}
	};

	const startFormule = (item) => {
		setFormulePending(item);
		setFormuleStepIdx(0);
		setFormuleChoices([]);
		loadFormuleStep(item, 0);
	};

	const handleFormuleNext = () => {
		if (!formuleSelectedProduct) return;
		const step = formulePending.formuleSteps[formuleStepIdx];
		const newChoices = [...formuleChoices, { step, product: formuleSelectedProduct }];
		const nextIdx = formuleStepIdx + 1;
		if (nextIdx < formulePending.formuleSteps.length) {
			setFormuleChoices(newChoices);
			setFormuleStepIdx(nextIdx);
			loadFormuleStep(formulePending, nextIdx);
		} else {
			// Toutes les étapes faites → ajouter au panier
			const notes = newChoices.map((c) => `${c.step.label}: ${c.product.name}`).join(' | ');
			addItem(tableId, {
				productId: formulePending._id ?? formulePending.id,
				name: formulePending.name,
				price: formulePending.price,
				category: formulePending.category ?? 'formule',
				quantity: 1,
				notes,
			});
			setFormulePending(null);
			setFormuleChoices([]);
			setFormuleStepIdx(0);
		}
	};

	const handleAddItem = async (item) => {
		const status = getStockStatus(item);
		if (status === 'out' || status === 'limit') return;

		console.log('[FORMULE CHECK staff]', item.name, 'isFormule:', item.isFormule, 'steps:', item.formuleSteps?.length);
		// Formule : déclencher le flow multi-étapes
		if (item.isFormule && item.formuleSteps?.length > 0) {
			startFormule(item);
			return;
		}

		const productId = item._id ?? item.id;
		setOptionsLoading(true);
		try {
			const options = await authFetch(`/products/${productId}/options`, { method: "GET" });
			const available = Array.isArray(options) ? options.filter((o) => o.available !== false) : [];
			if (available.length > 0) {
				setOptionsList(available);
				setSelectedOption(null);
				setOptionsPending(item);
			} else {
				addItem(tableId, { productId, name: item.name, price: item.price, category: item.category ?? "autre", quantity: 1 });
			}
		} catch {
			addItem(tableId, { productId, name: item.name, price: item.price, category: item.category ?? "autre", quantity: 1 });
		} finally {
			setOptionsLoading(false);
		}
	};

	const confirmAddWithOption = () => {
		if (!optionsPending) return;
		const opt = selectedOption;
		addItem(tableId, {
			productId: optionsPending._id ?? optionsPending.id,
			name: optionsPending.name,
			price: optionsPending.price + (opt?.price ?? 0),
			category: optionsPending.category ?? "autre",
			quantity: 1,
			notes: opt ? opt.name : "",
		});
		setOptionsPending(null);
		setOptionsList([]);
		setSelectedOption(null);
	};

	if (!visible) return null;

	return (
		<>
		<Modal
			visible={visible}
			transparent
			animationType="fade"
			onRequestClose={onClose}
		>
			<Pressable style={dynamicStyles.overlay} onPress={onClose}>
				<Pressable onPress={() => {}} style={dynamicStyles.sheet}>
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

					{/* Barre de recherche */}
					<View style={dynamicStyles.searchBar}>
						<Ionicons name="search" size={16} color="#64748B" />
						<TextInput
							style={dynamicStyles.searchInput}
							placeholder="Rechercher un plat..."
							placeholderTextColor="#475569"
							value={searchQuery}
							onChangeText={setSearchQuery}
							returnKeyType="search"
							clearButtonMode="while-editing"
						/>
						{searchQuery.length > 0 && (
							<TouchableOpacity onPress={() => setSearchQuery("")}>
								<Ionicons name="close-circle" size={16} color="#64748B" />
							</TouchableOpacity>
						)}
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
								color={"#F59E0B"}
								style={{ marginTop: 32 }}
							/>
						) : visibleProducts.length === 0 ? (
							<Text style={dynamicStyles.emptyText}>
								Aucun produit dans cette catégorie
							</Text>
						) : (
							visibleProducts.map((item) => {
								const stockStatus = getStockStatus(item);
								const isOut = stockStatus === 'out';
								const isLimit = stockStatus === 'limit';
								const isDisabled = isOut || isLimit;
								return (
									<TouchableOpacity
										key={item._id ?? item.id}
										onPress={() => handleAddItem(item)}
										style={[
											dynamicStyles.menuItem,
											isOut && dynamicStyles.menuItemOut,
											isLimit && dynamicStyles.menuItemLimit,
										]}
										activeOpacity={isDisabled ? 1 : 0.7}
									>
										<View style={dynamicStyles.menuItemContent}>
											<Text style={[
												dynamicStyles.menuItemName,
												isDisabled && dynamicStyles.menuItemNameDisabled,
											]}>
												{item.name}
											</Text>
											<View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
												<Text style={[
													dynamicStyles.menuItemPrice,
													isDisabled && dynamicStyles.menuItemNameDisabled,
												]}>
													{item.price?.toFixed(2)}€
												</Text>
												{isOut && (
													<View style={dynamicStyles.stockWarningBadge}>
														<Text style={dynamicStyles.stockWarningText}>Épuisé</Text>
													</View>
												)}
												{isLimit && (
													<View style={dynamicStyles.stockWarningBadgeLimit}>
														<Text style={dynamicStyles.stockWarningText}>⚠ Limite atteinte</Text>
													</View>
												)}
											</View>
										</View>
										<View style={dynamicStyles.addButton}>
											<Ionicons
												name="add"
												size={24}
												color={isDisabled ? "#334155" : "#F59E0B"}
											/>
										</View>
									</TouchableOpacity>
								);
							})
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
										<View style={dynamicStyles.cartItemInfo}>
											<Text
												style={dynamicStyles.cartItemName}
												numberOfLines={1}
												ellipsizeMode="tail"
											>
												{item.quantity}x {item.name}
											</Text>
											{item.notes ? (
												<Text style={dynamicStyles.cartItemOption}>{item.notes}</Text>
											) : null}
										</View>
										<View style={dynamicStyles.cartItemControls}>
											<TouchableOpacity
												onPress={() => setQty(tableId, item.tempId, item.quantity - 1)}
												style={dynamicStyles.qtyBtn}
											>
												<Ionicons name="remove" size={14} color="#94A3B8" />
											</TouchableOpacity>
											{(() => {
												const prod = products.find((p) => String(p._id ?? p.id) === String(item.productId));
												const atLimit = prod?.quantifiable && getCartQty(item.productId) >= prod.quantity;
												return (
													<TouchableOpacity
														onPress={() => !atLimit && setQty(tableId, item.tempId, item.quantity + 1)}
														style={[dynamicStyles.qtyBtn, atLimit && { opacity: 0.3 }]}
														activeOpacity={atLimit ? 1 : 0.7}
													>
														<Ionicons name="add" size={14} color={atLimit ? "#475569" : "#94A3B8"} />
													</TouchableOpacity>
												);
											})()}
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

					{/* Options picker overlay */}
					{optionsPending && (
						<View style={dynamicStyles.optionsOverlay}>
							<Text style={dynamicStyles.optionsTitle}>
								{optionsPending.name} — options
							</Text>
							<TouchableOpacity
								style={[dynamicStyles.optionRow, selectedOption === null && dynamicStyles.optionRowSelected]}
								onPress={() => setSelectedOption(null)}
							>
								<Text style={dynamicStyles.optionName}>Sans option</Text>
								<Text style={dynamicStyles.optionPrice}>{optionsPending.price?.toFixed(2)}€</Text>
							</TouchableOpacity>
							{optionsList.map((opt) => (
								<TouchableOpacity
									key={opt._id}
									style={[dynamicStyles.optionRow, selectedOption?._id === opt._id && dynamicStyles.optionRowSelected]}
									onPress={() => setSelectedOption(opt)}
								>
									<Text style={dynamicStyles.optionName}>{opt.name}</Text>
									<Text style={dynamicStyles.optionPrice}>
										{opt.price > 0 ? `+${opt.price?.toFixed(2)}€ → ${(optionsPending.price + opt.price).toFixed(2)}€` : `${optionsPending.price?.toFixed(2)}€`}
									</Text>
								</TouchableOpacity>
							))}
							<View style={dynamicStyles.optionsActions}>
								<TouchableOpacity
									style={dynamicStyles.optionsCancelBtn}
									onPress={() => { setOptionsPending(null); setOptionsList([]); setSelectedOption(null); }}
								>
									<Text style={dynamicStyles.optionsCancelText}>Annuler</Text>
								</TouchableOpacity>
								<TouchableOpacity
									style={dynamicStyles.optionsConfirmBtn}
									onPress={confirmAddWithOption}
								>
									<Text style={dynamicStyles.optionsConfirmText}>Ajouter</Text>
								</TouchableOpacity>
							</View>
						</View>
					)}

					{/* Formule overlay — inline comme options */}
					{formulePending && (
						<View style={dynamicStyles.optionsOverlay}>
							<Text style={dynamicStyles.optionsTitle}>
								{formulePending.name}
							</Text>
							<Text style={{ color: '#94A3B8', fontSize: 12, marginBottom: 10 }}>
								Étape {formuleStepIdx + 1}/{formulePending.formuleSteps.length} — {formulePending.formuleSteps[formuleStepIdx]?.label}
							</Text>
							{formuleStepLoading ? (
								<ActivityIndicator color="#F59E0B" style={{ marginVertical: 16 }} />
							) : formuleStepProducts.length === 0 ? (
								<Text style={{ color: '#94A3B8', fontSize: 13 }}>Aucun plat disponible dans cette catégorie.</Text>
							) : (
								<ScrollView style={{ maxHeight: 220 }}>
									{formuleStepProducts.map((p) => {
										const selected = formuleSelectedProduct?._id === p._id;
										return (
											<TouchableOpacity
												key={p._id}
												style={[dynamicStyles.optionRow, selected && dynamicStyles.optionRowSelected]}
												onPress={() => setFormuleSelectedProduct(p)}
											>
												<Text style={dynamicStyles.optionName}>{p.name}</Text>
												<Ionicons name={selected ? "radio-button-on" : "radio-button-off"} size={18} color={selected ? "#F59E0B" : "#64748B"} />
											</TouchableOpacity>
										);
									})}
								</ScrollView>
							)}
							<View style={dynamicStyles.optionsActions}>
								<TouchableOpacity
									style={dynamicStyles.optionsCancelBtn}
									onPress={() => { setFormulePending(null); setFormuleChoices([]); setFormuleStepIdx(0); }}
								>
									<Text style={dynamicStyles.optionsCancelText}>Annuler</Text>
								</TouchableOpacity>
								<TouchableOpacity
									style={[dynamicStyles.optionsConfirmBtn, !formuleSelectedProduct && { opacity: 0.4 }]}
									onPress={handleFormuleNext}
									disabled={!formuleSelectedProduct}
								>
									<Text style={dynamicStyles.optionsConfirmText}>
										{formuleStepIdx + 1 < formulePending.formuleSteps.length ? 'Suivant →' : 'Ajouter'}
									</Text>
								</TouchableOpacity>
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
				</Pressable>
			</Pressable>
	</Modal>
		</>
	);
};

const createStyles = (THEME) => StyleSheet.create({
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
			backgroundColor: "#F59E0B",
			borderRadius: 6,
		},

		cartBadgeText: {
			fontSize: 12,
			fontWeight: "700",
			color: "#1E293B",
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

		searchBar: {
			flexDirection: "row",
			alignItems: "center",
			gap: 8,
			marginHorizontal: 16,
			marginVertical: 10,
			paddingHorizontal: 12,
			paddingVertical: 9,
			backgroundColor: "rgba(255,255,255,0.06)",
			borderRadius: 8,
			borderWidth: 1,
			borderColor: "rgba(255,255,255,0.1)",
		},

		searchInput: {
			flex: 1,
			fontSize: 14,
			color: "#F8FAFC",
			padding: 0,
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
			backgroundColor: "#F59E0B",
			borderColor: "#F59E0B",
		},

		categoryTabText: {
			fontSize: 12,
			fontWeight: "600",
			color: "#94A3B8",
			textAlign: "center",
		},

		categoryTabTextActive: {
			color: "#1E293B",
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
		menuItemOut: {
			backgroundColor: "rgba(255,255,255,0.015)",
			borderColor: "rgba(255,255,255,0.04)",
			opacity: 0.45,
		},
		menuItemLimit: {
			borderColor: "rgba(245, 158, 11, 0.25)",
			backgroundColor: "rgba(245, 158, 11, 0.04)",
		},
		menuItemNameDisabled: {
			color: "#475569",
		},
		stockWarningBadge: {
			backgroundColor: "rgba(239, 68, 68, 0.2)",
			borderRadius: 4,
			paddingHorizontal: 6,
			paddingVertical: 2,
		},
		stockWarningBadgeLimit: {
			backgroundColor: "rgba(245, 158, 11, 0.2)",
			borderRadius: 4,
			paddingHorizontal: 6,
			paddingVertical: 2,
		},
		stockWarningText: {
			fontSize: 10,
			fontWeight: "600",
			color: "#94A3B8",
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

		cartItemInfo: {
			flex: 1,
			minWidth: 0,
		},

		cartItemName: {
			fontSize: 13,
			fontWeight: "500",
			color: "#E2E8F0",
		},

		cartItemOption: {
			fontSize: 11,
			color: "#94A3B8",
			fontStyle: "italic",
			marginTop: 1,
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
			color: "#F59E0B",
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
			backgroundColor: "#F59E0B",
			borderRadius: 10,
		},

		footerButtonDisabled: {
			backgroundColor: "rgba(255,255,255,0.06)",
		},

		footerButtonText: {
			fontSize: 14,
			fontWeight: "700",
			color: "#1E293B",
			textAlign: "center",
		},

		footerButtonTextDisabled: {
			color: "#475569",
		},

		// Options overlay
		optionsOverlay: {
			position: "absolute",
			bottom: 0,
			left: 0,
			right: 0,
			backgroundColor: "#0F172A",
			borderTopWidth: 1,
			borderTopColor: "rgba(245,158,11,0.3)",
			paddingHorizontal: 16,
			paddingTop: 16,
			paddingBottom: 8,
			zIndex: 10,
		},
		optionsTitle: {
			fontSize: 14,
			fontWeight: "700",
			color: "#F59E0B",
			marginBottom: 12,
		},
		optionRow: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
			paddingVertical: 10,
			paddingHorizontal: 12,
			marginBottom: 6,
			borderRadius: 8,
			backgroundColor: "rgba(255,255,255,0.04)",
			borderWidth: 1,
			borderColor: "rgba(255,255,255,0.07)",
		},
		optionRowSelected: {
			backgroundColor: "rgba(245,158,11,0.15)",
			borderColor: "#F59E0B",
		},
		optionName: {
			fontSize: 13,
			fontWeight: "600",
			color: "#F8FAFC",
		},
		optionPrice: {
			fontSize: 13,
			fontWeight: "700",
			color: "#94A3B8",
		},
		optionsActions: {
			flexDirection: "row",
			gap: 10,
			marginTop: 10,
			marginBottom: 4,
		},
		optionsCancelBtn: {
			flex: 1,
			paddingVertical: 11,
			borderRadius: 8,
			backgroundColor: "rgba(255,255,255,0.06)",
			alignItems: "center",
		},
		optionsCancelText: {
			fontSize: 13,
			fontWeight: "600",
			color: "#94A3B8",
		},
		optionsConfirmBtn: {
			flex: 2,
			paddingVertical: 11,
			borderRadius: 8,
			backgroundColor: "#F59E0B",
			alignItems: "center",
		},
		optionsConfirmText: {
			fontSize: 13,
			fontWeight: "700",
			color: "#1E293B",
		},
	});

export default MenuPickerModal;

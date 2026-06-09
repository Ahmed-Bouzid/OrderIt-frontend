/**
 * StockManagement.jsx — Portail Manager · Section Stocks
 *
 * Workflow : chaque matin, le serveur consulte cette section et
 * ajuste les quantités de départ pour chaque produit quantifiable.
 *
 * UI : compact, épuré — même tonalité que TableDetailModal
 *  Header sombre · liste scrollable · inputs inline · Valider global
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
	View,
	Text,
	TouchableOpacity,
	ScrollView,
	ActivityIndicator,
	Alert,
	StyleSheet,
	KeyboardAvoidingView,
	Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getItem as getSecureItem } from "../../../utils/secureStorage";
import useThemeStore from "../../../src/stores/useThemeStore";
import { getTheme } from "../../../utils/themeUtils";

const API_URL =
	process.env.EXPO_PUBLIC_API_URL ||
	"https://orderit-backend-6y1m.onrender.com";

// ─── helpers ────────────────────────────────────────────────────────────────

function todayLabel() {
	return new Date().toLocaleDateString("fr-FR", {
		weekday: "long",
		day: "numeric",
		month: "long",
	});
}

const CATEGORY_LABELS = {
	boisson: "Boissons",
	plat: "Plats",
	dessert: "Desserts",
	entree: "Entrées",
	autre: "Autres",
};

const CATEGORY_ORDER = ["entree", "plat", "dessert", "boisson", "autre"];

function groupByCategory(products) {
	const groups = {};
	products.forEach((p) => {
		const cat = (p.category || "autre").toLowerCase();
		const key = CATEGORY_ORDER.includes(cat) ? cat : "autre";
		if (!groups[key]) groups[key] = [];
		groups[key].push(p);
	});
	return groups;
}

// ─── Composant principal ─────────────────────────────────────────────────────

export default function StockManagement() {
	const { themeMode } = useThemeStore();
	const THEME = useMemo(() => getTheme(themeMode), [themeMode]);
	const styles = useMemo(() => createStyles(THEME), [THEME]);

	const [restaurantId, setRestaurantId] = useState(null);
	const [products, setProducts] = useState([]); // tous les quantifiables (ok + low)
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);

	// Map productId → quantity string (locale input)
	const [quantities, setQuantities] = useState({});
	// Track which products were modified
	const [dirty, setDirty] = useState({});

	// ── Charger restaurantId ──
	useEffect(() => {
		AsyncStorage.getItem("restaurantId").then((id) => {
			if (id) setRestaurantId(id);
		});
	}, []);

	// ── Fetch produits quantifiables ──
	const fetchProducts = useCallback(async () => {
		if (!restaurantId) return;
		setLoading(true);
		try {
			const token = await getSecureItem("@access_token");
			const res = await fetch(
				`${API_URL}/products/all-stock/${restaurantId}`,
				{ headers: { Authorization: `Bearer ${token}` } },
			);
			if (!res.ok) throw new Error("Erreur serveur");
			const data = await res.json();
			const all = [...(data.ok || []), ...(data.low || [])];
			// Trier par nom dans chaque groupe
			all.sort((a, b) => a.name.localeCompare(b.name, "fr"));
			setProducts(all);
			// Initialiser les inputs avec la quantité actuelle
			const init = {};
			all.forEach((p) => {
				// Pré-remplir avec baseQuantity (référence), pas quantity (réelle)
				init[p._id] = String(p.baseQuantity ?? p.quantity ?? 0);
			});
			setQuantities(init);
			setDirty({});
		} catch (err) {
			Alert.alert("Erreur", "Impossible de charger les stocks.");
		} finally {
			setLoading(false);
		}
	}, [restaurantId]);

	useEffect(() => {
		fetchProducts();
	}, [fetchProducts]);

	// ── Modification d'un input ──
	const handleChange = useCallback((id, value) => {
		if (/^\d*$/.test(value)) {
			setQuantities((prev) => ({ ...prev, [id]: value }));
			setDirty((prev) => ({ ...prev, [id]: true }));
		}
	}, []);

	// ── Stepper ──
	const handleStep = useCallback((id, delta) => {
		setQuantities((prev) => {
			const next = Math.max(0, parseInt(prev[id] || "0", 10) + delta);
			return { ...prev, [id]: String(next) };
		});
		setDirty((prev) => ({ ...prev, [id]: true }));
	}, []);

	// ── Réinitialiser un produit à sa valeur de base ──
	const handleReset = useCallback(
		(product) => {
			setQuantities((prev) => ({
				...prev,
				[product._id]: String(product.baseQuantity ?? product.quantity ?? 0),
			}));
			setDirty((prev) => ({ ...prev, [product._id]: false }));
		},
		[],
	);

	// ── Compter les produits modifiés ──
	const dirtyCount = useMemo(
		() => Object.values(dirty).filter(Boolean).length,
		[dirty],
	);

	// ── Sauvegarder toutes les modifications ──
	const handleSaveAll = useCallback(async () => {
		const toUpdate = products.filter((p) => dirty[p._id]);
		if (toUpdate.length === 0) return;

		setSaving(true);
		try {
			const token = await getSecureItem("@access_token");
			await Promise.all(
				toUpdate.map((p) =>
					fetch(`${API_URL}/products/${p._id}/stock`, {
						method: "PUT",
						headers: {
							Authorization: `Bearer ${token}`,
							"Content-Type": "application/json",
						},
						body: JSON.stringify({
							quantity: parseInt(quantities[p._id] || "0", 10),
						}),
					}),
				),
			);
			// Rafraîchir pour remettre la référence à jour
			await fetchProducts();
			Alert.alert("✅ Stocks mis à jour", `${toUpdate.length} produit(s) enregistré(s).`);
		} catch (err) {
			Alert.alert("Erreur", "Certaines modifications n'ont pas pu être sauvegardées.");
		} finally {
			setSaving(false);
		}
	}, [products, dirty, quantities, fetchProducts]);

	// ── Groups ──
	const groups = useMemo(() => groupByCategory(products), [products]);

	// ── Infos affiché dans la row ──
	const renderProductRow = useCallback(
		(product) => {
			const isDirty = !!dirty[product._id];
			const val = quantities[product._id] ?? "";
			const baseQty = product.baseQuantity ?? null;
			const liveQty = product.quantity ?? null;
			const isLow =
				product.quantifiable &&
				typeof liveQty === "number" &&
				typeof product.lowStockThreshold === "number" &&
				liveQty <= product.lowStockThreshold;

			return (
				<View key={product._id} style={styles.row}>
					{/* Dot coloré: rouge si stock réel bas */}
					<View
						style={[
							styles.dot,
							{ backgroundColor: isLow ? "#EF4444" : "#10B981" },
						]}
					/>

					{/* Nom produit + réel actuel */}
					<View style={styles.productNameCol}>
						<Text
							style={styles.productName}
							numberOfLines={1}
							ellipsizeMode="tail"
						>
							{product.name}
						</Text>
						{/* Quantité réelle en cours (live) */}
						{liveQty !== null && (
							<Text style={styles.liveQtyLabel}>
								Réel : {liveQty}
							</Text>
						)}
					</View>

					{/* Stepper − val + */}
					<View style={[styles.stepper, isDirty && styles.stepperDirty]}>
						<TouchableOpacity
							onPress={() => handleStep(product._id, -1)}
							style={styles.stepBtn}
							hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
						>
							<Text style={styles.stepBtnText}>−</Text>
						</TouchableOpacity>
						<Text style={[styles.stepValue, isDirty && styles.stepValueDirty]}>
							{val}
						</Text>
						<TouchableOpacity
							onPress={() => handleStep(product._id, 1)}
							style={styles.stepBtn}
							hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
						>
							<Text style={styles.stepBtnText}>+</Text>
						</TouchableOpacity>
					</View>
				</View>
			);
		},
		[dirty, quantities, handleChange, handleStep, handleReset, styles, THEME],
	);

	// ── Contenu ──
	if (loading) {
		return (
			<View style={styles.centered}>
				<ActivityIndicator size="large" color={THEME.colors.primary.amber} />
			</View>
		);
	}

	if (products.length === 0) {
		return (
			<View style={styles.emptyContainer}>
				{/* Header */}
				<View style={styles.header}>
					<Ionicons name="cube-outline" size={20} color="#F8FAFC" />
					<Text style={styles.headerTitle}>Stocks</Text>
					<Text style={styles.headerDate}>{todayLabel()}</Text>
				</View>
				<View style={styles.centered}>
					<Ionicons
						name="cube-outline"
						size={48}
						color={THEME.colors.text.muted}
					/>
					<Text style={styles.emptyTitle}>Aucun produit quantifiable</Text>
					<Text style={styles.emptySubtitle}>
						Activez "Produit quantifiable" dans le Menu pour les faire apparaître ici.
					</Text>
				</View>
			</View>
		);
	}

	return (
		<KeyboardAvoidingView
			style={styles.container}
			behavior={Platform.OS === "ios" ? "padding" : undefined}
		>
			{/* ── Header ── */}
			<View style={styles.header}>
				<View style={styles.headerLeft}>
					<Ionicons name="cube-outline" size={20} color="#F8FAFC" />
					<Text style={styles.headerTitle}>Stocks</Text>
				</View>
				<Text style={styles.headerDate}>{todayLabel()}</Text>
			</View>

			{/* ── Bandeau info ── */}
			<View style={styles.infoBanner}>
				<Ionicons
					name="information-circle-outline"
					size={16}
					color={THEME.colors.primary.amber}
				/>
				<Text style={styles.infoBannerText}>
					Définissez les quantités du jour. Modifiez et validez.
				</Text>
			</View>

			{/* ── Liste ── */}
			<ScrollView
				style={styles.scroll}
				contentContainerStyle={styles.scrollContent}
				keyboardShouldPersistTaps="handled"
				showsVerticalScrollIndicator={false}
			>
				{CATEGORY_ORDER.filter((cat) => groups[cat]?.length > 0).map(
					(cat) => (
						<View key={cat} style={styles.categoryBlock}>
							{/* Section label */}
							<View style={styles.categoryHeader}>
								<Text style={styles.categoryLabel}>
									{CATEGORY_LABELS[cat] || cat}
								</Text>
								<Text style={styles.categoryCount}>
									{groups[cat].length}
								</Text>
							</View>

{/* Séparateur */}
							<View style={styles.separator} />

							{/* Produits */}
							{groups[cat].map(renderProductRow)}
						</View>
					),
				)}

				{/* Espace bas pour le bouton flottant */}
				<View style={{ height: 96 }} />
			</ScrollView>

			{/* ── Footer CTA ── */}
			<View style={styles.footer}>
				{dirtyCount > 0 ? (
					<TouchableOpacity
						onPress={handleSaveAll}
						disabled={saving}
						style={styles.saveBtn}
						activeOpacity={0.85}
					>
						{saving ? (
							<ActivityIndicator size="small" color="#1C1917" />
						) : (
							<>
								<Ionicons name="checkmark-circle-outline" size={20} color="#1C1917" />
								<Text style={styles.saveBtnText}>
									Valider {dirtyCount} modification{dirtyCount > 1 ? "s" : ""}
								</Text>
							</>
						)}
					</TouchableOpacity>
				) : (
					<TouchableOpacity
						onPress={fetchProducts}
						style={styles.refreshBtn}
						activeOpacity={0.75}
					>
						<Ionicons
							name="refresh-outline"
							size={18}
							color={THEME.colors.text.secondary}
						/>
						<Text style={styles.refreshBtnText}>Actualiser</Text>
					</TouchableOpacity>
				)}
			</View>
		</KeyboardAvoidingView>
	);
}

// ─── Styles ──────────────────────────────────────────────────────────────────

function createStyles(THEME) {
	const isDark =
		THEME.colors.background.dark === "#0F172A" ||
		THEME.colors.background.card === "#1E293B";

	return StyleSheet.create({
		container: {
			flex: 1,
			backgroundColor: THEME.colors.background.main,
		},
		centered: {
			flex: 1,
			alignItems: "center",
			justifyContent: "center",
			gap: 12,
			padding: 24,
		},
		emptyContainer: {
			flex: 1,
			backgroundColor: THEME.colors.background.main,
		},

		// ── Header (style TableDetailModal) ──
		header: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "space-between",
			paddingHorizontal: 16,
			paddingVertical: 14,
			backgroundColor: "#1C1917",
			gap: 8,
		},
		headerLeft: {
			flexDirection: "row",
			alignItems: "center",
			gap: 8,
		},
		headerTitle: {
			fontSize: 16,
			fontWeight: "700",
			color: "#F8FAFC",
			letterSpacing: 0.3,
		},
		headerDate: {
			fontSize: 12,
			color: "rgba(248,250,252,0.55)",
			textTransform: "capitalize",
		},

		// ── Info banner ──
		infoBanner: {
			flexDirection: "row",
			alignItems: "center",
			gap: 8,
			paddingHorizontal: 16,
			paddingVertical: 10,
			backgroundColor: isDark
				? "rgba(245,158,11,0.08)"
				: "rgba(245,158,11,0.06)",
			borderBottomWidth: 1,
			borderBottomColor: "rgba(245,158,11,0.15)",
		},
		infoBannerText: {
			flex: 1,
			fontSize: 12,
			color: THEME.colors.text.secondary,
			lineHeight: 17,
		},

		// ── Scroll ──
		scroll: { flex: 1 },
		scrollContent: { paddingTop: 12, paddingBottom: 24 },

		// ── Category block ──
		categoryBlock: {
			marginHorizontal: 12,
			marginBottom: 20,
			borderRadius: 12,
			backgroundColor: THEME.colors.background.card,
			overflow: "hidden",
			borderWidth: 1,
			borderColor: THEME.colors.border.subtle,
		},
		categoryHeader: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "space-between",
			paddingHorizontal: 14,
			paddingTop: 12,
			paddingBottom: 4,
		},
		categoryLabel: {
			fontSize: 11,
			fontWeight: "700",
			letterSpacing: 0.8,
			textTransform: "uppercase",
			color: THEME.colors.text.muted,
		},
		categoryCount: {
			fontSize: 11,
			fontWeight: "600",
			color: THEME.colors.text.muted,
			backgroundColor: THEME.colors.border.subtle,
			paddingHorizontal: 7,
			paddingVertical: 2,
			borderRadius: 10,
		},
		colHeader: {
			flexDirection: "row",
			alignItems: "center",
			paddingHorizontal: 14,
			paddingTop: 6,
			paddingBottom: 4,
		},
		colHeaderName: {
			flex: 1,
			fontSize: 11,
			fontWeight: "600",
			color: THEME.colors.text.muted,
		},
		colHeaderQty: {
			width: 52,
			textAlign: "center",
			fontSize: 11,
			fontWeight: "600",
			color: THEME.colors.text.muted,
			marginRight: 28,
		},
		separator: {
			height: 1,
			backgroundColor: THEME.colors.border.subtle,
			marginHorizontal: 0,
		},

		// ── Row produit ──
		row: {
			flexDirection: "row",
			alignItems: "center",
			paddingHorizontal: 14,
			paddingVertical: 11,
			borderBottomWidth: StyleSheet.hairlineWidth,
			borderBottomColor: THEME.colors.border.subtle,
		},
		dot: {
			width: 7,
			height: 7,
			borderRadius: 4,
			marginRight: 10,
		},
		productNameCol: {
			flex: 1,
			gap: 2,
		},
		productName: {
			flex: 1,
			fontSize: 14,
			fontWeight: "500",
			color: THEME.colors.text.primary,
		},
		liveQtyLabel: {
			fontSize: 11,
			color: THEME.colors.text.muted,
			fontWeight: "400",
		},
		baseQtyBadge: {
			fontSize: 12,
			color: THEME.colors.text.muted,
			fontWeight: "500",
			marginRight: 6,
			minWidth: 28,
			textAlign: "right",
		},
		// ── Stepper ──
		stepper: {
			flexDirection: "row",
			alignItems: "center",
			borderRadius: 8,
			borderWidth: 1.5,
			borderColor: THEME.colors.border.default,
			overflow: "hidden",
		},
		stepperDirty: {
			borderColor: THEME.colors.primary.amber,
		},
		stepBtn: {
			width: 32,
			height: 36,
			alignItems: "center",
			justifyContent: "center",
			backgroundColor: THEME.colors.background.main,
		},
		stepBtnText: {
			fontSize: 18,
			fontWeight: "600",
			color: THEME.colors.text.secondary,
			lineHeight: 22,
		},
		stepValue: {
			width: 36,
			textAlign: "center",
			fontSize: 15,
			fontWeight: "700",
			color: THEME.colors.text.primary,
		},
		stepValueDirty: {
			color: THEME.colors.primary.amber,
		},

		// ── Footer ──
		footer: {
			paddingHorizontal: 16,
			paddingVertical: 12,
			paddingBottom: Platform.OS === "ios" ? 24 : 12,
			borderTopWidth: 1,
			borderTopColor: THEME.colors.border.subtle,
			backgroundColor: THEME.colors.background.card,
		},
		saveBtn: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "center",
			gap: 8,
			backgroundColor: THEME.colors.primary.amber,
			paddingVertical: 14,
			borderRadius: 12,
		},
		saveBtnText: {
			fontSize: 15,
			fontWeight: "700",
			color: "#1C1917",
		},
		refreshBtn: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "center",
			gap: 6,
			paddingVertical: 12,
			borderRadius: 12,
			borderWidth: 1,
			borderColor: THEME.colors.border.default,
		},
		refreshBtnText: {
			fontSize: 14,
			fontWeight: "500",
			color: THEME.colors.text.secondary,
		},

		// ── Empty state ──
		emptyTitle: {
			fontSize: 16,
			fontWeight: "600",
			color: THEME.colors.text.primary,
			textAlign: "center",
		},
		emptySubtitle: {
			fontSize: 13,
			color: THEME.colors.text.muted,
			textAlign: "center",
			lineHeight: 19,
		},
	});
}

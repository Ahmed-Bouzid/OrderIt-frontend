/**
 * CreateFastFoodOrderModal.jsx
 * Modale de création de commande directe pour les Fast-Foods
 *
 * Flux :
 *   1. Affiche le menu (produits) avec quantités
 *   2. Au submit → crée une réservation simplifiée + une commande liée
 *   3. Rafraîchit le dashboard + feedback toastr
 */
import React, {
	useState,
	useCallback,
	useEffect,
	useMemo,
	useRef,
} from "react";
import {
	Modal,
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	TextInput,
	ScrollView,
	ActivityIndicator,
	Animated,
	Dimensions,
	Alert,
	KeyboardAvoidingView,
	Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getItem as getSecureItem } from "../../utils/secureStorage";
import { useAuthFetch } from "../../hooks/useAuthFetch";
import { useTheme } from "../../hooks/useTheme";
import { API_CONFIG } from "../../src/config/apiConfig";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// ─── Carte produit ────────────────────────────────────────────────────────────
const ProductCard = React.memo(function ProductCard({
	product,
	quantity,
	onIncrement,
	onDecrement,
	THEME,
	styles,
}) {
	const isSelected = quantity > 0;

	return (
		<View style={[styles.productCard, isSelected && styles.productCardActive]}>
			<View style={styles.productInfo}>
				<Text style={styles.productName} numberOfLines={2}>
					{product.name}
				</Text>
				{product.description ? (
					<Text style={styles.productDesc} numberOfLines={1}>
						{product.description}
					</Text>
				) : null}
				<Text style={styles.productPrice}>
					{(product.price ?? 0).toFixed(2)} €
				</Text>
			</View>
			<View style={styles.quantityRow}>
				{quantity > 0 ? (
					<TouchableOpacity
						style={styles.qtyBtn}
						onPress={() => onDecrement(product._id)}
						activeOpacity={0.7}
					>
						<Ionicons name="remove" size={16} color="#FFFFFF" />
					</TouchableOpacity>
				) : (
					<View style={[styles.qtyBtn, styles.qtyBtnInvisible]} />
				)}
				<Text style={[styles.qtyValue, quantity > 0 && styles.qtyValueActive]}>
					{quantity}
				</Text>
				<TouchableOpacity
					style={[styles.qtyBtn, styles.qtyBtnAdd]}
					onPress={() => onIncrement(product._id)}
					activeOpacity={0.7}
				>
					<Ionicons name="add" size={16} color="#FFFFFF" />
				</TouchableOpacity>
			</View>
		</View>
	);
});

// ─── Modale principale ────────────────────────────────────────────────────────
export default function CreateFastFoodOrderModal({
	visible,
	onClose,
	onCreated,
}) {
	const THEME = useTheme();
	const authFetch = useAuthFetch();

	// État local
	const [localProducts, setLocalProducts] = useState([]);
	const [clientName, setClientName] = useState("");
	const [nbPersonnes, setNbPersonnes] = useState("");
	const [quantities, setQuantities] = useState({});
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isLoadingProducts, setIsLoadingProducts] = useState(false);
	const [fetchError, setFetchError] = useState(null);

	// Étape : "menu" → "payment"
	const [step, setStep] = useState("menu");
	const [createdReservationId, setCreatedReservationId] = useState(null);
	const [createdTotal, setCreatedTotal] = useState(0);
	const [createdItems, setCreatedItems] = useState([]);
	const [isPaymentLoading, setIsPaymentLoading] = useState(false);

	// Animation d'entrée (scale + fade)
	const scaleAnim = useRef(new Animated.Value(0.9)).current;
	const fadeAnim = useRef(new Animated.Value(0)).current;

	// ─── Charger les produits au premier affichage ────────────────────────────
	useEffect(() => {
		if (!visible) return;

		const loadProducts = async () => {
			try {
				setIsLoadingProducts(true);
				setFetchError(null);

				const restaurantId = await AsyncStorage.getItem("restaurantId");
				console.log("[FastFoodModal] restaurantId:", restaurantId);
				if (!restaurantId)
					throw new Error("restaurantId manquant en AsyncStorage");

				const token = await getSecureItem("@access_token");
				console.log("[FastFoodModal] token présent:", !!token);
				if (!token) throw new Error("Token d'accès manquant");

				const url = `${API_CONFIG.baseURL}/products/restaurant/${restaurantId}`;
				console.log("[FastFoodModal] fetch →", url);
				const response = await fetch(url, {
					method: "GET",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${token}`,
					},
				});

				console.log("[FastFoodModal] status:", response.status);
				if (!response.ok) {
					const body = await response.text();
					throw new Error(`Erreur ${response.status} : ${body}`);
				}

				const data = await response.json();
				console.log(
					"[FastFoodModal] produits reçus:",
					Array.isArray(data) ? data.length : data,
				);
				const active = (Array.isArray(data) ? data : []).filter(
					(p) => p.available !== false && !p.archived,
				);
				console.log("[FastFoodModal] produits actifs:", active.length);
				setLocalProducts(active);
			} catch (e) {
				console.error("[FastFoodModal] ❌ Erreur:", e.message);
				setFetchError(e.message);
			} finally {
				setIsLoadingProducts(false);
			}
		};

		loadProducts();
	}, [visible]);

	// Animation d'entrée/sortie
	useEffect(() => {
		if (visible) {
			Animated.parallel([
				Animated.spring(scaleAnim, {
					toValue: 1,
					friction: 8,
					tension: 60,
					useNativeDriver: true,
				}),
				Animated.timing(fadeAnim, {
					toValue: 1,
					duration: 200,
					useNativeDriver: true,
				}),
			]).start();
		} else {
			Animated.parallel([
				Animated.spring(scaleAnim, {
					toValue: 0.9,
					friction: 8,
					tension: 60,
					useNativeDriver: true,
				}),
				Animated.timing(fadeAnim, {
					toValue: 0,
					duration: 180,
					useNativeDriver: true,
				}),
			]).start(() => {
				setClientName("");
				setNbPersonnes("");
				setQuantities({});
				setFetchError(null);
				setStep("menu");
				setCreatedReservationId(null);
				setCreatedTotal(0);
				setCreatedItems([]);
			});
		}
	}, [visible, scaleAnim, fadeAnim]);

	// ─── Produits regroupés par catégorie ────────────────────────────────────
	const groupedProducts = useMemo(() => {
		const groups = {};
		localProducts.forEach((p) => {
			const cat = p.category || "Autres";
			if (!groups[cat]) groups[cat] = [];
			groups[cat].push(p);
		});
		return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
	}, [localProducts]);

	// ─── Éléments sélectionnés ───────────────────────────────────────────────
	const selectedItems = useMemo(() => {
		return localProducts
			.filter((p) => quantities[p._id] > 0)
			.map((p) => ({
				productId: p._id,
				name: p.name,
				quantity: quantities[p._id],
				price: p.price ?? 0,
			}));
	}, [localProducts, quantities]);

	const total = useMemo(
		() => selectedItems.reduce((sum, i) => sum + i.price * i.quantity, 0),
		[selectedItems],
	);

	// ─── Callbacks quantité ──────────────────────────────────────────────────
	const handleIncrement = useCallback((productId) => {
		setQuantities((prev) => ({
			...prev,
			[productId]: (prev[productId] || 0) + 1,
		}));
	}, []);

	const handleDecrement = useCallback((productId) => {
		setQuantities((prev) => {
			const cur = prev[productId] || 0;
			if (cur <= 1) {
				const { [productId]: _, ...rest } = prev;
				return rest;
			}
			return { ...prev, [productId]: cur - 1 };
		});
	}, []);

	// ─── Soumission ──────────────────────────────────────────────────────────
	const handleSubmit = useCallback(async () => {
		if (selectedItems.length === 0) {
			Alert.alert("Panier vide", "Ajoutez au moins un produit.");
			return;
		}

		setIsSubmitting(true);
		try {
			const restaurantId = await AsyncStorage.getItem("restaurantId");
			if (!restaurantId) throw new Error("Restaurant non identifié.");

			// Décoder le serverId depuis le token JWT
			let serverId = null;
			const token = await getSecureItem("@access_token");
			if (token) {
				try {
					const parts = token.split(".");
					if (parts.length === 3) {
						const decoded = JSON.parse(atob(parts[1]));
						serverId = decoded.id || null;
					}
				} catch (_) {
					/* silencieux */
				}
			}

			const now = new Date();

			// 1️⃣ Créer une réservation simplifiée (sans table)
			const reservationBody = {
				clientName: clientName.trim() || "Client",
				nbPersonnes: parseInt(nbPersonnes, 10) || 1,
				restaurantId,
				reservationDate: now.toISOString(),
				reservationTime: `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`,
				status: "ouverte",
				...(serverId && { serverId }),
			};

			const resData = await authFetch(`${API_CONFIG.baseURL}/reservations`, {
				method: "POST",
				body: reservationBody,
			});

			const reservationId = resData?._id;
			if (!reservationId)
				throw new Error("Impossible de créer la réservation.");

			// 2️⃣ Créer la commande liée
			await authFetch(`${API_CONFIG.baseURL}/orders/`, {
				method: "POST",
				body: {
					reservationId,
					restaurantId,
					items: selectedItems,
					total,
					status: "in_progress",
					...(serverId && { serverId }),
				},
			});

			// ✅ Succès → passer à l'étape paiement
			setCreatedReservationId(reservationId);
			setCreatedTotal(total);
			setCreatedItems(selectedItems);
			setStep("payment");
		} catch (err) {
			console.error("❌ CreateFastFoodOrder:", err);
			Alert.alert("Erreur", err.message || "Impossible de créer la commande.");
		} finally {
			setIsSubmitting(false);
		}
	}, [
		selectedItems,
		total,
		clientName,
		nbPersonnes,
		authFetch,
		onClose,
		onCreated,
	]);

	// ─── Confirmation du paiement ────────────────────────────────────────────
	const handlePayment = useCallback(
		async (method) => {
			if (!createdReservationId) return;
			setIsPaymentLoading(true);
			try {
				await authFetch(
					`${API_CONFIG.baseURL}/reservations/${createdReservationId}/payment`,
					{
						method: "PUT",
						body: {
							paidAmount: createdTotal,
							remainingAmount: 0,
							paymentMethod: method,
						},
					},
				);
				onCreated?.();
				onClose();
			} catch (err) {
				console.error("❌ Paiement:", err);
				Alert.alert(
					"Erreur paiement",
					err.message || "Impossible d'enregistrer le paiement.",
				);
			} finally {
				setIsPaymentLoading(false);
			}
		},
		[createdReservationId, createdTotal, authFetch, onCreated, onClose],
	);

	// ─── Styles dynamiques ───────────────────────────────────────────────────
	const styles = useMemo(() => createStyles(THEME), [THEME]);

	return (
		<Modal
			transparent
			visible={visible}
			animationType="none"
			onRequestClose={onClose}
			statusBarTranslucent
		>
			<Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
				{/* Fermeture en tapant le fond */}
				<TouchableOpacity
					style={StyleSheet.absoluteFill}
					onPress={onClose}
					activeOpacity={1}
				/>

				{/* Carte centrée */}
				<Animated.View
					style={[
						styles.card,
						step === "payment" && styles.cardPayment,
						{ transform: [{ scale: scaleAnim }], opacity: fadeAnim },
					]}
				>
					{/* En-tête */}
					<LinearGradient
						colors={
							step === "payment"
								? ["#10B981", "#059669"]
								: ["#F59E0B", "#D97706"]
						}
						start={{ x: 0, y: 0 }}
						end={{ x: 1, y: 1 }}
						style={styles.header}
					>
						<View style={styles.headerContent}>
							<Ionicons
								name={step === "payment" ? "card-outline" : "fast-food"}
								size={20}
								color="#FFFFFF"
								style={{ marginRight: 10 }}
							/>
							<View>
								<Text style={styles.headerTitle}>
									{step === "payment" ? "Paiement" : "Nouvelle commande"}
								</Text>
								<Text style={styles.headerSubtitle}>
									{step === "payment"
										? "Choisissez le mode de règlement"
										: "Sélectionnez les produits"}
								</Text>
							</View>
						</View>
						<TouchableOpacity
							onPress={onClose}
							style={styles.closeBtn}
							hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
						>
							<Ionicons name="close" size={22} color="#FFFFFF" />
						</TouchableOpacity>
					</LinearGradient>

					{/* ─── ÉTAPE PAIEMENT ─── */}
					{step === "payment" && (
						<View style={styles.paymentBody}>
							{/* Icône succès */}
							<View style={styles.paymentSuccessIcon}>
								<Ionicons name="checkmark-circle" size={64} color="#10B981" />
							</View>
							<Text style={styles.paymentSuccessTitle}>
								Commande enregistrée !
							</Text>
							<Text style={styles.paymentSuccessSubtitle}>
								Montant à régler
							</Text>
							<Text style={styles.paymentAmount}>
								{createdTotal.toFixed(2)} €
							</Text>

							{/* ─── Reçu de la commande ─── */}
							{createdItems.length > 0 && (
								<View style={styles.receiptContainer}>
									<Text style={styles.receiptTitle}>Détail de la commande</Text>
									<ScrollView
										nestedScrollEnabled
										style={styles.receiptScroll}
										showsVerticalScrollIndicator={false}
									>
										{createdItems.map((item, i) => (
											<View key={i} style={styles.receiptItem}>
												<View style={styles.receiptItemLeft}>
													<Text style={styles.receiptItemQty}>
														{item.quantity}×
													</Text>
													<Text
														style={styles.receiptItemName}
														numberOfLines={1}
													>
														{item.name}
													</Text>
												</View>
												<Text style={styles.receiptItemPrice}>
													{(item.price * item.quantity).toFixed(2)} €
												</Text>
											</View>
										))}
									</ScrollView>
								</View>
							)}

							<Text style={styles.paymentMethodLabel}>Mode de paiement</Text>

							<View style={styles.paymentBtns}>
								<TouchableOpacity
									style={styles.paymentBtn}
									onPress={() => handlePayment("Espèces")}
									disabled={isPaymentLoading}
									activeOpacity={0.85}
								>
									<LinearGradient
										colors={["#F59E0B", "#D97706"]}
										style={styles.paymentBtnGradient}
										start={{ x: 0, y: 0 }}
										end={{ x: 1, y: 1 }}
									>
										{isPaymentLoading ? (
											<ActivityIndicator size="small" color="#FFFFFF" />
										) : (
											<>
												<Ionicons
													name="cash-outline"
													size={24}
													color="#FFFFFF"
													style={{ marginBottom: 4 }}
												/>
												<Text style={styles.paymentBtnText}>Espèces</Text>
											</>
										)}
									</LinearGradient>
								</TouchableOpacity>

								<TouchableOpacity
									style={styles.paymentBtn}
									onPress={() => handlePayment("Carte")}
									disabled={isPaymentLoading}
									activeOpacity={0.85}
								>
									<LinearGradient
										colors={["#6366F1", "#4F46E5"]}
										style={styles.paymentBtnGradient}
										start={{ x: 0, y: 0 }}
										end={{ x: 1, y: 1 }}
									>
										{isPaymentLoading ? (
											<ActivityIndicator size="small" color="#FFFFFF" />
										) : (
											<>
												<Ionicons
													name="card-outline"
													size={24}
													color="#FFFFFF"
													style={{ marginBottom: 4 }}
												/>
												<Text style={styles.paymentBtnText}>Carte</Text>
											</>
										)}
									</LinearGradient>
								</TouchableOpacity>
							</View>

							{/* Fermer sans encaisser */}
							<TouchableOpacity
								onPress={() => {
									onCreated?.();
									onClose();
								}}
								disabled={isPaymentLoading}
								style={styles.paymentSkipBtn}
								activeOpacity={0.7}
							>
								<Text style={styles.paymentSkipText}>
									Fermer sans encaisser
								</Text>
							</TouchableOpacity>
						</View>
					)}

					{/* ─── ÉTAPE MENU ─── */}
					{step === "menu" && (
						<>
							<KeyboardAvoidingView
								behavior={Platform.OS === "ios" ? "padding" : undefined}
								style={{ flex: 1 }}
							>
								<ScrollView
									style={styles.body}
									contentContainerStyle={styles.bodyContent}
									showsVerticalScrollIndicator={false}
									keyboardShouldPersistTaps="handled"
								>
									{/* Infos client */}
									<View style={styles.section}>
										<Text style={styles.sectionTitle}>Client</Text>
										<View style={styles.fieldsRow}>
											<View
												style={[
													styles.inputWrapper,
													{ flex: 2, marginRight: 8 },
												]}
											>
												<Text style={styles.inputLabel}>Nom (optionnel)</Text>
												<TextInput
													style={styles.input}
													placeholder="Ex : Thomas"
													placeholderTextColor={THEME.colors.text.muted}
													value={clientName}
													onChangeText={setClientName}
													maxLength={50}
												/>
											</View>
											<View style={[styles.inputWrapper, { flex: 1 }]}>
												<Text style={styles.inputLabel}>Pers.</Text>
												<TextInput
													style={styles.input}
													placeholder="1"
													placeholderTextColor={THEME.colors.text.muted}
													value={nbPersonnes}
													onChangeText={setNbPersonnes}
													keyboardType="number-pad"
													maxLength={3}
												/>
											</View>
										</View>
									</View>

									{/* Menu */}
									<View style={styles.section}>
										<Text style={styles.sectionTitle}>Menu</Text>

										{isLoadingProducts ? (
											<View style={styles.loadingRow}>
												<ActivityIndicator size="small" color="#F59E0B" />
												<Text style={styles.loadingText}>
													Chargement du menu…
												</Text>
											</View>
										) : fetchError ? (
											<View style={styles.errorContainer}>
												<Ionicons
													name="alert-circle-outline"
													size={20}
													color="#EF4444"
												/>
												<Text style={styles.errorText}>
													Impossible de charger le menu.
												</Text>
												<Text style={styles.errorDetail}>{fetchError}</Text>
											</View>
										) : groupedProducts.length === 0 ? (
											<Text style={styles.emptyText}>
												Aucun produit disponible.
											</Text>
										) : (
											groupedProducts.map(([catName, products]) => (
												<View key={catName} style={styles.categoryBlock}>
													<Text style={styles.categoryTitle}>{catName}</Text>
													{products.map((product) => (
														<ProductCard
															key={product._id}
															product={product}
															quantity={quantities[product._id] || 0}
															onIncrement={handleIncrement}
															onDecrement={handleDecrement}
															THEME={THEME}
															styles={styles}
														/>
													))}
												</View>
											))
										)}
									</View>
								</ScrollView>
							</KeyboardAvoidingView>

							{/* Footer fixe : total + boutons */}
							<View style={styles.footer}>
								{selectedItems.length > 0 && (
									<View style={styles.totalRow}>
										<Text style={styles.totalLabel}>Total</Text>
										<Text style={styles.totalValue}>{total.toFixed(2)} €</Text>
									</View>
								)}
								<View style={styles.footerBtns}>
									<TouchableOpacity
										style={styles.cancelBtn}
										onPress={onClose}
										activeOpacity={0.7}
									>
										<Text style={styles.cancelBtnText}>Annuler</Text>
									</TouchableOpacity>
									<TouchableOpacity
										style={[
											styles.submitBtn,
											selectedItems.length === 0 && styles.submitBtnDisabled,
										]}
										onPress={handleSubmit}
										disabled={isSubmitting || selectedItems.length === 0}
										activeOpacity={0.85}
									>
										<LinearGradient
											colors={
												selectedItems.length > 0
													? ["#F59E0B", "#D97706"]
													: ["#9CA3AF", "#6B7280"]
											}
											style={styles.submitGradient}
											start={{ x: 0, y: 0 }}
											end={{ x: 1, y: 1 }}
										>
											{isSubmitting ? (
												<ActivityIndicator size="small" color="#FFFFFF" />
											) : (
												<>
													<Ionicons
														name="checkmark-circle"
														size={18}
														color="#FFFFFF"
														style={{ marginRight: 6 }}
													/>
													<Text style={styles.submitBtnText}>
														{selectedItems.length > 0
															? `Commander (${selectedItems.length})`
															: "Commander"}
													</Text>
												</>
											)}
										</LinearGradient>
									</TouchableOpacity>
								</View>
							</View>
						</>
					)}
				</Animated.View>
			</Animated.View>
		</Modal>
	);
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const createStyles = (THEME) =>
	StyleSheet.create({
		// Overlay centré (même pattern que NewReservationModal)
		overlay: {
			flex: 1,
			backgroundColor: "rgba(12, 15, 23, 0.88)",
			justifyContent: "center",
			alignItems: "center",
			padding: THEME.spacing.xl,
		},
		// Carte centrée
		card: {
			width: Math.min(SCREEN_WIDTH - 48, 480),
			height: SCREEN_HEIGHT * 0.82,
			backgroundColor: THEME.colors.background.card,
			borderRadius: THEME.radius["2xl"],
			borderWidth: 1,
			borderColor: THEME.colors.border.subtle,
			overflow: "hidden",
		},
		// Header
		header: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "space-between",
			paddingHorizontal: THEME.spacing.xl,
			paddingVertical: THEME.spacing.lg,
		},
		headerContent: {
			flexDirection: "row",
			alignItems: "center",
		},
		headerTitle: {
			fontSize: 17,
			fontWeight: "700",
			color: "#FFFFFF",
		},
		headerSubtitle: {
			fontSize: 12,
			color: "rgba(255,255,255,0.7)",
			marginTop: 1,
		},
		closeBtn: {
			width: 34,
			height: 34,
			borderRadius: 17,
			backgroundColor: "rgba(255,255,255,0.2)",
			alignItems: "center",
			justifyContent: "center",
		},
		// Body
		body: {
			flex: 1,
		},
		bodyContent: {
			padding: THEME.spacing.lg,
			paddingBottom: THEME.spacing.xl,
		},
		section: {
			marginBottom: THEME.spacing.lg,
		},
		sectionTitle: {
			fontSize: 11,
			fontWeight: "700",
			color: THEME.colors.text.muted,
			textTransform: "uppercase",
			letterSpacing: 0.8,
			marginBottom: THEME.spacing.sm,
		},
		fieldsRow: {
			flexDirection: "row",
		},
		inputWrapper: {
			marginBottom: 4,
		},
		inputLabel: {
			fontSize: 12,
			color: THEME.colors.text.muted,
			marginBottom: 4,
		},
		input: {
			backgroundColor: THEME.colors.background.elevated,
			borderRadius: THEME.radius.lg,
			paddingHorizontal: THEME.spacing.md,
			paddingVertical: 10,
			fontSize: 15,
			color: THEME.colors.text.primary,
			borderWidth: 1,
			borderColor: THEME.colors.border.subtle,
		},
		// États chargement / erreur
		loadingRow: {
			flexDirection: "row",
			alignItems: "center",
			paddingVertical: THEME.spacing.xl,
		},
		loadingText: {
			marginLeft: THEME.spacing.sm,
			fontSize: 14,
			color: THEME.colors.text.muted,
		},
		errorContainer: {
			alignItems: "center",
			paddingVertical: THEME.spacing.xl,
			gap: 6,
		},
		errorText: {
			fontSize: 14,
			fontWeight: "600",
			color: "#EF4444",
			textAlign: "center",
		},
		errorDetail: {
			fontSize: 11,
			color: THEME.colors.text.muted,
			textAlign: "center",
		},
		emptyText: {
			fontSize: 14,
			color: THEME.colors.text.muted,
			textAlign: "center",
			paddingVertical: THEME.spacing.xl,
		},
		// Produits
		categoryBlock: {
			marginBottom: THEME.spacing.md,
		},
		categoryTitle: {
			fontSize: 12,
			fontWeight: "600",
			color: "#F59E0B",
			textTransform: "uppercase",
			letterSpacing: 0.5,
			marginBottom: THEME.spacing.sm,
			paddingLeft: 4,
		},
		productCard: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "space-between",
			backgroundColor: THEME.colors.background.elevated,
			borderRadius: THEME.radius.lg,
			padding: THEME.spacing.md,
			marginBottom: 6,
			borderWidth: 1,
			borderColor: THEME.colors.border.subtle,
		},
		productCardActive: {
			borderColor: "#F59E0B",
			backgroundColor: "rgba(245,158,11,0.06)",
		},
		productInfo: {
			flex: 1,
			marginRight: THEME.spacing.md,
		},
		productName: {
			fontSize: 14,
			fontWeight: "600",
			color: THEME.colors.text.primary,
			marginBottom: 2,
		},
		productDesc: {
			fontSize: 12,
			color: THEME.colors.text.muted,
			marginBottom: 4,
		},
		productPrice: {
			fontSize: 13,
			fontWeight: "700",
			color: "#F59E0B",
		},
		quantityRow: {
			flexDirection: "row",
			alignItems: "center",
			gap: 6,
		},
		qtyBtn: {
			width: 30,
			height: 30,
			borderRadius: 8,
			backgroundColor: THEME.colors.text.muted,
			justifyContent: "center",
			alignItems: "center",
		},
		qtyBtnAdd: {
			backgroundColor: "#F59E0B",
		},
		qtyBtnInvisible: {
			backgroundColor: "transparent",
		},
		qtyValue: {
			fontSize: 15,
			fontWeight: "700",
			color: THEME.colors.text.muted,
			minWidth: 22,
			textAlign: "center",
		},
		qtyValueActive: {
			color: THEME.colors.text.primary,
		},
		// Footer
		footer: {
			backgroundColor: THEME.colors.background.card,
			borderTopWidth: 1,
			borderTopColor: THEME.colors.border.subtle,
			paddingHorizontal: THEME.spacing.lg,
			paddingTop: THEME.spacing.md,
			paddingBottom: THEME.spacing.xl,
		},
		totalRow: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
			marginBottom: THEME.spacing.md,
		},
		totalLabel: {
			fontSize: 15,
			fontWeight: "600",
			color: THEME.colors.text.secondary,
		},
		totalValue: {
			fontSize: 22,
			fontWeight: "800",
			color: "#F59E0B",
		},
		footerBtns: {
			flexDirection: "row",
			gap: 10,
		},
		cancelBtn: {
			flex: 1,
			paddingVertical: 13,
			borderRadius: THEME.radius.lg,
			borderWidth: 1,
			borderColor: THEME.colors.border.subtle,
			alignItems: "center",
			justifyContent: "center",
		},
		cancelBtnText: {
			fontSize: 14,
			fontWeight: "600",
			color: THEME.colors.text.secondary,
		},
		submitBtn: {
			flex: 2,
			borderRadius: THEME.radius.lg,
			overflow: "hidden",
		},
		submitBtnDisabled: {
			opacity: 0.55,
		},
		submitGradient: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "center",
			paddingVertical: 13,
		},
		submitBtnText: {
			fontSize: 14,
			fontWeight: "700",
			color: "#FFFFFF",
		},
		// ─── Carte paiement (hauteur adaptée pour le reçu) ────
		cardPayment: {
			height: SCREEN_HEIGHT * 0.82,
		},
		// ─── Étape paiement ──────────────────────
		paymentBody: {
			flex: 1,
			alignItems: "center",
			justifyContent: "flex-start",
			paddingHorizontal: THEME.spacing.xl,
			paddingTop: THEME.spacing.lg,
			paddingBottom: THEME.spacing.md,
		},
		paymentSuccessIcon: {
			marginBottom: THEME.spacing.md,
		},
		paymentSuccessTitle: {
			fontSize: 20,
			fontWeight: "800",
			color: THEME.colors.text.primary,
			marginBottom: 4,
			textAlign: "center",
		},
		paymentSuccessSubtitle: {
			fontSize: 13,
			color: THEME.colors.text.muted,
			marginBottom: 4,
			textAlign: "center",
		},
		paymentAmount: {
			fontSize: 42,
			fontWeight: "900",
			color: "#10B981",
			marginBottom: THEME.spacing.xl,
			textAlign: "center",
		},
		paymentMethodLabel: {
			fontSize: 12,
			fontWeight: "700",
			color: THEME.colors.text.muted,
			textTransform: "uppercase",
			letterSpacing: 0.8,
			marginBottom: THEME.spacing.md,
		},
		paymentBtns: {
			flexDirection: "row",
			gap: 14,
			marginBottom: THEME.spacing.xl,
		},
		paymentBtn: {
			flex: 1,
			borderRadius: THEME.radius.xl,
			overflow: "hidden",
		},
		paymentBtnGradient: {
			alignItems: "center",
			justifyContent: "center",
			paddingVertical: 20,
			paddingHorizontal: 16,
		},
		paymentBtnText: {
			fontSize: 15,
			fontWeight: "700",
			color: "#FFFFFF",
		},
		paymentSkipBtn: {
			paddingVertical: 10,
			paddingHorizontal: 16,
		},
		paymentSkipText: {
			fontSize: 13,
			color: THEME.colors.text.muted,
			textDecorationLine: "underline",
			textAlign: "center",
		},
		// ─── Reçu ─────────────────────────────────
		receiptContainer: {
			width: "100%",
			backgroundColor: THEME.colors.background.elevated,
			borderRadius: THEME.radius.lg,
			paddingHorizontal: 14,
			paddingVertical: 10,
			marginBottom: THEME.spacing.lg,
		},
		receiptTitle: {
			fontSize: 11,
			fontWeight: "700",
			color: THEME.colors.text.muted,
			textTransform: "uppercase",
			letterSpacing: 0.8,
			marginBottom: 8,
		},
		receiptScroll: {
			maxHeight: 130,
		},
		receiptItem: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "space-between",
			paddingVertical: 4,
		},
		receiptItemLeft: {
			flexDirection: "row",
			alignItems: "center",
			flex: 1,
			marginRight: 8,
		},
		receiptItemQty: {
			fontSize: 13,
			fontWeight: "700",
			color: "#F59E0B",
			minWidth: 24,
		},
		receiptItemName: {
			fontSize: 13,
			color: THEME.colors.text.primary,
			flex: 1,
		},
		receiptItemPrice: {
			fontSize: 13,
			fontWeight: "600",
			color: THEME.colors.text.secondary,
		},
	});

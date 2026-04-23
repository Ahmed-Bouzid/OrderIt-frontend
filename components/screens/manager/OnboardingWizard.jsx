// components/screens/manager/OnboardingWizard.jsx
// Wizard d'onboarding : configuration initiale du restaurant en < 5 min
// Étape 0 → Tables bulk  | Étape 1 → QR Codes | Étape 2 → Premiers produits

import React, {
	useState,
	useEffect,
	useCallback,
	useMemo,
} from "react";
import {
	View,
	Text,
	TextInput,
	TouchableOpacity,
	ScrollView,
	FlatList,
	StyleSheet,
	ActivityIndicator,
	Alert,
	Share,
	Platform,
	KeyboardAvoidingView,
	SafeAreaView,
	Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import QRCode from "react-native-qrcode-svg";
import { useRouter } from "expo-router";
import { useAuthFetch } from "../../../hooks/useAuthFetch";
import useThemeStore from "../../../src/stores/useThemeStore";
import { getTheme } from "../../../utils/themeUtils";

// ─── Constantes ──────────────────────────────────────────────────────────────

const CLIENT_APP_URL = process.env.EXPO_PUBLIC_CLIENT_APP_URL || "";
const CATEGORIES = ["Entrée", "Plat", "Dessert", "Boisson", "Autre"];
const emptyProduct = () => ({ name: "", price: "", category: "Plat" });

// ─── Composant principal ─────────────────────────────────────────────────────

export default function OnboardingWizard({ onComplete }) {
	const { themeMode } = useThemeStore();
	const THEME = useMemo(() => getTheme(themeMode), [themeMode]);
	const styles = useMemo(() => createStyles(THEME), [THEME]);
	const authFetch = useAuthFetch();
	const router = useRouter();

	// ── État global ────────────────────────────────────────────────────────────
	const [step, setStep] = useState(0);
	const [loading, setLoading] = useState(false);
	const [restaurantId, setRestaurantId] = useState(null);

	// ── État étape 0 ───────────────────────────────────────────────────────────
	const [tableCount, setTableCount] = useState("5");
	const [capacity, setCapacity] = useState("4");
	const [clientAppUrl, setClientAppUrl] = useState(CLIENT_APP_URL);

	// ── État étape 1 ───────────────────────────────────────────────────────────
	const [tables, setTables] = useState([]);

	// ── État étape 2 ───────────────────────────────────────────────────────────
	const [products, setProducts] = useState([emptyProduct()]);
	const [savingProducts, setSavingProducts] = useState(false);

	// ── État pour feedback + validation ────────────────────────────────────────
	const [toast, setToast] = useState({ visible: false, message: "", type: "success" });
	const [inputErrors, setInputErrors] = useState({});
	const [stepCompleted, setStepCompleted] = useState({ 0: false, 1: false, 2: false });
	const [pressedButton, setPressedButton] = useState(null);
	
	// Animation pour les transitions
	const fadeInAnim = useMemo(() => new Animated.Value(0), []);

	// ── Init ──────────────────────────────────────────────────────────────────
	useEffect(() => {
		AsyncStorage.getItem("restaurantId").then((id) => {
			if (id) setRestaurantId(id);
		});
	}, []);

	// ── Toast auto-hide ───────────────────────────────────────────────────────
	useEffect(() => {
		if (toast.visible) {
			const timer = setTimeout(() => {
				setToast({ ...toast, visible: false });
			}, 3000);
			return () => clearTimeout(timer);
		}
	}, [toast]);

	// ── Helper : Afficher toast message ────────────────────────────────────────
	const showToast = (message, type = "success") => {
		setToast({ visible: true, message, type });
	};

	// ─── Étape 0 : Créer les tables en batch ─────────────────────────────────

	const handleCreateTables = async () => {
		if (!restaurantId) {
			return Alert.alert(
				"Erreur",
				"ID restaurant introuvable. Reconnectez-vous.",
			);
		}
		const count = parseInt(tableCount, 10);
		if (isNaN(count) || count < 1 || count > 50) {
			return Alert.alert(
				"Erreur",
				"Nombre de tables invalide. Entrez un nombre entre 1 et 50.",
			);
		}
		const cap = parseInt(capacity, 10);
		if (isNaN(cap) || cap < 1 || cap > 30) {
			return Alert.alert(
				"Erreur",
				"Capacité invalide. Entrez un nombre entre 1 et 30.",
			);
		}

		setLoading(true);
		try {
			const result = await authFetch("/tables/batch", {
				method: "POST",
				body: JSON.stringify({
					restaurantId,
					count,
					capacity: cap,
					clientAppUrl: clientAppUrl.trim() || undefined,
				}),
			});
			setTables(result.tables || []);
			setStepCompleted((prev) => ({ ...prev, 0: true }));
			showToast(`✅ ${count} table${count > 1 ? "s" : ""} créée${count > 1 ? "s" : ""} avec succès !`);
			setTimeout(() => setStep(1), 800);
		} catch (error) {
			showToast(error.message || "Impossible de créer les tables.", "error");
		} finally {
			setLoading(false);
		}
	};

	// ─── Étape 1 : Partager les QR codes ─────────────────────────────────────

	const getQRValue = useCallback(
		(table) => {
			if (table.qrCodeUrl) return table.qrCodeUrl;
			const base = clientAppUrl.trim().replace(/\/$/, "");
			if (base && restaurantId) {
				return `${base}/r/${restaurantId}/${table._id}`;
			}
			// Fallback : valeur non vide pour éviter un crash QRCode
			return `table-${table.number}-${table._id}`;
		},
		[clientAppUrl, restaurantId],
	);

	const handleShareQR = async (table) => {
		const qrValue = getQRValue(table);
		const isRealUrl =
			qrValue.startsWith("http://") || qrValue.startsWith("https://");
		try {
			await Share.share({
				message: isRealUrl
					? `Table ${table.number} – Scannez le QR code ou ouvrez : ${qrValue}`
					: `Table ${table.number}`,
				url: Platform.OS === "ios" && isRealUrl ? qrValue : undefined,
			});
		} catch {
			// L'utilisateur a annulé le partage
		}
	};

	// ─── Étape 2 : Gestion des produits ──────────────────────────────────────

	const validatePrice = (price) => {
		if (!price.trim()) return null;
		const num = parseFloat(price.replace(",", "."));
		if (isNaN(num)) return "Prix invalide";
		if (num <= 0) return "Prix doit être > 0";
		return null;
	};

	const updateProduct = useCallback((index, field, value) => {
		setProducts((prev) =>
			prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)),
		);
		// Valider le prix si c'est le champ price
		if (field === "price") {
			const error = validatePrice(value);
			setInputErrors((prev) => ({
				...prev,
				[`price-${index}`]: error,
			}));
		}
	}, []);

	const addProductRow = useCallback(() => {
		setProducts((prev) => [...prev, emptyProduct()]);
	}, []);

	const removeProductRow = useCallback((index) => {
		setProducts((prev) => prev.filter((_, i) => i !== index));
	}, []);

	const handleSaveProducts = async () => {
		const valid = products.filter(
			(p) => p.name.trim() && p.price.trim(),
		);
		if (valid.length === 0) {
			return Alert.alert(
				"",
				"Ajoutez au moins un produit (nom + prix), ou ignorez cette étape.",
			);
		}

		setSavingProducts(true);
		let successCount = 0;
		for (const p of valid) {
			const price = parseFloat(p.price.replace(",", "."));
			if (isNaN(price) || price <= 0) continue;
			try {
				await authFetch("/products", {
					method: "POST",
					body: JSON.stringify({
						restaurantId,
						name: p.name.trim(),
						price,
						category: p.category,
					}),
				});
				successCount++;
			} catch (err) {
				console.warn("❌ Erreur création produit:", p.name, err.message);
				showToast(`⚠️ ${p.name} n'a pas pu être ajouté`, "error");
			}
		}
		setSavingProducts(false);
		if (successCount > 0) {
			setStepCompleted((prev) => ({ ...prev, 2: true }));
			showToast(`✅ ${successCount} produit${successCount > 1 ? "s" : ""} ajouté${successCount > 1 ? "s" : ""} !`);
			setTimeout(() => finishOnboarding(), 800);
		}
	};

	// ─── Finalisation ─────────────────────────────────────────────────────────

	const finishOnboarding = async () => {
		await AsyncStorage.setItem("onboardingComplete", "true");
		if (onComplete) {
			onComplete();
		} else {
			router.replace("/tabs/activity");
		}
	};

	// ─── Indicateur de progression ───────────────────────────────────────────

	const renderStepIndicator = () => (
		<View style={styles.stepIndicator}>
			{[0, 1, 2].map((i) => (
				<View
					key={i}
					style={[
						styles.stepDot,
						step === i && styles.stepDotActive,
						step > i && styles.stepDotDone,
					]}
				>
					{step > i && stepCompleted[i] && (
						<Ionicons
							name="checkmark-circle"
							size={14}
							color={THEME.colors.status.success}
							style={{ position: "absolute" }}
						/>
					)}
					{step === i && (
						<View
							style={{
								width: 6,
								height: 6,
								borderRadius: 3,
								backgroundColor: "#FFFFFF",
							}}
						/>
					)}
				</View>
			))}
		</View>
	);

	// ─── Header partagé ──────────────────────────────────────────────────────

	const renderHeader = (title, subtitle) => (
		<LinearGradient
			colors={THEME.gradients?.primary || ["#1a1d2e", "#0C0F17"]}
			style={styles.header}
		>
			<Text style={styles.headerTitle}>{title}</Text>
			{subtitle ? (
				<Text style={styles.headerSubtitle}>{subtitle}</Text>
			) : null}
		</LinearGradient>
	);

	// ─── Composant Toast ────────────────────────────────────────────────────────

	const renderToast = () => {
		if (!toast.visible) return null;
		return (
			<View
				style={[
					styles.toast,
					toast.type === "error"
						? styles.toastError
						: styles.toastSuccess,
				]}
			>
				<Ionicons
					name={
						toast.type === "error"
							? "alert-circle"
							: "checkmark-circle"
					}
					size={16}
					color="#fff"
				/>
				<Text style={styles.toastText}>{toast.message}</Text>
			</View>
		);
	};

	// ─── Composant "What's Next?" ──────────────────────────────────────────────

	const renderWhatNext = (step) => {
		const hints = {
			0: "📊 Vous aurez besoin de votre nombre de tables et de la capacité.",
			1: "🔗 Partagez les QR codes avec vos serveurs pour que les clients puissent commander.",
			2: "✅ Vous pourrez ajouter plus de produits depuis Réglages → Menu.",
		};
		return (
			<View style={styles.hintBox}>
				<Ionicons
					name="bulb-outline"
					size={16}
					color={THEME.colors.primary}
				/>
				<Text style={styles.hintText}>{hints[step] || ""}</Text>
			</View>
		);
	};

	// ═══════════════════════════════════════════════════════════════════════════
	// ÉTAPE 0 — Créer les tables
	// ═══════════════════════════════════════════════════════════════════════════

	if (step === 0) {
		return (
			<>
				{renderToast()}
				<SafeAreaView style={styles.safeArea}>
				<KeyboardAvoidingView
					style={styles.container}
					behavior={Platform.OS === "ios" ? "padding" : undefined}
				>
					{renderHeader(
						"Configuration initiale",
						"Prêt en moins de 5 minutes",
					)}
					{renderStepIndicator()}

					<ScrollView
						style={styles.scrollView}
						contentContainerStyle={styles.content}
						keyboardShouldPersistTaps="handled"
					>
						<Text style={styles.sectionTitle}>
							Créez vos tables
						</Text>
						<Text style={styles.sectionSubtitle}>
							Les tables seront numérotées automatiquement.
							Vous pourrez les modifier à tout moment.
						</Text>

						{renderWhatNext(0)}

						{/* Nombre de tables */}
						<View style={styles.inputGroup}>
							<Text style={styles.label}>Nombre de tables</Text>
							<TextInput
								style={styles.input}
								value={tableCount}
								onChangeText={setTableCount}
								keyboardType="numeric"
								placeholder="Ex: 10"
								placeholderTextColor={THEME.colors.text.disabled}
								maxLength={2}
							/>
						</View>

						{/* Capacité */}
						<View style={styles.inputGroup}>
							<Text style={styles.label}>
								Capacité par défaut (couverts)
							</Text>
							<TextInput
								style={styles.input}
								value={capacity}
								onChangeText={setCapacity}
								keyboardType="numeric"
								placeholder="Ex: 4"
								placeholderTextColor={THEME.colors.text.disabled}
								maxLength={2}
							/>
						</View>

						{/* URL client app */}
						<View style={styles.inputGroup}>
							<Text style={styles.label}>
								URL de votre app client{" "}
								<Text style={styles.labelOptional}>(optionnel)</Text>
							</Text>
							<Text style={styles.labelHint}>
								Intégrée dans vos QR codes. Ex :{" "}
								https://votreapp.vercel.app
							</Text>
							<TextInput
								style={styles.input}
								value={clientAppUrl}
								onChangeText={setClientAppUrl}
								placeholder="https://votreapp.vercel.app"
								placeholderTextColor={THEME.colors.text.disabled}
								keyboardType="url"
								autoCapitalize="none"
								autoCorrect={false}
							/>
						</View>

						<TouchableOpacity
							style={[
								styles.primaryButton,
								loading && styles.primaryButtonDisabled,
							]}
							onPress={handleCreateTables}
							onPressIn={() => setPressedButton("create")}
							onPressOut={() => setPressedButton(null)}
							activeOpacity={0.8}
							disabled={loading}
						>
							{loading ? (
								<ActivityIndicator color="#fff" />
							) : (
								<>
									<Ionicons
										name="grid-outline"
										size={20}
										color="#fff"
									/>
									<Text style={styles.primaryButtonText}>
										Créer{" "}
										{tableCount || "?"} table
										{parseInt(tableCount, 10) > 1 ? "s" : ""}{" "}
										→
									</Text>
								</>
							)}
						</TouchableOpacity>

						<TouchableOpacity
							style={styles.skipButton}
							onPress={() => setStep(2)}
						>
							<Text style={styles.skipText}>
								Ignorer et passer au menu
							</Text>
						</TouchableOpacity>

						<TouchableOpacity
							style={styles.skipButton}
							onPress={finishOnboarding}
						>
							<Text style={styles.skipText}>
								Ignorer le wizard
							</Text>
						</TouchableOpacity>
					</ScrollView>
				</KeyboardAvoidingView>
			</SafeAreaView>
			</>
		);
	}

	// ═══════════════════════════════════════════════════════════════════════════
	// ÉTAPE 1 — QR Codes
	// ═══════════════════════════════════════════════════════════════════════════

	if (step === 1) {
		const hasUrl = !!clientAppUrl.trim();

		return (
			<>
				{renderToast()}
				<SafeAreaView style={styles.safeArea}>
					<View style={styles.container}>
					{renderHeader(
						"Codes QR générés",
						`${tables.length} table${tables.length > 1 ? "s" : ""} créée${tables.length > 1 ? "s" : ""}`,
					)}
					{renderStepIndicator()}

					{renderWhatNext(1)}

					{!hasUrl && (
						<View style={styles.warningBanner}>
							<Ionicons
								name="information-circle-outline"
								size={18}
								color="#F59E0B"
							/>
							<Text style={styles.warningText}>
								URL non configurée — les QR ne sont pas encore actifs.
								Ajoutez l'URL client depuis Réglages une fois votre app déployée.
							</Text>
						</View>
					)}

					<FlatList
						data={tables}
						keyExtractor={(item) => item._id}
						numColumns={2}
						contentContainerStyle={styles.qrGrid}
						renderItem={({ item }) => {
							const qrValue = getQRValue(item);
							return (
								<View style={styles.qrCard}>
									<Text style={styles.qrTableLabel}>
										Table {item.number}
									</Text>
									<View style={styles.qrWrapper}>
										<QRCode
											value={qrValue}
											size={90}
											backgroundColor="transparent"
											color={THEME.colors.text.primary}
										/>
									</View>
									<TouchableOpacity
										style={styles.shareBtn}
										onPress={() => handleShareQR(item)}
										activeOpacity={0.7}
									>
										<Ionicons
											name="share-outline"
											size={15}
											color={THEME.colors.primary}
										/>
										<Text style={styles.shareBtnText}>
											Partager
										</Text>
									</TouchableOpacity>
								</View>
							);
						}}
					/>

					<View style={styles.footerButtons}>
						<TouchableOpacity
							style={styles.primaryButton}
							onPress={() => setStep(2)}
							activeOpacity={0.8}
						>
							<Text style={styles.primaryButtonText}>
								Ajouter des plats →
							</Text>
						</TouchableOpacity>
						<TouchableOpacity
							style={styles.skipButton}
							onPress={finishOnboarding}
						>
							<Text style={styles.skipText}>
								Terminer sans ajouter de menu
							</Text>
						</TouchableOpacity>
					</View>
				</View>
			</SafeAreaView>
			</>
		);
	}

	// ═══════════════════════════════════════════════════════════════════════════
	// ÉTAPE 2 — Premiers produits
	// ═══════════════════════════════════════════════════════════════════════════

	return (
		<>
			{renderToast()}
			<SafeAreaView style={styles.safeArea}>
			<KeyboardAvoidingView
				style={styles.container}
				behavior={Platform.OS === "ios" ? "padding" : undefined}
			>
				{renderHeader(
					"Premier menu",
					"Ajoutez vos plats (optionnel)",
				)}
				{renderStepIndicator()}

				<ScrollView
					style={styles.scrollView}
					contentContainerStyle={styles.content}
					keyboardShouldPersistTaps="handled"
				>
					{renderWhatNext(2)}

					<Text style={styles.sectionSubtitle}>
						Vous pourrez compléter votre menu à tout moment depuis
						Réglages → Menu.
					</Text>

					{products.map((product, index) => (
						<View key={index} style={styles.productRow}>
							<View style={styles.productRowHeader}>
								<Text style={styles.productIndex}>
									Plat {index + 1}
								</Text>
								{products.length > 1 && (
									<TouchableOpacity
										onPress={() => removeProductRow(index)}
									>
										<Ionicons
											name="close-circle"
											size={20}
											color={THEME.colors.status.error}
										/>
									</TouchableOpacity>
								)}
							</View>

							<TextInput
								style={styles.input}
								value={product.name}
								onChangeText={(v) =>
									updateProduct(index, "name", v)
								}
								placeholder="Nom du plat (ex: Burger maison)"
								placeholderTextColor={
									THEME.colors.text.disabled
								}
							/>

							<TextInput
								style={[
									styles.input,
									inputErrors[`price-${index}`] &&
										styles.inputError,
								]}
								value={product.price}
								onChangeText={(v) =>
									updateProduct(index, "price", v)
								}
								placeholder="Prix (ex: 12.50)"
								placeholderTextColor={
									THEME.colors.text.disabled
								}
								keyboardType="decimal-pad"
							/>
							{inputErrors[`price-${index}`] && (
								<Text style={styles.errorText}>
									{inputErrors[`price-${index}`]}
								</Text>
							)}

							{/* Sélecteur catégorie */}
							<ScrollView
								horizontal
								showsHorizontalScrollIndicator={false}
								style={styles.categoryScroll}
							>
								{CATEGORIES.map((cat) => (
									<TouchableOpacity
										key={cat}
										style={[
											styles.categoryChip,
											product.category === cat &&
												styles.categoryChipActive,
										]}
										onPress={() =>
											updateProduct(
												index,
												"category",
												cat,
											)
										}
									>
										<Text
											style={[
												styles.categoryChipText,
												product.category === cat &&
													styles.categoryChipTextActive,
											]}
										>
											{cat}
										</Text>
									</TouchableOpacity>
								))}
							</ScrollView>
						</View>
					))}

					<TouchableOpacity
						style={styles.addRowButton}
						onPress={addProductRow}
						activeOpacity={0.75}
					>
						<Ionicons
							name="add-circle-outline"
							size={20}
							color={THEME.colors.primary}
						/>
						<Text style={styles.addRowText}>
							Ajouter un plat
						</Text>
					</TouchableOpacity>

					<TouchableOpacity
						style={[
							styles.primaryButton,
							savingProducts && styles.primaryButtonDisabled,
						]}
						onPress={handleSaveProducts}
						onPressIn={() => setPressedButton("save")}
						onPressOut={() => setPressedButton(null)}
						activeOpacity={0.8}
						disabled={savingProducts}
					>
						{savingProducts ? (
							<ActivityIndicator color="#fff" />
						) : (
							<Text style={styles.primaryButtonText}>
								Enregistrer et terminer
							</Text>
						)}
					</TouchableOpacity>

					<TouchableOpacity
						style={styles.skipButton}
						onPress={finishOnboarding}
					>
						<Text style={styles.skipText}>
							Ignorer cette étape
						</Text>
					</TouchableOpacity>
				</ScrollView>
			</KeyboardAvoidingView>
		</SafeAreaView>
		</>
	);
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const createStyles = (THEME) =>
	StyleSheet.create({
		safeArea: {
			flex: 1,
			backgroundColor: THEME.colors.background.primary,
		},
		container: {
			flex: 1,
			backgroundColor: THEME.colors.background.primary,
		},
		header: {
			paddingTop: 20,
			paddingBottom: 20,
			paddingHorizontal: 24,
		},
		headerTitle: {
			fontSize: 28,
			fontWeight: "800",
			color: "#FFFFFF",
			lineHeight: 36,
			letterSpacing: -0.5,
		},
		headerSubtitle: {
			fontSize: 15,
			color: "rgba(255,255,255,0.85)",
			marginTop: 8,
			lineHeight: 22,
			fontWeight: "400",
		},
		stepIndicator: {
			flexDirection: "row",
			justifyContent: "center",
			alignItems: "center",
			paddingVertical: 14,
			gap: 8,
		},
		stepDot: {
			width: 10,
			height: 10,
			borderRadius: 5,
			backgroundColor: THEME.colors.border.subtle,
		},
		stepDotActive: {
			width: 14,
			height: 14,
			borderRadius: 7,
			backgroundColor: THEME.colors.primary,
		},
		stepDotDone: {
			backgroundColor: THEME.colors.status.success,
		},
		scrollView: {
			flex: 1,
		},
		content: {
			paddingHorizontal: 20,
			paddingBottom: 40,
		},
		sectionTitle: {
			fontSize: 20,
			fontWeight: "700",
			color: THEME.colors.text.primary,
			marginBottom: 8,
			marginTop: 4,
			lineHeight: 28,
		},
		sectionSubtitle: {
			fontSize: 15,
			color: THEME.colors.text.secondary,
			marginBottom: 24,
			lineHeight: 22,
			fontWeight: "400",
		},
		inputGroup: {
			marginBottom: 18,
		},
		label: {
			fontSize: 15,
			fontWeight: "600",
			color: THEME.colors.text.primary,
			marginBottom: 8,
			lineHeight: 20,
		},
		labelOptional: {
			fontSize: 13,
			color: THEME.colors.text.secondary,
			fontWeight: "400",
		},
		labelHint: {
			fontSize: 13,
			color: THEME.colors.text.secondary,
			marginBottom: 8,
			lineHeight: 18,
			fontWeight: "400",
		},
		input: {
			backgroundColor: THEME.colors.background.card,
			borderWidth: 1.5,
			borderColor: THEME.colors.border.default,
			borderRadius: 12,
			paddingHorizontal: 16,
			paddingVertical: 14,
			fontSize: 16,
			color: THEME.colors.text.primary,
			fontWeight: "500",
		},
		inputError: {
			borderColor: THEME.colors.status.error,
			backgroundColor: `${THEME.colors.status.error}08`,
		},
		errorText: {
			fontSize: 12,
			color: THEME.colors.status.error,
			marginTop: 4,
			marginBottom: 8,
		},
		primaryButton: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "center",
			backgroundColor: THEME.colors.primary,
			borderRadius: 14,
			paddingVertical: 16,
			marginTop: 12,
			gap: 10,
			shadowColor: THEME.colors.primary,
			shadowOffset: { width: 0, height: 4 },
			shadowOpacity: 0.3,
			shadowRadius: 6,
			elevation: 4,
		},
		primaryButtonDisabled: {
			opacity: 0.6,
		},
		primaryButtonText: {
			fontSize: 17,
			fontWeight: "700",
			color: "#FFFFFF",
			letterSpacing: 0.3,
		},
		skipButton: {
			alignItems: "center",
			paddingVertical: 14,
		},
		skipText: {
			fontSize: 15,
			color: THEME.colors.text.secondary,
			textDecorationLine: "underline",
			fontWeight: "500",
		},
		// ── QR Grid ────────────────────────────────────────────────────────────
		warningBanner: {
			flexDirection: "row",
			alignItems: "flex-start",
			backgroundColor: "rgba(245, 158, 11, 0.1)",
			borderWidth: 1,
			borderColor: "rgba(245, 158, 11, 0.3)",
			borderRadius: 10,
			padding: 12,
			marginHorizontal: 16,
			marginBottom: 8,
			gap: 8,
		},
		warningText: {
			flex: 1,
			fontSize: 12,
			color: "#F59E0B",
			lineHeight: 18,
		},
		qrGrid: {
			paddingHorizontal: 12,
			paddingBottom: 8,
		},
		qrCard: {
			flex: 1,
			margin: 6,
			backgroundColor: THEME.colors.background.card,
			borderRadius: 12,
			padding: 12,
			alignItems: "center",
			borderWidth: 1,
			borderColor: THEME.colors.border.subtle,
		},
		qrTableLabel: {
			fontSize: 13,
			fontWeight: "600",
			color: THEME.colors.text.primary,
			marginBottom: 8,
		},
		qrWrapper: {
			padding: 8,
			backgroundColor: "#FFFFFF",
			borderRadius: 8,
			marginBottom: 10,
		},
		shareBtn: {
			flexDirection: "row",
			alignItems: "center",
			gap: 4,
			paddingVertical: 6,
			paddingHorizontal: 12,
			borderRadius: 8,
			borderWidth: 1,
			borderColor: THEME.colors.primary,
		},
		shareBtnText: {
			fontSize: 12,
			color: THEME.colors.primary,
			fontWeight: "500",
		},
		footerButtons: {
			paddingHorizontal: 20,
			paddingBottom: 20,
			paddingTop: 8,
		},
		// ── Product rows ───────────────────────────────────────────────────────
		productRow: {
			backgroundColor: THEME.colors.background.card,
			borderRadius: 12,
			padding: 14,
			marginBottom: 12,
			borderWidth: 1,
			borderColor: THEME.colors.border.subtle,
		},
		productRowHeader: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
			marginBottom: 10,
		},
		productIndex: {
			fontSize: 14,
			fontWeight: "600",
			color: THEME.colors.text.primary,
		},
		categoryScroll: {
			marginTop: 10,
		},
		categoryChip: {
			paddingHorizontal: 12,
			paddingVertical: 6,
			borderRadius: 16,
			borderWidth: 1,
			borderColor: THEME.colors.border.default,
			marginRight: 8,
		},
		categoryChipActive: {
			backgroundColor: THEME.colors.primary,
			borderColor: THEME.colors.primary,
		},
		categoryChipText: {
			fontSize: 13,
			color: THEME.colors.text.secondary,
		},
		categoryChipTextActive: {
			color: "#FFFFFF",
			fontWeight: "600",
		},
		addRowButton: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "center",
			paddingVertical: 12,
			borderRadius: 10,
			borderWidth: 1.5,
			borderColor: THEME.colors.primary,
			borderStyle: "dashed",
			marginBottom: 8,
			gap: 8,
		},
		addRowText: {
			fontSize: 14,
			color: THEME.colors.primary,
			fontWeight: "500",
		},
		// ── Toast ──────────────────────────────────────────────────────────────
		toast: {
			position: "absolute",
			top: 20,
			left: 16,
			right: 16,
			flexDirection: "row",
			alignItems: "center",
			paddingHorizontal: 16,
			paddingVertical: 12,
			borderRadius: 10,
			gap: 10,
			zIndex: 1000,
			shadowColor: "#000",
			shadowOffset: { width: 0, height: 2 },
			shadowOpacity: 0.25,
			shadowRadius: 3.84,
			elevation: 5,
		},
		toastSuccess: {
			backgroundColor: THEME.colors.status.success,
		},
		toastError: {
			backgroundColor: THEME.colors.status.error,
		},
		toastText: {
			flex: 1,
			fontSize: 14,
			color: "#FFFFFF",
			fontWeight: "500",
		},
		// ── Hint Box ───────────────────────────────────────────────────────────
		hintBox: {
			flexDirection: "row",
			alignItems: "flex-start",
			backgroundColor: `${THEME.colors.primary}10`,
			borderWidth: 1,
			borderColor: `${THEME.colors.primary}30`,
			borderRadius: 12,
			padding: 14,
			marginBottom: 24,
			gap: 10,
		},
		hintText: {
			flex: 1,
			fontSize: 14,
			color: THEME.colors.primary,
			fontWeight: "500",
			lineHeight: 20,
		},
	});

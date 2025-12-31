// Modale de sélection d'allergènes pour un client (réservation)
import React, {
	useState,
	useEffect,
	useCallback,
	useMemo,
	useRef,
} from "react";
import {
	Modal,
	View,
	Text,
	TouchableOpacity,
	Pressable,
	FlatList,
	TextInput,
	ActivityIndicator,
	StyleSheet,
	Animated,
	Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import useThemeStore from "../../../src/stores/useThemeStore";
import { getTheme } from "../../../utils/themeUtils";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

// Liste des allergènes standards (14 allergènes obligatoires UE)
const DEFAULT_ALLERGENS = [
	{
		_id: "gluten",
		name: "Gluten",
		icon: "🌾",
		description: "Céréales contenant du gluten",
	},
	{
		_id: "crustaces",
		name: "Crustacés",
		icon: "🦐",
		description: "Crustacés et produits dérivés",
	},
	{
		_id: "oeufs",
		name: "Œufs",
		icon: "🥚",
		description: "Œufs et produits à base d'œufs",
	},
	{
		_id: "poissons",
		name: "Poissons",
		icon: "🐟",
		description: "Poissons et produits dérivés",
	},
	{
		_id: "arachides",
		name: "Arachides",
		icon: "🥜",
		description: "Arachides et produits dérivés",
	},
	{
		_id: "soja",
		name: "Soja",
		icon: "🫘",
		description: "Soja et produits à base de soja",
	},
	{
		_id: "lait",
		name: "Lait",
		icon: "🥛",
		description: "Lait et produits laitiers (lactose)",
	},
	{
		_id: "fruits_coque",
		name: "Fruits à coque",
		icon: "🌰",
		description: "Amandes, noisettes, noix...",
	},
	{
		_id: "celeri",
		name: "Céleri",
		icon: "🥬",
		description: "Céleri et produits dérivés",
	},
	{
		_id: "moutarde",
		name: "Moutarde",
		icon: "🟡",
		description: "Moutarde et produits dérivés",
	},
	{
		_id: "sesame",
		name: "Sésame",
		icon: "🌰",
		description: "Graines de sésame",
	},
	{
		_id: "sulfites",
		name: "Sulfites",
		icon: "⚗️",
		description: "Anhydride sulfureux et sulfites",
	},
	{
		_id: "lupin",
		name: "Lupin",
		icon: "🌸",
		description: "Lupin et produits dérivés",
	},
	{
		_id: "mollusques",
		name: "Mollusques",
		icon: "🦪",
		description: "Mollusques et produits dérivés",
	},
];

export const ClientAllergenModal = React.memo(
	({ visible, onClose, onValidate, selectedAllergenIds = [] }) => {
		const { themeMode } = useThemeStore();
		const THEME = useMemo(() => getTheme(themeMode), [themeMode]);
		const styles = useMemo(
			() => createStyles(THEME, themeMode === "dark" || themeMode === "ocean"),
			[THEME, themeMode]
		);

		// Animation du slide
		const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
		const overlayOpacity = useRef(new Animated.Value(0)).current;

		const [allergens, setAllergens] = useState(DEFAULT_ALLERGENS);
		const [selected, setSelected] = useState(selectedAllergenIds);
		const [searchQuery, setSearchQuery] = useState("");
		const [loading, setLoading] = useState(false);

		// Charger les allergènes depuis l'API (fallback sur les défauts)
		const loadAllergens = useCallback(async () => {
			console.log("🔄 Chargement des allergènes...");
			setLoading(true);
			try {
				const token = await AsyncStorage.getItem("@access_token");
				const baseUrl =
					process.env.EXPO_PUBLIC_API_URL ||
					"https://orderit-backend-6y1m.onrender.com";

				console.log("🔑 Token:", token ? "présent" : "absent");
				console.log("🌐 URL:", `${baseUrl}/allergens`);

				const response = await fetch(`${baseUrl}/allergens`, {
					headers: { Authorization: `Bearer ${token}` },
				});

				console.log("📡 Response status:", response.status);

				if (response.ok) {
					const data = await response.json();
					console.log("✅ Allergènes reçus:", data?.length || 0, data);
					if (Array.isArray(data) && data.length > 0) {
						setAllergens(data);
					}
				} else {
					console.log("❌ Erreur API:", response.status);
				}
			} catch (error) {
				console.log("⚠️ Utilisation des allergènes par défaut:", error.message);
			} finally {
				setLoading(false);
			}
		}, []);

		useEffect(() => {
			if (visible) {
				loadAllergens();
				setSelected(selectedAllergenIds);
				// Animation d'entrée
				Animated.parallel([
					Animated.timing(overlayOpacity, {
						toValue: 1,
						duration: 250,
						useNativeDriver: true,
					}),
					Animated.spring(slideAnim, {
						toValue: 0,
						tension: 65,
						friction: 11,
						useNativeDriver: true,
					}),
				]).start();
			} else {
				// Reset pour la prochaine ouverture
				slideAnim.setValue(SCREEN_HEIGHT);
				overlayOpacity.setValue(0);
			}
		}, [
			visible,
			selectedAllergenIds,
			loadAllergens,
			slideAnim,
			overlayOpacity,
		]);

		// Fermeture avec animation
		const handleClose = useCallback(() => {
			Animated.parallel([
				Animated.timing(overlayOpacity, {
					toValue: 0,
					duration: 200,
					useNativeDriver: true,
				}),
				Animated.timing(slideAnim, {
					toValue: SCREEN_HEIGHT,
					duration: 250,
					useNativeDriver: true,
				}),
			]).start(() => {
				onClose?.();
			});
		}, [onClose, slideAnim, overlayOpacity]);

		const toggleAllergen = useCallback((allergenId) => {
			setSelected((prev) => {
				if (prev.includes(allergenId)) {
					return prev.filter((id) => id !== allergenId);
				}
				return [...prev, allergenId];
			});
		}, []);

		const handleValidate = useCallback(() => {
			// Retourner les allergènes sélectionnés avec leurs infos complètes
			const selectedAllergens = allergens.filter((a) =>
				selected.includes(a._id)
			);
			onValidate?.(selectedAllergens);
			onClose?.();
		}, [selected, allergens, onValidate, onClose]);

		const filteredAllergens = useMemo(() => {
			if (!searchQuery.trim()) return allergens;
			const query = searchQuery.toLowerCase();
			return allergens.filter(
				(a) =>
					a.name.toLowerCase().includes(query) ||
					a.description?.toLowerCase().includes(query)
			);
		}, [allergens, searchQuery]);

		const renderAllergenItem = useCallback(
			({ item }) => {
				const isSelected = selected.includes(item._id);

				return (
					<TouchableOpacity
						style={[
							styles.allergenItem,
							isSelected && styles.allergenItemSelected,
						]}
						onPress={() => toggleAllergen(item._id)}
						activeOpacity={0.7}
					>
						<View
							style={[styles.checkbox, isSelected && styles.checkboxSelected]}
						>
							{isSelected && (
								<Ionicons name="checkmark" size={14} color="#FFFFFF" />
							)}
						</View>

						<Text style={styles.allergenIcon}>{item.icon}</Text>

						<View style={styles.allergenInfo}>
							<Text
								style={[
									styles.allergenName,
									isSelected && styles.allergenNameSelected,
								]}
							>
								{item.name}
							</Text>
							{item.description && (
								<Text style={styles.allergenDescription} numberOfLines={1}>
									{item.description}
								</Text>
							)}
						</View>

						{isSelected && (
							<Ionicons
								name="warning"
								size={18}
								color={THEME.colors.status.error}
							/>
						)}
					</TouchableOpacity>
				);
			},
			[selected, toggleAllergen, styles, THEME]
		);

		return (
			<Modal
				visible={visible}
				animationType="none"
				transparent
				onRequestClose={handleClose}
			>
				<Pressable style={{ flex: 1 }} onPress={handleClose}>
					<Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
						<Pressable onPress={(e) => e.stopPropagation()}>
							<Animated.View
								style={[
									styles.container,
									{ transform: [{ translateY: slideAnim }] },
								]}
							>
								{/* Header */}
								<View style={styles.header}>
									<View style={styles.headerLeft}>
										<Ionicons
											name="warning"
											size={22}
											color={THEME.colors.status.error}
										/>
										<Text style={styles.headerTitle}>Allergies client</Text>
									</View>
									<TouchableOpacity
										onPress={handleClose}
										style={styles.closeButton}
									>
										<Ionicons
											name="close"
											size={24}
											color={themeMode === "light" ? "#8E8E93" : "#A1A1A6"}
										/>
									</TouchableOpacity>
								</View>

								{/* Barre de recherche */}
								<View style={styles.searchContainer}>
									<Ionicons
										name="search"
										size={18}
										color={THEME.colors.text.muted}
									/>
									<TextInput
										style={styles.searchInput}
										placeholder="Rechercher un allergène..."
										placeholderTextColor={THEME.colors.text.muted}
										value={searchQuery}
										onChangeText={setSearchQuery}
									/>
									{searchQuery.length > 0 && (
										<TouchableOpacity onPress={() => setSearchQuery("")}>
											<Ionicons
												name="close-circle"
												size={18}
												color={THEME.colors.text.muted}
											/>
										</TouchableOpacity>
									)}
								</View>

								{/* Info */}
								<View style={styles.infoBox}>
									<Ionicons
										name="information-circle"
										size={16}
										color={THEME.colors.primary.amber}
									/>
									<Text style={styles.infoText}>
										Sélectionnez les allergènes du client pour alerter sur les
										produits à risque
									</Text>
								</View>

								{/* Liste des allergènes */}
								{loading ? (
									<View style={styles.loadingContainer}>
										<ActivityIndicator
											size="large"
											color={THEME.colors.primary.amber}
										/>
									</View>
								) : (
									<FlatList
										data={filteredAllergens}
										renderItem={renderAllergenItem}
										keyExtractor={(item) => item._id}
										style={styles.list}
										contentContainerStyle={styles.listContent}
										showsVerticalScrollIndicator={false}
									/>
								)}

								{/* Footer avec compteur et bouton */}
								<View style={styles.footer}>
									<Text style={styles.selectedCount}>
										{selected.length} allergène{selected.length > 1 ? "s" : ""}{" "}
										sélectionné{selected.length > 1 ? "s" : ""}
									</Text>
									<TouchableOpacity
										style={styles.validateButton}
										onPress={handleValidate}
									>
										<Text style={styles.validateButtonText}>Valider</Text>
										<Ionicons name="checkmark" size={20} color="#FFFFFF" />
									</TouchableOpacity>
								</View>
							</Animated.View>
						</Pressable>
					</Animated.View>
				</Pressable>
			</Modal>
		);
	}
);

ClientAllergenModal.displayName = "ClientAllergenModal";

const createStyles = (THEME, isDarkMode) =>
	StyleSheet.create({
		overlay: {
			flex: 1,
			backgroundColor: "rgba(0,0,0,0.85)",
			justifyContent: "flex-end",
		},
		container: {
			backgroundColor: isDarkMode ? "#1C1C1E" : "#FFFFFF",
			borderTopLeftRadius: THEME.radius["2xl"],
			borderTopRightRadius: THEME.radius["2xl"],
			maxHeight: "85%",
			paddingBottom: THEME.spacing["3xl"],
			// Ombre pour plus de contraste
			shadowColor: "#000",
			shadowOffset: { width: 0, height: -4 },
			shadowOpacity: 0.3,
			shadowRadius: 12,
			elevation: 20,
		},
		header: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "space-between",
			padding: THEME.spacing.lg,
			borderBottomWidth: 1,
			borderBottomColor: isDarkMode
				? "rgba(255,255,255,0.15)"
				: "rgba(0,0,0,0.1)",
			backgroundColor: isDarkMode ? "#2C2C2E" : "#F8F8F8",
		},
		headerLeft: {
			flexDirection: "row",
			alignItems: "center",
			gap: THEME.spacing.sm,
		},
		headerTitle: {
			fontSize: 18,
			fontWeight: "700",
			color: THEME.colors.text.primary,
		},
		closeButton: {
			padding: THEME.spacing.xs,
		},
		searchContainer: {
			flexDirection: "row",
			alignItems: "center",
			backgroundColor: isDarkMode ? "#3A3A3C" : "#F2F2F7",
			marginHorizontal: THEME.spacing.lg,
			marginTop: THEME.spacing.md,
			paddingHorizontal: THEME.spacing.md,
			borderRadius: THEME.radius.lg,
			borderWidth: 1,
			borderColor: isDarkMode ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.1)",
			gap: THEME.spacing.sm,
		},
		searchInput: {
			flex: 1,
			paddingVertical: THEME.spacing.md,
			fontSize: 15,
			color: isDarkMode ? "#FFFFFF" : "#000000",
		},
		infoBox: {
			flexDirection: "row",
			alignItems: "center",
			backgroundColor: isDarkMode
				? "rgba(245, 158, 11, 0.2)"
				: "rgba(245, 158, 11, 0.15)",
			marginHorizontal: THEME.spacing.lg,
			marginTop: THEME.spacing.md,
			padding: THEME.spacing.md,
			borderRadius: THEME.radius.md,
			gap: THEME.spacing.sm,
			borderWidth: 1,
			borderColor: "rgba(245, 158, 11, 0.3)",
		},
		infoText: {
			flex: 1,
			fontSize: 12,
			color: isDarkMode ? "#E5E5E7" : "#636366",
		},
		loadingContainer: {
			flex: 1,
			justifyContent: "center",
			alignItems: "center",
			paddingVertical: THEME.spacing["3xl"],
		},
		list: {
			flex: 1,
			marginTop: THEME.spacing.md,
		},
		listContent: {
			paddingHorizontal: THEME.spacing.lg,
			paddingBottom: THEME.spacing.md,
		},
		allergenItem: {
			flexDirection: "row",
			alignItems: "center",
			backgroundColor: isDarkMode ? "#2C2C2E" : "#FFFFFF",
			padding: THEME.spacing.md,
			marginBottom: THEME.spacing.sm,
			borderRadius: THEME.radius.lg,
			borderWidth: 1,
			borderColor: isDarkMode ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.1)",
			gap: THEME.spacing.md,
		},
		allergenItemSelected: {
			backgroundColor: isDarkMode
				? "rgba(255, 59, 48, 0.2)"
				: "rgba(255, 59, 48, 0.1)",
			borderColor: "#FF3B30",
		},
		checkbox: {
			width: 22,
			height: 22,
			borderRadius: 6,
			borderWidth: 2,
			borderColor: isDarkMode ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.2)",
			alignItems: "center",
			justifyContent: "center",
			backgroundColor: isDarkMode ? "#3A3A3C" : "#F2F2F7",
		},
		checkboxSelected: {
			backgroundColor: "#FF3B30",
			borderColor: "#FF3B30",
		},
		allergenIcon: {
			fontSize: 24,
		},
		allergenInfo: {
			flex: 1,
		},
		allergenName: {
			fontSize: 15,
			fontWeight: "600",
			color: isDarkMode ? "#FFFFFF" : "#000000",
		},
		allergenNameSelected: {
			color: "#FF3B30",
		},
		allergenDescription: {
			fontSize: 12,
			color: isDarkMode ? "#A1A1A6" : "#8E8E93",
			marginTop: 2,
		},
		footer: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "space-between",
			paddingHorizontal: THEME.spacing.lg,
			paddingTop: THEME.spacing.md,
			borderTopWidth: 1,
			borderTopColor: isDarkMode ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.1)",
			backgroundColor: isDarkMode ? "#2C2C2E" : "#F8F8F8",
		},
		selectedCount: {
			fontSize: 13,
			color: isDarkMode ? "#A1A1A6" : "#8E8E93",
			fontWeight: "500",
		},
		validateButton: {
			flexDirection: "row",
			alignItems: "center",
			backgroundColor: "#F59E0B",
			paddingHorizontal: THEME.spacing.xl,
			paddingVertical: THEME.spacing.md,
			borderRadius: THEME.radius.lg,
			gap: THEME.spacing.sm,
			shadowColor: "#F59E0B",
			shadowOffset: { width: 0, height: 2 },
			shadowOpacity: 0.3,
			shadowRadius: 4,
			elevation: 4,
		},
		validateButtonText: {
			fontSize: 15,
			fontWeight: "700",
			color: "#FFFFFF",
		},
	});

export default ClientAllergenModal;

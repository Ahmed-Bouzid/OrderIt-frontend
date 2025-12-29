import React, { useState, useEffect, useCallback } from "react";
import {
	Modal,
	View,
	Text,
	TouchableOpacity,
	FlatList,
	TextInput,
	ActivityIndicator,
	Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import useThemeStore from "../../src/stores/useThemeStore";

/**
 * Modale de sélection d'allergènes pour un produit
 * @param {boolean} visible - Visibilité de la modale
 * @param {function} onClose - Callback de fermeture
 * @param {function} onValidate - Callback de validation (allergenIds: string[])
 * @param {string} productId - ID du produit
 * @param {function} authFetch - Hook d'authentification
 */
export default function AllergenSelectionModal({
	visible,
	onClose,
	onValidate,
	productId,
	authFetch,
}) {
	const { theme } = useThemeStore();
	const [allergens, setAllergens] = useState([]);
	const [selectedAllergens, setSelectedAllergens] = useState([]);
	const [searchQuery, setSearchQuery] = useState("");
	const [loading, setLoading] = useState(false);

	// Charger tous les allergènes et les allergènes du produit
	const loadData = useCallback(async () => {
		setLoading(true);
		try {
			// Charger tous les allergènes
			const allAllergens = await authFetch("/allergens");

			// Charger les allergènes du produit
			const productAllergens = await authFetch(
				`/products/${productId}/allergens`
			);

			setAllergens(Array.isArray(allAllergens) ? allAllergens : []);
			setSelectedAllergens(
				Array.isArray(productAllergens)
					? productAllergens.map((a) => a._id)
					: []
			);
		} catch (error) {
			console.error("❌ Erreur chargement allergènes:", error);
			Alert.alert("Erreur", "Impossible de charger les allergènes");
		} finally {
			setLoading(false);
		}
	}, [authFetch, productId]);

	useEffect(() => {
		if (visible && productId) {
			loadData();
		}
	}, [visible, productId, loadData]);

	const toggleAllergen = useCallback((allergenId) => {
		setSelectedAllergens((prev) => {
			if (prev.includes(allergenId)) {
				return prev.filter((id) => id !== allergenId);
			}
			return [...prev, allergenId];
		});
	}, []);

	const handleValidate = async () => {
		try {
			setLoading(true);
			await onValidate(selectedAllergens);
			onClose();
		} catch (error) {
			console.error("❌ Erreur validation allergènes:", error);
			Alert.alert("Erreur", "Impossible de sauvegarder les allergènes");
		} finally {
			setLoading(false);
		}
	};

	const filteredAllergens = allergens.filter((a) =>
		a.name.toLowerCase().includes(searchQuery.toLowerCase())
	);

	const renderAllergenItem = ({ item }) => {
		const isSelected = selectedAllergens.includes(item._id);

		return (
			<TouchableOpacity
				style={{
					flexDirection: "row",
					alignItems: "center",
					padding: 12,
					marginVertical: 4,
					marginHorizontal: 8,
					backgroundColor: isSelected
						? theme.primaryColor || "#4CAF50"
						: theme.cardColor || "#f5f5f5",
					borderRadius: 8,
					shadowColor: "#000",
					shadowOffset: { width: 0, height: 1 },
					shadowOpacity: 0.1,
					shadowRadius: 2,
					elevation: 2,
				}}
				onPress={() => toggleAllergen(item._id)}
				activeOpacity={0.7}
			>
				<View
					style={{
						width: 24,
						height: 24,
						borderRadius: 12,
						backgroundColor: isSelected ? "#fff" : "transparent",
						borderWidth: 2,
						borderColor: isSelected ? "#fff" : theme.borderColor || "#ddd",
						alignItems: "center",
						justifyContent: "center",
						marginRight: 12,
					}}
				>
					{isSelected && (
						<Ionicons name="checkmark" size={16} color={theme.primaryColor} />
					)}
				</View>

				<Text
					style={{
						fontSize: 16,
						flex: 1,
						color: isSelected ? "#fff" : theme.textColor || "#333",
						fontWeight: isSelected ? "600" : "400",
					}}
				>
					{item.icon} {item.name}
				</Text>

				{item.description && (
					<Text
						style={{
							fontSize: 12,
							color: isSelected ? "#f0f0f0" : theme.subtextColor || "#666",
							marginLeft: 8,
						}}
						numberOfLines={1}
					>
						{item.description}
					</Text>
				)}
			</TouchableOpacity>
		);
	};

	return (
		<Modal
			visible={visible}
			animationType="slide"
			transparent
			onRequestClose={onClose}
		>
			<View
				style={{
					flex: 1,
					backgroundColor: "rgba(0,0,0,0.5)",
					justifyContent: "flex-end",
				}}
			>
				<View
					style={{
						backgroundColor: theme.backgroundColor || "#fff",
						borderTopLeftRadius: 20,
						borderTopRightRadius: 20,
						maxHeight: "80%",
						paddingBottom: 20,
					}}
				>
					{/* Header */}
					<View
						style={{
							flexDirection: "row",
							alignItems: "center",
							justifyContent: "space-between",
							padding: 16,
							borderBottomWidth: 1,
							borderBottomColor: theme.borderColor || "#eee",
						}}
					>
						<Text
							style={{
								fontSize: 18,
								fontWeight: "600",
								color: theme.textColor || "#333",
							}}
						>
							Allergènes du produit
						</Text>
						<TouchableOpacity onPress={onClose} disabled={loading}>
							<Ionicons
								name="close"
								size={24}
								color={theme.textColor || "#333"}
							/>
						</TouchableOpacity>
					</View>

					{/* Search Bar */}
					<View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
						<View
							style={{
								flexDirection: "row",
								alignItems: "center",
								backgroundColor: theme.cardColor || "#f5f5f5",
								borderRadius: 8,
								paddingHorizontal: 12,
								height: 40,
							}}
						>
							<Ionicons
								name="search"
								size={20}
								color={theme.subtextColor || "#999"}
							/>
							<TextInput
								style={{
									flex: 1,
									marginLeft: 8,
									fontSize: 16,
									color: theme.textColor || "#333",
								}}
								placeholder="Rechercher un allergène..."
								placeholderTextColor={theme.subtextColor || "#999"}
								value={searchQuery}
								onChangeText={setSearchQuery}
							/>
							{searchQuery.length > 0 && (
								<TouchableOpacity onPress={() => setSearchQuery("")}>
									<Ionicons name="close-circle" size={20} color="#999" />
								</TouchableOpacity>
							)}
						</View>
					</View>

					{/* Selection Count */}
					<View
						style={{
							paddingHorizontal: 16,
							paddingVertical: 8,
						}}
					>
						<Text
							style={{
								fontSize: 14,
								color: theme.subtextColor || "#666",
							}}
						>
							{selectedAllergens.length} allergène(s) sélectionné(s)
						</Text>
					</View>

					{/* List */}
					{loading ? (
						<View
							style={{
								padding: 40,
								alignItems: "center",
								justifyContent: "center",
							}}
						>
							<ActivityIndicator size="large" color={theme.primaryColor} />
						</View>
					) : (
						<FlatList
							data={filteredAllergens}
							renderItem={renderAllergenItem}
							keyExtractor={(item) => item._id}
							style={{ maxHeight: 400 }}
							ListEmptyComponent={
								<View style={{ padding: 40, alignItems: "center" }}>
									<Ionicons name="sad-outline" size={48} color="#ccc" />
									<Text
										style={{
											marginTop: 12,
											fontSize: 16,
											color: theme.subtextColor || "#999",
										}}
									>
										Aucun allergène trouvé
									</Text>
								</View>
							}
						/>
					)}

					{/* Actions */}
					<View
						style={{
							flexDirection: "row",
							paddingHorizontal: 16,
							paddingTop: 12,
							gap: 12,
						}}
					>
						<TouchableOpacity
							style={{
								flex: 1,
								padding: 14,
								borderRadius: 8,
								backgroundColor: theme.cardColor || "#f5f5f5",
								alignItems: "center",
							}}
							onPress={onClose}
							disabled={loading}
						>
							<Text
								style={{
									fontSize: 16,
									fontWeight: "600",
									color: theme.textColor || "#333",
								}}
							>
								Annuler
							</Text>
						</TouchableOpacity>

						<TouchableOpacity
							style={{
								flex: 1,
								padding: 14,
								borderRadius: 8,
								backgroundColor: theme.primaryColor || "#4CAF50",
								alignItems: "center",
							}}
							onPress={handleValidate}
							disabled={loading}
						>
							{loading ? (
								<ActivityIndicator color="#fff" />
							) : (
								<Text
									style={{ fontSize: 16, fontWeight: "600", color: "#fff" }}
								>
									Valider
								</Text>
							)}
						</TouchableOpacity>
					</View>
				</View>
			</View>
		</Modal>
	);
}

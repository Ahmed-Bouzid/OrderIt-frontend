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
	StyleSheet,
	Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

export default function AllergenSelectionModal({
	visible,
	onClose,
	onValidate,
	productId,
	productName,
	authFetch,
}) {
	const [allergens, setAllergens] = useState([]);
	const [selectedAllergens, setSelectedAllergens] = useState([]);
	const [searchQuery, setSearchQuery] = useState("");
	const [loading, setLoading] = useState(false);

	const loadData = useCallback(async () => {
		setLoading(true);
		try {
			const allAllergens = await authFetch("/allergens");
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
			console.error("Erreur chargement allergenes:", error);
			Alert.alert("Erreur", "Impossible de charger les allergenes");
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
		setSelectedAllergens((prev) =>
			prev.includes(allergenId)
				? prev.filter((id) => id !== allergenId)
				: [...prev, allergenId]
		);
	}, []);

	const handleValidate = async () => {
		try {
			setLoading(true);
			await onValidate(selectedAllergens);
			onClose();
		} catch (error) {
			console.error("Erreur validation allergenes:", error);
			Alert.alert("Erreur", "Impossible de sauvegarder les allergenes");
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
				style={[styles.allergenRow, isSelected && styles.allergenRowSelected]}
				onPress={() => toggleAllergen(item._id)}
				activeOpacity={0.7}
			>
				<View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
					{isSelected && (
						<Ionicons name="checkmark" size={14} color="#F59E0B" />
					)}
				</View>
				<Text style={styles.allergenIcon}>{item.icon}</Text>
				<View style={styles.allergenInfo}>
					<Text style={[styles.allergenName, isSelected && styles.allergenNameSelected]}>
						{item.name}
					</Text>
					{item.description ? (
						<Text style={styles.allergenDesc} numberOfLines={1}>
							{item.description}
						</Text>
					) : null}
				</View>
			</TouchableOpacity>
		);
	};

	return (
		<Modal
			visible={visible}
			animationType="fade"
			transparent
			onRequestClose={onClose}
		>
			<View style={styles.overlay}>
				<View style={styles.sheet}>
					<View style={styles.header}>
						<View style={styles.headerLeft}>
							<View style={styles.iconBox}>
								<Ionicons name="warning" size={22} color="#F59E0B" />
							</View>
							<View style={{ flex: 1 }}>
								<Text style={styles.headerTitle}>Allergenes</Text>
								{productName ? (
									<Text style={styles.headerSub} numberOfLines={1}>
										{productName}
									</Text>
								) : null}
							</View>
						</View>
						<TouchableOpacity style={styles.closeBtn} onPress={onClose}>
							<Ionicons name="close" size={20} color="#94A3B8" />
						</TouchableOpacity>
					</View>

					<View style={styles.searchWrapper}>
						<Ionicons name="search" size={18} color="#64748B" style={{ marginRight: 8 }} />
						<TextInput
							style={styles.searchInput}
							placeholder="Rechercher un allergene..."
							placeholderTextColor="#64748B"
							value={searchQuery}
							onChangeText={setSearchQuery}
						/>
						{searchQuery.length > 0 && (
							<TouchableOpacity onPress={() => setSearchQuery("")}>
								<Ionicons name="close-circle" size={18} color="#64748B" />
							</TouchableOpacity>
						)}
					</View>

					<View style={styles.counter}>
						<Text style={styles.counterText}>
							{selectedAllergens.length} allergene{selectedAllergens.length !== 1 ? "s" : ""} selectionne{selectedAllergens.length !== 1 ? "s" : ""}
						</Text>
					</View>

					{loading ? (
						<View style={styles.loader}>
							<ActivityIndicator size="large" color="#F59E0B" />
						</View>
					) : (
						<FlatList
							data={filteredAllergens}
							renderItem={renderAllergenItem}
							keyExtractor={(item) => item._id}
							style={styles.list}
							contentContainerStyle={styles.listContent}
							keyboardShouldPersistTaps="handled"
							ListEmptyComponent={
								<View style={styles.emptyWrap}>
									<Ionicons name="sad-outline" size={40} color="#334155" />
									<Text style={styles.emptyText}>Aucun allergene trouve</Text>
								</View>
							}
						/>
					)}

					<View style={styles.footer}>
						<TouchableOpacity
							style={styles.cancelBtn}
							onPress={onClose}
							disabled={loading}
						>
							<Text style={styles.cancelBtnText}>Annuler</Text>
						</TouchableOpacity>
						<TouchableOpacity
							style={styles.validateBtnWrap}
							onPress={handleValidate}
							disabled={loading}
							activeOpacity={0.85}
						>
							<LinearGradient
								colors={["#F59E0B", "#D97706"]}
								style={styles.validateBtn}
								start={{ x: 0, y: 0 }}
								end={{ x: 1, y: 0 }}
							>
								{loading ? (
									<ActivityIndicator color="#fff" size="small" />
								) : (
									<Text style={styles.validateBtnText}>Valider</Text>
								)}
							</LinearGradient>
						</TouchableOpacity>
					</View>
				</View>
			</View>
		</Modal>
	);
}

const styles = StyleSheet.create({
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
		flexShrink: 1,
		minHeight: "70%",
		borderWidth: 1,
		borderColor: "rgba(255,255,255,0.08)",
		overflow: "hidden",
	},
	header: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: 20,
		paddingVertical: 16,
		borderBottomWidth: 1,
		borderBottomColor: "rgba(255,255,255,0.07)",
	},
	headerLeft: {
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
		flex: 1,
	},
	iconBox: {
		width: 40,
		height: 40,
		borderRadius: 10,
		backgroundColor: "rgba(245,158,11,0.15)",
		alignItems: "center",
		justifyContent: "center",
	},
	headerTitle: {
		fontSize: 17,
		fontWeight: "700",
		color: "#F1F5F9",
	},
	headerSub: {
		fontSize: 13,
		color: "#64748B",
		marginTop: 1,
		maxWidth: 220,
	},
	closeBtn: {
		width: 36,
		height: 36,
		borderRadius: 18,
		backgroundColor: "rgba(255,255,255,0.06)",
		alignItems: "center",
		justifyContent: "center",
		marginLeft: 8,
	},
	searchWrapper: {
		flexDirection: "row",
		alignItems: "center",
		marginHorizontal: 16,
		marginTop: 14,
		marginBottom: 8,
		backgroundColor: "rgba(255,255,255,0.06)",
		borderRadius: 10,
		paddingHorizontal: 12,
		height: 44,
		borderWidth: 1,
		borderColor: "rgba(255,255,255,0.08)",
	},
	searchInput: {
		flex: 1,
		fontSize: 15,
		color: "#F1F5F9",
		height: "100%",
	},
	counter: {
		paddingHorizontal: 20,
		paddingBottom: 8,
	},
	counterText: {
		fontSize: 13,
		color: "#64748B",
	},
	loader: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		padding: 40,
	},
	list: {
		flex: 1,
	},
	listContent: {
		paddingHorizontal: 12,
		paddingBottom: 8,
	},
	allergenRow: {
		flexDirection: "row",
		alignItems: "center",
		paddingVertical: 10,
		paddingHorizontal: 12,
		marginVertical: 3,
		borderRadius: 10,
		backgroundColor: "rgba(255,255,255,0.04)",
		borderWidth: 1,
		borderColor: "rgba(255,255,255,0.06)",
	},
	allergenRowSelected: {
		backgroundColor: "rgba(245,158,11,0.12)",
		borderColor: "rgba(245,158,11,0.30)",
	},
	checkbox: {
		width: 22,
		height: 22,
		borderRadius: 6,
		borderWidth: 2,
		borderColor: "#334155",
		alignItems: "center",
		justifyContent: "center",
		marginRight: 10,
	},
	checkboxSelected: {
		borderColor: "#F59E0B",
		backgroundColor: "rgba(245,158,11,0.15)",
	},
	allergenIcon: {
		fontSize: 20,
		marginRight: 10,
	},
	allergenInfo: {
		flex: 1,
	},
	allergenName: {
		fontSize: 15,
		color: "#CBD5E1",
		fontWeight: "500",
	},
	allergenNameSelected: {
		color: "#F1F5F9",
		fontWeight: "600",
	},
	allergenDesc: {
		fontSize: 12,
		color: "#64748B",
		marginTop: 2,
	},
	emptyWrap: {
		padding: 40,
		alignItems: "center",
	},
	emptyText: {
		marginTop: 10,
		fontSize: 15,
		color: "#475569",
	},
	footer: {
		flexDirection: "row",
		paddingHorizontal: 16,
		paddingTop: 12,
		paddingBottom: Platform.OS === "ios" ? 32 : 20,
		gap: 12,
		borderTopWidth: 1,
		borderTopColor: "rgba(255,255,255,0.07)",
		backgroundColor: "#1E293B",
	},
	cancelBtn: {
		flex: 1,
		height: 48,
		borderRadius: 12,
		backgroundColor: "rgba(255,255,255,0.07)",
		alignItems: "center",
		justifyContent: "center",
	},
	cancelBtnText: {
		fontSize: 15,
		fontWeight: "600",
		color: "#94A3B8",
	},
	validateBtnWrap: {
		flex: 1,
		height: 48,
		borderRadius: 12,
		overflow: "hidden",
	},
	validateBtn: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
	},
	validateBtnText: {
		fontSize: 15,
		fontWeight: "700",
		color: "#fff",
	},
});

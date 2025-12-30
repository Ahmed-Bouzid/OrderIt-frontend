// components/elements/ActivityModals/ProductModal.jsx
import React, { useState, useRef, useEffect } from "react";
import {
	View,
	Text,
	TouchableOpacity,
	Modal,
	Animated,
	ScrollView,
	Image,
} from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_CONFIG } from "../../../src/config/apiConfig";

const API_BASE_URL = API_CONFIG.baseURL;

export const ProductModal = ({ visible, onClose, product, theme }) => {
	const safeOnClose = onClose || (() => {});

	// États pour le flip
	const [showAllergens, setShowAllergens] = useState(false);
	const [allergens, setAllergens] = useState([]);
	const [loadingAllergens, setLoadingAllergens] = useState(false);
	const flipAnimation = useRef(new Animated.Value(0)).current;

	// Charger les allergènes du produit
	useEffect(() => {
		const fetchAllergens = async () => {
			if (!product?._id) return;
			setLoadingAllergens(true);
			try {
				const token = await AsyncStorage.getItem("@access_token");
				const response = await fetch(
					`${API_BASE_URL}/products/${product._id}/allergens`,
					{
						headers: { Authorization: `Bearer ${token}` },
					}
				);
				if (response.ok) {
					const data = await response.json();
					setAllergens(Array.isArray(data) ? data : []);
				}
			} catch (error) {
				console.error("Erreur chargement allergènes:", error);
			} finally {
				setLoadingAllergens(false);
			}
		};
		if (visible) {
			fetchAllergens();
			setShowAllergens(false);
			flipAnimation.setValue(0);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [visible, product?._id]);

	// Animation flip
	const flipToAllergens = () => {
		Animated.spring(flipAnimation, {
			toValue: 1,
			friction: 8,
			tension: 10,
			useNativeDriver: true,
		}).start();
		setShowAllergens(true);
	};

	const flipToDescription = () => {
		Animated.spring(flipAnimation, {
			toValue: 0,
			friction: 8,
			tension: 10,
			useNativeDriver: true,
		}).start();
		setShowAllergens(false);
	};

	// Styles d'animation
	const frontAnimatedStyle = {
		transform: [
			{
				rotateY: flipAnimation.interpolate({
					inputRange: [0, 1],
					outputRange: ["0deg", "180deg"],
				}),
			},
		],
		backfaceVisibility: "hidden",
	};

	const backAnimatedStyle = {
		transform: [
			{
				rotateY: flipAnimation.interpolate({
					inputRange: [0, 1],
					outputRange: ["180deg", "360deg"],
				}),
			},
		],
		backfaceVisibility: "hidden",
	};

	if (!visible) return null;

	return (
		<Modal
			visible={visible}
			transparent
			animationType="fade"
			onRequestClose={safeOnClose}
		>
			<View
				style={{
					flex: 1,
					backgroundColor: "rgba(10,18,36,0.55)",
					justifyContent: "center",
					alignItems: "center",
				}}
			>
				<BlurView
					intensity={60}
					tint="dark"
					style={{ borderRadius: 24, overflow: "hidden" }}
				>
					<LinearGradient
						colors={["#232B3B", "#1A1F29", "#232B3B"]}
						start={{ x: 0, y: 0 }}
						end={{ x: 1, y: 1 }}
						style={{
							width: 340,
							minHeight: 320,
							padding: 28,
							borderRadius: 24,
							justifyContent: "space-between",
							alignItems: "center",
							shadowColor: "#000",
							shadowOpacity: 0.25,
							shadowOffset: { width: 0, height: 8 },
							shadowRadius: 24,
							elevation: 16,
						}}
					>
						{/* Bouton fermer */}
						<TouchableOpacity
							onPress={safeOnClose}
							style={{ position: "absolute", top: 18, right: 18, zIndex: 2 }}
						>
							<Ionicons name="close" size={28} color="#fff" />
						</TouchableOpacity>

						{/* Image du produit */}
						{product?.image && (
							<Image
								source={{ uri: product.image }}
								style={{
									width: 120,
									height: 120,
									borderRadius: 12,
									marginBottom: 12,
									borderWidth: 2,
									borderColor: "rgba(255, 255, 255, 0.2)",
								}}
								resizeMode="cover"
							/>
						)}

						{/* Nom du produit */}
						<Text
							style={{
								color: "#FFFFFF",
								fontWeight: "800",
								fontSize: 26,
								marginBottom: 16,
								textAlign: "center",
								textShadowColor: "rgba(0, 0, 0, 0.3)",
								textShadowOffset: { width: 0, height: 2 },
								textShadowRadius: 4,
								letterSpacing: 0.2,
							}}
						>
							{product?.name || "Produit"}
						</Text>

						{/* Bouton toggle allergènes/description */}
						<TouchableOpacity
							onPress={showAllergens ? flipToDescription : flipToAllergens}
							style={{
								flexDirection: "row",
								alignItems: "center",
								backgroundColor: "rgba(255, 152, 0, 0.15)",
								paddingHorizontal: 16,
								paddingVertical: 10,
								borderRadius: 20,
								marginBottom: 18,
								borderWidth: 1,
								borderColor: "rgba(255, 152, 0, 0.3)",
							}}
						>
							<Text
								style={{ color: "#ff9800", fontSize: 14, fontWeight: "600" }}
							>
								{showAllergens ? "📝 Description" : "⚠️ Allergènes"}
								{!showAllergens && allergens.length > 0 && (
									<Text style={{ color: "#f57c00", fontWeight: "700" }}>
										{" "}
										({allergens.length})
									</Text>
								)}
							</Text>
							<Ionicons
								name="swap-horizontal"
								size={16}
								color="#ff9800"
								style={{ marginLeft: 8 }}
							/>
						</TouchableOpacity>

						{/* Zone flip card */}
						<View style={{ width: "100%", height: 100, marginBottom: 18 }}>
							{/* Face avant: Description */}
							<Animated.View
								style={[
									{
										position: "absolute",
										width: "100%",
										height: "100%",
										justifyContent: "center",
										alignItems: "center",
									},
									frontAnimatedStyle,
								]}
								pointerEvents={showAllergens ? "none" : "auto"}
							>
								<Text
									style={{
										color: "#E0E6F0",
										fontSize: 16,
										textAlign: "center",
										lineHeight: 22,
									}}
								>
									{product?.description || "Aucune description disponible."}
								</Text>
							</Animated.View>

							{/* Face arrière: Allergènes */}
							<Animated.View
								style={[
									{
										position: "absolute",
										width: "100%",
										height: "100%",
										borderRadius: 12,
										padding: 10,
									},
									backAnimatedStyle,
								]}
								pointerEvents={showAllergens ? "auto" : "none"}
							>
								<ScrollView
									showsVerticalScrollIndicator={false}
									contentContainerStyle={{ alignItems: "center" }}
								>
									{loadingAllergens ? (
										<Text style={{ color: "#E0E6F0", fontStyle: "italic" }}>
											Chargement...
										</Text>
									) : allergens.length > 0 ? (
										<View
											style={{
												flexDirection: "row",
												flexWrap: "wrap",
												justifyContent: "center",
												gap: 8,
											}}
										>
											{allergens.map((allergen, index) => (
												<View
													key={allergen._id || index}
													style={{
														flexDirection: "row",
														alignItems: "center",
														backgroundColor: "rgba(255, 152, 0, 0.2)",
														paddingHorizontal: 10,
														paddingVertical: 6,
														borderRadius: 16,
														borderWidth: 1,
														borderColor: "#ff9800",
													}}
												>
													<Text style={{ fontSize: 16, marginRight: 6 }}>
														{allergen.icon || "⚠️"}
													</Text>
													<Text
														style={{
															color: "#fff",
															fontSize: 13,
															fontWeight: "500",
														}}
													>
														{allergen.name}
													</Text>
												</View>
											))}
										</View>
									) : (
										<View style={{ alignItems: "center" }}>
											<Text style={{ fontSize: 24, marginBottom: 4 }}>✅</Text>
											<Text
												style={{
													color: "#81c784",
													fontSize: 14,
													fontStyle: "italic",
												}}
											>
												Aucun allergène déclaré
											</Text>
										</View>
									)}
								</ScrollView>
							</Animated.View>
						</View>

						{/* Prix */}
						<Text
							style={{
								color: "#FFD700",
								fontWeight: "700",
								fontSize: 20,
								marginBottom: 18,
							}}
						>
							{product?.price ? `${product.price.toFixed(2)} €` : ""}
						</Text>

						{/* Bouton fermer */}
						<TouchableOpacity
							onPress={safeOnClose}
							style={{
								backgroundColor: "#4CAF50",
								paddingHorizontal: 32,
								paddingVertical: 14,
								borderRadius: 12,
								marginTop: 10,
								shadowColor: "#000",
								shadowOpacity: 0.18,
								shadowOffset: { width: 0, height: 2 },
								shadowRadius: 6,
								elevation: 6,
							}}
						>
							<Text style={{ color: "#fff", fontWeight: "bold", fontSize: 18 }}>
								Fermer
							</Text>
						</TouchableOpacity>
					</LinearGradient>
				</BlurView>
			</View>
		</Modal>
	);
};

// components/elements/ActivityModals/ProductModal.jsx
import React from "react";
import { View, Text, TouchableOpacity, Modal } from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

export const ProductModal = ({ visible, onClose, product, theme }) => {
	// ⭐ Guard clause
	if (!visible) return null;

	const safeTheme = theme || { textColor: "#fff", cardColor: "#181C24" };
	const safeOnClose = onClose || (() => {});

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
							minHeight: 260,
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
						<TouchableOpacity
							onPress={safeOnClose}
							style={{ position: "absolute", top: 18, right: 18, zIndex: 2 }}
						>
							<Ionicons name="close" size={28} color="#fff" />
						</TouchableOpacity>
						<Text
							style={{
								fontWeight: "bold",
								fontSize: 22,
								color: "#fff",
								marginBottom: 12,
								textAlign: "center",
								letterSpacing: 0.2,
							}}
						>
							{product?.name || "Produit"}
						</Text>
						<Text
							style={{
								color: "#E0E6F0",
								fontSize: 16,
								marginBottom: 18,
								textAlign: "center",
								lineHeight: 22,
							}}
						>
							{product?.description || "Aucune description disponible."}
						</Text>
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

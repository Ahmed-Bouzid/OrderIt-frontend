import React, { useState, useEffect } from "react";
import {
	Modal,
	View,
	Text,
	TouchableOpacity,
	ActivityIndicator,
	ScrollView,
	Animated,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getItem as getSecureItem } from "../../../utils/secureStorage";

// Design tokens harmonisés avec le thème principal
const MODAL_THEME = {
	colors: {
		background: "#0C0F17",
		card: "#151923",
		elevated: "#1E2433",
		primary: "#F59E0B",
		primaryDark: "#D97706",
		text: { primary: "#F8FAFC", secondary: "#94A3B8", muted: "#64748B" },
		border: "rgba(148, 163, 184, 0.12)",
		success: "#10B981",
		overlay: "rgba(12, 15, 23, 0.85)",
	},
	radius: { md: 12, lg: 16, xl: 22 },
	spacing: { sm: 8, md: 12, lg: 16, xl: 24 },
};

export const ProductOptionsModal = ({
	visible,
	onClose,
	product,
	onValidate,
	theme = { textColor: "#fff", cardColor: "#181C24" },
}) => {
	const [options, setOptions] = useState([]);
	const [selectedOptions, setSelectedOptions] = useState([]);
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		if (visible && product?._id) {
			setLoading(true);
			(async () => {
				try {
					const token = await getSecureItem("@access_token");
					const response = await fetch(
					`${
						process.env.EXPO_PUBLIC_API_URL ||
						"https://orderit-backend-6y1m.onrender.com"
					}/products/${product._id}/options`,
					{
						headers: {
							"Content-Type": "application/json",
							Authorization: `Bearer ${token}`,
						},
					}
				);
					const data = await response.json();
					setOptions(Array.isArray(data) ? data : []);
				} catch (error) {
					setOptions([]);
				} finally {
					setLoading(false);
				}
			})();
		} else {
			setOptions([]);
			setSelectedOptions([]);
		}
	}, [visible, product?._id]);

	const toggleOption = (option) => {
		setSelectedOptions((prev) => {
			const exists = prev.find((opt) => opt._id === option._id);
			if (exists) {
				return prev.filter((opt) => opt._id !== option._id);
			} else {
				return [...prev, option];
			}
		});
	};

	const handleValidate = () => {
		onValidate(selectedOptions);
		setSelectedOptions([]);
	};

	if (!visible) return null;

	return (
		<Modal
			visible={visible}
			transparent
			animationType="fade"
			onRequestClose={onClose}
		>
			<View
				style={{
					flex: 1,
					backgroundColor: MODAL_THEME.colors.overlay,
					justifyContent: "center",
					alignItems: "center",
				}}
			>
				<View
					style={{
						width: 360,
						minHeight: 220,
						backgroundColor: MODAL_THEME.colors.card,
						borderRadius: MODAL_THEME.radius.xl,
						padding: MODAL_THEME.spacing.xl,
						alignItems: "center",
						borderWidth: 1,
						borderColor: MODAL_THEME.colors.border,
					}}
				>
					<TouchableOpacity
						onPress={onClose}
						style={{ position: "absolute", top: 14, right: 14, zIndex: 2 }}
					>
						<View
							style={{
								backgroundColor: MODAL_THEME.colors.elevated,
								borderRadius: 20,
								padding: 6,
							}}
						>
							<Ionicons
								name="close"
								size={20}
								color={MODAL_THEME.colors.text.secondary}
							/>
						</View>
					</TouchableOpacity>
					<Text
						style={{
							fontWeight: "700",
							fontSize: 20,
							color: MODAL_THEME.colors.text.primary,
							marginBottom: 8,
							textAlign: "center",
						}}
					>
						{product?.name}
					</Text>
					<Text
						style={{
							color: MODAL_THEME.colors.text.secondary,
							fontSize: 14,
							marginBottom: MODAL_THEME.spacing.lg,
							textAlign: "center",
						}}
					>
						{product?.description}
					</Text>
					{loading ? (
						<ActivityIndicator
							color={MODAL_THEME.colors.primary}
							style={{ marginVertical: 20 }}
						/>
					) : options.length === 0 ? (
						<Text
							style={{
								color: MODAL_THEME.colors.text.muted,
								marginVertical: 20,
							}}
						>
							Aucune option pour ce produit
						</Text>
					) : (
						<ScrollView style={{ maxHeight: 200, width: "100%" }}>
							{options.map((option) => {
								const selected = selectedOptions.find(
									(opt) => opt._id === option._id
								);
								return (
									<TouchableOpacity
										key={option._id}
										onPress={() => toggleOption(option)}
										style={{
											flexDirection: "row",
											alignItems: "center",
											paddingVertical: 12,
											paddingHorizontal: 12,
											borderRadius: MODAL_THEME.radius.md,
											backgroundColor: selected
												? "rgba(245, 158, 11, 0.15)"
												: MODAL_THEME.colors.elevated,
											marginBottom: 8,
											borderWidth: 1,
											borderColor: selected
												? MODAL_THEME.colors.primary
												: MODAL_THEME.colors.border,
										}}
									>
										<View
											style={{
												width: 24,
												alignItems: "center",
												marginRight: 10,
											}}
										>
											<Ionicons
												name={selected ? "checkmark-circle" : "ellipse-outline"}
												size={22}
												color={
													selected
														? MODAL_THEME.colors.primary
														: MODAL_THEME.colors.text.muted
												}
											/>
										</View>
										<Text
											style={{
												color: MODAL_THEME.colors.text.primary,
												fontSize: 15,
												flex: 1,
												fontWeight: selected ? "600" : "400",
											}}
										>
											{option.name}
										</Text>
										{option.price > 0 && (
											<Text
												style={{
													color: MODAL_THEME.colors.success,
													fontWeight: "bold",
													marginLeft: 8,
												}}
											>
												+{option.price.toFixed(2)}€
											</Text>
										)}
									</TouchableOpacity>
								);
							})}
						</ScrollView>
					)}
					<TouchableOpacity
						onPress={handleValidate}
						style={{
							borderRadius: MODAL_THEME.radius.lg,
							overflow: "hidden",
							marginTop: MODAL_THEME.spacing.lg,
							width: "100%",
						}}
					>
						<LinearGradient
							colors={[
								MODAL_THEME.colors.primary,
								MODAL_THEME.colors.primaryDark,
							]}
							style={{
								paddingVertical: 14,
								paddingHorizontal: 40,
								alignItems: "center",
							}}
						>
							<Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>
								Valider
							</Text>
						</LinearGradient>
					</TouchableOpacity>
				</View>
			</View>
		</Modal>
	);
};

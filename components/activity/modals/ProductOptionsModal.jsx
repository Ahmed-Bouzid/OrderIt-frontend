import React, { useState, useEffect } from "react";
import {
	Modal,
	View,
	Text,
	TouchableOpacity,
	ActivityIndicator,
	ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

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
			AsyncStorage.getItem("@access_token").then((token) => {
				fetch(
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
				)
					.then((res) => res.json())
					.then((data) => setOptions(Array.isArray(data) ? data : []))
					.catch(() => setOptions([]))
					.finally(() => setLoading(false));
			});
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
					backgroundColor: "rgba(10,18,36,0.55)",
					justifyContent: "center",
					alignItems: "center",
				}}
			>
				<View
					style={{
						width: 340,
						minHeight: 220,
						backgroundColor: theme.cardColor,
						borderRadius: 22,
						padding: 24,
						alignItems: "center",
					}}
				>
					<TouchableOpacity
						onPress={onClose}
						style={{ position: "absolute", top: 14, right: 14, zIndex: 2 }}
					>
						<Ionicons name="close" size={26} color={theme.textColor} />
					</TouchableOpacity>
					<Text
						style={{
							fontWeight: "bold",
							fontSize: 20,
							color: theme.textColor,
							marginBottom: 10,
							textAlign: "center",
						}}
					>
						{product?.name}
					</Text>
					<Text
						style={{
							color: theme.textColor,
							fontSize: 15,
							marginBottom: 16,
							textAlign: "center",
							opacity: 0.7,
						}}
					>
						{product?.description}
					</Text>
					{loading ? (
						<ActivityIndicator color="#007AFF" style={{ marginVertical: 20 }} />
					) : options.length === 0 ? (
						<Text
							style={{
								color: theme.textColor,
								opacity: 0.6,
								marginVertical: 20,
							}}
						>
							Aucune option pour ce produit
						</Text>
					) : (
						<ScrollView style={{ maxHeight: 180, width: "100%" }}>
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
											paddingVertical: 10,
											paddingHorizontal: 8,
											borderRadius: 10,
											backgroundColor: selected ? "#E8F5E9" : "#f3f4f5ff",
											marginBottom: 8,
											// borderWidth et borderColor supprimés pour éviter le shift
											shadowColor: selected ? "#4CAF50" : "transparent",
											shadowOpacity: selected ? 0.18 : 0,
											shadowRadius: selected ? 6 : 0,
											shadowOffset: selected
												? { width: 0, height: 2 }
												: { width: 0, height: 0 },
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
												name={selected ? "radio-button-on" : "radio-button-off"}
												size={22}
												color={selected ? "#060c13ff" : "#bbb"}
											/>
										</View>
										<Text
											style={{ color: theme.textColor, fontSize: 15, flex: 1 }}
										>
											{option.name}
										</Text>
										{option.price > 0 && (
											<Text
												style={{
													color: "#4CAF50",
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
							backgroundColor: "#007AFF",
							borderRadius: 10,
							paddingVertical: 13,
							paddingHorizontal: 40,
							marginTop: 18,
						}}
					>
						<Text style={{ color: "#fff", fontWeight: "bold", fontSize: 16 }}>
							OK
						</Text>
					</TouchableOpacity>
				</View>
			</View>
		</Modal>
	);
};

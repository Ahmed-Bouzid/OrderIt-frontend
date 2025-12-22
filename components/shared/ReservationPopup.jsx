// ReservationPopup.jsx
import React from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";

export default function ReservationPopup({
	activeReservation,
	editField,
	setActiveReservation,
	closePopup, // fonction pour fermer la popup
}) {
	if (!activeReservation) return null;

	return (
		<View
			style={{
				position: "absolute",
				top: 0,
				left: 0,
				right: 0,
				bottom: 0,
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
						width: 420,
						maxHeight: 540,
						padding: 32,
						borderRadius: 24,
						justifyContent: "flex-start",
						alignItems: "center",
						shadowColor: "#000",
						shadowOpacity: 0.25,
						shadowOffset: { width: 0, height: 8 },
						shadowRadius: 24,
						elevation: 16,
					}}
				>
					<Text
						style={{
							fontSize: 26,
							fontWeight: "bold",
							color: "#fff",
							marginBottom: 16,
						}}
					>
						Détails réservation
					</Text>
					<ScrollView style={{ marginBottom: 20, width: "100%" }}>
						{activeReservation.orderItems.map((item, index) => (
							<View
								key={index}
								style={{
									flexDirection: "row",
									justifyContent: "space-between",
									marginBottom: 10,
								}}
							>
								<Text
									style={{ color: "#fff", fontWeight: "600", fontSize: 17 }}
								>
									{item.name}
								</Text>
								<View style={{ flexDirection: "row", alignItems: "center" }}>
									<TouchableOpacity
										onPress={() =>
											editField?.("orderItems", (prev) => {
												const newItems = [...prev];
												newItems[index].quantity = Math.max(
													0,
													newItems[index].quantity - 1
												);
												return newItems;
											})
										}
										style={{
											paddingHorizontal: 10,
											backgroundColor: "#4CAF50",
											borderRadius: 8,
											marginHorizontal: 4,
										}}
									>
										<Text
											style={{
												color: "#fff",
												fontWeight: "bold",
												fontSize: 18,
											}}
										>
											-
										</Text>
									</TouchableOpacity>
									<Text
										style={{
											marginHorizontal: 10,
											color: "#FFD700",
											fontWeight: "bold",
											fontSize: 18,
										}}
									>
										{item.quantity || 0}
									</Text>
									<TouchableOpacity
										onPress={() =>
											editField?.("orderItems", (prev) => {
												const newItems = [...prev];
												newItems[index].quantity = Math.min(
													99,
													newItems[index].quantity + 1
												);
												return newItems;
											})
										}
										style={{
											paddingHorizontal: 10,
											backgroundColor: "#4CAF50",
											borderRadius: 8,
											marginHorizontal: 4,
										}}
									>
										<Text
											style={{
												color: "#fff",
												fontWeight: "bold",
												fontSize: 18,
											}}
										>
											+
										</Text>
									</TouchableOpacity>
								</View>
							</View>
						))}
						<View style={{ marginTop: 10 }}>
							<Text style={{ color: "#fff", fontWeight: "600" }}>Notes:</Text>
							<Text style={{ color: "#E0E6F0" }}>
								{activeReservation.notes || "Aucune note"}
							</Text>
						</View>
						<View style={{ marginTop: 10 }}>
							<Text style={{ color: "#fff", fontWeight: "600" }}>
								Allergies:
							</Text>
							<Text style={{ color: "#E0E6F0" }}>
								{activeReservation.allergies.length > 0
									? activeReservation.allergies.join(", ")
									: "Aucune"}
							</Text>
						</View>
					</ScrollView>
					<TouchableOpacity
						onPress={closePopup}
						style={{
							backgroundColor: "#4CAF50",
							paddingHorizontal: 32,
							paddingVertical: 14,
							borderRadius: 12,
							alignItems: "center",
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
	);
}

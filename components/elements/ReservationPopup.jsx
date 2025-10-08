// ReservationPopup.jsx
import React from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";

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
				backgroundColor: "rgba(0,0,0,0.5)",
				justifyContent: "center",
				alignItems: "center",
			}}
		>
			<View
				style={{
					width: "90%",
					maxHeight: "80%",
					backgroundColor: "white",
					borderRadius: 10,
					padding: 20,
				}}
			>
				<Text style={{ fontSize: 20, fontWeight: "bold", marginBottom: 10 }}>
					Détails réservation
				</Text>

				<ScrollView style={{ marginBottom: 20 }}>
					{activeReservation.orderItems.map((item, index) => (
						<View
							key={index}
							style={{
								flexDirection: "row",
								justifyContent: "space-between",
								marginBottom: 10,
							}}
						>
							<Text>{item.name}</Text>
							<View style={{ flexDirection: "row", alignItems: "center" }}>
								<TouchableOpacity
									onPress={() =>
										editField("orderItems", (prev) => {
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
										backgroundColor: "#ddd",
										borderRadius: 5,
									}}
								>
									<Text>-</Text>
								</TouchableOpacity>
								<Text style={{ marginHorizontal: 10 }}>{item.quantity}</Text>
								<TouchableOpacity
									onPress={() =>
										editField("orderItems", (prev) => {
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
										backgroundColor: "#ddd",
										borderRadius: 5,
									}}
								>
									<Text>+</Text>
								</TouchableOpacity>
							</View>
						</View>
					))}

					<View style={{ marginTop: 10 }}>
						<Text>Notes:</Text>
						<Text>{activeReservation.notes || "Aucune note"}</Text>
					</View>

					<View style={{ marginTop: 10 }}>
						<Text>Allergies:</Text>
						<Text>
							{activeReservation.allergies.length > 0
								? activeReservation.allergies.join(", ")
								: "Aucune"}
						</Text>
					</View>
				</ScrollView>

				<TouchableOpacity
					onPress={closePopup}
					style={{
						backgroundColor: "#007AFF",
						padding: 10,
						borderRadius: 5,
						alignItems: "center",
					}}
				>
					<Text style={{ color: "white", fontWeight: "bold" }}>Fermer</Text>
				</TouchableOpacity>
			</View>
		</View>
	);
}

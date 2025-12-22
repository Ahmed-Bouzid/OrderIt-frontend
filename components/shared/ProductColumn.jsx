import React from "react";
import { View, Text, TouchableOpacity } from "react-native";

export default function ProductColumn({
	products,
	editField,
	activeReservation,
}) {
	return (
		<View>
			{products.map((product) => (
				<View key={product._id} style={{ marginBottom: 10 }}>
					<Text>{product.name || "Produit"}</Text>

					{/* Exemple de quantité, relié à orderItems dans activeReservation */}
					<View style={{ flexDirection: "row", alignItems: "center" }}>
						<TouchableOpacity
							onPress={() => {
								const itemIndex = activeReservation.orderItems.findIndex(
									(item) => item.productId === product._id
								);

								if (itemIndex !== -1) {
									const newQuantity = Math.max(
										0,
										activeReservation.orderItems[itemIndex].quantity - 1
									);
									editField?.("orderItems", (prev) => {
										const copy = [...prev];
										copy[itemIndex].quantity = newQuantity;
										return copy;
									});
								}
							}}
						>
							<Text>-</Text>
						</TouchableOpacity>

						<Text style={{ marginHorizontal: 10 }}>
							{activeReservation.orderItems.find(
								(item) => item.productId === product._id
							)?.quantity || 0}
						</Text>

						<TouchableOpacity
							onPress={() => {
								const itemIndex = activeReservation.orderItems.findIndex(
									(item) => item.productId === product._id
								);

								if (itemIndex !== -1) {
									const newQuantity = Math.min(
										99,
										activeReservation.orderItems[itemIndex].quantity + 1
									);
									editField?.("orderItems", (prev) => {
										const copy = [...prev];
										copy[itemIndex].quantity = newQuantity;
										return copy;
									});
								}
							}}
						>
							<Text>+</Text>
						</TouchableOpacity>
					</View>
				</View>
			))}
		</View>
	);
}

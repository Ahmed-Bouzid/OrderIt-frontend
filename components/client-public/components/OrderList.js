import React from "react";
import { View, Text, FlatList, StyleSheet } from "react-native";

export default function OrderList({ orders }) {
	const renderItem = ({ item }) => (
		<View style={styles.item}>
			<Text>
				{item.user}: {item.name} x {item.quantity}
			</Text>
		</View>
	);

	return (
		<View style={styles.container}>
			<Text style={styles.title}>Commandes en cours</Text>
			<FlatList
				data={orders}
				keyExtractor={(item, index) => index.toString()}
				renderItem={renderItem}
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, padding: 20 },
	title: { fontSize: 24, fontWeight: "bold", marginBottom: 10 },
	item: { paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: "#ccc" },
});

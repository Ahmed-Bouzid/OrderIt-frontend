import React, { useState } from "react";
import { View, Text, Button, FlatList, StyleSheet } from "react-native";

export default function Menu({ menuItems, onAdd }) {
	const renderItem = ({ item }) => (
		<View style={styles.item}>
			<Text style={styles.name}>
				{item.name} - {item.price}€
			</Text>
			<Button title="Ajouter" onPress={() => onAdd(item)} />
		</View>
	);

	return (
		<View style={styles.container}>
			<Text style={styles.title}>Menu</Text>
			<FlatList
				data={menuItems}
				keyExtractor={(item) => item.id.toString()}
				renderItem={renderItem}
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, padding: 20 },
	title: { fontSize: 24, fontWeight: "bold", marginBottom: 10 },
	item: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 10,
	},
	name: { fontSize: 18 },
});

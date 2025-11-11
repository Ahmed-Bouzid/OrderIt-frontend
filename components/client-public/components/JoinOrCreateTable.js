import React, { useState } from "react";
import { View, Text, TextInput, Button, StyleSheet, Alert } from "react-native";

export default function JoinOrCreateTable({ tableId, onJoin }) {
	const [name, setName] = useState("");

	const handleJoin = () => {
		if (!name.trim())
			return Alert.alert("Erreur", "Veuillez entrer un nom pour la table.");
		// Ici tu appelleras ton backend pour créer ou rejoindre la table
		onJoin(name);
	};

	return (
		<View style={styles.container}>
			<Text style={styles.title}>Bienvenue à la table {tableId}</Text>
			<TextInput
				style={styles.input}
				placeholder="Nom de la table / pseudo"
				value={name}
				onChangeText={setName}
			/>
			<Button title="Rejoindre la table" onPress={handleJoin} />
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		padding: 20,
	},
	title: { fontSize: 24, fontWeight: "bold", marginBottom: 20 },
	input: {
		borderWidth: 1,
		borderColor: "#ccc",
		width: "80%",
		padding: 10,
		marginBottom: 20,
		borderRadius: 8,
	},
});

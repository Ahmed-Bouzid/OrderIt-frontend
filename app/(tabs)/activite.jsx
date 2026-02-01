import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function Activite() {
	return (
		<View style={styles.container}>
			<Text>Bienvenue sur la page Activité !</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
	},
});

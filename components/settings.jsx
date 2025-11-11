import React from "react";
import { View, Text } from "react-native";
import styles from "./styles"; // adapte le chemin si tu l'as mis dans un sous-dossier
import { testFunction } from "shared-store";

export default function Settings() {
	// Ajoute cette ligne quelque part dans ton composant
	console.log("🧪 Test shared-store:", testFunction());

	return (
		<View style={[styles.container, { flexDirection: "column", flex: 1 }]}>
			{/* Ligne horizontale pleine largeur, sans marge verticale */}
			<View style={[styles.separatorHorizontal, { marginVertical: 0 }]} />

			{/* Container des colonnes avec flex:1 */}
			<View style={{ flexDirection: "row", flex: 1 }}>
				{/* Colonne 25% */}
				<View style={{ flex: 1, backgroundColor: "whitesmoke", padding: 10 }}>
					<Text style={[styles.title, { fontSize: 20, marginBottom: 10 }]}>
						Réglages
					</Text>
					<View style={styles.fakeButton}>
						<Text style={styles.fakeButtonText}>Option 1</Text>
					</View>
					<View style={styles.fakeButton}>
						<Text style={styles.fakeButtonText}>Option 2</Text>
					</View>
					<View style={styles.fakeButton}>
						<Text style={styles.fakeButtonText}>Option 3</Text>
					</View>
				</View>

				{/* Ligne verticale de séparation entre les colonnes */}
				<View
					style={[
						styles.separator,
						{
							height: "100%", // prend toute la hauteur du parent
							alignSelf: "stretch", // s'étire verticalement
							margin: 0, // pas de marge pour coller la ligne horizontale
						},
					]}
				/>

				{/* Colonne 75% */}
				<View style={{ flex: 3, backgroundColor: "whitesmoke", padding: 10 }}>
					<Text style={[styles.title, { fontSize: 22 }]}>
						Contenu principal
					</Text>
					<Text style={styles.text}>
						Ici tu mets tes réglages, paramètres, formulaires, etc.
					</Text>
				</View>
			</View>
		</View>
	);
}

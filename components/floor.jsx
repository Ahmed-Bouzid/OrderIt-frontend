import React from "react";
import { View, Text } from "react-native";
import Dashboard from "../components/dashboard"; // si Dashboard est dans un dossier parent
import styles from "./styles"; // adapte le chemin si tu l'as mis dans un sous-dossier

export default function Activite({ onStart }) {
	return (
		<View style={[styles.container, { flexDirection: "column", flex: 1 }]}>
			{/* Ligne horizontale pleine largeur, sans marge verticale */}
			<View style={[styles.separatorHorizontal, { marginVertical: 0 }]} />

			{/* Container des colonnes avec flex:1 */}
			<View style={{ flexDirection: "row", flex: 1 }}>
				{/* Colonne 25% */}
				<View
					style={{
						flex: 1,
						paddingLeft: 10,
						paddingRight: 25,
						backgroundColor: "whitesmoke",
					}}
				>
					<Text
						style={[
							styles.title,
							{ fontSize: 15, marginVertical: 10, textAlign: "center" },
						]}
					>
						Date
					</Text>
					<Text style={styles.textFloor}>Cuisine</Text>

					<View style={styles.groupBox}>
						<Text style={styles.fakeButtonText}>Plats</Text>
						<View style={styles.separatorThin} />
						<Text style={styles.fakeButtonText}>Boissons</Text>
						<View style={styles.separatorThin} />
						<Text style={styles.fakeButtonText}>Desserts</Text>
					</View>

					<Text style={styles.textFloor}>Tables</Text>

					<View style={styles.groupBox}>
						<Text style={styles.fakeButtonText}>1ere rangée </Text>
						<View style={styles.separatorThin} />
						<Text style={styles.fakeButtonText}>2eme rangée</Text>
						<View style={styles.separatorThin} />
						<Text style={styles.fakeButtonText}>3eme rangée</Text>
					</View>

					<Text style={styles.textFloor}>Caisse</Text>

					<View style={styles.groupBox}>
						<Text style={styles.fakeButtonText}>En cours</Text>
						<View style={styles.separatorThin} />
						<Text style={styles.fakeButtonText}>Payée</Text>
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
					{/* Important : ici on met flex:1 sur le conteneur direct pour Dashboard */}
					<View style={{ flex: 1 }}>
						<Dashboard />
					</View>
				</View>
			</View>
		</View>
	);
}

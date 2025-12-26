import React, { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import Dashboard from "./Dashboard";
import styles from "../styles";
import useThemeStore from "../../src/stores/useThemeStore";

export default function Floor({ onStart }) {
	const { theme, initTheme } = useThemeStore();

	// Initialiser le thème au montage
	useEffect(() => {
		initTheme();
	}, [initTheme]);

	return (
		<View
			style={[
				styles.container,
				{
					flexDirection: "column",
					flex: 1,
					backgroundColor: theme.backgroundColor,
				},
			]}
		>
			{/* Ligne horizontale pleine largeur */}
			<View style={[styles.separatorHorizontal, { marginVertical: 0 }]} />

			{/* Container des colonnes */}
			<View style={{ flexDirection: "row", flex: 1 }}>
				{/* Colonne 25% - Menu des options */}
				<View
					style={{
						flex: 1,
						backgroundColor: theme.cardColor,
						padding: 10,
						borderRightColor: theme.separatorColor,
						borderRightWidth: 1,
					}}
				>
					<Text
						style={[
							styles.title,
							{
								fontSize: 20,
								marginBottom: 15,
								color: theme.textColor,
								fontWeight: "600",
							},
						]}
					>
						📋 Plan de salle
					</Text>

					{/* Cuisine */}
					<Text style={[floorStyles.sectionTitle, { color: theme.textColor }]}>
						🍳 Cuisine
					</Text>
					<View
						style={[
							floorStyles.groupBox,
							{
								backgroundColor: theme.backgroundColor,
								borderColor: theme.borderColor,
							},
						]}
					>
						<Text
							style={[floorStyles.menuItemText, { color: theme.textColor }]}
						>
							Plats
						</Text>
						<View style={styles.separatorThin} />
						<Text
							style={[floorStyles.menuItemText, { color: theme.textColor }]}
						>
							Boissssons
						</Text>
						<View style={styles.separatorThin} />
						<Text
							style={[floorStyles.menuItemText, { color: theme.textColor }]}
						>
							Desserts
						</Text>
					</View>

					{/* Tables */}
					<Text
						style={[
							floorStyles.sectionTitle,
							{ color: theme.textColor, marginTop: 15 },
						]}
					>
						🪑 Tables
					</Text>
					<View
						style={[
							floorStyles.groupBox,
							{
								backgroundColor: theme.backgroundColor,
								borderColor: theme.borderColor,
							},
						]}
					>
						<Text
							style={[floorStyles.menuItemText, { color: theme.textColor }]}
						>
							1ère rangée
						</Text>
						<View style={styles.separatorThin} />
						<Text
							style={[floorStyles.menuItemText, { color: theme.textColor }]}
						>
							2ème rangée
						</Text>
						<View style={styles.separatorThin} />
						<Text
							style={[floorStyles.menuItemText, { color: theme.textColor }]}
						>
							3ème rangée
						</Text>
					</View>

					{/* Caisse */}
					<Text
						style={[
							floorStyles.sectionTitle,
							{ color: theme.textColor, marginTop: 15 },
						]}
					>
						💳 Caisse
					</Text>
					<View
						style={[
							floorStyles.groupBox,
							{
								backgroundColor: theme.backgroundColor,
								borderColor: theme.borderColor,
							},
						]}
					>
						<Text
							style={[floorStyles.menuItemText, { color: theme.textColor }]}
						>
							En cours
						</Text>
						<View style={styles.separatorThin} />
						<Text
							style={[floorStyles.menuItemText, { color: theme.textColor }]}
						>
							Payée
						</Text>
					</View>
				</View>

				{/* Ligne verticale de séparation entre les colonnes */}
				<View
					style={[
						styles.separator,
						{
							height: "100%",
							alignSelf: "stretch",
							margin: 0,
						},
					]}
				/>

				{/* Colonne 75% - Dashboard */}
				<View style={{ flex: 3, backgroundColor: theme.cardColor, padding: 0 }}>
					<View style={{ flex: 1 }}>
						<Dashboard />
					</View>
				</View>
			</View>
		</View>
	);
}

// ⭐ Styles pour le plan de salle
const floorStyles = StyleSheet.create({
	sectionTitle: {
		fontSize: 16,
		fontWeight: "600",
		marginBottom: 10,
		paddingVertical: 10,
		paddingHorizontal: 10,
		borderRadius: 8,
		backgroundColor: "rgba(0, 122, 255, 0.1)",
	},
	groupBox: {
		borderRadius: 10,
		borderWidth: 1,
		overflow: "hidden",
		marginBottom: 12,
	},
	menuItemText: {
		fontSize: 14,
		fontWeight: "500",
		paddingVertical: 12,
		paddingHorizontal: 12,
	},
});

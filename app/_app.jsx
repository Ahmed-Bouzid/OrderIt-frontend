import React, { useState } from "react";
import {
	View,
	StyleSheet,
	TouchableOpacity,
	Text,
	SafeAreaView,
} from "react-native";

import Activite from "../components/screens/Activity";
import Floor from "../components/screens/Floor";
import Settings from "../components/screens/Settings";

export default function App() {
	const [activeTab, setActiveTab] = useState("Activité");

	const handleStart = () => {
		console.log("Début de l'activité !");
	};

	const renderContent = () => {
		switch (activeTab) {
			case "Activité":
				return <Activite styles={styles} onStart={handleStart} />;
			case "Floor":
				return <Floor styles={styles} />;
			case "Réglages":
				return <Settings styles={styles} />;
			default:
				return null;
		}
	};

	return (
		<>
			<SafeAreaView style={styles.container}>
				<View style={{ flex: 1 }}>
					<View style={styles.navbar}>
						{["Activité", "Floor", "Réglages"].map((tab) => (
							<TouchableOpacity
								key={tab}
								onPress={() => setActiveTab(tab)}
								style={[
									styles.tabButton,
									activeTab === tab && styles.activeTabButton,
								]}
							>
								<Text
									style={[
										styles.tabText,
										activeTab === tab && styles.activeTabText,
									]}
								>
									{tab}
								</Text>
							</TouchableOpacity>
						))}
					</View>
					<View style={{ flex: 1 }}>{renderContent()}</View>
				</View>
			</SafeAreaView>
		</>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: "whitesmoke", paddingTop: 60 },
	navbar: {
		flexDirection: "row",
		justifyContent: "center",
		paddingTop: 20,
	},
	tabButton: {
		backgroundColor: "#334155",
		paddingVertical: 10,
		paddingHorizontal: 20,
		borderRadius: 9999,
		marginHorizontal: 5,
	},
	activeTabButton: {
		backgroundColor: "#94A3B8",
	},
	tabText: {
		color: "#94A3B8",
		fontWeight: "500",
	},
	activeTabText: {
		color: "#fff",
	},
	content: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		padding: 20,
	},
	title: {
		fontSize: 45,
		fontWeight: "bold",
		color: "black",
		marginBottom: 10,
	},
	text: {
		fontSize: 16,
		color: "black",
		textAlign: "center",
	},
	textFloor: {
		marginTop: 10,
		fontSize: 20,
		color: "black",
		fontWeight: "bold",
		marginHorizontal: 20,
	},
	button: {
		backgroundColor: "#2563EB",
		paddingVertical: 12,
		paddingHorizontal: 32,
		borderRadius: 25,
		marginTop: 20,
	},
	buttonText: {
		color: "#fff",
		fontWeight: "600",
		fontSize: 18,
		textAlign: "center",
	},
	fakeButton: {
		backgroundColor: "#94A3B8",
		paddingVertical: 10,
		paddingHorizontal: 15,
		borderRadius: 9999,
		marginVertical: 6,
	},
	fakeButtonText: {
		color: "black",
		fontWeight: "400",
		marginLeft: 10,
		fontSize: 20,
	},
	separator: {
		width: 1, // très fin
		backgroundColor: "#94A3B8", // gris clair
		marginVertical: 10,
	},
	separatorHorizontal: {
		height: 1,
		backgroundColor: "#94A3B8",
		marginBottom: 10,
		width: "100%",
	},
	groupBox: {
		backgroundColor: "white",
		borderRadius: 16,
		paddingVertical: 10,
		paddingHorizontal: 15,
		marginTop: 10,
		width: "100%",
		marginLeft: 10,
		marginRight: 40,
	},
	separatorThin: {
		height: 1,
		backgroundColor: "#CBD5E1",
		alignSelf: "center",
		width: "99%",
		marginVertical: 5,
	},
});

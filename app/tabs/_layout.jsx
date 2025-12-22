// app/(tabs)/_layout.jsx
import React, { useState } from "react";
import {
	View,
	Text,
	TouchableOpacity,
	StyleSheet,
	Platform,
} from "react-native";
import Activity from "../../components/screens/Activity";
import FloorScreen from "../../components/screens/Floor";
import Settings from "../../components/screens/Settings";

export default function TabsLayout() {
	const [activeTab, setActiveTab] = useState("activity");

	const tabs = [
		{ name: "activity", label: "Activité" },
		{ name: "floor", label: "Floor" },
		{ name: "reglage", label: "Réglages" },
	];

	const renderContent = () => {
		if (activeTab === "activity") return <Activity />;
		if (activeTab === "floor") return <FloorScreen />;
		if (activeTab === "reglage") return <Settings />;
		return null;
	};

	return (
		<View style={{ flex: 1 }}>
			{/* Tab Bar en haut avec padding pour iOS */}
			<View
				style={[styles.navbar, { paddingTop: Platform.OS === "ios" ? 20 : 10 }]}
			>
				{tabs.map((tab) => (
					<TouchableOpacity
						key={tab.name}
						onPress={() => setActiveTab(tab.name)}
						style={styles.tabButton}
					>
						<Text
							style={[
								styles.tabText,
								activeTab === tab.name && styles.activeTabText,
							]}
						>
							{tab.label}
						</Text>
					</TouchableOpacity>
				))}
			</View>

			{/* Contenu actif */}
			<View style={{ flex: 1 }}>{renderContent()}</View>
		</View>
	);
}

const styles = StyleSheet.create({
	navbar: {
		flexDirection: "row",
		justifyContent: "space-around",
		alignItems: "center",
		paddingVertical: 12,
		backgroundColor: "#fff",
		borderBottomWidth: 1,
		borderColor: "#ddd",
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 3,
		elevation: 5,
		marginTop: Platform.OS === "ios" ? 0 : 20,
	},
	tabButton: {
		padding: 10,
		alignItems: "center",
	},
	tabText: {
		color: "#94A3B8",
		fontSize: 14,
		fontWeight: "500",
	},
	activeTabText: {
		color: "#334155",
		fontWeight: "bold",
		fontSize: 15,
	},
});

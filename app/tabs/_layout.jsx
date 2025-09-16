// app/(tabs)/_layout.jsx
import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import Activity from "../../components/activity";
import FloorScreen from "../../components/floor";
import Settings from "../../components/settings";

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
			{/* Tab Bar */}
			<View style={styles.navbar}>
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
		paddingVertical: 12,
		backgroundColor: "#fff",
		borderTopWidth: 1,
		borderColor: "#ddd",
	},
	tabButton: { padding: 10 },
	tabText: { color: "#94A3B8", fontSize: 16 },
	activeTabText: { color: "#334155", fontWeight: "bold", fontSize: 18 },
});

import React, { useState, useEffect } from "react";
import {
	View,
	StyleSheet,
	TouchableOpacity,
	Text,
	SafeAreaView,
	ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import Activite from "../components/screens/Activity";
import Floor from "../components/screens/Floor";
import Settings from "../components/screens/Settings";
import { API_CONFIG } from "../src/config/apiConfig";
import useSocket from "../hooks/useSocket";

export default function App() {
	const [activeTab, setActiveTab] = useState("Activité");
	const [isLoading, setIsLoading] = useState(true);
	const [userLoggedIn, setUserLoggedIn] = useState(false);
	const [token, setToken] = useState(null);
	const { connect, socket } = useSocket();
	console.log("BONJOUR");

	useEffect(() => {
		const checkToken = async () => {
			const storedToken = await AsyncStorage.getItem("@access_token");
			const refreshToken = await AsyncStorage.getItem("refreshToken");
			if (storedToken && refreshToken) {
				setUserLoggedIn(true);
				setToken(storedToken);
			} else {
				setUserLoggedIn(false);
				setToken(null);
			}
			setIsLoading(false);
		};
		checkToken();
	}, []);

	// Initialiser la socket UNIQUEMENT quand le token est prêt
	useEffect(() => {
		if (token) {
			connect(); // connect() lit le token depuis AsyncStorage
		}
	}, [token, connect]);

	const handleStart = () => {};

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

	if (isLoading) {
		return (
			<View
				style={[
					styles.container,
					{ justifyContent: "center", alignItems: "center" },
				]}
			>
				<ActivityIndicator size="large" color="#2563EB" />
				<Text style={{ marginTop: 20 }}>Chargement...</Text>
			</View>
		);
	}

	if (!userLoggedIn) {
		return (
			<View
				style={[
					styles.container,
					{ justifyContent: "center", alignItems: "center" },
				]}
			>
				<Text style={{ fontSize: 22, color: "#2563EB", fontWeight: "bold" }}>
					Veuillez vous connecter
				</Text>
			</View>
		);
	}

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

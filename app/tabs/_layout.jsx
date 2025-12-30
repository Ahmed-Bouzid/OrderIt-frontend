// app/(tabs)/_layout.jsx

import React, { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import {
	View,
	Text,
	TouchableOpacity,
	StyleSheet,
	Platform,
	ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Activity from "../../components/screens/Activity";
import FloorScreen from "../../components/screens/Floor";
import Settings from "../../components/screens/Settings";
import useSocket from "../../hooks/useSocket";

export default function TabsLayout() {
	const router = useRouter();
	const [activeTab, setActiveTab] = useState("activity");
	const [isLoading, setIsLoading] = useState(true);
	const [userLoggedIn, setUserLoggedIn] = useState(false);
	const [token, setToken] = useState(null);
	const { connect, socket } = useSocket();

	const tabs = [
		{ name: "activity", label: "Activité" },
		{ name: "floor", label: "Floor" },
		{ name: "reglage", label: "Réglages" },
	];

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

	// Rediriger vers login si pas authentifié
	useEffect(() => {
		if (!isLoading && !userLoggedIn) {
			router.replace("/login");
		}
	}, [isLoading, userLoggedIn, router]);

	// Initialiser la socket UNIQUEMENT quand le token est prêt
	useEffect(() => {
		if (token) {
			connect(); // connect() lit le token depuis AsyncStorage
		}
	}, [token, connect]);

	const handleStart = () => {
		// ...
	};

	const renderContent = () => {
		switch (activeTab) {
			case "activity":
				return <Activity onStart={handleStart} />;
			case "floor":
				return <FloorScreen />;
			case "reglage":
				return <Settings />;
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
		// Redirection en cours vers /login
		return null;
	}

	return (
		<SafeAreaView style={styles.container}>
			<View style={{ flex: 1 }}>
				<View
					style={[
						styles.navbar,
						{ paddingTop: Platform.OS === "ios" ? 20 : 10 },
					]}
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
				<View style={{ flex: 1 }}>{renderContent()}</View>
			</View>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: "whitesmoke", paddingTop: 60 },
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

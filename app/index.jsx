import React, { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";

export default function Index() {
	const router = useRouter();
	const [checking, setChecking] = useState(true);

	useEffect(() => {
		let mounted = true;
		(async () => {
			try {
				const token = await AsyncStorage.getItem("@access_token");
				if (!mounted) return;

				if (token) {
					// Redirige directement vers l'onglet Activité
					router.replace("/tabs/activity");
				} else {
					router.replace("/login");
				}
			} catch (e) {
				router.replace("/login");
			} finally {
				if (mounted) setChecking(false);
			}
		})();

		return () => {
			mounted = false;
		};
	}, [router]);

	if (checking) {
		return (
			<View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
				<ActivityIndicator size="large" />
			</View>
		);
	}

	return null;
}

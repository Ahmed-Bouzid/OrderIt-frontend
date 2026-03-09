/**
 * Layout racine Expo Router
 * Enveloppe l'application avec le SocketProvider pour la connexion WebSocket globale
 */

import React from "react";
import { Stack } from "expo-router";
import { SocketProvider } from "../src/stores/SocketContext";
import ScreenProtectionWrapper from "../components/ScreenProtectionWrapper";

export default function RootLayout() {
	return (
		<ScreenProtectionWrapper protectionKey="app-global">
			<SocketProvider>
				<Stack screenOptions={{ headerShown: false, animation: "none" }}>
					<Stack.Screen name="index" />
					<Stack.Screen name="login" />
					<Stack.Screen name="developer-selector" />
					<Stack.Screen name="tabs" />
				</Stack>
			</SocketProvider>
		</ScreenProtectionWrapper>
	);
}

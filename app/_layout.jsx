/**
 * Layout racine Expo Router
 * Enveloppe l'application avec le SocketProvider pour la connexion WebSocket globale
 */

import React from "react";
import { Stack } from "expo-router";
import { SocketProvider } from "../src/stores/SocketContext";

export default function RootLayout() {
	return (
		<SocketProvider>
			<Stack>
				<Stack.Screen name="index" options={{ headerShown: false }} />
				<Stack.Screen
					name="login"
					options={{
						headerShown: false,
						animationEnabled: false,
					}}
				/>
				<Stack.Screen name="tabs" options={{ headerShown: false }} />
			</Stack>
		</SocketProvider>
	);
}

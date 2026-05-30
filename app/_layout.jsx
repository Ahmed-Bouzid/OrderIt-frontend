/**
 * Layout racine Expo Router
 * Enveloppe l'application avec le SocketProvider pour la connexion WebSocket globale
 */

import React, { useState } from "react";
import { View, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Stack } from "expo-router";
import { SocketProvider } from "../src/stores/SocketContext";
import ScreenProtectionWrapper from "../components/ScreenProtectionWrapper";
import KioskPinModal from "../components/KioskPinModal";
import UpdateBanner from "../components/UpdateBanner";
import { useKioskMode } from "../hooks/useKioskMode";
import { useAppUpdate } from "../hooks/useAppUpdate";
import { PaymentsCommandCenter, PaymentsFAB } from "../components/payments-command-center";
import useUserStore from "../src/stores/useUserStore";

// Passer EXPO_PUBLIC_KIOSK_ENABLED=true dans .env pour activer le mode kiosque
const KIOSK_ENABLED = process.env.EXPO_PUBLIC_KIOSK_ENABLED === "true" && Platform.OS === "android";

export default function RootLayout() {
	const { pinModalVisible, setPinModalVisible, handleCornerTap, unlock } = useKioskMode({
		enabled: KIOSK_ENABLED,
	});

	const {
		updateAvailable,
		updateInfo,
		downloading,
		progress,
		error: updateError,
		downloadAndInstall,
	} = useAppUpdate();

	const [updateDismissed, setUpdateDismissed] = useState(false);

	// 🔒 Le PaymentsCommandCenter (FAB Stripe) ne doit s'afficher qu'une fois
	// l'utilisateur authentifié ET rattaché à un restaurant.
	const userId = useUserStore((state) => state.userId);
	const restaurantId = useUserStore((state) => state.restaurantId);
	const isAuthenticated = Boolean(userId && restaurantId);

	return (
		<GestureHandlerRootView style={s.root}>
		<ScreenProtectionWrapper protectionKey="app-global">
			<SocketProvider>
				<View style={s.root}>
					<Stack screenOptions={{ headerShown: false, animation: "none" }}>
						<Stack.Screen name="index" />
						<Stack.Screen name="login" />
						<Stack.Screen name="developer-selector" />
						<Stack.Screen name="onboarding" />
						<Stack.Screen name="tabs" />
					</Stack>

					{/* Coin secret kiosk — taper 5× en haut-gauche pour afficher le PIN */}
					{KIOSK_ENABLED && (
						<TouchableOpacity
							style={s.kioskCorner}
							onPress={handleCornerTap}
							activeOpacity={1}
						/>
					)}

					{/* Modal PIN administrateur */}
					<KioskPinModal
						visible={pinModalVisible}
						onUnlock={unlock}
						onDismiss={() => setPinModalVisible(false)}
					/>

					{/* Bannière mise à jour APK */}
					{updateAvailable && !updateDismissed && (
						<UpdateBanner
							updateInfo={updateInfo}
							downloading={downloading}
							progress={progress}
							error={updateError}
							onInstall={downloadAndInstall}
							onDismiss={() => setUpdateDismissed(true)}
						/>
					)}

					{/* PaymentsCommandCenter — fenêtre flottante + FAB */}
					{/* Affiché uniquement si l'utilisateur est connecté + rattaché à un restaurant */}
					{isAuthenticated && (
						<>
							<PaymentsFAB />
							<PaymentsCommandCenter />
						</>
					)}
				</View>
			</SocketProvider>
		</ScreenProtectionWrapper>
		</GestureHandlerRootView>
	);
}

const s = StyleSheet.create({
	root: { flex: 1 },
	// Zone invisible 40×40px en haut-gauche — 5 taps rapides ouvre le PIN kiosk
	kioskCorner: {
		position: "absolute",
		top: 0,
		left: 0,
		width: 40,
		height: 40,
		zIndex: 9999,
	},
});

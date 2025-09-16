import React from "react";
import { Stack } from "expo-router";

// Redirige automatiquement vers activite
import { useEffect } from "react";
import { useRouter } from "expo-router";

export default function TabsIndex() {
	const router = useRouter();

	useEffect(() => {
		router.replace("/(tabs)/activite");
	}, [router]);

	return null;
}

/**
 * 🎨 Theme Editor Route
 * Accessible depuis: Settings > Apparence > Personnaliser le thème
 */
import React, { useState } from "react";
import { useRouter } from "expo-router";
import useUserStore from "../src/stores/useUserStore";
import ThemeEditorScreen from "../components/screens/ThemeEditorScreen";

export default function ThemeEditorRoute() {
const router = useRouter();
const { restaurantId } = useUserStore();

const handleBack = () => {
router.back();
};

const handleSave = () => {
router.back();
};

return (
<ThemeEditorScreen
restaurantId={restaurantId}
onBack={handleBack}
onSave={handleSave}
/>
);
}

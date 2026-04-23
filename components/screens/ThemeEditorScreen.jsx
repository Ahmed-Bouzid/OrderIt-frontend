/**
 * 🎨 ThemeEditorScreen - Éditeur de thème pour restaurants
 * 
 * Permet aux restaurateurs de personnaliser l'apparence de leur menu client:
 * - Sélection parmi 3 thèmes prédéfinis (Light, Cucina, Grillz)
 * - Personnalisation des couleurs primaire et accent
 * - Aperçu en temps réel
 */
import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
View,
Text,
StyleSheet,
TouchableOpacity,
ScrollView,
Alert,
ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../../hooks/useTheme";
import useRestaurantThemeStore from "../../src/stores/useRestaurantThemeStore";

// 🎨 Thèmes disponibles
const AVAILABLE_THEMES = [
{
id: "light",
name: "Light",
description: "Thème clair par défaut",
gradient: ["#2563EB", "#1E40AF", "#1E3A8A"],
preview: { primary: "#2563EB", accent: "#3B82F6" },
icon: "sunny-outline",
},
{
id: "cucina",
name: "Cucina",
description: "Vert avec motifs sandwich",
gradient: ["#146845", "#34311C", "#1F4D2E"],
preview: { primary: "#146845", accent: "#22C55E" },
icon: "restaurant-outline",
},
{
id: "grillz",
name: "Le Grillz",
description: "Orange dynamique",
gradient: ["#F97316", "#EA580C", "#C2410C"],
preview: { primary: "#F97316", accent: "#FB923C" },
icon: "flame-outline",
},
];

// 🎨 Couleurs prédéfinies pour personnalisation
const COLOR_PRESETS = [
{ id: "blue", color: "#2563EB", name: "Bleu" },
{ id: "green", color: "#146845", name: "Vert" },
{ id: "orange", color: "#F97316", name: "Orange" },
{ id: "red", color: "#DC2626", name: "Rouge" },
{ id: "purple", color: "#7C3AED", name: "Violet" },
{ id: "black", color: "#1F2937", name: "Noir" },
];

export default function ThemeEditorScreen({ restaurantId, onBack, onSave }) {
const THEME = useTheme();
const { 
updateTheme, 
fetchCurrentTheme,
currentThemeId,
customizations,
loading: storeLoading 
} = useRestaurantThemeStore();

// États locaux
const [selectedTheme, setSelectedTheme] = useState("light");
const [primaryColor, setPrimaryColor] = useState("#2563EB");
const [accentColor, setAccentColor] = useState("#3B82F6");
const [saving, setSaving] = useState(false);
const [showCustomizer, setShowCustomizer] = useState(false);
const [initialLoading, setInitialLoading] = useState(true);

// Charger le thème actuel
useEffect(() => {
const loadCurrentTheme = async () => {
try {
if (restaurantId) {
await fetchCurrentTheme(restaurantId);
}
} catch (error) {
console.warn("Erreur chargement thème:", error);
} finally {
setInitialLoading(false);
}
};
loadCurrentTheme();
}, [restaurantId]);

// Appliquer le thème actuel aux états locaux
useEffect(() => {
if (currentThemeId) {
setSelectedTheme(currentThemeId);
}
if (customizations) {
if (customizations.primaryColor) setPrimaryColor(customizations.primaryColor);
if (customizations.accentColor) setAccentColor(customizations.accentColor);
}
}, [currentThemeId, customizations]);

// Styles dynamiques
const styles = useMemo(() => createStyles(THEME), [THEME]);

// Obtenir le thème sélectionné
const activeTheme = useMemo(
() => AVAILABLE_THEMES.find((t) => t.id === selectedTheme) || AVAILABLE_THEMES[0],
[selectedTheme]
);

// Sélection d'un thème
const handleSelectTheme = useCallback((themeId) => {
setSelectedTheme(themeId);
const theme = AVAILABLE_THEMES.find((t) => t.id === themeId);
if (theme) {
setPrimaryColor(theme.preview.primary);
setAccentColor(theme.preview.accent);
}
}, []);

// Sauvegarder le thème
const handleSave = useCallback(async () => {
setSaving(true);
try {
await updateTheme(restaurantId, {
themeId: selectedTheme,
customizations: {
primaryColor,
accentColor,
},
});
Alert.alert(
"✅ Thème enregistré",
"Les changements seront visibles par vos clients immédiatement.",
[{ text: "OK", onPress: onSave }]
);
} catch (error) {
Alert.alert("Erreur", "Impossible de sauvegarder le thème.");
console.error("Erreur save theme:", error);
} finally {
setSaving(false);
}
}, [restaurantId, selectedTheme, primaryColor, accentColor, onSave, updateTheme]);

// Loading initial
if (initialLoading) {
return (
<SafeAreaView style={styles.container}>
<View style={styles.loadingContainer}>
<ActivityIndicator size="large" color={THEME.colors.primary.amber} />
<Text style={styles.loadingText}>Chargement du thème...</Text>
</View>
</SafeAreaView>
);
}

return (
<SafeAreaView style={styles.container} edges={["top"]}>
{/* Header */}
<View style={styles.header}>
<TouchableOpacity onPress={onBack} style={styles.backButton}>
<Ionicons name="arrow-back" size={24} color={THEME.colors.text.primary} />
</TouchableOpacity>
<Text style={styles.headerTitle}>Personnaliser le thème</Text>
<View style={{ width: 40 }} />
</View>

<ScrollView
style={styles.content}
contentContainerStyle={styles.contentContainer}
showsVerticalScrollIndicator={false}
>
{/* Section: Sélection du thème */}
<Text style={styles.sectionTitle}>Choisir un thème</Text>
<View style={styles.themesGrid}>
{AVAILABLE_THEMES.map((theme) => (
<TouchableOpacity
key={theme.id}
style={[
styles.themeCard,
selectedTheme === theme.id && styles.themeCardSelected,
]}
onPress={() => handleSelectTheme(theme.id)}
activeOpacity={0.7}
>
<LinearGradient
colors={theme.gradient}
style={styles.themeGradient}
start={{ x: 0, y: 0 }}
end={{ x: 1, y: 1 }}
>
<Ionicons name={theme.icon} size={28} color="#FFF" />
</LinearGradient>
<Text style={styles.themeName}>{theme.name}</Text>
<Text style={styles.themeDescription}>{theme.description}</Text>
{selectedTheme === theme.id && (
<View style={styles.checkmark}>
<Ionicons name="checkmark-circle" size={24} color="#22C55E" />
</View>
)}
</TouchableOpacity>
))}
</View>

{/* Bouton personnaliser */}
<TouchableOpacity
style={styles.customizeButton}
onPress={() => setShowCustomizer(!showCustomizer)}
>
<Ionicons
name={showCustomizer ? "chevron-up" : "color-palette-outline"}
size={20}
color={THEME.colors.primary.amber}
/>
<Text style={styles.customizeButtonText}>
{showCustomizer ? "Masquer les options" : "Personnaliser les couleurs"}
</Text>
</TouchableOpacity>

{/* Section: Personnalisation des couleurs */}
{showCustomizer && (
<View style={styles.customizeSection}>
<Text style={styles.colorLabel}>Couleur principale</Text>
<View style={styles.colorRow}>
{COLOR_PRESETS.map((preset) => (
<TouchableOpacity
key={preset.id}
style={[
styles.colorSwatch,
{ backgroundColor: preset.color },
primaryColor === preset.color && styles.colorSwatchSelected,
]}
onPress={() => setPrimaryColor(preset.color)}
>
{primaryColor === preset.color && (
<Ionicons name="checkmark" size={18} color="#FFF" />
)}
</TouchableOpacity>
))}
</View>

<Text style={[styles.colorLabel, { marginTop: 16 }]}>Couleur d'accent</Text>
<View style={styles.colorRow}>
{COLOR_PRESETS.map((preset) => (
<TouchableOpacity
key={preset.id}
style={[
styles.colorSwatch,
{ backgroundColor: preset.color },
accentColor === preset.color && styles.colorSwatchSelected,
]}
onPress={() => setAccentColor(preset.color)}
>
{accentColor === preset.color && (
<Ionicons name="checkmark" size={18} color="#FFF" />
)}
</TouchableOpacity>
))}
</View>
</View>
)}

{/* Aperçu */}
<Text style={styles.sectionTitle}>Aperçu</Text>
<View style={styles.previewContainer}>
<LinearGradient
colors={[primaryColor, accentColor]}
style={styles.previewBanner}
start={{ x: 0, y: 0 }}
end={{ x: 1, y: 1 }}
>
<Text style={styles.previewRestaurantName}>Votre Restaurant</Text>
<Text style={styles.previewSubtitle}>Menu</Text>
</LinearGradient>
<View style={styles.previewMenu}>
<View style={[styles.previewMenuItem, { borderLeftColor: primaryColor }]}>
<Text style={styles.previewMenuItemName}>Plat exemple</Text>
<Text style={[styles.previewMenuItemPrice, { color: primaryColor }]}>12.50€</Text>
</View>
</View>
</View>
</ScrollView>

{/* Footer avec bouton sauvegarder */}
<View style={styles.footer}>
<TouchableOpacity
style={styles.saveButton}
onPress={handleSave}
disabled={saving}
>
<LinearGradient
colors={[THEME.colors.primary.amber, "#D97706"]}
style={styles.saveButtonGradient}
>
{saving ? (
<ActivityIndicator color="#FFF" size="small" />
) : (
<>
<Ionicons name="checkmark-circle" size={20} color="#FFF" />
<Text style={styles.saveButtonText}>Enregistrer le thème</Text>
</>
)}
</LinearGradient>
</TouchableOpacity>
</View>
</SafeAreaView>
);
}

// 💅 Styles
const createStyles = (THEME) =>
StyleSheet.create({
container: {
flex: 1,
backgroundColor: THEME.colors.background.primary,
},
loadingContainer: {
flex: 1,
justifyContent: "center",
alignItems: "center",
},
loadingText: {
marginTop: 12,
color: THEME.colors.text.muted,
fontSize: 14,
},
header: {
flexDirection: "row",
alignItems: "center",
justifyContent: "space-between",
paddingHorizontal: 16,
paddingVertical: 12,
borderBottomWidth: 1,
borderBottomColor: THEME.colors.border.light,
},
backButton: {
padding: 8,
},
headerTitle: {
fontSize: 18,
fontWeight: "600",
color: THEME.colors.text.primary,
},
content: {
flex: 1,
},
contentContainer: {
padding: 16,
paddingBottom: 100,
},
sectionTitle: {
fontSize: 16,
fontWeight: "600",
color: THEME.colors.text.primary,
marginBottom: 12,
marginTop: 8,
},
themesGrid: {
flexDirection: "row",
flexWrap: "wrap",
gap: 12,
},
themeCard: {
width: "31%",
backgroundColor: THEME.colors.background.secondary,
borderRadius: 12,
padding: 12,
alignItems: "center",
borderWidth: 2,
borderColor: "transparent",
},
themeCardSelected: {
borderColor: "#22C55E",
},
themeGradient: {
width: 60,
height: 60,
borderRadius: 30,
justifyContent: "center",
alignItems: "center",
marginBottom: 8,
},
themeName: {
fontSize: 14,
fontWeight: "600",
color: THEME.colors.text.primary,
textAlign: "center",
},
themeDescription: {
fontSize: 11,
color: THEME.colors.text.muted,
textAlign: "center",
marginTop: 4,
},
checkmark: {
position: "absolute",
top: 8,
right: 8,
},
customizeButton: {
flexDirection: "row",
alignItems: "center",
justifyContent: "center",
paddingVertical: 12,
marginTop: 16,
borderRadius: 8,
borderWidth: 1,
borderColor: THEME.colors.primary.amber,
borderStyle: "dashed",
},
customizeButtonText: {
marginLeft: 8,
color: THEME.colors.primary.amber,
fontWeight: "500",
},
customizeSection: {
backgroundColor: THEME.colors.background.secondary,
borderRadius: 12,
padding: 16,
marginTop: 12,
},
colorLabel: {
fontSize: 14,
fontWeight: "500",
color: THEME.colors.text.primary,
marginBottom: 8,
},
colorRow: {
flexDirection: "row",
gap: 12,
},
colorSwatch: {
width: 44,
height: 44,
borderRadius: 22,
justifyContent: "center",
alignItems: "center",
borderWidth: 3,
borderColor: "transparent",
},
colorSwatchSelected: {
borderColor: "#FFF",
shadowColor: "#000",
shadowOffset: { width: 0, height: 2 },
shadowOpacity: 0.25,
shadowRadius: 4,
elevation: 4,
},
previewContainer: {
backgroundColor: THEME.colors.background.secondary,
borderRadius: 12,
overflow: "hidden",
},
previewBanner: {
paddingVertical: 24,
paddingHorizontal: 16,
alignItems: "center",
},
previewRestaurantName: {
fontSize: 20,
fontWeight: "bold",
color: "#FFF",
},
previewSubtitle: {
fontSize: 14,
color: "rgba(255,255,255,0.8)",
marginTop: 4,
},
previewMenu: {
padding: 16,
},
previewMenuItem: {
flexDirection: "row",
justifyContent: "space-between",
paddingVertical: 12,
paddingLeft: 12,
borderLeftWidth: 3,
},
previewMenuItemName: {
fontSize: 14,
color: THEME.colors.text.primary,
},
previewMenuItemPrice: {
fontSize: 14,
fontWeight: "600",
},
footer: {
position: "absolute",
bottom: 0,
left: 0,
right: 0,
padding: 16,
backgroundColor: THEME.colors.background.primary,
borderTopWidth: 1,
borderTopColor: THEME.colors.border.light,
},
saveButton: {
borderRadius: 12,
overflow: "hidden",
},
saveButtonGradient: {
flexDirection: "row",
alignItems: "center",
justifyContent: "center",
paddingVertical: 14,
gap: 8,
},
saveButtonText: {
color: "#FFF",
fontSize: 16,
fontWeight: "600",
},
});

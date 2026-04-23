/**
 * 🎨 useRestaurantThemeStore - Store Zustand pour gérer le thème du restaurant
 * 
 * Permet aux restaurateurs de:
 * - Charger le thème actuel de leur restaurant
 * - Modifier et sauvegarder un nouveau thème
 * - Personnaliser les couleurs
 */
import { create } from "zustand";
import { getAuthToken } from "../../utils/storageHelper";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || "https://sunnygo.onrender.com";

const useRestaurantThemeStore = create((set, get) => ({
// État
currentThemeId: null,
customizations: null,
availableThemes: [],
loading: false,
error: null,

// Charger le thème actuel du restaurant
fetchCurrentTheme: async (restaurantId) => {
if (!restaurantId) return;

set({ loading: true, error: null });
try {
const token = await getAuthToken();
const response = await fetch(
`${API_BASE_URL}/api/themes/restaurants/${restaurantId}/theme`,
{
headers: {
"Content-Type": "application/json",
...(token && { Authorization: `Bearer ${token}` }),
},
}
);

if (!response.ok) {
throw new Error("Erreur chargement thème");
}

const data = await response.json();
set({
currentThemeId: data.theme?.name?.toLowerCase() || "light",
customizations: data.customizations || null,
loading: false,
});
} catch (error) {
console.error("Erreur fetchCurrentTheme:", error);
set({ error: error.message, loading: false });
}
},

// Charger la liste des thèmes disponibles
fetchAvailableThemes: async () => {
set({ loading: true });
try {
const response = await fetch(`${API_BASE_URL}/api/themes`);
if (!response.ok) throw new Error("Erreur fetch themes");

const data = await response.json();
set({ availableThemes: data.themes || [], loading: false });
} catch (error) {
console.error("Erreur fetchAvailableThemes:", error);
set({ error: error.message, loading: false });
}
},

// Mettre à jour le thème du restaurant
updateTheme: async (restaurantId, { themeId, customizations }) => {
set({ loading: true, error: null });
try {
const token = await getAuthToken();
if (!token) throw new Error("Non authentifié");

// 1. Assigner le thème
const assignResponse = await fetch(
`${API_BASE_URL}/api/themes/restaurants/${restaurantId}/theme`,
{
method: "PUT",
headers: {
"Content-Type": "application/json",
Authorization: `Bearer ${token}`,
},
body: JSON.stringify({ themeId }),
}
);

if (!assignResponse.ok) {
const errorData = await assignResponse.json();
throw new Error(errorData.error || "Erreur assignation thème");
}

// 2. Si personnalisations, les sauvegarder
if (customizations && Object.keys(customizations).length > 0) {
const customizeResponse = await fetch(
`${API_BASE_URL}/api/themes/restaurants/${restaurantId}/theme/customize`,
{
method: "POST",
headers: {
"Content-Type": "application/json",
Authorization: `Bearer ${token}`,
},
body: JSON.stringify({ customizations }),
}
);

if (!customizeResponse.ok) {
console.warn("Personnalisations non sauvegardées");
}
}

// Mettre à jour l'état local
set({
currentThemeId: themeId,
customizations,
loading: false,
});

return true;
} catch (error) {
console.error("Erreur updateTheme:", error);
set({ error: error.message, loading: false });
throw error;
}
},

// Reset
reset: () => {
set({
currentThemeId: null,
customizations: null,
availableThemes: [],
loading: false,
error: null,
});
},
}));

export default useRestaurantThemeStore;

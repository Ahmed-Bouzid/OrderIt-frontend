/**
 * Wrapper unifié pour le stockage sécurisé
 * Route automatiquement les clés sensibles vers SecureStore (Keychain/EncryptedSharedPreferences)
 * et les autres vers AsyncStorage
 *
 * ⭐ OPTIMISATION: Cache mémoire pour éviter les lectures répétées
 */

import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Clés qui DOIVENT être stockées de manière sécurisée
// ⚠️ SecureStore n'accepte QUE [a-zA-Z0-9._-] (pas de @ ni autres caractères)
const SECURE_KEYS = new Set([
	"access_token", // Renommé de "@access_token" (@ interdit par SecureStore)
	"refreshToken",
	"managerPin",
]);

// Map pour convertir anciennes clés → nouvelles clés SecureStore
const KEY_MIGRATION_MAP = {
	"@access_token": "access_token", // AsyncStorage → SecureStore
};

// ⭐ CACHE MÉMOIRE pour éviter les lectures répétées
const memoryCache = new Map();
const CACHE_TTL = 30000; // 30 secondes de cache (le token ne change pas souvent)

/**
 * Récupère une valeur du cache mémoire si valide
 */
function getCached(key) {
	const cached = memoryCache.get(key);
	if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
		return cached.value;
	}
	return undefined; // undefined = pas en cache, null = valeur null stockée
}

/**
 * Stocke une valeur dans le cache mémoire
 */
function setCache(key, value) {
	memoryCache.set(key, { value, timestamp: Date.now() });
}

/**
 * Invalide le cache pour une clé
 */
function invalidateCache(key) {
	memoryCache.delete(key);
}

/**
 * Détermine si une clé doit utiliser SecureStore
 */
function isSecureKey(key) {
	// Vérifier aussi les anciennes clés (pour compatibilité)
	const normalizedKey = KEY_MIGRATION_MAP[key] || key;
	return SECURE_KEYS.has(normalizedKey);
}

/**
 * Normalise une clé (convertit @access_token → access_token pour SecureStore)
 */
function normalizeKey(key) {
	return KEY_MIGRATION_MAP[key] || key;
}

/**
 * Récupère une valeur (SecureStore ou AsyncStorage selon la clé)
 * ⭐ Utilise le cache mémoire pour éviter les lectures répétées
 * @param {string} key - Clé de la valeur à récupérer
 * @returns {Promise<string|null>} Valeur ou null si inexistante
 */
export async function getItem(key) {
	const cacheKey = normalizeKey(key);

	// ⭐ Vérifier le cache d'abord
	const cached = getCached(cacheKey);
	if (cached !== undefined) {
		// Pas de log pour les accès cache (évite le spam)
		return cached;
	}

	try {
		let value;
		if (isSecureKey(key)) {
			const secureKey = normalizeKey(key);
			value = await SecureStore.getItemAsync(secureKey);
		} else {
			value = await AsyncStorage.getItem(key);
		}

		// ⭐ Mettre en cache
		setCache(cacheKey, value);
		return value;
	} catch (error) {
		console.error(`❌ Error getItem("${key}"):`, error.message);
		// Fallback vers AsyncStorage si SecureStore échoue
		if (isSecureKey(key)) {
			console.warn(
				`⚠️ SecureStore failed for "${key}", fallback to AsyncStorage`,
			);
			try {
				const value = await AsyncStorage.getItem(key);
				setCache(cacheKey, value);
				return value;
			} catch (fallbackError) {
				console.error(
					`❌ Fallback AsyncStorage.getItem("${key}") failed:`,
					fallbackError.message,
				);
				return null;
			}
		}
		return null;
	}
}

/**
 * Stocke une valeur (SecureStore ou AsyncStorage selon la clé)
 * ⭐ Met à jour le cache mémoire
 * @param {string} key - Clé de la valeur
 * @param {string} value - Valeur à stocker
 * @returns {Promise<void>}
 */
export async function setItem(key, value) {
	const cacheKey = normalizeKey(key);

	try {
		if (isSecureKey(key)) {
			const secureKey = normalizeKey(key);
			await SecureStore.setItemAsync(secureKey, value);
		} else {
			await AsyncStorage.setItem(key, value);
		}
		// ⭐ Mettre à jour le cache après écriture réussie
		setCache(cacheKey, value);
	} catch (error) {
		console.error(`❌ Error setItem("${key}"):`, error.message);
		// Fallback vers AsyncStorage si SecureStore échoue
		if (isSecureKey(key)) {
			console.warn(
				`⚠️ SecureStore failed for "${key}", fallback to AsyncStorage`,
			);
			try {
				await AsyncStorage.setItem(key, value);
				setCache(cacheKey, value);
			} catch (fallbackError) {
				console.error(
					`❌ Fallback AsyncStorage.setItem("${key}") failed:`,
					fallbackError.message,
				);
				throw fallbackError;
			}
		} else {
			throw error;
		}
	}
}

/**
 * Supprime une valeur (SecureStore ou AsyncStorage selon la clé)
 * ⭐ Invalide le cache mémoire
 * @param {string} key - Clé à supprimer
 * @returns {Promise<void>}
 */
export async function removeItem(key) {
	const cacheKey = normalizeKey(key);

	// ⭐ Invalider le cache immédiatement
	invalidateCache(cacheKey);

	try {
		if (isSecureKey(key)) {
			const secureKey = normalizeKey(key);
			await SecureStore.deleteItemAsync(secureKey);
		} else {
			await AsyncStorage.removeItem(key);
		}
	} catch (error) {
		console.error(`❌ Error removeItem("${key}"):`, error.message);
		// Fallback vers AsyncStorage si SecureStore échoue
		if (isSecureKey(key)) {
			console.warn(
				`⚠️ SecureStore failed for "${key}", fallback to AsyncStorage`,
			);
			try {
				await AsyncStorage.removeItem(key);
			} catch (fallbackError) {
				console.error(
					`❌ Fallback AsyncStorage.removeItem("${key}") failed:`,
					fallbackError.message,
				);
			}
		}
	}
}

/**
 * Supprime plusieurs valeurs en parallèle
 * @param {string[]} keys - Tableau de clés à supprimer
 * @returns {Promise<void>}
 */
export async function multiRemove(keys) {
	try {
		// Séparer les clés sécurisées et non sécurisées
		const secureKeys = keys.filter(isSecureKey).map(normalizeKey);
		const asyncKeys = keys.filter((key) => !isSecureKey(key));

		// Supprimer en parallèle (SecureStore + AsyncStorage)
		await Promise.all([
			...secureKeys.map((key) =>
				SecureStore.deleteItemAsync(key).catch((err) => {
					console.error(
						`❌ SecureStore.deleteItemAsync("${key}") failed:`,
						err.message,
					);
				}),
			),
			asyncKeys.length > 0
				? AsyncStorage.multiRemove(asyncKeys)
				: Promise.resolve(),
		]);

	} catch (error) {
		console.error(`❌ Error multiRemove:`, error.message);
		throw error;
	}
}

/**
 * Vérifie si une clé existe
 * @param {string} key - Clé à vérifier
 * @returns {Promise<boolean>} true si la clé existe
 */
export async function hasItem(key) {
	const value = await getItem(key);
	return value !== null;
}

/**
 * Liste toutes les clés stockées (SecureStore ne supporte pas getAllKeys, retourne seulement AsyncStorage)
 * ⚠️ SecureStore n'expose pas de méthode pour lister les clés
 * @returns {Promise<string[]>} Tableau de clés AsyncStorage uniquement
 */
export async function getAllKeys() {
	try {
		const keys = await AsyncStorage.getAllKeys();
		return keys;
	} catch (error) {
		console.error(`❌ Error getAllKeys:`, error.message);
		return [];
	}
}

/**
 * Migre une clé d'AsyncStorage vers SecureStore
 * Utile pour la migration initiale des tokens existants
 * @param {string} key - Clé à migrer (peut être "@access_token" ou "access_token")
 * @returns {Promise<boolean>} true si migration réussie
 */
export async function migrateToSecureStore(key) {
	if (!isSecureKey(key)) {
		console.warn(`⚠️ "${key}" n'est pas une clé sécurisée, migration ignorée`);
		return false;
	}

	try {
		// 1. Lire depuis AsyncStorage (ancienne clé avec @)
		const value = await AsyncStorage.getItem(key);
		if (!value) {
			return false;
		}

		// 2. Écrire dans SecureStore (nouvelle clé sans @)
		const secureKey = normalizeKey(key);
		await SecureStore.setItemAsync(secureKey, value);

		// 3. Supprimer d'AsyncStorage
		await AsyncStorage.removeItem(key);

		return true;
	} catch (error) {
		console.error(`❌ Erreur migration "${key}":`, error.message);
		return false;
	}
}

/**
 * Migre automatiquement toutes les clés sécurisées d'AsyncStorage vers SecureStore
 * À appeler UNE FOIS au premier démarrage après déploiement
 * @returns {Promise<{migrated: string[], failed: string[]}>}
 */
export async function migrateAllSecureKeys() {
	const migrated = [];
	const failed = [];

	// Migrer les anciennes clés (avec @)
	for (const [oldKey, newKey] of Object.entries(KEY_MIGRATION_MAP)) {
		const success = await migrateToSecureStore(oldKey);
		if (success) {
			migrated.push(`${oldKey} → ${newKey}`);
		} else {
			failed.push(oldKey);
		}
	}

	if (failed.length > 0) {
		console.warn("⚠️ Échecs:", failed.join(", "));
	}
	return { migrated, failed };
}

/**
 * ⭐ Vide le cache mémoire (utile lors du logout)
 */
export function clearCache() {
	memoryCache.clear();
}

// Export par défaut pour compatibilité
export default {
	getItem,
	setItem,
	removeItem,
	multiRemove,
	hasItem,
	getAllKeys,
	migrateToSecureStore,
	migrateAllSecureKeys,
	clearCache,
};

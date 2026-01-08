/**
 * Wrapper unifié pour le stockage sécurisé
 * Route automatiquement les clés sensibles vers SecureStore (Keychain/EncryptedSharedPreferences)
 * et les autres vers AsyncStorage
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
 * @param {string} key - Clé de la valeur à récupérer
 * @returns {Promise<string|null>} Valeur ou null si inexistante
 */
export async function getItem(key) {
	try {
		if (isSecureKey(key)) {
			const secureKey = normalizeKey(key);
			const value = await SecureStore.getItemAsync(secureKey);
			console.log(`🔐 SecureStore.getItem("${secureKey}"):`, value ? "✅ exists" : "❌ null");
			return value;
		} else {
			const value = await AsyncStorage.getItem(key);
			console.log(`📦 AsyncStorage.getItem("${key}"):`, value ? "✅ exists" : "❌ null");
			return value;
		}
	} catch (error) {
		console.error(`❌ Error getItem("${key}"):`, error.message);
		// Fallback vers AsyncStorage si SecureStore échoue
		if (isSecureKey(key)) {
			console.warn(`⚠️ SecureStore failed for "${key}", fallback to AsyncStorage`);
			try {
				return await AsyncStorage.getItem(key);
			} catch (fallbackError) {
				console.error(`❌ Fallback AsyncStorage.getItem("${key}") failed:`, fallbackError.message);
				return null;
			}
		}
		return null;
	}
}

/**
 * Stocke une valeur (SecureStore ou AsyncStorage selon la clé)
 * @param {string} key - Clé de la valeur
 * @param {string} value - Valeur à stocker
 * @returns {Promise<void>}
 */
export async function setItem(key, value) {
	try {
		if (isSecureKey(key)) {
			const secureKey = normalizeKey(key);
			await SecureStore.setItemAsync(secureKey, value);
			console.log(`🔐 SecureStore.setItem("${secureKey}"): ✅`);
		} else {
			await AsyncStorage.setItem(key, value);
			console.log(`📦 AsyncStorage.setItem("${key}"): ✅`);
		}
	} catch (error) {
		console.error(`❌ Error setItem("${key}"):`, error.message);
		// Fallback vers AsyncStorage si SecureStore échoue
		if (isSecureKey(key)) {
			console.warn(`⚠️ SecureStore failed for "${key}", fallback to AsyncStorage`);
			try {
				await AsyncStorage.setItem(key, value);
			} catch (fallbackError) {
				console.error(`❌ Fallback AsyncStorage.setItem("${key}") failed:`, fallbackError.message);
				throw fallbackError;
			}
		} else {
			throw error;
		}
	}
}

/**
 * Supprime une valeur (SecureStore ou AsyncStorage selon la clé)
 * @param {string} key - Clé à supprimer
 * @returns {Promise<void>}
 */
export async function removeItem(key) {
	try {
		if (isSecureKey(key)) {
			const secureKey = normalizeKey(key);
			await SecureStore.deleteItemAsync(secureKey);
			console.log(`🔐 SecureStore.removeItem("${secureKey}"): ✅`);
		} else {
			await AsyncStorage.removeItem(key);
			console.log(`📦 AsyncStorage.removeItem("${key}"): ✅`);
		}
	} catch (error) {
		console.error(`❌ Error removeItem("${key}"):`, error.message);
		// Fallback vers AsyncStorage si SecureStore échoue
		if (isSecureKey(key)) {
			console.warn(`⚠️ SecureStore failed for "${key}", fallback to AsyncStorage`);
			try {
				await AsyncStorage.removeItem(key);
			} catch (fallbackError) {
				console.error(`❌ Fallback AsyncStorage.removeItem("${key}") failed:`, fallbackError.message);
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
			...secureKeys.map((key) => SecureStore.deleteItemAsync(key).catch((err) => {
				console.error(`❌ SecureStore.deleteItemAsync("${key}") failed:`, err.message);
			})),
			asyncKeys.length > 0 ? AsyncStorage.multiRemove(asyncKeys) : Promise.resolve(),
		]);

		console.log(`🗑️ multiRemove([${keys.join(", ")}]): ✅`);
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
		console.log(`📦 AsyncStorage.getAllKeys(): ${keys.length} keys (SecureStore keys not listed)`);
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
			console.log(`ℹ️ "${key}" n'existe pas dans AsyncStorage, rien à migrer`);
			return false;
		}

		// 2. Écrire dans SecureStore (nouvelle clé sans @)
		const secureKey = normalizeKey(key);
		await SecureStore.setItemAsync(secureKey, value);
		console.log(`🔐 Migration "${key}" → "${secureKey}": AsyncStorage → SecureStore ✅`);

		// 3. Supprimer d'AsyncStorage
		await AsyncStorage.removeItem(key);
		console.log(`🗑️ Migration "${key}": nettoyage AsyncStorage ✅`);

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

	console.log("🔄 Début migration automatique AsyncStorage → SecureStore...");

	// Migrer les anciennes clés (avec @)
	for (const [oldKey, newKey] of Object.entries(KEY_MIGRATION_MAP)) {
		const success = await migrateToSecureStore(oldKey);
		if (success) {
			migrated.push(`${oldKey} → ${newKey}`);
		} else {
			failed.push(oldKey);
		}
	}

	console.log(`✅ Migration terminée: ${migrated.length} migrées, ${failed.length} échecs`);
	if (migrated.length > 0) {
		console.log("✅ Migrées:", migrated.join(", "));
	}
	if (failed.length > 0) {
		console.warn("⚠️ Échecs:", failed.join(", "));
	}
	return { migrated, failed };
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
};

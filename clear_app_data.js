import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

async function clearAllData() {
  console.log('🗑️ Nettoyage complet des données...');
  
  // Supprimer AsyncStorage (anciennes données)
  try {
    await AsyncStorage.clear();
    console.log('✅ AsyncStorage vidé');
  } catch (e) {
    console.error('❌ Erreur AsyncStorage:', e);
  }
  
  // Supprimer SecureStore (nouvelles données)
  const keys = [
    'access_token',
    'refresh_token', 
    'restaurant_id',
    'user_role',
    'server_id',
    'table_id'
  ];
  
  for (const key of keys) {
    try {
      await SecureStore.deleteItemAsync(key);
      console.log('✅ SecureStore supprimé:', key);
    } catch (e) {
      // Ignore si n'existe pas
    }
  }
  
  console.log('🎉 Nettoyage terminé - Redémarre l\'app');
}

clearAllData();

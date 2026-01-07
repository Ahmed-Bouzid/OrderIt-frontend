/**
 * Script pour vider le SecureStore (déconnexion forcée)
 * Usage: node clear_secure_storage.js
 */

const { execSync } = require('child_process');

console.log('🧹 Nettoyage du SecureStore...');

try {
  // Clear AsyncStorage (ancien système)
  execSync('npx react-native-clear-storage', { stdio: 'inherit' });
  console.log('✅ AsyncStorage nettoyé');
} catch (e) {
  console.log('⚠️ AsyncStorage skip (pas critique)');
}

console.log('\n📱 Pour nettoyer SecureStore sur iOS/Android :');
console.log('1. Désinstalle l\'app de ton téléphone/simulateur');
console.log('2. Relance avec: npx expo run:ios ou npx expo run:android');
console.log('\nOU');
console.log('3. Va dans Settings → Déconnexion dans l\'app');

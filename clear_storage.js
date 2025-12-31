import AsyncStorage from '@react-native-async-storage/async-storage';

(async () => {
  await AsyncStorage.clear();
  console.log('✅ AsyncStorage vidé - reconnecte-toi');
})();

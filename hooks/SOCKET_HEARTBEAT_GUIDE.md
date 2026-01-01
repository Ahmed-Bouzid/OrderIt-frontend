# Guide : Gestion des timeouts Socket.IO avec Heartbeat

## 🎯 Problème résolu

L'erreur `❌ Erreur connexion Socket: timeout` apparaissait après une période d'inactivité de l'utilisateur. Le serveur Socket.IO considérait que le client était inactif et fermait la connexion.

## ✅ Solution implémentée

### 1. **Heartbeat Custom (Ping régulier)**

- **Intervalle** : 25 secondes (avant le timeout par défaut de 30s)
- **Mécanisme** : Émission automatique d'un événement `client-ping` au serveur
- **Démarrage** : Automatique dès la connexion réussie
- **Arrêt** : Automatique lors de la déconnexion

```javascript
// Le heartbeat démarre automatiquement après connexion
socket.on("connect", () => {
	startHeartbeat(socket); // Ping toutes les 25s
});

// Le heartbeat s'arrête automatiquement lors de la déconnexion
socket.on("disconnect", () => {
	stopHeartbeat();
});
```

### 2. **Gestion intelligente des timeouts**

Les timeouts ne sont plus comptés comme des erreurs critiques :

```javascript
if (errorMsg.includes("timeout")) {
	console.warn("⏱️ Timeout de connexion (inactivité détectée)");
	// Ne pas incrémenter globalReconnectAttempts
	// Socket.io va automatiquement réessayer
}
```

### 3. **Reconnexion automatique optimisée**

- **Backoff exponentiel** : Délai croissant entre les tentatives (1s → 2s → 4s → 8s → 30s max)
- **Jitter aléatoire** : ±20% pour éviter les reconnexions simultanées
- **Déconnexions "douces"** : Les timeouts/inactivités ne sont pas comptés comme échecs

### 4. **Notification utilisateur**

Le système notifie l'utilisateur des changements de connexion :

- **Connexion perdue** : Après 2+ tentatives échouées
- **Connexion rétablie** : Dès que la connexion est restaurée

#### Pour intégrer les toasts visuels (optionnel)

Si tu veux ajouter des toasts React Native :

**1. Installer la dépendance :**

```bash
cd frontend
npm install react-native-toast-message
```

**2. Configurer le Toast dans App.js :**

```javascript
import Toast from "react-native-toast-message";

export default function App() {
	return (
		<>
			{/* Ton app */}
			<NavigationContainer>{/* ... */}</NavigationContainer>

			{/* Toast à la fin */}
			<Toast />
		</>
	);
}
```

**3. Décommenter les lignes dans useSocket.js :**

```javascript
// Dans la fonction notifyConnectionChange()
import Toast from "react-native-toast-message";

const notifyConnectionChange = (type, message) => {
	if (type === "lost" && !connectionLostNotified) {
		console.warn("📡 " + message);
		connectionLostNotified = true;
		Toast.show({
			type: "error",
			text1: "Connexion perdue",
			text2: message,
			position: "bottom",
		});
	} else if (type === "restored" && connectionLostNotified) {
		console.log("📡 " + message);
		connectionLostNotified = false;
		Toast.show({
			type: "success",
			text1: "Reconnecté",
			text2: message,
			position: "bottom",
		});
	}
};
```

## 🔧 Configuration serveur (optionnel)

Si tu as accès au backend Socket.IO, tu peux aussi ajuster les timeouts :

```javascript
// backend/server.js
const io = require("socket.io")(server, {
	pingTimeout: 30000, // 30s avant timeout
	pingInterval: 25000, // Ping serveur → client toutes les 25s
	upgradeTimeout: 10000, // 10s pour upgrade WebSocket
	maxHttpBufferSize: 1e6, // 1MB max par message
});

// Écouter les pings custom du client
io.on("connection", (socket) => {
	socket.on("client-ping", (data) => {
		// Optionnel : logger les pings pour debug
		// console.log("💓 Client ping reçu:", socket.id, data.timestamp);

		// Répondre au client (optionnel)
		socket.emit("server-pong", { timestamp: Date.now() });
	});
});
```

## 📊 Monitoring et Debug

Pour vérifier que le heartbeat fonctionne :

```javascript
// Dans useSocket.js, décommenter cette ligne dans startHeartbeat() :
// console.log("💓 Heartbeat envoyé");

// Puis observer les logs :
// 💓 Heartbeat envoyé
// 💓 Heartbeat envoyé
// 💓 Heartbeat envoyé
// ... toutes les 25 secondes
```

## 🚀 Avantages de cette solution

1. **Robustesse** : Gestion intelligente des timeouts et reconnexions
2. **Expérience utilisateur** : Notifications claires des changements de connexion
3. **Performance** : Heartbeat optimisé (25s) pour éviter les timeouts sans surcharger
4. **Batterie** : Pas de ping si le socket est déconnecté
5. **Maintenabilité** : Code commenté et logs détaillés pour debug
6. **Production-ready** : Système de fallback REST après échecs multiples

## 📝 Notes importantes

- **Batterie** : Le heartbeat consomme peu de batterie (1 requête/25s)
- **Données mobiles** : Impact minimal (~10 octets/25s)
- **Inactivité longue** : Le heartbeat maintient la connexion même si l'utilisateur ne fait rien pendant 10+ minutes
- **Mode avion** : Le système détecte la perte de connexion et active le mode fallback REST automatiquement

## 🧪 Tester la solution

1. **Test inactivité** : Ouvre l'app, ne touche rien pendant 2 minutes → connexion maintenue
2. **Test mode avion** : Active le mode avion → notification "Connexion perdue" → Désactive → notification "Reconnecté"
3. **Test serveur down** : Coupe le backend → mode fallback activé après 5 tentatives
4. **Test logs** : Vérifie les logs pour voir les heartbeats (si décommentés)

---

**Créé le** : 1 janvier 2026  
**Version** : 1.0  
**Auteur** : GitHub Copilot

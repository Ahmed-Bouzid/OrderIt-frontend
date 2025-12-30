# 🔌 Améliorations du hook useSocket.js

## 📋 Résumé des corrections

### ✅ Problèmes résolus

1. **Fallback permanent** → Sortie automatique après 5 minutes
2. **Fuites mémoire** → Nettoyage systématique des listeners
3. **Blocage après échecs** → Backoff exponentiel + sortie auto
4. **Déconnexions naïves** → Distinction soft/hard disconnect
5. **Singleton mal géré** → Map de listeners par instance

---

## 🔧 Corrections détaillées

### 1. Backoff exponentiel intelligent

**Avant :**

- Pas de délai configurable
- Tentatives immédiates jusqu'à max
- Aucune variation (reconnexions simultanées)

**Après :**

```javascript
const calculateBackoffDelay = (attempt) => {
	const delay = Math.min(
		1000 * Math.pow(2, attempt), // 1s, 2s, 4s, 8s...
		30000 // Max 30s
	);
	const jitter = delay * 0.2 * (Math.random() - 0.5); // ±20%
	return Math.floor(delay + jitter);
};
```

**Séquence de délais :**

- Tentative 1 : ~1s
- Tentative 2 : ~2s
- Tentative 3 : ~4s
- Tentative 4 : ~8s
- Tentative 5+ : ~30s (max)

**Bénéfices :**

- Réduit la charge serveur
- Évite les reconnexions simultanées (jitter)
- Adapté aux coupures réseau courtes

---

### 2. Nettoyage des listeners

**Avant :**

```javascript
socket.on("connect", callback); // Ajouté à chaque connect()
// → FUITE MÉMOIRE
```

**Après :**

```javascript
// Listeners internes : nettoyés avant réajout
socket.off("connect");
socket.on("connect", callback);

// Listeners custom : trackés dans une Map
const listenerMapRef = useRef(new Map());

const on = (event, callback) => {
	const oldCallback = listenerMapRef.current.get(event);
	if (oldCallback) {
		socket.off(event, oldCallback); // Nettoyer l'ancien
	}
	socket.on(event, callback);
	listenerMapRef.current.set(event, callback);
};

// Cleanup à la destruction du hook
useEffect(() => {
	return () => {
		listenerMapRef.current.forEach((cb, evt) => {
			socket?.off(evt, cb);
		});
	};
}, []);
```

**Bénéfices :**

- Pas de listeners dupliqués
- Garbage collection correcte
- Performance stable dans le temps

---

### 3. Détection du type de déconnexion

**Avant :**

```javascript
socket.on("disconnect", (reason) => {
	console.warn("Déconnecté:", reason);
	// Tous les cas traités pareil
});
```

**Après :**

```javascript
const SOFT_DISCONNECT_TYPES = [
	"ping timeout", // Serveur n'a pas répondu au ping
	"transport close", // Fermeture réseau normale
	"transport error", // Erreur réseau temporaire
];

socket.on("disconnect", (reason) => {
	if (isSoftDisconnect(reason)) {
		// Ne pas compter comme échec critique
		// Socket.io reconnecte auto avec délai court
	} else if (reason === "io server disconnect") {
		// Serveur a fermé → reconnexion manuelle
		socket.connect();
	} else if (reason === "io client disconnect") {
		// Déconnexion volontaire → ne rien faire
	} else {
		// Erreur critique → incrémenter compteur
		globalReconnectAttempts += 1;
	}
});
```

**Types de déconnexion Socket.io :**
| Reason | Type | Action |
|--------|------|--------|
| `ping timeout` | Soft | Reconnexion auto rapide |
| `transport close` | Soft | Reconnexion auto |
| `transport error` | Soft | Reconnexion auto |
| `io server disconnect` | Hard | Reconnexion manuelle |
| `io client disconnect` | Volontaire | Rien |

**Bénéfices :**

- Pas de fallback pour simple inactivité
- Reconnexions plus rapides pour cas bénins
- Logs plus clairs

---

### 4. Sortie automatique du fallback

**Avant :**

```javascript
if (attempts >= MAX) {
	fallbackModeRef.current = true; // PERMANENT !
}
```

**Après :**

```javascript
const scheduleFallbackExit = () => {
	fallbackExitTimer = setTimeout(
		() => {
			globalFallbackMode = false;
			globalReconnectAttempts = 0;

			if (socketInstance && !socketInstance.connected) {
				socketInstance.connect(); // Réessayer
			}
		},
		5 * 60 * 1000
	); // 5 minutes
};

// Annuler le timer si reconnexion réussie
socket.on("connect", () => {
	clearTimeout(fallbackExitTimer);
	globalFallbackMode = false;
});
```

**Bénéfices :**

- Récupération auto après coupure réseau longue
- Pas de fallback "coincé"
- Expérience utilisateur améliorée

---

### 5. Gestion du singleton

**Avant :**

```javascript
let socketInstance = null; // Global

const connect = () => {
	socketInstance = io(...); // Écrase à chaque hook
	// → Listeners perdus
};
```

**Après :**

```javascript
let socketInstance = null; // Global, une seule instance

const connect = () => {
	// Réutiliser l'instance existante
	if (socketInstance?.connected) {
		return socketInstance;
	}

	// Nettoyer les anciens listeners internes
	if (socketInstance) {
		cleanupInternalListeners(socketInstance);
	}

	// Créer SEULEMENT si n'existe pas
	if (!socketInstance) {
		socketInstance = io(...);
	}

	// Chaque hook garde sa propre ref
	socketRef.current = socketInstance;

	// Listeners custom trackés par hook
	listenerMapRef.current = new Map();
};
```

**Architecture :**

```
┌─────────────────────────────────────────┐
│  Singleton socketInstance (global)      │
│  - 1 seule connexion WebSocket           │
│  - Listeners internes (connect, error)   │
└────────────────┬────────────────────────┘
                 │
        ┌────────┴────────┐
        │                 │
   ┌────▼────┐       ┌────▼────┐
   │ Hook A  │       │ Hook B  │
   │ ref →   │       │ ref →   │
   │ Map [   │       │ Map [   │
   │  custom │       │  custom │
   │  events │       │  events │
   │ ]       │       │ ]       │
   └─────────┘       └─────────┘
```

**Bénéfices :**

- Une seule connexion réseau
- Chaque hook nettoie ses propres listeners
- Pas de conflit entre hooks

---

## 🌐 Recommandations serveur (Node.js)

### Configuration Socket.io recommandée

```javascript
// backend/server.js
const io = require("socket.io")(server, {
	cors: {
		origin: process.env.CLIENT_URL || "*",
		credentials: true,
	},

	// ⏱️ Timeouts
	pingTimeout: 60000, // 60s avant de considérer le client déconnecté
	pingInterval: 25000, // Ping toutes les 25s

	// 🔄 Reconnexion
	connectTimeout: 20000, // 20s pour établir la connexion

	// 📦 Transport
	transports: ["websocket", "polling"], // Ordre de préférence
	allowUpgrades: true, // Permettre upgrade polling → websocket

	// 🔐 Auth
	allowRequest: async (req, callback) => {
		const token = req.headers.authorization?.split(" ")[1];
		if (!token) return callback("No token", false);

		try {
			const decoded = jwt.verify(token, process.env.JWT_SECRET);
			req.userId = decoded.id;
			callback(null, true);
		} catch (err) {
			callback("Invalid token", false);
		}
	},
});

// ⚡ Middleware d'authentification
io.use(async (socket, next) => {
	const token = socket.handshake.auth.token;
	if (!token) return next(new Error("Authentication error"));

	try {
		const decoded = jwt.verify(token, process.env.JWT_SECRET);
		socket.userId = decoded.id;
		next();
	} catch (err) {
		next(new Error("Invalid token"));
	}
});

// 📡 Gestion des connexions
io.on("connection", (socket) => {
	console.log(`✅ Client connecté: ${socket.id} (User: ${socket.userId})`);

	// Joindre une room utilisateur
	socket.join(`user:${socket.userId}`);

	// Gestion déconnexion propre
	socket.on("disconnect", (reason) => {
		console.log(`❌ Client ${socket.id} déconnecté: ${reason}`);

		// Nettoyer les ressources
		socket.leave(`user:${socket.userId}`);
	});

	// Gestion des erreurs
	socket.on("error", (error) => {
		console.error(`⚠️ Erreur socket ${socket.id}:`, error);
	});
});
```

### Bonnes pratiques serveur

1. **Heartbeat personnalisé** (en plus des pings Socket.io)

```javascript
socket.on("heartbeat", () => {
	socket.emit("heartbeat_ack", { timestamp: Date.now() });
});
```

2. **Déconnexion propre côté serveur**

```javascript
// Ne PAS faire socket.disconnect() sauf si nécessaire
// Préférer laisser le client gérer la reconnexion

// Si déconnexion nécessaire :
socket.disconnect(true); // true = fermeture forcée
```

3. **Rate limiting**

```javascript
const rateLimiter = new Map();

socket.on("message", (data) => {
	const userId = socket.userId;
	const now = Date.now();
	const userLimit = rateLimiter.get(userId) || {
		count: 0,
		resetAt: now + 60000,
	};

	if (now > userLimit.resetAt) {
		userLimit.count = 0;
		userLimit.resetAt = now + 60000;
	}

	userLimit.count += 1;

	if (userLimit.count > 100) {
		// 100 messages/min
		socket.emit("rate_limit_exceeded");
		return;
	}

	rateLimiter.set(userId, userLimit);
	// Traiter le message...
});
```

---

## 📊 Monitoring recommandé

### Client (React Native)

```javascript
// Ajouter dans connect()
socket.on("connect", () => {
	// Analytics
	logEvent("socket_connected", {
		attempt: globalReconnectAttempts,
		fallbackMode: globalFallbackMode,
	});
});

socket.on("connect_error", (error) => {
	logEvent("socket_error", {
		message: error.message,
		attempt: globalReconnectAttempts,
	});
});
```

### Serveur (Node.js)

```javascript
// Metrics Prometheus
const connectedClients = new prometheus.Gauge({
	name: "websocket_connected_clients",
	help: "Number of connected WebSocket clients",
});

io.on("connection", (socket) => {
	connectedClients.inc();

	socket.on("disconnect", () => {
		connectedClients.dec();
	});
});
```

---

## 🧪 Tests recommandés

### Test de reconnexion

```javascript
// __tests__/useSocket.test.js
test("should reconnect with exponential backoff", async () => {
	const { result } = renderHook(() => useSocket());

	// Simuler 3 échecs
	for (let i = 0; i < 3; i++) {
		mockSocket.emit("connect_error", new Error("Test"));
	}

	// Vérifier le délai
	const delay = calculateBackoffDelay(2);
	expect(delay).toBeGreaterThanOrEqual(3500); // ~4s avec jitter
	expect(delay).toBeLessThanOrEqual(4500);
});

test("should exit fallback after 5 minutes", async () => {
	jest.useFakeTimers();
	const { result } = renderHook(() => useSocket());

	// Activer fallback
	for (let i = 0; i < 6; i++) {
		mockSocket.emit("connect_error", new Error("Test"));
	}

	expect(result.current.isFallbackMode()).toBe(true);

	// Avancer de 5 minutes
	jest.advanceTimersByTime(5 * 60 * 1000);

	expect(result.current.isFallbackMode()).toBe(false);
});
```

---

## 📚 Ressources

- [Socket.io Documentation - Reconnection](https://socket.io/docs/v4/client-options/#reconnection)
- [Best practices for WebSocket resilience](https://ably.com/topic/websocket-best-practices)
- [Exponential backoff and jitter](https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/)

---

## ✅ Checklist de validation

- [x] Backoff exponentiel avec jitter
- [x] Nettoyage des listeners (internes + custom)
- [x] Distinction soft/hard disconnect
- [x] Sortie auto du fallback (5min)
- [x] Singleton correctement géré
- [x] Logs détaillés et clairs
- [x] Compteurs réinitialisés après succès
- [x] Timers nettoyés à la destruction
- [x] Interface publique préservée
- [x] Configuration Socket.io optimale

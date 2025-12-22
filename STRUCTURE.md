# OrderIt - Frontend 🍽️

Application mobile de gestion de restaurant développée avec React Native et Expo.

## 📁 Structure du Projet

```
frontend/
├── app/                  # Navigation et routing (Expo Router)
│   ├── tabs/            # Écrans avec navigation par onglets
│   ├── _app.jsx         # Point d'entrée principal
│   ├── _layout.jsx      # Layout racine
│   ├── index.jsx        # Page d'accueil
│   └── login.jsx        # Écran de connexion
│
├── components/          # Composants React (voir components/README.md)
│   ├── screens/        # Écrans principaux (Activity, Dashboard, Floor, Settings)
│   ├── modals/         # Modales réutilisables
│   ├── activity/       # Composants spécifiques Activity
│   ├── dashboard/      # Composants spécifiques Dashboard
│   ├── shared/         # Composants partagés
│   ├── feature/        # Features avancées
│   └── ui/             # Composants UI de base
│
├── hooks/               # Custom React Hooks
│   ├── useActivityData.js
│   ├── useAuthFetch.js
│   ├── useDashboard*.js
│   └── ...
│
├── src/
│   ├── config/         # Configuration (API, etc.)
│   ├── services/       # Services (API calls)
│   └── stores/         # State management (Zustand)
│       ├── useReservationStore.js
│       ├── useThemeStore.js
│       └── ...
│
├── utils/              # Utilitaires
│   ├── RootNavigation.js
│   └── token.js
│
├── assets/             # Images, fonts, etc.
├── constants/          # Constantes (Colors, etc.)
└── shared-api/         # API partagée avec backend
```

## 🚀 Démarrage

### 1. Installation

```bash
cd frontend
yarn install
```

### 2. Configuration

Assurez-vous que le backend est lancé sur http://192.168.1.185:3000

### 3. Lancement

```bash
yarn start
```

## 📱 Écrans Principaux

- **Activity** : Gestion des commandes et service en temps réel
- **Dashboard** : Vue d'ensemble des réservations
- **Floor** : Plan de salle et gestion des tables
- **Settings** : Paramètres utilisateur et thème

## 🏗️ Architecture

### State Management
- **Zustand** pour le state global
- **Custom Hooks** pour la logique métier

### Navigation
- **Expo Router** avec file-based routing

### Optimisations
- **React.memo** pour la mémoisation
- **useCallback/useMemo** pour les performances
- **FlatList** pour le rendu virtualisé

## 🎨 Thème

### Couleurs des tables
- 🟢 Vert (#b3ff00ff) : Disponible
- 🔴 Rouge (#2b10a2ff) : Occupée
- ⚫ Noir (#000000) : Assignée

## 📝 Conventions

- Composants : PascalCase.jsx
- Hooks : useCamelCase.js
- Dossiers : kebab-case/

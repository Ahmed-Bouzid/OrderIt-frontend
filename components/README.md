# Structure des Composants Frontend

Cette organisation suit les conventions professionnelles React/React Native.

## 📁 Structure

```
components/
├── screens/              # Composants de type "écran" / "page"
│   ├── Activity.jsx      # Écran principal d'activité (optimisé)
│   ├── Dashboard.jsx     # Écran dashboard (optimisé)
│   ├── Floor.jsx         # Écran plan de salle
│   ├── Settings.jsx      # Écran paramètres
│   └── index.js          # Exports centralisés
│
├── modals/               # Modales réutilisables
│   ├── Payment.jsx       # Modal de paiement
│   └── index.js
│
├── activity/             # Composants spécifiques à Activity
│   ├── components/       # Sous-composants Activity
│   │   ├── LoadingSkeleton.jsx
│   │   ├── PaymentSection.jsx
│   │   ├── ProductSelection.jsx
│   │   ├── ReservationDetails.jsx
│   │   ├── ServiceSection.jsx
│   │   └── index.js
│   └── modals/          # Modales spécifiques Activity
│       ├── PaymentModal.jsx
│       ├── ProductModal.jsx
│       ├── SettingsModal.jsx
│       └── index.js
│
├── dashboard/            # Composants spécifiques à Dashboard
│   ├── AssignTableModal.jsx
│   ├── Filters.jsx
│   ├── LoadingSkeleton.jsx
│   ├── NewReservationModal.jsx
│   ├── ReservationCard.jsx
│   └── SettingsModal.jsx
│
├── shared/               # Composants partagés entre plusieurs écrans
│   ├── ProductColumn.jsx
│   ├── ReservationPopup.jsx
│   ├── SettingsModal.jsx
│   └── index.js
│
├── feature/              # Composants avancés / features spéciales
│   ├── AnimatedText.jsx
│   ├── Collapsible.tsx
│   ├── QRCodeScanner.js
│   └── ...
│
├── ui/                   # Composants UI de base / primitives
│   ├── draggableButton.jsx
│   ├── IconSymbol.tsx
│   ├── TabBarBackground.tsx
│   └── ...
│
├── client-public/        # Application client publique
│   └── ...
│
└── styles.js             # Styles globaux partagés
```

## 🎯 Conventions de Nommage

### Fichiers

- **Composants React** : `PascalCase.jsx` ou `.tsx`

  - ✅ `Activity.jsx`, `Dashboard.jsx`, `Payment.jsx`
  - ❌ `activity.jsx`, `dashboard.jsx`

- **Utilitaires/Config** : `camelCase.js`
  - ✅ `index.js`, `styles.js`

### Dossiers

- **Dossiers de composants** : `kebab-case` ou `camelCase`
  - ✅ `activity/`, `dashboard/`, `client-public/`
  - ❌ `Activity/`, `Dashboard/`

### Exports

- Toujours utiliser `default export` pour les composants principaux
- Utiliser `named exports` dans les fichiers `index.js` pour regrouper

```javascript
// ✅ Bon - index.js
export { default as Activity } from "./Activity";
export { default as Dashboard } from "./Dashboard";

// ✅ Bon - Composant
export default function Activity() { ... }
```

## 📦 Imports

### Depuis l'extérieur de components/

```javascript
// Import depuis app/ ou autres dossiers
import { Activity, Dashboard } from "../components/screens";
import { Payment } from "../components/modals";
```

### Depuis l'intérieur de components/

```javascript
// Depuis screens/Activity.jsx
import { SettingsModal } from "../activity/modals";
import { ReservationDetails } from "../activity/components";
import styles from "../styles";

// Depuis screens/Dashboard.jsx
import DraggableButton from "../ui/draggableButton";
import ReservationCard from "../dashboard/ReservationCard";
```

## 🏗️ Organisation par Type

### 1. **screens/** - Composants de haut niveau

Composants qui représentent une page/écran entier de l'application.

- Correspond généralement à une route
- Coordonne plusieurs sous-composants
- Gère la logique métier principale de l'écran

### 2. **modals/** - Modales réutilisables

Modales qui peuvent être utilisées depuis plusieurs écrans.

### 3. **activity/** et **dashboard/** - Composants spécifiques

Composants qui n'appartiennent qu'à un seul écran parent.

- Organisés par fonctionnalité
- Facilite la maintenance
- Évite la pollution du dossier principal

### 4. **shared/** - Composants partagés

Composants utilisés par plusieurs écrans différents.

- Réutilisables
- Sans dépendances spécifiques à un écran

### 5. **feature/** - Features avancées

Composants avec fonctionnalités complexes (animations, scanner, etc.)

### 6. **ui/** - Composants UI primitifs

Composants de base réutilisables (boutons, icônes, etc.)

## ✅ Changements Appliqués

### Fichiers Renommés

- `ActivityOptimized.jsx` → `screens/Activity.jsx`
- `DashboardOptimized.jsx` → `screens/Dashboard.jsx`
- `floor.jsx` → `screens/Floor.jsx`
- `settings.jsx` → `screens/Settings.jsx`
- `Payment.jsx` → `modals/Payment.jsx`

### Fichiers Supprimés

- ❌ `activity.jsx` (ancien, non optimisé)
- ❌ `dashboard.jsx` (ancien, non optimisé)

### Dossiers Restructurés

- `elements/ActivityModals/` → `activity/modals/`
- `elements/ActivityComponents/` → `activity/components/`
- `elements/*` (autres) → `shared/`
- ❌ `elements/` (supprimé)

### Imports Corrigés

- ✅ Tous les imports dans `app/` mis à jour
- ✅ Tous les imports dans `components/` mis à jour
- ✅ Chemins relatifs corrigés selon la nouvelle structure

## 🚀 Avantages

1. **Clarté** : Structure intuitive et professionnelle
2. **Scalabilité** : Facile d'ajouter de nouveaux composants
3. **Maintenabilité** : Chaque chose à sa place
4. **Performance** : Imports optimisés avec index.js
5. **Standards** : Suit les conventions React/React Native

## 📝 Notes

- Les composants optimisés remplacent les anciens
- Tous les tests ont été effectués sans erreur
- Structure prête pour l'expansion future
- Compatible avec Expo Router et React Navigation

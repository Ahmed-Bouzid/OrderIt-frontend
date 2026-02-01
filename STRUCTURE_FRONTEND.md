# Structure Frontend - OrderIt

**Version** : 2.0  
**Date** : 1 février 2026  
**App** : OrderIt Frontend (serveurs/restaurateurs)

---

## Vue d'ensemble

Frontend React Native/Expo pour l'application serveurs, structurée en modules fonctionnels avec optimisations avancées.

---

## Architecture

```
frontend/
├── app/                        Navigation & Routes
│   ├── (tabs)/                 Routes protégées
│   ├── tabs/                   Tabs principaux
│   ├── _layout.jsx             Layout racine
│   ├── login.jsx               Écran connexion
│   └── index.jsx               Point d'entrée
│
├── components/                 Composants React
│   ├── activity/               Module Activity
│   │   ├── components/         Sous-composants Activity
│   │   │   └── index.js        ✅ Exports centralisés
│   │   └── modals/             Modales Activity
│   │       └── index.js        ✅ Exports centralisés
│   │
│   ├── dashboard/              Module Dashboard
│   │   ├── ReservationCard.jsx
│   │   ├── Filters.jsx
│   │   ├── README.md           Documentation spécifique
│   │   └── index.js            ✅ Exports centralisés (NOUVEAU)
│   │
│   ├── floor/                  Module Floor
│   │   ├── FloorPlanModal.jsx
│   │   └── index.js            ✅ Exports centralisés
│   │
│   ├── modals/                 Modales génériques
│   │   ├── Payment.jsx         (avec réimpression)
│   │   └── index.js            ✅ Exports centralisés
│   │
│   ├── receipt/                Module Ticket de caisse
│   │   ├── ReceiptModal.jsx
│   │   └── index.js            ✅ Exports centralisés
│   │
│   ├── screens/                Écrans principaux
│   │   ├── Activity.jsx        (1955 lignes)
│   │   ├── Dashboard.jsx
│   │   ├── Floor.jsx
│   │   └── index.js            ✅ Exports centralisés
│   │
│   ├── shared/                 Composants partagés
│   │   └── index.js            ✅ Exports centralisés
│   │
│   ├── feature/                Composants avancés
│   │   ├── AnimatedText.jsx
│   │   ├── QRCodeScanner.js
│   │   └── index.js            ✅ Exports centralisés (NOUVEAU)
│   │
│   └── ui/                     Composants UI génériques
│       ├── ClientMessageNotification.jsx
│       └── index.js            ✅ Exports centralisés (NOUVEAU)
│
├── hooks/                      Custom React Hooks
│   ├── useActivityData.js
│   ├── useDashboardActions.js
│   └── useSocket.js
│
├── services/                   Services API
│   ├── feedbackService.js
│   └── stripeService.js
│
└── src/                        Configuration & État
    ├── config/                 Configuration
    │   └── apiConfig.js
    └── stores/                 Zustand stores
        └── useReservationStore.js
```

---

## Conventions de nommage

### Composants

- **PascalCase.jsx** pour tous les composants React
- Exemples : `Activity.jsx`, `ReservationCard.jsx`

### Hooks

- **useCamelCase.js** pour les custom hooks
- Préfixe obligatoire : `use`
- Exemples : `useActivityData.js`, `useDashboardFilters.js`

### Services

- **camelCaseService.js** pour les services API
- Suffixe obligatoire : `Service`
- Exemples : `feedbackService.js`, `stripeService.js`

### Stores (Zustand)

- **useCamelCaseStore.js** pour les stores
- Préfixe/suffixe : `use` + `Store`
- Exemples : `useReservationStore.js`, `useThemeStore.js`

---

## Rôle de chaque dossier

### components/activity/

Tout ce qui concerne l'écran Activity (réservations actives)

**Import** :

```jsx
import { PaymentModal, ProductModal } from "../activity/modals";
import { ReservationDetails } from "../activity/components";
```

### components/dashboard/

Dashboard (réservations futures) avec optimisations React.memo

**Import** :

```jsx
import { ReservationCard, Filters } from "../dashboard";
```

### components/floor/

Plan de salle interactif avec drag & drop

**Import** :

```jsx
import { FloorPlanModal, PlanDeSalle } from "../floor";
```

### components/modals/

Modales génériques partagées entre plusieurs écrans

**Import** :

```jsx
import { AllergenSelectionModal } from "../modals";
```

### components/receipt/

Tout ce qui concerne les tickets de caisse

**Import** :

```jsx
import { ReceiptModal, ReceiptTicket } from "../receipt";
```

### components/screens/

Écrans principaux (pages) de l'app

**Import** :

```jsx
import Activity from "../../components/screens/Activity";
```

### components/shared/

Composants réutilisables entre plusieurs écrans

**Import** :

```jsx
import { ErrorBoundary, ProductColumn } from "../shared";
```

### components/feature/

Composants avancés avec features spéciales

**Import** :

```jsx
import { AnimatedText, QRCodeScanner } from "../feature";
```

### components/ui/

Composants UI génériques ultra-réutilisables

**Import** :

```jsx
import { ClientMessageNotification } from "../ui";
```

### hooks/

Custom React hooks pour logique réutilisable

**Import** :

```jsx
import { useActivityData } from "../../hooks/useActivityData";
```

### services/

Clients API pour appels backend

**Import** :

```jsx
import { feedbackService } from "../../services/feedbackService";
```

---

## Patterns d'import

### ✅ RECOMMANDÉ

```jsx
import { PaymentModal, ProductModal } from "../activity/modals";
import { ReservationCard, Filters } from "../dashboard";
import { ReceiptModal } from "../receipt";
```

### ❌ À ÉVITER

```jsx
// ❌ Imports relatifs trop complexes
import Payment from "../../../components/modals/Payment";

// ❌ Imports directs sans passer par index.js
import ReservationCard from "../dashboard/ReservationCard";
```

---

## Workflow d'ajout

### Ajouter un composant Activity

1. Créer : `components/activity/components/MonComposant.jsx`
2. Exporter dans `components/activity/components/index.js` :
   ```js
   export { default as MonComposant } from "./MonComposant";
   ```
3. Utiliser :
   ```jsx
   import { MonComposant } from "../activity/components";
   ```

### Ajouter un hook

1. Créer : `hooks/useMonHook.js`
2. Implémenter :

   ```js
   import { useState } from "react";

   export function useMonHook() {
   	const [data, setData] = useState(null);
   	return { data };
   }
   ```

3. Utiliser :
   ```jsx
   import { useMonHook } from "../../hooks/useMonHook";
   ```

### Ajouter un service

1. Créer : `services/monService.js`
2. Implémenter :

   ```js
   import { API_CONFIG } from "../src/config/apiConfig";

   export const monService = {
   	async fetchData(id) {
   		const response = await fetch(`${API_CONFIG.BASE_URL}/api/data/${id}`);
   		return response.json();
   	},
   };
   ```

3. Utiliser :
   ```jsx
   import { monService } from "../../services/monService";
   ```

---

## Troubleshooting

### Erreur : "Cannot find module '../dashboard'"

**Solution** : Vérifier que `components/dashboard/index.js` existe avec exports

### Invalid hook call

**Solution** : Hooks uniquement dans composants/hooks, pas dans services/utils

### Import circulaire détecté

**Solution** : Déplacer logique commune dans un 3e fichier

---

## Checklist qualité

- [ ] Nommage respecte les conventions
- [ ] Exports ajoutés dans index.js
- [ ] Imports utilisent les index.js
- [ ] Aucun fichier .bak, \_OLD committé
- [ ] React.memo pour composants lourds

---

## Changements effectués (1 février 2026)

### Fichiers supprimés (7)

- ❌ activity/modals/PremiumTPEModal_working.jsx (version de travail)
- ❌ floor/FloorPlanModal_OLD_BACKUP.jsx (backup ancien)
- ❌ screens/PaymentScreen.jsx (fichier mort)
- ❌ dashboard/NewReservationModal.jsx.bak
- ❌ dashboard/SettingsModal.jsx.bak
- ❌ dashboard/SettingsModal.jsx.bak2
- ❌ app/index.jsx.bak

### Fichiers créés (3)

- ✅ components/dashboard/index.js (exports centralisés)
- ✅ components/feature/index.js (exports centralisés)
- ✅ components/ui/index.js (exports centralisés)

### Résultat

- ✅ 0 erreur de compilation
- ✅ Structure 100% cohérente
- ✅ 3 nouveaux index.js
- ✅ 7 fichiers morts supprimés

---

**Documentation complète** : Voir [RAPPORT_RESTRUCTURATION.md](RAPPORT_RESTRUCTURATION.md)

**Version** : 2.0  
**Dernière mise à jour** : 1 février 2026

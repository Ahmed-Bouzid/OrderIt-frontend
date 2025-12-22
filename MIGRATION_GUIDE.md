# Guide de Migration - Imports Frontend

Si vous avez du code qui importe les anciens chemins, voici comment les mettre à jour :

## 🔄 Remplacement des Imports

### Écrans Principaux

```javascript
// ❌ ANCIEN
import Activity from "../components/ActivityOptimized";
import Activity from "../components/activity";
import Dashboard from "../components/DashboardOptimized";
import Dashboard from "../components/dashboard";
import Floor from "../components/floor";
import Settings from "../components/settings";

// ✅ NOUVEAU
import Activity from "../components/screens/Activity";
import Dashboard from "../components/screens/Dashboard";
import Floor from "../components/screens/Floor";
import Settings from "../components/screens/Settings";

// ✨ OU ENCORE MIEUX (avec index.js)
import { Activity, Dashboard, Floor, Settings } from "../components/screens";
```

### Modales

```javascript
// ❌ ANCIEN
import Payment from "../components/Payment";

// ✅ NOUVEAU
import Payment from "../components/modals/Payment";

// ✨ OU
import { Payment } from "../components/modals";
```

### Composants Activity

```javascript
// ❌ ANCIEN
import { SettingsModal } from "../components/elements/ActivityModals";
import { ReservationDetails } from "../components/elements/ActivityComponents";

// ✅ NOUVEAU
import { SettingsModal } from "../components/activity/modals";
import { ReservationDetails } from "../components/activity/components";
```

### Composants Partagés

```javascript
// ❌ ANCIEN
import ProductColumn from "../components/elements/ProductColumn";
import ReservationPopup from "../components/elements/ReservationPopup";

// ✅ NOUVEAU
import ProductColumn from "../components/shared/ProductColumn";
import ReservationPopup from "../components/shared/ReservationPopup";

// ✨ OU
import { ProductColumn, ReservationPopup } from "../components/shared";
```

---

## 🔍 Recherche et Remplacement (Regex)

Si vous utilisez VS Code, vous pouvez utiliser ces patterns :

### Pattern 1 : ActivityOptimized → Activity

```regex
Rechercher : from ["'](.*/)?ActivityOptimized["']
Remplacer : from "$1screens/Activity"
```

### Pattern 2 : DashboardOptimized → Dashboard

```regex
Rechercher : from ["'](.*/)?DashboardOptimized["']
Remplacer : from "$1screens/Dashboard"
```

### Pattern 3 : elements/ActivityModals → activity/modals

```regex
Rechercher : from ["'](.*/)?elements/ActivityModals["']
Remplacer : from "$1activity/modals"
```

### Pattern 4 : elements/ActivityComponents → activity/components

```regex
Rechercher : from ["'](.*/)?elements/ActivityComponents["']
Remplacer : from "$1activity/components"
```

### Pattern 5 : Écrans en minuscules

```regex
Rechercher : from ["'](.*/)?components/(activity|dashboard|floor|settings)["']
Remplacer : from "$1components/screens/${2:capitalize}"
```

---

## 📋 Checklist de Migration

Pour chaque fichier que vous migrez :

- [ ] Remplacer les imports des écrans (activity → Activity, etc.)
- [ ] Mettre à jour les imports de Payment
- [ ] Corriger les imports elements/ → activity/ ou shared/
- [ ] Vérifier les chemins relatifs (../ vs ../../)
- [ ] Tester la compilation (aucune erreur d'import)
- [ ] Tester l'exécution (l'app fonctionne)

---

## 🆘 En Cas de Problème

### Erreur : "Module not found"

```
Error: Unable to resolve module ../components/activity
```

**Solution** :

```javascript
// Changer
import Activity from "../components/activity";
// En
import Activity from "../components/screens/Activity";
```

### Erreur : "Default export not found"

```
Error: Attempted import error: 'Activity' is not exported from '../components/screens'
```

**Solution** :
Vérifier que le fichier a bien un `export default` :

```javascript
export default function Activity() { ... }
```

### Erreur : Chemins relatifs incorrects

```
Error: Unable to resolve module ../../src/stores/...
```

**Solution** :
Compter correctement les niveaux :

- Depuis `components/screens/` : `../../src/stores/`
- Depuis `components/activity/` : `../../src/stores/`
- Depuis `components/` : `../src/stores/`

---

## 💡 Astuces

### 1. Import groupés

Utilisez les fichiers index.js :

```javascript
// Au lieu de
import Activity from "../components/screens/Activity";
import Dashboard from "../components/screens/Dashboard";
import Floor from "../components/screens/Floor";

// Préférez
import { Activity, Dashboard, Floor } from "../components/screens";
```

### 2. Alias de chemins (optionnel)

Vous pouvez configurer des alias dans `babel.config.js` :

```javascript
module.exports = {
	plugins: [
		[
			"module-resolver",
			{
				alias: {
					"@components": "./components",
					"@screens": "./components/screens",
					"@hooks": "./hooks",
					"@stores": "./src/stores",
				},
			},
		],
	],
};
```

Puis importer :

```javascript
import Activity from "@screens/Activity";
import { useActivityData } from "@hooks/useActivityData";
```

---

## 📞 Support

Si vous rencontrez des problèmes non couverts par ce guide :

1. Vérifiez `components/README.md` pour la structure complète
2. Consultez `REFACTOR_REPORT.md` pour les détails de la restructuration
3. Vérifiez que vous utilisez les bons chemins relatifs (../ vs ../../)

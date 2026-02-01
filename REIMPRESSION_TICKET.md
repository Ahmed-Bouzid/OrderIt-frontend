# 🖨️ Fonctionnalité de réimpression de ticket - Frontend

## ✅ Capacité de réimpression : OUI

Le **frontend** (app serveurs/restaurateurs) dispose maintenant d'une **fonctionnalité complète de réimpression de ticket**.

## 📋 Ce qui existait déjà

1. **Composant ReceiptTicket** : Design professionnel de ticket (`frontend/components/receipt/ReceiptTicket.jsx`)
2. **Composant ReceiptModal** : Modal avec confettis d'animation (`frontend/components/receipt/ReceiptModal.jsx`)
3. **Hook useReceiptExport** : Export en PNG via react-native-view-shot (`frontend/hooks/useReceiptExport.js`)
4. **Affichage automatique** : Le ticket s'affiche automatiquement après paiement complet dans `PaymentModal`

## 🆕 Nouvelle fonctionnalité ajoutée

### Bouton "Réimprimer le ticket"

**Localisation** : `frontend/components/modals/Payment.jsx`

#### Fonction `reprintLastReceipt()`

```javascript
const reprintLastReceipt = useCallback(() => {
	if (!receiptData) {
		Alert.alert(
			"Aucun ticket disponible",
			"Aucun ticket n'a été généré récemment. Effectuez d'abord un paiement.",
		);
		return;
	}
	setShowReceipt(true);
}, [receiptData]);
```

**Logique** :

- Vérifie qu'un ticket a déjà été généré (`receiptData` existe)
- Si oui, réaffiche le `ReceiptModal` avec les mêmes données
- Si non, affiche une alerte explicative

#### Bouton UI

```jsx
{
	receiptData && (
		<TouchableOpacity
			style={styles.reprintButton}
			onPress={reprintLastReceipt}
			disabled={loading}
		>
			<MaterialIcons name="receipt" size={20} color="#4A90E2" />
			<Text style={styles.reprintButtonText}>Réimprimer le ticket</Text>
		</TouchableOpacity>
	);
}
```

**Apparence** :

- Bouton blanc avec bordure bleue (#4A90E2)
- Icône "receipt" + texte "Réimprimer le ticket"
- **Visible uniquement** après qu'un paiement ait été effectué (quand `receiptData` existe)
- Désactivé pendant le chargement

## 🎯 Cas d'usage

### Scénario 1 : Réimpression immédiate

1. Serveur effectue un paiement complet
2. Le ticket s'affiche automatiquement (confettis 🎉)
3. Client ferme le ticket par erreur
4. **Bouton "Réimprimer le ticket" apparaît**
5. Serveur clique → Le ticket se réaffiche instantanément

### Scénario 2 : Paiement partiel puis réimpression

1. Serveur effectue un paiement partiel (pas de ticket auto)
2. Serveur effectue un 2ème paiement pour compléter
3. Le ticket s'affiche pour le paiement complet
4. **Bouton "Réimprimer le ticket" reste visible**
5. Permet de réafficher le ticket à tout moment

### Scénario 3 : Ticket non disponible

1. Serveur ouvre la modal de paiement
2. Aucun paiement encore effectué
3. Bouton "Réimprimer le ticket" **n'est pas visible**
4. Si on essaie (impossible normalement), alerte "Aucun ticket disponible"

## 📊 Données du ticket

### Structure `receiptData`

```javascript
{
	items: [
		{ name: string, quantity: number, price: number }
	],
	amount: number,          // Montant total payé
	paymentMethod: string,   // "Card" par défaut
	last4Digits: string      // "****" (si CB)
}
```

### Données passées à ReceiptModal

```jsx
<ReceiptModal
	visible={showReceipt}
	onClose={handleCloseReceipt}
	reservation={reservation} // Infos réservation complètes
	items={receiptData?.items}
	amount={receiptData?.amount}
	paymentMethod={receiptData?.paymentMethod}
	last4Digits={receiptData?.last4Digits}
	theme={safeTheme}
/>
```

## 🎨 Design du bouton

```javascript
reprintButton: {
	backgroundColor: "#fff",
	paddingVertical: 16,
	borderRadius: 12,
	alignItems: "center",
	flexDirection: "row",
	justifyContent: "center",
	gap: 8,
	borderWidth: 2,
	borderColor: "#4A90E2",
},
reprintButtonText: {
	color: "#4A90E2",
	fontWeight: "600",
	fontSize: 16,
},
```

**Visuel** :

```
┌──────────────────────────────────────┐
│  📄 Réimprimer le ticket             │ (bleu sur blanc)
└──────────────────────────────────────┘
```

## 🔄 Flow complet

```
[Serveur ouvre PaymentModal]
    ↓
[Sélectionne articles à payer]
    ↓
[Clique "Payer X articles"]
    ↓
[Paiement Stripe réussi]
    ↓
[receiptData est créé]
    ↓
[Si paiement complet → ReceiptModal s'affiche auto]
    ↓
[Client ferme le modal]
    ↓
[BOUTON "Réimprimer le ticket" visible]
    ↓
[Serveur clique → ReceiptModal réapparaît avec mêmes données]
    ↓
[Export PDF/PNG disponible via ReceiptModal]
```

## 🆚 Différence avec CLIENT-end

| Feature                   | Frontend (serveurs)   | CLIENT-end (public)    |
| ------------------------- | --------------------- | ---------------------- |
| **Ticket après paiement** | ✅ Oui (ReceiptModal) | ✅ Oui (ReceiptTicket) |
| **Réimpression**          | ✅ **OUI (nouveau)**  | ❌ Non (à implémenter) |
| **Export**                | 📷 PNG (view-shot)    | 📄 PDF (expo-print)    |
| **Design**                | Modal + confettis     | Plein écran monospace  |
| **TVA**                   | ❌ Non                | ✅ Oui (checkbox 20%)  |

## 🚀 Test de la fonctionnalité

### Prérequis

```bash
cd frontend
npx expo start
```

### Scénario de test

1. **Login** en tant que serveur
2. **Ouvrir** l'onglet Activity
3. **Sélectionner** une réservation active
4. **Cliquer** sur "💳 Payer" (PaymentSection)
5. **Sélectionner** tous les articles
6. **Payer** (simuler paiement complet)
7. **Vérifier** :
   - ✅ ReceiptModal s'affiche avec confettis
   - ✅ Bouton "Réimprimer le ticket" visible en bas
8. **Fermer** le ticket
9. **Cliquer** sur "Réimprimer le ticket"
10. **Vérifier** :
    - ✅ ReceiptModal réapparaît instantanément
    - ✅ Même données (articles, montant)
    - ✅ Possibilité d'exporter en PNG

## 🐛 Troubleshooting

**Le bouton n'apparaît pas :**

- Vérifier qu'un paiement complet a été effectué
- Vérifier que `receiptData` n'est pas `null` (console.log)
- Le bouton apparaît uniquement dans PaymentModal

**Erreur "Aucun ticket disponible" :**

- Normal si aucun paiement n'a été effectué
- Effectuer d'abord un paiement pour générer `receiptData`

**Le ticket est vide/incomplet :**

- Vérifier que `receiptData.items` contient les articles
- Vérifier que `reservation` est passé correctement

## ✅ Checklist finale

- [x] Fonction `reprintLastReceipt()` créée
- [x] Bouton UI ajouté avec icône + style
- [x] Condition d'affichage (`receiptData` existe)
- [x] Styles du bouton définis
- [x] Aucune erreur de syntaxe
- [x] Documentation complète

## 📝 Évolutions futures possibles

1. **Historique des tickets** : Stocker plusieurs tickets et permettre de choisir lequel réimprimer
2. **Export auto** : Sauvegarder automatiquement chaque ticket en local
3. **Email du ticket** : Envoyer le ticket par email au client
4. **QR Code** : Ajouter un QR code sur le ticket pour traçabilité
5. **Statistiques** : Tracker combien de fois chaque ticket est réimprimé

---

**🎉 La fonctionnalité de réimpression de ticket est maintenant opérationnelle dans le frontend !**

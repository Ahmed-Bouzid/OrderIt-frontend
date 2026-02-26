# 📊 Modifications CRM Performance - Instructions d'intégration

## ✅ Ce qui a été fait :

1. **Uniformisation de l'interface** : CRM Performance s'ouvre maintenant exactement comme Comptabilité avec le même style de bouton (bordure amber, shadow, etc.)

2. **Bouton de fermeture corrigé** : La modale CRM Performance se ferme maintenant correctement avec la croix

3. **Composant DonutChart créé** : Nouveau composant de graphique en donut animé (`frontend/components/crm/DonutChart.jsx`)

4. **Styles ajoutés** : Styles `donutSection` et `donutCard` ajoutés au fichier CRMPerformance.jsx

5. **Fonctionnalités listées** : Toutes les nouvelles métriques sont listées dans la page des réglages

## 🔧 À ajouter manuellement dans CRMPerformance.jsx :

**Ligne ~280, après le deuxième kpiRow (Temps Moyen et Serveurs Actifs), ajouter :**

```jsx
			{/* Nouvelles métriques */}
			<View style={styles.kpiRow}>
				<KPICard
					title="Temps Attente Tampon"
					value={Math.round(dashboard?.kpi?.averageWaitTime || 0)}
					unit="min"
					icon="timer-outline"
					color="warning"
					animationDelay={350}
					loading={isLoading}
				/>
				<KPICard
					title="Satisfaction Client"
					value={(dashboard?.kpi?.customerSatisfaction || 0).toFixed(1)}
					unit="/5"
					icon="star-outline"
					color="success"
					animationDelay={400}
					loading={isLoading}
				/>
			</View>
		</View>

		{/* Graphiques Donut - Nouvelles métriques */}
		<View style={styles.donutSection}>
			<Text
				style={[styles.sectionTitle, { color: THEME.colors.text.primary }]}
			>
				📊 Analyse Détaillée
			</Text>

			{/* Répartition Réservations */}
			<View style={[styles.donutCard, { backgroundColor: THEME.colors.background.elevated }]}>
				<DonutChart
					data={[
						{
							label: "Ouvertes",
							value: dashboard?.reservations?.open || 0,
							color: "#10B981",
						},
						{
							label: "Fermées",
							value: dashboard?.reservations?.closed || 0,
							color: "#6B7280",
						},
					]}
					size={180}
					strokeWidth={25}
					title="Réservations"
					centerLabel="Total"
					showLegend={true}
					animationDelay={500}
				/>
			</View>

			{/* Méthodes de Paiement */}
			<View style={[styles.donutCard, { backgroundColor: THEME.colors.background.elevated }]}>
				<DonutChart
					data={[
						{
							label: "Espèces",
							value: dashboard?.payments?.cash || 0,
							color: "#F59E0B",
						},
						{
							label: "Carte Bancaire",
							value: dashboard?.payments?.card || 0,
							color: "#3B82F6",
						},
					]}
					size={180}
					strokeWidth={25}
					title="Méthodes de Paiement"
					centerValue={`${((dashboard?.payments?.cash || 0) + (dashboard?.payments?.card || 0)).toLocaleString()}€`}
					centerLabel="CA Total"
					showLegend={true}
					animationDelay={600}
				/>
			</View>

			{/* Produits Add-ons */}
			<View style={[styles.donutCard, { backgroundColor: THEME.colors.background.elevated }]}>
				<DonutChart
					data={dashboard?.addOns || [
						{ label: "Add-ons", value: 0, color: "#8B5CF6" },
					]}
					size={180}
					strokeWidth={25}
					title="Produits Add-ons Vendus"
					centerLabel="Upsell"
					showLegend={true}
					animationDelay={700}
				/>
			</View>
		</View>

		{/* Graphique principal */}
		<View style={styles.chartSection}>
```

**Remplacer le bloc entre le dernier `</View>` des KPIs et le commentaire `{/* Graphique principal */}`**

## 📊 Métriques backend à implémenter :

Le backend (hook useCRMData) doit maintenant retourner ces nouvelles données dans `dashboard` :

```javascript
{
	kpi: {
		// Existant
		totalOrders: number,
		totalRevenue: number,
		averageServiceTime: number,
		activeServers: number,

		// Nouveau
		averageWaitTime: number,      // Temps attente tampon (minutes)
		customerSatisfaction: number, // Note /5
	},

	reservations: {
		open: number,   // Nombre de réservations ouvertes
		closed: number, // Nombre de réservations fermées
	},

	payments: {
		cash: number,   // CA en espèces
		card: number,   // CA en carte bancaire
	},

	addOns: [
		{ label: string, value: number, color: string },
		// Un objet par produit add-on vendu
	]
}
```

## 🔍 Erreur Classement :

L'erreur sur l'onglet Classement vient probablement de données backend manquantes ou vides. Vérifier que le hook `useCRMData` retourne bien un tableau `servers` avec les bonnes propriétés.

## 🎨 Résultat attendu :

- ✅ Toutes les fonctionnalités (CRM, Comptabilité, Messagerie) ont le même style d'ouverture
- ✅ CRM Performance affiche 6 KPIs (dont 2 nouveaux)
- ✅ 3 graphiques Donut animés : Réservations, Paiements, Add-ons
- ✅ Fermeture de modale fonctionnelle
- ✅ Design cohérent avec le thème amber

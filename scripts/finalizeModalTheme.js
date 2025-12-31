#!/usr/bin/env node
/**
 * Script pour finaliser la conversion des modales au thème dynamique
 * Remplace les références COLORS, SPACING, RADIUS, TYPOGRAPHY par THEME.xxx
 *
 * Note: Ce script utilise CommonJS car il est exécuté avec Node.js directement
 * et le projet frontend n'a pas "type": "module" dans package.json
 */

/* eslint-disable no-undef */

const fs = require("fs");
const path = require("path");

// Utiliser __dirname est correct ici car c'est du CommonJS
const files = [
	path.join(__dirname, "../components/dashboard/AssignTableModal.jsx"),
	path.join(__dirname, "../components/dashboard/SettingsModal.jsx"),
];

files.forEach((filePath) => {
	console.log(`\n📝 Traitement de ${path.basename(filePath)}...`);

	let content = fs.readFileSync(filePath, "utf8");
	let changes = 0;

	// Remplacements
	const replacements = [
		// Dans les styles et le JSX
		[/COLORS\./g, "THEME.colors."],
		[/SPACING\./g, "THEME.spacing."],
		[/RADIUS\./g, "THEME.radius."],
		[/TYPOGRAPHY\./g, "THEME.typography."],
	];

	replacements.forEach(([pattern, replacement]) => {
		const matches = (content.match(pattern) || []).length;
		if (matches > 0) {
			content = content.replace(pattern, replacement);
			changes += matches;
			console.log(
				`  ✅ ${matches} remplacement(s) : ${pattern} → ${replacement}`
			);
		}
	});

	// Convertir les StyleSheet.create en fonctions
	if (content.includes("const modalStyles = StyleSheet.create({")) {
		content = content.replace(
			"const modalStyles = StyleSheet.create({",
			"const createModalStyles = (THEME) => StyleSheet.create({"
		);
		console.log(`  ✅ Converti modalStyles en createModalStyles(THEME)`);
		changes++;
	}

	if (content.includes("const tableStyles = StyleSheet.create({")) {
		content = content.replace(
			"const tableStyles = StyleSheet.create({",
			"const createTableStyles = (THEME) => StyleSheet.create({"
		);
		console.log(`  ✅ Converti tableStyles en createTableStyles(THEME)`);
		changes++;
	}

	// Sauvegarder
	if (changes > 0) {
		fs.writeFileSync(filePath, content, "utf8");
		console.log(`\n✨ ${changes} modification(s) appliquée(s) avec succès !`);
	} else {
		console.log(`\n⏭️  Aucune modification nécessaire`);
	}
});

console.log("\n✅ Conversion terminée !\n");

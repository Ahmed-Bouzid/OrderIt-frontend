/**
 * Plugin Expo — Kiosk Mode Android
 * Ajoute android:lockTaskMode="if_whitelisted" sur la MainActivity
 * et android:keepScreenOn="true" pour la tablette resto
 *
 * Intégration : ajouter "plugins/withKioskMode" dans app.json
 */
const { withAndroidManifest } = require("@expo/config-plugins");

module.exports = function withKioskMode(config) {
	return withAndroidManifest(config, (mod) => {
		const { manifest } = mod.modResults;
		const application = manifest.application?.[0];
		if (!application) return mod;

		const activities = application.activity || [];
		const mainActivity = activities.find(
			(a) =>
				a.$["android:name"] === ".MainActivity" ||
				a.$["android:name"]?.endsWith("MainActivity"),
		);

		if (mainActivity) {
			mainActivity.$["android:lockTaskMode"] = "if_whitelisted";
			mainActivity.$["android:keepScreenOn"] = "true";
			// Empêche le retour arrière de quitter l'app
			mainActivity.$["android:noHistory"] = "false";
		}

		return mod;
	});
};

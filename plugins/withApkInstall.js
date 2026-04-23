/**
 * Plugin Expo — Permission installation APK
 * Ajoute REQUEST_INSTALL_PACKAGES + FileProvider pour l'auto-update
 *
 * Intégration : ajouter "plugins/withApkInstall" dans app.json
 */
const { withAndroidManifest, withDangerousMod } = require("@expo/config-plugins");
const path = require("path");
const fs = require("fs");

// 1. Permissions + FileProvider dans AndroidManifest.xml
function withApkInstallManifest(config) {
	return withAndroidManifest(config, (mod) => {
		const { manifest } = mod.modResults;

		// Permission
		if (!manifest["uses-permission"]) manifest["uses-permission"] = [];
		const hasInstallPerm = manifest["uses-permission"].some(
			(p) => p.$["android:name"] === "android.permission.REQUEST_INSTALL_PACKAGES",
		);
		if (!hasInstallPerm) {
			manifest["uses-permission"].push({
				$: { "android:name": "android.permission.REQUEST_INSTALL_PACKAGES" },
			});
		}

		// FileProvider (nécessaire Android 7+ pour partager les fichiers APK)
		const application = manifest.application?.[0];
		if (!application) return mod;
		if (!application.provider) application.provider = [];

		const packageName = config.android?.package || "com.sunnygo.dev";
		const providerAuthority = `${packageName}.kioskprovider`;
		const hasProvider = application.provider.some(
			(p) => p.$["android:authorities"] === providerAuthority,
		);

		if (!hasProvider) {
			application.provider.push({
				$: {
					"android:name": "androidx.core.content.FileProvider",
					"android:authorities": providerAuthority,
					"android:exported": "false",
					"android:grantUriPermissions": "true",
				},
				"meta-data": [
					{
						$: {
							"android:name": "android.support.FILE_PROVIDER_PATHS",
							"android:resource": "@xml/kiosk_file_paths",
						},
					},
				],
			});
		}

		return mod;
	});
}

// 2. Fichier XML des chemins autorisés pour le FileProvider
function withApkFileProviderXml(config) {
	return withDangerousMod(config, [
		"android",
		(mod) => {
			const xmlDir = path.join(
				mod.modRequest.platformProjectRoot,
				"app",
				"src",
				"main",
				"res",
				"xml",
			);
			fs.mkdirSync(xmlDir, { recursive: true });

			fs.writeFileSync(
				path.join(xmlDir, "kiosk_file_paths.xml"),
				`<?xml version="1.0" encoding="utf-8"?>
<paths>
  <external-files-path name="apk_downloads" path="." />
  <files-path name="internal_files" path="." />
  <cache-path name="cache" path="." />
</paths>`,
			);
			return mod;
		},
	]);
}

module.exports = function withApkInstall(config) {
	config = withApkInstallManifest(config);
	config = withApkFileProviderXml(config);
	return config;
};

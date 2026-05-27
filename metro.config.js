const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

// ─── CRITICAL PERFORMANCE FIXES ─────────────────────────────────────────────
// Force Node file system watcher (not Watchman) to prevent deadlock on macOS
config.fileSystemType = "node";

// Aggressive inlining reduces memory footprint and compilation time
config.transformer.getTransformOptions = async () => ({
	transform: {
		experimentalImportSupport: false,
		inlineRequires: true,
	},
});

// 3 workers = parallelism without memory pressure on dev machine
config.maxWorkers = 3;

// Ne pas ajouter shared-api dans watchFolders pour éviter les erreurs Watchman
// config.watchFolders = [...config.watchFolders, "./shared-api"];

config.resolver.extraNodeModules = {
	...config.resolver.extraNodeModules,
	"shared-api": path.resolve(__dirname, "./shared-api"),
};

module.exports = config;

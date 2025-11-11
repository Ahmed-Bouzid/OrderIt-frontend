const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

// Ajoute la configuration pour shared-store
config.resolver.extraNodeModules = {
	...config.resolver.extraNodeModules,
	"shared-store": path.resolve(__dirname, "../shared-store"),
};

config.watchFolders = [
	...config.watchFolders,
	path.resolve(__dirname, "../shared-store"),
];

module.exports = config;

// OrderIt-frontend/metro.config.js
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

config.watchFolders = [...config.watchFolders, "../shared-api"];

config.resolver.extraNodeModules = {
	...config.resolver.extraNodeModules,
	"shared-api": "../shared-api",
};

module.exports = config;

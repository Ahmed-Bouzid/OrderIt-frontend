const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

config.watchFolders = [...config.watchFolders, "../shared-api"];

config.resolver.extraNodeModules = {
	...config.resolver.extraNodeModules,
	"shared-api": path.resolve(__dirname, "../shared-api"),
};

module.exports = config;

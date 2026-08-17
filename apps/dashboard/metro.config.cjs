const path = require("node:path");
const { getDefaultConfig } = require("expo/metro-config");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

const defaultBlockList = config.resolver.blockList;
config.resolver.blockList = [
  ...(Array.isArray(defaultBlockList)
    ? defaultBlockList
    : defaultBlockList
      ? [defaultBlockList]
      : []),
  /[/\\]__tests__[/\\].*/,
  /[/\\].*\.test\.[cm]?[jt]sx?$/,
  /[/\\].*\.spec\.[cm]?[jt]sx?$/,
  /[/\\]jest\.config\.[cm]?js$/,
  /[/\\]jest\.setup\.[cm]?[jt]sx?$/,
];

// @testing-library/react-native pulls pretty-format@30 (ESM). Metro then
// evaluates `_prettyFormat.default.default` as undefined. Pin the CJS 29.x
// copy that @expo/metro-runtime and React Native expect.
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules ?? {}),
  "pretty-format": path.resolve(projectRoot, "node_modules/pretty-format"),
};

module.exports = config;

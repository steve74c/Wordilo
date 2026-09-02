// Configurazione Metro per il monorepo: l'app vive in /app ma importa /core, che
// sta FUORI dalla cartella del progetto. Diciamo quindi a Metro di "sorvegliare"
// anche la radice del repo e di risolvere `@wordilo/core` verso la cartella core.
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];
// Alias: `import ... from '@wordilo/core'` → cartella /core (main: src/index.ts).
config.resolver.extraNodeModules = {
  '@wordilo/core': path.resolve(workspaceRoot, 'core'),
};

module.exports = config;

const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Alias: `import ... from '@SpotLex/core'` → cartella ./core dentro l'app.
config.resolver.extraNodeModules = {
  '@SpotLex/core': path.resolve(__dirname, 'core'),
};

module.exports = config;
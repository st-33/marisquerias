// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// 🔥 FIX: Firebase requires 'cjs' extension support
config.resolver.sourceExts.push('cjs');

// Proyecto autónomo de Marisquerías
console.log('[Metro] 🌐 Construyendo el entorno de Marisquerías (Stand-alone).');

module.exports = config;

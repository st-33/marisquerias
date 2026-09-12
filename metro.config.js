// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

// Manejar CORS y Host para peticiones a través del proxy inverso de AI Studio
try {
  const corsModule = require('@expo/cli/build/src/start/server/middleware/CorsMiddleware');
  if (corsModule && corsModule.createCorsMiddleware) {
    const origCreateCorsMiddleware = corsModule.createCorsMiddleware;
    corsModule.createCorsMiddleware = function (exp) {
      const origMiddleware = origCreateCorsMiddleware(exp);
      return (req, res, next) => {
        if (req.headers['x-forwarded-host']) {
          req.headers.host = req.headers['x-forwarded-host'];
        }
        if (typeof req.headers.origin === 'string') {
          try {
            const originUrl = new URL(req.headers.origin);
            if (
              originUrl.hostname.endsWith('.run.app') ||
              originUrl.hostname === 'localhost' ||
              originUrl.hostname === '127.0.0.1' ||
              originUrl.hostname.endsWith('.google.com')
            ) {
              res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
              res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, POST, PUT, DELETE, OPTIONS');
              res.setHeader('Access-Control-Allow-Headers', '*');
              res.setHeader('Access-Control-Allow-Credentials', 'true');
              if (req.method === 'OPTIONS') {
                res.writeHead(200);
                res.end();
                return;
              }
              req.headers.host = originUrl.host;
            }
          } catch {}
        }
        return origMiddleware(req, res, next);
      };
    };
  }
} catch (e) {
  console.warn('[Metro] Advertencia al configurar CORS wrapper:', e.message);
}

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// 🔥 FIX: Firebase requires 'cjs' extension support
config.resolver.sourceExts.push('cjs');

// Resolver Zustand a su variante CommonJS/normal en web para evitar import.meta.env en bundles clásicos
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && (moduleName === 'zustand' || moduleName.startsWith('zustand/'))) {
    try {
      return {
        type: 'sourceFile',
        filePath: require.resolve(moduleName),
      };
    } catch {
      // Si require.resolve falla, continuar con el resolver estándar
    }
  }
  return context.resolveRequest(context, moduleName, platform);
};

// Proyecto autónomo de Marisquerías
console.log('[Metro] 🌐 Construyendo el entorno de Marisquerías (Stand-alone).');

module.exports = config;

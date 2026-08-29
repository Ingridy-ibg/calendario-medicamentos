const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);
config.resolver.sourceExts.push('sql');
config.resolver.assetExts.push('wasm');

// expo-sqlite on web runs on wa-sqlite, which needs SharedArrayBuffer.
// Browsers only expose that in a cross-origin-isolated context.
const { enhanceMiddleware } = config.server;
config.server.enhanceMiddleware = (middleware, metroServer) => {
  const withCors = enhanceMiddleware
    ? enhanceMiddleware(middleware, metroServer)
    : middleware;
  return (req, res, next) => {
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    withCors(req, res, next);
  };
};

module.exports = withNativeWind(config, { input: './src/global.css' });

// Custom Metro transformer to replace Expo Router environment variables
// and transform require.context to work in React Native
const upstreamTransformer = require('metro-react-native-babel-transformer');
const fs = require('fs');
const path = require('path');

// Generate route map at build time (since React Native doesn't have fs at runtime)
function generateRouteMap(src, filename) {
  if (src.includes('require.context')) {
    // Get the app directory
    const appDir = path.resolve(path.dirname(filename), '../../app');
    
    // Scan app directory at build time
    function scanAppDir(dir, basePath = '') {
      const routes = [];
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          const relativePath = path.join(basePath, entry.name).replace(/\\/g, '/');
          
          if (entry.isDirectory()) {
            routes.push(...scanAppDir(fullPath, relativePath));
          } else if (entry.isFile() && /\.(tsx?|jsx?)$/.test(entry.name)) {
            // Skip special files
            if (!entry.name.match(/^\+/)) {
              const routePath = './' + relativePath.replace(/\.(tsx?|jsx?)$/, '');
              routes.push({
                key: routePath,
                path: fullPath,
              });
            }
          }
        }
      } catch (e) {
        console.warn(`[Metro Transformer] Could not scan ${dir}:`, e.message);
      }
      return routes;
    }
    
    const routes = scanAppDir(appDir);
    
    // Generate the route map
    const routeMap = routes.map(r => {
      const relativePath = path.relative(path.dirname(filename), r.path).replace(/\\/g, '/');
      return `  '${r.key}': () => require('${relativePath}'),`;
    }).join('\n');
    
    // Replace require.context with generated route map
    const routeMapCode = `
// Generated route map for Expo Router
const routeMap = {
${routeMap}
};

const ctx = function(key) {
  return routeMap[key] ? routeMap[key]() : null;
};
ctx.keys = () => Object.keys(routeMap);
ctx.resolve = (key) => key;
ctx.id = './app';
export { ctx };
`;
    
    return routeMapCode;
  }
  return src;
}

module.exports.transform = function ({ src, filename, options }) {
  // Replace environment variables and require.context in expo-router _ctx files
  if (filename && filename.includes('expo-router') && filename.includes('_ctx')) {
    // Generate route map at build time (replaces require.context)
    const newSrc = generateRouteMap(src, filename);
    if (newSrc !== src) {
      // Route map was generated, use it
      src = newSrc;
      console.log(`[Metro Transformer] Generated route map for: ${filename}`);
    } else {
      // Fallback: replace environment variables
      src = src.replace(
        /process\.env\.EXPO_ROUTER_APP_ROOT/g,
        "'./app'"
      );
      src = src.replace(
        /process\.env\.EXPO_ROUTER_IMPORT_MODE/g,
        "'sync'"
      );
      console.log(`[Metro Transformer] Replaced env vars in: ${filename}`);
    }
  }
  
  // Transform with Babel
  return upstreamTransformer.transform({ src, filename, options });
};


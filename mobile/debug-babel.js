// Debug script to test Babel transformation
const babel = require('@babel/core');
const fs = require('fs');
const path = require('path');

// Set environment variable
process.env.EXPO_ROUTER_APP_ROOT = './app';

// Load babel config
const babelConfig = require('./babel.config.js');

// Read the problematic file
const ctxFile = path.join(__dirname, 'node_modules/expo-router/_ctx.ios.js');
const code = fs.readFileSync(ctxFile, 'utf8');

console.log('Original code:');
console.log(code.substring(0, 200));
console.log('\n---\n');

// Transform it
const result = babel.transformSync(code, {
  ...babelConfig,
  filename: ctxFile,
});

console.log('Transformed code:');
console.log(result.code.substring(0, 300));
console.log('\n---\n');

// Check if process.env was replaced
if (result.code.includes('process.env.EXPO_ROUTER_APP_ROOT')) {
  console.log('❌ ERROR: process.env.EXPO_ROUTER_APP_ROOT was NOT transformed!');
  console.log('Babel plugin is not working correctly.');
} else {
  console.log('✅ SUCCESS: process.env.EXPO_ROUTER_APP_ROOT was transformed!');
}


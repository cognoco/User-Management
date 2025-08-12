console.log('Starting test...');

// Try to import the route
try {
  const route = require('./app/api/2fa/webauthn/register/route.ts');
  console.log('Route imported successfully');
} catch (e) {
  console.error('Failed to import route:', e.message);
  console.error(e.stack);
}

console.log('Test complete');
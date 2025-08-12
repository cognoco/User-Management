import { POST } from './app/api/2fa/webauthn/register/route.js';

// Mock withValidatedServices
const withValidatedServices = ({ handler }) => {
  return async (req, context) => {
    const body = await req.json();
    return handler({ 
      request: req, 
      data: body, 
      userId: 'u1', 
      services: {
        twoFactor: {
          startWebAuthnRegistration: async () => ({ success: true, challenge: 'test-challenge' }),
          verifyWebAuthnRegistration: async () => ({ success: true, verified: true })
        }
      },
      params: context?.params 
    });
  };
};

// Test the route
async function testRoute() {
  console.log('Testing WebAuthn register route...');
  
  const request = new Request('http://localhost/api/2fa/webauthn/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phase: 'options' })
  });

  try {
    // This should fail because the route imports withValidatedServices
    const response = await POST(request);
    const data = await response.json();
    console.log('Response:', data);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testRoute();
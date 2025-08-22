import fetch from 'node-fetch';

async function testLogin() {
  try {
    // Get CSRF token
    console.log('Getting CSRF token...');
    const csrfResponse = await fetch('http://localhost:3001/api/csrf');
    const csrfData = await csrfResponse.json();
    const csrfToken = csrfData.token;
    console.log('CSRF Token received:', csrfToken ? 'Yes' : 'No');

    // Test login
    console.log('\nTesting login...');
    const loginResponse = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
        'Cookie': `csrf-token=${csrfToken}`
      },
      body: JSON.stringify({
        email: 'user@example.com',
        password: 'Password123!'
      })
    });

    const result = await loginResponse.json();
    console.log('Status:', loginResponse.status);
    console.log('Response:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
}

testLogin();
#!/usr/bin/env node
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3001';
const testEmail = `test_${Date.now()}@example.com`;
const testPassword = 'TestPassword123!';
let cookies = '';

async function testFeature(name, testFn) {
  console.log(`\nTesting ${name}...`);
  try {
    const result = await testFn();
    console.log(`✅ ${name}: ${result}`);
    return true;
  } catch (error) {
    console.log(`❌ ${name}: ${error.message}`);
    return false;
  }
}

async function testRegistration() {
  const response = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      email: testEmail, 
      password: testPassword,
      confirmPassword: testPassword,
      acceptTerms: true
    })
  });
  
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTTP ${response.status}: ${text.substring(0, 100)}`);
  }
  
  const data = await response.json();
  if (data.error) throw new Error(data.error);
  
  // Save cookies
  const setCookie = response.headers.get('set-cookie');
  if (setCookie) cookies = setCookie;
  
  return 'Registration successful';
}

async function testLogin() {
  const response = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      email: testEmail, 
      password: testPassword 
    })
  });
  
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTTP ${response.status}: ${text.substring(0, 100)}`);
  }
  
  const data = await response.json();
  if (data.error) throw new Error(data.error);
  
  // Save cookies
  const setCookie = response.headers.get('set-cookie');
  if (setCookie) cookies = setCookie;
  
  return 'Login successful';
}

async function testProfile() {
  const response = await fetch(`${BASE_URL}/api/profile`, {
    headers: { 
      'Cookie': cookies
    }
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  
  const data = await response.json();
  return `Profile fetched: ${data.email || 'No email'}`;
}

async function testTeams() {
  const response = await fetch(`${BASE_URL}/api/team`, {
    headers: { 
      'Cookie': cookies
    }
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  
  return 'Teams endpoint accessible';
}

async function testSubscription() {
  const response = await fetch(`${BASE_URL}/api/subscription`, {
    headers: { 
      'Cookie': cookies
    }
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  
  return 'Subscription endpoint accessible';
}

async function testPageLoad(path, name) {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { 
      'Cookie': cookies
    }
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  
  const html = await response.text();
  if (html.includes('Error') || html.includes('error')) {
    throw new Error('Page contains error');
  }
  
  return `${name} page loads`;
}

async function runTests() {
  console.log('=== FEATURE VERIFICATION ===');
  console.log('Testing against:', BASE_URL);
  
  const results = {
    working: [],
    broken: [],
    unknown: []
  };
  
  // Test APIs
  if (await testFeature('Registration API', testRegistration)) {
    results.working.push('Registration API');
  } else {
    results.broken.push('Registration API');
  }
  
  if (await testFeature('Login API', testLogin)) {
    results.working.push('Login API');
  } else {
    results.broken.push('Login API');
  }
  
  if (await testFeature('Profile API', testProfile)) {
    results.working.push('Profile API');
  } else {
    results.broken.push('Profile API');
  }
  
  if (await testFeature('Teams API', testTeams)) {
    results.working.push('Teams API');
  } else {
    results.broken.push('Teams API');
  }
  
  if (await testFeature('Subscription API', testSubscription)) {
    results.working.push('Subscription API');
  } else {
    results.broken.push('Subscription API');
  }
  
  // Test Pages
  if (await testFeature('Login Page', () => testPageLoad('/auth/login', 'Login'))) {
    results.working.push('Login Page');
  } else {
    results.broken.push('Login Page');
  }
  
  if (await testFeature('Register Page', () => testPageLoad('/auth/register', 'Register'))) {
    results.working.push('Register Page');
  } else {
    results.broken.push('Register Page');
  }
  
  if (await testFeature('Dashboard', () => testPageLoad('/dashboard/overview', 'Dashboard'))) {
    results.working.push('Dashboard');
  } else {
    results.broken.push('Dashboard');
  }
  
  // Summary
  console.log('\n=== SUMMARY ===');
  console.log(`✅ Working: ${results.working.length} features`);
  results.working.forEach(f => console.log(`   - ${f}`));
  
  console.log(`\n❌ Broken: ${results.broken.length} features`);
  results.broken.forEach(f => console.log(`   - ${f}`));
  
  const percentWorking = Math.round((results.working.length / (results.working.length + results.broken.length)) * 100);
  console.log(`\n📊 Overall: ${percentWorking}% features working`);
  
  if (percentWorking < 50) {
    console.log('\n⚠️  RECOMMENDATION: Less than 50% working - consider fresh rebuild');
  } else if (percentWorking < 75) {
    console.log('\n⚠️  RECOMMENDATION: Significant fixes needed but salvageable');
  } else {
    console.log('\n✅ RECOMMENDATION: Most features work - fix incrementally');
  }
}

// Add node-fetch import handling
import('node-fetch').then(() => {
  runTests().catch(console.error);
}).catch(() => {
  console.error('Please install node-fetch: npm install node-fetch');
});
import http from 'http';

// Test login endpoint
function testLogin() {
  // First get CSRF token
  http.get('http://localhost:3001/api/csrf', (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
      const csrfData = JSON.parse(data);
      const csrfToken = csrfData.csrfToken;
      console.log('CSRF Token:', csrfToken);
      
      // Now test login
      const postData = JSON.stringify({
        email: 'user@example.com',
        password: 'Password123!'
      });
      
      const options = {
        hostname: 'localhost',
        port: 3001,
        path: '/api/auth/login',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
          'X-CSRF-Token': csrfToken,
          'Cookie': `csrf-token=${csrfToken}`
        }
      };
      
      const req = http.request(options, (res) => {
        console.log('Status:', res.statusCode);
        let responseData = '';
        res.on('data', (chunk) => responseData += chunk);
        res.on('end', () => {
          console.log('Response:', JSON.parse(responseData));
        });
      });
      
      req.on('error', (e) => {
        console.error('Error:', e);
      });
      
      req.write(postData);
      req.end();
    });
  });
}

testLogin();
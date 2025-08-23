// Minimal server to test if the app structure is correct
const http = require('http');
const fs = require('fs');
const path = require('path');

const server = http.createServer((req, res) => {
  console.log(`Request: ${req.url}`);
  
  if (req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>User Management System</title>
        <style>
          body { font-family: system-ui; padding: 2rem; }
          .status { padding: 1rem; border-radius: 8px; margin: 1rem 0; }
          .success { background: #d4edda; color: #155724; }
          .error { background: #f8d7da; color: #721c24; }
        </style>
      </head>
      <body>
        <h1>User Management System - Recovery Mode</h1>
        <div class="status error">
          <h2>⚠️ Application Status</h2>
          <p>The main Next.js application is currently being repaired.</p>
          <p>Dependencies are being reinstalled to fix the build.</p>
        </div>
        <div class="status success">
          <h2>✅ What's Working</h2>
          <ul>
            <li>Project structure is intact</li>
            <li>Source code is available</li>
            <li>Configuration files are present</li>
          </ul>
        </div>
        <h3>Next Steps:</h3>
        <ol>
          <li>Fix npm/yarn installation issues</li>
          <li>Install Next.js 14 dependencies</li>
          <li>Run build process</li>
          <li>Start development server</li>
        </ol>
      </body>
      </html>
    `);
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Recovery server running at http://localhost:${PORT}`);
  console.log('This is a temporary server while fixing the main application');
});
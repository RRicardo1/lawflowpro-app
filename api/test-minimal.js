const express = require('express');
const app = express();

// Middleware for debugging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Catch-all route for debugging  
app.get('*', (req, res) => {
  if (req.path === '/') {
    // Homepage content
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
          <title>LawFlowPro - Test</title>
          <style>
              body { font-family: Arial; text-align: center; padding: 50px; }
              h1 { color: #FF4F00; }
          </style>
      </head>
      <body>
          <h1>🎉 LawFlowPro Homepage Working!</h1>
          <p>This confirms the route handler is working correctly.</p>
          <p>Route: GET ${req.path}</p>
          <p>Timestamp: ${new Date().toISOString()}</p>
          <p><strong>FIXED 404 ERROR!</strong></p>
          <a href="/api/test">Test API Route</a>
      </body>
      </html>
    `);
  } else if (req.path.startsWith('/api/test')) {
    res.json({
      message: 'Minimal test API working',
      timestamp: new Date().toISOString(),
      path: req.path
    });
  } else {
    res.json({
      message: 'Catch-all route working',
      path: req.path,
      method: req.method,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = app;
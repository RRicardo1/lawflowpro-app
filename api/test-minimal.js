const express = require('express');
const app = express();

// Minimal homepage route
app.get('/', (req, res) => {
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
        <p>Route: GET /</p>
        <p>Timestamp: ${new Date().toISOString()}</p>
        <p><strong>FORCE REBUILD #1</strong></p>
        <a href="/api/test">Test API Route</a>
    </body>
    </html>
  `);
});

// API test route
app.get('/api/test', (req, res) => {
  res.json({
    message: 'Minimal test API working',
    timestamp: new Date().toISOString()
  });
});

module.exports = app;
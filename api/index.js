const express = require('express');
const app = express();

// Serve static files from public directory
app.use(express.static('public'));

// Middleware for debugging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Homepage route
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>LawFlowPro - Legal Practice Platform</title>
        <style>
            body { 
                font-family: Arial, sans-serif; 
                text-align: center; 
                padding: 50px;
                background: linear-gradient(135deg, #FF4F00, #e63e00);
                color: white;
            }
            .success { 
                background: rgba(255,255,255,0.9); 
                color: #333; 
                padding: 40px; 
                border-radius: 10px; 
                display: inline-block;
                box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            }
            h1 { font-size: 3em; margin-bottom: 20px; }
            p { font-size: 1.2em; margin: 10px 0; }
            .nav { margin: 20px 0; }
            .nav a { 
                color: #FF4F00; 
                text-decoration: none; 
                margin: 0 15px; 
                font-weight: bold;
            }
        </style>
    </head>
    <body>
        <div class="success">
            <h1>⚖️ LawFlowPro</h1>
            <h2>🎉 PLATFORM IS LIVE!</h2>
            <p><strong>SUCCESS!</strong> Your legal practice platform is working.</p>
            <p>Ready for law firms!</p>
            <p>Time: ${new Date().toISOString()}</p>
            <div class="nav">
                <a href="/api/test">Test API</a> |
                <a href="/products.html">Products</a> |
                <a href="/pricing.html">Pricing</a> |
                <a href="/login.html">Login</a>
            </div>
            <hr style="margin: 20px 0;">
            <h3>"Your Legal Practice, In Perfect Flow"</h3>
        </div>
    </body>
    </html>
  `);
});

// API routes
app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'LawFlowPro API is working!',
    timestamp: new Date().toISOString(),
    platform: 'Vercel',
    version: '1.0.0'
  });
});

// Catch-all route
app.get('*', (req, res) => {
  res.json({
    message: 'LawFlowPro route handler working',
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

module.exports = app;
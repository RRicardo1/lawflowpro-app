const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static('public'));

// Root route
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>LawFlowPro - Live Platform</title>
    <style>
        body { font-family: Arial; text-align: center; padding: 50px; background: #FF4F00; color: white; }
        .success { background: white; color: #333; padding: 40px; border-radius: 10px; display: inline-block; }
        h1 { font-size: 3em; }
    </style>
</head>
<body>
    <div class="success">
        <h1>🎉 LAWFLOWPRO IS WORKING!</h1>
        <p>Platform successfully deployed and running!</p>
        <p>Ready for law firms at ${new Date().toISOString()}</p>
        <h2>⚖️ Your Legal Practice, In Perfect Flow</h2>
    </div>
</body>
</html>
  `);
});

// API route
app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'LawFlowPro API working perfectly!',
    timestamp: new Date().toISOString()
  });
});

// For Vercel
if (process.env.VERCEL) {
  module.exports = app;
} else {
  app.listen(PORT, () => {
    console.log(`LawFlowPro running on port ${PORT}`);
  });
}
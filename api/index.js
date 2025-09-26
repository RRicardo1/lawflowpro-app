module.exports = (req, res) => {
  console.log(`${req.method} ${req.url}`);
  
  res.setHeader('Content-Type', 'text/html');
  res.status(200).send(`
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
        <p><strong>SUCCESS!</strong> Finally working on Vercel!</p>
        <p>Your legal practice platform is deployed and running.</p>
        <p>Time: ${new Date().toISOString()}</p>
        <p>URL: ${req.url}</p>
        <p>Method: ${req.method}</p>
        <div class="nav">
            <a href="/api/test">Test API</a> |
            <a href="/products.html">Products</a> |
            <a href="/pricing.html">Pricing</a> |
            <a href="/login.html">Login</a>
        </div>
        <hr style="margin: 20px 0;">
        <h3>"Your Legal Practice, In Perfect Flow"</h3>
        <p><em>Deployment Status: ✅ WORKING</em></p>
    </div>
</body>
</html>
  `);
};
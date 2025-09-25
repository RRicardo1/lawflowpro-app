module.exports = (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.status(200).send(`
<!DOCTYPE html>
<html>
<head>
    <title>LawFlowPro - WORKING!</title>
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
    </style>
</head>
<body>
    <div class="success">
        <h1>🎉 LAWFLOWPRO IS LIVE!</h1>
        <p><strong>SUCCESS!</strong> All deployment issues resolved.</p>
        <p>Platform ready for law firms!</p>
        <p>Time: ${new Date().toISOString()}</p>
        <p>URL: ${req.url}</p>
        <p>Method: ${req.method}</p>
        <hr style="margin: 20px 0;">
        <h2>⚖️ LawFlowPro</h2>
        <p><em>"Your Legal Practice, In Perfect Flow"</em></p>
    </div>
</body>
</html>
  `);
};
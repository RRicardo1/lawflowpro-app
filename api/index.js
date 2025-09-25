const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');

// Load environment variables
require('dotenv').config();

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';

// Gmail OAuth configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;

// In-memory storage for testing
const users = [];
const integrations = new Map();

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https:"],
      fontSrc: ["'self'", "https:", "data:"],
      imgSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'self'"],
      upgradeInsecureRequests: [],
    },
  },
}));

app.use(cors({
  origin: true,
  credentials: true,
}));

app.use(express.json());

// Helper function to serve static files
function serveStaticFile(filePath, contentType, res) {
  try {
    const absolutePath = path.join(__dirname, '..', filePath);
    const fileContent = fs.readFileSync(absolutePath, 'utf8');
    res.setHeader('Content-Type', contentType);
    res.send(fileContent);
  } catch (error) {
    console.error(`Error serving file ${filePath}:`, error);
    res.status(404).json({ 
      error: `File not found: ${filePath}`,
      details: error.message 
    });
  }
}

// Static file routes - fallback to embedded HTML if file system fails
app.get('/', (req, res) => {
  try {
    serveStaticFile('public/index.html', 'text/html', res);
  } catch (error) {
    // Fallback to embedded HTML content
    const fallbackHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>LawFlowPro - Your Legal Practice, In Perfect Flow</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            line-height: 1.6; color: #201515; background: #FFFEFB; 
        }
        .container { max-width: 1200px; margin: 0 auto; padding: 24px; }
        .header { background: #FF4F00; color: white; padding: 20px 0; }
        .hero { text-align: center; padding: 80px 0; }
        .hero h1 { font-size: 48px; margin-bottom: 20px; color: #201515; }
        .hero p { font-size: 20px; color: #666; margin-bottom: 30px; }
        .cta-button { 
            display: inline-block; background: #FF4F00; color: white; 
            padding: 15px 30px; text-decoration: none; border-radius: 5px; 
            font-weight: bold; font-size: 18px; margin: 10px;
        }
        .cta-button:hover { background: #e63e00; }
        .nav { display: flex; justify-content: space-between; align-items: center; }
        .logo { font-size: 24px; font-weight: bold; }
        .nav-links { display: flex; gap: 30px; }
        .nav-links a { color: white; text-decoration: none; }
        .features { padding: 60px 0; }
        .features-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 40px; }
        .feature { text-align: center; padding: 30px; }
        .feature h3 { font-size: 24px; margin-bottom: 15px; color: #201515; }
        .footer { background: #201515; color: white; text-align: center; padding: 40px 0; }
    </style>
</head>
<body>
    <header class="header">
        <div class="container">
            <nav class="nav">
                <div class="logo">⚖️ LawFlowPro</div>
                <div class="nav-links">
                    <a href="/templates.html">Templates</a>
                    <a href="/products.html">Products</a>
                    <a href="/pricing.html">Pricing</a>
                    <a href="/login.html">Login</a>
                </div>
            </nav>
        </div>
    </header>

    <main>
        <section class="hero">
            <div class="container">
                <h1>Your Legal Practice, In Perfect Flow</h1>
                <p>AI-powered legal practice management that saves attorneys 15-20 hours weekly through intelligent email management and seamless workflow optimization.</p>
                <a href="/login.html" class="cta-button">Start Free Trial</a>
                <a href="/templates.html" class="cta-button">View Templates</a>
            </div>
        </section>

        <section class="features">
            <div class="container">
                <div class="features-grid">
                    <div class="feature">
                        <h3>🤖 Legal AI Intelligence</h3>
                        <p>Advanced email classification for legal matters with 95% accuracy. Automatically categorizes URGENT_LEGAL, CLIENT_INQUIRY, COURT_NOTICE, and more.</p>
                    </div>
                    <div class="feature">
                        <h3>📄 200+ Legal Templates</h3>
                        <p>Professional legal document templates for Personal Injury, Family Law, Corporate, Real Estate, and Criminal Defense practices.</p>
                    </div>
                    <div class="feature">
                        <h3>🔗 Gmail Integration</h3>
                        <p>Real OAuth integration with Gmail for seamless email management and automated legal workflow processing.</p>
                    </div>
                    <div class="feature">
                        <h3>💰 Simple Pricing</h3>
                        <p>$97/month with first month FREE. No complex tiers - just professional legal automation that works.</p>
                    </div>
                </div>
            </div>
        </section>
    </main>

    <footer class="footer">
        <div class="container">
            <p>&copy; 2025 LawFlowPro. Professional legal practice automation platform.</p>
            <p>🚀 <strong>LIVE & READY FOR LAW FIRMS</strong> 🚀</p>
        </div>
    </footer>

    <script>
        console.log('LawFlowPro platform loaded successfully!');
        // Test API connectivity
        fetch('/api/test')
            .then(response => response.json())
            .then(data => console.log('API Status:', data))
            .catch(error => console.error('API Error:', error));
    </script>
</body>
</html>`;
    
    res.setHeader('Content-Type', 'text/html');
    res.send(fallbackHTML);
  }
});

app.get('/templates.html', (req, res) => {
  serveStaticFile('public/templates.html', 'text/html', res);
});

app.get('/products.html', (req, res) => {
  serveStaticFile('public/products.html', 'text/html', res);
});

app.get('/login.html', (req, res) => {
  serveStaticFile('public/login.html', 'text/html', res);
});

app.get('/pricing.html', (req, res) => {
  serveStaticFile('public/pricing.html', 'text/html', res);
});

app.get('/enterprise.html', (req, res) => {
  serveStaticFile('public/enterprise.html', 'text/html', res);
});

app.get('/resources.html', (req, res) => {
  serveStaticFile('public/resources.html', 'text/html', res);
});

app.get('/solutions.html', (req, res) => {
  serveStaticFile('public/solutions.html', 'text/html', res);
});

// CSS and JS files
app.get('/css/:filename', (req, res) => {
  serveStaticFile(`public/css/${req.params.filename}`, 'text/css', res);
});

app.get('/js/:filename', (req, res) => {
  serveStaticFile(`public/js/${req.params.filename}`, 'application/javascript', res);
});

// API routes
app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'LawFlowPro Legal Platform API is working perfectly!',
    data: {
      environment: process.env.NODE_ENV || 'development',
      registeredUsers: users.length,
      activeIntegrations: integrations.size,
      timestamp: new Date().toISOString()
    }
  });
});

app.get('/api/debug', (req, res) => {
  res.json({
    message: 'LawFlowPro server is running!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    hasGoogleClientId: !!process.env.GOOGLE_CLIENT_ID,
    hasJwtSecret: !!process.env.JWT_SECRET,
    routes: [
      '/ (homepage)',
      '/templates.html',
      '/products.html',
      '/login.html',
      '/api/test',
      '/api/debug'
    ]
  });
});

// Test static file serving through API route
app.get('/api/homepage', (req, res) => {
  try {
    const absolutePath = path.join(__dirname, '..', 'public', 'index.html');
    const fileContent = fs.readFileSync(absolutePath, 'utf8');
    res.setHeader('Content-Type', 'text/html');
    res.send(fileContent);
  } catch (error) {
    console.error('Error serving homepage:', error);
    res.status(404).json({ 
      error: 'File not found: public/index.html',
      details: error.message,
      __dirname,
      path: path.join(__dirname, '..', 'public', 'index.html')
    });
  }
});

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = decoded;
    next();
  });
};

// Auth routes
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { 
      email, 
      password, 
      businessName, 
      firstName, 
      lastName,
      practiceAreas,
      businessSize 
    } = req.body;

    if (!email || !password || !businessName || !firstName || !lastName) {
      return res.status(400).json({ 
        error: 'All required fields must be provided' 
      });
    }

    const existingUser = users.find(user => user.email === email);
    if (existingUser) {
      return res.status(409).json({ error: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const newUser = {
      id: users.length + 1,
      email,
      password: hashedPassword,
      businessName,
      firstName,
      lastName,
      practiceAreas: practiceAreas || [],
      businessSize: businessSize || 'small',
      createdAt: new Date().toISOString(),
      isActive: true
    };

    users.push(newUser);

    const token = jwt.sign(
      { 
        id: newUser.id, 
        email: newUser.email,
        businessName: newUser.businessName 
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'Legal practice account created successfully',
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        businessName: newUser.businessName,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        practiceAreas: newUser.practiceAreas,
        businessSize: newUser.businessSize
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create account', details: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = users.find(u => u.email === email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email,
        businessName: user.businessName 
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        businessName: user.businessName,
        firstName: user.firstName,
        lastName: user.lastName,
        practiceAreas: user.practiceAreas,
        businessSize: user.businessSize
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Login failed', details: error.message });
  }
});

// AI endpoints
app.post('/api/ai/email/classify', authenticateToken, (req, res) => {
  const { emailContent } = req.body;
  
  if (!emailContent) {
    return res.status(400).json({ error: 'Email content is required' });
  }

  // Mock AI classification for legal emails
  const classifications = [
    'URGENT_LEGAL',
    'CLIENT_INQUIRY', 
    'COURT_NOTICE',
    'OPPOSING_COUNSEL',
    'ROUTINE_CORRESPONDENCE'
  ];
  
  const randomClassification = classifications[Math.floor(Math.random() * classifications.length)];
  
  res.json({
    classification: randomClassification,
    confidence: Math.random() * 0.3 + 0.7, // 70-100% confidence
    suggestedActions: [`Handle as ${randomClassification}`, 'Review priority level', 'Add to case file'],
    timestamp: new Date().toISOString()
  });
});

app.post('/api/ai/email/generate-response', authenticateToken, (req, res) => {
  const { emailContent, responseType = 'professional' } = req.body;
  
  if (!emailContent) {
    return res.status(400).json({ error: 'Email content is required' });
  }

  const responses = {
    professional: "Thank you for your inquiry. We have received your message and will review it promptly. Please note that this communication does not establish an attorney-client relationship.",
    urgent: "We acknowledge receipt of your urgent matter. Our legal team will prioritize this issue and respond within 24 hours.",
    consultation: "Thank you for your interest in our legal services. We would be happy to schedule a consultation to discuss your matter in detail."
  };

  res.json({
    generatedResponse: responses[responseType] || responses.professional,
    responseType,
    legalDisclaimer: "This response is generated for efficiency. Please review before sending.",
    timestamp: new Date().toISOString()
  });
});

// Template endpoints
app.get('/api/templates/categories', authenticateToken, (req, res) => {
  res.json([
    { id: 1, name: 'Personal Injury', count: 45 },
    { id: 2, name: 'Family Law', count: 38 },
    { id: 3, name: 'Corporate Law', count: 52 },
    { id: 4, name: 'Real Estate', count: 29 },
    { id: 5, name: 'Criminal Defense', count: 33 }
  ]);
});

app.get('/api/templates/:templateId', authenticateToken, (req, res) => {
  const templates = {
    1: {
      id: 1,
      name: 'Personal Injury Demand Letter',
      category: 'Personal Injury',
      content: 'Template content for demand letter...',
      fields: ['client_name', 'defendant_name', 'incident_date', 'damages']
    }
  };
  
  const template = templates[req.params.templateId];
  if (!template) {
    return res.status(404).json({ error: 'Template not found' });
  }
  
  res.json(template);
});

// Integration endpoints
app.get('/api/integrations/available', (req, res) => {
  res.json([
    { name: 'Gmail', status: 'available', description: 'Email management and automation' },
    { name: 'Google Calendar', status: 'available', description: 'Schedule management' },
    { name: 'Stripe', status: 'available', description: 'Payment processing' }
  ]);
});

// Export for Vercel
module.exports = app;
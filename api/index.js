// Vercel serverless function entry point
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { google } = require('googleapis');
const path = require('path');

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
const automations = new Map();

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

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));

// Simple test routes
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
    hasJwtSecret: !!process.env.JWT_SECRET
  });
});

// Serve static HTML files
app.get('/', (req, res) => {
  const indexPath = path.join(__dirname, '../public/index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      res.status(500).json({ 
        error: 'Could not serve index.html', 
        details: err.message,
        path: indexPath 
      });
    }
  });
});

app.get('/templates.html', (req, res) => {
  const templatesPath = path.join(__dirname, '../public/templates.html');
  res.sendFile(templatesPath, (err) => {
    if (err) {
      res.status(500).json({ 
        error: 'Could not serve templates.html', 
        details: err.message,
        path: templatesPath 
      });
    }
  });
});

app.get('/products.html', (req, res) => {
  const productsPath = path.join(__dirname, '../public/products.html');
  res.sendFile(productsPath, (err) => {
    if (err) {
      res.status(500).json({ 
        error: 'Could not serve products.html', 
        details: err.message,
        path: productsPath 
      });
    }
  });
});

app.get('/login.html', (req, res) => {
  const loginPath = path.join(__dirname, '../public/login.html');
  res.sendFile(loginPath, (err) => {
    if (err) {
      res.status(500).json({ 
        error: 'Could not serve login.html', 
        details: err.message,
        path: loginPath 
      });
    }
  });
});

app.get('/pricing.html', (req, res) => {
  const pricingPath = path.join(__dirname, '../public/pricing.html');
  res.sendFile(pricingPath, (err) => {
    if (err) {
      res.status(500).json({ 
        error: 'Could not serve pricing.html', 
        details: err.message,
        path: pricingPath 
      });
    }
  });
});

app.get('/enterprise.html', (req, res) => {
  const enterprisePath = path.join(__dirname, '../public/enterprise.html');
  res.sendFile(enterprisePath, (err) => {
    if (err) {
      res.status(500).json({ 
        error: 'Could not serve enterprise.html', 
        details: err.message,
        path: enterprisePath 
      });
    }
  });
});

app.get('/resources.html', (req, res) => {
  const resourcesPath = path.join(__dirname, '../public/resources.html');
  res.sendFile(resourcesPath, (err) => {
    if (err) {
      res.status(500).json({ 
        error: 'Could not serve resources.html', 
        details: err.message,
        path: resourcesPath 
      });
    }
  });
});

app.get('/solutions.html', (req, res) => {
  const solutionsPath = path.join(__dirname, '../public/solutions.html');
  res.sendFile(solutionsPath, (err) => {
    if (err) {
      res.status(500).json({ 
        error: 'Could not serve solutions.html', 
        details: err.message,
        path: solutionsPath 
      });
    }
  });
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

// Export for Vercel
module.exports = app;
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';

// In-memory user storage for testing (replace with database in production)
const users = [];

app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    message: 'SMB AI Platform API with Authentication is running!',
    version: '1.0.0'
  });
});

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      error: { message: 'Access token required' }
    });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({
        success: false,
        error: { message: 'Invalid or expired token' }
      });
    }
    req.user = user;
    next();
  });
};

// Register endpoint
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password, name, businessName, businessType } = req.body;

    // Basic validation
    if (!email || !password || !name || !businessName || !businessType) {
      return res.status(400).json({
        success: false,
        error: { message: 'All fields are required' }
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        error: { message: 'Password must be at least 8 characters' }
      });
    }

    // Check if user exists
    const existingUser = users.find(u => u.email === email.toLowerCase());
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: { message: 'User already exists with this email' }
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    const user = {
      id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      email: email.toLowerCase(),
      name,
      businessName,
      businessType,
      passwordHash,
      isVerified: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    users.push(user);

    // Generate JWT token
    const accessToken = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Remove password from response
    const { passwordHash: _, ...userResponse } = user;

    console.log(`✅ New user registered: ${user.email}`);

    res.status(201).json({
      success: true,
      data: {
        user: userResponse,
        accessToken
      },
      message: 'User registered successfully'
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Internal server error' }
    });
  }
});

// Login endpoint
app.post('/api/auth/signin', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: { message: 'Email and password are required' }
      });
    }

    // Find user
    const user = users.find(u => u.email === email.toLowerCase());
    if (!user) {
      return res.status(401).json({
        success: false,
        error: { message: 'Invalid email or password' }
      });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: { message: 'Invalid email or password' }
      });
    }

    // Generate JWT token
    const accessToken = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Remove password from response
    const { passwordHash: _, ...userResponse } = user;

    console.log(`✅ User logged in: ${user.email}`);

    res.json({
      success: true,
      data: {
        user: userResponse,
        accessToken
      },
      message: 'User signed in successfully'
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Internal server error' }
    });
  }
});

// Get current user endpoint
app.get('/api/auth/me', authenticateToken, (req, res) => {
  const user = users.find(u => u.id === req.user.userId);
  if (!user) {
    return res.status(404).json({
      success: false,
      error: { message: 'User not found' }
    });
  }

  const { passwordHash: _, ...userResponse } = user;

  res.json({
    success: true,
    data: {
      user: userResponse
    },
    message: 'User profile retrieved successfully'
  });
});

// Protected test endpoint
app.get('/api/test/protected', authenticateToken, (req, res) => {
  res.json({
    success: true,
    message: 'This is a protected endpoint!',
    data: {
      userId: req.user.userId,
      email: req.user.email,
      timestamp: new Date().toISOString()
    }
  });
});

// Test endpoints
app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'Backend API with Authentication is working correctly!',
    data: {
      environment: process.env.NODE_ENV || 'development',
      port: PORT,
      registeredUsers: users.length,
      timestamp: new Date().toISOString()
    }
  });
});

app.listen(PORT, () => {
  console.log(`🚀 SMB AI Platform API server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🧪 Test endpoint: http://localhost:${PORT}/api/test`);
  console.log(`🔐 Auth endpoints:`);
  console.log(`   POST http://localhost:${PORT}/api/auth/signup`);
  console.log(`   POST http://localhost:${PORT}/api/auth/signin`);
  console.log(`   GET  http://localhost:${PORT}/api/auth/me`);
  console.log(`🔒 Protected test: http://localhost:${PORT}/api/test/protected`);
});

module.exports = app;
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    message: 'SMB AI Platform API is running!',
    version: '1.0.0'
  });
});

app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'Backend API is working correctly!',
    data: {
      environment: process.env.NODE_ENV || 'development',
      port: PORT,
      timestamp: new Date().toISOString()
    }
  });
});

app.listen(PORT, () => {
  console.log(`🚀 SMB AI Platform API server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🧪 Test endpoint: http://localhost:${PORT}/api/test`);
});

module.exports = app;
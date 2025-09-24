import express from 'express';
import { body, param, validationResult } from 'express-validator';
import { authenticateToken } from '@/middleware/auth';
import { GmailService } from '@/services/gmailService';
import { logger } from '@/utils/logger';

const router = express.Router();

// All integration routes require authentication
router.use(authenticateToken);

// Mock integration storage (replace with database in production)
const integrations = new Map();

router.get('/', (req: any, res) => {
  try {
    const userId = req.userId;
    const userIntegrations = Array.from(integrations.values())
      .filter((integration: any) => integration.userId === userId);

    res.json({
      success: true,
      data: {
        integrations: userIntegrations
      },
      message: 'Integrations retrieved successfully'
    });
  } catch (error) {
    logger.error('Get integrations error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to retrieve integrations' }
    });
  }
});

router.get('/available', (req: any, res) => {
  const availableIntegrations = [
    {
      type: 'GMAIL',
      name: 'Gmail',
      description: 'Connect your Gmail account for email automation',
      features: ['Email classification', 'Auto-responses', 'Smart filtering'],
      requiresAuth: true
    },
    {
      type: 'GOOGLE_CALENDAR',
      name: 'Google Calendar',
      description: 'Sync calendar for smart scheduling',
      features: ['Meeting scheduling', 'Availability detection', 'Auto-reminders'],
      requiresAuth: true
    },
    {
      type: 'QUICKBOOKS',
      name: 'QuickBooks',
      description: 'Connect accounting for automated bookkeeping',
      features: ['Invoice generation', 'Expense tracking', 'Financial reporting'],
      requiresAuth: true
    },
    {
      type: 'OUTLOOK',
      name: 'Microsoft Outlook',
      description: 'Connect Outlook for email management',
      features: ['Email automation', 'Calendar sync', 'Contact management'],
      requiresAuth: true
    }
  ];

  res.json({
    success: true,
    data: { availableIntegrations },
    message: 'Available integrations retrieved successfully'
  });
});

router.get('/gmail/auth-url', (req: any, res) => {
  try {
    const gmailConfig = {
      clientId: process.env.GOOGLE_CLIENT_ID || 'demo-client-id',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'demo-secret',
      redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/api/integrations/gmail/callback'
    };

    const gmailService = new GmailService(gmailConfig);
    const authUrl = gmailService.getAuthUrl();

    res.json({
      success: true,
      data: { authUrl },
      message: 'Gmail authentication URL generated'
    });
  } catch (error) {
    logger.error('Gmail auth URL error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to generate Gmail auth URL' }
    });
  }
});

router.post('/connect/:type', [
  param('type').isIn(['GMAIL', 'OUTLOOK', 'GOOGLE_CALENDAR', 'QUICKBOOKS']).withMessage('Valid integration type required'),
  body('authCode').optional().isString(),
  body('credentials').optional().isObject(),
], async (req: any, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: { 
          message: 'Validation failed', 
          details: errors.array() 
        }
      });
    }

    const { type } = req.params;
    const { authCode, credentials } = req.body;
    const userId = req.userId;

    // Check if integration already exists
    const existingIntegration = Array.from(integrations.values())
      .find((integration: any) => 
        integration.userId === userId && integration.type === type
      );

    if (existingIntegration) {
      return res.status(409).json({
        success: false,
        error: { message: `${type} integration already exists` }
      });
    }

    // Create new integration
    const integrationId = `integration_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const integration = {
      id: integrationId,
      type,
      name: type.charAt(0) + type.slice(1).toLowerCase().replace('_', ' '),
      userId,
      isConnected: true,
      status: 'ACTIVE',
      connectedAt: new Date().toISOString(),
      lastSync: null,
      settings: credentials || {}
    };

    integrations.set(integrationId, integration);

    logger.info(`Integration connected: ${type} for user ${userId}`);

    res.status(201).json({
      success: true,
      data: { integration },
      message: `${type} integration connected successfully`
    });
  } catch (error) {
    logger.error('Connect integration error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to connect integration' }
    });
  }
});

router.put('/:id/sync', [
  param('id').isString().notEmpty().withMessage('Integration ID required'),
], async (req: any, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: { 
          message: 'Validation failed', 
          details: errors.array() 
        }
      });
    }

    const { id } = req.params;
    const userId = req.userId;

    const integration = integrations.get(id);
    
    if (!integration || integration.userId !== userId) {
      return res.status(404).json({
        success: false,
        error: { message: 'Integration not found' }
      });
    }

    // Update last sync time
    integration.lastSync = new Date().toISOString();
    integration.status = 'ACTIVE';
    integrations.set(id, integration);

    logger.info(`Integration synced: ${integration.type} for user ${userId}`);

    res.json({
      success: true,
      data: { integration },
      message: 'Integration synced successfully'
    });
  } catch (error) {
    logger.error('Sync integration error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to sync integration' }
    });
  }
});

router.delete('/:id', [
  param('id').isString().notEmpty().withMessage('Integration ID required'),
], (req: any, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: { 
          message: 'Validation failed', 
          details: errors.array() 
        }
      });
    }

    const { id } = req.params;
    const userId = req.userId;

    const integration = integrations.get(id);
    
    if (!integration || integration.userId !== userId) {
      return res.status(404).json({
        success: false,
        error: { message: 'Integration not found' }
      });
    }

    integrations.delete(id);

    logger.info(`Integration disconnected: ${integration.type} for user ${userId}`);

    res.json({
      success: true,
      message: 'Integration disconnected successfully'
    });
  } catch (error) {
    logger.error('Disconnect integration error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to disconnect integration' }
    });
  }
});

router.get('/:id/status', [
  param('id').isString().notEmpty().withMessage('Integration ID required'),
], (req: any, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: { 
          message: 'Validation failed', 
          details: errors.array() 
        }
      });
    }

    const { id } = req.params;
    const userId = req.userId;

    const integration = integrations.get(id);
    
    if (!integration || integration.userId !== userId) {
      return res.status(404).json({
        success: false,
        error: { message: 'Integration not found' }
      });
    }

    const status = {
      id: integration.id,
      type: integration.type,
      name: integration.name,
      isConnected: integration.isConnected,
      status: integration.status,
      lastSync: integration.lastSync,
      connectedAt: integration.connectedAt
    };

    res.json({
      success: true,
      data: { status },
      message: 'Integration status retrieved successfully'
    });
  } catch (error) {
    logger.error('Get integration status error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to get integration status' }
    });
  }
});

export { router as integrationRoutes };
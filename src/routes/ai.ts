import express from 'express';
import { body, validationResult } from 'express-validator';
import { authenticateToken } from '@/middleware/auth';
import { AIService } from '@/services/aiService';
import { logger } from '@/utils/logger';

const router = express.Router();

// All AI routes require authentication
router.use(authenticateToken);

// Initialize AI service
let aiService: AIService;
try {
  aiService = new AIService();
} catch (error) {
  logger.error('Failed to initialize AI service:', error);
}

router.post('/email/classify', [
  body('subject').isString().notEmpty().withMessage('Subject is required'),
  body('body').isString().notEmpty().withMessage('Email body is required'),
  body('from').isString().notEmpty().withMessage('From address is required'),
  body('businessType').optional().isString(),
], async (req: any, res, next) => {
  try {
    if (!aiService) {
      return res.status(503).json({
        success: false,
        error: { message: 'AI service not available. Please check OpenAI API key.' }
      });
    }

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

    const { subject, body, from, businessType } = req.body;

    const classification = await aiService.classifyEmail(
      subject,
      body,
      from,
      businessType || req.user.businessType
    );

    res.json({
      success: true,
      data: classification,
      message: 'Email classified successfully'
    });
  } catch (error: any) {
    logger.error('Email classification error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to classify email' }
    });
  }
});

router.post('/email/generate-response', [
  body('originalSubject').isString().notEmpty().withMessage('Original subject is required'),
  body('originalBody').isString().notEmpty().withMessage('Original email body is required'),
  body('from').isString().notEmpty().withMessage('From address is required'),
  body('classification').isString().isIn(['URGENT_LEGAL', 'CLIENT_INQUIRY', 'COURT_NOTICE', 'OPPOSING_COUNSEL', 'VENDOR', 'SPAM', 'OTHER']).withMessage('Valid legal classification required'),
  body('options').optional().isObject(),
], async (req: any, res, next) => {
  try {
    if (!aiService) {
      return res.status(503).json({
        success: false,
        error: { message: 'AI service not available. Please check OpenAI API key.' }
      });
    }

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

    const { originalSubject, originalBody, from, classification, options = {} } = req.body;

    // Set business type from user profile if not provided
    const responseOptions = {
      businessType: req.user.businessType,
      ...options
    };

    const suggestion = await aiService.generateEmailResponse(
      originalSubject,
      originalBody,
      from,
      classification,
      responseOptions
    );

    res.json({
      success: true,
      data: suggestion,
      message: 'Email response generated successfully'
    });
  } catch (error: any) {
    logger.error('Email response generation error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to generate email response' }
    });
  }
});

router.post('/email/improve-response', [
  body('originalResponse').isString().notEmpty().withMessage('Original response is required'),
  body('feedback').isString().notEmpty().withMessage('Feedback is required'),
], async (req: any, res, next) => {
  try {
    if (!aiService) {
      return res.status(503).json({
        success: false,
        error: { message: 'AI service not available. Please check OpenAI API key.' }
      });
    }

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

    const { originalResponse, feedback } = req.body;

    const improvedResponse = await aiService.improveEmailResponse(
      originalResponse,
      feedback
    );

    res.json({
      success: true,
      data: { improvedResponse },
      message: 'Email response improved successfully'
    });
  } catch (error: any) {
    logger.error('Email response improvement error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to improve email response' }
    });
  }
});

router.post('/email/insights', [
  body('emails').isArray().withMessage('Emails array is required'),
  body('emails.*.subject').isString().notEmpty(),
  body('emails.*.body').isString().notEmpty(),
  body('emails.*.from').isString().notEmpty(),
  body('emails.*.date').isString().notEmpty(),
], async (req: any, res, next) => {
  try {
    if (!aiService) {
      return res.status(503).json({
        success: false,
        error: { message: 'AI service not available. Please check OpenAI API key.' }
      });
    }

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

    const { emails } = req.body;

    const insights = await aiService.extractEmailInsights(emails);

    res.json({
      success: true,
      data: insights,
      message: 'Email insights generated successfully'
    });
  } catch (error: any) {
    logger.error('Email insights error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to generate email insights' }
    });
  }
});

router.post('/calendar/suggest-event', [
  body('emailContent').isString().notEmpty().withMessage('Email content is required'),
  body('from').isString().notEmpty().withMessage('From address is required'),
], async (req: any, res, next) => {
  try {
    if (!aiService) {
      return res.status(503).json({
        success: false,
        error: { message: 'AI service not available. Please check OpenAI API key.' }
      });
    }

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

    const { emailContent, from } = req.body;

    const suggestion = await aiService.generateCalendarEventSuggestion(
      emailContent,
      from
    );

    res.json({
      success: true,
      data: suggestion,
      message: suggestion ? 'Calendar event suggestion generated' : 'No calendar event needed'
    });
  } catch (error: any) {
    logger.error('Calendar suggestion error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to generate calendar suggestion' }
    });
  }
});

// Test endpoint for AI functionality
router.post('/test', async (req: any, res) => {
  try {
    if (!aiService) {
      return res.status(503).json({
        success: false,
        error: { message: 'AI service not available. Please check OpenAI API key configuration.' }
      });
    }

    res.json({
      success: true,
      data: {
        aiServiceReady: true,
        user: {
          id: req.user.id,
          businessType: req.user.businessType
        }
      },
      message: 'AI service is ready and working!'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { message: 'AI service test failed' }
    });
  }
});

export { router as aiRoutes };
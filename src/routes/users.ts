import express from 'express';
import { body, validationResult } from 'express-validator';
import { authenticateToken } from '@/middleware/auth';
import { prisma } from '@/config/database';
import { logger } from '@/utils/logger';

const router = express.Router();

router.use(authenticateToken);

router.get('/profile', (req: any, res) => {
  res.json({
    success: true,
    data: {
      user: req.user
    },
    message: 'User profile retrieved successfully'
  });
});

router.put('/profile', [
  body('name').optional().trim().isLength({ min: 1 }).withMessage('Name cannot be empty'),
  body('businessName').optional().trim().isLength({ min: 1 }).withMessage('Business name cannot be empty'),
  body('businessType').optional().isIn(['LAW', 'REAL_ESTATE', 'RETAIL', 'CONSULTING', 'OTHER']).withMessage('Valid business type required'),
], async (req: any, res, next) => {
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

    const { name, businessName, businessType } = req.body;
    const userId = req.userId;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (businessName !== undefined) updateData.businessName = businessName;
    if (businessType !== undefined) updateData.businessType = businessType;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        error: { message: 'No valid fields provided for update' }
      });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        businessName: true,
        businessType: true,
        isVerified: true,
        createdAt: true,
        updatedAt: true,
      }
    });

    logger.info(`User profile updated: ${updatedUser.email}`);

    res.json({
      success: true,
      data: {
        user: updatedUser
      },
      message: 'Profile updated successfully'
    });
  } catch (error) {
    next(error);
  }
});

router.get('/stats', async (req: any, res, next) => {
  try {
    const userId = req.userId;

    const stats = await prisma.$transaction(async (tx) => {
      const [integrations, automations, emailsProcessed, eventsScheduled] = await Promise.all([
        tx.integration.count({ where: { userId, isConnected: true } }),
        tx.automation.count({ where: { userId, isActive: true } }),
        tx.email.count({ where: { userId } }),
        tx.calendarEvent.count({ where: { userId } })
      ]);

      return {
        integrationsConnected: integrations,
        activeAutomations: automations,
        emailsProcessed,
        eventsScheduled
      };
    });

    res.json({
      success: true,
      data: stats,
      message: 'User stats retrieved successfully'
    });
  } catch (error) {
    next(error);
  }
});

export { router as userRoutes };
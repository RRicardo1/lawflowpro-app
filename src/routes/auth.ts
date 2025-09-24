import express from 'express';
import { body, validationResult } from 'express-validator';
import { AuthService } from '@/services/authService';
import { authenticateToken } from '@/middleware/auth';
import { logger } from '@/utils/logger';
import type { BusinessType } from '@/types/auth';

const router = express.Router();

router.post('/signup', [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  body('name').trim().isLength({ min: 1 }).withMessage('Name is required'),
  body('businessName').trim().isLength({ min: 1 }).withMessage('Business name is required'),
  body('businessType').isIn(['LAW', 'REAL_ESTATE', 'RETAIL', 'CONSULTING', 'OTHER']).withMessage('Valid business type required'),
], async (req, res, next) => {
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

    const { email, password, name, businessName, businessType } = req.body;

    const result = await AuthService.registerUser({
      email,
      password,
      name,
      businessName,
      businessType: businessType as BusinessType
    });

    res.cookie('refreshToken', result.tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });

    res.status(201).json({
      success: true,
      data: {
        user: result.user,
        accessToken: result.tokens.accessToken
      },
      message: 'User registered successfully'
    });
  } catch (error: any) {
    if (error.message === 'User already exists with this email') {
      return res.status(409).json({
        success: false,
        error: { message: error.message }
      });
    }
    next(error);
  }
});

router.post('/signin', [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password is required'),
], async (req, res, next) => {
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

    const { email, password } = req.body;

    const result = await AuthService.loginUser({ email, password });

    res.cookie('refreshToken', result.tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });

    res.json({
      success: true,
      data: {
        user: result.user,
        accessToken: result.tokens.accessToken
      },
      message: 'User signed in successfully'
    });
  } catch (error: any) {
    if (error.message === 'Invalid email or password') {
      return res.status(401).json({
        success: false,
        error: { message: 'Invalid email or password' }
      });
    }
    next(error);
  }
});

router.post('/signout', (req, res) => {
  res.clearCookie('refreshToken');
  res.json({
    success: true,
    message: 'User signed out successfully'
  });
});

router.post('/refresh', async (req, res, next) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        error: { message: 'Refresh token required' }
      });
    }

    const tokens = await AuthService.refreshTokens(refreshToken);

    if (!tokens) {
      return res.status(403).json({
        success: false,
        error: { message: 'Invalid refresh token' }
      });
    }

    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });

    res.json({
      success: true,
      data: {
        accessToken: tokens.accessToken
      },
      message: 'Tokens refreshed successfully'
    });
  } catch (error) {
    next(error);
  }
});

router.get('/me', authenticateToken, (req: any, res) => {
  res.json({
    success: true,
    data: {
      user: req.user
    },
    message: 'User profile retrieved successfully'
  });
});

router.post('/change-password', [
  authenticateToken,
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one uppercase letter, one lowercase letter, and one number'),
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

    const { currentPassword, newPassword } = req.body;
    const userId = req.userId;

    const success = await AuthService.changePassword(userId, currentPassword, newPassword);

    if (!success) {
      return res.status(400).json({
        success: false,
        error: { message: 'Current password is incorrect' }
      });
    }

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    next(error);
  }
});

export { router as authRoutes };
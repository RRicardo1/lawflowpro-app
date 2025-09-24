import { Request, Response, NextFunction } from 'express';
import { AuthService } from '@/services/authService';
import { logger } from '@/utils/logger';
import type { AuthRequest } from '@/types/auth';

interface AuthenticatedRequest extends Request {
  userId?: string;
  user?: any;
}

export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: { message: 'Access token required' }
      });
    }

    const decoded = AuthService.verifyToken(token);
    
    if (!decoded || decoded.type !== 'access') {
      return res.status(403).json({
        success: false,
        error: { message: 'Invalid or expired token' }
      });
    }

    const user = await AuthService.getUserById(decoded.userId);
    
    if (!user) {
      return res.status(403).json({
        success: false,
        error: { message: 'User not found' }
      });
    }

    req.userId = user.id;
    req.user = user;
    next();
  } catch (error) {
    logger.error('Auth middleware error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Authentication failed' }
    });
  }
};

export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return next();
    }

    const decoded = AuthService.verifyToken(token);
    
    if (decoded && decoded.type === 'access') {
      const user = await AuthService.getUserById(decoded.userId);
      
      if (user) {
        req.userId = user.id;
        req.user = user;
      }
    }

    next();
  } catch (error) {
    logger.warn('Optional auth middleware error:', error);
    next();
  }
};

export const requireBusinessType = (allowedTypes: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { message: 'Authentication required' }
      });
    }

    if (!allowedTypes.includes(req.user.businessType)) {
      return res.status(403).json({
        success: false,
        error: { message: 'Access denied for this business type' }
      });
    }

    next();
  };
};

export const requireVerified = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: { message: 'Authentication required' }
    });
  }

  if (!req.user.isVerified) {
    return res.status(403).json({
      success: false,
      error: { message: 'Email verification required' }
    });
  }

  next();
};
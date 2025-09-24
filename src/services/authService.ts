import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '@/config/database';
import { logger } from '@/utils/logger';
import type { User, BusinessType } from '../types/auth';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-jwt-secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const SALT_ROUNDS = 12;

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  businessName: string;
  businessType: BusinessType;
}

export interface LoginData {
  email: string;
  password: string;
}

export class AuthService {
  static async registerUser(data: RegisterData): Promise<{ user: User; tokens: AuthTokens }> {
    try {
      const existingUser = await prisma.user.findUnique({
        where: { email: data.email.toLowerCase() }
      });

      if (existingUser) {
        throw new Error('User already exists with this email');
      }

      const hashedPassword = await bcrypt.hash(data.password, SALT_ROUNDS);

      const user = await prisma.user.create({
        data: {
          email: data.email.toLowerCase(),
          name: data.name,
          businessName: data.businessName,
          businessType: data.businessType,
          passwordHash: hashedPassword,
          isVerified: false,
        },
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

      const tokens = this.generateTokens(user.id);

      logger.info(`New user registered: ${user.email}`);

      return { user, tokens };
    } catch (error) {
      logger.error('Registration error:', error);
      throw error;
    }
  }

  static async loginUser(data: LoginData): Promise<{ user: User; tokens: AuthTokens }> {
    try {
      const user = await prisma.user.findUnique({
        where: { email: data.email.toLowerCase() },
        select: {
          id: true,
          email: true,
          name: true,
          businessName: true,
          businessType: true,
          isVerified: true,
          passwordHash: true,
          createdAt: true,
          updatedAt: true,
        }
      });

      if (!user) {
        throw new Error('Invalid email or password');
      }

      const isPasswordValid = await bcrypt.compare(data.password, user.passwordHash);

      if (!isPasswordValid) {
        throw new Error('Invalid email or password');
      }

      const { passwordHash, ...userWithoutPassword } = user;
      const tokens = this.generateTokens(user.id);

      logger.info(`User logged in: ${user.email}`);

      return { user: userWithoutPassword, tokens };
    } catch (error) {
      logger.error('Login error:', error);
      throw error;
    }
  }

  static async getUserById(userId: string): Promise<User | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
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

      return user;
    } catch (error) {
      logger.error('Get user error:', error);
      return null;
    }
  }

  static generateTokens(userId: string): AuthTokens {
    const accessToken = jwt.sign(
      { userId, type: 'access' },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    const refreshToken = jwt.sign(
      { userId, type: 'refresh' },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    return { accessToken, refreshToken };
  }

  static verifyToken(token: string): { userId: string; type: string } | null {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      return { userId: decoded.userId, type: decoded.type };
    } catch (error) {
      logger.warn('Token verification failed:', error);
      return null;
    }
  }

  static async refreshTokens(refreshToken: string): Promise<AuthTokens | null> {
    try {
      const decoded = this.verifyToken(refreshToken);
      
      if (!decoded || decoded.type !== 'refresh') {
        return null;
      }

      const user = await this.getUserById(decoded.userId);
      if (!user) {
        return null;
      }

      return this.generateTokens(user.id);
    } catch (error) {
      logger.error('Token refresh error:', error);
      return null;
    }
  }

  static async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<boolean> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { passwordHash: true }
      });

      if (!user) {
        return false;
      }

      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
      
      if (!isCurrentPasswordValid) {
        return false;
      }

      const newHashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);

      await prisma.user.update({
        where: { id: userId },
        data: { passwordHash: newHashedPassword }
      });

      logger.info(`Password changed for user: ${userId}`);
      return true;
    } catch (error) {
      logger.error('Change password error:', error);
      return false;
    }
  }
}
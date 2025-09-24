export type BusinessType = 'LAW' | 'REAL_ESTATE' | 'RETAIL' | 'CONSULTING' | 'OTHER';

export interface User {
  id: string;
  email: string;
  name: string;
  businessName: string;
  businessType: BusinessType;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  success: true;
  data: {
    user: User;
    tokens: AuthTokens;
  };
  message: string;
}

export interface AuthRequest {
  userId?: string;
  user?: User;
}
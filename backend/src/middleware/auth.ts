import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { AppError } from './errorHandler.js';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
    shopId: string | null;
  };
}

export const protect = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
) => {
  try {
    let token: string | undefined;

    // Get token from header
    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      throw new AppError('Not authorized to access this route', 401);
    }

    // Verify token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'fallback-secret'
    ) as { id: string };

    // Get user from database with shopId
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, name: true, role: true, isActive: true, shopId: true },
    });

    if (!user || !user.isActive) {
      throw new AppError('User not found or inactive', 401);
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(
        new AppError('Not authorized to perform this action', 403)
      );
    }
    next();
  };
};

// Middleware to ensure user belongs to a shop
export const requireShop = (req: AuthRequest, _res: Response, next: NextFunction) => {
  if (!req.user?.shopId) {
    return next(new AppError('User is not associated with any shop', 403));
  }
  next();
};

// Middleware to verify user has access to the specified shop
export const requireShopAccess = (req: AuthRequest, _res: Response, next: NextFunction) => {
  const shopId = req.params.id || req.params.shopId || req.body.shopId;
  
  // SUPER_ADMIN can access any shop
  if (req.user?.role === 'SUPER_ADMIN') {
    return next();
  }
  
  if (!req.user?.shopId || req.user.shopId !== shopId) {
    return next(new AppError('Not authorized to access this shop', 403));
  }
  next();
};

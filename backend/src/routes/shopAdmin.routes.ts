/**
 * Shop Admin Routes - Shop-level User Management
 * For ADMIN role users to manage users within their own shop
 * Based on OWASP security best practices
 */

import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import { protect, requireShop, authorize } from '../middleware/auth';
import type { AuthRequest } from '../middleware/auth';
import { sensitiveRateLimiter } from '../middleware/rateLimiter';
import { body, validationResult } from 'express-validator';
import { passwordConfig } from '../config/security';

const router = Router();

// ===================================
// Apply ADMIN protection to ALL routes
// Shop admins can only manage their own shop's users
// ===================================
router.use(protect, requireShop, authorize('ADMIN'));

// ===================================
// Shop User Management
// ===================================

/**
 * @route   GET /api/v1/shop-admin/users
 * @desc    Get all users in the current shop
 * @access  Shop Admin Only
 */
router.get('/users', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const shopId = authReq.user?.shopId;

    if (!shopId) {
      return res.status(403).json({ success: false, message: 'Shop access required' });
    }

    const users = await prisma.user.findMany({
      where: { shopId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        lastLogin: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: users,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/shop-admin/users/:id
 * @desc    Get a specific user in the shop
 * @access  Shop Admin Only
 */
router.get('/users/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const shopId = authReq.user?.shopId;
    const { id } = req.params;

    if (!shopId) {
      return res.status(403).json({ success: false, message: 'Shop access required' });
    }

    // Validate ID format
    if (!id || !/^[a-z0-9]+$/.test(id)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID format' });
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        lastLogin: true,
        shopId: true,
      },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Verify user belongs to the same shop
    if (user.shopId !== shopId) {
      return res.status(403).json({ success: false, message: 'User does not belong to your shop' });
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/shop-admin/stats
 * @desc    Get shop statistics
 * @access  Shop Admin Only
 */
router.get('/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const shopId = authReq.user?.shopId;

    if (!shopId) {
      return res.status(403).json({ success: false, message: 'Shop access required' });
    }

    const [totalUsers, activeUsers, shop] = await Promise.all([
      prisma.user.count({ where: { shopId } }),
      prisma.user.count({ where: { shopId, isActive: true } }),
      prisma.shop.findUnique({
        where: { id: shopId },
        select: {
          id: true,
          name: true,
          slug: true,
          _count: {
            select: {
              customers: true,
              products: true,
              invoices: true,
            },
          },
        },
      }),
    ]);

    res.json({
      success: true,
      data: {
        shop: shop ? {
          id: shop.id,
          name: shop.name,
          slug: shop.slug,
        } : null,
        totalUsers,
        activeUsers,
        inactiveUsers: totalUsers - activeUsers,
        totalCustomers: shop?._count.customers || 0,
        totalProducts: shop?._count.products || 0,
        totalInvoices: shop?._count.invoices || 0,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/v1/shop-admin/users
 * @desc    Create a new user in the shop (MANAGER or STAFF only)
 * @access  Shop Admin Only
 */
router.post('/users', sensitiveRateLimiter, [
  body('email').isEmail().normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain uppercase, lowercase, and number'),
  body('name').trim().isLength({ min: 2, max: 100 }),
  body('role').isIn(['MANAGER', 'STAFF']).withMessage('Can only create MANAGER or STAFF users'),
], async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const authReq = req as AuthRequest;
    const shopId = authReq.user?.shopId;

    if (!shopId) {
      return res.status(403).json({ success: false, message: 'Shop access required' });
    }

    const { email, password, name, role } = req.body;

    // SECURITY: Shop admins can only create MANAGER or STAFF roles
    if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
      return res.status(403).json({ 
        success: false, 
        message: 'You can only create MANAGER or STAFF users' 
      });
    }

    // Check if email exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already in use' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(passwordConfig.bcryptRounds);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role,
        shopId, // Force to current shop
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: user,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/v1/shop-admin/users/:id
 * @desc    Update user details (within shop only)
 * @access  Shop Admin Only
 */
router.put('/users/:id', sensitiveRateLimiter, [
  body('name').optional().trim().isLength({ min: 2, max: 100 }),
  body('email').optional().isEmail().normalizeEmail(),
  body('role').optional().isIn(['ADMIN', 'MANAGER', 'STAFF']),  // Accept ADMIN for validation, but won't update it
  body('isActive').optional().custom(val => typeof val === 'boolean'),
], async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const authReq = req as AuthRequest;
    const shopId = authReq.user?.shopId;
    const currentUserId = authReq.user?.id;
    const { id } = req.params;

    // Validate ID format
    if (!id || !/^[a-z0-9]+$/.test(id)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID format' });
    }

    if (!shopId) {
      return res.status(403).json({ success: false, message: 'Shop access required' });
    }

    // SECURITY: Find user and verify they belong to the same shop
    const user = await prisma.user.findUnique({ where: { id } });
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.shopId !== shopId) {
      return res.status(403).json({ success: false, message: 'User does not belong to your shop' });
    }

    // SECURITY: Cannot modify SUPER_ADMIN users from any shop
    if (user.role === 'SUPER_ADMIN') {
      return res.status(403).json({ 
        success: false, 
        message: 'Cannot modify SUPER_ADMIN users' 
      });
    }

    const { name, email, role, isActive } = req.body;

    // Determine if editing own account
    const isOwnAccount = user.id === currentUserId;

    // SECURITY: Prevent role elevation - only block if trying to CHANGE to ADMIN/SUPER_ADMIN
    // (If user is already ADMIN and role='ADMIN' is sent, that's not a change - ignore it)
    if (role && role !== user.role && (role === 'ADMIN' || role === 'SUPER_ADMIN')) {
      return res.status(403).json({ 
        success: false, 
        message: 'Cannot elevate user to ADMIN or SUPER_ADMIN' 
      });
    }

    // Check email uniqueness if changing
    if (email && email !== user.email) {
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        return res.status(400).json({ success: false, message: 'Email already in use' });
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(email && { email }),
        // Only update role/status if NOT editing own account and NOT an ADMIN user
        ...(role && !isOwnAccount && user.role !== 'ADMIN' && { role }),
        ...(isActive !== undefined && !isOwnAccount && user.role !== 'ADMIN' && { isActive }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        lastLogin: true,
      },
    });

    res.json({
      success: true,
      message: 'User updated successfully',
      data: updatedUser,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/v1/shop-admin/users/:id/reset-password
 * @desc    Reset user password (within shop only)
 * @access  Shop Admin Only
 */
router.put('/users/:id/reset-password', sensitiveRateLimiter, [
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain uppercase, lowercase, and number'),
], async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const authReq = req as AuthRequest;
    const shopId = authReq.user?.shopId;
    const currentUserId = authReq.user?.id;
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!shopId) {
      return res.status(403).json({ success: false, message: 'Shop access required' });
    }

    // SECURITY: Find user and verify they belong to the same shop
    const user = await prisma.user.findUnique({ where: { id } });
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.shopId !== shopId) {
      return res.status(403).json({ success: false, message: 'User does not belong to your shop' });
    }

    // SECURITY: Cannot reset SUPER_ADMIN passwords
    if (user.role === 'SUPER_ADMIN') {
      return res.status(403).json({ 
        success: false, 
        message: 'Cannot reset SUPER_ADMIN passwords' 
      });
    }

    // Allow ADMIN to reset their own password
    const isOwnAccount = user.id === currentUserId;

    // SECURITY: If resetting other ADMIN's password (not own), prevent it
    if (user.role === 'ADMIN' && !isOwnAccount) {
      return res.status(403).json({ 
        success: false, 
        message: 'Cannot reset other ADMIN passwords' 
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(passwordConfig.bcryptRounds);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
    });

    res.json({
      success: true,
      message: 'Password reset successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   DELETE /api/v1/shop-admin/users/:id
 * @desc    Deactivate user (within shop only)
 * @access  Shop Admin Only
 */
router.delete('/users/:id', sensitiveRateLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const shopId = authReq.user?.shopId;
    const currentUserId = authReq.user?.id;
    const { id } = req.params;

    if (!shopId) {
      return res.status(403).json({ success: false, message: 'Shop access required' });
    }

    // SECURITY: Prevent self-deletion
    if (currentUserId === id) {
      return res.status(400).json({ success: false, message: 'Cannot delete your own account' });
    }

    // SECURITY: Find user and verify they belong to the same shop
    const user = await prisma.user.findUnique({ where: { id } });
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.shopId !== shopId) {
      return res.status(403).json({ success: false, message: 'User does not belong to your shop' });
    }

    // SECURITY: Cannot delete ADMIN or SUPER_ADMIN users
    if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
      return res.status(403).json({ 
        success: false, 
        message: 'Cannot delete ADMIN or SUPER_ADMIN users' 
      });
    }

    // Soft delete - deactivate
    await prisma.user.update({
      where: { id },
      data: { isActive: false },
    });

    res.json({
      success: true,
      message: 'User deactivated successfully',
    });
  } catch (error) {
    next(error);
  }
});

export default router;

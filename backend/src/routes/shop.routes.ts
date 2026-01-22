import { Router } from 'express';
import {
  registerShop,
  getShopBySlug,
  getShopById,
  updateShop,
  getShopUsers,
  addShopUser,
  updateUserRole,
  getShopStats,
  listAllShops,
  toggleShopStatus,
} from '../controllers/shop.controller';
// import { authenticateToken, requireRole, requireShopAccess } from '../middleware/auth';

const router = Router();

// ==========================================
// PUBLIC ROUTES
// ==========================================

// Register a new shop with admin user
router.post('/register', registerShop);

// Get shop by slug (public info)
router.get('/slug/:slug', getShopBySlug);

// ==========================================
// AUTHENTICATED ROUTES (require shop access)
// ==========================================

// Get shop by ID
router.get('/:id', getShopById);
// router.get('/:id', authenticateToken, requireShopAccess, getShopById);

// Update shop settings (admin only)
router.put('/:id', updateShop);
// router.put('/:id', authenticateToken, requireRole(['ADMIN']), requireShopAccess, updateShop);

// Get shop statistics
router.get('/:id/stats', getShopStats);
// router.get('/:id/stats', authenticateToken, requireRole(['ADMIN', 'MANAGER']), requireShopAccess, getShopStats);

// ==========================================
// USER MANAGEMENT (admin only)
// ==========================================

// Get all users in shop
router.get('/:id/users', getShopUsers);
// router.get('/:id/users', authenticateToken, requireRole(['ADMIN']), requireShopAccess, getShopUsers);

// Add new user to shop
router.post('/:id/users', addShopUser);
// router.post('/:id/users', authenticateToken, requireRole(['ADMIN']), requireShopAccess, addShopUser);

// Update user role/status
router.put('/:id/users/:userId', updateUserRole);
// router.put('/:id/users/:userId', authenticateToken, requireRole(['ADMIN']), requireShopAccess, updateUserRole);

// ==========================================
// SUPER ADMIN ROUTES (platform-wide)
// ==========================================

// List all shops (super admin only)
router.get('/', listAllShops);
// router.get('/', authenticateToken, requireRole(['SUPER_ADMIN']), listAllShops);

// Toggle shop active status
router.patch('/:id/toggle-status', toggleShopStatus);
// router.patch('/:id/toggle-status', authenticateToken, requireRole(['SUPER_ADMIN']), toggleShopStatus);

export default router;

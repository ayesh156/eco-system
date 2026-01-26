import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { protect, requireShop } from '../middleware/auth';
import type { AuthRequest } from '../middleware/auth';
import { validateProduct } from '../middleware/validation';

const router = Router();

// 🔒 All product routes require authentication and shop
router.use(protect, requireShop);

// Get all products (filtered by shop)
router.get('/', async (req, res, next) => {
  try {
    const authReq = req as AuthRequest;
    const shopId = authReq.user?.shopId;
    
    if (!shopId) {
      return res.status(403).json({ success: false, message: 'Shop access required' });
    }

    const products = await prisma.product.findMany({
      where: { shopId },
      include: { category: true, brand: true },
      orderBy: { name: 'asc' },
    });
    res.json({ success: true, data: products });
  } catch (error) {
    next(error);
  }
});

// Get product by ID (with shop validation)
router.get('/:id', async (req, res, next) => {
  try {
    const authReq = req as AuthRequest;
    const shopId = authReq.user?.shopId;
    const { id } = req.params;

    // Validate ID format
    if (!id || !/^[a-z0-9]+$/.test(id)) {
      return res.status(400).json({ success: false, message: 'Invalid product ID format' });
    }

    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: { category: true, brand: true },
    });
    
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    
    // Validate product belongs to user's shop
    if (product.shopId !== shopId) {
      return res.status(403).json({ success: false, message: 'Product does not belong to your shop' });
    }
    
    res.json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
});

// Create product (with shop assignment and validation)
router.post('/', validateProduct, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const shopId = authReq.user?.shopId;
    
    if (!shopId) {
      return res.status(403).json({ success: false, message: 'Shop access required' });
    }

    // Prevent shopId override from request body
    const { shopId: _, ...safeData } = req.body;

    const product = await prisma.product.create({
      data: {
        ...safeData,
        shopId, // Always assign to current user's shop
      },
    });
    res.status(201).json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
});

// Update product (with shop validation)
router.put('/:id', validateProduct, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const shopId = authReq.user?.shopId;

    // First check if product belongs to user's shop
    const existing = await prisma.product.findUnique({
      where: { id: req.params.id },
    });
    
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    
    if (existing.shopId !== shopId) {
      return res.status(403).json({ success: false, message: 'Product does not belong to your shop' });
    }

    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
});

// Delete product (with shop validation)
router.delete('/:id', async (req, res, next) => {
  try {
    const authReq = req as AuthRequest;
    const shopId = authReq.user?.shopId;

    // First check if product belongs to user's shop
    const existing = await prisma.product.findUnique({
      where: { id: req.params.id },
    });
    
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    
    if (existing.shopId !== shopId) {
      return res.status(403).json({ success: false, message: 'Product does not belong to your shop' });
    }

    await prisma.product.delete({
      where: { id: req.params.id },
    });
    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;

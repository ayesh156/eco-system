import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { protect, requireShop } from '../middleware/auth';
import type { AuthRequest } from '../middleware/auth';
import { validateCustomer } from '../middleware/validation';

const router = Router();

// 🔒 All customer routes require authentication and shop
router.use(protect, requireShop);

// Get all customers (filtered by shop)
router.get('/', async (req, res, next) => {
  try {
    const authReq = req as AuthRequest;
    const shopId = authReq.user?.shopId;
    
    if (!shopId) {
      return res.status(403).json({ success: false, message: 'Shop access required' });
    }

    const customers = await prisma.customer.findMany({
      where: { shopId },
      orderBy: { name: 'asc' },
    });
    res.json({ success: true, data: customers });
  } catch (error) {
    next(error);
  }
});

// Get customer by ID (with shop validation)
router.get('/:id', async (req, res, next) => {
  try {
    const authReq = req as AuthRequest;
    const shopId = authReq.user?.shopId;
    const { id } = req.params;

    // Validate ID format
    if (!id || !/^[a-z0-9]+$/.test(id)) {
      return res.status(400).json({ success: false, message: 'Invalid customer ID format' });
    }

    const customer = await prisma.customer.findUnique({
      where: { id: req.params.id },
      include: { invoices: true },
    });
    
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }
    
    // Validate customer belongs to user's shop
    if (customer.shopId !== shopId) {
      return res.status(403).json({ success: false, message: 'Customer does not belong to your shop' });
    }
    
    res.json({ success: true, data: customer });
  } catch (error) {
    next(error);
  }
});

// Create customer (with shop assignment and validation)
router.post('/', validateCustomer, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const shopId = authReq.user?.shopId;
    
    if (!shopId) {
      return res.status(403).json({ success: false, message: 'Shop access required' });
    }

    // Prevent shopId override from request body
    const { shopId: _, ...safeData } = req.body;

    const customer = await prisma.customer.create({
      data: {
        ...safeData,
        shopId, // Always assign to current user's shop
      },
    });
    res.status(201).json({ success: true, data: customer });
  } catch (error) {
    next(error);
  }
});

// Update customer (with shop validation)
router.put('/:id', validateCustomer, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const shopId = authReq.user?.shopId;

    // First check if customer belongs to user's shop
    const existing = await prisma.customer.findUnique({
      where: { id: req.params.id },
    });
    
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }
    
    if (existing.shopId !== shopId) {
      return res.status(403).json({ success: false, message: 'Customer does not belong to your shop' });
    }

    const customer = await prisma.customer.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json({ success: true, data: customer });
  } catch (error) {
    next(error);
  }
});

// Delete customer (with shop validation)
router.delete('/:id', async (req, res, next) => {
  try {
    const authReq = req as AuthRequest;
    const shopId = authReq.user?.shopId;

    // First check if customer belongs to user's shop
    const existing = await prisma.customer.findUnique({
      where: { id: req.params.id },
    });
    
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }
    
    if (existing.shopId !== shopId) {
      return res.status(403).json({ success: false, message: 'Customer does not belong to your shop' });
    }

    await prisma.customer.delete({
      where: { id: req.params.id },
    });
    res.json({ success: true, message: 'Customer deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;

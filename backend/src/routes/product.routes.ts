import { Router } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

// Get all products
router.get('/', async (_req, res, next) => {
  try {
    const products = await prisma.product.findMany({
      include: { category: true, brand: true },
      orderBy: { name: 'asc' },
    });
    res.json({ success: true, data: products });
  } catch (error) {
    next(error);
  }
});

// Get product by ID
router.get('/:id', async (req, res, next) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: { category: true, brand: true },
    });
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    res.json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
});

// Create product
router.post('/', async (req, res, next) => {
  try {
    const product = await prisma.product.create({
      data: req.body,
    });
    res.status(201).json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
});

// Update product
router.put('/:id', async (req, res, next) => {
  try {
    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
});

// Delete product
router.delete('/:id', async (req, res, next) => {
  try {
    await prisma.product.delete({
      where: { id: req.params.id },
    });
    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;

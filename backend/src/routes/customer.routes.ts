import { Router } from 'express';
import { prisma } from '../lib/prisma.js';

const router = Router();

// Get all customers
router.get('/', async (_req, res, next) => {
  try {
    const customers = await prisma.customer.findMany({
      orderBy: { name: 'asc' },
    });
    res.json({ success: true, data: customers });
  } catch (error) {
    next(error);
  }
});

// Get customer by ID
router.get('/:id', async (req, res, next) => {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: req.params.id },
      include: { invoices: true },
    });
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }
    res.json({ success: true, data: customer });
  } catch (error) {
    next(error);
  }
});

// Create customer
router.post('/', async (req, res, next) => {
  try {
    const customer = await prisma.customer.create({
      data: req.body,
    });
    res.status(201).json({ success: true, data: customer });
  } catch (error) {
    next(error);
  }
});

// Update customer
router.put('/:id', async (req, res, next) => {
  try {
    const customer = await prisma.customer.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json({ success: true, data: customer });
  } catch (error) {
    next(error);
  }
});

// Delete customer
router.delete('/:id', async (req, res, next) => {
  try {
    await prisma.customer.delete({
      where: { id: req.params.id },
    });
    res.json({ success: true, message: 'Customer deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;

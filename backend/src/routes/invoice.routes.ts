import { Router } from 'express';
import { protect, requireShop } from '../middleware/auth';
import {
  createInvoice,
  getAllInvoices,
  getInvoiceById,
  updateInvoice,
  deleteInvoice,
  addPayment,
  getInvoiceStats,
  getInvoiceReminders,
  createInvoiceReminder,
} from '../controllers/invoice.controller';
import { validateInvoice, validateInvoiceUpdate, validatePayment } from '../validators/invoice.validator';

const router = Router();

// 🔒 All invoice routes require authentication
router.use(protect, requireShop);

// Invoice CRUD routes
router.route('/')
  .get(getAllInvoices)
  .post(validateInvoice, createInvoice);

router.route('/stats')
  .get(getInvoiceStats);

router.route('/:id')
  .get(getInvoiceById)
  .put(validateInvoiceUpdate, updateInvoice)
  .delete(deleteInvoice);

// Payment routes
router.route('/:id/payments')
  .post(validatePayment, addPayment);

// Reminder routes
router.route('/:id/reminders')
  .get(getInvoiceReminders)
  .post(createInvoiceReminder);

export default router;

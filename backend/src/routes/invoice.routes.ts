import { Router } from 'express';
import {
  createInvoice,
  getAllInvoices,
  getInvoiceById,
  updateInvoice,
  deleteInvoice,
  addPayment,
  getInvoiceStats,
} from '../controllers/invoice.controller';
import { validateInvoice, validateInvoiceUpdate, validatePayment } from '../validators/invoice.validator';

const router = Router();

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

export default router;

import { Router } from 'express';
import { protect, requireShop, authorize } from '../middleware/auth';
import { 
  createGRN, 
  getGRNs, 
  getGRNById,
  deleteGRN,
  updateGRN 
} from '../controllers/grn.controller';

const router = Router();

router.use(protect, requireShop);

router.post('/', createGRN);
router.get('/', getGRNs);
router.get('/:id', getGRNById);
router.put('/:id', updateGRN);
router.delete('/:id', authorize('ADMIN', 'MANAGER'), deleteGRN);

export default router;

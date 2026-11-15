import express from 'express';
import {
  getProfile,
  updateProfile,
  getPublicProfile,
  listUsers,
  toggleUserStatus,
  toggleLicenseVerification
} from '../controllers/userController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

router.get('/profile', authenticate, getProfile);
router.put('/profile', authenticate, updateProfile);
router.get('/:id/public', getPublicProfile);

// Admin-only endpoints
router.get('/', authenticate, authorize('admin'), listUsers);
router.patch('/:id/status', authenticate, authorize('admin'), toggleUserStatus);
router.patch('/:id/verify-license', authenticate, authorize('admin'), toggleLicenseVerification);

export default router;

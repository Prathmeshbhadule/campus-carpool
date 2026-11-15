import express from 'express';
import {
  getMyBookings,
  getAllBookingsAdmin,
  updateBookingStatus,
  updatePaymentStatus
} from '../controllers/bookingController.js';
import {
  updateBookingStatusValidator,
  updatePaymentValidator
} from '../validators/bookingValidator.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.get('/', authorize('admin'), getAllBookingsAdmin);
router.get('/my-bookings', getMyBookings);
router.patch('/:id/status', updateBookingStatusValidator, updateBookingStatus);
router.patch('/:id/payment', updatePaymentValidator, updatePaymentStatus);

export default router;

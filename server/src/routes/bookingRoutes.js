import express from 'express';
import {
  getMyBookings,
  getAllBookingsAdmin,
  updateBookingStatus,
  updatePaymentStatus,
  verifyRideOtp,
  getUpcomingReminders
} from '../controllers/bookingController.js';
import {
  updateBookingStatusValidator,
  updatePaymentValidator
} from '../validators/bookingValidator.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.get('/upcoming-reminders', getUpcomingReminders);
router.get('/', authorize('admin'), getAllBookingsAdmin);
router.get('/my-bookings', getMyBookings);
router.patch('/:id/status', updateBookingStatusValidator, updateBookingStatus);
router.patch('/:id/payment', updatePaymentValidator, updatePaymentStatus);
router.post('/:id/verify-otp', verifyRideOtp);

export default router;

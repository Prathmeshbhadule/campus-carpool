import express from 'express';
import {
  createRide,
  getRides,
  getRideById,
  updateRide,
  deleteRide,
  updateRideStatus,
  updateLiveLocation,
  getLiveLocation
} from '../controllers/rideController.js';
import { createBooking, getRideRequests } from '../controllers/bookingController.js';
import { createRideValidator, searchRideValidator } from '../validators/rideValidator.js';
import { createBookingValidator } from '../validators/bookingValidator.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.route('/')
  .get(searchRideValidator, getRides)
  .post(authenticate, createRideValidator, createRide);

router.route('/:id')
  .get(getRideById)
  .put(authenticate, updateRide)
  .delete(authenticate, deleteRide);

router.patch('/:id/status', authenticate, updateRideStatus);

// Live GPS Tracking routes
router.patch('/:id/location', authenticate, updateLiveLocation);
router.get('/:id/location', getLiveLocation);

// Sub-routes for bookings on a ride
router.post('/:id/bookings', authenticate, createBookingValidator, createBooking);
router.get('/:rideId/bookings', authenticate, getRideRequests);

export default router;

import express from 'express';
import { getPlatformStats, getAdminStats } from '../controllers/statsController.js';
import { calculateRideMetrics } from '../utils/co2Calculator.js';
import { successResponse } from '../utils/apiResponse.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

router.get('/platform', getPlatformStats);

router.get('/admin', authenticate, authorize('admin'), getAdminStats);

// Interactive fare & CO2 calculator API endpoint
router.get('/calculate', (req, res) => {
  const { distanceKm, vehicleCostPerKm, totalRiders, vehicleType } = req.query;
  const metrics = calculateRideMetrics({
    distanceKm: distanceKm ? parseFloat(distanceKm) : 15,
    vehicleCostPerKm: vehicleCostPerKm ? parseFloat(vehicleCostPerKm) : 9,
    totalRiders: totalRiders ? parseInt(totalRiders, 10) : 3,
    vehicleType: vehicleType || 'car'
  });
  return successResponse(res, 200, 'Calculated ride metrics.', metrics);
});

export default router;

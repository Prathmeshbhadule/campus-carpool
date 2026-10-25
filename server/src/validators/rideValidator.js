import { body, query } from 'express-validator';
import { handleValidationErrors } from '../middleware/validate.js';

export const createRideValidator = [
  body('origin.name')
    .trim()
    .notEmpty().withMessage('Origin pickup landmark/spot is required'),
  body('origin.locality')
    .trim()
    .notEmpty().withMessage('Origin locality is required'),
  body('destination.name')
    .trim()
    .notEmpty().withMessage('Destination drop landmark is required'),
  body('destination.locality')
    .trim()
    .notEmpty().withMessage('Destination locality is required'),
  body('departureTime')
    .notEmpty().withMessage('Departure time is required')
    .isISO8601().withMessage('Departure time must be a valid ISO 8601 date-time string')
    .toDate(),
  body('seatsTotal')
    .notEmpty().withMessage('Total seats count is required')
    .isInt({ min: 1, max: 6 }).withMessage('Total seats must be between 1 and 6'),
  body('costPerSeat')
    .notEmpty().withMessage('Cost per seat is required')
    .isFloat({ min: 0, max: 500 }).withMessage('Cost per seat must be between ₹0 and ₹500'),
  body('vehicle.type')
    .notEmpty().withMessage('Vehicle type is required')
    .isIn(['car', 'bike']).withMessage('Vehicle type must be car or bike'),
  handleValidationErrors
];

export const searchRideValidator = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
  handleValidationErrors
];

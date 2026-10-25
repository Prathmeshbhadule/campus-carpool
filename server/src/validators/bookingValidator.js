import { body } from 'express-validator';
import { handleValidationErrors } from '../middleware/validate.js';

export const createBookingValidator = [
  body('seatsBooked')
    .notEmpty().withMessage('Number of seats to book is required')
    .isInt({ min: 1, max: 4 }).withMessage('You can book between 1 and 4 seats per request'),
  body('pickupSpot')
    .trim()
    .notEmpty().withMessage('Pickup spot/landmark is required')
    .isLength({ min: 2, max: 100 }).withMessage('Pickup spot must be between 2 and 100 characters'),
  body('customFare')
    .optional({ nullable: true })
    .isFloat({ min: 0, max: 2000 }).withMessage('Custom fare must be a valid number between ₹0 and ₹2000'),
  body('boardingPoint')
    .optional()
    .trim()
    .isLength({ max: 150 }).withMessage('Boarding point cannot exceed 150 characters'),
  handleValidationErrors
];

export const updateBookingStatusValidator = [
  body('status')
    .notEmpty().withMessage('Status is required')
    .isIn(['approved', 'rejected', 'cancelled', 'completed']).withMessage('Invalid status value'),
  handleValidationErrors
];

export const updatePaymentValidator = [
  body('paymentStatus')
    .notEmpty().withMessage('Payment status is required')
    .isIn(['paid_cash', 'paid_upi', 'pending']).withMessage('Payment status must be paid_cash, paid_upi, or pending'),
  body('paymentNote')
    .optional()
    .trim()
    .isLength({ max: 200 }).withMessage('Payment note cannot exceed 200 characters'),
  handleValidationErrors
];

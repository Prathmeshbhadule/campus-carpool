import { body } from 'express-validator';
import { handleValidationErrors } from '../middleware/validate.js';

export const createReviewValidator = [
  body('rideId')
    .notEmpty().withMessage('Associated completed ride ID is required')
    .isMongoId().withMessage('Invalid ride ID format'),
  body('reviewedUserId')
    .notEmpty().withMessage('Target user ID is required')
    .isMongoId().withMessage('Invalid user ID format'),
  body('role')
    .notEmpty().withMessage('Reviewer role is required')
    .isIn(['driver', 'passenger']).withMessage('Role must be driver or passenger'),
  body('rating')
    .notEmpty().withMessage('Rating is required')
    .isInt({ min: 1, max: 5 }).withMessage('Rating must be an integer between 1 and 5'),
  body('comment')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Review comment cannot exceed 500 characters'),
  handleValidationErrors
];

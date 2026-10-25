import { body } from 'express-validator';
import { handleValidationErrors } from '../middleware/validate.js';

export const registerValidator = [
  body('name')
    .trim()
    .notEmpty().withMessage('Full name is required')
    .isLength({ min: 2, max: 60 }).withMessage('Name must be between 2 and 60 characters'),
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email address format')
    .matches(/^[a-zA-Z0-9._%+-]+@mitaoe\.ac\.in$/)
    .withMessage('Must be a valid MIT Academy of Engineering email (@mitaoe.ac.in). Students: use 12-digit PRN@mitaoe.ac.in'),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  body('role')
    .optional()
    .isIn(['student', 'faculty', 'admin']).withMessage('Role must be student, faculty, or admin'),
  body('prn')
    .optional({ checkFalsy: true })
    .custom((value, { req }) => {
      if (req.body.role === 'student' && value) {
        if (!/^\d{12}$/.test(value)) {
          throw new Error('Student PRN must be exactly 12 digits (e.g. 122100451001)');
        }
      }
      return true;
    }),
  body('department')
    .notEmpty().withMessage('Department selection is required'),
  body('phone')
    .trim()
    .notEmpty().withMessage('Phone number is required')
    .matches(/^(\+91[\-\s]?)?[6-9]\d{9}$/).withMessage('Valid 10-digit Indian mobile number is required'),
  handleValidationErrors
];

export const loginValidator = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email address is required')
    .isEmail().withMessage('Invalid email address'),
  body('password')
    .notEmpty().withMessage('Password is required'),
  handleValidationErrors
];

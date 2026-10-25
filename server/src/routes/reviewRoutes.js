import express from 'express';
import { createReview, getUserReviews } from '../controllers/reviewController.js';
import { createReviewValidator } from '../validators/reviewValidator.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.post('/', authenticate, createReviewValidator, createReview);
router.get('/user/:userId', getUserReviews);

export default router;

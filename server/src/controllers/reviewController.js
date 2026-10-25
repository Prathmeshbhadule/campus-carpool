import { Review } from '../models/Review.js';
import { Ride } from '../models/Ride.js';
import { Booking } from '../models/Booking.js';
import { User } from '../models/User.js';
import { Notification } from '../models/Notification.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';

/**
 * Submit a rating & review (Only after completed ride, 1 review per participant per ride)
 */
export const createReview = async (req, res, next) => {
  try {
    const { rideId, reviewedUserId, role, rating, comment } = req.body;
    const reviewerId = req.user._id;

    if (reviewerId.toString() === reviewedUserId.toString()) {
      return errorResponse(res, 400, 'You cannot rate yourself.');
    }

    const ride = await Ride.findById(rideId);
    if (!ride) {
      return errorResponse(res, 404, 'Associated ride not found.');
    }

    if (ride.status !== 'completed') {
      return errorResponse(res, 400, 'Reviews can only be submitted after a ride is marked as completed.');
    }

    // Verify participation
    const isDriver = ride.driver.toString() === reviewerId.toString();
    const hasPassengerBooking = await Booking.exists({
      ride: rideId,
      passenger: reviewerId,
      status: { $in: ['approved', 'completed'] }
    });

    if (!isDriver && !hasPassengerBooking) {
      return errorResponse(res, 403, 'You can only review participants from rides you participated in.');
    }

    // Check duplicate review
    const existing = await Review.findOne({
      ride: rideId,
      reviewer: reviewerId,
      reviewedUser: reviewedUserId
    });

    if (existing) {
      return errorResponse(res, 409, 'You have already submitted a review for this participant on this ride.');
    }

    const review = await Review.create({
      ride: rideId,
      reviewer: reviewerId,
      reviewedUser: reviewedUserId,
      role,
      rating,
      comment: comment || ''
    });

    // Recalculate recipient's average rating
    const allUserReviews = await Review.find({ reviewedUser: reviewedUserId });
    const totalScore = allUserReviews.reduce((sum, r) => sum + r.rating, 0);
    const avgScore = parseFloat((totalScore / allUserReviews.length).toFixed(1));

    await User.findByIdAndUpdate(reviewedUserId, {
      'rating.average': avgScore,
      'rating.count': allUserReviews.length
    });

    // Notify reviewed user
    await Notification.create({
      user: reviewedUserId,
      type: 'review_received',
      title: 'New Review Received',
      message: `${req.user.name} gave you a ${rating}-star rating: "${comment || 'Great ride!'}"`,
      link: `/profile`
    });

    const populated = await Review.findById(review._id).populate('reviewer', 'name department');

    return successResponse(res, 201, 'Review submitted successfully.', populated);
  } catch (error) {
    next(error);
  }
};

/**
 * Get reviews received by a user
 */
export const getUserReviews = async (req, res, next) => {
  try {
    const reviews = await Review.find({ reviewedUser: req.params.userId })
      .populate('reviewer', 'name department role')
      .populate('ride', 'origin destination departureTime')
      .sort({ createdAt: -1 });

    return successResponse(res, 200, 'User reviews retrieved.', reviews);
  } catch (error) {
    next(error);
  }
};

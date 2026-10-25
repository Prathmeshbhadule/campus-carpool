import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema(
  {
    ride: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ride',
      required: [true, 'Associated ride is required'],
      index: true
    },
    reviewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Reviewer is required'],
      index: true
    },
    reviewedUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User being reviewed is required'],
      index: true
    },
    role: {
      type: String,
      enum: ['driver', 'passenger'],
      required: true
    },
    rating: {
      type: Number,
      required: [true, 'Star rating from 1 to 5 is required'],
      min: [1, 'Minimum rating is 1'],
      max: [5, 'Maximum rating is 5']
    },
    comment: {
      type: String,
      trim: true,
      maxlength: [500, 'Comment cannot exceed 500 characters'],
      default: ''
    }
  },
  {
    timestamps: true
  }
);

// One review per participant per ride
reviewSchema.index({ ride: 1, reviewer: 1, reviewedUser: 1 }, { unique: true });

export const Review = mongoose.model('Review', reviewSchema);

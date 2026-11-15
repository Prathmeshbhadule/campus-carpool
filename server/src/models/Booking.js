import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema(
  {
    ride: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ride',
      required: [true, 'Associated ride is required'],
      index: true
    },
    passenger: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Passenger is required'],
      index: true
    },
    seatsBooked: {
      type: Number,
      required: [true, 'Number of seats is required'],
      min: [1, 'Must book at least 1 seat'],
      default: 1
    },
    totalFare: {
      type: Number,
      required: [true, 'Total fare amount is required'],
      min: [0, 'Fare cannot be negative']
    },
    pickupSpot: {
      type: String,
      required: [true, 'Pickup landmark/location is required'],
      trim: true
    },
    boardingPoint: {
      type: String,
      default: '',
      trim: true
    },
    stageFare: {
      type: Number,
      default: null,
      min: [0, 'Stage fare cannot be negative']
    },
    status: {
      type: String,
      enum: ['requested', 'approved', 'rejected', 'cancelled', 'completed'],
      default: 'requested',
      index: true
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid_cash', 'paid_upi'],
      default: 'pending'
    },
    paymentTiming: {
      type: String,
      enum: ['advance', 'on_boarding', 'post_ride'],
      default: 'advance'
    },
    paymentNote: {
      type: String,
      default: '',
      trim: true
    },
    startOtp: {
      type: String,
      default: null
    },
    otpVerified: {
      type: Boolean,
      default: false
    },
    boardedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Prevent redundant duplicate pending/approved bookings by the same user on the same ride
bookingSchema.index({ ride: 1, passenger: 1, status: 1 });

// Pre-save hook: automatically assign a secure 4-digit Ride Start OTP if not already present
bookingSchema.pre('save', function (next) {
  if (!this.startOtp) {
    this.startOtp = Math.floor(1000 + Math.random() * 9000).toString();
  }
  next();
});

export const Booking = mongoose.model('Booking', bookingSchema);

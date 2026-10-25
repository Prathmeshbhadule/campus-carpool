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
    paymentNote: {
      type: String,
      default: '',
      trim: true
    }
  },
  {
    timestamps: true
  }
);

// Prevent redundant duplicate pending/approved bookings by the same user on the same ride
bookingSchema.index({ ride: 1, passenger: 1, status: 1 });

export const Booking = mongoose.model('Booking', bookingSchema);

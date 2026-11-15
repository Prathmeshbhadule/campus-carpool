import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    type: {
      type: String,
      enum: [
        'booking_requested',
        'booking_approved',
        'booking_rejected',
        'booking_cancelled',
        'ride_completed',
        'review_received',
        'payment_requested',
        'payment_received',
        'payment_confirmed',
        'ride_reminder',
        'ride_started',
        'otp_verified'
      ],
      required: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    message: {
      type: String,
      required: true,
      trim: true
    },
    link: {
      type: String,
      default: '/dashboard'
    },
    read: {
      type: Boolean,
      default: false,
      index: true
    }
  },
  {
    timestamps: true
  }
);

export const Notification = mongoose.model('Notification', notificationSchema);

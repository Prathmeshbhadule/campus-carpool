import mongoose from 'mongoose';
import dns from 'dns';
import { ENV } from './env.js';

export const connectDB = async () => {
  try {
    // If using mongodb+srv, ensure public DNS fallback for SRV resolution
    if (ENV.MONGODB_URI.startsWith('mongodb+srv://')) {
      try {
        dns.setServers(['8.8.8.8', '1.1.1.1']);
      } catch (dnsErr) {
        // Fallback to system DNS if custom servers fail
      }
    }

    const conn = await mongoose.connect(ENV.MONGODB_URI);
    console.log(`[MongoDB] Connected successfully: ${conn.connection.host}/${conn.connection.name}`);

    // Auto-backfill 4-digit Ride Start OTP for any existing legacy bookings
    try {
      import('../models/Booking.js').then(async ({ Booking }) => {
        const missing = await Booking.find({
          $or: [{ startOtp: null }, { startOtp: '' }, { startOtp: { $exists: false } }]
        });
        if (missing && missing.length > 0) {
          for (const b of missing) {
            b.startOtp = Math.floor(1000 + Math.random() * 9000).toString();
            await b.save();
          }
          console.log(`[MongoDB] Auto-backfilled startOtp for ${missing.length} bookings.`);
        }
      }).catch(() => {});
    } catch (e) {
      // Non-blocking backfill
    }

    return conn;
  } catch (error) {
    console.error(`[MongoDB] Connection error: ${error.message}`);
    process.exit(1);
  }
};

export const disconnectDB = async () => {
  try {
    await mongoose.connection.close();
    console.log('[MongoDB] Connection closed.');
  } catch (error) {
    console.error(`[MongoDB] Error disconnecting: ${error.message}`);
  }
};

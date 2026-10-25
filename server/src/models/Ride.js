import mongoose from 'mongoose';

const rideSchema = new mongoose.Schema(
  {
    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Driver is required'],
      index: true
    },
    origin: {
      name: { type: String, required: [true, 'Origin landmark/spot is required'], trim: true },
      locality: { type: String, required: [true, 'Origin locality is required'], trim: true },
      coordinates: {
        type: [Number], // [lat, lng]
        default: [18.6756, 73.8906] // Default near MITAOE Alandi
      }
    },
    destination: {
      name: { type: String, required: [true, 'Destination landmark/spot is required'], trim: true },
      locality: { type: String, required: [true, 'Destination locality is required'], trim: true },
      coordinates: {
        type: [Number], // [lat, lng]
        default: [18.6756, 73.8906]
      }
    },
    viaRoute: {
      type: [String],
      default: []
    },
    departureTime: {
      type: Date,
      required: [true, 'Departure date and time is required'],
      index: true
    },
    seatsTotal: {
      type: Number,
      required: [true, 'Total seats must be specified'],
      min: [1, 'At least 1 seat must be offered'],
      max: [6, 'A private vehicle carpool cannot exceed 6 seats']
    },
    seatsAvailable: {
      type: Number,
      required: true,
      min: [0, 'Available seats cannot be negative'],
      index: true
    },
    costPerSeat: {
      type: Number,
      required: [true, 'Cost per seat in INR is required'],
      min: [0, 'Cost cannot be negative'],
      max: [500, 'Fair campus fare share cannot exceed ₹500']
    },
    vehicle: {
      type: {
        type: String,
        enum: ['car', 'bike'],
        required: [true, 'Vehicle type must be car or bike'],
        default: 'car'
      },
      model: { type: String, trim: true, default: '' },
      plate: { type: String, trim: true, default: '' }
    },
    status: {
      type: String,
      enum: ['open', 'full', 'ongoing', 'completed', 'cancelled'],
      default: 'open',
      index: true
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [300, 'Notes cannot exceed 300 characters'],
      default: ''
    },
    currentLocation: {
      coordinates: {
        type: [Number], // [lat, lng]
        default: null
      },
      speed: { type: Number, default: 0 },
      heading: { type: Number, default: 0 },
      lastUpdated: { type: Date, default: null },
      isLiveTracking: { type: Boolean, default: false }
    }
  },
  {
    timestamps: true
  }
);

// Compound index for active ride searches
rideSchema.index({ status: 1, departureTime: 1, 'origin.locality': 1, 'destination.locality': 1 });

export const Ride = mongoose.model('Ride', rideSchema);

import { User } from '../models/User.js';
import { Ride } from '../models/Ride.js';
import { Booking } from '../models/Booking.js';
import { Notification } from '../models/Notification.js';
import { PUNE_LOCALITIES } from '../utils/locations.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';

/**
 * Helper to escape regex special characters
 */
const escapeRegex = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Builds list of regexes to match a location query against origin/destination/viaRoute
 */
const buildSearchRegexes = (input) => {
  if (!input || typeof input !== 'string') return [];
  const clean = input.trim();
  if (!clean) return [];

  const regexes = [];
  // 1. Full clean string regex
  regexes.push(new RegExp(escapeRegex(clean), 'i'));

  // 2. Sub-phrases split by commas, slashes, hyphens (e.g. "MITAOE Campus, Alandi" -> "MITAOE Campus", "Alandi")
  const subPhrases = clean
    .split(/[,/-]+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 3 && s.toLowerCase() !== clean.toLowerCase());

  for (const phrase of subPhrases) {
    regexes.push(new RegExp(escapeRegex(phrase), 'i'));
  }

  // 3. Significant keywords (length >= 4, ignoring common stop words)
  const stopWords = new Set(['near', 'road', 'chowk', 'opp', 'behind', 'beside', 'front', 'area']);
  const words = clean
    .split(/[\s,/-]+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 4 && !stopWords.has(w.toLowerCase()));

  for (const word of words) {
    if (!regexes.some((r) => r.source.toLowerCase() === escapeRegex(word).toLowerCase())) {
      regexes.push(new RegExp(escapeRegex(word), 'i'));
    }
  }

  return regexes;
};

/**
 * Helper to get locality coordinates
 */
const lookupCoordinates = (localityName) => {
  const match = PUNE_LOCALITIES.find(
    loc => loc.locality.toLowerCase() === localityName.toLowerCase() ||
           loc.name.toLowerCase().includes(localityName.toLowerCase())
  );
  return match ? match.coordinates : [18.6756, 73.8906];
};

/**
 * Create a new ride
 */
export const createRide = async (req, res, next) => {
  try {
    const { origin, destination, viaRoute, departureTime, seatsTotal, costPerSeat, vehicle, notes, drivingLicenseNumber } = req.body;

    const vehicleType = vehicle?.type || req.user.vehicle?.type || 'car';
    const vehicleModel = (vehicle?.model || req.user.vehicle?.model || '').trim();
    const vehiclePlate = (vehicle?.plate || req.user.vehicle?.plate || '').trim();

    // Check Driving License compliance for driver authorization
    const existingDl = req.user.drivingLicense?.hasLicense && req.user.drivingLicense?.licenseNumber;
    const submittedDl = (drivingLicenseNumber || vehicle?.licenseNumber || '').trim().toUpperCase();

    if (!existingDl && !submittedDl) {
      return errorResponse(
        res,
        400,
        'A valid RTO Driving License number is required to publish a campus carpool as a driver.'
      );
    }

    // If new license number provided, update user profile automatically
    if (submittedDl && (!existingDl || req.user.drivingLicense?.licenseNumber !== submittedDl)) {
      await User.findByIdAndUpdate(req.user._id, {
        drivingLicense: {
          hasLicense: true,
          licenseNumber: submittedDl,
          verified: submittedDl.length >= 8
        }
      });
    }

    // If passenger without registered vehicle is publishing, ensure vehicle model and plate are provided
    if (!req.user.vehicle?.hasVehicle && (!vehicleModel || !vehiclePlate)) {
      return errorResponse(res, 400, 'Please provide vehicle model and registration plate number to publish a carpool.');
    }

    const originCoords = origin.coordinates && origin.coordinates.length === 2 
      ? origin.coordinates 
      : lookupCoordinates(origin.locality);

    const destCoords = destination.coordinates && destination.coordinates.length === 2 
      ? destination.coordinates 
      : lookupCoordinates(destination.locality);

    const ride = await Ride.create({
      driver: req.user._id,
      origin: {
        name: origin.name,
        locality: origin.locality,
        coordinates: originCoords
      },
      destination: {
        name: destination.name,
        locality: destination.locality,
        coordinates: destCoords
      },
      viaRoute: viaRoute || [],
      departureTime,
      seatsTotal,
      seatsAvailable: seatsTotal,
      costPerSeat,
      vehicle: {
        type: vehicleType,
        model: vehicleModel || 'Private Vehicle',
        plate: vehiclePlate || 'Private MH'
      },
      notes: notes || ''
    });

    const populated = await Ride.findById(ride._id).populate('driver', 'name email phone rating vehicle department role drivingLicense');

    return successResponse(res, 201, 'Ride successfully published.', populated);
  } catch (error) {
    next(error);
  }
};

/**
 * Search and filter rides with pagination
 */
export const getRides = async (req, res, next) => {
  try {
    const {
      origin,
      destination,
      date,
      vehicleType,
      minSeats,
      maxPrice,
      status,
      driverId,
      excludeDriver,
      sortBy = 'departureTime',
      order = 'asc',
      page = 1,
      limit = 10,
      includePast
    } = req.query;

    const now = new Date();

    // Auto-transition past open/full rides whose departure time has passed to completed
    await Ride.updateMany(
      {
        status: { $in: ['open', 'full'] },
        departureTime: { $lt: now }
      },
      {
        $set: { status: 'completed' }
      }
    );

    const query = {};

    // Filter by status (default to open if not specified, unless filtering by driver)
    if (status) {
      query.status = status;
    } else if (!driverId) {
      query.status = 'open';
    }

    if (driverId) {
      query.driver = driverId;
    }

    // Exclude current user's own rides when searching as passenger
    const driverToExclude = excludeDriver || (!driverId && req.user ? req.user._id : null);
    if (driverToExclude) {
      query.driver = { $ne: driverToExclude };
    }

    // Filter by origin (checks origin landmark name, locality, or viaRoute)
    if (origin && origin.trim()) {
      const originRegexes = buildSearchRegexes(origin);
      if (originRegexes.length > 0) {
        query.$and = query.$and || [];
        query.$and.push({
          $or: [
            { 'origin.name': { $in: originRegexes } },
            { 'origin.locality': { $in: originRegexes } },
            { 'viaRoute': { $in: originRegexes } }
          ]
        });
      }
    }

    // Filter by destination (checks destination landmark name, locality, or viaRoute)
    if (destination && destination.trim()) {
      const destRegexes = buildSearchRegexes(destination);
      if (destRegexes.length > 0) {
        query.$and = query.$and || [];
        query.$and.push({
          $or: [
            { 'destination.name': { $in: destRegexes } },
            { 'destination.locality': { $in: destRegexes } },
            { 'viaRoute': { $in: destRegexes } }
          ]
        });
      }
    }

    // Filter by departure date/time
    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      if (!driverId && includePast !== 'true') {
        // If passenger search for today, only show rides departing after current time
        const effectiveStart = startOfDay < now ? now : startOfDay;
        query.departureTime = { $gte: effectiveStart, $lte: endOfDay };
      } else {
        query.departureTime = { $gte: startOfDay, $lte: endOfDay };
      }
    } else if (!driverId && includePast !== 'true') {
      // By default for public searches and featured rides, only show upcoming future rides
      query.departureTime = { $gte: now };
    }

    // Filter by vehicle type
    if (vehicleType) {
      query['vehicle.type'] = vehicleType;
    }

    // Filter by minimum seats available
    if (minSeats) {
      query.seatsAvailable = { $gte: parseInt(minSeats, 10) };
    }

    // Filter by max price
    if (maxPrice) {
      query.costPerSeat = { $lte: parseFloat(maxPrice) };
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const sortOption = {};
    sortOption[sortBy] = order === 'desc' ? -1 : 1;

    const [rides, total] = await Promise.all([
      Ride.find(query)
        .populate('driver', 'name email phone rating vehicle department role drivingLicense')
        .sort(sortOption)
        .skip(skip)
        .limit(limitNum),
      Ride.countDocuments(query)
    ]);

    return successResponse(res, 200, 'Rides retrieved successfully.', rides, {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum)
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get ride details by ID
 */
export const getRideById = async (req, res, next) => {
  try {
    const ride = await Ride.findById(req.params.id)
      .populate('driver', 'name email phone rating vehicle department role drivingLicense');

    if (!ride) {
      return errorResponse(res, 404, 'Ride not found.');
    }

    // Retrieve active bookings for this ride
    const bookings = await Booking.find({ ride: ride._id, status: { $in: ['requested', 'approved', 'completed'] } })
      .populate('passenger', 'name email phone rating department role');

    return successResponse(res, 200, 'Ride details retrieved.', {
      ride,
      bookings
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update ride details (Driver only, while open)
 */
export const updateRide = async (req, res, next) => {
  try {
    const ride = await Ride.findById(req.params.id);
    if (!ride) {
      return errorResponse(res, 404, 'Ride not found.');
    }

    if (ride.driver.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return errorResponse(res, 403, 'You are not authorized to update this ride.');
    }

    if (ride.status !== 'open') {
      return errorResponse(res, 400, 'Cannot edit a ride that is already in progress, full, or completed.');
    }

    const { notes, costPerSeat, departureTime, viaRoute } = req.body;
    if (notes !== undefined) ride.notes = notes;
    if (costPerSeat !== undefined) ride.costPerSeat = costPerSeat;
    if (departureTime !== undefined) ride.departureTime = departureTime;
    if (viaRoute !== undefined) ride.viaRoute = viaRoute;

    await ride.save();

    return successResponse(res, 200, 'Ride updated successfully.', ride);
  } catch (error) {
    next(error);
  }
};

/**
 * Delete ride (Driver or Admin)
 */
export const deleteRide = async (req, res, next) => {
  try {
    const ride = await Ride.findById(req.params.id);
    if (!ride) {
      return errorResponse(res, 404, 'Ride not found.');
    }

    if (ride.driver.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return errorResponse(res, 403, 'You are not authorized to delete this ride.');
    }

    // Notify any confirmed passengers
    const bookings = await Booking.find({ ride: ride._id, status: { $in: ['requested', 'approved'] } });
    for (const b of bookings) {
      b.status = 'cancelled';
      await b.save();
      await Notification.create({
        user: b.passenger,
        type: 'booking_cancelled',
        title: 'Ride Cancelled by Driver',
        message: `The ride from ${ride.origin.locality} to ${ride.destination.locality} was cancelled.`
      });
    }

    await Ride.findByIdAndDelete(ride._id);

    return res.status(204).send();
  } catch (error) {
    next(error);
  }
};

/**
 * Update ride lifecycle status ('ongoing', 'completed', 'cancelled')
 */
export const updateRideStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const ride = await Ride.findById(req.params.id);

    if (!ride) {
      return errorResponse(res, 404, 'Ride not found.');
    }

    if (ride.driver.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return errorResponse(res, 403, 'You are not authorized to update this ride status.');
    }

    ride.status = status;
    await ride.save();

    // If ride completed, update approved bookings to completed and notify passengers
    if (status === 'completed') {
      const bookings = await Booking.find({ ride: ride._id, status: 'approved' });
      for (const b of bookings) {
        b.status = 'completed';
        await b.save();

        await Notification.create({
          user: b.passenger,
          type: 'ride_completed',
          title: 'Ride Completed! Please Rate Your Driver',
          message: `Your ride from ${ride.origin.locality} has completed. Please leave a rating!`,
          link: `/dashboard?tab=bookings`
        });
      }
    }

    return successResponse(res, 200, `Ride status updated to ${status}.`, ride);
  } catch (error) {
    next(error);
  }
};

/**
 * Update real-time GPS telemetry (Driver broadcasts live coordinates)
 */
export const updateLiveLocation = async (req, res, next) => {
  try {
    const { coordinates, speed = 0, heading = 0, isLiveTracking = true } = req.body;
    const ride = await Ride.findById(req.params.id);

    if (!ride) {
      return errorResponse(res, 404, 'Ride not found.');
    }

    if (ride.driver.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return errorResponse(res, 403, 'Only the driver can broadcast GPS location for this ride.');
    }

    ride.currentLocation = {
      coordinates,
      speed: Number(speed),
      heading: Number(heading),
      lastUpdated: new Date(),
      isLiveTracking: Boolean(isLiveTracking)
    };

    // If ride was open, mark as ongoing when live tracking starts
    if (ride.status === 'open' && isLiveTracking) {
      ride.status = 'ongoing';
    }

    await ride.save();

    return successResponse(res, 200, 'GPS telemetry updated.', ride.currentLocation);
  } catch (error) {
    next(error);
  }
};

/**
 * Get latest live GPS coordinates for tracking (Passengers / Viewers)
 */
export const getLiveLocation = async (req, res, next) => {
  try {
    const ride = await Ride.findById(req.params.id).select('currentLocation status origin destination driver vehicle');
    if (!ride) {
      return errorResponse(res, 404, 'Ride not found.');
    }

    return successResponse(res, 200, 'Live GPS telemetry retrieved.', {
      currentLocation: ride.currentLocation,
      status: ride.status,
      origin: ride.origin,
      destination: ride.destination
    });
  } catch (error) {
    next(error);
  }
};


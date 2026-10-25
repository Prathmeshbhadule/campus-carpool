import { Ride } from '../models/Ride.js';
import { Booking } from '../models/Booking.js';
import { Notification } from '../models/Notification.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';

/**
 * Request seat booking atomically to eliminate race conditions & overbooking
 */
export const createBooking = async (req, res, next) => {
  try {
    const rideId = req.params.id;
    const { seatsBooked = 1, pickupSpot, customFare, boardingPoint } = req.body;
    const passengerId = req.user._id;

    const rideCheck = await Ride.findById(rideId);
    if (!rideCheck) {
      return errorResponse(res, 404, 'Ride not found.');
    }

    if (rideCheck.driver.toString() === passengerId.toString()) {
      return errorResponse(res, 400, 'Drivers cannot book seats on their own ride.');
    }

    // Check if ride has already departed or ended
    if (new Date(rideCheck.departureTime) < new Date() || ['completed', 'cancelled'].includes(rideCheck.status)) {
      return errorResponse(res, 400, 'Cannot book seats on a ride that has already departed or concluded.');
    }

    // Check if passenger already has a requested or approved booking on this ride
    const existingBooking = await Booking.findOne({
      ride: rideId,
      passenger: passengerId,
      status: { $in: ['requested', 'approved'] }
    });

    if (existingBooking) {
      return errorResponse(res, 409, 'You already have an active booking request for this ride.');
    }

    // Atomic seat decrement ensuring seatsAvailable >= seatsBooked
    const updatedRide = await Ride.findOneAndUpdate(
      {
        _id: rideId,
        status: 'open',
        seatsAvailable: { $gte: seatsBooked }
      },
      {
        $inc: { seatsAvailable: -seatsBooked }
      },
      { new: true }
    );

    if (!updatedRide) {
      return errorResponse(
        res,
        409,
        'Cannot complete booking: Insufficient seats remaining or ride is no longer open.'
      );
    }

    // If all seats taken, transition ride status to full
    if (updatedRide.seatsAvailable === 0) {
      updatedRide.status = 'full';
      await updatedRide.save();
    }

    // Calculate fare based on stage / custom fare or full ride cost per seat
    let farePerSeat = updatedRide.costPerSeat;
    if (customFare !== undefined && customFare !== null && !isNaN(customFare) && Number(customFare) >= 0) {
      farePerSeat = Number(customFare);
    }
    const totalFare = Math.round(farePerSeat * seatsBooked);

    const booking = await Booking.create({
      ride: rideId,
      passenger: passengerId,
      seatsBooked,
      totalFare,
      stageFare: farePerSeat,
      boardingPoint: (boardingPoint && boardingPoint.trim()) ? boardingPoint.trim() : pickupSpot,
      pickupSpot,
      status: 'requested',
      paymentStatus: 'pending'
    });

    // Notify driver about new seat booking request
    await Notification.create({
      user: updatedRide.driver,
      type: 'booking_requested',
      title: 'New Ride Booking Request',
      message: `${req.user.name} requested ${seatsBooked} seat(s) for your ride from ${updatedRide.origin.locality}.`,
      link: `/dashboard?tab=rides`
    });

    const populated = await Booking.findById(booking._id)
      .populate('passenger', 'name email phone rating department')
      .populate('ride');

    return successResponse(res, 201, 'Booking request submitted successfully.', populated);
  } catch (error) {
    next(error);
  }
};

/**
 * Get current passenger's bookings
 */
export const getMyBookings = async (req, res, next) => {
  try {
    const bookings = await Booking.find({ passenger: req.user._id })
      .populate({
        path: 'ride',
        populate: {
          path: 'driver',
          select: 'name email phone rating vehicle department'
        }
      })
      .sort({ createdAt: -1 });

    return successResponse(res, 200, 'User bookings retrieved.', bookings);
  } catch (error) {
    next(error);
  }
};

/**
 * Get booking requests for a specific ride (for the ride driver)
 */
export const getRideRequests = async (req, res, next) => {
  try {
    const ride = await Ride.findById(req.params.rideId);
    if (!ride) {
      return errorResponse(res, 404, 'Ride not found.');
    }

    if (ride.driver.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return errorResponse(res, 403, 'Unauthorized to view requests for this ride.');
    }

    const bookings = await Booking.find({ ride: req.params.rideId })
      .populate('passenger', 'name email phone rating department prn')
      .sort({ createdAt: -1 });

    return successResponse(res, 200, 'Ride bookings retrieved.', bookings);
  } catch (error) {
    next(error);
  }
};

/**
 * Update booking status (Driver approves/rejects, Passenger cancels)
 */
export const updateBookingStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const booking = await Booking.findById(req.params.id).populate('ride');

    if (!booking) {
      return errorResponse(res, 404, 'Booking not found.');
    }

    const isDriver = booking.ride.driver.toString() === req.user._id.toString();
    const isPassenger = booking.passenger.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isDriver && !isPassenger && !isAdmin) {
      return errorResponse(res, 403, 'You are not authorized to update this booking.');
    }

    // Driver can approve or reject
    if ((status === 'approved' || status === 'rejected') && !isDriver && !isAdmin) {
      return errorResponse(res, 403, 'Only the driver can approve or reject booking requests.');
    }

    // Passenger can cancel
    if (status === 'cancelled' && !isPassenger && !isAdmin && !isDriver) {
      return errorResponse(res, 403, 'Only the passenger or driver can cancel this booking.');
    }

    const prevStatus = booking.status;
    booking.status = status;
    await booking.save();

    // If rejected or cancelled, release reserved seats back to ride atomically
    if (['rejected', 'cancelled'].includes(status) && ['requested', 'approved'].includes(prevStatus)) {
      await Ride.findByIdAndUpdate(booking.ride._id, {
        $inc: { seatsAvailable: booking.seatsBooked },
        ...(booking.ride.status === 'full' ? { status: 'open' } : {})
      });
    }

    // Send notification
    if (status === 'approved') {
      await Notification.create({
        user: booking.passenger,
        type: 'booking_approved',
        title: 'Booking Approved!',
        message: `Your booking for ride from ${booking.ride.origin.locality} has been approved. Meet at pickup spot: ${booking.pickupSpot}.`,
        link: `/dashboard?tab=bookings`
      });
    } else if (status === 'rejected') {
      await Notification.create({
        user: booking.passenger,
        type: 'booking_rejected',
        title: 'Booking Request Declined',
        message: `Your booking request for ride from ${booking.ride.origin.locality} was declined by the driver.`,
        link: `/dashboard?tab=bookings`
      });
    } else if (status === 'cancelled') {
      const recipient = isPassenger ? booking.ride.driver : booking.passenger;
      await Notification.create({
        user: recipient,
        type: 'booking_cancelled',
        title: 'Booking Cancelled',
        message: `Booking on ride from ${booking.ride.origin.locality} was cancelled.`,
        link: `/dashboard`
      });
    }

    return successResponse(res, 200, `Booking status updated to ${status}.`, booking);
  } catch (error) {
    next(error);
  }
};

/**
 * Driver marks payment status (Cash or UPI at pickup settlement record)
 */
export const updatePaymentStatus = async (req, res, next) => {
  try {
    const { paymentStatus, paymentNote } = req.body;
    const booking = await Booking.findById(req.params.id).populate('ride');

    if (!booking) {
      return errorResponse(res, 404, 'Booking not found.');
    }

    const isDriver = booking.ride.driver.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isDriver && !isAdmin) {
      return errorResponse(res, 403, 'Only the driver can record payment confirmation.');
    }

    booking.paymentStatus = paymentStatus;
    if (paymentNote !== undefined) {
      booking.paymentNote = paymentNote;
    }
    await booking.save();

    return successResponse(res, 200, `Payment status recorded as ${paymentStatus}.`, booking);
  } catch (error) {
    next(error);
  }
};

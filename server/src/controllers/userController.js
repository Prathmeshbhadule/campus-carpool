import { User } from '../models/User.js';
import { Ride } from '../models/Ride.js';
import { Booking } from '../models/Booking.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';

/**
 * Get profile of logged-in user with ride counts
 */
export const getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) {
      return errorResponse(res, 404, 'User not found.');
    }

    const [ridesOffered, bookingsTaken] = await Promise.all([
      Ride.countDocuments({ driver: user._id }),
      Booking.countDocuments({ passenger: user._id, status: { $in: ['approved', 'completed'] } })
    ]);

    return successResponse(res, 200, 'Profile retrieved.', {
      user,
      stats: {
        ridesOffered,
        bookingsTaken
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update personal profile details & vehicle info
 */
export const updateProfile = async (req, res, next) => {
  try {
    const { name, department, phone, vehicle } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return errorResponse(res, 404, 'User not found.');
    }

    if (name) user.name = name;
    if (department) user.department = department;
    if (phone) user.phone = phone;
    if (vehicle) {
      user.vehicle = {
        hasVehicle: Boolean(vehicle.hasVehicle),
        type: vehicle.type || 'none',
        model: vehicle.model || '',
        plate: vehicle.plate || ''
      };
    }

    await user.save();

    const safeUser = user.toObject();
    delete safeUser.password;

    return successResponse(res, 200, 'Profile updated successfully.', safeUser);
  } catch (error) {
    next(error);
  }
};

/**
 * Get public profile of any user (for driver modal or rider card)
 */
export const getPublicProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .select('name role department rating vehicle createdAt');

    if (!user) {
      return errorResponse(res, 404, 'User not found.');
    }

    const completedRides = await Ride.countDocuments({ driver: user._id, status: 'completed' });

    return successResponse(res, 200, 'Public profile retrieved.', {
      user,
      completedRides
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: List all users with search, role filter, pagination
 */
export const listUsers = async (req, res, next) => {
  try {
    const { search, role, status, page = 1, limit = 15 } = req.query;
    const query = {};

    if (role) {
      query.role = role;
    }

    if (status !== undefined && status !== '') {
      query.isActive = status === 'true';
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { prn: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [users, total] = await Promise.all([
      User.find(query).select('-password').sort({ createdAt: -1 }).skip(skip).limit(limitNum),
      User.countDocuments(query)
    ]);

    return successResponse(res, 200, 'Users list retrieved.', users, {
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
 * Admin: Activate or deactivate a user
 */
export const toggleUserStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return errorResponse(res, 404, 'User not found.');
    }

    if (user.role === 'admin' && user._id.toString() === req.user._id.toString()) {
      return errorResponse(res, 400, 'Admin cannot deactivate their own account.');
    }

    user.isActive = !user.isActive;
    await user.save();

    return successResponse(res, 200, `User account ${user.isActive ? 'activated' : 'deactivated'} successfully.`, {
      _id: user._id,
      name: user.name,
      isActive: user.isActive
    });
  } catch (error) {
    next(error);
  }
};

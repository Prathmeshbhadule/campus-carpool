import { User } from '../models/User.js';
import { generateToken } from '../utils/jwtHelper.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';

/**
 * Register new user (Student, Faculty, or Admin)
 */
export const register = async (req, res, next) => {
  try {
    const { name, email, password, role, prn, department, phone, vehicle } = req.body;

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return errorResponse(res, 409, 'An account with this email address already exists.');
    }

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      role: role || 'student',
      prn: role === 'student' ? prn : undefined,
      department,
      phone,
      vehicle: vehicle || { hasVehicle: false, type: 'none', model: '', plate: '' }
    });

    const token = generateToken({ id: user._id, role: user.role });

    const safeUser = user.toObject();
    delete safeUser.password;

    return successResponse(res, 201, 'Account successfully registered.', {
      token,
      user: safeUser
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Login user with email & password
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) {
      return errorResponse(res, 401, 'Invalid college email or password.');
    }

    if (!user.isActive) {
      return errorResponse(res, 403, 'Account is deactivated. Please contact campus admin.');
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return errorResponse(res, 401, 'Invalid college email or password.');
    }

    const token = generateToken({ id: user._id, role: user.role });

    const safeUser = user.toObject();
    delete safeUser.password;

    return successResponse(res, 200, 'Login successful.', {
      token,
      user: safeUser
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get currently authenticated user profile
 */
export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    return successResponse(res, 200, 'User profile retrieved.', { user });
  } catch (error) {
    next(error);
  }
};

/**
 * Logout
 */
export const logout = async (req, res) => {
  return successResponse(res, 200, 'Logged out successfully.');
};

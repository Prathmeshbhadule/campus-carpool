import { verifyToken } from '../utils/jwtHelper.js';
import { User } from '../models/User.js';
import { errorResponse } from '../utils/apiResponse.js';

/**
 * Protect routes: verify JWT in Authorization header or cookie
 */
export const authenticate = async (req, res, next) => {
  try {
    let token = null;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return errorResponse(res, 401, 'Authentication token missing. Please sign in.');
    }

    const decoded = verifyToken(token);
    if (!decoded || !decoded.id) {
      return errorResponse(res, 401, 'Invalid or expired authentication session. Please sign in again.');
    }

    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return errorResponse(res, 401, 'User account no longer exists.');
    }

    if (!user.isActive) {
      return errorResponse(res, 403, 'Account is deactivated. Contact campus administration.');
    }

    req.user = user;
    next();
  } catch (error) {
    return errorResponse(res, 500, `Authentication processing error: ${error.message}`);
  }
};

/**
 * Role-Based Access Control (RBAC) middleware
 * @param  {...string} roles Allowed roles ('student', 'faculty', 'admin')
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return errorResponse(res, 401, 'Authentication required.');
    }
    if (!roles.includes(req.user.role)) {
      return errorResponse(res, 403, `Access denied. Requires one of: [${roles.join(', ')}] role.`);
    }
    next();
  };
};

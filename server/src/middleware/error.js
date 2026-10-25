import { ENV } from '../config/env.js';

export class AppError extends Error {
  constructor(message, statusCode = 500, errors = null) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Centralized express error handler middleware
 */
export const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let errors = err.errors || null;

  // Handle Mongoose Bad ObjectId (CastError) -> 404 / 400
  if (err.name === 'CastError') {
    statusCode = 404;
    message = `Resource not found with identifier: ${err.value}`;
  }

  // Handle Mongoose duplicate key error (code 11000) -> 409 Conflict
  if (err.code === 11000) {
    statusCode = 409;
    const fields = Object.keys(err.keyValue || {});
    message = `Conflict: Duplicate value for field(s) [${fields.join(', ')}]. This record already exists.`;
  }

  // Handle Mongoose Validation Error -> 422 Unprocessable Entity
  if (err.name === 'ValidationError') {
    statusCode = 422;
    message = 'Validation failed';
    errors = Object.values(err.errors).map(el => ({
      field: el.path,
      message: el.message
    }));
  }

  // Handle JWT Error -> 401 Unauthorized
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Invalid or expired authentication token. Please sign in again.';
  }

  const responsePayload = {
    success: false,
    message,
    statusCode
  };

  if (errors) {
    responsePayload.errors = errors;
  }

  if (ENV.NODE_ENV === 'development' && statusCode === 500) {
    responsePayload.stack = err.stack;
  }

  return res.status(statusCode).json(responsePayload);
};

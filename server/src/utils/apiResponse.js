/**
 * Consistent API response helper ensuring uniform JSON responses.
 */

export const successResponse = (res, statusCode = 200, message = 'Success', data = null, meta = null) => {
  const payload = {
    success: true,
    message,
    data
  };
  if (meta) {
    payload.meta = meta;
  }
  return res.status(statusCode).json(payload);
};

export const errorResponse = (res, statusCode = 500, message = 'Internal Server Error', errors = null) => {
  const payload = {
    success: false,
    message
  };
  if (errors) {
    payload.errors = errors;
  }
  return res.status(statusCode).json(payload);
};

export const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'MITAOE Campus Carpool REST API',
    version: '1.0.0',
    description: 'Production-ready REST API for intra-campus ride sharing at MIT Academy of Engineering, Alandi, Pune.',
    contact: {
      name: 'MITAOE Carpool Engineering Team',
      email: 'carpool@mitaoe.ac.in'
    }
  },
  servers: [
    {
      url: '/api/v1',
      description: 'API v1 Base Endpoint'
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    },
    schemas: {
      User: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          name: { type: 'string' },
          email: { type: 'string', example: '122100451001@mitaoe.ac.in' },
          role: { type: 'string', enum: ['student', 'faculty', 'admin'] },
          prn: { type: 'string', example: '122100451001' },
          department: { type: 'string' },
          phone: { type: 'string' },
          vehicle: {
            type: 'object',
            properties: {
              hasVehicle: { type: 'boolean' },
              type: { type: 'string', enum: ['car', 'bike'] },
              model: { type: 'string' },
              plate: { type: 'string' }
            }
          },
          rating: {
            type: 'object',
            properties: {
              average: { type: 'number' },
              count: { type: 'number' }
            }
          }
        }
      },
      Ride: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          driver: { $ref: '#/components/schemas/User' },
          origin: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              locality: { type: 'string' },
              coordinates: { type: 'array', items: { type: 'number' } }
            }
          },
          destination: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              locality: { type: 'string' },
              coordinates: { type: 'array', items: { type: 'number' } }
            }
          },
          viaRoute: { type: 'array', items: { type: 'string' } },
          departureTime: { type: 'string', format: 'date-time' },
          seatsTotal: { type: 'integer', minimum: 1, maximum: 6 },
          seatsAvailable: { type: 'integer', minimum: 0 },
          costPerSeat: { type: 'number' },
          status: { type: 'string', enum: ['open', 'full', 'ongoing', 'completed', 'cancelled'] },
          notes: { type: 'string' }
        }
      },
      Booking: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          ride: { type: 'string' },
          passenger: { $ref: '#/components/schemas/User' },
          seatsBooked: { type: 'integer' },
          totalFare: { type: 'number' },
          pickupSpot: { type: 'string' },
          status: { type: 'string', enum: ['requested', 'approved', 'rejected', 'cancelled', 'completed'] },
          paymentStatus: { type: 'string', enum: ['pending', 'paid_cash', 'paid_upi'] }
        }
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string' },
          errors: { type: 'array', items: { type: 'object' } }
        }
      }
    }
  },
  paths: {
    '/auth/register': {
      post: {
        summary: 'Register new student, faculty, or admin',
        tags: ['Auth'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'email', 'password', 'role', 'department', 'phone'],
                properties: {
                  name: { type: 'string' },
                  email: { type: 'string', example: '122100451001@mitaoe.ac.in' },
                  password: { type: 'string', minLength: 6 },
                  role: { type: 'string', enum: ['student', 'faculty', 'admin'] },
                  prn: { type: 'string' },
                  department: { type: 'string' },
                  phone: { type: 'string' }
                }
              }
            }
          }
        },
        responses: {
          201: { description: 'User successfully registered' },
          400: { description: 'Validation error' },
          409: { description: 'Email already registered' }
        }
      }
    },
    '/auth/login': {
      post: {
        summary: 'Authenticate and receive JWT token',
        tags: ['Auth'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string' },
                  password: { type: 'string' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Login successful with token & profile' },
          401: { description: 'Invalid credentials' }
        }
      }
    },
    '/rides': {
      get: {
        summary: 'Search & filter active carpool rides',
        tags: ['Rides'],
        parameters: [
          { name: 'origin', in: 'query', schema: { type: 'string' } },
          { name: 'destination', in: 'query', schema: { type: 'string' } },
          { name: 'date', in: 'query', schema: { type: 'string' } },
          { name: 'vehicleType', in: 'query', schema: { type: 'string', enum: ['car', 'bike'] } },
          { name: 'minSeats', in: 'query', schema: { type: 'integer' } },
          { name: 'maxPrice', in: 'query', schema: { type: 'number' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
          { name: 'sortBy', in: 'query', schema: { type: 'string', default: 'departureTime' } }
        ],
        responses: {
          200: { description: 'Paginated ride search results' }
        }
      },
      post: {
        summary: 'Publish a new campus ride (Driver)',
        tags: ['Rides'],
        security: [{ bearerAuth: [] }],
        responses: {
          201: { description: 'Ride created successfully' },
          400: { description: 'Validation failure' },
          401: { description: 'Unauthorized' }
        }
      }
    },
    '/rides/{id}': {
      get: {
        summary: 'Retrieve ride details by ID',
        tags: ['Rides'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Ride details with driver & passenger info' },
          404: { description: 'Ride not found' }
        }
      }
    },
    '/rides/{id}/bookings': {
      post: {
        summary: 'Atomically request seat booking on a ride',
        tags: ['Bookings'],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          201: { description: 'Seat booking requested' },
          409: { description: 'Insufficient seats available (atomic check)' }
        }
      }
    },
    '/stats/platform': {
      get: {
        summary: 'Public platform aggregate metrics (total rides, CO2 saved, cost saved)',
        tags: ['Statistics'],
        responses: {
          200: { description: 'Platform statistics' }
        }
      }
    }
  }
};

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import swaggerUi from 'swagger-ui-express';
import { swaggerDocument } from './config/swagger.js';
import { customLogger } from './middleware/logger.js';
import { generalLimiter } from './middleware/rateLimiter.js';
import { errorHandler } from './middleware/error.js';
import { errorResponse, successResponse } from './utils/apiResponse.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDistPath = path.resolve(__dirname, '../../client/dist');
const indexHtmlPath = path.join(clientDistPath, 'index.html');

// Route imports
import authRoutes from './routes/authRoutes.js';
import rideRoutes from './routes/rideRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';
import userRoutes from './routes/userRoutes.js';
import statsRoutes from './routes/statsRoutes.js';
import locationRoutes from './routes/locationRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';

const app = express();

// Security middleware (Helmet)
app.use(helmet({
  contentSecurityPolicy: false // Allow Swagger UI and Leaflet tiles
}));

// CORS configuration
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Express built-in body parsers
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Custom request logger using Node events & fs
app.use(customLogger);

// Global rate limiting for API endpoints
app.use('/api', generalLimiter);

// Swagger OpenAPI documentation endpoint
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Health check endpoint
app.get('/health', (req, res) => {
  return successResponse(res, 200, 'MITAOE Campus Carpool API is healthy and operational.', {
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Versioned API routes (/api/v1)
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/rides', rideRoutes);
app.use('/api/v1/bookings', bookingRoutes);
app.use('/api/v1/reviews', reviewRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/stats', statsRoutes);
app.use('/api/v1/locations', locationRoutes);
app.use('/api/v1/notifications', notificationRoutes);

// Serve static frontend build if present (Unified Production Mode)
if (fs.existsSync(indexHtmlPath)) {
  app.use(express.static(clientDistPath));

  app.get('*', (req, res, next) => {
    if (req.originalUrl.startsWith('/api') || req.originalUrl.startsWith('/health')) {
      return next();
    }
    return res.sendFile(indexHtmlPath);
  });
}

// 404 handler for unmapped routes
app.use('*', (req, res) => {
  return errorResponse(res, 404, `Endpoint ${req.originalUrl} not found on this server.`);
});

// Centralized error handler
app.use(errorHandler);

export default app;

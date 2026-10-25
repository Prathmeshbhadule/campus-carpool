import app from './app.js';
import { connectDB, disconnectDB } from './config/db.js';
import { ENV } from './config/env.js';

const startServer = async () => {
  try {
    await connectDB();

    const server = app.listen(ENV.PORT, '0.0.0.0', () => {
      console.log(`====================================================`);
      console.log(` 🚗 MITAOE Campus Carpool Server running in [${ENV.NODE_ENV}] mode`);
      console.log(` 🌐 API Base URL:    http://localhost:${ENV.PORT}/api/v1`);
      console.log(` 📖 Swagger Docs:   http://localhost:${ENV.PORT}/api/docs`);
      console.log(` 🏥 Health Check:   http://localhost:${ENV.PORT}/health`);
      console.log(`====================================================`);
    });

    const shutdown = async (signal) => {
      console.log(`\n[Server] Received ${signal}. Gracefully shutting down...`);
      server.close(async () => {
        await disconnectDB();
        console.log('[Server] Process terminated cleanly.');
        process.exit(0);
      });
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

  } catch (error) {
    console.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

startServer();

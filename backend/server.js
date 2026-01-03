import "dotenv/config"; // Ensure dotenv is loaded first for safety, though config/index.js also checks it.
import app from "./app.js";
import { config } from "./config/index.js";
import { dbReady } from "./db/index.js";
import logger from "./utils/logger.js";

const startServer = async () => {
  try {
    // Wait for Database Connection
    await dbReady;
    logger.info("Database connection established successfully.");

    // Start Express Server
    app.listen(config.port, () => {
      logger.info(`🚀 Backend server running on port ${config.port}`);
      logger.info(`📊 API endpoints available at ${config.baseUrl}/api/health`);
      logger.info(`🔧 Environment: ${config.env}`);
    });

  } catch (error) {
    logger.error("Failed to start server due to initialization error:", error);
    process.exit(1);
  }
};

startServer();

// Handle Unhandled Promise Rejections
process.on('unhandledRejection', (err) => {
  logger.error('UNHANDLED REJECTION! 💥 Shutting down...');
  logger.error(err.name, err.message);
  process.exit(1);
});

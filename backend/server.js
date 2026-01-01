import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import rateLimit from "express-rate-limit";

import authRoutes from "./routes/auth.js";
import coursesRoutes from "./routes/courses.js";
import enrollmentsRoutes from "./routes/enrollments.js";
import couponsRoutes from "./routes/coupons.js";
import paymentsRoutes from "./routes/payments.js";
import adminUsersRoutes from "./routes/users.js";
import certificationsRoutes from "./routes/certifications.js";
import adminRealtimeRoutes from './routes/adminRealtime.js';
import publicRealtimeRoutes from './routes/publicRealtime.js';
import progressRoutes from './routes/progress.js';
import { dbReady } from "./db/index.js";
import { notFound, errorHandler } from "./middleware/error.js";\nimport { notFound as notFoundNew, errorHandler as errorHandlerNew } from "./middleware/errorHandler.js";

const app = express();
const PORT = process.env.PORT || 3000;
const BASE_URL = `http://localhost:${PORT}`;

app.use(
  cors({
    origin: "*", // Check if this needs to be specific in production
    credentials: true,
  })
);

app.use(helmet());
app.use(morgan("dev"));
app.use(compression());

// Rate limiting: 2000 requests per 15 minutes
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 2000,
  message: "Too many requests from this IP, please try again later."
});
app.use("/api/", limiter);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.get("/api/health", (req, res) => {
  const apiList = {
    auth: `${BASE_URL}/api/auth`,
    courses: `${BASE_URL}/api/courses`,
    enrollments: `${BASE_URL}/api/enrollments`,
    coupons: `${BASE_URL}/api/coupons`,
    payments: `${BASE_URL}/api/payments`,
    admin: {
      users: `${BASE_URL}/api/admin/users`,
      courses: `${BASE_URL}/api/admin/courses`,
      enrollments: `${BASE_URL}/api/admin/enrollments`,
      payments: `${BASE_URL}/api/admin/payments`,
      coupons: `${BASE_URL}/api/admin/coupons`,
      certifications: `${BASE_URL}/api/admin/certifications`,
    },
  };

  res.json({
    status: "ok",
    message: "Server is running successfully 🚀",
    apiList,
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/courses", coursesRoutes);
app.use("/api/enrollments", enrollmentsRoutes);
app.use("/api/coupons", couponsRoutes);
app.use("/api/payments", paymentsRoutes);
app.use("/api/admin/users", adminUsersRoutes);
app.use("/api/admin/courses", coursesRoutes);
app.use("/api/admin/enrollments", enrollmentsRoutes);
app.use("/api/admin/payments", paymentsRoutes);
app.use("/api/admin/coupons", couponsRoutes);
app.use("/api/admin/certifications", certificationsRoutes);
app.use('/api/admin/realtime', adminRealtimeRoutes);
app.use('/api/public/realtime', publicRealtimeRoutes);
app.use('/api/progress', progressRoutes);

// Error Handling - Use enhanced error handlers
app.use(notFoundNew);
app.use(errorHandlerNew);

const startServer = async () => {
  try {
    await dbReady;
    app.listen(PORT, () => {
      console.log(`🚀 Backend server running on port ${PORT}`);
      console.log(
        `📊 API endpoints available at http://localhost:${PORT}/api/health`
      );
    });
  } catch (error) {
    console.error(
      "Failed to start server due to database initialization error:",
      error
    );
    process.exit(1);
  }
};

startServer();

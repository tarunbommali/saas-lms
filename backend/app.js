import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import rateLimit from "express-rate-limit";

// Config
import { config } from "./config/index.js";

// Routes
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
import modulesRoutes from './routes/modules.js';
import quizzesRoutes from './routes/quizzes.js';
import learningProgressRoutes from './routes/learning-progress.js';

// Middleware
import { notFound, errorHandler } from "./middleware/errorHandler.js";

const app = express();

// Global Middleware
app.use(
    cors({
        origin: config.cors.origin,
        credentials: true,
    })
);

app.use(helmet());
app.use(morgan("dev"));
app.use(compression());

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 2000,
    message: "Too many requests from this IP, please try again later."
});
app.use("/api/", limiter);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root Route
app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "Welcome to JNTU-GV Certification Platform API",
        version: "2.0.0",
        documentation: `${config.baseUrl}/api/health`,
        env: config.env
    });
});

// Health Check
app.get("/api/health", (req, res) => {
    res.json({
        status: "ok",
        message: "Server is running successfully 🚀",
        timestamp: new Date().toISOString()
    });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/courses", coursesRoutes);
app.use("/api/enrollments", enrollmentsRoutes);
app.use("/api/coupons", couponsRoutes);
app.use("/api/payments", paymentsRoutes);

// Admin Routes
app.use("/api/admin/users", adminUsersRoutes);
app.use("/api/admin/courses", coursesRoutes);
app.use("/api/admin/enrollments", enrollmentsRoutes);
app.use("/api/admin/payments", paymentsRoutes);
app.use("/api/admin/coupons", couponsRoutes);
app.use("/api/admin/certifications", certificationsRoutes);
app.use("/api/admin/realtime", adminRealtimeRoutes);

// Other Routes
app.use("/api/certifications", certificationsRoutes);
app.use('/api/public/realtime', publicRealtimeRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/modules', modulesRoutes);
app.use('/api/quizzes', quizzesRoutes);
app.use('/api/learning-progress', learningProgressRoutes);

// Error Handling
app.use(notFound);
app.use(errorHandler);

export default app;

import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import rateLimit from "express-rate-limit";
import path from "path";
import { fileURLToPath } from "url";

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

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Global Middleware
// CORS - Allow requests from Vite dev server and production
const allowedOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    config.cors.origin
].filter(Boolean);

app.use(
    cors({
        origin: (origin, callback) => {
            // Allow requests with no origin (like mobile apps or curl requests)
            if (!origin) return callback(null, true);

            // Check if origin is allowed
            if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
                callback(null, true);
            } else {
                callback(new Error('Not allowed by CORS'));
            }
        },
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

// Serve static files from React build (production only)
if (config.env === 'production') {
    const distPath = path.join(__dirname, '..', 'dist');

    // Serve static files
    app.use(express.static(distPath));

    // Handle client-side routing - serve index.html for all non-API routes
    app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
    });
}

// Error Handling
app.use(notFound);
app.use(errorHandler);

export default app;

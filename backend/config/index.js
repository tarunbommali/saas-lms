import dotenv from "dotenv";

// Load environment variables
dotenv.config();

export const config = {
    env: process.env.NODE_ENV || "development",
    port: process.env.PORT || 3000,
    baseUrl: process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`,
    db: {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        name: process.env.DB_NAME,
    },
    jwt: {
        secret: process.env.JWT_SECRET,
        expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    },
    cors: {
        origin: process.env.CORS_ORIGIN || "*",
    },
    firebase: {
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY,
    },
    razorpay: {
        keyId: process.env.RAZORPAY_KEY_ID,
        keySecret: process.env.RAZORPAY_KEY_SECRET,
    }
};

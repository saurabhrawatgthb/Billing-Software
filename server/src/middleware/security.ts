import type { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";

// Parse allowed CORS origins from environment
const rawFrontendUrls = process.env.FRONTEND_URLS || "";
const configuredOrigins = rawFrontendUrls
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const defaultOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "http://localhost:5000",
  "http://127.0.0.1:5173",
  "https://restaurent-pos-client.onrender.com",
];

const allowedOrigins = Array.from(new Set([...defaultOrigins, ...configuredOrigins]));

export const corsMiddleware = cors({
  origin: (origin, callback) => {
    // Allow non-browser callers (curl, server-to-server, mobile app, etc.)
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // In development mode, allow localhost with any port
    if (process.env.NODE_ENV !== "production" && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`CORS blocked: Origin ${origin} is not in the allowlist.`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-franchise-id", "x-organization-id", "X-Requested-With"],
});

export const helmetMiddleware = helmet({
  contentSecurityPolicy: false, // Let Vite/SPA assets render smoothly
  crossOriginEmbedderPolicy: false,
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many authentication requests from this IP. Please try again after 15 minutes.",
  },
});

export const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests to public registration endpoints. Please try again later.",
  },
});

export const couponLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many coupon verification requests. Please try again later.",
  },
});

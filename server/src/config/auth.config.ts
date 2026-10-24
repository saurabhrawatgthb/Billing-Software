import dotenv from "dotenv";
dotenv.config();

/**
 * Validated JWT Authentication & Cryptographic Configuration
 * Eliminates insecure default secrets and enforces minimum entropy.
 */
export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  const isProd = process.env.NODE_ENV === "production";

  if (!secret) {
    if (isProd) {
      throw new Error(
        "FATAL: JWT_SECRET environment variable is not defined. Server cannot start in production without a secure secret."
      );
    }
    console.warn(
      "⚠️ WARNING: JWT_SECRET is not set in environment. Using development fallback. DO NOT USE IN PRODUCTION."
    );
    return "dev-omnipos-fallback-secret-minimum-32-chars-long";
  }

  if (isProd && secret.length < 32) {
    throw new Error(
      "FATAL: JWT_SECRET must be at least 32 characters long in production environments for cryptographic safety."
    );
  }

  return secret;
}

export const AUTH_CONFIG = {
  tokenExpiry: "7d",
  algorithm: "HS256" as const,
};

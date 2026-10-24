# OmniPOS — Application Security Checklist & Hardening Measures

## 1. Authentication & JWT Hardening
- **No Hardcoded Fallbacks:** Fallback secret `"development-secret"` has been removed.
- **Fail-Fast Boot:** In production (`NODE_ENV=production`), server bootstrap aborts immediately if `JWT_SECRET` is unset or fewer than 32 characters long.
- **Token Claims:** Access tokens carry `userId`, `role`, `organizationId`, and `franchiseId` with an explicit 7-day expiration.

## 2. Network Boundaries & CORS Policy
- Permissive origin reflection has been replaced with exact origin matching.
- Allowed origins are populated via `FRONTEND_URLS` environment variable (e.g. `https://pos.yourdomain.com`).
- Unauthorized caller origins are rejected with an explicit error before any route handler executes.

## 3. Rate Limiting & Abuse Prevention
- **Authentication:** `authLimiter` restricts `/api/auth/*` to 20 requests per 15 minutes per IP.
- **Public Registration:** `publicLimiter` restricts `/api/public/checkout` and `/api/public/register` to 30 requests per 15 minutes.
- **Coupon Validation:** `couponLimiter` protects `/api/public/coupons/validate` from brute-force code enumeration.

## 4. HTTP Headers
- `helmet` middleware is active globally across Express, providing standard protection against clickjacking, MIME sniffing, and cross-site scripting.

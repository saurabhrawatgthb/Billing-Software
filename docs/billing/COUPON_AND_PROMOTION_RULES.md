# OmniPOS — Coupon & Promotional Rules Engine

## 1. Founding Partner Promotion ("First 10 Restaurants Free for 1 Year")

### Campaign Overview
- **Code:** `FOUNDING10`
- **Campaign Tag:** `FOUNDING_10`
- **Total Allocation:** Strictly limited to 10 restaurants.
- **Benefit:** 100% discount on an annual subscription for 12 months (₹0 payable at checkout).
- **One per Organization:** Enforced via MongoDB unique compound index `@@unique([couponId, organizationId])`.

### Race-Safe Atomic Allocation Algorithm
To prevent concurrent requests from exceeding the 10-redemption limit:
```typescript
const updateResult = await prisma.coupon.updateMany({
  where: {
    id: coupon.id,
    currentRedemptions: { lt: coupon.maxRedemptions },
  },
  data: {
    currentRedemptions: { increment: 1 },
  },
});

if (updateResult.count === 0) {
  throw new AppError("All promotional spots for this campaign have been claimed.", 409);
}
```
If two owners submit checkout for the 10th spot simultaneously, only one transaction increments the count; the second receives HTTP 409 and is redirected to standard checkout.

### Renewal & Expiration Behavior
- Starts immediately upon checkout activation.
- `subscriptionEndsAt` is set to `now + 365 days`.
- At 30, 14, and 3 days before term expiration, the platform owner dashboard and tenant settings display renewal notices.
- If not renewed, the account transitions to read-only historical mode without deleting orders, bills, or tax invoices.

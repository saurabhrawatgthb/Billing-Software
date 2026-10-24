import { Router } from "express";
import {
  handleRegisterAndCheckout,
  handleDemoRequest,
  getPricingPlans,
  handleValidateCoupon,
} from "./public.controller.js";

const router = Router();

// Public onboarding, pricing & lead endpoints
router.post("/register", handleRegisterAndCheckout);
router.post("/checkout", handleRegisterAndCheckout);
router.post("/coupons/validate", handleValidateCoupon);
router.post("/demo", handleDemoRequest);
router.get("/plans", getPricingPlans);

export default router;

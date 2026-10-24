import { Router } from "express";
import { handleRegister, handleDemoRequest, getPricingPlans } from "./public.controller.js";

const router = Router();

// Public onboarding & lead endpoints (no auth required)
router.post("/register", handleRegister);
router.post("/demo", handleDemoRequest);
router.get("/plans", getPricingPlans);

export default router;

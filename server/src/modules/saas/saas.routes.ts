import { Router } from "express";
import { authenticate, authorizeRole } from "../../middleware/auth.js";
import {
  listOrganizations,
  patchOrganization,
  listDemoRequests,
  patchDemoRequest,
  getOverviewStats,
  listCoupons,
  handleCreateCoupon,
} from "./saas.controller.js";

const router = Router();

// Platform control tower is restricted to SUPER_ADMIN role
router.use(authenticate);
router.use(authorizeRole("SUPER_ADMIN"));

router.get("/overview", getOverviewStats);
router.get("/organizations", listOrganizations);
router.patch("/organizations/:id", patchOrganization);

router.get("/coupons", listCoupons);
router.post("/coupons", handleCreateCoupon);

router.get("/leads", listDemoRequests);
router.patch("/leads/:id", patchDemoRequest);

// Aliases for frontend compatibility
router.get("/demo-requests", listDemoRequests);
router.patch("/demo-requests/:id", patchDemoRequest);

export default router;

import { Router } from "express";
import { authenticate, authorizeRole } from "../../middleware/auth.js";
import {
  listOrganizations,
  updateOrg,
  listDemoRequests,
  updateLeadStatus,
} from "./saas.controller.js";

const router = Router();

// Only Super Admin can access SaaS control tower
router.use(authenticate, authorizeRole("SUPER_ADMIN"));

router.get("/organizations", listOrganizations);
router.patch("/organizations/:id", updateOrg);
router.get("/demo-requests", listDemoRequests);
router.patch("/demo-requests/:id", updateLeadStatus);

export default router;

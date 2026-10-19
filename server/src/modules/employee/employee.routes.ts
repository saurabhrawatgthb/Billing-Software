import { Router } from "express";
import { authenticate, authorize, authorizeWithPermission } from "../../middleware/auth.js";
import { create, get, list, update, updateStatus } from "./employee.controller.js";

const router = Router();

router.use(authenticate);

router.get("/", authorize("SUPER_ADMIN", "FRANCHISE_MANAGER", "HR", "ACCOUNTANT", "CASHIER"), list);
router.get("/:id", authorize("SUPER_ADMIN", "FRANCHISE_MANAGER", "HR", "ACCOUNTANT", "CASHIER"), get);
router.post("/", authorizeWithPermission("canManageEmployees", "HR"), create);
router.put("/:id", authorizeWithPermission("canManageEmployees", "HR"), update);
router.patch("/:id/status", authorizeWithPermission("canManageEmployees", "HR"), updateStatus);

export default router;

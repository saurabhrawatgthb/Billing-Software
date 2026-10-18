import { Router } from "express";
import { authenticate, authorize, authorizeWithPermission } from "../../middleware/auth.js";
import { closeSession, create, get, list, openSession, update } from "./table.controller.js";

const router = Router();

router.use(authenticate);

router.get("/", authorize("SUPER_ADMIN", "FRANCHISE_MANAGER", "CASHIER", "WAITER", "CHEF"), list);
router.get("/:id", authorize("SUPER_ADMIN", "FRANCHISE_MANAGER", "CASHIER", "WAITER", "CHEF"), get);
router.post("/", authorizeWithPermission("canManageTables"), create);
router.put("/:id", authorizeWithPermission("canManageTables"), update);
router.post("/:id/open-session", authorize("SUPER_ADMIN", "FRANCHISE_MANAGER", "CASHIER", "WAITER"), openSession);
router.post("/:id/close-session", authorize("SUPER_ADMIN", "FRANCHISE_MANAGER", "CASHIER"), closeSession);

export default router;

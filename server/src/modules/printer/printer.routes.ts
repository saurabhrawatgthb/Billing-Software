import { Router } from "express";
import { authenticate, authorize, authorizeWithPermission } from "../../middleware/auth.js";
import { create, list, printJob, remove, update } from "./printer.controller.js";

const router = Router();

router.use(authenticate);

router.get("/", authorize("SUPER_ADMIN", "FRANCHISE_MANAGER"), list);
router.post("/", authorizeWithPermission("canManagePrinters"), create);
router.put("/:id", authorizeWithPermission("canManagePrinters"), update);
router.delete("/:id", authorizeWithPermission("canManagePrinters"), remove);
router.post("/print-job", authorize("SUPER_ADMIN", "FRANCHISE_MANAGER", "CASHIER", "CHEF"), printJob);

export default router;

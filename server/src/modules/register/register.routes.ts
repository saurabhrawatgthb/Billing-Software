import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth.js";
import { close, getCurrent, history, open } from "./register.controller.js";

const router = Router();

router.use(authenticate);

router.get("/current", getCurrent);
router.post("/open", authorize("SUPER_ADMIN", "FRANCHISE_MANAGER", "CASHIER"), open);
router.post("/close", authorize("SUPER_ADMIN", "FRANCHISE_MANAGER", "CASHIER"), close);
router.get("/history", history);

export default router;

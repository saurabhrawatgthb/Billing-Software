import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth.js";
import { getAll, getPermissions, updatePermissions } from "./permission.controller.js";

const router = Router();

router.use(authenticate);

// Franchise Managers and Super Admin can fetch their active permissions
router.get("/", getPermissions);

// Super Admin can list all franchise permission profiles and update them
router.get("/all", authorize("SUPER_ADMIN"), getAll);
router.put("/", authorize("SUPER_ADMIN"), updatePermissions);

export default router;
